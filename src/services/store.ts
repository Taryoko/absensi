import { Profile, SchoolSettings, Attendance, AttendancePhoto, AuditLog, DeviceRegistration } from '../types';
import { SupabaseSyncService } from './supabaseSyncService';
import { syncCredentialsFromServer } from '../lib/supabase';

const STORAGE_KEYS = {
  PROFILES: 'absensi_profiles_v1',
  SCHOOL: 'absensi_school_settings_v1',
  ATTENDANCE: 'absensi_records_v1',
  PHOTOS: 'absensi_photos_v1',
  AUDIT: 'absensi_audit_logs_v1',
  CURRENT_USER: 'absensi_auth_user_v1',
  DEVICE_REGISTRATIONS: 'absensi_device_registrations_v1',
};

// Initial School Settings (SMK Komputama Pesahangan)
export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  id: 'school-pesahangan-01',
  nama_sekolah: 'SMK Komputama Pesahangan',
  alamat: 'Jl. Raya Pesahangan No. 12, Kec. Cimanggu / Pesahangan, Jawa Tengah',
  logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
  npsn: '69786432',
  telepon: '(0282) 555-1234 / 0812-3456-7890',
  email_sekolah: 'info@smkkomputamapesahangan.sch.id',
  kepala_sekolah_nama: 'Drs. Bambang Sudarsono, M.Pd.',
  kepala_sekolah_nip: '196808151994031005',
  latitude: -7.234850,
  longitude: 108.923450,
  radius_absensi: 100, // 100 meters
  jam_masuk: '07:30:00',
  jam_pulang: '15:30:00',
  timezone: 'Asia/Jakarta',
  wajib_perangkat_terdaftar: true,
  wajib_wajah_terdaftar: true,
  kop_surat_url: null,
  created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
};

// 4 Real Database Accounts from data/database.json & Supabase
export const DATABASE_DEFAULT_USERS: Array<{
  profile: Profile;
  passwordHash: string;
}> = [
  {
    profile: {
      id: 'bf094bfc-5c7c-493d-8d60-600cc5e48d2d',
      user_id: 'bf094bfc-5c7c-493d-8d60-600cc5e48d2d',
      nama: 'Okotar',
      nip: '198501012010011001',
      email: 'superadmin@gmail.com',
      role: 'admin',
      password: 'admin123',
      foto_profil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status_aktif: true,
      registered_device_id: null,
      registered_device_name: null,
      biometric_enrolled: false,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    },
    passwordHash: 'admin123',
  },
  {
    profile: {
      id: '874d3938-1032-41fb-8831-c07745e95cd7',
      user_id: '874d3938-1032-41fb-8831-c07745e95cd7',
      nama: 'Badriyono, S.Kom.',
      nip: '197505052005011003',
      email: 'kepsek@gmail.com',
      role: 'kepsek',
      password: 'Guru123!',
      foto_profil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status_aktif: true,
      registered_device_id: null,
      registered_device_name: null,
      biometric_enrolled: false,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    },
    passwordHash: 'Guru123!',
  },
  {
    profile: {
      id: '9dc21802-552b-485a-88e3-5834f09d49a9',
      user_id: '9dc21802-552b-485a-88e3-5834f09d49a9',
      nama: 'Jaminatun Hanifah, S.Kom.',
      nip: '-',
      email: 'jaminatun@gmail.com',
      role: 'guru',
      password: 'Guru123!',
      foto_profil: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      status_aktif: true,
      registered_device_id: null,
      registered_device_name: null,
      registered_face_url: null,
      registered_face_hash: null,
      biometric_enrolled: false,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    },
    passwordHash: 'Guru123!',
  },
  {
    profile: {
      id: '3981f67a-af1d-4dfa-9ffc-97badf378e85',
      user_id: '3981f67a-af1d-4dfa-9ffc-97badf378e85',
      nama: 'Taryoko',
      nip: '-',
      email: 'taryoko@gmail.com',
      role: 'guru',
      password: 'Guru123!',
      foto_profil: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status_aktif: true,
      registered_device_id: null,
      registered_device_name: null,
      registered_face_url: null,
      registered_face_hash: null,
      biometric_enrolled: false,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    },
    passwordHash: 'Guru123!',
  },
];

