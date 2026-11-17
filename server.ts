import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const SUPABASE_CONFIG_FILE = path.join(DATA_DIR, 'supabase_config.json');

// Helper to sanitize Supabase URL (strip /rest/v1/ or trailing slashes)
function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.trim()
    .replace(/\/rest\/v1\/?.*$/, '')
    .replace(/\/auth\/v1\/?.*$/, '')
    .replace(/\/storage\/v1\/?.*$/, '')
    .replace(/\/+$/, '');
}

// Ensure database file exists
function ensureDbExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      school: {
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
        radius_absensi: 100,
        jam_masuk: '07:30:00',
        jam_pulang: '15:30:00',
        timezone: 'Asia/Jakarta',
        wajib_perangkat_terdaftar: true,
        wajib_wajah_terdaftar: true,
        kop_surat_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      profiles: [],
      device_registrations: [],
      attendance: [],
      audit_logs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

ensureDbExists();

function readDatabase() {
  try {
    ensureDbExists();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      school: null,
      profiles: [],
      device_registrations: [],
      attendance: [],
      audit_logs: [],
    };
  }
}

function writeDatabase(data: any) {
  try {
    ensureDbExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

// Fixed Supabase Database Configuration (Locked)
const FIXED_SUPABASE_URL = 'https://pbwzpldlrnjsyjhrqbic.supabase.co';
const FIXED_SUPABASE_ANON_KEY = 'sb_publishable_p8Sdc6fqh0wKpko0gwSOHA_9yPymLtA';

// Supabase Server Instance
let serverSupabaseClient: SupabaseClient | null = null;

function getStoredSupabaseConfig() {
  return {
    url: FIXED_SUPABASE_URL,
    key: FIXED_SUPABASE_ANON_KEY,
    serviceKey: '',
  };
}

function initServerSupabase() {
  const cfg = getStoredSupabaseConfig();
  try {
    // Keep supabase_config.json synced with the locked credentials
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      SUPABASE_CONFIG_FILE,
      JSON.stringify({ url: FIXED_SUPABASE_URL, key: FIXED_SUPABASE_ANON_KEY }, null, 2),
      'utf-8'
    );
  } catch {}

  try {
    serverSupabaseClient = createClient(cfg.url, cfg.key);
    console.log('> Server Supabase Client initialized (FIXED) with:', cfg.url);
  } catch (e) {
    console.warn('> Server Supabase Client initialization error:', e);
    serverSupabaseClient = null;
  }
}

initServerSupabase();

// ------------------------------------------------------------------------------
// SUPABASE SYNC HELPERS (SERVER-SIDE)
// ------------------------------------------------------------------------------

async function syncSchoolToSupabase(school: any) {
  if (!serverSupabaseClient) return;
  try {
    const { data: rows } = await serverSupabaseClient.from('school_settings').select('id').limit(1);

    const payload: any = {
      nama_sekolah: school.nama_sekolah,
      logo_url: school.logo_url || null,
      npsn: school.npsn || null,
      alamat: school.alamat || '',
      telepon: school.telepon || null,
      email_sekolah: school.email_sekolah || null,
      kepala_sekolah_nama: school.kepala_sekolah_nama || null,
      kepala_sekolah_nip: school.kepala_sekolah_nip || null,
      latitude: Number(school.latitude),
      longitude: Number(school.longitude),
      radius_absensi: Number(school.radius_absensi || 100),
      jam_masuk: school.jam_masuk || '07:30:00',
      jam_pulang: school.jam_pulang || '15:30:00',
      timezone: school.timezone || 'Asia/Jakarta',
      wajib_perangkat_terdaftar: school.wajib_perangkat_terdaftar ?? true,
      wajib_wajah_terdaftar: school.wajib_wajah_terdaftar ?? true,
      updated_at: new Date().toISOString(),
    };

    if (rows && rows.length > 0) {
      const res = await serverSupabaseClient.from('school_settings').update(payload).eq('id', rows[0].id);
      if (res.error) console.warn('> Warning updating school in Supabase:', res.error.message);
      else console.log('> Synced school settings to Supabase (updated existing row)');
    } else {
      const res = await serverSupabaseClient.from('school_settings').insert([payload]);
      if (res.error) console.warn('> Warning inserting school in Supabase:', res.error.message);
      else console.log('> Synced school settings to Supabase (inserted new row)');
    }
  } catch (err: any) {
    console.warn('> Warning: Could not push school to Supabase:', err.message);
  }
}

async function syncProfileToSupabase(profile: any) {
  if (!serverSupabaseClient) return;
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

    const { error } = await serverSupabaseClient
      .from('profiles')
      .upsert(payload, { onConflict: 'email' });

    if (error) {
      console.warn('> Warning: Could not upsert profile to Supabase:', error.message);
    } else {
      console.log('> Synced profile to Supabase:', profile.email);
    }
  } catch (err: any) {
    console.warn('> Warning: Could not push profile to Supabase:', err.message);
  }
}

