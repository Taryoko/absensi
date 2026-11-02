import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  FileX,
} from 'lucide-react';
import { localDB } from '../../services/store';
import { AuditService } from '../../services/auditService';
import { AuditLog } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('ALL');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Modals (In-App modals, no window.confirm/alert)
  const [deleteSingleLog, setDeleteSingleLog] = useState<AuditLog | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearMode, setClearMode] = useState<'UNIMPORTANT' | 'ALL'>('UNIMPORTANT');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadLogs = () => {
    setLogs(localDB.getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
    const handleSync = () => loadLogs();
    window.addEventListener('absensi_synced', handleSync);
    return () => window.removeEventListener('absensi_synced', handleSync);
  }, []);

  const handleDeleteSingle = async () => {
    if (!deleteSingleLog) return;
    setIsProcessing(true);
    await AuditService.deleteLog(deleteSingleLog.id);
    setIsProcessing(false);
    setDeleteSingleLog(null);
    setSuccessAlert('1 baris audit log berhasil dihapus.');
    loadLogs();
    setTimeout(() => setSuccessAlert(null), 3500);
  };

  const handleClearLogs = async () => {
    setIsProcessing(true);
    if (clearMode === 'ALL') {
      await AuditService.clearLogs();
      setSuccessAlert('Semua riwayat audit log telah dibersihkan.');
    } else {
      // Clear unimportant logs (LOGIN, LOGOUT)
      const currentLogs = localDB.getAuditLogs();
      const unimportant = currentLogs.filter(
        (l) => l.activity === 'LOGIN' || l.activity === 'LOGOUT'
      );
      for (const item of unimportant) {
        await AuditService.deleteLog(item.id);
      }
      setSuccessAlert(`${unimportant.length} riwayat log rutin (LOGIN/LOGOUT) berhasil dibersihkan.`);
    }
    setIsProcessing(false);
    setClearModalOpen(false);
    loadLogs();
    setTimeout(() => setSuccessAlert(null), 3500);
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.activity.toLowerCase().includes(search.toLowerCase()) ||
      (log.user_nama && log.user_nama.toLowerCase().includes(search.toLowerCase()));

    const matchActivity = filterActivity === 'ALL' || log.activity === filterActivity;
    return matchSearch && matchActivity;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Audit Log & Rekam Jejak Sistem</h1>
            <p className="text-xs text-slate-500">
              Pencatatan aktivitas login, absensi GPS, perubahan pengaturan, dan manipulasi data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {logs.length > 0 && (
            <button
              onClick={() => {
                setClearMode('UNIMPORTANT');
                setClearModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Bersihkan Riwayat</span>
            </button>
          )}

          <button
            onClick={loadLogs}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Segarkan Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successAlert && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* Filter and Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari audit log..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="ABSENSI_MASUK">ABSENSI_MASUK</option>
              <option value="ABSENSI_PULANG">ABSENSI_PULANG</option>
              <option value="ABSENSI_DITOLAK">ABSENSI_DITOLAK</option>
              <option value="AJUKAN_REGISTRASI_PERANGKAT">AJUKAN_REGISTRASI_PERANGKAT</option>
              <option value="SETUJUI_PERANGKAT">SETUJUI_PERANGKAT</option>
              <option value="TOLAK_PERANGKAT">TOLAK_PERANGKAT</option>
              <option value="PERUBAHAN_PENGATURAN">PERUBAHAN_PENGATURAN</option>
              <option value="TAMBAH_GURU">TAMBAH_GURU</option>
              <option value="EDIT_GURU">EDIT_GURU</option>
              <option value="EXPORT_LAPORAN">EXPORT_LAPORAN</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Waktu WIB</th>
                <th className="py-3 px-3">Pengguna</th>
                <th className="py-3 px-3">Aktivitas</th>
                <th className="py-3 px-3">Deskripsi Lengkap</th>
                <th className="py-3 px-3">IP / Device</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada riwayat audit log ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isWarn = log.activity.includes('DITOLAK') || log.activity.includes('HAPUS') || log.activity.includes('TOLAK');
                  const isConfig = log.activity.includes('PENGATURAN') || log.activity.includes('SETUJUI');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600">
                        {new Intl.DateTimeFormat('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }).format(new Date(log.created_at))}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-800">
                        {log.user_nama || 'Sistem'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isWarn
                              ? 'bg-rose-100 text-rose-800'
                              : isConfig
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.activity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 min-w-[240px]">
                        {log.description}
                      </td>
                      <td className="py-3 px-3 text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                        {log.ip_address}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setDeleteSingleLog(log)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus baris log ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Delete Single Log */}
      {deleteSingleLog && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Hapus Baris Log</h3>
                <p className="text-xs text-slate-500">Hapus catatan audit log ini secara permanen</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <p>Aktivitas: <strong className="text-slate-800">{deleteSingleLog.activity}</strong></p>
              <p>Pengguna: <strong className="text-slate-800">{deleteSingleLog.user_nama}</strong></p>
              <p className="text-slate-500 line-clamp-2">{deleteSingleLog.description}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSingleLog(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSingle}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                {isProcessing ? 'Menghapus...' : 'Hapus Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clear Logs Batch */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                  <FileX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Bersihkan Riwayat Audit Log</h3>
                  <p className="text-xs text-slate-500">Pilih jenis riwayat yang ingin dihapus</p>
                </div>
              </div>
              <button
                onClick={() => setClearModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <label
                onClick={() => setClearMode('UNIMPORTANT')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  clearMode === 'UNIMPORTANT'
                    ? 'border-blue-500 bg-blue-50/50 text-slate-900 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="clearMode"
                  checked={clearMode === 'UNIMPORTANT'}
                  onChange={() => setClearMode('UNIMPORTANT')}
                  className="mt-0.5 text-blue-600"
                />
                <div className="text-xs">
                  <p className="font-bold">Hapus Riwayat Rutin / Tidak Penting (Disarankan)</p>
                  <p className="text-slate-500 mt-0.5">
                    Hanya menghapus riwayat login dan logout biasa. Riwayat absensi, perubahan data, dan persetujuan perangkat tetap aman.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setClearMode('ALL')}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  clearMode === 'ALL'
                    ? 'border-rose-500 bg-rose-50/50 text-slate-900 ring-1 ring-rose-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="clearMode"
                  checked={clearMode === 'ALL'}
                  onChange={() => setClearMode('ALL')}
                  className="mt-0.5 text-rose-600"
                />
                <div className="text-xs">
                  <p className="font-bold text-rose-700">Hapus Semua Riwayat Audit Log</p>
                  <p className="text-slate-500 mt-0.5">
                    Mengosongkan seluruh riwayat rekam jejak sistem secara total.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                {isProcessing ? 'Memproses...' : 'Bersihkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
