/**
 * Détection de la persistance web.
 * Le moteur SQLite d'expo-sqlite s'appuie sur OPFS avec
 * createSyncAccessHandle (Safari 18+ / Chrome / Edge / Firefox récents).
 * Sans ce support, les données ne tiendraient qu'en mémoire : on prévient
 * l'utilisateur pour qu'il bascule sur un navigateur compatible ou exporte
 * une sauvegarde JSON. Sur mobile natif, la persistance fichier est garantie.
 */
import { Platform } from 'react-native';

export function isPersistentStorageSupported(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return false;
  // La lib DOM de TS n'index pas encore ce membre de manière stable :
  // contrôle d'existence à l'exécution sur le prototype.
  const handle = FileSystemFileHandle?.prototype as unknown as
    | { createSyncAccessHandle?: unknown }
    | undefined;
  return typeof handle?.createSyncAccessHandle === 'function';
}
