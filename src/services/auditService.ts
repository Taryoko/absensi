import { localDB } from './store';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { AuditLog, Profile } from '../types';

export class AuditService {
  public static async logActivity(
    user: Profile | null,
    activity: string,
    description: string
  ): Promise<AuditLog> {
    const userAgent = navigator.userAgent;

    const newLogData = {
      user_id: user ? user.user_id : null,
      activity,
      description,
      ip_address: '127.0.0.1 (Local Client)',
      device_info: userAgent,
      user_nama: user ? user.nama : 'Sistem / Tamu',
      user_role: user ? user.role : undefined,
    };

    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.from('audit_logs').insert([
          {
            user_id: user?.user_id,
            activity,
            description,
            device_info: userAgent,
          },
        ]);
      } catch (err) {
        console.warn('Failed to insert audit log to Supabase:', err);
      }
    }

    return localDB.addAuditLog(newLogData);
  }

  public static getLogs(): AuditLog[] {
    return localDB.getAuditLogs();
  }

  public static async deleteLog(id: string): Promise<boolean> {
    localDB.deleteAuditLog(id);
    try {
      await fetch(`/api/audit/${id}`, { method: 'DELETE' });
    } catch {}
    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase.from('audit_logs').delete().eq('id', id);
      } catch {}
    }
    return true;
  }

  public static async clearLogs(): Promise<boolean> {
    localDB.clearAuditLogs();
    try {
      await fetch('/api/audit', { method: 'DELETE' });
    } catch {}
    if (isLiveSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('audit_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {}
    }
    return true;
  }
}
