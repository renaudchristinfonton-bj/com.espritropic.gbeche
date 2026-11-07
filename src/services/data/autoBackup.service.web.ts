/**
 * GBECHE — Sauvegarde automatique, variante web.
 *
 * Sur navigateur, on ne peut pas écrire silencieusement un fichier :
 * un téléchargement exigerait un geste utilisateur. La persistance est
 * déjà garantie par SQLite dans OPFS (même origine, survit aux mises en
 * ligne du site), et la sauvegarde JSON manuelle reste disponible sur
 * l'écran Données. Les fonctions sont donc des no-op explicites.
 */
import type { AutoBackupInfo } from './autoBackup.service';

export async function writeAutoBackup(): Promise<boolean> {
  return false;
}

export async function getLatestAutoBackup(): Promise<AutoBackupInfo | null> {
  return null;
}

export async function restoreLatestAutoBackup(): Promise<void> {}
