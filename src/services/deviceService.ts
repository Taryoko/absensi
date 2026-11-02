import { DeviceInfo, DeviceRegistration, Profile } from '../types';
import { localDB } from './store';
import { AuditService } from './auditService';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { FCMNotificationService } from './firebaseMessagingService';

export class DeviceService {
  private static STORAGE_DEVICE_UUID = 'absensi_device_uuid_v1';

  /**
   * Generates or retrieves a persistent unique Device ID for this browser / physical device.
   */
  public static getDeviceId(): string {
    let id = localStorage.getItem(this.STORAGE_DEVICE_UUID);
    if (!id) {
      // Generate hardware/browser fingerprint components
      const screenRes = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const nav = navigator.userAgent;
      const lang = navigator.language;
      const cores = navigator.hardwareConcurrency || 4;

      // Simple hash
      let hash = 0;
      const str = `${screenRes}-${nav}-${lang}-${cores}`;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }

      const randomPart = Math.random().toString(36).substring(2, 10);
      id = `DEV-${Math.abs(hash).toString(16).toUpperCase()}-${randomPart}`;
      localStorage.setItem(this.STORAGE_DEVICE_UUID, id);
    }
    return id;
  }

  /**
   * Detects readable device name, model, platform, and browser
   */
  public static getCurrentDeviceInfo(): DeviceInfo {
    const deviceId = this.getDeviceId();
    const ua = navigator.userAgent;
    let platform = 'PC / Laptop (Desktop)';
    let deviceName = 'Browser Workstation';

    if (/android/i.test(ua)) {
      platform = 'Android Smartphone';
      const match = ua.match(/;\s([^;)]+)\sBuild/i);
      deviceName = match ? match[1] : 'Perangkat Android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      platform = 'Apple iOS (Mobile)';
      deviceName = /ipad/i.test(ua) ? 'Apple iPad' : 'Apple iPhone';
    } else if (/windows/i.test(ua)) {
      platform = 'Windows OS';
      deviceName = 'PC Windows Laptop/Desktop';
    } else if (/macintosh/i.test(ua)) {
      platform = 'macOS';
      deviceName = 'Apple MacBook / Mac';
    } else if (/linux/i.test(ua)) {
      platform = 'Linux OS';
      deviceName = 'Linux Workstation';
    }

    // Detect Browser
    let browser = 'Web Browser';
    if (/chrome|crios/i.test(ua) && !/edge|opr\//i.test(ua)) {
      browser = 'Google Chrome';
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'Apple Safari';
    } else if (/firefox|fxios/i.test(ua)) {
      browser = 'Mozilla Firefox';
    } else if (/edg/i.test(ua)) {
      browser = 'Microsoft Edge';
    }

    return {
      deviceId,
      deviceName: `${deviceName} (${browser})`,
      platform,
      browser,
      screenResolution: `${window.screen.width} x ${window.screen.height}`,
      registeredAt: new Date().toISOString(),
      isCurrentDevice: true,
    };
  }

  /**
   * Submits a device registration request (status = PENDING by default)
   */
  public static async requestDeviceRegistration(
    user: Profile,
    deviceInfo: DeviceInfo
  ): Promise<DeviceRegistration> {
    const now = new Date().toISOString();
    const effectiveUserId = user.user_id || user.id || user.email;
    const regId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `devreg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newReg: DeviceRegistration = {
      id: regId,
      user_id: effectiveUserId,
      device_id: deviceInfo.deviceId,
      device_name: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      screen_resolution: deviceInfo.screenResolution,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
      user_nama: user.nama,
      user_email: user.email,
      user_nip: user.nip,
      user_foto: user.foto_profil,
    };

    localDB.saveDeviceRegistration(newReg);

    // Also push to central server immediately
    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReg),
    }).catch(() => {});

    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.from('device_registrations').upsert([
          {
            id: newReg.id,
            user_id: newReg.user_id,
            device_id: newReg.device_id,
            device_name: newReg.device_name,
            platform: newReg.platform,
            browser: newReg.browser,
            screen_resolution: newReg.screen_resolution,
            status: 'PENDING',
          },
        ]);
      } catch (err) {
        console.warn('Failed to insert device registration into Supabase:', err);
      }
    }

    await AuditService.logActivity(
      user,
      'AJUKAN_REGISTRASI_PERANGKAT',
      `Mengajukan pendaftaran perangkat: ${deviceInfo.deviceName} (${deviceInfo.deviceId}). Menunggu persetujuan Admin.`
    );

    return newReg;
  }

  /**
   * Retrieves all device registrations joined with teacher profile info
   */
  public static getAllRegistrations(): DeviceRegistration[] {
    const list = localDB.getDeviceRegistrations();
    const profiles = localDB.getProfiles();

    return list.map((reg) => {
      const p = profiles.find(
        (prof) =>
          prof.user_id === reg.user_id ||
          prof.id === reg.user_id ||
          prof.email.toLowerCase() === reg.user_email?.toLowerCase() ||
          prof.email.toLowerCase() === reg.user_id?.toLowerCase()
      );
      return {
        ...reg,
        user_nama: p?.nama || reg.user_nama || 'Guru',
        user_email: p?.email || reg.user_email || '-',
        user_nip: p?.nip || reg.user_nip || null,
        user_foto: p?.foto_profil || reg.user_foto || null,
      };
    });
  }

  /**
   * Gets registrations for a specific user
   */
  public static getUserRegistrations(userId: string): DeviceRegistration[] {
    return this.getAllRegistrations().filter((r) => r.user_id === userId);
  }

  /**
   * Admin approves a device registration
   */
  public static async approveDevice(
    registrationId: string,
    adminUser: Profile | null
  ): Promise<DeviceRegistration | null> {
    const reg = localDB.updateDeviceRegistrationStatus(
      registrationId,
      'APPROVED',
      adminUser?.user_id
    );

    if (!reg) return null;

    // Update the teacher's profile with the approved device ID
    const profiles = localDB.getProfiles();
    const teacherProfile = profiles.find(
      (p) =>
        p.user_id === reg.user_id ||
        p.id === reg.user_id ||
        p.email.toLowerCase() === reg.user_email?.toLowerCase() ||
        p.email.toLowerCase() === reg.user_id?.toLowerCase()
    );
    if (teacherProfile) {
      teacherProfile.registered_device_id = reg.device_id;
      teacherProfile.registered_device_name = reg.device_name;
      teacherProfile.device_registered_at = reg.approved_at || new Date().toISOString();
      localDB.saveProfile(teacherProfile);
    }

    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('device_registrations')
          .update({
            status: 'APPROVED',
            approved_by: adminUser?.user_id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', registrationId);
      } catch (err) {
        console.warn('Failed to update device registration in Supabase:', err);
      }
    }

    await AuditService.logActivity(
      adminUser,
      'SETUJUI_PERANGKAT',
      `Admin menyetujui pendaftaran perangkat ${reg.device_name} (ID: ${reg.device_id}) untuk guru: ${teacherProfile?.nama || reg.user_id}`
    );

    // Send Push Notification via Firebase Cloud Messaging
    FCMNotificationService.sendAttendanceRequestNotification({
      teacherUserId: reg.user_id,
      status: 'APPROVED',
      deviceName: reg.device_name,
    }).catch((err) => console.warn('Failed to send FCM approval notification:', err));

    return reg;
  }

  /**
   * Admin rejects a device registration
   */
  public static async rejectDevice(
    registrationId: string,
    adminUser: Profile | null,
    reason?: string
  ): Promise<DeviceRegistration | null> {
    const rejectionReason = reason || 'Ditolak oleh administrator sekolah.';
    const reg = localDB.updateDeviceRegistrationStatus(
      registrationId,
      'REJECTED',
      adminUser?.user_id,
      rejectionReason
    );

    if (!reg) return null;

    // Clear binding if it was bound
    const profiles = localDB.getProfiles();
    const teacherProfile = profiles.find(
      (p) =>
        p.user_id === reg.user_id ||
        p.id === reg.user_id ||
        p.email.toLowerCase() === reg.user_email?.toLowerCase() ||
        p.email.toLowerCase() === reg.user_id?.toLowerCase()
    );
    if (teacherProfile && teacherProfile.registered_device_id === reg.device_id) {
      teacherProfile.registered_device_id = null;
      teacherProfile.registered_device_name = null;
      localDB.saveProfile(teacherProfile);
    }

    await AuditService.logActivity(
      adminUser,
      'TOLAK_PERANGKAT',
      `Admin menolak pendaftaran perangkat ${reg.device_name} untuk ${teacherProfile?.nama || reg.user_id}. Alasan: ${rejectionReason}`
    );

    // Send Push Notification via Firebase Cloud Messaging
    FCMNotificationService.sendAttendanceRequestNotification({
      teacherUserId: reg.user_id,
      status: 'REJECTED',
      deviceName: reg.device_name,
      reason: rejectionReason,
    }).catch((err) => console.warn('Failed to send FCM rejection notification:', err));

    return reg;
  }

  /**
   * Admin blocks a device
   */
  public static async blockDevice(
    registrationId: string,
    adminUser: Profile | null,
    reason?: string
  ): Promise<DeviceRegistration | null> {
    const blockReason = reason || 'Perangkat diblokir karena indikasi pelanggaran aturan.';
    const reg = localDB.updateDeviceRegistrationStatus(
      registrationId,
      'BLOCKED',
      adminUser?.user_id,
      blockReason
    );

    if (!reg) return null;

    const teacherProfile = localDB.getProfileByUserId(reg.user_id);
    if (teacherProfile && teacherProfile.registered_device_id === reg.device_id) {
      teacherProfile.registered_device_id = null;
      teacherProfile.registered_device_name = null;
      localDB.saveProfile(teacherProfile);
    }

    await AuditService.logActivity(
      adminUser,
      'BLOKIR_PERANGKAT',
      `Admin memblokir perangkat ${reg.device_name} milik ${teacherProfile?.nama || reg.user_id}. Alasan: ${blockReason}`
    );

    // Send Push Notification via Firebase Cloud Messaging
    FCMNotificationService.sendAttendanceRequestNotification({
      teacherUserId: reg.user_id,
      status: 'BLOCKED',
      deviceName: reg.device_name,
      reason: blockReason,
    }).catch((err) => console.warn('Failed to send FCM block notification:', err));

    return reg;
  }


  /**
   * Verifies if the current physical device has an APPROVED registration for the teacher.
   */
  public static verifyDevice(profile: Profile): {
    isValid: boolean;
    isEnrolled: boolean;
    status: 'NOT_REGISTERED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
    currentDeviceId: string;
    registeredDeviceId: string | null;
    message: string;
    registrationRecord?: DeviceRegistration;
  } {
    const currentDeviceId = this.getDeviceId();
    const userRegistrations = this.getUserRegistrations(profile.user_id);
    const currentDeviceReg = userRegistrations.find((r) => r.device_id === currentDeviceId);

    // 1. If this exact device is found in registrations table
    if (currentDeviceReg) {
      if (currentDeviceReg.status === 'APPROVED') {
        return {
          isValid: true,
          isEnrolled: true,
          status: 'APPROVED',
          currentDeviceId,
          registeredDeviceId: currentDeviceReg.device_id,
          message: 'Perangkat fisik terdaftar & telah disetujui Admin (Valid).',
          registrationRecord: currentDeviceReg,
        };
      }
      if (currentDeviceReg.status === 'PENDING') {
        return {
          isValid: false,
          isEnrolled: true,
          status: 'PENDING',
          currentDeviceId,
          registeredDeviceId: currentDeviceReg.device_id,
          message: 'Perangkat ini sedang menunggu persetujuan (Approval) dari Administrator sekolah.',
          registrationRecord: currentDeviceReg,
        };
      }
      if (currentDeviceReg.status === 'REJECTED') {
        return {
          isValid: false,
          isEnrolled: true,
          status: 'REJECTED',
          currentDeviceId,
          registeredDeviceId: currentDeviceReg.device_id,
          message: `Pendaftaran perangkat ditolak oleh Admin. Catatan: ${currentDeviceReg.rejection_reason || 'Tidak memenuhi syarat.'}`,
          registrationRecord: currentDeviceReg,
        };
      }
      if (currentDeviceReg.status === 'BLOCKED') {
        return {
          isValid: false,
          isEnrolled: true,
          status: 'BLOCKED',
          currentDeviceId,
          registeredDeviceId: currentDeviceReg.device_id,
          message: `Perangkat ini telah diblokir oleh Admin: ${currentDeviceReg.rejection_reason || 'Indikasi penyalahgunaan.'}`,
          registrationRecord: currentDeviceReg,
        };
      }
    }

    // 2. If user already has another device approved
    if (profile.registered_device_id && profile.registered_device_id !== currentDeviceId) {
      return {
        isValid: false,
        isEnrolled: true,
        status: 'NOT_REGISTERED',
        currentDeviceId,
        registeredDeviceId: profile.registered_device_id,
        message: `Perangkat tidak cocok! Akun Anda terikat pada "${profile.registered_device_name || profile.registered_device_id}". Wajib menggunakan HP yang sudah disetujui.`,
      };
    }

    // 3. User has no approved devices yet
    return {
      isValid: false,
      isEnrolled: false,
      status: 'NOT_REGISTERED',
      currentDeviceId,
      registeredDeviceId: null,
      message: 'Perangkat belum didaftarkan. Harap ajukan pendaftaran HP ini untuk disetujui Admin.',
    };
  }
}
