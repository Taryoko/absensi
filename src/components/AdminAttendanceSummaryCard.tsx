import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Database,
  ArrowRight,
  TrendingUp,
  Radio,
  Sparkles,
} from 'lucide-react';
import { getSupabaseClient, isLiveSupabaseConfigured } from '../lib/supabase';
import { AttendanceService } from '../services/attendanceService';
import { localDB } from '../services/store';
import { Attendance, Profile, DeviceRegistration } from '../types';

interface AdminAttendanceSummaryCardProps {
  onNavigateDevices?: () => void;
  onNavigateReports?: () => void;
}

export interface AttendanceRealtimeStats {
  totalGuru: number;
  totalPresentToday: number;
  onTimeCount: number;
  lateCount: number;
  permitCount: number;
  pendingRequestsCount: number;
  notCheckedInCount: number;
  attendancePercentage: number;
  isFromSupabase: boolean;
  lastUpdated: string;
}

export const AdminAttendanceSummaryCard: React.FC<AdminAttendanceSummaryCardProps> = ({
  onNavigateDevices,
  onNavigateReports,
}) => {
  const [stats, setStats] = useState<AttendanceRealtimeStats>({
    totalGuru: 0,
    totalPresentToday: 0,
    onTimeCount: 0,
    lateCount: 0,
    permitCount: 0,
    pendingRequestsCount: 0,
    notCheckedInCount: 0,
    attendancePercentage: 0,
    isFromSupabase: false,
    lastUpdated: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'local'>('connecting');

  // Compute stats helper
  const computeStats = useCallback(
    (
      attendances: Attendance[],
      devices: DeviceRegistration[],
      teachers: Profile[],
      fromRemote: boolean
    ) => {
      const todayRecords = attendances.filter((a) =>
        AttendanceService.isTodayJakarta(a.server_timestamp)
      );

      // Check-in attendances
      const checkIns = todayRecords.filter((a) => a.type === 'check_in');
      const presentRecords = checkIns.filter(
        (a) => a.status === 'HADIR' || a.status === 'TERLAMBAT'
      );
      const onTime = presentRecords.filter((a) => a.status === 'HADIR').length;
      const late = presentRecords.filter((a) => a.status === 'TERLAMBAT').length;

      // Permits (Izin / Sakit)
      const permits = todayRecords.filter(
        (a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT'
      );
      const permitTeacherIds = new Set(permits.map((a) => a.user_id));
      const permitCount = permitTeacherIds.size;

      // Unique teachers present
      const uniquePresentUserIds = new Set(presentRecords.map((a) => a.user_id));
      const totalPresent = uniquePresentUserIds.size;

      // Pending device requests or pending attendance validations
      const pendingDevices = devices.filter((d) => d.status === 'PENDING').length;
      const pendingAttendance = attendances.filter(
        (a) => (a.status as string) === 'PENDING' || (a.status as string) === 'MENUNGGU_VALIDASI'
      ).length;
      const totalPendingRequests = pendingDevices + pendingAttendance;

      const totalActiveGuru = teachers.length > 0 ? teachers.length : Math.max(totalPresent + permitCount, 1);
      const accountedFor = new Set([...uniquePresentUserIds, ...permitTeacherIds]);
      const notCheckedIn = Math.max(0, totalActiveGuru - accountedFor.size);
      const percentage = Math.round(((totalPresent + permitCount) / totalActiveGuru) * 100);

      const nowTimeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date()).replace(/\./g, ':');

      setStats({
        totalGuru: totalActiveGuru,
        totalPresentToday: totalPresent,
        onTimeCount: onTime,
        lateCount: late,
        permitCount: permitCount,
        pendingRequestsCount: totalPendingRequests,
        notCheckedInCount: notCheckedIn,
        attendancePercentage: Math.min(100, percentage),
        isFromSupabase: fromRemote,
        lastUpdated: `${nowTimeStr} WIB`,
      });
    },
    []
  );

  // Fetch real-time statistics directly from Supabase with fallback to local store
  const fetchRealtimeStats = useCallback(async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    const isConfigured = isLiveSupabaseConfigured();

    if (isConfigured && client) {
      try {
        setConnectionStatus('connecting');
        const [attRes, devRes, profRes] = await Promise.all([
          client
            .from('attendance')
            .select('*')
            .order('server_timestamp', { ascending: false }),
          client.from('device_registrations').select('*'),
          client.from('profiles').select('*').eq('role', 'guru'),
        ]);

        const hasSupabaseData = !attRes.error && Array.isArray(attRes.data);
        if (hasSupabaseData) {
          const remoteAttendances = (attRes.data as Attendance[]) || [];
          const remoteDevices = (devRes.data as DeviceRegistration[]) || [];
          const remoteTeachers = (profRes.data as Profile[]) || [];

          setConnectionStatus('connected');
          computeStats(remoteAttendances, remoteDevices, remoteTeachers, true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('[AdminAttendanceSummaryCard] Failed to fetch Supabase stats, falling back to local DB:', err);
      }
    }

    // Fallback to local store / server cached data
    const localAttendances = localDB.getAttendances();
    const localDevices = localDB.getDeviceRegistrations();
    const localTeachers = localDB.getProfiles().filter((p) => p.role === 'guru');

    setConnectionStatus(isConfigured ? 'connected' : 'local');
    computeStats(localAttendances, localDevices, localTeachers, false);
    setIsLoading(false);
  }, [computeStats]);

  useEffect(() => {
    fetchRealtimeStats();

    // 1. Subscribe to Supabase Realtime channel
    const client = getSupabaseClient();
    let realtimeChannel: any = null;

    if (client && isLiveSupabaseConfigured()) {
      try {
        realtimeChannel = client
          .channel('summary-stats-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'attendance' },
            () => {
              console.log('[AdminAttendanceSummaryCard] Realtime attendance change received');
              fetchRealtimeStats();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'device_registrations' },
            () => {
              console.log('[AdminAttendanceSummaryCard] Realtime device change received');
              fetchRealtimeStats();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error in summary card:', e);
      }
    }

    // 2. Window events for cross-tab and central server sync
    const handleSync = () => fetchRealtimeStats();
    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_attendance', handleSync);
    window.addEventListener('absensi_realtime_devices', handleSync);

    // 3. Periodic refresh every 10 seconds to keep live stats fresh
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRealtimeStats();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (realtimeChannel && client) {
        try {
          client.removeChannel(realtimeChannel);
        } catch {}
      }
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_attendance', handleSync);
      window.removeEventListener('absensi_realtime_devices', handleSync);
    };
  }, [fetchRealtimeStats]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 p-6 sm:p-7 space-y-6">
      {/* Background Glow Overlay */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Statistik Presensi Real-Time Supabase
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
              <span>Sumber: {stats.isFromSupabase ? 'PostgreSQL Supabase (Aktif)' : 'Sinkronisasi Server Terpusat'}</span>
              <span>•</span>
              <span className="text-slate-400 font-mono">Diperbarui: {stats.lastUpdated}</span>
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRealtimeStats}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            title="Muat ulang data presensi terkini dari Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Key Statistics */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Present Today */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Total Hadir Hari Ini</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-black font-mono">
              {stats.attendancePercentage}%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.totalPresentToday}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              dari {stats.totalGuru} guru aktif
            </span>
          </div>

          {/* Breakdown tags */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-emerald-500/20 text-slate-300">
            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {stats.onTimeCount} Tepat
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {stats.lateCount} Telat
            </span>
            {stats.permitCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {stats.permitCount} Izin/Sakit
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Pending Attendance & Device Requests */}
        <div
          onClick={stats.pendingRequestsCount > 0 && onNavigateDevices ? onNavigateDevices : undefined}
          className={`p-5 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900/90 border border-amber-500/40 shadow-lg relative overflow-hidden transition-all ${
            stats.pendingRequestsCount > 0
              ? 'cursor-pointer hover:border-amber-400 hover:scale-[1.01]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Pengajuan Menunggu Persetujuan</span>
            </span>
            {stats.pendingRequestsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-black animate-pulse">
                ACTION
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold">
                BERSIH
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight">
              {stats.pendingRequestsCount}
            </span>
            <span className="text-xs text-amber-200/80 font-medium">
              permintaan pending
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-500/20 text-slate-300">
            <span className="text-amber-300">Pendaftaran HP &amp; Verifikasi</span>
            {stats.pendingRequestsCount > 0 && (
              <span className="text-amber-400 font-bold flex items-center gap-1 hover:underline">
                <span>Tinjau</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Attendance Rate (%) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900/90 border border-blue-500/30 shadow-lg relative overflow-hidden group hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Tingkat Kehadiran</span>
            </span>
            <span className="text-[10px] text-blue-300 font-bold">Target &gt;95%</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.attendancePercentage}%
            </span>
            <span className="text-xs text-slate-400 font-medium">persentase hari ini</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stats.attendancePercentage >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : stats.attendancePercentage >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-500 to-red-400'
              }`}
              style={{ width: `${stats.attendancePercentage}%` }}
            />
          </div>
        </div>

        {/* Card 4: Not Checked In Yet */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/90 border border-slate-700/60 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Belum Absen Hari Ini</span>
            </span>
            <span className="text-[10px] font-bold text-rose-400">
              {stats.notCheckedInCount > 0 ? 'Perlu Dipantau' : 'Lengkap'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-200 font-mono tracking-tight">
              {stats.notCheckedInCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">guru belum hadir</span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-700/60 text-slate-400">
            <span>Tanpa presensi masuk</span>
            {onNavigateReports && (
              <button
                type="button"
                onClick={onNavigateReports}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Lihat Rekap</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
