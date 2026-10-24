/**
 * Notifications système — implémentation native par défaut.
 * Les notifications push en arrière-plan nécessitent une clé FCM v1
 * (Phase 2, voir docs/BUILD.md) : en attendant, le mobile s'appuie sur
 * les rappels in-app (centre de notifications de l'app) présentés par
 * NotificationHost. Le fichier `.web.ts` utilise la Notification API.
 */
export type NotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  return 'unsupported';
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function presentNotification(_title: string, _body: string): Promise<void> {
  // Les rappels in-app sont gérés par NotificationHost, indépendamment.
}
