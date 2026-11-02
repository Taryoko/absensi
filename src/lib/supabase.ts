import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  URL: 'absensi_supabase_url_custom',
  KEY: 'absensi_supabase_key_custom',
};

let clientInstance: SupabaseClient | null = null;
let realtimeChannel: any = null;

// Synchronously retrieve config from localStorage or env
export const getActiveSupabaseCredentials = () => {
  const customUrl = localStorage.getItem(STORAGE_KEYS.URL)?.trim() || '';
  const customKey = localStorage.getItem(STORAGE_KEYS.KEY)?.trim() || '';

  if (customUrl && customKey && !customUrl.includes('your-project.supabase.co')) {
    return { url: customUrl, key: customKey, isCustom: true };
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey && !envUrl.includes('your-project.supabase.co')) {
    return { url: envUrl, key: envKey, isCustom: false };
  }

  return { url: '', key: '', isCustom: false };
};

export const isLiveSupabaseConfigured = (): boolean => {
  const { url, key } = getActiveSupabaseCredentials();
  return (
    typeof url === 'string' &&
    url !== '' &&
    !url.includes('your-project.supabase.co') &&
    typeof key === 'string' &&
    key !== '' &&
    !key.includes('your-anon-key-here')
  );
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isLiveSupabaseConfigured()) {
    return null;
  }
  const { url, key } = getActiveSupabaseCredentials();
  if (!clientInstance) {
    clientInstance = createClient(url, key, {
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
 * Pulls Supabase credentials from the central server so all devices share the exact same database
 */
export async function syncCredentialsFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/supabase/config');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.url && json.data?.key) {
        localStorage.setItem(STORAGE_KEYS.URL, json.data.url.trim());
        localStorage.setItem(STORAGE_KEYS.KEY, json.data.key.trim());

        // Reinitialize client instance
        clientInstance = createClient(json.data.url.trim(), json.data.key.trim(), {
          realtime: { params: { eventsPerSecond: 10 } },
        });
        setupRealtimeSubscription(clientInstance);
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to sync Supabase config from server:', e);
  }
  return false;
}

export const saveCustomSupabaseConfig = async (url: string, key: string) => {
  localStorage.setItem(STORAGE_KEYS.URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.KEY, key.trim());

  // Save to central server so EVERY device (phone/PC) accesses the same Supabase database!
  try {
    await fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), key: key.trim() }),
    });
  } catch (e) {
    console.warn('Failed to push Supabase config to server:', e);
  }

  clientInstance = createClient(url.trim(), key.trim(), {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  setupRealtimeSubscription(clientInstance);
};

export const clearCustomSupabaseConfig = async () => {
  localStorage.removeItem(STORAGE_KEYS.URL);
  localStorage.removeItem(STORAGE_KEYS.KEY);
  clientInstance = null;

  try {
    await fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '', key: '' }),
    });
  } catch {}
};

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

export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<ConnectionTestResult> => {
  const creds = getActiveSupabaseCredentials();
  const targetUrl = (testUrl || creds.url || '').trim();
  const targetKey = (testKey || creds.key || '').trim();

  if (!targetUrl || !targetKey || targetUrl.includes('your-project.supabase.co')) {
    return {
      connected: false,
      latencyMs: 0,
      url: targetUrl || '(Belum diatur)',
      error: 'URL atau Anon Key Supabase belum diatur dengan valid.',
      tables: {
        profiles: false,
        school_settings: false,
        attendance: false,
        device_registrations: false,
      },
      storageReady: false,
    };
  }

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
