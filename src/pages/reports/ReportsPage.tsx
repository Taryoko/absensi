import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  Search,
  CheckCircle2,
  Calendar,
  Eye,
  Trash2,
  Printer,
} from 'lucide-react';
import { AttendanceService } from '../../services/attendanceService';
import { ReportService } from '../../services/reportService';
import { AuditService } from '../../services/auditService';
import { localDB } from '../../services/store';
import { useSchool } from '../../contexts/SchoolContext';
import { useAuth } from '../../contexts/AuthContext';
import { Attendance, Profile } from '../../types';
import { AttendanceDetailModal } from '../../components/AttendanceDetailModal';
import { DeleteAttendanceModal } from '../../components/DeleteAttendanceModal';
import { KopSuratManager } from '../../components/KopSuratManager';
import { PrintPreviewModal } from '../../components/PrintPreviewModal';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { school } = useSchool();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);

  // Filter states
  const [selectedTeacherId, setSelectedTeacherId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<Attendance | null>(null);
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const loadAttendanceData = () => {
    setAttendances(AttendanceService.getAllAttendances());
    setTeachers(localDB.getProfiles().filter((p) => p.role === 'guru'));
  };

  useEffect(() => {
    loadAttendanceData();

    const handleSync = () => loadAttendanceData();
    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_attendance', handleSync);

    return () => {
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_attendance', handleSync);
    };
  }, []);

  const handleDeleteAttendance = (item: Attendance) => {
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
      loadAttendanceData();
    } catch (err: any) {
      console.error('Failed to delete attendance:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = attendances.filter((item) => {
    if (selectedTeacherId !== 'ALL' && item.user_id !== selectedTeacherId) return false;
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
    if (selectedType !== 'ALL' && item.type !== selectedType) return false;

    if (startDate) {
      const itemDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(item.server_timestamp));
      if (itemDate < startDate) return false;
    }

    if (endDate) {
      const itemDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(item.server_timestamp));
      if (itemDate > endDate) return false;
    }

    return true;
  });

  const handleExportExcel = async () => {
    ReportService.exportToExcel(
      filtered,
      school,
      `Rekap_Absensi_Guru_${school.nama_sekolah.replace(/\s+/g, '_')}.xlsx`
    );
    await AuditService.logActivity(
      user,
      'EXPORT_LAPORAN',
      `Mengekspor laporan absensi (${filtered.length} rekam data) ke format Excel`
    );
  };

  const handleExportPDF = async () => {
    ReportService.exportToPDF(
      filtered,
      school,
      `Laporan_Absensi_Guru_${school.nama_sekolah.replace(/\s+/g, '_')}.pdf`
    );
    await AuditService.logActivity(
      user,
      'EXPORT_LAPORAN',
      `Mengekspor laporan absensi (${filtered.length} rekam data) ke format PDF`
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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

      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Laporan & Rekapitulasi Absensi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {school.nama_sekolah} • Export resmi Excel dan format PDF cetak Kop Surat
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Cetak / Pratinjau KOP</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Unduh PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* KOP Surat Management Section */}
      <KopSuratManager
        onKopUpdated={loadAttendanceData}
        onOpenPrintPreview={() => setIsPrintPreviewOpen(true)}
      />

      {/* Filter Bar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Data Absensi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Guru Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Guru</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Kehadiran</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">Hadir Tepat Waktu</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="IZIN">Izin Resmi</option>
              <option value="SAKIT">Sakit (Surat Dokter)</option>
              <option value="DI_LUAR_AREA">Di Luar Area</option>
              <option value="INDIKASI_FAKE_GPS">Indikasi Fake GPS</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tipe Absensi</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="check_in">Absen Masuk</option>
              <option value="check_out">Absen Pulang</option>
              <option value="izin">Pengajuan Izin</option>
              <option value="sakit">Pengajuan Sakit</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Menampilkan <strong>{filtered.length}</strong> rekam absensi</span>
          {(selectedTeacherId !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedTeacherId('ALL');
                setSelectedStatus('ALL');
                setSelectedType('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-blue-600 font-semibold hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Tidak ada data absensi yang sesuai kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3">NIP</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Jam Server</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Jarak</th>
                  <th className="py-3 px-3">Akurasi GPS</th>
                  <th className="py-3 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {item.profile?.nama || 'Guru'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{item.profile?.nip || '-'}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(item.server_timestamp))}
                    </td>
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
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(item.server_timestamp))} WIB
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
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {item.type === 'izin' || item.type === 'sakit' || item.status === 'IZIN' || item.status === 'SAKIT' ? (
                        <span className="text-indigo-600 font-bold">Dispensasi ({item.distance_from_school} m)</span>
                      ) : (
                        `${item.distance_from_school} m`
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">±{item.gps_accuracy} m</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedDetail(item)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Lihat detail & peta"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteAttendance(item)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus riwayat absensi (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
        isAdmin={user?.role === 'admin'}
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

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        attendances={filtered}
        school={school}
      />
    </div>
  );
};
