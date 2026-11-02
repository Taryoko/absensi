import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Upload,
  Sparkles,
  Smartphone,
  Lock,
} from 'lucide-react';
import { localDB } from '../../services/store';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { SupabaseSyncService } from '../../services/supabaseSyncService';
import { Profile, UserRole } from '../../types';

export const TeachersPage: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guru' | 'kepsek' | 'admin'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('guru');
  const [statusAktif, setStatusAktif] = useState(true);
  const [fotoUrl, setFotoUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswordId, setRevealedPasswordId] = useState<string | null>(null);

  const loadProfiles = () => {
    const list = localDB.getProfiles();
    setProfiles(list);
  };

  useEffect(() => {
    loadProfiles();

    // Pull from Supabase if connected
    SupabaseSyncService.fetchProfiles().then((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        const localList = localDB.getProfiles();
        const merged = remoteList.map((rp) => {
          const matched = localList.find((lp) => lp.email.toLowerCase() === rp.email.toLowerCase());
          return {
            ...rp,
            password: matched?.password || 'Guru123!',
          };
        });
        setProfiles(merged);
      }
    });

    const handleSync = () => {
      loadProfiles();
    };

    const handleRealtimeProfiles = () => {
      console.log('[TeachersPage] Realtime profile update received');
      loadProfiles();
    };

    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_profiles', handleRealtimeProfiles);

    return () => {
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_profiles', handleRealtimeProfiles);
    };
  }, []);

  const generateRandomPassword = () => {
    const prefixes = ['Guru', 'Hadir', 'Absen', 'Sekolah', 'Pendidik'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const chars = ['!', '@', '#', '$'];
    const char = chars[Math.floor(Math.random() * chars.length)];
    setPassword(`${prefix}${num}${char}`);
  };

  const openAddModal = () => {
    setEditingProfile(null);
    setNama('');
    setNip('');
    setEmail('');
    setPassword('Guru123!');
    setShowPassword(true);
    setRole('guru');
    setStatusAktif(true);
    setFotoUrl('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150');
    setModalOpen(true);
  };

  const openEditModal = (p: Profile) => {
    setEditingProfile(p);
    setNama(p.nama);
    setNip(p.nip || '');
    setEmail(p.email);
    setPassword(p.password || 'Guru123!');
    setShowPassword(false);
    setRole(p.role);
    setStatusAktif(p.status_aktif);
    setFotoUrl(p.foto_profil || '');
    setModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim()) return;

    if (editingProfile) {
      const updated: Profile = {
        ...editingProfile,
        nama: nama.trim(),
        nip: nip.trim() || null,
        email: email.trim().toLowerCase(),
        password: password.trim() || editingProfile.password || 'Guru123!',
        role,
        status_aktif: statusAktif,
        foto_profil: fotoUrl,
        updated_at: new Date().toISOString(),
      };
      localDB.saveProfile(updated);
      await SupabaseSyncService.pushProfile(updated);
      await AuditService.logActivity(
        user,
        'EDIT_GURU',
        `Memperbarui data & akun login: ${nama} (${email}, role: ${role})`
      );
    } else {
      // Check duplicate email
      const existing = localDB.getProfileByEmail(email.trim());
      if (existing) {
        alert(`Email ${email} sudah terdaftar. Gunakan email lain.`);
        return;
      }

      const newId = `profile-${Date.now()}`;
      const newUserId = `user-${Date.now()}`;
      const newProfile: Profile = {
        id: newId,
        user_id: newUserId,
        nama: nama.trim(),
        nip: nip.trim() || null,
        email: email.trim().toLowerCase(),
        password: password.trim() || 'Guru123!',
        role,
        foto_profil: fotoUrl,
        status_aktif: statusAktif,
        registered_device_id: null,
        registered_device_name: null,
        biometric_enrolled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localDB.saveProfile(newProfile);
      await SupabaseSyncService.pushProfile(newProfile);
      await AuditService.logActivity(
        user,
        'TAMBAH_GURU',
        `Menambahkan akun pengguna baru: ${nama} (${email}, role: ${role})`
      );
    }

    setModalOpen(false);
    loadProfiles();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus akun & data: ${name}? Pengguna ini tidak akan bisa login lagi.`)) {
      localDB.deleteProfile(id);
      await AuditService.logActivity(user, 'HAPUS_GURU', `Menghapus akun pengguna: ${name}`);
      loadProfiles();
    }
  };

  const handleToggleStatus = async (p: Profile) => {
    const updated = { ...p, status_aktif: !p.status_aktif };
    localDB.saveProfile(updated);
    await SupabaseSyncService.pushProfile(updated);
    await AuditService.logActivity(
      user,
      'EDIT_GURU',
      `Mengubah status akun ${p.nama} menjadi ${updated.status_aktif ? 'Aktif' : 'Nonaktif'}`
    );
    loadProfiles();
  };

  const handleResetDevice = async (p: Profile) => {
    if (
      confirm(
        `Reset kunci HP untuk ${p.nama}? Guru ini dapat mendaftarkan HP baru pada absensi berikutnya.`
      )
    ) {
      const updated: Profile = {
        ...p,
        registered_device_id: null,
        registered_device_name: null,
        device_registered_at: null,
        updated_at: new Date().toISOString(),
      };
      localDB.saveProfile(updated);
      await SupabaseSyncService.pushProfile(updated);
      await AuditService.logActivity(
        user,
        'RESET_PERANGKAT_GURU',
        `Admin me-reset kunci perangkat HP untuk: ${p.nama}`
      );
      loadProfiles();
    }
  };

  const handleResetFace = async (p: Profile) => {
    if (
      confirm(
        `Reset foto wajah master biometrik untuk ${p.nama}? Guru ini dapat merekam ulang wajahnya.`
      )
    ) {
      const updated: Profile = {
        ...p,
        registered_face_url: null,
        registered_face_hash: null,
        face_registered_at: null,
        biometric_enrolled: false,
        updated_at: new Date().toISOString(),
      };
      localDB.saveProfile(updated);
      await SupabaseSyncService.pushProfile(updated);
      await AuditService.logActivity(
        user,
        'RESET_WAJAH_MASTER',
        `Admin me-reset foto wajah master untuk: ${p.nama}`
      );
      loadProfiles();
    }
  };

  const copyAccountCredentials = (p: Profile) => {
    const text = `📋 INFORMASI AKUN ABSENSI SEKOLAH:\nNama: ${p.nama}\nRole: ${p.role.toUpperCase()}\nEmail: ${p.email}\nPassword: ${p.password || 'Guru123!'}\n\nSilakan gunakan akun di atas untuk login ke aplikasi absensi sekolah.`;
    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.nip && p.nip.includes(search)) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' ? true : p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Guru & Akun Login</h1>
            <p className="text-xs text-slate-500">
              Tambah akun login (Email &amp; Password) bersamaan dengan data guru, kunci HP, dan foto master
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru &amp; Akun Login</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, NIP, atau email login..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'all', label: 'Semua Akun' },
                { id: 'guru', label: 'Guru' },
                { id: 'kepsek', label: 'Kepsek' },
                { id: 'admin', label: 'Admin' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profiles Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Nama &amp; Foto</th>
                <th className="py-3 px-3">Akun Login (Email &amp; Sandi)</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Kunci HP</th>
                <th className="py-3 px-3">Face ID Master</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const isPasswordShown = revealedPasswordId === p.id;
                const passwordValue = p.password || 'Guru123!';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Nama & Foto */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.foto_profil ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'
                          }
                          alt={p.nama}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 bg-white"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{p.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            NIP: {p.nip || 'Belum diatur'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Akun Login (Email & Password) */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-semibold text-slate-800 block">
                          {p.email}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {isPasswordShown ? passwordValue : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswordId(isPasswordShown ? null : p.id)
                            }
                            title={isPasswordShown ? 'Sembunyikan Sandi' : 'Lihat Sandi'}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                          >
                            {isPasswordShown ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyAccountCredentials(p)}
                            title="Salin Info Akun Login Lengkap"
                            className="p-1 rounded text-blue-600 hover:bg-blue-50 font-medium flex items-center gap-1 text-[10px]"
                          >
                            {copiedId === p.id ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Tersalin
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-3 h-3" /> Salin Akun
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          p.role === 'admin'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : p.role === 'kepsek'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>

                    {/* Kunci HP */}
                    <td className="py-3 px-3">
                      {p.registered_device_id ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-semibold text-slate-800 truncate max-w-[120px]"
                            title={p.registered_device_name || p.registered_device_id}
                          >
                            {p.registered_device_name || 'Terkunci'}
                          </span>
                          <button
                            onClick={() => handleResetDevice(p)}
                            title="Reset Kunci HP"
                            className="text-[10px] font-bold text-rose-600 hover:underline bg-rose-50 px-1.5 py-0.5 rounded"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Bebas (Belum Kunci)</span>
                      )}
                    </td>

                    {/* Face ID Master */}
                    <td className="py-3 px-3">
                      {p.registered_face_url ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={p.registered_face_url}
                            alt="Master Face"
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500"
                          />
                          <button
                            onClick={() => handleResetFace(p)}
                            title="Reset Foto Wajah Master"
                            className="text-[10px] font-bold text-rose-600 hover:underline bg-rose-50 px-1.5 py-0.5 rounded"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium text-[11px]">Belum Rekam</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status_aktif
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.status_aktif ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-500" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Akun & Password"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nama)}
                          title="Hapus Akun Pengguna"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Account */}
      {modalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingProfile ? 'Edit Data & Akun Login' : 'Tambah Guru & Akun Login Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Akun ini langsung aktif untuk masuk ke aplikasi absensi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap Guru / Pendidik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Ahmad Yani, S.Pd., M.Kom."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19870514..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Hak Akses / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="guru">GURU (Absensi GPS &amp; Wajah)</option>
                    <option value="kepsek">KEPALA SEKOLAH (Monitoring &amp; Laporan)</option>
                    <option value="admin">ADMIN (Akses Penuh Sistem)</option>
                  </select>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kredensial Akun Login</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                    Email untuk Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.local"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-blue-900">
                      Kata Sandi Login <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Buat Sandi Acak</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full bg-white border border-blue-200 rounded-xl pl-3 pr-10 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Foto Profil & Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Foto Profil Pengguna
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt="Preview"
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-200 bg-white"
                  />
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto dari Perangkat</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Status Aktif */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Status Akun Login</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusAktif}
                    onChange={(e) => setStatusAktif(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {statusAktif ? 'Akun Aktif (Bisa Login)' : 'Akun Nonaktif'}
                  </span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
