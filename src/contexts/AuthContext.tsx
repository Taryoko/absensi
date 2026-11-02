import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { localDB, DEMO_USERS } from '../services/store';
import { AuditService } from '../services/auditService';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  quickLoginDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved session
    const savedUserJson = localStorage.getItem('absensi_current_user_v1');
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson);
        const profile = (parsed.email && localDB.getProfileByEmail(parsed.email)) ||
          (parsed.id && localDB.getProfileByUserId(parsed.id)) ||
          (parsed.user_id && localDB.getProfileByUserId(parsed.user_id)) ||
          parsed;
        const normalized = {
          ...profile,
          user_id: profile.user_id || profile.id,
        };
        setUser(normalized);
      } catch (e) {
        localStorage.removeItem('absensi_current_user_v1');
        setUser(null);
      }
    } else {
      // Always show login page on initial visit
      setUser(null);
    }
    setIsLoading(false);

    // Sync current user profile when remote database updates
    const handleRemoteSync = (e: any) => {
      const current = localStorage.getItem('absensi_current_user_v1');
      if (current) {
        try {
          const parsed = JSON.parse(current);
          const profiles: Profile[] = e.detail?.profiles || localDB.getProfiles();
          const matched = profiles.find((p) => 
            (parsed.email && p.email.toLowerCase() === parsed.email.toLowerCase()) || 
            p.id === parsed.id || 
            (parsed.user_id && p.user_id === parsed.user_id)
          );
          if (matched) {
            const normalized = {
              ...matched,
              user_id: matched.user_id || matched.id,
            };
            setUser(normalized);
            localStorage.setItem('absensi_current_user_v1', JSON.stringify(normalized));
          }
        } catch {}
      }
    };
    window.addEventListener('absensi_synced', handleRemoteSync);

    return () => {
      window.removeEventListener('absensi_synced', handleRemoteSync);
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    // If live Supabase configured
    if (isLiveSupabaseConfigured() && supabase && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const profile = localDB.getProfileByEmail(email);
          if (profile) {
            const normalized = {
              ...profile,
              user_id: profile.user_id || profile.id,
            };
            setUser(normalized);
            localStorage.setItem('absensi_current_user_v1', JSON.stringify(normalized));
            await AuditService.logActivity(normalized, 'LOGIN', `Login sukses ke akun ${normalized.email}`);
            setIsLoading(false);
            return { success: true };
          }
        }
      } catch (err) {
        console.warn('Supabase auth sign in error, falling back to verified demo store:', err);
      }
    }

    // Match with registered profiles & demo credentials
    const targetDemo = DEMO_USERS.find((d) => d.profile.email.toLowerCase() === email.toLowerCase());
    if (targetDemo) {
      if (password && targetDemo.passwordHash !== password) {
        setIsLoading(false);
        return { success: false, message: 'Password salah. Periksa kembali kata sandi Anda.' };
      }

      const normalized = {
        ...targetDemo.profile,
        user_id: targetDemo.profile.user_id || targetDemo.profile.id,
      };
      setUser(normalized);
      localStorage.setItem('absensi_current_user_v1', JSON.stringify(normalized));
      await AuditService.logActivity(normalized, 'LOGIN', `Login sukses ${normalized.email} (${normalized.role.toUpperCase()})`);
      setIsLoading(false);
      return { success: true };
    }

    // Check custom profile added by admin
    const customProfile = localDB.getProfileByEmail(email);
    if (customProfile) {
      if (!customProfile.status_aktif) {
        setIsLoading(false);
        return { success: false, message: 'Akun Anda telah dinonaktifkan oleh Administrator.' };
      }
      if (customProfile.password && password && customProfile.password !== password) {
        setIsLoading(false);
        return { success: false, message: 'Password salah. Periksa kembali kata sandi akun Anda.' };
      }
      const normalized = {
        ...customProfile,
        user_id: customProfile.user_id || customProfile.id,
      };
      setUser(normalized);
      localStorage.setItem('absensi_current_user_v1', JSON.stringify(normalized));
      await AuditService.logActivity(normalized, 'LOGIN', `Login sukses pengguna ${normalized.email} (${normalized.role.toUpperCase()})`);
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, message: 'Email tidak ditemukan. Pastikan email sudah didaftarkan oleh Admin.' };
  };

  const quickLoginDemo = async (targetRole: UserRole) => {
    const demo = DEMO_USERS.find((d) => d.profile.role === targetRole);
    if (demo) {
      const normalized = {
        ...demo.profile,
        user_id: demo.profile.user_id || demo.profile.id,
      };
      setUser(normalized);
      localStorage.setItem('absensi_current_user_v1', JSON.stringify(normalized));
      await AuditService.logActivity(normalized, 'LOGIN', `Quick-switch role: ${targetRole.toUpperCase()}`);
    }
  };

  const logout = async () => {
    if (user) {
      await AuditService.logActivity(user, 'LOGOUT', `Logout dari akun ${user.email}`);
    }
    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    setUser(null);
    localStorage.removeItem('absensi_current_user_v1');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        quickLoginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
