/**
 * Garde-fou anti-perte de données : les migrations de schéma doivent
 * être additives et idempotentes. Aucune migration publiée ne peut
 * contenir de DROP, DELETE ou TRUNCATE — la réinitialisation complète
 * reste un acte explicite de l'utilisateur (resetDatabase).
 */
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '../migrations';

const FORBIDDEN = [
  /\bDROP\s+(TABLE|DATABASE|COLUMN|INDEX)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b.*\bDROP\b/i,
];

describe('migrations SQLite', () => {
  test('sont numérotées de façon séquentielle sans doublon', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toEqual([...new Set(versions)].sort((a, b) => a - b));
    expect(versions).toHaveLength(new Set(versions).size);
    expect(LATEST_SCHEMA_VERSION).toBe(versions[versions.length - 1]);
  });

  test.each(MIGRATIONS)('la migration v$version ($name) est non destructive', (migration) => {
    for (const pattern of FORBIDDEN) {
      expect(migration.sql).not.toMatch(pattern);
    }
  });

  test('chaque création de table est idempotente (IF NOT EXISTS)', () => {
    for (const migration of MIGRATIONS) {
      const creates = migration.sql.match(/CREATE TABLE/gi) ?? [];
      const guarded = migration.sql.match(/CREATE TABLE IF NOT EXISTS/gi) ?? [];
      expect(creates.length).toBe(guarded.length);
    }
  });

  test('une migration couvre la table des catégories personnalisées', () => {
    const categoriesMigration = MIGRATIONS.find((m) =>
      /CREATE TABLE IF NOT EXISTS categories/.test(m.sql),
    );
    expect(categoriesMigration).toBeDefined();
  });

  test('la dernière migration est additive (ALTER TABLE ADD COLUMN sans DROP)', () => {
    const latest = MIGRATIONS[MIGRATIONS.length - 1];
    expect(latest.sql).toMatch(/ALTER TABLE chat_messages ADD COLUMN/);
    expect(latest.sql).not.toMatch(/DROP|DELETE|TRUNCATE/i);
  });
});
