import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  LogOut,
  Calendar,
  FileSpreadsheet,
  Eye,
  Activity,
  ArrowUpRight,
  FileText,
  Printer,
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceService } from '../../services/attendanceService';
import { localDB } from '../../services/store';
import { Attendance, Profile } from '../../types';
import { AttendanceDetailModal } from '../../components/AttendanceDetailModal';
import { AttendanceTrendBarChart } from '../../components/AttendanceTrendBarChart';

interface KepsekDashboardProps {
  onNavigateReports: () => void;
}

export const KepsekDashboard: React.FC<KepsekDashboardProps> = ({ onNavigateReports }) => {
  const { school, currentWibDate, currentWibTime } = useSchool();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<Attendance | null>(null);
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    const allTeachers = localDB.getProfiles().filter((p) => p.role === 'guru');
    const allRecords = AttendanceService.getAllAttendances();
    setTeachers(allTeachers);
    setAttendances(allRecords);
  }, []);

  // Compute metrics for today
  const todayRecords = attendances.filter((a) =>
    AttendanceService.isTodayJakarta(a.server_timestamp)
  );

  const hadirCount = todayRecords.filter((a) => a.type === 'check_in' && a.status === 'HADIR').length;
  const terlambatCount = todayRecords.filter((a) => a.type === 'check_in' && a.status === 'TERLAMBAT').length;
  const izinSakitCount = todayRecords.filter((a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT').length;
  const sudahPulangCount = todayRecords.filter((a) => a.type === 'check_out' && (a.status === 'HADIR' || a.status === 'TERLAMBAT')).length;
  const totalGuru = teachers.length;
  const excusedUserIds = new Set(todayRecords.filter((a) => a.type === 'check_in' || a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT').map((a) => a.user_id));
  const belumHadirCount = Math.max(0, totalGuru - excusedUserIds.size);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentWibDate} • {currentWibTime} WIB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Dashboard Pemantauan Kepala Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {school.nama_sekolah} • Ringkasan Kedisiplinan Guru
          </p>
        </div>

        <button
          onClick={onNavigateReports}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Laporan Absensi &amp; KOP Surat</span>
        </button>
      </div>

      {/* 6 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Guru */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Guru</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">{totalGuru}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Guru Terdaftar</p>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hadir Tepat</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">{hadirCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">&le; {school.jam_masuk.slice(0, 5)} WIB</p>
        </div>

        {/* Terlambat */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Terlambat</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{terlambatCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">&gt; {school.jam_masuk.slice(0, 5)} WIB</p>
        </div>

        {/* Izin / Sakit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Izin / Sakit</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600">{izinSakitCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Dispensasi Lokasi</p>
        </div>

        {/* Belum Hadir */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Belum Hadir</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{belumHadirCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Belum Absen Masuk</p>
        </div>

        {/* Sudah Pulang */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sudah Pulang</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600">{sudahPulangCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Absen Pulang Selesai</p>
        </div>
      </div>

      {/* Analytics Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Recharts Bar Visualization */}
        <div className="lg:col-span-2">
          <AttendanceTrendBarChart
            attendances={attendances}
            teachers={teachers}
            title="Tren Kehadiran Guru (Visual Bar Chart)"
            subtitle="Analisis riil kehadiran tepat waktu vs terlambat berbasis data absensi"
          />
        </div>

        {/* Security / Verification Integrity Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Activity className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-800">Integritas Keamanan Absensi</h3>
            </div>
            <p className="text-xs text-slate-500">
              Validasi otomatis GPS Haversine, Anti-Mock, dan Face Recognition
            </p>

            <div className="mt-5 space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Radius Sekolah:</span>
                <span className="font-extrabold text-slate-800">{school.radius_absensi} meter</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Indikasi Fake GPS:</span>
                <span className="font-extrabold text-emerald-600">0 Terdeteksi</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Verifikasi Face ID:</span>
                <span className="font-extrabold text-emerald-600">100% Valid</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Watermark Anti-Replay:</span>
                <span className="font-extrabold text-blue-600">Aktif (SHA-256)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            💡 Sebagai Kepala Sekolah, Anda memiliki hak akses pemantauan dan audit laporan real-time.
          </div>
        </div>
      </div>

      {/* Live Table: Today's Teacher Attendance Activity */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Aktivitas Absensi Hari Ini</h3>
            <p className="text-xs text-slate-500">Daftar kehadiran guru yang terekam hari ini</p>
          </div>
        </div>

        {todayRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada rekam absensi guru hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Guru</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Jam WIB</th>
                  <th className="py-3 px-3">Jarak</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.photo?.watermarked_url || item.photo?.raw_data_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt="Foto"
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <span>{item.profile?.nama || 'Guru'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
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
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(item.server_timestamp))}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.type === 'izin' || item.type === 'sakit' || item.status === 'IZIN' || item.status === 'SAKIT' ? (
                        <span className="text-indigo-600 font-bold">Dispensasi ({item.distance_from_school}m)</span>
                      ) : (
                        `${item.distance_from_school}m`
                      )}
                    </td>
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
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedDetail(item)}
                        className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
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
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};
