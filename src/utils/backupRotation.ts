/**
 * GBECHE — Rotation des sauvegardes automatiques locales.
 * Logique pure (aucune dépendance native) pour rester testable :
 * on conserve les N instantanés les plus récents, les plus vieux
 * sont éliminés.
 */

export interface BackupFileMeta {
  name: string;
  /** epoch ms de dernière modification */
  modifiedAt: number;
}

const AUTO_BACKUP_PATTERN = /^gbeche-auto-\d{8}-\d{6}\.json$/;

/**
 * @returns noms des fichiers à supprimer (tout sauf les `keep` plus récents).
 */
export function selectBackupsToPrune(
  files: BackupFileMeta[],
  keep = 3,
): string[] {
  const snapshots = files
    .filter((file) => AUTO_BACKUP_PATTERN.test(file.name))
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
  // Suppression du plus ancien au plus récent : ordre ascendant déterministe.
  return snapshots
    .slice(keep)
    .map((file) => file.name)
    .reverse();
}

/** Horodatage compact YYYYMMDD-HHmmss pour le nom d'un instantané. */
export function backupTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
