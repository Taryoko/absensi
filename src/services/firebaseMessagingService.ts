import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { localDB } from './store';
import { Profile } from '../types';

export interface PushNotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'DEVICE_APPROVED' | 'DEVICE_REJECTED' | 'ATTENDANCE_DELETED' | 'ATTENDANCE_STATUS' | 'GENERAL';
  status: 'UNREAD' | 'READ';
  created_at: string;
  data?: Record<string, any>;
}

// Default Firebase Configuration (can be overridden via environment or settings)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoDummyKeyForAppletBuild2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'absensi-guru-smk.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'absensi-guru-smk',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'absensi-guru-smk.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1029384756:web:abcdef1234567890',
};

const STORAGE_KEY_NOTIFICATIONS = 'absensi_notifications_v1';
const STORAGE_KEY_FCM_TOKEN = 'absensi_fcm_token_v1';

class FirebaseMessagingService {
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private isMessagingSupported = false;

  constructor() {
    this.initFirebase();
  }

  private async initFirebase() {
    try {
      if (!getApps().length) {
        this.app = initializeApp(DEFAULT_FIREBASE_CONFIG);
      } else {
        this.app = getApps()[0];
      }

      const supported = typeof window !== 'undefined' && 'Notification' in window && (await isSupported());
      this.isMessagingSupported = supported;

      if (supported && this.app) {
        this.messaging = getMessaging(this.app);
        onMessage(this.messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);
          if (payload.notification) {
            this.showLocalBrowserNotification(
              payload.notification.title || 'Pemberitahuan Presensi',
              payload.notification.body || ''
            );
          }
        });
      }
    } catch (err) {
      console.warn('[FCM] Firebase initialization note (using Web Push Notification fallback):', err);
    }
  }

  /**
   * Request notification permission from the teacher's browser and retrieve FCM Token
   */
  public async requestPushPermission(user?: Profile | null): Promise<string | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[FCM] Notifications not supported in this browser environment.');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Push Notification permission was not granted:', permission);
        return null;
      }

      let fcmToken: string | null = localStorage.getItem(STORAGE_KEY_FCM_TOKEN);

      if (!fcmToken && this.messaging) {
        try {
          fcmToken = await getToken(this.messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });
        } catch (tokenErr) {
          console.warn('[FCM] Token generation fallback:', tokenErr);
          fcmToken = `fcm-local-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
      }

      if (!fcmToken) {
        fcmToken = `fcm-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      localStorage.setItem(STORAGE_KEY_FCM_TOKEN, fcmToken);

      // Save token to user profile if available
      if (user) {
        const profile = localDB.getProfileByUserId(user.user_id);
        if (profile) {
          (profile as any).fcm_token = fcmToken;
          localDB.saveProfile(profile);
        }
      }

      return fcmToken;
    } catch (err) {
      console.warn('[FCM] Error requesting push permission:', err);
      return null;
    }
  }

  /**
   * Display a native browser notification if granted
   */
  public showLocalBrowserNotification(title: string, body: string, icon?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
          badge: icon || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
        });
      } catch {
        // In iframe or service worker contexts, new Notification might require service worker
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, { body });
            });
          }
        } catch {}
      }
    }
  }

  /**
   * Sends a push notification to a teacher when their device registration request is approved or rejected
   */
  public async sendAttendanceRequestNotification(params: {
    teacherUserId: string;
    status: 'APPROVED' | 'REJECTED' | 'BLOCKED';
    deviceName: string;
    reason?: string;
  }): Promise<PushNotificationItem> {
    const { teacherUserId, status, deviceName, reason } = params;

    let title = 'Persetujuan Presensi: Perangkat Disetujui';
    let body = `Perangkat "${deviceName}" Anda telah disetujui Admin. Anda sekarang dapat melakukan absensi.`;
    let type: PushNotificationItem['type'] = 'DEVICE_APPROVED';

    if (status === 'REJECTED') {
      title = 'Persetujuan Presensi: Permintaan Ditolak';
      body = `Pendaftaran perangkat "${deviceName}" ditolak Admin: ${reason || 'Tidak memenuhi kriteria sekolah.'}`;
      type = 'DEVICE_REJECTED';
    } else if (status === 'BLOCKED') {
      title = 'Peringatan: Perangkat Diblokir';
      body = `Perangkat "${deviceName}" Anda telah diblokir: ${reason || 'Indikasi pelanggaran absensi.'}`;
      type = 'DEVICE_REJECTED';
    }

    return this.createAndDispatchNotification({
      user_id: teacherUserId,
      title,
      body,
      type,
      data: { deviceName, status, reason },
    });
  }

  /**
   * Sends a push notification to a teacher when they submit leave/sick permit
   */
  public async sendPermitNotification(params: {
    teacherUserId: string;
    type: 'izin' | 'sakit';
    alasan: string;
  }): Promise<PushNotificationItem> {
    const { teacherUserId, type, alasan } = params;
    const title = type === 'sakit' ? 'Pengajuan Sakit Tercatat' : 'Pengajuan Izin Tercatat';
    const body = `Pengajuan ${type === 'sakit' ? 'Sakit (Surat Dokter)' : 'Izin Resmi'} Anda berhasil disimpan dalam sistem dengan dispensasi lokasi: "${alasan}".`;

    return this.createAndDispatchNotification({
      user_id: teacherUserId,
      title,
      body,
      type: 'DEVICE_APPROVED',
      data: { type, alasan },
    });
  }

  /**
   * Sends a push notification to a teacher when an attendance record is deleted or adjusted
   */
  public async sendAttendanceAdjustmentNotification(params: {
    teacherUserId: string;
    action: 'DELETED' | 'RESET';
    type: 'check_in' | 'check_out' | 'izin' | 'sakit';
    details?: string;
  }): Promise<PushNotificationItem> {
    const { teacherUserId, action, type, details } = params;
    const tipeText = type === 'check_in' ? 'Masuk' : type === 'check_out' ? 'Pulang' : type === 'sakit' ? 'Sakit' : 'Izin';

    const title = 'Pemberitahuan Presensi Guru';
    const body = `Riwayat absensi ${tipeText} Anda telah diperbarui/dihapus oleh Admin. Anda dapat melakukan absensi ulang sekarang jika diperlukan. ${details || ''}`;

    return this.createAndDispatchNotification({
      user_id: teacherUserId,
      title,
      body,
      type: 'ATTENDANCE_DELETED',
      data: { action, type, details },
    });
  }

  /**
   * Internal helper to create, persist, and broadcast notification
   */
  private async createAndDispatchNotification(item: {
    user_id: string;
    title: string;
    body: string;
    type: PushNotificationItem['type'];
    data?: Record<string, any>;
  }): Promise<PushNotificationItem> {
    const notification: PushNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: item.user_id,
      title: item.title,
      body: item.body,
      type: item.type,
      status: 'UNREAD',
      created_at: new Date().toISOString(),
      data: item.data,
    };

    // 1. Save to local storage
    const list = this.getNotifications();
    list.unshift(notification);
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list.slice(0, 100)));
    } catch {}

    // 2. Trigger browser native notification if permitted
    this.showLocalBrowserNotification(notification.title, notification.body);

    // 3. Dispatch in-app notification event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('absensi_push_notification', { detail: notification })
      );
    }

    // 4. Save to server backend
    try {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      }).catch(() => {});
    } catch {}

    return notification;
  }

  /**
   * Get all notifications for user
   */
  public getNotifications(userId?: string): PushNotificationItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      const list: PushNotificationItem[] = raw ? JSON.parse(raw) : [];
      if (userId) {
        return list.filter((n) => n.user_id === userId);
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  public markAsRead(id: string) {
    const list = this.getNotifications();
    const target = list.find((n) => n.id === id);
    if (target) {
      target.status = 'READ';
      try {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
      } catch {}
      window.dispatchEvent(new CustomEvent('absensi_push_notification_read'));
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  public markAllAsRead(userId: string) {
    const list = this.getNotifications();
    list.forEach((n) => {
      if (n.user_id === userId) {
        n.status = 'READ';
      }
    });
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
    } catch {}
    window.dispatchEvent(new CustomEvent('absensi_push_notification_read'));
  }
}

export const FCMNotificationService = new FirebaseMessagingService();
