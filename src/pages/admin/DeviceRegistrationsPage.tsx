import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ShieldCheck,
  Ban,
  Clock,
  Check,
  X,
  User,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { DeviceService } from '../../services/deviceService';
import { localDB } from '../../services/store';
import { SupabaseSyncService } from '../../services/supabaseSyncService';
import { useAuth } from '../../contexts/AuthContext';
import { DeviceRegistration, DeviceRegistrationStatus } from '../../types';

export const DeviceRegistrationsPage: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<DeviceRegistration[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedReg, setSelectedReg] = useState<DeviceRegistration | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'REJECT' | 'BLOCK'>('REJECT');
  const [actionReason, setActionReason] = useState('');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteModalReg, setDeleteModalReg] = useState<DeviceRegistration | null>(null);

  const loadData = async () => {
    // 1. Load immediately from local
    setRegistrations(DeviceService.getAllRegistrations());

    // 2. Fetch from backend API
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          json.data.forEach((r: DeviceRegistration) => {
            localDB.saveDeviceRegistration(r);
          });
        }
      }
    } catch {}

    // 3. Fetch from Supabase directly if configured
    try {
      const remoteDevices = await SupabaseSyncService.fetchDeviceRegistrations();
      if (remoteDevices && Array.isArray(remoteDevices)) {
        remoteDevices.forEach((r: DeviceRegistration) => {
          localDB.saveDeviceRegistration(r);
        });
      }
    } catch {}

    setRegistrations(DeviceService.getAllRegistrations());
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeleteRegistration = async (reg: DeviceRegistration) => {
    localDB.deleteDeviceRegistration(reg.id);
    setDeleteModalReg(null);
    setSuccessAlert(`Data pendaftaran perangkat "${reg.device_name}" telah dihapus.`);
    await loadData();
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    const handleRealtime = () => loadData();

    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_devices', handleRealtime);

    return () => {
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_devices', handleRealtime);
    };
  }, []);

  const handleApprove = async (reg: DeviceRegistration) => {
    await DeviceService.approveDevice(reg.id, user);
    setSuccessAlert(`Perangkat "${reg.device_name}" milik ${reg.user_nama} telah disetujui! Guru kini dapat melakukan absensi.`);
    loadData();
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  const openActionModal = (reg: DeviceRegistration, type: 'REJECT' | 'BLOCK') => {
    setSelectedReg(reg);
    setActionType(type);
    setActionReason(
      type === 'REJECT'
        ? 'Perangkat tidak sesuai data sekolah atau bukan smartphone pribadi guru'
        : 'Perangkat diindikasikan digunakan untuk joki absensi'
    );
    setRejectModalOpen(true);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;

    if (actionType === 'REJECT') {
      await DeviceService.rejectDevice(selectedReg.id, user, actionReason);
      setSuccessAlert(`Perangkat "${selectedReg.device_name}" telah ditolak.`);
    } else {
      await DeviceService.blockDevice(selectedReg.id, user, actionReason);
      setSuccessAlert(`Perangkat "${selectedReg.device_name}" telah diblokir secara permanen.`);
    }

    setRejectModalOpen(false);
    loadData();
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  // Filter
  const filtered = registrations.filter((r) => {
    const matchSearch =
      r.device_name.toLowerCase().includes(search.toLowerCase()) ||
      r.device_id.toLowerCase().includes(search.toLowerCase()) ||
      (r.user_nama && r.user_nama.toLowerCase().includes(search.toLowerCase())) ||
      (r.user_email && r.user_email.toLowerCase().includes(search.toLowerCase())) ||
      (r.user_nip && r.user_nip.includes(search));

    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = registrations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = registrations.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = registrations.filter((r) => r.status === 'REJECTED' || r.status === 'BLOCKED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800">
              Persetujuan Perangkat Guru (Device Approval)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Verifikasi dan kunci smartphone fisik guru untuk menjamin absensi hanya dilakukan dari HP terdaftar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
            title="Muat ulang pendaftaran terbaru dari server & HP guru"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>

          {pendingCount > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{pendingCount} Menunggu Persetujuan</span>
            </div>
          )}
        </div>
      </div>

      {successAlert && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Menunggu Persetujuan
            </span>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount}</p>
            <p className="text-[10px] text-slate-400">Butuh verifikasi admin</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Disetujui & Aktif
            </span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{approvedCount}</p>
            <p className="text-[10px] text-slate-400">Dapat melakukan absensi</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Ditolak / Diblokir
            </span>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{rejectedCount}</p>
            <p className="text-[10px] text-slate-400">Akses dibatasi</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari perangkat, nama guru, atau device ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'APPROVED', label: 'Disetujui' },
              { id: 'REJECTED', label: 'Ditolak' },
              { id: 'BLOCKED', label: 'Diblokir' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === tab.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device Registrations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Guru Pemohon</th>
                <th className="py-3 px-3">Perangkat Smartphone</th>
                <th className="py-3 px-3">Hardware Device ID</th>
                <th className="py-3 px-3">Sistem Operasi / Layar</th>
                <th className="py-3 px-3">Waktu Diajukan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Keputusan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data pendaftaran perangkat yang sesuai.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isPending = r.status === 'PENDING';
                  const isApproved = r.status === 'APPROVED';
                  const isRejected = r.status === 'REJECTED';
                  const isBlocked = r.status === 'BLOCKED';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Guru */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={r.user_foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                            alt={r.user_nama}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">{r.user_nama}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              NIP: {r.user_nip || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Device Name */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">{r.device_name}</span>
                        <span className="text-[10px] text-slate-400">{r.browser}</span>
                      </td>

                      {/* Hardware Device ID */}
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-700 font-semibold">
                        {r.device_id}
                      </td>

                      {/* Platform & Screen */}
                      <td className="py-3 px-3 text-slate-600">
                        <div>{r.platform}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.screen_resolution}</div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Intl.DateTimeFormat('id-ID', {
                          timeZone: 'Asia/Jakarta',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(r.created_at))} WIB
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                          {(isRejected || isBlocked) && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{r.status}</span>
                        </span>
                        {r.rejection_reason && (
                          <p className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[130px]" title={r.rejection_reason}>
                            {r.rejection_reason}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApprove(r)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => openActionModal(r, 'REJECT')}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : isApproved ? (
                            <button
                              onClick={() => openActionModal(r, 'BLOCK')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Blokir</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprove(r)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Pulihkan & Setujui</span>
                            </button>
                          )}
                          {/* Delete Registration Entry Button */}
                          <button
                            onClick={() => setDeleteModalReg(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus riwayat pengajuan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rejection / Blocking Reason */}
      {rejectModalOpen && selectedReg && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {actionType === 'REJECT' ? 'Tolak Pendaftaran Perangkat' : 'Blokir Perangkat Ini'}
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <p className="text-slate-500">Pemohon: <strong>{selectedReg.user_nama}</strong></p>
                <p className="text-slate-500">Perangkat: <strong>{selectedReg.device_name}</strong></p>
                <p className="text-slate-500 font-mono text-[10px]">ID: {selectedReg.device_id}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alasan Penolakan / Pemblokiran
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Masukkan alasan..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
                >
                  {actionType === 'REJECT' ? 'Konfirmasi Tolak' : 'Konfirmasi Blokir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Device Registration */}
      {deleteModalReg && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Hapus Pengajuan Perangkat</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <p>Guru: <strong className="text-slate-800">{deleteModalReg.user_nama}</strong></p>
              <p>Perangkat: <strong className="text-slate-800">{deleteModalReg.device_name}</strong></p>
              <p className="font-mono text-[10px] text-slate-400">ID: {deleteModalReg.device_id}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalReg(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRegistration(deleteModalReg)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
