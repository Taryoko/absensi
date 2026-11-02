import React, { useState } from 'react';
import { User, ShieldCheck, Mail, Hash, CheckCircle2, Save, Smartphone, Camera, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { localDB } from '../../services/store';
import { BiometricEnrollmentModal } from '../../components/BiometricEnrollmentModal';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [fotoUrl, setFotoUrl] = useState(user?.foto_profil || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = {
      ...user,
      foto_profil: fotoUrl,
    };
    localDB.saveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
        <img
          src={fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt={user?.nama}
          className="w-16 h-16 rounded-2xl object-cover ring-4 ring-blue-500/20"
        />
        <div>
          <h1 className="text-xl font-bold text-slate-800">{user?.nama}</h1>
          <p className="text-xs text-slate-500 font-mono">NIP: {user?.nip || '-'}</p>
          <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            Role: {user?.role}
          </span>
        </div>
      </div>

      {/* Biometric & Device Binding Status Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Keamanan Perangkat & Face ID Master
          </h2>

          <button
            onClick={() => setIsEnrollmentOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pendaftaran Biometrik</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700">Perangkat Smartphone:</span>
            </div>
            <p className="text-slate-800 font-semibold truncate">
              {user?.registered_device_name || 'Belum Terkunci'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
              {user?.registered_device_id || 'Harap daftarkan HP ini'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Camera className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700">Foto Wajah Master:</span>
            </div>
            {user?.registered_face_url ? (
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={user.registered_face_url}
                  alt="Wajah Master"
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-emerald-500"
                />
                <span className="text-[11px] font-bold text-emerald-600">✓ Terverifikasi Aktif</span>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 font-medium">Belum melakukan perekaman</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Informasi Akun
        </h2>

        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profil berhasil diperbarui.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled
                value={user?.nama || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">NIP (Nomor Induk Pegawai)</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled
                value={user?.nip || '-'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Terdaftar</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">URL Foto Profil</label>
            <input
              type="url"
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Proteksi Hak Akses (Supabase Row Level Security)
          </p>
          <p className="text-[11px]">
            Data absensi tersimpan secara permanen dan tidak dapat diubah oleh guru setelah tercatat.
          </p>
        </div>
      </div>

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
    </div>
  );
};
