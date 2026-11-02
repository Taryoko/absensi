-- ==============================================================================
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
ALTER TABLE IF EXISTS public.device_registrations DROP CONSTRAINT IF EXISTS device_registrations_user_id_fkey;
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
    file_hash TEXT NOT NULL,
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