async function deleteProfileFromSupabase(profileId: string, email?: string) {
  if (!serverSupabaseClient) return;
  try {
    if (email) {
      await serverSupabaseClient.from('profiles').delete().eq('email', email.toLowerCase());
    } else {
      await serverSupabaseClient.from('profiles').delete().eq('id', profileId);
    }
  } catch (err: any) {
    console.warn('> Warning: Could not delete profile from Supabase:', err.message);
  }
}

async function syncDeviceToSupabase(device: any) {
  if (!serverSupabaseClient) return;
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

    await serverSupabaseClient
      .from('device_registrations')
      .upsert(payload, { onConflict: 'user_id,device_id' });
  } catch (err: any) {
    console.warn('> Warning: Could not push device to Supabase:', err.message);
  }
}

async function syncAttendanceToSupabase(record: any) {
  if (!serverSupabaseClient) return;
  try {
    const payload: any = {
      user_id: record.user_id,
      type: record.type,
      status: record.status,
      server_timestamp: record.server_timestamp,
      latitude: record.latitude,
      longitude: record.longitude,
      gps_accuracy: record.gps_accuracy,
      distance_from_school: record.distance_from_school,
      device_info: record.device_info,
      browser_info: record.browser_info,
      validation_result: record.validation_result,
      created_at: record.created_at,
    };

    if (record.id) payload.id = record.id;
    if (record.keterangan) payload.keterangan = record.keterangan;
    if (record.attachment_url) payload.attachment_url = record.attachment_url;

    await serverSupabaseClient.from('attendance').insert([payload]);
  } catch (err: any) {
    console.warn('> Warning: Could not push attendance to Supabase:', err.message);
  }
}

// ------------------------------------------------------------------------------
// REST API FOR MULTI-DEVICE PERSISTENT SYNC
// ------------------------------------------------------------------------------

// Supabase config endpoint (Read-only & Locked)
app.get('/api/supabase/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      url: FIXED_SUPABASE_URL,
      isConfigured: true,
      isFixed: true,
    },
  });
});

app.post('/api/supabase/config', (_req, res) => {
  res.status(403).json({
    success: false,
    message: 'Koneksi database Supabase dikunci secara permanen oleh sistem dan tidak dapat diubah dari panel Admin.',
  });
});

