import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'gbeche_master_key';

/**
 * Récupère ou génère une clé de chiffrement unique pour l'appareil.
 */
export async function getOrCreateMasterKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  if (!key) {
    // Génère une clé aléatoire de 256 bits
    key = CryptoJS.lib.WordArray.random(32).toString();
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, key);
  }
  return key;
}

/**
 * Chiffre une chaîne de caractères en AES-256
 */
export async function encryptData(data: string): Promise<string> {
  const key = await getOrCreateMasterKey();
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Déchiffre une chaîne de caractères AES-256
 */
export async function decryptData(ciphertext: string): Promise<string> {
  const key = await getOrCreateMasterKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}