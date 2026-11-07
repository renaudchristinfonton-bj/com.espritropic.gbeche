/* eslint-disable import/first */
/**
 * Tests sécurité : le stockage sûr est mocké en mémoire et expo-crypto
 * est remplacé par le WebCrypto de Node (mêmes SHA-256 et octets aléatoires).
 */
import { webcrypto as mockWebcrypto } from 'node:crypto';

jest.mock('../secureStorage', () => {
  const mockStore = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
  };
});

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, data: string) => {
    const bytes = await mockWebcrypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(data),
    );
    return Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
  getRandomBytesAsync: async (length: number) =>
    new Uint8Array(mockWebcrypto.getRandomValues(new Uint8Array(length))),
  randomUUID: () => mockWebcrypto.randomUUID(),
}));

// Évite toute dépendance SQLite dans ce test.
jest.mock('../../db/settings', () => ({
  SETTING_KEYS: { biometricEnabled: 'biometric_enabled' },
  setSettingBool: jest.fn().mockResolvedValue(undefined),
}));

import {
  clearPin,
  getBiometricAvailability,
  hasPin,
  requestBiometric,
  setPin,
  verifyPin,
} from '../security';

describe('cycle de vie du PIN', () => {
  test('refuse un PIN qui n\'est pas exactement 4 chiffres', async () => {
    await expect(setPin('12A4')).rejects.toThrow();
    await expect(setPin('123')).rejects.toThrow();
    await expect(setPin('12345')).rejects.toThrow();
  });

  test('setPin puis verifyPin accepte le bon code et rejette les autres', async () => {
    await setPin('4821');
    expect(await hasPin()).toBe(true);
    expect(await verifyPin('4821')).toBe(true);
    expect(await verifyPin('0000')).toBe(false);
  });

  test('le PIN n\'est jamais stocké en clair', async () => {
    await setPin('7777');
    const { getItemAsync } = jest.requireMock('../secureStorage');
    const stored: string = await getItemAsync('gbeche_pin_hash');
    expect(stored).not.toContain('7777');
    expect(stored.split(':')).toHaveLength(2); // sel:hash
  });

  test('clearPin supprime le secret', async () => {
    await clearPin();
    expect(await hasPin()).toBe(false);
    expect(await verifyPin('7777')).toBe(false);
  });
});

describe('biométrie (stub navigateur / environnement sans capteur)', () => {
  test('aucun matériel → indisponible, jamais de tentative d\'authentification', async () => {
    const availability = await getBiometricAvailability();
    expect(availability.available).toBe(false);
    expect(availability.kind).toBe('none');
    expect(await requestBiometric()).toBe(false);
  });
});
