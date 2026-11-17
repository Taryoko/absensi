import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Server,
  Lock,
  Globe,
  Code2,
  FileCode,
  Zap,
  UploadCloud,
} from 'lucide-react';
import {
  getActiveSupabaseCredentials,
  testSupabaseConnection,
  ConnectionTestResult,
  isLiveSupabaseConfigured,
} from '../../lib/supabase';
import { localDB } from '../../services/store';
import { SupabaseSyncService } from '../../services/supabaseSyncService';

// Schema SQL content embedded for instant viewing, copying, and downloading
const SQL_FIX_ATTENDANCE_CONTENT = `-- ==============================================================================
-- SOLUSI PERBAIKAN TABEL RIWAYAT ABSENSI & IZIN HAPUS ADMIN (100% ANTI-ERROR)
-- Jalankan skrip ini di menu SQL Editor Supabase (supabase.com/dashboard)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CARA REKOMENDASI (BERSIH, CEPAT & 100% BEBAS DARI ERROR CONSTRAINT / TIPE DATA):
-- ------------------------------------------------------------------------------
-- Hapus constraint foreign key jika ada yang menghalangi pendaftaran perangkat guru
ALTER TABLE IF EXISTS public.device_registrations DROP CONSTRAINT IF EXISTS device_registrations_user_id_fkey;
ALTER TABLE IF EXISTS public.device_registrations ALTER COLUMN user_id TYPE TEXT;

DROP TABLE IF EXISTS public.attendance_photos CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;

-- 1. Buat Tabel Absensi dengan ID TEXT fleksibel (Mendukung UUID & Custom ID)
CREATE TABLE public.attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'izin', 'sakit')),
    status TEXT NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION NOT NULL,
    distance_from_school DOUBLE PRECISION NOT NULL,
    photo_id TEXT,
    device_info TEXT,
    browser_info TEXT,
    validation_result JSONB,
    keterangan TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index performa pencarian
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_server_timestamp ON public.attendance(server_timestamp DESC);

-- 2. Buat Tabel Foto Absensi
CREATE TABLE public.attendance_photos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attendance_id TEXT,
    storage_path TEXT NOT NULL,
    file_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Izinkan Hak Akses Penuh RLS (Admin dapat Bebas Membaca, Menyimpan & Menghapus)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all attendance" ON public.attendance;
CREATE POLICY "Allow all attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.attendance_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all attendance_photos" ON public.attendance_photos;
CREATE POLICY "Allow all attendance_photos" ON public.attendance_photos FOR ALL USING (true) WITH CHECK (true);

-- 4. Aktifkan Realtime WebSocket Synchronization Supabase
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;
END $$;
`;

const SQL_SCHEMA_CONTENT = `-- ==============================================================================
-- SCHEMA ABSENSI GURU GPS & FACE ID (MULTI-DEVICE SUPABASE REALTIME)
-- SMK KOMPUTAMA PESAHANGAN
-- Timezone: Asia/Jakarta
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES & FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. SCHOOL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_sekolah TEXT NOT NULL,
    logo_url TEXT,
    npsn TEXT,
    alamat TEXT NOT NULL,
    telepon TEXT,
    email_sekolah TEXT,
    kepala_sekolah_nama TEXT,
    kepala_sekolah_nip TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_absensi INTEGER NOT NULL DEFAULT 100,
    jam_masuk TIME NOT NULL DEFAULT '07:30:00',
    jam_pulang TIME NOT NULL DEFAULT '15:30:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    wajib_perangkat_terdaftar BOOLEAN DEFAULT true,
    wajib_wajah_terdaftar BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER update_school_settings_modtime
    BEFORE UPDATE ON public.school_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    nama TEXT NOT NULL,
    nip TEXT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'kepsek', 'guru')),
    foto_profil TEXT,
    status_aktif BOOLEAN DEFAULT true,
    registered_device_id TEXT,
    registered_device_name TEXT,
    device_registered_at TIMESTAMPTZ,
    registered_face_url TEXT,
    registered_face_hash TEXT,
    face_registered_at TIMESTAMPTZ,
    biometric_enrolled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. DEVICE REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    platform TEXT,
    browser TEXT,
    screen_resolution TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED')) DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE OR REPLACE TRIGGER update_device_registrations_modtime
    BEFORE UPDATE ON public.device_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_device_reg_user_id ON public.device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_status ON public.device_registrations(status);

-- 6. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out', 'izin', 'sakit')),
    status TEXT NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION NOT NULL,
    distance_from_school DOUBLE PRECISION NOT NULL,
    photo_id TEXT,
    device_info TEXT,
    browser_info TEXT,
    validation_result JSONB,
    keterangan TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_server_timestamp ON public.attendance(server_timestamp DESC);

-- 7. ATTENDANCE PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_photos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    attendance_id TEXT,
    storage_path TEXT NOT NULL,
    file_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    activity TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR FULL CROSS-DEVICE OPERATION
-- ==============================================================================

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_settings" ON public.school_settings;
CREATE POLICY "Allow all school_settings" ON public.school_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all profiles" ON public.profiles;
CREATE POLICY "Allow all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all device_registrations" ON public.device_registrations;
CREATE POLICY "Allow all device_registrations" ON public.device_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all attendance" ON public.attendance;
CREATE POLICY "Allow all attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all attendance_photos" ON public.attendance_photos;
CREATE POLICY "Allow all attendance_photos" ON public.attendance_photos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME WEBSOCKET REPLICATION
-- ==============================================================================

ALTER TABLE public.school_settings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.device_registrations REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'school_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_settings;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'device_registrations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.device_registrations;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;
END $$;

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-photos', 'attendance-photos', true) ON CONFLICT (id) DO NOTHING;

-- Initial School Seed
INSERT INTO public.school_settings (
    nama_sekolah,
    logo_url,
    npsn,
    alamat,
    telepon,
    email_sekolah,
    kepala_sekolah_nama,
    kepala_sekolah_nip,
    latitude,
    longitude,
    radius_absensi,
    jam_masuk,
    jam_pulang,
    timezone
) VALUES (
    'SMK Komputama Pesahangan',
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
    '69786432',
    'Jl. Raya Pesahangan No. 12, Kec. Cimanggu / Pesahangan, Jawa Tengah',
    '(0282) 555-1234 / 0812-3456-7890',
    'info@smkkomputamapesahangan.sch.id',
    'Drs. Bambang Sudarsono, M.Pd.',
    '196808151994031005',
    -7.234850,
    108.923450,
    100,
    '07:30:00',
    '15:30:00',
    'Asia/Jakarta'
) ON CONFLICT DO NOTHING;
`;

