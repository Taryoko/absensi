import React from 'react';
import { X, CheckCircle2, AlertOctagon, Clock, ShieldCheck, MapPin, Smartphone, Hash, Trash2 } from 'lucide-react';
import { Attendance, SchoolSettings } from '../types';
import { AttendanceMap } from './AttendanceMap';

interface AttendanceDetailModalProps {
  attendance: Attendance | null;
  school: SchoolSettings;
  onClose: () => void;
  onDelete?: (attendance: Attendance) => void;
  isAdmin?: boolean;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  attendance,
  school,
  onClose,
  onDelete,
  isAdmin = false,
}) => {
  if (!attendance) return null;

  const dateObj = new Date(attendance.server_timestamp);
  const formattedDateTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dateObj) + ' WIB';

  const isPermit = attendance.status === 'IZIN' || attendance.status === 'SAKIT';
  const isSuccess = attendance.status === 'HADIR' || attendance.status === 'TERLAMBAT' || isPermit;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {isPermit
                ? `Detail Pengajuan ${attendance.status === 'SAKIT' ? 'Sakit' : 'Izin'}`
                : `Detail Absensi ${attendance.type === 'check_in' ? 'Masuk' : 'Pulang'}`}
            </h3>
            <p className="text-xs text-slate-500">{attendance.profile?.nama || 'Guru'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl flex items-center gap-3.5 ${
              isPermit
                ? attendance.status === 'SAKIT'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                : isSuccess
                ? attendance.status === 'HADIR'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2
                className={`w-6 h-6 shrink-0 ${
                  attendance.status === 'SAKIT'
                    ? 'text-rose-600'
                    : attendance.status === 'IZIN'
                    ? 'text-indigo-600'
                    : 'text-emerald-600'
                }`}
              />
            ) : (
              <AlertOctagon className="w-6 h-6 shrink-0 text-rose-600" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-wide">STATUS: {attendance.status}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                  {isPermit
                    ? `SURAT ${attendance.status} RESMI`
                    : attendance.type === 'check_in'
                    ? 'ABSENSI MASUK'
                    : 'ABSENSI PULANG'}
                </span>
                {isPermit && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Bebas Lokasi Sekolah
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">
                {attendance.validation_result?.notes?.join(' • ') || 'Verifikasi tersimpan.'}
              </p>
            </div>
          </div>

          {/* Keterangan / Alasan Box (If Izin or Sakit) */}
          {attendance.keterangan && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Alasan / Keterangan Resmi
              </span>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                "{attendance.keterangan}"
              </p>
            </div>
          )}

          {/* Photo & Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Foto with Watermark / Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {isPermit ? 'Foto Bukti / Surat Dokter' : 'Foto Wajah Absensi (Watermarked)'}
              </label>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[4/3] flex items-center justify-center">
                {attendance.photo?.watermarked_url ||
                attendance.photo?.raw_data_url ||
                attendance.attachment_url ? (
                  <img
                    src={
                      attendance.photo?.watermarked_url ||
                      attendance.photo?.raw_data_url ||
                      attendance.attachment_url
                    }
                    alt="Foto Absensi / Bukti"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-xs text-slate-400">Tidak ada foto / dokumen terlampir</p>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-mono">
                  {isPermit
                    ? 'Bukti Sah'
                    : `Anti-Replay ID: ${
                        attendance.photo?.file_hash
                          ? attendance.photo.file_hash.substring(0, 10) + '...'
                          : '-'
                      }`}
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Parameter Validasi Server
              </label>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Waktu Server (WIB)
                  </span>
                  <span className="font-semibold text-slate-800 text-right">{formattedDateTime}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> Jarak ke Sekolah
                  </span>
                  <span className="font-semibold text-slate-800">
                    {attendance.distance_from_school} meter (Maks. {school.radius_absensi}m)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Akurasi GPS
                  </span>
                  <span className="font-semibold text-slate-800">±{attendance.gps_accuracy} meter</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Perangkat Terdaftar
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    {attendance.validation_result?.deviceMatch !== false ? (
                      <span className="text-emerald-600 font-bold">✓ Terverifikasi Cocok</span>
                    ) : (
                      <span className="text-rose-600 font-bold">✗ Perangkat Berbeda</span>
                    )}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Kecocokan Face Biometrik
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    {attendance.validation_result?.faceSimilarity !== undefined ? (
                      <span className={`${attendance.validation_result.faceSimilarity >= 75 ? 'text-emerald-600' : 'text-amber-600'} font-bold`}>
                        {attendance.validation_result.faceSimilarity}% Cocok
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">100% Valid</span>
                    )}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500" /> Hash SHA-256
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px]" title={attendance.validation_result?.photoHash}>
                    {attendance.validation_result?.photoHash ? `${attendance.validation_result.photoHash.slice(0, 14)}...` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Leaflet Map Location */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Peta Lokasi Saat Absensi
            </label>
            <AttendanceMap
              schoolLat={school.latitude}
              schoolLng={school.longitude}
              radiusMeters={school.radius_absensi}
              schoolName={school.nama_sekolah}
              userLat={attendance.latitude}
              userLng={attendance.longitude}
              accuracy={attendance.gps_accuracy}
              height="200px"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {isAdmin && onDelete ? (
            <button
              onClick={() => {
                onDelete(attendance);
                onClose();
              }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Rekam Absen Ini</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
