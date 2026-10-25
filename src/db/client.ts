/**
 * GBECHE — Client SQLite (expo-sqlite).
 * Responsabilités : ouverture de la base, migrations, émetteur de
 * changements pour les hooks réactifs, primitives d'accès SQL.
 */

import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';

const DB_NAME = 'GBECHE.db';

let db: SQLite.SQLiteDatabase | null = null;

// ─── Émetteur de changements ──────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[DB] listener error', error);
    }
  });
}

// ─── Cycle de vie ─────────────────────────────────────────
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const database = await SQLite.openDatabaseAsync(DB_NAME);
  // Le WAL est un mode fichier natif : le moteur web wa-sqlite (OPFS) ne
  // l'expose pas. foreign_keys est standard et reste activé partout.
  if (Platform.OS !== 'web') {
    await database.execAsync('PRAGMA journal_mode = WAL;');
  }
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = versionRow?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await database.withTransactionAsync(async () => {
        await database.execAsync(migration.sql);
        await database.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      console.log(`[DB] Migration ${migration.version} (${migration.name}) appliquée`);
    }
  }

  const finalVersion = (
    await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
  )?.user_version;

  if (finalVersion !== LATEST_SCHEMA_VERSION) {
    throw new Error(
      `[DB] Version de schéma inattendue : ${finalVersion}, attendu ${LATEST_SCHEMA_VERSION}`,
    );
  }

  db = database;
  console.log('[DB] GBECHE.db prête — schéma v' + LATEST_SCHEMA_VERSION);
  return database;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('[DB] Base non initialisée. Appeler openDatabase() au démarrage.');
  }
  return db;
}

/** Réinitialisation complète (option "Tout effacer" des réglages). */
export async function resetDatabase(): Promise<void> {
  const database = getDb();
  await database.execAsync(`
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS health_logs;
    DROP TABLE IF EXISTS mood_logs;
    DROP TABLE IF EXISTS time_logs;
    DROP TABLE IF EXISTS gamification;
    DROP TABLE IF EXISTS budgets;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS adversaries;
    DROP TABLE IF EXISTS adversary_templates;
    DROP TABLE IF EXISTS battles;
    DROP TABLE IF EXISTS wars;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS app_meta;
    PRAGMA user_version = 0;
  `);
  db = null;
  await openDatabase();
  notifyChange();
}

// ─── Sauvegarde / restauration génériques ─────────────────
// Ordre parent → enfant : l'insertion respecte les clés étrangères,
// la suppression se fait en ordre inverse.
export const BACKUP_TABLES = [
  'settings',
  'wars',
  'accounts',
  'categories',
  'battles',
  'adversary_templates',
  'adversaries',
  'transactions',
  'budgets',
  'gamification',
] as const;

export type TableName = (typeof BACKUP_TABLES)[number];
export type BackupPayload = Partial<Record<TableName, Record<string, unknown>[]>>;

export async function exportTables(): Promise<BackupPayload> {
  const database = getDb();
  const payload: BackupPayload = {};
  for (const table of BACKUP_TABLES) {
    payload[table] = await database.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table};`);
  }
  return payload;
}

export async function importTables(payload: BackupPayload): Promise<void> {
  const database = getDb();
  await database.withTransactionAsync(async () => {
    // Suppression enfant → parent.
    for (const table of [...BACKUP_TABLES].reverse()) {
      await database.execAsync(`DELETE FROM ${table};`);
    }
    // Réinsertion parent → enfant, en reconstruisant les colonnes depuis
    // les lignes elles-mêmes (le schéma est donc toujours synchronisé).
    for (const table of BACKUP_TABLES) {
      const rows = payload[table] ?? [];
      for (const row of rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        await database.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`,
          columns.map((column) => row[column]) as SQLite.SQLiteBindParams,
        );
      }
    }
  });
  notifyChange();
}

// ─── Primitives d'accès ───────────────────────────────────
export async function all<T>(sql: string, params: SQLite.SQLiteBindParams = []): Promise<T[]> {
  return getDb().getAllAsync<T>(sql, params);
}

export async function first<T>(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<T | null> {
  return getDb().getFirstAsync<T>(sql, params);
}

/** INSERT/UPDATE/DELETE qui notifie automatiquement les écrans. */
export async function run(
  sql: string,
  params: SQLite.SQLiteBindParams = [],
): Promise<SQLite.SQLiteRunResult> {
  const result = await getDb().runAsync(sql, params);
  notifyChange();
  return result;
}

/** Transaction multi-écritures : une seule notification à la fin. */
export async function transaction(task: () => Promise<void>): Promise<void> {
  await getDb().withTransactionAsync(task);
  notifyChange();
}

export function newId(): string {
  return Crypto.randomUUID();
}