export const DEMO_USERS = DATABASE_DEFAULT_USERS;

class LocalDatabase {
  private syncTimer: any = null;
  private isSyncing = false;
  private hasInitialized = false;

  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error saving ${key} to storage`, err);
    }
  }

  // Initializer & Remote API / Supabase Sync
  public init() {
    // Purge any old demo accounts with @sekolah.local
    const existing = this.get<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const filteredExisting = existing.filter(
      (p) => !p.email.toLowerCase().endsWith('@sekolah.local')
    );

    if (filteredExisting.length === 0) {
      this.set(
        STORAGE_KEYS.PROFILES,
        DATABASE_DEFAULT_USERS.map((u) => u.profile)
      );
    } else {
      let changed = false;
      // Ensure all 3 real accounts exist
      DATABASE_DEFAULT_USERS.forEach((def) => {
        const found = filteredExisting.find(
          (p) => p.email.toLowerCase() === def.profile.email.toLowerCase()
        );
        if (!found) {
          filteredExisting.push(def.profile);
          changed = true;
        } else {
          if (!found.password) {
            found.password = def.passwordHash;
            changed = true;
          }
          if (!found.user_id) {
            found.user_id = def.profile.user_id || found.id;
            changed = true;
          }
        }
      });
      if (changed || filteredExisting.length !== existing.length) {
        this.set(STORAGE_KEYS.PROFILES, filteredExisting);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.SCHOOL)) {
      this.set(STORAGE_KEYS.SCHOOL, DEFAULT_SCHOOL_SETTINGS);
    }

    // Clean up devreg-demo-01 if present
    const existingRegs = this.get<DeviceRegistration[]>(STORAGE_KEYS.DEVICE_REGISTRATIONS, []);
    const cleanRegs = existingRegs.filter((r) => r.id !== 'devreg-demo-01');
    if (cleanRegs.length !== existingRegs.length) {
      this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, cleanRegs);
    }

    // Clean up automatic demo attendance if present
    const existingAtt = this.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE, []);
    const cleanAtt = existingAtt.filter((a) => a.id !== 'att-demo-01' && !a.id.startsWith('demo-'));
    if (cleanAtt.length !== existingAtt.length) {
      this.set(STORAGE_KEYS.ATTENDANCE, cleanAtt);
    }

    if (!this.hasInitialized) {
      this.hasInitialized = true;

      // 1. Sync Supabase credentials from central server
      syncCredentialsFromServer().then((hasCredentials) => {
        if (hasCredentials) {
          // 2. Fetch directly from Supabase
          this.pullDirectFromSupabase();
        }
      });

      // 3. Trigger initial sync with backend
      this.syncFromServer();
      this.startBackgroundSync();
    }
  }

  /**
   * Directly pulls latest data from Supabase if configured
   */
  public async pullDirectFromSupabase() {
    try {
      const [remoteSchool, remoteProfiles, remoteDevices, remoteAttendance] = await Promise.all([
        SupabaseSyncService.fetchSchoolSettings(),
        SupabaseSyncService.fetchProfiles(),
        SupabaseSyncService.fetchDeviceRegistrations(),
        SupabaseSyncService.fetchAttendance(),
      ]);

      if (remoteSchool && remoteSchool.nama_sekolah) {
        const current = this.getSchoolSettings();
        const merged = { ...current, ...remoteSchool };
        this.set(STORAGE_KEYS.SCHOOL, merged);
        window.dispatchEvent(new CustomEvent('absensi_synced', { detail: { school: merged } }));
      }

      if (remoteProfiles && remoteProfiles.length > 0) {
        const localList = this.getProfiles();
        const mergedProfiles = remoteProfiles.map((rp) => {
          const matchedLocal = localList.find((lp) => lp.email.toLowerCase() === rp.email.toLowerCase());
          const effectiveId = rp.id || matchedLocal?.id || rp.user_id;
          return {
            ...rp,
            id: effectiveId,
            user_id: rp.user_id || effectiveId,
            password: matchedLocal?.password || 'Guru123!',
          };
        });
        this.set(STORAGE_KEYS.PROFILES, mergedProfiles);
        window.dispatchEvent(new CustomEvent('absensi_synced', { detail: { profiles: mergedProfiles } }));
      }

      if (remoteDevices && remoteDevices.length > 0) {
        this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, remoteDevices);
      }

      if (remoteAttendance && remoteAttendance.length > 0) {
        this.set(STORAGE_KEYS.ATTENDANCE, remoteAttendance);
      }
    } catch (e) {
      console.warn('Direct Supabase pull failed:', e);
    }
  }

  /**
   * Fetches latest data from server API (/api/sync) to ensure cross-device consistency
   */
  public async syncFromServer() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const { school, profiles, device_registrations, attendance, audit_logs } = json.data;

          if (school && school.nama_sekolah) {
            this.set(STORAGE_KEYS.SCHOOL, school);
          }
          if (Array.isArray(profiles) && profiles.length > 0) {
            const fixedProfiles = profiles.map((p: any) => ({
              ...p,
              user_id: p.user_id || p.id,
            }));
            this.set(STORAGE_KEYS.PROFILES, fixedProfiles);
          }
          if (Array.isArray(device_registrations)) {
            this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, device_registrations);
          }
          if (Array.isArray(attendance)) {
            this.set(STORAGE_KEYS.ATTENDANCE, attendance);
          }
          if (Array.isArray(audit_logs)) {
            this.set(STORAGE_KEYS.AUDIT, audit_logs);
          }

          // Notify window listeners
          window.dispatchEvent(new CustomEvent('absensi_synced', { detail: json.data }));
        }
      }
    } catch {
      // Fallback silently to local cache if offline or in isolated client mode
    } finally {
      this.isSyncing = false;
    }
  }

  private startBackgroundSync() {
    if (this.syncTimer) return;
    // Poll every 4 seconds to sync between multiple open devices
    this.syncTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.syncFromServer();
      }
    }, 4000);
  }

  // School Settings
  public getSchoolSettings(): SchoolSettings {
    this.init();
    return this.get<SchoolSettings>(STORAGE_KEYS.SCHOOL, DEFAULT_SCHOOL_SETTINGS);
  }

  public updateSchoolSettings(settings: Partial<SchoolSettings>): SchoolSettings {
    const current = this.getSchoolSettings();
    const updated: SchoolSettings = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    this.set(STORAGE_KEYS.SCHOOL, updated);

    // 1. Push to server API for all devices
    fetch('/api/school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    // 2. Direct push to Supabase table
    SupabaseSyncService.pushSchoolSettings(updated).catch(() => {});

    return updated;
  }

  // Profiles
  public getProfiles(): Profile[] {
    this.init();
    const list = this.get<Profile[]>(STORAGE_KEYS.PROFILES, DEMO_USERS.map((u) => u.profile));
    return list.map((p) => ({
      ...p,
      user_id: p.user_id || p.id,
    }));
  }

  public getProfileByUserId(userId: string): Profile | undefined {
    if (!userId) return undefined;
    return this.getProfiles().find((p) => (p.user_id && p.user_id === userId) || (p.id && p.id === userId));
  }

  public getProfileByEmail(email: string): Profile | undefined {
    if (!email) return undefined;
    return this.getProfiles().find((p) => p.email && p.email.toLowerCase() === email.toLowerCase());
  }

  public saveProfile(profile: Profile): void {
    const list = this.getProfiles();
    const index = list.findIndex((p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase());
    if (index >= 0) {
      list[index] = { ...profile, updated_at: new Date().toISOString() };
    } else {
      list.push(profile);
    }
    this.set(STORAGE_KEYS.PROFILES, list);

    // 1. Push to server API for all devices
    fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch(() => {});

    // 2. Direct push to Supabase table
    SupabaseSyncService.pushProfile(profile).catch(() => {});
  }

  public deleteProfile(profileId: string): void {
    const target = this.getProfiles().find((p) => p.id === profileId);
    const list = this.getProfiles().filter((p) => p.id !== profileId);
    this.set(STORAGE_KEYS.PROFILES, list);

    fetch(`/api/profiles/${profileId}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  // Attendance
  public getAttendances(): Attendance[] {
    return this.get<Attendance[]>(STORAGE_KEYS.ATTENDANCE, []);
  }