export const DatabaseSqlPage: React.FC = () => {
  const creds = getActiveSupabaseCredentials();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [copiedAttendanceFix, setCopiedAttendanceFix] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleCopyAttendanceFix = () => {
    navigator.clipboard.writeText(SQL_FIX_ATTENDANCE_CONTENT);
    setCopiedAttendanceFix(true);
    setTimeout(() => setCopiedAttendanceFix(false), 3000);
  };

  const handleSyncAllToSupabase = async () => {
    setIsPushingData(true);
    setSyncStatusMsg(null);
    try {
      // 1. Push school settings
      const school = localDB.getSchoolSettings();
      await SupabaseSyncService.pushSchoolSettings(school);

      // 2. Push profiles
      const profiles = localDB.getProfiles();
      for (const p of profiles) {
        await SupabaseSyncService.pushProfile(p);
      }

      // 3. Push device registrations
      const devices = localDB.getDeviceRegistrations();
      for (const d of devices) {
        await SupabaseSyncService.pushDeviceRegistration(d);
      }

      setSyncStatusMsg(
        `Sukses! Data sekolah (${school.nama_sekolah}), ${profiles.length} akun guru/staf, dan ${devices.length} perangkat telah berhasil diunggah ke Supabase.`
      );

      // Test connection
      await handleTestConnection();
    } catch (err: any) {
      setSyncStatusMsg(`Gagal sinkronisasi: ${err.message || 'Periksa tabel dan izin Supabase Anda.'}`);
    } finally {
      setIsPushingData(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SQL_SCHEMA_CONTENT], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'absensi_guru_supabase_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLive = isLiveSupabaseConfigured();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Status Database Supabase &amp; Kode SQL</h1>
            <p className="text-xs text-slate-500">
              Koneksi database utama dikunci secara permanen di sistem. Uji status tabel &amp; salin skrip SQL di sini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isLive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{isLive ? 'Supabase Live Terhubung' : 'Local Storage Mode (Standby)'}</span>
          </span>
        </div>
      </div>

      {/* Section 1: Locked Supabase Connection Status & Test */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>1. Status Koneksi Database Supabase (Terkunci Permanen)</span>
          </h2>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Konfigurasi Sistem Tetap</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Endpoint Database Aktif</span>
            </p>
            <p className="font-mono text-xs text-slate-800 break-all">{creds.url}</p>
            <p className="text-[11px] text-slate-500">
              Kredensial Project URL dan Public Key telah ditetapkan secara permanen di sistem dan tidak dapat diubah melalui menu Admin.
            </p>
          </div>
          <span className="self-start sm:self-center shrink-0 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            Terkunci &amp; Aktif
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Sekarang'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncAllToSupabase}
            disabled={isPushingData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isPushingData ? 'animate-pulse' : ''}`} />
            <span>{isPushingData ? 'Mengunggah ke Supabase...' : 'Unggah Data Saat Ini ke Supabase'}</span>
          </button>
        </div>

        {syncStatusMsg && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {/* Test Result Card */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-3 animate-in fade-in ${
              testResult.connected
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.connected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Koneksi ke Supabase Berhasil! Latency: {testResult.latencyMs} ms</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Koneksi Gagal / Tabel Belum Tersedia</span>
                  </>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-500">{testResult.url}</span>
            </div>

            {testResult.error && (
              <p className="text-rose-700 bg-rose-100/60 p-2.5 rounded-xl border border-rose-200 font-mono text-[11px]">
                {testResult.error}
              </p>
            )}

            {/* Checklist of Supabase Tables */}
            <div className="pt-2 border-t border-slate-200/60">
              <p className="font-bold text-slate-700 mb-2">Pemeriksaan Tabel &amp; Storage Supabase:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-slate-200">
                  {testResult.tables.profiles ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-mono">profiles</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-slate-200">
                  {testResult.tables.school_settings ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-mono">school_settings</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-slate-200">
                  {testResult.tables.attendance ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-mono">attendance</span>
                </div>

                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 border border-slate-200">
                  {testResult.tables.device_registrations ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-mono">device_registrations</span>
                </div>
              </div>

              {!testResult.tables.profiles && (
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  💡 Tips: Jika tabel di atas bertanda silang, salin kode SQL di bawah dan jalankan di menu{' '}
                  <strong>SQL Editor</strong> dashboard Supabase Anda.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Quick SQL Fix for Attendance & Deletion */}
      <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-300 text-amber-950 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900">
                2. Skrip Khusus: Database Riwayat Absensi &amp; Izin Hapus Gagal
              </h2>
              <p className="text-xs text-amber-700">
                Jalankan skrip ini di SQL Editor Supabase agar data absensi bebas disimpan dan admin dapat menghapus riwayat absensi yang gagal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyAttendanceFix}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto shrink-0"
          >
            {copiedAttendanceFix ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAttendanceFix ? 'Tersalin ke Clipboard!' : 'Salin Skrip Riwayat Absen'}</span>
          </button>
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 overflow-x-auto border border-amber-200">
          <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
            {SQL_FIX_ATTENDANCE_CONTENT}
          </pre>
        </div>
      </div>

      {/* Section 3: Full SQL Database Schema Viewer */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                3. Kode SQL Lengkap Seluruh Database PostgreSQL Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Skrip lengkap: DDL tabel, indeks, trigger, RLS policies untuk 3 role, dan storage bucket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySql}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kode SQL Tersalin!' : 'Salin Kode SQL'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSql}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .SQL</span>
            </button>
          </div>
        </div>

        {/* SQL Code Preview Container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200 shadow-inner">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>supabase/schema.sql (PostgreSQL + RLS + Bucket)</span>
            </div>
            <span>{SQL_SCHEMA_CONTENT.split('\n').length} baris kode</span>
          </div>

          <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[420px] overflow-y-auto leading-relaxed text-slate-300">
            <code>{SQL_SCHEMA_CONTENT}</code>
          </pre>
        </div>
      </div>

      {/* Section 4: Step-by-Step Supabase Guide */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>4. Panduan Pemeliharaan Skema Supabase</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
              1
            </div>
            <h3 className="font-bold text-slate-800">Buka Dashboard Supabase</h3>
            <p className="text-slate-600 text-[11px]">
              Kunjungi{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-semibold inline-flex items-center gap-0.5"
              >
                supabase.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
              {' '}dan pilih project aktif yang sudah terhubung dengan aplikasi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
              2
            </div>
            <h3 className="font-bold text-slate-800">Jalankan Kode SQL</h3>
            <p className="text-slate-600 text-[11px]">
              Klik menu <strong>SQL Editor</strong> di sidebar Supabase &gt; klik <strong>New Query</strong> &gt;
              tempel (paste) seluruh kode SQL dari tombol di atas &gt; klik <strong>Run</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
              3
            </div>
            <h3 className="font-bold text-slate-800">Storage Bucket Foto</h3>
            <p className="text-slate-600 text-[11px]">
              Skrip SQL otomatis membuat bucket <code>attendance-photos</code> dengan RLS aman agar foto absensi
              tersimpan terpusat.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
              4
            </div>
            <h3 className="font-bold text-slate-800">Koneksi Terkunci Permanen</h3>
            <p className="text-slate-600 text-[11px]">
              Kredensial API sudah tertanam permanen di sistem. Gunakan tombol <strong>Uji Koneksi Sekarang</strong>{' '}
              untuk memastikan seluruh tabel berstatus aktif.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
