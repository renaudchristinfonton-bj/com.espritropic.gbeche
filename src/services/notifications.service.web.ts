/**
 * Notifications système — implémentation web via la Notification API.
 * Fonctionne sur HTTPS (Netlify) et localhost, 100 % local, sans serveur
 * push. Les notifications ne se déclenchent que tant que l'onglet est
 * ouvert ; le centre de rappels in-app reste le filet de sécurité.
 */
import type { NotificationPermissionStatus } from './notifications.service';

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function presentNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch (error) {
    console.warn('[notifications.web]', error);
  }
}
