/**
 * GBECHE — Sauvegarde automatique locale (natif iOS / Android).
 *
 * Pourquoi : la base SQLite vit dans le dossier Documents de l'app, qui
 * survit aux mises à jour (store comme OTA) — seule la désinstallation
 * l'efface. En plus, à chaque lancement et chaque passage en arrière-plan,
 * on écrit un instantané JSON dans ce même dossier Documents, avec une
 * rotation à 3 fichiers. Si une migration future ou une corruption devait
 * poser problème, l'utilisateur peut restaurer depuis l'écran Données.
 *
 * Aucun réseau : tout reste sur l'appareil.
 */
import * as FileSystem from 'expo-file-system/legacy';

import { exportBackup, importBackup, type BackupFile } from './importExport.service';
import { backupTimestamp, selectBackupsToPrune } from '../../utils/backupRotation';

const BACKUP_DIR = `${FileSystem.documentDirectory ?? ''}GBECHE/sauvegardes/`;
const FILE_PREFIX = 'gbeche-auto-';
const KEEP_COUNT = 3;

export interface AutoBackupInfo {
  uri: string;
  name: string;
  modifiedAt: number; // epoch ms
  size: number; // octets
}

async function ensureDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

async function pruneOldBackups(): Promise<void> {
  const names = await FileSystem.readDirectoryAsync(BACKUP_DIR);
  const metas = await Promise.all(
    names
      .filter((name) => name.startsWith(FILE_PREFIX))
      .map(async (name) => {
        const info = await FileSystem.getInfoAsync(BACKUP_DIR + name);
        return {
          name,
          modifiedAt: info.exists ? info.modificationTime ?? 0 : 0,
        };
      }),
  );
  for (const name of selectBackupsToPrune(metas, KEEP_COUNT)) {
    await FileSystem.deleteAsync(BACKUP_DIR + name, { idempotent: true });
  }
}

/**
 * Écrit un instantané de toute la base (et des secrets) dans le dossier
 * Documents. Ne lève jamais : une sauvegarde ratée ne doit pas planter le boot.
 * @returns true si l'instantané a été écrit.
 */
export async function writeAutoBackup(): Promise<boolean> {
  try {
    await ensureDirectory();
    const backup = await exportBackup();
    const uri = `${BACKUP_DIR}${FILE_PREFIX}${backupTimestamp()}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await pruneOldBackups();
    return true;
  } catch (error) {
    console.warn('[autoBackup] échec de la sauvegarde automatique', error);
    return false;
  }
}

/** Métadonnées de l'instantané le plus récent, ou null si absent. */
export async function getLatestAutoBackup(): Promise<AutoBackupInfo | null> {
  try {
    const info = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!info.exists) return null;
    const names = (await FileSystem.readDirectoryAsync(BACKUP_DIR)).filter((name) =>
      name.startsWith(FILE_PREFIX),
    );
    if (names.length === 0) return null;

    const detailed = await Promise.all(
      names.map(async (name) => {
        const fileInfo = await FileSystem.getInfoAsync(BACKUP_DIR + name);
        return {
          uri: BACKUP_DIR + name,
          name,
          modifiedAt: fileInfo.exists ? fileInfo.modificationTime ?? 0 : 0,
          size: fileInfo.exists ? fileInfo.size ?? 0 : 0,
        };
      }),
    );
    detailed.sort((a, b) => b.modifiedAt - a.modifiedAt);
    return detailed[0] ?? null;
  } catch (error) {
    console.warn('[autoBackup] lecture impossible', error);
    return null;
  }
}

/** Charge et parse l'instantané le plus récent (pour restauration). */
export async function readLatestAutoBackup(): Promise<BackupFile | null> {
  const latest = await getLatestAutoBackup();
  if (!latest) return null;
  const raw = await FileSystem.readAsStringAsync(latest.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return JSON.parse(raw) as BackupFile;
}

/** Restaure l'instantané le plus récent dans la base courante. */
export async function restoreLatestAutoBackup(): Promise<void> {
  const backup = await readLatestAutoBackup();
  if (!backup) throw new Error('Aucune sauvegarde automatique trouvée.');
  await importBackup(backup);
}
