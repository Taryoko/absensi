import { getSupabaseClient, isLiveSupabaseConfigured } from '../lib/supabase';
import { SchoolSettings, Profile, DeviceRegistration, Attendance } from '../types';
import { localDB } from './store';

export class SupabaseSyncService {
  /**
   * Pushes school settings to Supabase
   */
  public static async pushSchoolSettings(settings: Partial<SchoolSettings>): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      // Find existing row ID (UUID)
      const { data: existingRows } = await client.from('school_settings').select('id').limit(1);

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (settings.nama_sekolah !== undefined) payload.nama_sekolah = settings.nama_sekolah;
      if (settings.logo_url !== undefined) payload.logo_url = settings.logo_url;
      if (settings.npsn !== undefined) payload.npsn = settings.npsn;
      if (settings.alamat !== undefined) payload.alamat = settings.alamat;
      if (settings.telepon !== undefined) payload.telepon = settings.telepon;
      if (settings.email_sekolah !== undefined) payload.email_sekolah = settings.email_sekolah;
      if (settings.kepala_sekolah_nama !== undefined) payload.kepala_sekolah_nama = settings.kepala_sekolah_nama;
      if (settings.kepala_sekolah_nip !== undefined) payload.kepala_sekolah_nip = settings.kepala_sekolah_nip;
      if (settings.latitude !== undefined) payload.latitude = Number(settings.latitude);
      if (settings.longitude !== undefined) payload.longitude = Number(settings.longitude);
      if (settings.radius_absensi !== undefined) payload.radius_absensi = Number(settings.radius_absensi);
      if (settings.jam_masuk !== undefined) payload.jam_masuk = settings.jam_masuk;
      if (settings.jam_pulang !== undefined) payload.jam_pulang = settings.jam_pulang;
      if (settings.timezone !== undefined) payload.timezone = settings.timezone;
      if (settings.wajib_perangkat_terdaftar !== undefined) payload.wajib_perangkat_terdaftar = settings.wajib_perangkat_terdaftar;
      if (settings.wajib_wajah_terdaftar !== undefined) payload.wajib_wajah_terdaftar = settings.wajib_wajah_terdaftar;
      if (settings.kop_surat_url !== undefined) payload.kop_surat_url = settings.kop_surat_url;

      if (existingRows && existingRows.length > 0) {
        const { error } = await client
          .from('school_settings')
          .update(payload)
          .eq('id', existingRows[0].id);

        if (error) {
          console.warn('[SupabaseSync] Failed to update school_settings:', error.message);
          return false;
        }
      } else {
        const { error } = await client.from('school_settings').insert([payload]);
        if (error) {
          console.warn('[SupabaseSync] Failed to insert school_settings:', error.message);
          return false;
        }
      }

