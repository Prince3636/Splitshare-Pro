/**
 * Web Notification API & Push Alert Services
 * Provides instant real-time browser/PWA notifications for bills, approvals, and settlements.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Failed to request notification permission', err);
    return false;
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: any;
}

export function sendLocalPushNotification({ title, body, tag, icon, data }: NotificationPayload): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Mobile tactile feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    const n = new Notification(title, {
      body,
      tag: tag || 'splitshare-alert',
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      data,
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      try {
        n.close();
      } catch {}
    }, 6000);

    return true;
  } catch (err) {
    console.warn('Could not display local notification', err);
    return false;
  }
}
