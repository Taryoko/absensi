import { createClient, SupabaseClient } from '@supabase/supabase-js';

const LEGACY_STORAGE_KEYS = {
  URL: 'absensi_supabase_url_custom',
  KEY: 'absensi_supabase_key_custom',
};

export const FIXED_SUPABASE_URL = 'https://pbwzpldlrnjsyjhrqbic.supabase.co';
export const FIXED_SUPABASE_ANON_KEY = 'sb_publishable_p8Sdc6fqh0wKpko0gwSOHA_9yPymLtA';

// Ensure no stale custom overrides remain in browser storage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEYS.URL);
    window.localStorage.removeItem(LEGACY_STORAGE_KEYS.KEY);
  } catch {}
}

let clientInstance: SupabaseClient | null = null;
let realtimeChannel: any = null;

// Always return permanently locked Supabase credentials
export const getActiveSupabaseCredentials = () => {
  return {
    url: FIXED_SUPABASE_URL,
    key: FIXED_SUPABASE_ANON_KEY,
    isCustom: false,
    isLocked: true,
  };
};

export const isLiveSupabaseConfigured = (): boolean => {
  return true;
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!clientInstance) {
    clientInstance = createClient(FIXED_SUPABASE_URL, FIXED_SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    setupRealtimeSubscription(clientInstance);
  }
  return clientInstance;
};

export const supabase: SupabaseClient | null = getSupabaseClient();

/**
 * Sets up Supabase Realtime WebSocket subscription for live multi-device sync
 */
export function setupRealtimeSubscription(client: SupabaseClient) {
  if (realtimeChannel) {
    try {
      client.removeChannel(realtimeChannel);
    } catch {}
    realtimeChannel = null;
  }

  try {
    realtimeChannel = client
      .channel('absensi-realtime-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_settings' },
        (payload) => {
          console.log('[Supabase Realtime] school_settings changed:', payload);
          window.dispatchEvent(new CustomEvent('absensi_realtime_school', { detail: payload }));
          window.dispatchEvent(new CustomEvent('absensi_synced', { detail: { school: payload.new } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Supabase Realtime] profiles changed:', payload);
          window.dispatchEvent(new CustomEvent('absensi_realtime_profiles', { detail: payload }));
          window.dispatchEvent(new CustomEvent('absensi_synced'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_registrations' },
        (payload) => {
          console.log('[Supabase Realtime] device_registrations changed:', payload);
          window.dispatchEvent(new CustomEvent('absensi_realtime_devices', { detail: payload }));
          window.dispatchEvent(new CustomEvent('absensi_synced'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          console.log('[Supabase Realtime] attendance changed:', payload);
          window.dispatchEvent(new CustomEvent('absensi_realtime_attendance', { detail: payload }));
          window.dispatchEvent(new CustomEvent('absensi_synced'));
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Channel status:', status);
      });
  } catch (err) {
    console.warn('[Supabase Realtime] Error establishing subscription:', err);
  }
}

/**
 * Ensures Supabase client is initialized with the permanently locked database credentials
 */
export async function syncCredentialsFromServer(): Promise<boolean> {
  getSupabaseClient();
  return true;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  url: string;
  error?: string;
  tables: {
    profiles: boolean;
    school_settings: boolean;
    attendance: boolean;
    device_registrations: boolean;
  };
  storageReady: boolean;
}

export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  const targetUrl = FIXED_SUPABASE_URL;
  const targetKey = FIXED_SUPABASE_ANON_KEY;

  const startTime = performance.now();
  try {
    const testClient = createClient(targetUrl, targetKey);

    const [profilesRes, schoolRes, attendanceRes, deviceRes, storageRes] = await Promise.all([
      testClient.from('profiles').select('id', { count: 'exact', head: true }).limit(1),
      testClient.from('school_settings').select('id', { count: 'exact', head: true }).limit(1),
      testClient.from('attendance').select('id', { count: 'exact', head: true }).limit(1),
      testClient.from('device_registrations').select('id', { count: 'exact', head: true }).limit(1),
      testClient.storage.getBucket('attendance-photos'),
    ]);

    const latencyMs = Math.round(performance.now() - startTime);

    const tables = {
      profiles: !profilesRes.error,
      school_settings: !schoolRes.error,
      attendance: !attendanceRes.error,
      device_registrations: !deviceRes.error,
    };

    const hasAnyTableSuccess =
      tables.profiles || tables.school_settings || tables.attendance || tables.device_registrations;

    if (!hasAnyTableSuccess && profilesRes.error) {
      return {
        connected: false,
        latencyMs,
        url: targetUrl,
        error: profilesRes.error.message || 'Gagal berkomunikasi dengan database Supabase.',
        tables,
        storageReady: !storageRes.error,
      };
    }

    return {
      connected: true,
      latencyMs,
      url: targetUrl,
      tables,
      storageReady: !storageRes.error,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      connected: false,
      latencyMs,
      url: targetUrl,
      error: err.message || 'Gagal menghubungi server Supabase (Network/CORS error).',
      tables: {
        profiles: false,
        school_settings: false,
        attendance: false,
        device_registrations: false,
      },
      storageReady: false,
    };
  }
};
