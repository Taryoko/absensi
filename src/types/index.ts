export type UserRole = 'admin' | 'kepsek' | 'guru';

export type DeviceRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

export interface DeviceRegistration {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  platform: string;
  browser: string;
  screen_resolution: string;
  status: DeviceRegistrationStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile fields for UI display
  user_nama?: string;
  user_email?: string;
  user_nip?: string | null;
  user_foto?: string | null;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  browser: string;
  screenResolution: string;
  registeredAt: string;
  isCurrentDevice?: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  nama: string;
  nip: string | null;
  email: string;
  role: UserRole;
  foto_profil: string | null;
  status_aktif: boolean;
  password?: string; // Login password created by admin
  // Device Binding
  registered_device_id?: string | null;
  registered_device_name?: string | null;
  device_registered_at?: string | null;
  // Face Biometric Master
  registered_face_url?: string | null;
  registered_face_hash?: string | null;
  face_registered_at?: string | null;
  biometric_enrolled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolSettings {
  id: string;
  nama_sekolah: string;
  alamat: string;
  logo_url?: string;
  npsn?: string;
  telepon?: string;
  email_sekolah?: string;
  kepala_sekolah_nama?: string;
  kepala_sekolah_nip?: string;
  latitude: number;
  longitude: number;
  radius_absensi: number; // in meters
  jam_masuk: string;      // e.g. "07:30:00"
  jam_pulang: string;     // e.g. "15:30:00"
  timezone: string;       // "Asia/Jakarta"
  wajib_perangkat_terdaftar?: boolean;
  wajib_wajah_terdaftar?: boolean;
  kop_surat_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceType = 'check_in' | 'check_out' | 'izin' | 'sakit';

export type AttendanceStatus =
  | 'HADIR'
  | 'TERLAMBAT'
  | 'IZIN'
  | 'SAKIT'
  | 'DITOLAK'
  | 'DI_LUAR_AREA'
  | 'GPS_TIDAK_VALID'
  | 'FOTO_TIDAK_VALID'
  | 'INDIKASI_FAKE_GPS'
  | 'PERANGKAT_TIDAK_TERDAFTAR'
  | 'WAJAH_TIDAK_COCOK';

export interface ValidationResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  accuracyMeters: number;
  accuracyValid: boolean;
  speedCheckValid: boolean;
  mockLocationDetected: boolean;
  singleFaceDetected: boolean;
  livenessVerified: boolean;
  photoHash: string;
  isLate: boolean;
  deviceMatch: boolean;
  faceSimilarity: number;
  faceMatch: boolean;
  notes: string[];
}

export interface AttendancePhoto {
  id: string;
  attendance_id: string;
  storage_path: string;
  file_hash: string;
  created_at: string;
  watermarked_url?: string;
  raw_data_url?: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  type: AttendanceType;
  status: AttendanceStatus;
  server_timestamp: string;
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  distance_from_school: number;
  photo_id?: string | null;
  device_info: string;
  browser_info: string;
  validation_result: ValidationResult;
  created_at: string;
  keterangan?: string;
  attachment_url?: string;
  // Joined fields for display
  profile?: Profile;
  photo?: AttendancePhoto;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  activity: string;
  description: string;
  ip_address?: string | null;
  device_info?: string | null;
  created_at: string;
  user_nama?: string;
  user_role?: UserRole;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
  isMocked?: boolean;
}

export interface FaceDetectionResult {
  faceDetected: boolean;
  singleFace: boolean;
  faceCount: number;
  faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  livenessStep: 'none' | 'look_straight' | 'blink' | 'smile' | 'completed';
  confidence: number;
  warning?: string;
}
