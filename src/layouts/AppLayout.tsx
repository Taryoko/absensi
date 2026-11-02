import React, { useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  History,
  User,
  Users,
  Settings,
  FileSpreadsheet,
  ShieldAlert,
  LogOut,
  Clock,
  Menu,
  X,
  Database,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { isLiveSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

interface AppLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { user, role, logout } = useAuth();
  const { school, currentWibTime } = useSchool();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLiveSupabase = isLiveSupabaseConfigured();

  // Navigation Items per Role
  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'device-registrations', label: 'Persetujuan HP', icon: Smartphone },
        { id: 'attendance', label: 'Data Absensi', icon: Camera },
        { id: 'teachers', label: 'Kelola Guru & Akun', icon: Users },
        { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
        { id: 'school-settings', label: 'Identitas Sekolah', icon: Settings },
        { id: 'database-sql', label: 'Database & SQL', icon: Database },
        { id: 'audit-logs', label: 'Audit Log', icon: ShieldAlert },
      ];
    }
    if (role === 'kepsek') {
      return [
        { id: 'dashboard', label: 'Dashboard Kepsek', icon: LayoutDashboard },
        { id: 'attendance', label: 'Pantau Absensi', icon: Camera },
        { id: 'reports', label: 'Laporan Absensi', icon: FileSpreadsheet },
      ];
    }
    // guru
    return [
      { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
      { id: 'capture', label: 'Ambil Absen', icon: Camera },
      { id: 'history', label: 'Riwayat', icon: History },
      { id: 'profile', label: 'Profil Saya', icon: User },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800 antialiased">
      {/* Sidebar for Desktop (Admin & Kepsek & Guru) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0">
        {/* Brand with Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt="Logo Sekolah"
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-blue-500/30 bg-white"
                onError={(e) => {
                  // Fallback if broken image URL
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 ${school.logo_url ? 'hidden' : ''}`}>
              SMK
            </div>
            <div className="truncate">
              <h1 className="font-extrabold text-sm text-white leading-tight truncate" title={school.nama_sekolah}>
                {school.nama_sekolah}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium truncate">
                {school.npsn ? `NPSN: ${school.npsn}` : 'Sistem Absensi GPS & Wajah'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Clock & Supabase Status Badge */}
        <div className="p-4 mx-3 my-2 rounded-2xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Waktu Server (WIB)
            </span>
            <span className="font-mono font-bold text-white tracking-wider">{currentWibTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] pt-1.5 border-t border-slate-700 text-slate-400">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Koneksi DB:</span>
            <span className={`font-semibold ${isLiveSupabase ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {isLiveSupabase ? 'Supabase Live' : 'Supabase (Local RLS)'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout Button (Strict login requirement) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user?.foto_profil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user?.nama}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/50"
              />
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.nama}</p>
                <p className="text-[10px] text-blue-400 uppercase font-semibold">ROLE: {user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Keluar / Ganti Akun"
              className="px-2.5 py-1.5 rounded-xl text-xs bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold flex items-center gap-1 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
          <div className="flex items-center gap-2.5 min-w-0">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt="Logo Sekolah"
                className="w-8 h-8 rounded-xl object-cover bg-white ring-1 ring-blue-500/40 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div
              className={`w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xs shrink-0 ${
                school.logo_url ? 'hidden' : ''
              }`}
            >
              SMK
            </div>
            <div className="truncate">
              <p className="text-xs font-extrabold leading-tight truncate">{school.nama_sekolah}</p>
              <p className="text-[10px] text-blue-400 font-mono">{currentWibTime} WIB</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 text-white animate-in slide-in-from-top duration-200 z-50">
            <div className="p-3 bg-slate-800/80 rounded-xl mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={user?.foto_profil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user?.nama}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-xs font-bold">{user?.nama}</p>
                  <p className="text-[10px] text-blue-400 font-semibold uppercase">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-2.5 py-1 text-xs bg-rose-600/80 rounded-lg text-white font-medium"
              >
                Logout
              </button>
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Menu</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  currentTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Navigation Bar (Particularly intuitive for Guru) */}
        {role === 'guru' && (
          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl ${
                      item.id === 'capture'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 -mt-5 p-3 rounded-2xl'
                        : active
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <Icon className={item.id === 'capture' ? 'w-6 h-6' : 'w-5 h-5'} />
                  </div>
                  <span className={`text-[10px] font-semibold ${item.id === 'capture' ? 'text-blue-600' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};
