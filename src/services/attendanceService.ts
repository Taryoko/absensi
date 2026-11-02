import { localDB } from './store';
import { GPSService } from './gpsService';
import { DeviceService } from './deviceService';
import { FaceBiometricService } from './faceBiometricService';
import { WatermarkService } from './watermarkService';
import { StorageService } from './storageService';
import { AuditService } from './auditService';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { SupabaseSyncService } from './supabaseSyncService';
import { FCMNotificationService } from './firebaseMessagingService';
import {
  Attendance,
  AttendanceStatus,
  AttendanceType,
  GPSLocation,
  Profile,
  SchoolSettings,
} from '../types';

export class AttendanceService {
  /**
   * Helper to get current Date formatted in Asia/Jakarta YYYY-MM-DD
   */
  public static getTodayJakartaDate(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }

  /**
   * Helper to check if a timestamp matches today in Asia/Jakarta
   */
  public static isTodayJakarta(isoString: string): boolean {
    const recordDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoString));
    return recordDate === this.getTodayJakartaDate();
  }

  /**
   * Checks current status for today: check_in, check_out, and permit (izin/sakit)
   */
  public static getTodayAttendanceForUser(userId: string): {
    checkIn?: Attendance;
    checkOut?: Attendance;
    permit?: Attendance;
  } {
    const records = localDB.getAttendances().filter((a) => a.user_id === userId);
    const todayRecords = records.filter((a) => this.isTodayJakarta(a.server_timestamp));

    const checkIn = todayRecords.find((a) => a.type === 'check_in' && (a.status === 'HADIR' || a.status === 'TERLAMBAT'));
    const checkOut = todayRecords.find((a) => a.type === 'check_out' && (a.status === 'HADIR' || a.status === 'TERLAMBAT'));
    const permit = todayRecords.find((a) => a.status === 'IZIN' || a.status === 'SAKIT');

    return { checkIn, checkOut, permit };
  }

  /**
   * Main attendance processing method enforcing all 23 steps in requirements #7 and #8
   */
  public static async processAttendance(params: {
    user: Profile;
    type: AttendanceType;
    gps: GPSLocation;
    photoCanvas: HTMLCanvasElement;
    singleFaceVerified: boolean;
    livenessVerified: boolean;
    school: SchoolSettings;
  }): Promise<Attendance> {
    const { user, type, gps, photoCanvas, singleFaceVerified, livenessVerified, school } = params;

    // 1. Double check today's status
    const todayStatus = this.getTodayAttendanceForUser(user.user_id);
    if (type === 'check_in' && todayStatus.checkIn) {
      throw new Error('Anda sudah melakukan absensi masuk hari ini.');
    }
    if (type === 'check_out' && todayStatus.checkOut) {
      throw new Error('Anda sudah melakukan absensi pulang hari ini.');
    }

    // 2. Validate GPS with Haversine and Mock Detection
    const lastCheckin = localDB.getAttendances().find((a) => a.user_id === user.user_id);
    const lastLocation = lastCheckin
      ? {
          lat: lastCheckin.latitude,
          lon: lastCheckin.longitude,
          timestamp: new Date(lastCheckin.server_timestamp).getTime(),
        }
      : undefined;

    const gpsEval = GPSService.evaluateLocation(
      gps,
      school.latitude,
      school.longitude,
      school.radius_absensi,
      lastLocation
    );

    // 3. Time comparison (Asia/Jakarta)
    const now = new Date();
    const serverTimestamp = now.toISOString();

    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: school.timezone || 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const currentWibTime = timeFormatter.format(now).replace(/\./g, ':');

    let finalStatus: AttendanceStatus = gpsEval.status;
    let isLate = false;

    // Device Binding & Approval Verification
    const deviceVerification = DeviceService.verifyDevice(user);
    const deviceMatched = deviceVerification.isValid;
    if (school.wajib_perangkat_terdaftar !== false && !deviceVerification.isValid) {
      finalStatus = 'PERANGKAT_TIDAK_TERDAFTAR';
      gpsEval.notes.push(deviceVerification.message);
    } else if (deviceVerification.isValid) {
      gpsEval.notes.push('Perangkat fisik terdaftar & telah disetujui Admin (Valid)');
    }

    // Biometric Master Face Comparison
    const faceComparison = await FaceBiometricService.compareWithMasterFace(
      photoCanvas,
      user.registered_face_url
    );

    if (school.wajib_wajah_terdaftar !== false && user.registered_face_url && !faceComparison.isMatch) {
      finalStatus = 'WAJAH_TIDAK_COCOK';
      gpsEval.notes.push(`Biometrik wajah tidak cocok dengan master (${faceComparison.similarityPercent}% < 75%)`);
    } else if (user.registered_face_url) {
      gpsEval.notes.push(`Biometrik wajah cocok dengan master (${faceComparison.similarityPercent}%)`);
    }

    // If GPS is physically valid inside the radius and device & face are valid
    if (gpsEval.isValid && finalStatus !== 'PERANGKAT_TIDAK_TERDAFTAR' && finalStatus !== 'WAJAH_TIDAK_COCOK') {
      if (type === 'check_in') {
        // Compare with school jam_masuk (e.g. 07:30:00)
        if (currentWibTime > school.jam_masuk) {
          finalStatus = 'TERLAMBAT';
          isLate = true;
          gpsEval.notes.push(`Melewati batas jam masuk (${currentWibTime} > ${school.jam_masuk})`);
        } else {
          finalStatus = 'HADIR';
          gpsEval.notes.push(`Tepat waktu (${currentWibTime} <= ${school.jam_masuk})`);
        }
      } else {
        // Check out
        finalStatus = 'HADIR';
      }
    }

    // Check face detection validity
    if (!singleFaceVerified) {
      finalStatus = 'FOTO_TIDAK_VALID';
      gpsEval.notes.push('Wajah tidak valid atau terdeteksi lebih dari satu orang');
    }

    const attendanceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'a0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    // 4. Server Watermark Application
    const watermarkedDataUrl = WatermarkService.applyWatermark(photoCanvas, {
      guruNama: user.nama,
      nip: user.nip,
      serverTimestamp,
      latitude: gps.latitude,
      longitude: gps.longitude,
      accuracy: gps.accuracy,
      schoolName: school.nama_sekolah,
      status: finalStatus,
    });

    // 5. Anti-Replay SHA-256 Hash
    const photoHash = await WatermarkService.calculateHash(watermarkedDataUrl);

    // 6. Upload Photo to Supabase Storage
    const photoRecord = await StorageService.uploadAttendancePhoto(
      user.user_id,
      attendanceId,
      watermarkedDataUrl,
      photoHash
    );

    // 7. Assemble Attendance Record
    const attendanceRecord: Attendance = {
      id: attendanceId,
      user_id: user.user_id,
      type,
      status: finalStatus,
      server_timestamp: serverTimestamp,
      latitude: gps.latitude,
      longitude: gps.longitude,
      gps_accuracy: Math.round(gps.accuracy * 10) / 10,
      distance_from_school: gpsEval.distance,
      photo_id: photoRecord.id,
      device_info: `${navigator.platform} (${DeviceService.getCurrentDeviceInfo().deviceName})`,
      browser_info: navigator.vendor || 'Standard Browser',
      validation_result: {
        isWithinRadius: gpsEval.isValid,
        distanceMeters: gpsEval.distance,
        accuracyMeters: gps.accuracy,
        accuracyValid: gps.accuracy <= 150,
        speedCheckValid: !gpsEval.isMockDetected,
        mockLocationDetected: gpsEval.isMockDetected,
        singleFaceDetected: singleFaceVerified,
        livenessVerified,
        photoHash,
        isLate,
        deviceMatch: deviceMatched,
        faceSimilarity: faceComparison.similarityPercent,
        faceMatch: faceComparison.isMatch,
        notes: gpsEval.notes,
      },
      created_at: serverTimestamp,
      profile: user,
      photo: photoRecord,
    };

    // 8. Save to Supabase DB or Local DB
    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attendance').insert([
          {
            id: attendanceRecord.id,
            user_id: attendanceRecord.user_id,
            type: attendanceRecord.type,
            status: attendanceRecord.status,
            server_timestamp: attendanceRecord.server_timestamp,
            latitude: attendanceRecord.latitude,
            longitude: attendanceRecord.longitude,
            gps_accuracy: attendanceRecord.gps_accuracy,
            distance_from_school: attendanceRecord.distance_from_school,
            photo_id: attendanceRecord.photo_id,
            device_info: attendanceRecord.device_info,
            browser_info: attendanceRecord.browser_info,
            validation_result: attendanceRecord.validation_result,
          },
        ]);
      } catch (err) {
        console.warn('Failed to insert attendance into Supabase, saving to local store:', err);
      }
    }

    localDB.saveAttendance(attendanceRecord);

    // 9. Write Audit Log
    const auditActivity = finalStatus === 'HADIR' || finalStatus === 'TERLAMBAT'
      ? (type === 'check_in' ? 'ABSENSI_MASUK' : 'ABSENSI_PULANG')
      : 'ABSENSI_DITOLAK';

    const auditDesc = `${type === 'check_in' ? 'Absensi Masuk' : 'Absensi Pulang'} oleh ${user.nama}. Status: ${finalStatus}. Jarak: ${gpsEval.distance}m. Catatan: ${gpsEval.notes.join('; ')}`;
    await AuditService.logActivity(user, auditActivity, auditDesc);

    return attendanceRecord;
  }

  /**
   * Processes leave (Izin) or sick (Sakit) request without requiring proximity to school.
   * GPS location is recorded as-is for reference, and radius restriction is waived.
   */
  public static async processPermitOrSick(params: {
    user: Profile;
    type: 'izin' | 'sakit';
    alasan: string;
    photoDataUrl?: string;
    gps?: GPSLocation | null;
    school: SchoolSettings;
  }): Promise<Attendance> {
    const { user, type, alasan, photoDataUrl, gps, school } = params;

    // Check if permit already exists today
    const todayStatus = this.getTodayAttendanceForUser(user.user_id);
    if (todayStatus.permit) {
      throw new Error(`Anda sudah mengajukan ${todayStatus.permit.status === 'SAKIT' ? 'Sakit' : 'Izin'} untuk hari ini.`);
    }

    const now = new Date();
    const serverTimestamp = now.toISOString();

    const attendanceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'a0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    let distance = 0;
    const lat = gps ? gps.latitude : school.latitude;
    const lon = gps ? gps.longitude : school.longitude;
    const acc = gps ? gps.accuracy : 15;

    if (gps) {
      distance = GPSService.calculateHaversineDistance(
        gps.latitude,
        gps.longitude,
        school.latitude,
        school.longitude
      );
    }

    const finalStatus: AttendanceStatus = type === 'sakit' ? 'SAKIT' : 'IZIN';

    // Store proof photo if provided
    let photoRecord: any = null;
    if (photoDataUrl) {
      const photoHash = await WatermarkService.calculateHash(photoDataUrl);
      photoRecord = await StorageService.uploadAttendancePhoto(
        user.user_id,
        attendanceId,
        photoDataUrl,
        photoHash
      );
    }

    const notes = [
      `Pengajuan ${type === 'sakit' ? 'Sakit' : 'Izin'} Resmi: Tidak dibatasi radius sekolah.`,
      `Alasan: ${alasan}`,
      gps
        ? `Lokasi perangkat saat pengajuan: ${lat.toFixed(5)}, ${lon.toFixed(5)} (${distance}m dari sekolah)`
        : 'Lokasi GPS dicatat saat pengajuan',
    ];

    const attendanceRecord: Attendance = {
      id: attendanceId,
      user_id: user.user_id,
      type,
      status: finalStatus,
      server_timestamp: serverTimestamp,
      latitude: lat,
      longitude: lon,
      gps_accuracy: Math.round(acc * 10) / 10,
      distance_from_school: distance,
      photo_id: photoRecord?.id || null,
      device_info: `${navigator.platform} (${DeviceService.getCurrentDeviceInfo().deviceName})`,
      browser_info: navigator.vendor || 'Standard Browser',
      validation_result: {
        isWithinRadius: true, // Waived for official leaves
        distanceMeters: distance,
        accuracyMeters: acc,
        accuracyValid: true,
        speedCheckValid: true,
        mockLocationDetected: false,
        singleFaceDetected: true,
        livenessVerified: true,
        photoHash: photoRecord?.file_hash || 'PERMIT-VERIFIED',
        isLate: false,
        deviceMatch: true,
        faceSimilarity: 100,
        faceMatch: true,
        notes,
      },
      created_at: serverTimestamp,
      keterangan: alasan,
      attachment_url: photoDataUrl || undefined,
      profile: user,
      photo: photoRecord,
    };

    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attendance').insert([
          {
            id: attendanceRecord.id,
            user_id: attendanceRecord.user_id,
            type: attendanceRecord.type,
            status: attendanceRecord.status,
            server_timestamp: attendanceRecord.server_timestamp,
            latitude: attendanceRecord.latitude,
            longitude: attendanceRecord.longitude,
            gps_accuracy: attendanceRecord.gps_accuracy,
            distance_from_school: attendanceRecord.distance_from_school,
            photo_id: attendanceRecord.photo_id,
            device_info: attendanceRecord.device_info,
            browser_info: attendanceRecord.browser_info,
            validation_result: attendanceRecord.validation_result,
          },
        ]);
      } catch (err) {
        console.warn('Failed to insert permit to Supabase:', err);
      }
    }

    localDB.saveAttendance(attendanceRecord);

    await AuditService.logActivity(
      user,
      type === 'sakit' ? 'PENGAJUAN_SAKIT' : 'PENGAJUAN_IZIN',
      `Guru ${user.nama} mengajukan ${type === 'sakit' ? 'Sakit' : 'Izin'}: "${alasan}". Lokasi di luar sekolah diizinkan.`
    );

    FCMNotificationService.sendPermitNotification({
      teacherUserId: user.user_id,
      type,
      alasan,
    }).catch(() => {});

    return attendanceRecord;
  }

  /**
   * Retrieves all attendances with joined profile and photo
   */
  public static getAllAttendances(): Attendance[] {
    const list = localDB.getAttendances();
    const profiles = localDB.getProfiles();
    const photos = localDB.getPhotos();

    return list.map((item) => {
      const profile = profiles.find((p) => p.user_id === item.user_id);
      const photo = photos.find((p) => p.attendance_id === item.id);
      return {
        ...item,
        profile: profile || item.profile,
        photo: photo || item.photo,
      };
    });
  }

  /**
   * Disabled automatic demo seeding: All attendances must be created by real teacher actions.
   */
  public static seedInitialAttendanceIfEmpty() {
    // Disabled: Attendance is only created when a user explicitly performs attendance or submits an excused absence.
  }

  /**
   * Deletes an attendance record (Admin only)
   */
  public static async deleteAttendance(id: string, actor?: Profile | null): Promise<boolean> {
    const list = localDB.getAttendances();
    const target = list.find((a) => a.id === id);

    localDB.deleteAttendance(id);

    // Synchronize deletion with Supabase immediately
    SupabaseSyncService.deleteAttendance(id, target).catch((err) => {
      console.warn('Failed to delete attendance from Supabase:', err);
    });

    if (target) {
      // Send push notification to the teacher via Firebase Cloud Messaging
      FCMNotificationService.sendAttendanceAdjustmentNotification({
        teacherUserId: target.user_id,
        action: 'DELETED',
        type: target.type,
      }).catch((err) => console.warn('Failed to send FCM deletion notification:', err));
    }

    if (actor && target) {
      const teacher = localDB.getProfileByUserId(target.user_id);
      await AuditService.logActivity(
        actor,
        'HAPUS_ABSENSI',
        `Admin menghapus rekam absensi: ${teacher?.nama || 'Guru'} (${target.type === 'check_in' ? 'Masuk' : 'Pulang'}, Status: ${target.status}, Waktu: ${target.server_timestamp})`
      );
    }

    return true;
  }
}
