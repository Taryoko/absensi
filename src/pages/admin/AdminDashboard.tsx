import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  LogOut,
  AlertOctagon,
  Settings,
  Eye,
  Calendar,
  Sparkles,
  MapPin,
  Smartphone,
  Database,
  Trash2,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { AttendanceService } from '../../services/attendanceService';
import { localDB } from '../../services/store';
import { Attendance, Profile, DeviceRegistration } from '../../types';
import { AttendanceDetailModal } from '../../components/AttendanceDetailModal';
import { AdminAttendanceSummaryCard } from '../../components/AdminAttendanceSummaryCard';
import { DeleteAttendanceModal } from '../../components/DeleteAttendanceModal';
import { AttendanceTrendBarChart } from '../../components/AttendanceTrendBarChart';

interface AdminDashboardProps {
  onNavigateSettings: () => void;
  onNavigateTeachers: () => void;
  onNavigateReports: () => void;
  onNavigateDevices: () => void;
  onNavigateDatabase?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateSettings,
  onNavigateTeachers,
  onNavigateReports,
  onNavigateDevices,
  onNavigateDatabase,
}) => {
  const { user } = useAuth();
  const { school, currentWibDate, currentWibTime } = useSchool();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<Attendance | null>(null);
  const [pendingDevicesCount, setPendingDevicesCount] = useState(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDashboardData = () => {
    const allTeachers = localDB.getProfiles().filter((p) => p.role === 'guru');
    const allRecords = AttendanceService.getAllAttendances();
    const pendingDevices = localDB.getDeviceRegistrations().filter((r) => r.status === 'PENDING').length;

    setTeachers(allTeachers);
    setAttendances(allRecords);
    setPendingDevicesCount(pendingDevices);
  };

  const handleDeleteAttendance = (item: Attendance) => {
    setAttendanceToDelete(item);
  };

  const handleRequestDelete = (item: Attendance) => {
    setAttendanceToDelete(item);
  };

  const handleConfirmDelete = async (item: Attendance) => {
    const guruNama = item.profile?.nama || 'Guru';
    const tipe = item.type === 'check_in' ? 'Masuk' : 'Pulang';
    setIsDeleting(true);
    try {
      await AttendanceService.deleteAttendance(item.id, user);
      setActionSuccessMsg(`Riwayat absensi ${guruNama} (${tipe}) berhasil dihapus.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setAttendanceToDelete(null);
      loadDashboardData();
    } catch (err: any) {
      console.error('Failed to delete attendance:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleSync = () => loadDashboardData();
    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_attendance', handleSync);
    window.addEventListener('absensi_realtime_devices', handleSync);
    window.addEventListener('absensi_realtime_profiles', handleSync);

    return () => {
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_attendance', handleSync);
      window.removeEventListener('absensi_realtime_devices', handleSync);
      window.removeEventListener('absensi_realtime_profiles', handleSync);
    };
  }, []);

  // Compute metrics for today
  const todayRecords = attendances.filter((a) =>
    AttendanceService.isTodayJakarta(a.server_timestamp)
  );

  const totalGuru = teachers.length;
  const hadirCount = todayRecords.filter((a) => a.type === 'check_in' && a.status === 'HADIR').length;
  const terlambatCount = todayRecords.filter((a) => a.type === 'check_in' && a.status === 'TERLAMBAT').length;
  const izinSakitCount = todayRecords.filter((a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT').length;
  const sudahPulangCount = todayRecords.filter((a) => a.type === 'check_out' && (a.status === 'HADIR' || a.status === 'TERLAMBAT')).length;
  const ditolakCount = todayRecords.filter((a) => a.status === 'DITOLAK' || a.status === 'DI_LUAR_AREA' || a.status === 'GPS_TIDAK_VALID' || a.status === 'FOTO_TIDAK_VALID' || a.status === 'INDIKASI_FAKE_GPS').length;
  
  const accountedUserIds = new Set(todayRecords.filter((a) => a.type === 'check_in' || a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT').map((a) => a.user_id));
  const belumAbsenCount = Math.max(0, totalGuru - accountedUserIds.size);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentWibDate} • {currentWibTime} WIB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Panel Kontrol Administrator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {school.nama_sekolah} • Radius Aktif: {school.radius_absensi}m • Batas Masuk: {school.jam_masuk.slice(0, 5)} WIB
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateDatabase && (
            <button
              onClick={onNavigateDatabase}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              <span>Status Database &amp; SQL</span>
            </button>
          )}
          <button
            onClick={onNavigateDevices}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors relative"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span>Persetujuan HP</span>
            {pendingDevicesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingDevicesCount}
              </span>
            )}
          </button>
          <button
            onClick={onNavigateSettings}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Identitas &amp; Logo Sekolah</span>
          </button>
          <button
            onClick={onNavigateTeachers}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kelola Guru &amp; Akun</span>
          </button>
          <button
            onClick={onNavigateReports}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan &amp; KOP</span>
          </button>
        </div>
      </div>

      {/* Action Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Pending Devices Alert Banner if any */}
      {pendingDevicesCount > 0 && (
        <div
          onClick={onNavigateDevices}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">
                Ada {pendingDevicesCount} Pengajuan Pendaftaran Smartphone Guru Menunggu Persetujuan Anda!
              </p>
              <p className="text-[11px] text-amber-800 opacity-90">
                Hanya perangkat yang disetuji Admin yang diizinkan melakukan absensi untuk mencegah titip absen.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold whitespace-nowrap">
            Tinjau & Setujui &rarr;
          </span>
        </div>
      )}

      {/* Real-time Supabase Attendance Summary Card */}
      <AdminAttendanceSummaryCard
        onNavigateDevices={onNavigateDevices}
        onNavigateReports={onNavigateReports}
      />

      {/* Core Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total Guru */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Guru
          </span>
          <p className="text-2xl font-black text-slate-800">{totalGuru}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pegawai aktif</p>
        </div>

        {/* Hadir Hari Ini */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
            Hadir Hari Ini
          </span>
          <p className="text-2xl font-black text-emerald-600">{hadirCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tepat waktu</p>
        </div>

        {/* Terlambat */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
            Terlambat
          </span>
          <p className="text-2xl font-black text-amber-600">{terlambatCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">&gt; {school.jam_masuk.slice(0, 5)} WIB</p>
        </div>

        {/* Izin / Sakit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
            Izin / Sakit
          </span>
          <p className="text-2xl font-black text-indigo-600">{izinSakitCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Dispensasi radius</p>
        </div>

        {/* Belum Absen */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
            Belum Absen
          </span>
          <p className="text-2xl font-black text-rose-600">{belumAbsenCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tanpa keterangan</p>
        </div>

        {/* Sudah Pulang */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Sudah Pulang
          </span>
          <p className="text-2xl font-black text-blue-600">{sudahPulangCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Check-out valid</p>
        </div>

        {/* Absensi Ditolak */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">
            Absen Ditolak
          </span>
          <p className="text-2xl font-black text-red-600">{ditolakCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Luar radius/mock</p>
        </div>
      </div>

      {/* Attendance Trend Bar Chart (recharts) */}
      <AttendanceTrendBarChart
        attendances={attendances}
        teachers={teachers}
        title="Tren Kehadiran Guru (Visual Bar Chart)"
        subtitle="Analisis perbandingan hadir tepat waktu, terlambat, dan belum hadir"
      />

      {/* Main Table: Guru | Jam Masuk | Status | Jarak | GPS | Foto */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Data Seluruh Rekam Absensi Hari Ini
            </h3>
            <p className="text-xs text-slate-500">
              Validasi server: verifikasi foto watermarked, koordinat GPS, dan indikasi manipulasi lokasi
            </p>
          </div>

          <button
            onClick={onNavigateReports}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Lihat Laporan Lengkap &rarr;
          </button>
        </div>

        {todayRecords.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Belum ada data absensi guru untuk hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Guru</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Jam Masuk / Pulang</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Jarak Sekolah</th>
                  <th className="py-3 px-3">Akurasi GPS</th>
                  <th className="py-3 px-3">Foto Wajah</th>
                  <th className="py-3 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Guru */}
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>
                        <p className="font-bold">{item.profile?.nama || 'Guru'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIP: {item.profile?.nip || '-'}</p>
                      </div>
                    </td>

                    {/* Tipe */}
                    <td className="py-3 px-3 font-semibold">
                      <span className={`uppercase text-[10px] px-2 py-0.5 rounded font-bold ${
                        item.type === 'check_in'
                          ? 'bg-blue-50 text-blue-700'
                          : item.type === 'check_out'
                          ? 'bg-purple-50 text-purple-700'
                          : item.type === 'sakit'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {item.type === 'check_in' ? 'Masuk' : item.type === 'check_out' ? 'Pulang' : item.type === 'sakit' ? 'Sakit' : 'Izin'}
                      </span>
                    </td>

                    {/* Jam Server */}
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(item.server_timestamp))} WIB
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          item.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'IZIN'
                            ? 'bg-indigo-100 text-indigo-800'
                            : item.status === 'SAKIT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Jarak */}
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {item.type === 'izin' || item.type === 'sakit' || item.status === 'IZIN' || item.status === 'SAKIT' ? (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-bold text-[11px]">
                          Dispensasi ({item.distance_from_school} m)
                        </span>
                      ) : (
                        `${item.distance_from_school} m`
                      )}
                    </td>

                    {/* Akurasi GPS */}
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      ±{item.gps_accuracy} m
                    </td>

                    {/* Foto / Bukti Dokumen */}
                    <td className="py-3 px-3">
                      {item.attachment_url || item.photo?.watermarked_url || item.photo?.raw_data_url ? (
                        <div
                          onClick={() => setSelectedDetail(item)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center bg-slate-50"
                        >
                          <img
                            src={item.attachment_url || item.photo?.watermarked_url || item.photo?.raw_data_url}
                            alt="Foto / Bukti"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDetail(item)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAttendance(item)}
                          title="Hapus riwayat absensi ini (Admin)"
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AttendanceDetailModal
        attendance={selectedDetail}
        school={school}
        isAdmin={true}
        onDelete={handleDeleteAttendance}
        onClose={() => setSelectedDetail(null)}
      />

      <DeleteAttendanceModal
        isOpen={Boolean(attendanceToDelete)}
        attendance={attendanceToDelete}
        onClose={() => setAttendanceToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};
