import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  ShieldCheck,
  MapPin,
  Camera,
  Smartphone,
  Clock,
  CheckCircle2,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { school, currentWibTime, currentWibDate } = useSchool();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Silakan masukkan alamat email akun Anda.');
      return;
    }
    if (!password) {
      setError('Silakan masukkan kata sandi akun.');
      return;
    }

    const res = await login(cleanEmail, password);
    if (!res.success) {
      setError(res.message || 'Email atau kata sandi tidak valid. Periksa kembali data Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Ambient Glows */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 w-[550px] h-[550px] bg-gradient-to-tl from-cyan-600/15 via-blue-700/10 to-transparent rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl pointer-events-none opacity-40 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Main Container */}
      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: School Identity, Live Badge, and Institutional Values */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8 py-2">
          {/* Institution Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                {school.logo_url ? (
                  <img
                    src={school.logo_url}
                    alt={school.nama_sekolah}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10 bg-slate-900 p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/25 flex items-center justify-center font-bold">
                    <Building2 className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950 items-center justify-center text-[8px] text-white font-bold">
                    ✓
                  </span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Sistem Presensi Resmi
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                  {school.nama_sekolah}
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Cimanggu, Pesahangan · Jawa Tengah</span>
                </p>
              </div>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pt-1">
              Portal Kehadiran Guru &amp; Tenaga Pendidik berbasis validasi titik GPS radius sekolah, verifikasi biometrik wajah, dan pengenalan perangkat resmi.
            </p>
          </div>

          {/* Live System Status & Telemetry Card */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Waktu Server (WIB)</span>
              </div>
              <p className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                {currentWibTime}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {currentWibDate || 'Zona Waktu Asia/Jakarta'}
              </p>
            </div>

            <div className="space-y-1 border-l border-slate-800/80 pl-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Status Validasi</span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Radius {school.radius_absensi || 100}m
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                NPSN: {school.npsn || '69786432'}
              </p>
            </div>
          </div>

          {/* Core Security Features Showcase */}
          <div className="space-y-3 hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Standar Integritas &amp; Keamanan Presensi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">GPS Geofencing</span>
                <span className="text-[11px] text-slate-400 leading-tight">Radius akurat anti-fake GPS</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Foto Wajah Asli</span>
                <span className="text-[11px] text-slate-400 leading-tight">Tangkapan kamera langsung</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Device Binding</span>
                <span className="text-[11px] text-slate-400 leading-tight">1 Guru 1 Perangkat terdaftar</span>
              </div>
            </div>
          </div>

          {/* School Credo */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="italic">
              &quot;Mewujudkan Pendidik Berkarakter, Disiplin, dan Unggul Berbasis Teknologi.&quot;
            </span>
          </div>
        </div>

        {/* Right Column: Modern Authentication Card */}
        <div className="lg:col-span-6">
          <div className="relative">
            {/* Subtle glow border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-3xl blur-xl opacity-50" />

            <div className="relative bg-slate-900/85 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-2xl space-y-6">
              {/* Form Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Masuk ke Akun
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Gunakan email dan kata sandi akun resmi Anda untuk memulai sesi presensi atau manajemen.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email-input"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Email Akun
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@gmail.com"
                      required
                      autoComplete="email"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password-input"
                      className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                    >
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Butuh Bantuan?</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      required
                      autoComplete="current-password"
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Notice */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span>Ingat sesi di perangkat ini</span>
                  </label>
                  <span className="text-slate-400 text-[11px]">Enkripsi Terproteksi</span>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 text-sm cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memverifikasi Kredensial...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Sistem Presensi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Footnote */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sistem Absensi v2.4 · Database Terenkripsi</span>
                </span>
                <span className="text-slate-400">SMK Komputama</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Help & Support Dialog Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Bantuan Akses Akun</h3>
                <p className="text-xs text-slate-400">SMK Komputama Pesahangan</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lupa Kata Sandi?</span>
                </div>
                <p className="text-slate-400">
                  Untuk keamanan dan integritas data sekolah, pengaturan ulang kata sandi dilakukan secara terpusat oleh Tim Operator Kurikulum / Administrator Sekolah.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Ganti HP / Perangkat Baru?</span>
                </div>
                <p className="text-slate-400">
                  Perangkat Anda harus disetujui melalui menu Verifikasi Perangkat oleh Admin sebelum dapat melakukan presensi di lokasi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1.5">
                <div className="font-semibold text-slate-200">Kontak Pengelola:</div>
                <p className="text-slate-400">
                  Hubungi Admin Sekolah atau kunjungi Ruang IT / Tata Usaha SMK Komputama Pesahangan.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
