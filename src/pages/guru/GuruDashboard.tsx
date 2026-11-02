import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Navigation,
  Eye,
  Smartphone,
  Camera,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceService } from '../../services/attendanceService';
import { GPSService } from '../../services/gpsService';
import { DeviceService } from '../../services/deviceService';
import { Attendance, GPSLocation, Profile } from '../../types';
import { AttendanceDetailModal } from '../../components/AttendanceDetailModal';
import { BiometricEnrollmentModal } from '../../components/BiometricEnrollmentModal';
import { LeavePermitModal } from '../../components/LeavePermitModal';
import { AttendanceMap } from '../../components/AttendanceMap';
import { HeartPulse, FileText } from 'lucide-react';

interface GuruDashboardProps {
  onStartAttendance: (type: 'check_in' | 'check_out') => void;
  onViewHistory: () => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  onStartAttendance,
  onViewHistory,
}) => {
  const { user } = useAuth();
  const { school, currentWibTime, currentWibDate } = useSchool();

  const [todayAttendance, setTodayAttendance] = useState<{
    checkIn?: Attendance;
    checkOut?: Attendance;
    permit?: Attendance;
  }>({});
  const [recentAttendances, setRecentAttendances] = useState<Attendance[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<Attendance | null>(null);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  const [permitSuccessMsg, setPermitSuccessMsg] = useState<string | null>(null);

  const refreshTodayStatus = () => {
    if (!user) return;
    const today = AttendanceService.getTodayAttendanceForUser(user.user_id);
    setTodayAttendance(today);

    const history = AttendanceService.getAllAttendances()
      .filter((a) => a.user_id === user.user_id)
      .slice(0, 5);
    setRecentAttendances(history);
  };

  useEffect(() => {
    if (!user) return;
    refreshTodayStatus();
  }, [user]);

  // Check live distance to school
  const checkCurrentLocation = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const loc = await GPSService.getCurrentPosition();
      setCurrentLocation(loc);
    } catch (err: any) {
      setGpsError(err.message || 'Gagal mendeteksi lokasi GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    checkCurrentLocation();
  }, [school]);

  const currentDistance = currentLocation
    ? GPSService.calculateHaversineDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        school.latitude,
        school.longitude
      )
    : null;

  const isWithinRadius = currentDistance !== null && currentDistance <= school.radius_absensi;
  const isDeviceEnrolled = Boolean(user?.registered_device_id);
  const isFaceEnrolled = Boolean(user?.registered_face_url);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-200 mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentWibDate} • {currentWibTime} WIB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Selamat datang, {user?.nama}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              NIP: {user?.nip || 'Belum diatur'} • Role: Guru Pengajar
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2">
            <span className="text-xs text-blue-200">Batas Jam Masuk</span>
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-amber-300">
              {school.jam_masuk.slice(0, 5)} WIB
            </span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Security Triad Status Cards: Device Binding + Face ID + GPS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Status Keamanan Biometrik & Perangkat
          </span>

          <button
            onClick={() => setIsEnrollmentOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Kelola Perangkat & Wajah Master</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. Device Binding Status */}
          <div
            onClick={() => setIsEnrollmentOpen(true)}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isDeviceEnrolled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Perangkat HP</p>
                <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                  {user?.registered_device_name || 'Belum Terkunci'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isDeviceEnrolled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isDeviceEnrolled ? 'Terkunci' : 'Daftarkan'}
            </span>
          </div>

          {/* 2. Face Biometric Master Status */}
          <div
            onClick={() => setIsEnrollmentOpen(true)}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isFaceEnrolled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Face ID Master</p>
                <p className="text-[11px] text-slate-500">
                  {isFaceEnrolled ? 'Foto Terdaftar' : 'Belum Rekam'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isFaceEnrolled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isFaceEnrolled ? 'Aktif' : 'Rekam'}
            </span>
          </div>

          {/* 3. Radius Status */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isWithinRadius ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Radius Sekolah</p>
                <p className="text-[11px] text-slate-500">
                  {currentDistance !== null ? `${currentDistance}m dari sekolah` : 'Mendeteksi...'}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isWithinRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {isWithinRadius ? 'Valid' : 'Di Luar'}
            </span>
          </div>
        </div>
      </div>

      {/* Notification banner for Permit submission */}
      {permitSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{permitSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPermitSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Permit Status Card if teacher has already submitted Izin/Sakit today */}
      {todayAttendance.permit && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                todayAttendance.permit.status === 'SAKIT'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {todayAttendance.permit.status === 'SAKIT' ? (
                <HeartPulse className="w-6 h-6" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pengajuan Hari Ini
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    todayAttendance.permit.status === 'SAKIT'
                      ? 'bg-rose-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {todayAttendance.permit.status} RESMI
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {todayAttendance.permit.keterangan || 'Keterangan tercatat di sistem'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bebas radius sekolah • Terverifikasi pada server sistem
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedDetail(todayAttendance.permit || null)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-blue-700 text-xs font-bold shadow-sm hover:bg-blue-50 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Bukti &amp; Detail</span>
          </button>
        </div>
      )}

      {/* Status Absensi Hari Ini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Absen Masuk Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${todayAttendance.checkIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Absensi Masuk
                </span>
                <p className="text-lg font-extrabold text-slate-800">
                  {todayAttendance.checkIn
                    ? new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }).format(new Date(todayAttendance.checkIn.server_timestamp)) + ' WIB'
                    : 'Belum Melakukan Absen'}
                </p>
              </div>
            </div>

            {todayAttendance.checkIn && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  todayAttendance.checkIn.status === 'HADIR'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {todayAttendance.checkIn.status}
              </span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            {todayAttendance.checkIn ? (
              <>
                <span>Jarak: {todayAttendance.checkIn.distance_from_school}m dari sekolah</span>
                <button
                  onClick={() => setSelectedDetail(todayAttendance.checkIn || null)}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                </button>
              </>
            ) : (
              <span>Wajib berada di dalam radius {school.radius_absensi}m</span>
            )}
          </div>
        </div>

        {/* Absen Pulang Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${todayAttendance.checkOut ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Absensi Pulang
                </span>
                <p className="text-lg font-extrabold text-slate-800">
                  {todayAttendance.checkOut
                    ? new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }).format(new Date(todayAttendance.checkOut.server_timestamp)) + ' WIB'
                    : 'Belum Melakukan Absen'}
                </p>
              </div>
            </div>

            {todayAttendance.checkOut && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                {todayAttendance.checkOut.status}
              </span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            {todayAttendance.checkOut ? (
              <>
                <span>Jarak: {todayAttendance.checkOut.distance_from_school}m</span>
                <button
                  onClick={() => setSelectedDetail(todayAttendance.checkOut || null)}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                </button>
              </>
            ) : (
              <span>Jam kepulangan normal: {school.jam_pulang.slice(0, 5)} WIB</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Big Attendance Action Buttons (3 options: Masuk, Pulang, Izin/Sakit) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-md">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Aksi Presensi Hari Ini
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Absen Masuk */}
          <button
            type="button"
            disabled={Boolean(todayAttendance.checkIn || todayAttendance.permit)}
            onClick={() => onStartAttendance('check_in')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center font-black transition-all ${
              todayAttendance.checkIn || todayAttendance.permit
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base tracking-wide block">
                {todayAttendance.checkIn ? 'SUDAH MASUK' : 'ABSEN MASUK'}
              </span>
              <p className="text-[10px] font-normal opacity-90 mt-0.5">
                {todayAttendance.checkIn ? 'Tersimpan di server' : 'Radius Sekolah 100m'}
              </p>
            </div>
          </button>

          {/* Absen Pulang */}
          <button
            type="button"
            disabled={Boolean(todayAttendance.checkOut || todayAttendance.permit)}
            onClick={() => onStartAttendance('check_out')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center font-black transition-all ${
              todayAttendance.checkOut || todayAttendance.permit
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 active:scale-[0.98]'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base tracking-wide block">
                {todayAttendance.checkOut ? 'SUDAH PULANG' : 'ABSEN PULANG'}
              </span>
              <p className="text-[10px] font-normal opacity-90 mt-0.5">
                {todayAttendance.checkOut ? 'Tersimpan di server' : 'Radius Sekolah 100m'}
              </p>
            </div>
          </button>

          {/* Izin / Sakit (Bebas Radius) */}
          <button
            type="button"
            onClick={() => setIsPermitModalOpen(true)}
            className="p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center font-black transition-all bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base tracking-wide block">
                {todayAttendance.permit ? 'STATUS: IZIN/SAKIT' : 'IZIN / SAKIT'}
              </span>
              <p className="text-[10px] font-normal opacity-90 mt-0.5">
                Bebas Lokasi Sekolah
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Live GPS Radius Monitor Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Status Lokasi GPS Anda</h3>
              <p className="text-xs text-slate-500">Pengecekan jarak terhadap {school.nama_sekolah}</p>
            </div>
          </div>

          <button
            onClick={checkCurrentLocation}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Mencari...' : 'Perbarui GPS'}</span>
          </button>
        </div>

        {gpsError ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>{gpsError}</span>
          </div>
        ) : currentLocation && currentDistance !== null ? (
          <div className="space-y-3">
            <div
              className={`p-4 rounded-2xl flex items-center justify-between ${
                isWithinRadius
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isWithinRadius ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {isWithinRadius
                      ? `Lokasi Anda berjarak ${currentDistance} meter dari sekolah.`
                      : `Absensi ditolak jika dilakukan saat ini. Anda berjarak ${currentDistance} meter (di luar radius ${school.radius_absensi}m).`}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Akurasi GPS perangkat: ±{Math.round(currentLocation.accuracy)} meter
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                  isWithinRadius ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {isWithinRadius ? 'DI AREA' : 'DI LUAR'}
              </span>
            </div>

            {/* Embedded Live Leaflet Map */}
            <AttendanceMap
              schoolLat={school.latitude}
              schoolLng={school.longitude}
              radiusMeters={school.radius_absensi}
              schoolName={school.nama_sekolah}
              userLat={currentLocation.latitude}
              userLng={currentLocation.longitude}
              accuracy={currentLocation.accuracy}
              height="240px"
            />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 text-slate-500 text-xs text-center">
            Memuat sinyal GPS perangkat...
          </div>
        )}
      </div>

      {/* Riwayat Absensi Terakhir */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Absensi Terakhir</h3>
          </div>
          <button
            onClick={onViewHistory}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        {recentAttendances.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Belum ada catatan riwayat absensi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAttendances.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedDetail(item)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.type === 'check_in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.type === 'check_in' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(item.server_timestamp))}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(item.server_timestamp))} WIB • Jarak: {item.distance_from_school}m
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'HADIR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'TERLAMBAT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Detail Modal */}
      <AttendanceDetailModal
        attendance={selectedDetail}
        school={school}
        onClose={() => setSelectedDetail(null)}
      />

      {/* Biometric & Device Enrollment Modal */}
      {user && (
        <BiometricEnrollmentModal
          user={user}
          isOpen={isEnrollmentOpen}
          onClose={() => setIsEnrollmentOpen(false)}
          onSuccess={() => {
            // Re-render
          }}
        />
      )}

      {/* Leave / Sick Permit Modal */}
      {user && (
        <LeavePermitModal
          isOpen={isPermitModalOpen}
          onClose={() => setIsPermitModalOpen(false)}
          user={user}
          school={school}
          onSuccess={(msg) => {
            setPermitSuccessMsg(msg);
            refreshTodayStatus();
            setTimeout(() => setPermitSuccessMsg(null), 5000);
          }}
        />
      )}
    </div>
  );
};
