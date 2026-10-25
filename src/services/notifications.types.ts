/**
 * Types partagés par les implémentations plateforme de notifications
 * (notifications.service.ts natif / notifications.service.web.ts web).
 */
export type NotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';
