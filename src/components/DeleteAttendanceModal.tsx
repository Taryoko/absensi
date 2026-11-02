import React from 'react';
import { Trash2, AlertTriangle, X, Clock, User } from 'lucide-react';
import { Attendance } from '../types';

interface DeleteAttendanceModalProps {
  isOpen: boolean;
  attendance: Attendance | null;
  onClose: () => void;
  onConfirm: (attendance: Attendance) => Promise<void> | void;
  isDeleting?: boolean;
}

export const DeleteAttendanceModal: React.FC<DeleteAttendanceModalProps> = ({
  isOpen,
  attendance,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !attendance) return null;

  const tipeText = attendance.type === 'check_in' ? 'Masuk' : 'Pulang';
  const guruNama = attendance.profile?.nama || 'Guru';
  const waktu = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(attendance.server_timestamp)) + ' WIB';

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all p-6 sm:p-7 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
            <Trash2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">
              Hapus Riwayat Absensi?
            </h3>
            <p className="text-xs text-slate-500">
              Konfirmasi penghapusan data presensi oleh Admin
            </p>
          </div>
        </div>

        {/* Attendance Summary Card inside modal */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nama Guru:
            </span>
            <span className="font-bold text-slate-800">{guruNama}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Tipe Absen:</span>
            <span className="font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Absen {tipeText}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status Saat Ini:</span>
            <span
              className={`font-extrabold text-[10px] px-2.5 py-0.5 rounded-full ${
                attendance.status === 'HADIR'
                  ? 'bg-emerald-100 text-emerald-800'
                  : attendance.status === 'TERLAMBAT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {attendance.status}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Waktu:
            </span>
            <span className="font-mono text-slate-700 text-[11px]">{waktu}</span>
          </div>
        </div>

        {/* Warning Text */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Data ini akan dihapus dari server dan database Supabase. Guru yang bersangkutan dapat <strong>melakukan absensi ulang</strong> hari ini setelah data dihapus.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(attendance)}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
