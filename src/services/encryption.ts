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
  if (!data) return '';
  try {
    const key = await getOrCreateMasterKey();
    const ciphertext = CryptoJS.AES.encrypt(data, key).toString();
    return ciphertext;
  } catch (error) {
    console.error('Erreur de chiffrement:', error);
    throw new Error('Échec du chiffrement des données');
  }
}

/**
 * Déchiffre une chaîne de caractères AES-256
 */
export async function decryptData(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';
  try {
    const key = await getOrCreateMasterKey();
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    
    // On tente de convertir en UTF-8
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // Si le résultat est vide mais que l'entrée ne l'était pas, le déchiffrement a échoué
    if (!originalText && ciphertext) {
      throw new Error('Déchiffrement impossible : Clé incorrecte ou données altérées');
    }
    
    return originalText;
  } catch (error) {
    console.error('[EncryptionService] Decrypt Error:', error);
    return ''; 
  }
}