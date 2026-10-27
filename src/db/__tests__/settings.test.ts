/* eslint-disable import/first */
/**
 * Tests du cache de préférences. Le client SQLite est remplacé par un
 * petit dictionnaire en mémoire qui respecte la sémantique clé/valeur.
 */
const mockStore = new Map<string, string>();

jest.mock('../client', () => ({
  all: jest.fn(async () =>
    Array.from(mockStore.entries()).map(([key, value]) => ({ key, value })),
  ),
  first: jest.fn(),
  run: jest.fn(async (_sql: string, params: unknown[] = []) => {
    const [key, value] = params as [string, string];
    mockStore.set(key, value);
    return { lastInsertRowId: 0, changes: 1 };
  }),
  newId: jest.fn(() => 'test-id'),
}));

import {
  getSetting,
  getSettingBool,
  loadSettingsCache,
  setSetting,
  setSettingBool,
  SETTING_KEYS,
} from '../settings';

beforeEach(() => {
  mockStore.clear();
});

describe('cache settings', () => {
  test('valeur absente → défaut fourni', async () => {
    await loadSettingsCache();
    expect(getSetting(SETTING_KEYS.onboardingDone)).toBeUndefined();
    expect(getSettingBool(SETTING_KEYS.onboardingDone, false)).toBe(false);
    expect(getSettingBool(SETTING_KEYS.onboardingDone, true)).toBe(true);
  });

  test('setSettingBool écrit en base et met le cache à jour immédiatement', async () => {
    await setSettingBool(SETTING_KEYS.onboardingDone, true);
    expect(mockStore.get(SETTING_KEYS.onboardingDone)).toBe('1');
    expect(getSettingBool(SETTING_KEYS.onboardingDone)).toBe(true);

    await setSettingBool(SETTING_KEYS.onboardingDone, false);
    expect(mockStore.get(SETTING_KEYS.onboardingDone)).toBe('0');
    expect(getSettingBool(SETTING_KEYS.onboardingDone)).toBe(false);
  });

  test('les chaînes "true" sont aussi lues comme booléen vrai', async () => {
    await setSetting(SETTING_KEYS.themeMode, 'dark');
    await loadSettingsCache();
    expect(getSetting(SETTING_KEYS.themeMode)).toBe('dark');

    mockStore.set('notifications_enabled', 'true');
    await loadSettingsCache();
    expect(getSettingBool(SETTING_KEYS.notificationsEnabled)).toBe(true);
  });
});
