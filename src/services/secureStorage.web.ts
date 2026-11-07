/**
 * Stockage sécurisé — fallback web basé sur localStorage.
 * Le navigateur n'offre pas de Keystore/Keychain : les secrets (hash du PIN,
 * clé maître) restent propres au profil navigateur, en local, sans serveur.
 * Même surface qu'expo-secure-store pour le code métier.
 */

const PREFIX = 'gbeche.secure.';

interface SetOptions {
  keychainAccessible?: number | string;
  requireAuthentication?: boolean;
  [key: string]: unknown;
}

export async function setItemAsync(
  key: string,
  value: string,
  _options?: SetOptions,
): Promise<void> {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch (error) {
    console.warn('[secureStorage.web] setItemAsync', error);
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch (error) {
    console.warn('[secureStorage.web] getItemAsync', error);
    return null;
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.warn('[secureStorage.web] deleteItemAsync', error);
  }
}

export async function isAvailableAsync(): Promise<boolean> {
  return typeof localStorage !== 'undefined';
}

/**
 * Sans équivalent navigateur : l'option est acceptée pour compatibilité
 * d'appel mais n'a aucun effet (localStorage n'est pas verrouillable).
 */
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