      console.log('[SupabaseSync] School settings synced successfully to Supabase');
      return true;
    } catch (err) {
      console.warn('[SupabaseSync] Error pushing school settings to Supabase:', err);
      return false;
    }
  }

  /**
   * Fetches latest school settings from Supabase
   */
  public static async fetchSchoolSettings(): Promise<Partial<SchoolSettings> | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('school_settings').select('*').limit(1);
      if (error || !data || data.length === 0) return null;
      return data[0] as SchoolSettings;
    } catch {
      return null;
    }
  }

  /**
   * Pushes a profile to Supabase
   */
  public static async pushProfile(profile: Profile): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const payload = {
        nama: profile.nama,
        nip: profile.nip || null,
        email: profile.email.toLowerCase(),
        role: profile.role,
        foto_profil: profile.foto_profil || null,
        status_aktif: profile.status_aktif ?? true,
        registered_device_id: profile.registered_device_id || null,
        registered_device_name: profile.registered_device_name || null,
        device_registered_at: profile.device_registered_at || null,
        registered_face_url: profile.registered_face_url || null,
        registered_face_hash: profile.registered_face_hash || null,
        face_registered_at: profile.face_registered_at || null,
        biometric_enrolled: profile.biometric_enrolled ?? false,
        updated_at: new Date().toISOString(),
      };

      const { error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'email' });

      if (error) {
        console.warn('[SupabaseSync] Failed to upsert profile to Supabase:', error.message);
        return false;
      }

      console.log('[SupabaseSync] Profile synced successfully to Supabase:', profile.email);
      return true;
    } catch (err) {
      console.warn('[SupabaseSync] Error pushing profile to Supabase:', err);
      return false;
    }
  }

  /**
   * Fetches profiles from Supabase
   */
  public static async fetchProfiles(): Promise<Profile[] | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('profiles').select('*');
      if (error || !data) return null;
      return data as Profile[];
    } catch {
      return null;
    }
  }

  /**
   * Pushes a device registration to Supabase
   */
  public static async pushDeviceRegistration(device: DeviceRegistration): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const payload = {
        user_id: device.user_id,
        device_id: device.device_id,
        device_name: device.device_name,
        platform: device.platform || null,
        browser: device.browser || null,
        screen_resolution: device.screen_resolution || null,
        status: device.status,
        approved_by: device.approved_by || null,
        approved_at: device.approved_at || null,
        rejection_reason: device.rejection_reason || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await client
        .from('device_registrations')
        .upsert(payload, { onConflict: 'user_id,device_id' });

      if (error) {
        console.warn('[SupabaseSync] Failed to upsert device registration to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseSync] Error pushing device registration:', err);
      return false;
    }
  }

  /**
   * Fetches device registrations from Supabase
   */
  public static async fetchDeviceRegistrations(): Promise<DeviceRegistration[] | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.from('device_registrations').select('*');
      if (error || !data) return null;
      return data as DeviceRegistration[];
    } catch {
      return null;
    }
  }

  /**
   * Deletes a device registration from Supabase
   */
  public static async deleteDeviceRegistration(id: string): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      await client.from('device_registrations').delete().eq('id', id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pushes attendance record to Supabase
   */
  public static async pushAttendance(record: Attendance): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const payload: Record<string, any> = {
        id: record.id,
        user_id: record.user_id,
        type: record.type,
        status: record.status,
        server_timestamp: record.server_timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        gps_accuracy: record.gps_accuracy,
        distance_from_school: record.distance_from_school,
        photo_id: record.photo_id || null,
        device_info: record.device_info,
        browser_info: record.browser_info,
        validation_result: record.validation_result,
        created_at: record.created_at,
      };

      if (record.keterangan) payload.keterangan = record.keterangan;
      if (record.attachment_url) payload.attachment_url = record.attachment_url;

      const { error } = await client.from('attendance').upsert([payload], { onConflict: 'id' });
      if (error) {
        console.warn('[SupabaseSync] Failed to insert attendance to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseSync] Error pushing attendance to Supabase:', err);
      return false;
    }
  }

  /**
   * Fetches attendance records from Supabase
   */
  public static async fetchAttendance(): Promise<Attendance[] | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('attendance')
        .select('*')
        .order('server_timestamp', { ascending: false });
      if (error || !data) return null;
      return data as Attendance[];
    } catch {
      return null;
    }
  }

  /**
   * Deletes an attendance record from Supabase safely
   */
  public static async deleteAttendance(id: string, targetRecord?: Attendance): Promise<boolean> {
    if (!isLiveSupabaseConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      // 1. Delete associated photos
      await client.from('attendance_photos').delete().eq('attendance_id', id);

      // 2. Delete by id directly
      const { error } = await client.from('attendance').delete().eq('id', id);
      if (error) {
        console.warn('[SupabaseSync] Direct id deletion note:', error.message);
      }

      // 3. Fallback: match by timestamp and user_id in case id differs
      const target = targetRecord || localDB.getAttendances().find((r: Attendance) => r.id === id);
      if (target && target.server_timestamp && target.user_id) {
        await client
          .from('attendance')
          .delete()
          .eq('user_id', target.user_id)
          .eq('server_timestamp', target.server_timestamp);
      }

      console.log('[SupabaseSync] Attendance deleted from Supabase:', id);
      return true;
    } catch (err) {
      console.warn('[SupabaseSync] Error deleting attendance:', err);
      return false;
    }
  }
}