// Full state sync
app.get('/api/sync', async (_req, res) => {
  const db = readDatabase();

  // Optionally pull fresh data from Supabase if connected
  if (serverSupabaseClient) {
    try {
      const [schoolRes, profilesRes, devRes, attRes] = await Promise.all([
        serverSupabaseClient.from('school_settings').select('*').limit(1),
        serverSupabaseClient.from('profiles').select('*'),
        serverSupabaseClient.from('device_registrations').select('*'),
        serverSupabaseClient.from('attendance').select('*').order('server_timestamp', { ascending: false }).limit(200),
      ]);

      if (!schoolRes.error && schoolRes.data && schoolRes.data.length > 0) {
        db.school = { ...db.school, ...schoolRes.data[0] };
      }
      if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
        // Merge profiles preserving passwords stored locally
        const merged = profilesRes.data.map((remoteProfile: any) => {
          const local = (db.profiles || []).find((p: any) => p.email.toLowerCase() === remoteProfile.email.toLowerCase());
          return {
            ...remoteProfile,
            password: local?.password || 'Guru123!',
          };
        });
        db.profiles = merged;
      }
      if (!devRes.error && devRes.data && devRes.data.length > 0) {
        const existing = db.device_registrations || [];
        const mergedDev = [...devRes.data];
        existing.forEach((localD: any) => {
          if (!mergedDev.some((rd: any) => rd.device_id === localD.device_id && rd.user_id === localD.user_id)) {
            mergedDev.push(localD);
          }
        });
        db.device_registrations = mergedDev;
      }
      if (!attRes.error && attRes.data && attRes.data.length > 0) {
        const existingAtt = db.attendance || [];
        const mergedAtt = [...attRes.data];
        existingAtt.forEach((localA: any) => {
          if (!mergedAtt.some((ra: any) => ra.id === localA.id || (ra.server_timestamp === localA.server_timestamp && ra.user_id === localA.user_id))) {
            mergedAtt.push(localA);
          }
        });
        db.attendance = mergedAtt;
      }

      writeDatabase(db);
    } catch (e) {
      console.warn('> Supabase remote read failed, returning local cached DB:', e);
    }
  }

  res.json({ success: true, data: db, timestamp: Date.now() });
});

// School Settings
app.get('/api/school', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.school });
});

app.post('/api/school', (req, res) => {
  const db = readDatabase();
  db.school = {
    ...db.school,
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  writeDatabase(db);

  // Sync to Supabase in background
  syncSchoolToSupabase(db.school).catch(() => {});

  res.json({ success: true, data: db.school });
});

// Profiles
app.get('/api/profiles', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.profiles || [] });
});

app.post('/api/profiles', (req, res) => {
  const db = readDatabase();
  const profile = req.body;
  const list = db.profiles || [];
  const idx = list.findIndex(
    (p: any) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase()
  );

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...profile, updated_at: new Date().toISOString() };
  } else {
    list.push({ ...profile, updated_at: new Date().toISOString() });
  }

  db.profiles = list;
  writeDatabase(db);

  // Sync to Supabase in background
  syncProfileToSupabase(profile).catch(() => {});

  res.json({ success: true, data: list });
});

app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const target = (db.profiles || []).find((p: any) => p.id === id);
  db.profiles = (db.profiles || []).filter((p: any) => p.id !== id);
  writeDatabase(db);

  if (target) {
    deleteProfileFromSupabase(id, target.email).catch(() => {});
  }

  res.json({ success: true });
});

// Device Registrations
app.get('/api/devices', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.device_registrations || [] });
});

app.post('/api/devices', (req, res) => {
  const db = readDatabase();
  const device = req.body;
  const list = db.device_registrations || [];
  const idx = list.findIndex(
    (d: any) => d.id === device.id || (d.user_id === device.user_id && d.device_id === device.device_id)
  );

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...device, updated_at: new Date().toISOString() };
  } else {
    list.push(device);
  }

  db.device_registrations = list;
  writeDatabase(db);

  syncDeviceToSupabase(device).catch(() => {});

  res.json({ success: true, data: list });
});

app.patch('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const list = db.device_registrations || [];
  const idx = list.findIndex(
    (d: any) => d.id === id || (req.body.user_id && d.user_id === req.body.user_id && d.device_id === req.body.device_id)
  );

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...req.body, updated_at: new Date().toISOString() };
    db.device_registrations = list;
    writeDatabase(db);

    syncDeviceToSupabase(list[idx]).catch(() => {});

    res.json({ success: true, data: list[idx] });
  } else {
    res.status(404).json({ success: false, message: 'Device not found' });
  }
});

