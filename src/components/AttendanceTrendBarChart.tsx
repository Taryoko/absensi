import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Attendance, Profile } from '../types';

interface AttendanceTrendBarChartProps {
  attendances: Attendance[];
  teachers?: Profile[];
  title?: string;
  subtitle?: string;
}

export const AttendanceTrendBarChart: React.FC<AttendanceTrendBarChartProps> = ({
  attendances,
  teachers = [],
  title = 'Tren Kehadiran Guru',
  subtitle = 'Visualisasi perbandingan hadir tepat waktu, terlambat, dan tidak hadir',
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const totalTeachers = Math.max(teachers.length, 3);

  // Compute trend data based on actual attendance records
  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'daily') {
      // Last 7 days
      const days = [];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const dayLabel = `${dayNames[d.getDay()]} (${dd}/${mm})`;

        // Find records for this date
        const dayRecords = attendances.filter((a) => {
          if (!a.server_timestamp) return false;
          return a.server_timestamp.startsWith(dateKey) || a.created_at?.startsWith(dateKey);
        });

        const hadir = dayRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'HADIR'
        ).length;
        const terlambat = dayRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'TERLAMBAT'
        ).length;
        const izinSakit = dayRecords.filter(
          (a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT'
        ).length;
        const ditolak = dayRecords.filter(
          (a) =>
            a.status === 'DITOLAK' ||
            a.status === 'DI_LUAR_AREA' ||
            a.status === 'GPS_TIDAK_VALID' ||
            a.status === 'FOTO_TIDAK_VALID' ||
            a.status === 'INDIKASI_FAKE_GPS'
        ).length;

        // If today or past weekday with no records, provide representative default or zero
        const isWeekend = d.getDay() === 0;
        const checkedInOrExcused = hadir + terlambat + izinSakit;
        const tidakHadir = isWeekend
          ? 0
          : Math.max(0, totalTeachers - checkedInOrExcused);

        days.push({
          label: dayLabel,
          hadir,
          terlambat,
          izinSakit,
          tidakHadir,
          ditolak,
          total: checkedInOrExcused + tidakHadir,
        });
      }
      return days;
    } else if (period === 'weekly') {
      // Last 4 Weeks
      const weeks = [];
      for (let w = 3; w >= 0; w--) {
        const start = new Date(now);
        start.setDate(start.getDate() - w * 7 - 6);
        const end = new Date(now);
        end.setDate(end.getDate() - w * 7);

        const label = `Mg ${4 - w} (${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1})`;

        const weekRecords = attendances.filter((a) => {
          const ts = new Date(a.server_timestamp || a.created_at);
          return ts >= start && ts <= end;
        });

        const hadir = weekRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'HADIR'
        ).length;
        const terlambat = weekRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'TERLAMBAT'
        ).length;
        const izinSakit = weekRecords.filter(
          (a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT'
        ).length;
        const tidakHadir = Math.max(0, totalTeachers * 5 - (hadir + terlambat + izinSakit));

        weeks.push({
          label,
          hadir,
          terlambat,
          izinSakit,
          tidakHadir,
        });
      }
      return weeks;
    } else {
      // Last 6 Months
      const months = [];
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
      ];
      for (let m = 5; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const y = d.getFullYear();
        const mon = d.getMonth();
        const label = `${monthNames[mon]} ${y}`;
        const prefix = `${y}-${String(mon + 1).padStart(2, '0')}`;

        const monthRecords = attendances.filter((a) => {
          const ts = a.server_timestamp || a.created_at;
          return ts && ts.startsWith(prefix);
        });

        const hadir = monthRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'HADIR'
        ).length;
        const terlambat = monthRecords.filter(
          (a) => a.type === 'check_in' && a.status === 'TERLAMBAT'
        ).length;
        const izinSakit = monthRecords.filter(
          (a) => a.type === 'izin' || a.type === 'sakit' || a.status === 'IZIN' || a.status === 'SAKIT'
        ).length;

        // Estimated expected working days in month ~ 22
        const expectedTotal = totalTeachers * 22;
        const tidakHadir = Math.max(0, expectedTotal - (hadir + terlambat + izinSakit));

        months.push({
          label,
          hadir,
          terlambat,
          izinSakit,
          tidakHadir,
        });
      }
      return months;
    }
  }, [attendances, totalTeachers, period]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs text-white space-y-1.5 z-50">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod('daily')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'daily'
                ? 'bg-white shadow text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'weekly'
                ? 'bg-white shadow text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4 Minggu
          </button>
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'monthly'
                ? 'bg-white shadow text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Bulan
          </button>
        </div>
      </div>

      {/* Visual Recharts Bar Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            barSize={period === 'daily' ? 18 : 24}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
            />
            <Bar
              dataKey="hadir"
              name="Hadir Tepat Waktu"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="terlambat"
              name="Terlambat"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="izinSakit"
              name="Izin / Sakit"
              fill="#818cf8"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="tidakHadir"
              name="Belum/Tidak Hadir"
              fill="#cbd5e1"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600 font-medium">Hadir Tepat:</span>
          <span className="font-bold text-slate-800">
            {chartData.reduce((acc, curr) => acc + curr.hadir, 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-600 font-medium">Terlambat:</span>
          <span className="font-bold text-slate-800">
            {chartData.reduce((acc, curr) => acc + curr.terlambat, 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-slate-600 font-medium">Izin / Sakit:</span>
          <span className="font-bold text-slate-800">
            {chartData.reduce((acc, curr) => acc + (curr.izinSakit || 0), 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="text-slate-600 font-medium">Tidak Hadir:</span>
          <span className="font-bold text-slate-800">
            {chartData.reduce((acc, curr) => acc + curr.tidakHadir, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
