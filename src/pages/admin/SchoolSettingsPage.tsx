import React, { useState } from 'react';
import {
  Settings,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Building,
  Phone,
  Mail,
  UserCheck,
  Hash,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceMap } from '../../components/AttendanceMap';
import { GPSService } from '../../services/gpsService';
import { DEFAULT_SCHOOL_SETTINGS } from '../../services/store';

export const SchoolSettingsPage: React.FC = () => {
  const { school, updateSettings } = useSchool();

  // School Identity state
  const [namaSekolah, setNamaSekolah] = useState(school.nama_sekolah);
  const [logoUrl, setLogoUrl] = useState(school.logo_url || '');
  const [npsn, setNpsn] = useState(school.npsn || '');
  const [alamat, setAlamat] = useState(school.alamat);
  const [telepon, setTelepon] = useState(school.telepon || '');
  const [emailSekolah, setEmailSekolah] = useState(school.email_sekolah || '');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState(school.kepala_sekolah_nama || '');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState(school.kepala_sekolah_nip || '');

  // GPS & Radius
  const [latitude, setLatitude] = useState(school.latitude);
  const [longitude, setLongitude] = useState(school.longitude);
  const [radiusAbsensi, setRadiusAbsensi] = useState(school.radius_absensi);

  // Time & Security Toggles
  const [jamMasuk, setJamMasuk] = useState(school.jam_masuk);
  const [jamPulang, setJamPulang] = useState(school.jam_pulang);
  const [wajibPerangkat, setWajibPerangkat] = useState(school.wajib_perangkat_terdaftar ?? true);
  const [wajibWajah, setWajibWajah] = useState(school.wajib_wajah_terdaftar ?? true);

  const [isSaved, setIsSaved] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Handle file upload for school logo
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file logo maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        setLogoError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaultLogo = () => {
    setLogoUrl(DEFAULT_SCHOOL_SETTINGS.logo_url || '');
    setLogoError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      nama_sekolah: namaSekolah,
      logo_url: logoUrl,
      npsn,
      alamat,
      telepon,
      email_sekolah: emailSekolah,
      kepala_sekolah_nama: kepalaSekolahNama,
      kepala_sekolah_nip: kepalaSekolahNip,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_absensi: Number(radiusAbsensi),
      jam_masuk: jamMasuk,
      jam_pulang: jamPulang,
      wajib_perangkat_terdaftar: wajibPerangkat,
      wajib_wajah_terdaftar: wajibWajah,
      kop_surat_url: school.kop_surat_url,
      timezone: 'Asia/Jakarta',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await GPSService.getCurrentPosition();
      setLatitude(Number(loc.latitude.toFixed(6)));
      setLongitude(Number(loc.longitude.toFixed(6)));
    } catch (err: any) {
      alert(err.message || 'Gagal mendeteksi lokasi perangkat Anda. Pastikan izin GPS aktif.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLatitude(Number(lat.toFixed(6)));
    setLongitude(Number(lng.toFixed(6)));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Identitas Sekolah & Pengaturan Absensi</h1>
            <p className="text-xs text-slate-500">
              Ubah nama sekolah, logo resmi, NPSN, koordinat GPS, radius toleransi, dan jam kerja guru
            </p>
          </div>
        </div>

        {isSaved && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Logo & School Identity */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-blue-600" />
            <span>1. Profil & Identitas Lembaga Pendidikan</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Logo Preview & Uploader */}
            <div className="flex flex-col items-center p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-700 mb-3">Logo Resmi Sekolah</span>
              <div className="relative mb-3">
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    onError={() => setLogoError(true)}
                    className="w-28 h-28 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-md bg-white p-1"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">Belum ada logo</span>
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                <label className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah File Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleResetDefaultLogo}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gunakan Logo Default</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                Format: PNG/JPG/WebP, maksimal 2MB. Logo ini muncul di sidebar, header, dan laporan.
              </p>
            </div>

            {/* Identity Fields */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Resmi Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  placeholder="Contoh: SMK Komputama Pesahangan"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>NPSN (Nomor Pokok Sekolah Nasional)</span>
                  </label>
                  <input
                    type="text"
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    placeholder="Contoh: 69786432"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Link URL Logo (Alternatif)</span>
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setLogoError(false);
                    }}
                    placeholder="https://domain.com/logo.png"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alamat Lengkap Sekolah <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kabupaten/Kota..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nomor Telepon / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    placeholder="(0282) 555-1234"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Resmi Sekolah</span>
                  </label>
                  <input
                    type="email"
                    value={emailSekolah}
                    onChange={(e) => setEmailSekolah(e.target.value)}
                    placeholder="info@smkpesahangan.sch.id"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nama Kepala Sekolah</span>
                  </label>
                  <input
                    type="text"
                    value={kepalaSekolahNama}
                    onChange={(e) => setKepalaSekolahNama(e.target.value)}
                    placeholder="Drs. Bambang Sudarsono, M.Pd."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={kepalaSekolahNip}
                    onChange={(e) => setKepalaSekolahNip(e.target.value)}
                    placeholder="196808151994031005"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: GPS Coordinates & Radius Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>2. Titik Koordinat GPS Sekolah</span>
              </h2>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Gunakan Lokasi Saya</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600">
                  Radius Absensi Valid Sekolah
                </label>
                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {radiusAbsensi} Meter
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="500"
                step="10"
                value={radiusAbsensi}
                onChange={(e) => setRadiusAbsensi(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>30m (Ketat)</span>
                <span>100m (Standar Sekolah)</span>
                <span>250m</span>
                <span>500m (Luas)</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Guru hanya dapat melakukan absensi jika jarak GPS berada dalam lingkaran{' '}
                <strong>{radiusAbsensi} meter</strong> dari titik koordinat di atas.
              </span>
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700">
                Pilih Titik di Peta (Klik untuk memindahkan koordinat)
              </span>
              <span className="text-[11px] text-blue-600 font-semibold font-mono">
                {latitude}, {longitude}
              </span>
            </div>

            <div className="flex-1 min-h-[260px] rounded-2xl overflow-hidden border border-slate-200">
              <AttendanceMap
                schoolLat={latitude}
                schoolLng={longitude}
                radiusMeters={radiusAbsensi}
                schoolName={namaSekolah}
                isPickerMode={true}
                onLocationSelect={handleMapLocationSelect}
                height="280px"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Time & Security Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jam Kerja */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>3. Jadwal Masuk & Pulang</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Batas Jam Masuk (WIB)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    step="1"
                    required
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[10px] text-rose-500 mt-1 block">
                  Absen lewat {jamMasuk} ditandai TERLAMBAT.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jam Pulang Normal (WIB)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    step="1"
                    required
                    value={jamPulang}
                    onChange={(e) => setJamPulang(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Waktu pembukaan absensi pulang.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Zona Waktu Server:</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Asia/Jakarta (WIB)
              </span>
            </div>
          </div>

          {/* Security Features */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>4. Pengamanan Ketat Absensi</span>
            </h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={wajibPerangkat}
                  onChange={(e) => setWajibPerangkat(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Wajib Perangkat HP Terdaftar (Device Binding)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Hanya smartphone yang telah disetujui Administrator di menu &quot;Persetujuan HP&quot; yang
                    bisa melakukan absensi. Mencegah titip absen antar HP.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={wajibWajah}
                  onChange={(e) => setWajibWajah(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Wajib Verifikasi Biometrik Wajah Master
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Membandingkan foto wajah absensi langsung dengan foto wajah master guru yang tersimpan di
                    database Supabase.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Perubahan identitas sekolah, logo, dan radius langsung berlaku ke seluruh akun Guru dan Kepala Sekolah.
            </span>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all self-end sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
