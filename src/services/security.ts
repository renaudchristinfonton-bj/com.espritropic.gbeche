/**
 * GBECHE — Sécurité : PIN haché + biométrie.
 * Le PIN en clair n'est jamais persisté. Sel aléatoire + SHA-256,
 * stockage sûr : expo-secure-store sur mobile (Keystore/Keychain),
 * localStorage navigateur sur web via l'abstraction secureStorage.
 */

import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from './secureStorage';

import { setSettingBool, SETTING_KEYS } from '../db/settings';

const PIN_HASH_KEY = 'gbeche_pin_hash';
const MASTER_KEY_KEY = 'gbeche_master_key';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function randomHex(bytes: number): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(bytes));
}

// ─── PIN ──────────────────────────────────────────────────
export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('Le PIN doit contenir exactement 4 chiffres.');
  }
  const salt = await randomHex(16);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
  await SecureStore.setItemAsync(PIN_HASH_KEY, `${salt}:${hash}`, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!stored) return false;
  const [salt, expectedHash] = stored.split(':');
  const attempt = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
  return attempt === expectedHash;
}

export async function hasPin(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(PIN_HASH_KEY));
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await setSettingBool(SETTING_KEYS.biometricEnabled, false);
}

// ─── Clé maître (réservée au chiffrement Phase 2) ─────────
export async function ensureMasterKey(): Promise<void> {
  const existing = await SecureStore.getItemAsync(MASTER_KEY_KEY);
  if (!existing) {
    const key = await randomHex(32);
    await SecureStore.setItemAsync(MASTER_KEY_KEY, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

// ─── Biométrie ────────────────────────────────────────────
export interface BiometricAvailability {
  available: boolean;
  enrolled: boolean;
  kind: 'faceId' | 'fingerprint' | 'none';
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { available: false, enrolled: false, kind: 'none' };
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return { available: true, enrolled: false, kind: 'none' };
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const kind = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  )
    ? 'faceId'
    : 'fingerprint';
  return { available: true, enrolled: true, kind };
}

export async function requestBiometric(
  reason = 'Déverrouille ton Quartier Général',
): Promise<boolean> {
  const status = await getBiometricAvailability();
  if (!status.available || !status.enrolled) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Utiliser le PIN',
      cancelLabel: 'Annuler',
    });
    return result.success;
  } catch (error) {
    console.warn('[security] biométrie', error);
    return false;
  }
}

export async function wipeAllSecrets(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(MASTER_KEY_KEY),
  ]);
}
