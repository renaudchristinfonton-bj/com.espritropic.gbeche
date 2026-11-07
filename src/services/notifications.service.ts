/**
 * Notifications système — implémentation native (iOS / Android) via
 * expo-notifications. Uniquement des notifications LOCALES programmées :
 * aucun serveur push, aucune clé FCM n'est requise (FCM v1 ne concerne
 * que les notifications distantes). Le fichier `.web.ts` utilise la
 * Notification API du navigateur.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { NotificationPermissionStatus } from './notifications.types';

export type { NotificationPermissionStatus } from './notifications.types';

const ANDROID_CHANNEL_ID = 'gbeche-reminders';

// Les notifications doivent s'afficher même quand l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Rappels de missions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00E5FF',
  });
}

function mapPermission(
  status: Notifications.PermissionResponse,
): NotificationPermissionStatus {
  if (status.granted) return 'granted';
  if (!status.canAskAgain || status.status === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }
  return 'default';
}

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  try {
    const status = await Notifications.getPermissionsAsync();
    return mapPermission(status);
  } catch (error) {
    console.warn('[notifications] getPermissions', error);
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (error) {
    console.warn('[notifications] requestPermissions', error);
    return false;
  }
}

/** Affiche immédiatement une notification (utilisé par les rappels in-app). */
export async function presentNotification(title: string, body: string): Promise<void> {
  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      // trigger null = présentation immédiate.
      trigger: null,
    });
  } catch (error) {
    console.warn('[notifications] present', error);
  }
}

/**
 * Programme une notification locale à une date précise.
 * @returns identifiant de notification système (à conserver pour l'annuler).
 */
export async function scheduleReminder(
  title: string,
  body: string,
  date: Date,
): Promise<string> {
  await ensureAndroidChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

export async function cancelScheduledReminder(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('[notifications] cancel', error);
  }
}

export async function cancelAllScheduledReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[notifications] cancelAll', error);
  }
}
