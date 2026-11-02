import React, { createContext, useContext, useState, useEffect } from 'react';
import { SchoolSettings } from '../types';
import { localDB, DEFAULT_SCHOOL_SETTINGS } from '../services/store';
import { SupabaseSyncService } from '../services/supabaseSyncService';
import { AuditService } from '../services/auditService';
import { useAuth } from './AuthContext';

interface SchoolContextType {
  school: SchoolSettings;
  updateSettings: (newSettings: Partial<SchoolSettings>) => Promise<void>;
  currentWibTime: string;
  currentWibDate: string;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [school, setSchool] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [currentWibTime, setCurrentWibTime] = useState<string>('07:00:00');
  const [currentWibDate, setCurrentWibDate] = useState<string>('');

  useEffect(() => {
    // 1. Load initial school settings from local store
    const loaded = localDB.getSchoolSettings();
    setSchool(loaded);

    // 2. Fetch directly from Supabase if active
    SupabaseSyncService.fetchSchoolSettings().then((remoteSchool) => {
      if (remoteSchool && remoteSchool.nama_sekolah) {
        const merged = { ...loaded, ...remoteSchool };
        setSchool(merged as SchoolSettings);
        localDB.updateSchoolSettings(merged);
      }
    });

    // 3. Live clock ticker in Asia/Jakarta timezone
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: loaded.timezone || 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now).replace(/\./g, ':');

      const dateStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: loaded.timezone || 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      setCurrentWibTime(timeStr);
      setCurrentWibDate(dateStr);
    }, 1000);

    // 4. Listen for Realtime events from Supabase or central server sync
    const handleSync = (e: any) => {
      if (e.detail?.school) {
        setSchool((prev) => ({ ...prev, ...e.detail.school }));
      } else {
        setSchool(localDB.getSchoolSettings());
      }
    };

    const handleRealtimeSchool = (e: any) => {
      if (e.detail?.new) {
        console.log('[SchoolContext] Realtime school update received from Supabase:', e.detail.new);
        setSchool((prev) => ({ ...prev, ...e.detail.new }));
      }
    };

    window.addEventListener('absensi_synced', handleSync);
    window.addEventListener('absensi_realtime_school', handleRealtimeSchool);

    return () => {
      clearInterval(timer);
      window.removeEventListener('absensi_synced', handleSync);
      window.removeEventListener('absensi_realtime_school', handleRealtimeSchool);
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SchoolSettings>) => {
    // 1. Update local database & server API
    const updated = localDB.updateSchoolSettings(newSettings);
    setSchool(updated);

    // 2. Push to Supabase with UUID compatibility
    await SupabaseSyncService.pushSchoolSettings(newSettings);

    // 3. Audit log
    await AuditService.logActivity(
      user,
      'PERUBAHAN_PENGATURAN',
      `Pengaturan sekolah diperbarui oleh ${user?.nama || 'Admin'}: radius ${updated.radius_absensi}m, jam masuk ${updated.jam_masuk}`
    );
  };

  return (
    <SchoolContext.Provider
      value={{
        school,
        updateSettings,
        currentWibTime,
        currentWibDate,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
