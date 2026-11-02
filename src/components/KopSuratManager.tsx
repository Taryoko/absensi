import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { ReportService } from '../services/reportService';

interface KopSuratManagerProps {
  onKopUpdated?: () => void;
  onOpenPrintPreview?: () => void;
}

export const KopSuratManager: React.FC<KopSuratManagerProps> = ({
  onKopUpdated,
  onOpenPrintPreview,
}) => {
  const { school, updateSettings } = useSchool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (PNG, JPG, JPEG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5 MB.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        await updateSettings({ kop_surat_url: base64 });
        setSuccessMsg('KOP Surat SMK berhasil diunggah! Cetakan laporan PDF kini memuat KOP Surat ini.');
        setTimeout(() => setSuccessMsg(null), 4500);
        onKopUpdated?.();
      } catch (err: any) {
        setErrorMsg('Gagal menyimpan KOP Surat: ' + (err.message || 'Terjadi kesalahan'));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file gambar.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDefaultKop = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const generated = await ReportService.generateDefaultKopSurat(school);
      if (generated) {
        await updateSettings({ kop_surat_url: generated });
        setSuccessMsg('KOP Surat standar resmi SMK Komputama Pesahangan berhasil digenerate dan dipasang!');
        setTimeout(() => setSuccessMsg(null), 4500);
        onKopUpdated?.();
      }
    } catch (err: any) {
      setErrorMsg('Gagal membuat KOP Surat otomatis: ' + (err.message || 'Error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteKop = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus KOP Surat? Cetakan laporan akan kembali ke format teks standar.')) {
      return;
    }
    await updateSettings({ kop_surat_url: null });
    setSuccessMsg('KOP Surat dihapus. Laporan akan menggunakan format teks standar.');
    setTimeout(() => setSuccessMsg(null), 4000);
    onKopUpdated?.();
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                KOP Surat Resmi SMK
              </h3>
              {school.kop_surat_url ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  KOP Terpasang
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  Format Teks Standar
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload gambar KOP Surat untuk dicetak di bagian atas PDF laporan &amp; lembar absensi resmi.
            </p>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isGenerating}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{school.kop_surat_url ? 'Ganti KOP Surat' : 'Upload KOP Surat'}</span>
          </button>

          {!school.kop_surat_url && (
            <button
              type="button"
              onClick={handleGenerateDefaultKop}
              disabled={isUploading || isGenerating}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buat KOP Surat otomatis dengan logo dan identitas SMK"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isGenerating ? 'Membuat...' : 'Buat KOP Otomatis'}</span>
            </button>
          )}

          {school.kop_surat_url && (
            <button
              type="button"
              onClick={handleDeleteKop}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              title="Hapus KOP Surat (kembali ke format teks standar)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onOpenPrintPreview && (
            <button
              type="button"
              onClick={onOpenPrintPreview}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Lihat tampilan pratinjau cetak lengkap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pratinjau Cetak</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preview Section */}
      {school.kop_surat_url ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>Pratinjau KOP Surat yang Terpasang:</span>
            <span className="text-emerald-600 font-bold">Siap Dicetak ke PDF</span>
          </div>

          <div className="bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl p-3 sm:p-4 flex items-center justify-center overflow-hidden">
            <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-2 sm:p-3 w-full max-w-3xl flex items-center justify-center">
              <img
                src={school.kop_surat_url}
                alt="Pratinjau KOP Surat SMK"
                className="w-full max-h-24 sm:max-h-28 object-contain"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            * KOP Surat di atas otomatis disematkan pada setiap lembar laporan absensi PDF yang diunduh oleh Admin dan Kepala Sekolah.
          </p>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-blue-50/30 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2 transition-colors">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-700">
            Klik di sini untuk mengunggah gambar KOP Surat SMK
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Format: PNG, JPG, JPEG, WebP • Maks. 5MB • Disarankan format memanjang/banner horizontal (1600 x 240 px)
          </p>
        </div>
      )}
    </div>
  );
};
