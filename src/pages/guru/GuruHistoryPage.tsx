import React, { useState, useEffect } from 'react';
import { History, Eye, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { AttendanceService } from '../../services/attendanceService';
import { Attendance } from '../../types';
import { AttendanceDetailModal } from '../../components/AttendanceDetailModal';

export const GuruHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { school } = useSchool();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Attendance | null>(null);

  useEffect(() => {
    if (!user) return;
    const all = AttendanceService.getAllAttendances()
      .filter((a) => a.user_id === user.user_id)
      .sort((a, b) => new Date(b.server_timestamp).getTime() - new Date(a.server_timestamp).getTime());
    setAttendances(all);
  }, [user]);

  const filtered = attendances.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'in') return item.type === 'check_in';
    if (filterType === 'out') return item.type === 'check_out';
    return item.status === filterType;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Riwayat Absensi Pribadi</h1>
            <p className="text-xs text-slate-500">
              Daftar seluruh rekam kehadiran GPS & verifikasi wajah Anda
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'in', label: 'Masuk' },
            { id: 'out', label: 'Pulang' },
            { id: 'HADIR', label: 'Hadir' },
            { id: 'TERLAMBAT', label: 'Terlambat' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Tidak ada riwayat absensi yang cocok dengan filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const isHadir = item.status === 'HADIR';
              const isLate = item.status === 'TERLAMBAT';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Photo thumbnail */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {item.photo?.watermarked_url || item.photo?.raw_data_url ? (
                        <img
                          src={item.photo.watermarked_url || item.photo.raw_data_url}
                          alt="Foto"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs">
                          FOTO
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            item.type === 'check_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.type === 'check_in' ? 'MASUK' : 'PULANG'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {new Intl.DateTimeFormat('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }).format(new Date(item.server_timestamp))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Intl.DateTimeFormat('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }).format(new Date(item.server_timestamp))} WIB
                        </span>
                        <span>• Jarak: {item.distance_from_school}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                        isHadir
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isLate
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    <Eye className="w-4 h-4 text-slate-400 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AttendanceDetailModal
        attendance={selectedItem}
        school={school}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