app.delete('/api/devices/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const list = db.device_registrations || [];
  const target = list.find((d: any) => d.id === id);
  db.device_registrations = list.filter((d: any) => d.id !== id);
  writeDatabase(db);

  if (serverSupabaseClient && target) {
    try {
      await serverSupabaseClient.from('device_registrations').delete().eq('device_id', target.device_id);
    } catch (err: any) {
      console.warn('> Warning: Could not delete device from Supabase:', err.message);
    }
  }

  res.json({ success: true });
});

// Attendance Records
app.get('/api/attendance', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.attendance || [] });
});

app.post('/api/attendance', (req, res) => {
  const db = readDatabase();
  const record = req.body;
  const list = db.attendance || [];
  list.unshift(record);
  db.attendance = list;
  writeDatabase(db);

  syncAttendanceToSupabase(record).catch(() => {});

  res.json({ success: true, data: record });
});

app.delete('/api/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const list = db.attendance || [];
  db.attendance = list.filter((a: any) => a.id !== id);
  writeDatabase(db);

  if (serverSupabaseClient) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        await serverSupabaseClient.from('attendance_photos').delete().eq('attendance_id', id);
        await serverSupabaseClient.from('attendance').delete().eq('id', id);
      } else {
        const target = list.find((a: any) => a.id === id);
        if (target?.server_timestamp) {
          await serverSupabaseClient.from('attendance').delete().eq('server_timestamp', target.server_timestamp);
        }
      }
      console.log('> Deleted attendance record from Supabase safely:', id);
    } catch (err: any) {
      console.warn('> Warning: Could not delete attendance from Supabase:', err.message);
    }
  }

  res.json({ success: true, message: 'Attendance record deleted successfully' });
});

// Notifications
app.get('/api/notifications', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.notifications || [] });
});

app.post('/api/notifications', (req, res) => {
  const db = readDatabase();
  const notification = req.body;
  const list = db.notifications || [];
  list.unshift(notification);
  db.notifications = list.slice(0, 200);
  writeDatabase(db);
  res.json({ success: true, data: notification });
});

// Audit Logs
app.get('/api/audit', (_req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db.audit_logs || [] });
});

app.post('/api/audit', (req, res) => {
  const db = readDatabase();
  const log = req.body;
  const list = db.audit_logs || [];
  list.unshift(log);
  db.audit_logs = list.slice(0, 500);
  writeDatabase(db);
  res.json({ success: true, data: log });
});

app.delete('/api/audit/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const list = db.audit_logs || [];
  const target = list.find((l: any) => l.id === id);
  db.audit_logs = list.filter((l: any) => l.id !== id);
  writeDatabase(db);

  if (serverSupabaseClient) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        await serverSupabaseClient.from('audit_logs').delete().eq('id', id);
      } else if (target?.description) {
        await serverSupabaseClient.from('audit_logs').delete().eq('description', target.description);
      }
    } catch (e: any) {
      console.warn('> Warning: Could not delete audit log from Supabase:', e.message);
    }
  }

  res.json({ success: true });
});

app.delete('/api/audit', async (_req, res) => {
  const db = readDatabase();
  db.audit_logs = [];
  writeDatabase(db);

  if (serverSupabaseClient) {
    try {
      await serverSupabaseClient.from('audit_logs').delete().neq('activity', '__NONE__');
    } catch (e: any) {
      console.warn('> Warning: Could not clear audit logs from Supabase:', e.message);
    }
  }

  res.json({ success: true });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    supabaseConfigured: Boolean(serverSupabaseClient),
  });
});

// ------------------------------------------------------------------------------
// VITE DEV SERVER MOUNT & STATIC SERVE
// ------------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Full-Stack Absensi Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
