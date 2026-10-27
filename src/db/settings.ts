/**
 * GBECHE — Préférences applicatives (table settings, clé/valeur typé).
 * Un cache mémoire est chargé au boot pour permettre des lectures synchrones
 * dans les providers (thème, langue…). Les écritures restent async + SQLite.
 */

import { all, first, run } from './client';

export const SETTING_KEYS = {
  onboardingDone: 'onboarding_done',
  tutorialDone: 'tutorial_done',
  warriorName: 'warrior_name',
  themeMode: 'theme_mode',
  language: 'language',
  notificationsEnabled: 'notifications_enabled',
  biometricEnabled: 'biometric_enabled',
  seeded: 'seeded',
  notifiedInstanceIds: 'notified_instance_ids',
  // Planification des notifications locales : map instanceId → { nid, at }.
  scheduledReminders: 'scheduled_reminders',
  // Astuces contextuelles après 5 s d'inactivité (IdleCoach).
  idleCoachEnabled: 'idle_coach_enabled',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const cache = new Map<string, string>();

export async function loadSettingsCache(): Promise<void> {
  const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings;');
  cache.clear();
  rows.forEach((row) => cache.set(row.key, row.value));
}

export function getSetting(key: SettingKey | string): string | undefined {
  return cache.get(key);
}

export function getSettingBool(key: SettingKey | string, defaultValue = false): boolean {
  const value = cache.get(key);
  if (value === undefined) return defaultValue;
  return value === '1' || value === 'true';
}

export async function setSetting(key: SettingKey | string, value: string): Promise<void> {
  cache.set(key, value);
  await run(
    `INSERT INTO settings(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}

export async function setSettingBool(key: SettingKey | string, value: boolean): Promise<void> {
  await setSetting(key, value ? '1' : '0');
}

export async function clearSettingsCache(): Promise<void> {
  cache.clear();
  await first('DELETE FROM settings;');
}
