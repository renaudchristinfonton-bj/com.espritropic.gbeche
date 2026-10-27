/**
 * Stockage sécurisé — implémentation native via expo-secure-store
 * (Keychain iOS / Keystore Android). Le fichier `.web.ts` porte le fallback
 * navigateur (localStorage), faute d'équivalent matériel sur le web.
 * Ré-exports explicits : même surface que la version web.
 */
import * as ExpoSecureStore from 'expo-secure-store';

export const setItemAsync = ExpoSecureStore.setItemAsync;
export const getItemAsync = ExpoSecureStore.getItemAsync;
export const deleteItemAsync = ExpoSecureStore.deleteItemAsync;
export const isAvailableAsync = ExpoSecureStore.isAvailableAsync;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY =
  ExpoSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
