import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  HeartPulse,
  Upload,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AttendanceService } from '../services/attendanceService';
import { GPSService } from '../services/gpsService';
import { Profile, SchoolSettings, GPSLocation } from '../types';

interface LeavePermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile;
  school: SchoolSettings;
  onSuccess: (message: string) => void;
}

export const LeavePermitModal: React.FC<LeavePermitModalProps> = ({
  isOpen,
  onClose,
  user,
  school,
  onSuccess,
}) => {
  const [permitType, setPermitType] = useState<'sakit' | 'izin'>('sakit');
  const [alasan, setAlasan] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [gps, setGps] = useState<GPSLocation | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-detect GPS for informational location logging
      setIsLoadingGps(true);
      GPSService.getCurrentPosition()
        .then((loc) => setGps(loc))
        .catch(() => {})
        .finally(() => setIsLoadingGps(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (JPG, PNG, JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!alasan.trim()) {
      setErrorMsg('Harap masukkan alasan atau keterangan lengkap pengajuan.');
      return;
    }

    setIsSubmitting(true);
    try {
      await AttendanceService.processPermitOrSick({
        user,
        type: permitType,
        alasan: alasan.trim(),
        photoDataUrl: photoDataUrl || undefined,
        gps,
        school,
      });

      onSuccess(
        `Pengajuan ${permitType === 'sakit' ? 'Sakit' : 'Izin'} berhasil dikirim dan dicatat ke sistem!`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim pengajuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const distance = gps
    ? GPSService.calculateHaversineDistance(
        gps.latitude,
        gps.longitude,
        school.latitude,
        school.longitude
      )
    : null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                permitType === 'sakit'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {permitType === 'sakit' ? (
                <HeartPulse className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Formulir Izin / Sakit Guru
              </h3>
              <p className="text-[11px] text-slate-500">
                Presensi resmi di luar lokasi sekolah (Bebas Radius GPS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Selector (Pill / Tabs) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Jenis Keterangan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermitType('sakit')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  permitType === 'sakit'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                }`}
              >
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Sakit (Surat Dokter)</span>
              </button>

              <button
                type="button"
                onClick={() => setPermitType('izin')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  permitType === 'izin'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Izin (Keperluan/Dinas)</span>
              </button>
            </div>
          </div>

          {/* Notice: Waived Radius Info */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold">Bebas Lokasi Sekolah</p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                Anda tidak perlu berada di dekat lokasi sekolah ({school.nama_sekolah}).
                Lokasi Anda saat ini (di rumah, klinik, RS, atau lokasi dinas) akan dicatat sebagai bukti presensi sah.
              </p>
            </div>
          </div>

          {/* Alasan / Keterangan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Keterangan / Alasan Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={
                permitType === 'sakit'
                  ? 'Contoh: Mengalami demam tinggi dan flu, beristirahat sesuai anjuran dokter...'
                  : 'Contoh: Izin mendampingi keluarga berobat / dinas luar workshop kurikulum...'
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Upload Proof / Surat Dokter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Foto Bukti / Surat Keterangan Dokter
              </label>
              <span className="text-[10px] text-slate-400">(Opsional tapi disarankan)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {photoDataUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/9] flex items-center justify-center">
                <img
                  src={photoDataUrl}
                  alt="Bukti Izin/Sakit"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-xl bg-slate-900/70 text-white hover:bg-rose-600 transition-colors"
                  title="Hapus foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <div className="p-3 rounded-full bg-white shadow-sm text-slate-500">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center text-xs">
                  <span className="font-bold text-blue-600 hover:underline">
                    Klik untuk unggah foto surat / resep dokter
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Format file gambar JPG, PNG, atau JPEG
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Location Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Lokasi Terkini:</span>
            </span>
            <span className="font-semibold text-slate-800 text-right">
              {isLoadingGps ? (
                'Mendeteksi GPS...'
              ) : gps ? (
                `${distance}m dari sekolah`
              ) : (
                'Tercatat otomatis'
              )}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Mengirim...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim Pengajuan {permitType === 'sakit' ? 'Sakit' : 'Izin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
