// src/services/notifications.ts
// Gestion des notifications locales

import * as Notifications from 'expo-notifications';

export async function scheduleHourlyNotifications() {
  try {
    // À implémenter: Créer des tâches horaires
    console.log('Notifications planifiées');
  } catch (error) {
    console.error('Erreur lors de la planification:', error);
  }
}

export async function sendNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Immédiatement
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de notification:', error);
  }
}

export function listenForNotifications(callback: (notification: any) => void) {
  const subscription = Notifications.addNotificationResponseListener(callback);
  return subscription;
}