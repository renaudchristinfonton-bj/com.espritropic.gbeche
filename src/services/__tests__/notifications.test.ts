/**
 * Test de chargement de l'implémentation native de notifications.
 * jest-expo fournit un mock d'expo-notifications : l'essentiel est que
 * la surface de service soit exposée et ne lève pas d'erreur.
 */
import {
  cancelAllScheduledReminders,
  cancelScheduledReminder,
  getNotificationPermission,
  presentNotification,
  requestNotificationPermission,
  scheduleReminder,
} from '../notifications.service';

test('surface native complète exposée et callable sous mock', async () => {
  expect(typeof getNotificationPermission).toBe('function');
  expect(typeof requestNotificationPermission).toBe('function');
  expect(typeof presentNotification).toBe('function');
  expect(typeof scheduleReminder).toBe('function');
  expect(typeof cancelScheduledReminder).toBe('function');
  expect(typeof cancelAllScheduledReminders).toBe('function');

  const permission = await getNotificationPermission();
  expect(['granted', 'denied', 'default', 'unsupported']).toContain(permission);
  await expect(presentNotification('Titre', 'Corps')).resolves.toBeUndefined();
  await expect(scheduleReminder('Titre', 'Corps', new Date())).resolves.toBeUndefined();
  await expect(cancelScheduledReminder('x')).resolves.toBeUndefined();
  await expect(cancelAllScheduledReminders()).resolves.toBeUndefined();
});