  public saveAttendance(record: Attendance): void {
    const list = this.getAttendances();
    list.unshift(record);
    this.set(STORAGE_KEYS.ATTENDANCE, list);

    // 1. Push to server API
    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});

    // 2. Direct push to Supabase
    SupabaseSyncService.pushAttendance(record).catch(() => {});
  }

  public deleteAttendance(id: string): void {
    const list = this.getAttendances().filter((a) => a.id !== id);
    this.set(STORAGE_KEYS.ATTENDANCE, list);

    // 1. Delete from server API
    fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    // 2. Delete from Supabase
    SupabaseSyncService.deleteAttendance(id).catch(() => {});

    // 3. Notify real-time listeners
    window.dispatchEvent(new CustomEvent('absensi_realtime_attendance'));
    window.dispatchEvent(new CustomEvent('absensi_synced'));
  }

  // Photos
  public getPhotos(): AttendancePhoto[] {
    return this.get<AttendancePhoto[]>(STORAGE_KEYS.PHOTOS, []);
  }

  public savePhoto(photo: AttendancePhoto): void {
    const list = this.getPhotos();
    list.push(photo);
    this.set(STORAGE_KEYS.PHOTOS, list);
  }

  public getPhotoByAttendanceId(attendanceId: string): AttendancePhoto | undefined {
    return this.getPhotos().find((p) => p.attendance_id === attendanceId);
  }

  // Device Registrations
  public getDeviceRegistrations(): DeviceRegistration[] {
    this.init();
    return this.get<DeviceRegistration[]>(STORAGE_KEYS.DEVICE_REGISTRATIONS, []);
  }

  public saveDeviceRegistration(reg: DeviceRegistration): void {
    const list = this.getDeviceRegistrations();
    const existingIndex = list.findIndex(
      (r) => r.id === reg.id || (r.user_id === reg.user_id && r.device_id === reg.device_id)
    );
    if (existingIndex >= 0) {
      list[existingIndex] = { ...reg, updated_at: new Date().toISOString() };
    } else {
      list.unshift(reg);
    }
    this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, list);

    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    }).catch(() => {});

    SupabaseSyncService.pushDeviceRegistration(reg).catch(() => {});
  }

  public updateDeviceRegistrationStatus(
    id: string,
    status: DeviceRegistration['status'],
    approvedBy?: string | null,
    rejectionReason?: string | null
  ): DeviceRegistration | null {
    const list = this.getDeviceRegistrations();
    const target = list.find((r) => r.id === id);
    if (!target) return null;

    target.status = status;
    target.updated_at = new Date().toISOString();
    if (status === 'APPROVED') {
      target.approved_by = approvedBy || null;
      target.approved_at = new Date().toISOString();
      target.rejection_reason = null;
    } else if (status === 'REJECTED') {
      target.rejection_reason = rejectionReason || 'Ditolak oleh administrator';
    } else if (status === 'BLOCKED') {
      target.rejection_reason = rejectionReason || 'Perangkat diblokir oleh administrator';
    }

    this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, list);

    fetch(`/api/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approved_by: approvedBy, rejection_reason: rejectionReason }),
    }).catch(() => {});

    SupabaseSyncService.pushDeviceRegistration(target).catch(() => {});

    return target;
  }

  public deleteDeviceRegistration(id: string): void {
    const list = this.getDeviceRegistrations().filter((r) => r.id !== id);
    this.set(STORAGE_KEYS.DEVICE_REGISTRATIONS, list);

    fetch(`/api/devices/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    SupabaseSyncService.deleteDeviceRegistration(id).catch(() => {});
    window.dispatchEvent(new CustomEvent('absensi_realtime_devices'));
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    this.init();
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const list = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    list.unshift(newLog);
    this.set(STORAGE_KEYS.AUDIT, list);

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});

    return newLog;
  }

  public deleteAuditLog(id: string): void {
    const list = this.getAuditLogs().filter((l) => l.id !== id);
    this.set(STORAGE_KEYS.AUDIT, list);

    fetch(`/api/audit/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  }

  public clearAuditLogs(): void {
    this.set(STORAGE_KEYS.AUDIT, []);

    fetch('/api/audit', {
      method: 'DELETE',
    }).catch(() => {});
  }
}

export const localDB = new LocalDatabase();
