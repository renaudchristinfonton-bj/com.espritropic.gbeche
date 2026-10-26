/**
 * GBECHE — Migrations SQLite.
 * Chaque migration est idempotente et s'exécute dans une transaction.
 * La version appliquée est tracée via PRAGMA user_version.
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'schema_initial',
    sql: /* sql */ `
      -- Les PRAGMA journal_mode/foreign_keys sont posés par db/client.ts
      -- avant les migrations (le WAL natif n'existe pas sur le SQLite WASM web).

      -- ─── Système ────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      -- ─── Guerres (domaines de vie) ──────────────────────
      CREATE TABLE IF NOT EXISTS wars (
        id         TEXT PRIMARY KEY NOT NULL,
        title      TEXT NOT NULL,
        icon       TEXT NOT NULL,
        color      TEXT NOT NULL,
        domain_type TEXT NOT NULL,
        xp_earned  INTEGER NOT NULL DEFAULT 0,
        is_active  INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- ─── Batailles (objectifs) ──────────────────────────
      CREATE TABLE IF NOT EXISTS battles (
        id           TEXT PRIMARY KEY NOT NULL,
        war_id       TEXT NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        deadline     INTEGER,
        status       TEXT NOT NULL DEFAULT 'active',
        priority     TEXT NOT NULL DEFAULT 'medium',
        xp_reward    INTEGER NOT NULL DEFAULT 100,
        completed_at INTEGER,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_battles_war ON battles(war_id);
      CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);

      -- ─── Templates d'adversaires (récurrence) ───────────
      CREATE TABLE IF NOT EXISTS adversary_templates (
        id           TEXT PRIMARY KEY NOT NULL,
        battle_id    TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        war_id       TEXT NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        xp_reward    INTEGER NOT NULL DEFAULT 50,
        frequency    TEXT NOT NULL,
        specific_days TEXT NOT NULL DEFAULT '[]',
        hour         INTEGER NOT NULL DEFAULT 8,
        duration_min INTEGER NOT NULL DEFAULT 30,
        start_date   INTEGER NOT NULL,
        end_date     INTEGER,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_templates_battle ON adversary_templates(battle_id);

      -- ─── Adversaires (instances planifiées) ─────────────
      CREATE TABLE IF NOT EXISTS adversaries (
        id           TEXT PRIMARY KEY NOT NULL,
        template_id  TEXT REFERENCES adversary_templates(id) ON DELETE CASCADE,
        battle_id    TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
        war_id       TEXT NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        xp_reward    INTEGER NOT NULL DEFAULT 50,
        scheduled_at INTEGER NOT NULL,
        hour         INTEGER NOT NULL DEFAULT 8,
        duration_min INTEGER NOT NULL DEFAULT 30,
        status       TEXT NOT NULL DEFAULT 'pending',
        completed_at INTEGER,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL,
        UNIQUE(template_id, scheduled_at)
      );
      CREATE INDEX IF NOT EXISTS idx_adversaries_scheduled ON adversaries(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_adversaries_status ON adversaries(status);
      CREATE INDEX IF NOT EXISTS idx_adversaries_battle ON adversaries(battle_id);

      -- ─── Comptes financiers ─────────────────────────────
      CREATE TABLE IF NOT EXISTS accounts (
        id              TEXT PRIMARY KEY NOT NULL,
        name            TEXT NOT NULL,
        type            TEXT NOT NULL,
        icon            TEXT NOT NULL,
        color           TEXT NOT NULL,
        initial_balance REAL NOT NULL DEFAULT 0,
        currency        TEXT NOT NULL DEFAULT 'XOF',
        is_default      INTEGER NOT NULL DEFAULT 0,
        is_archived     INTEGER NOT NULL DEFAULT 0,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL
      );

      -- ─── Transactions ───────────────────────────────────
      CREATE TABLE IF NOT EXISTS transactions (
        id           TEXT PRIMARY KEY NOT NULL,
        account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        amount       REAL NOT NULL,
        type         TEXT NOT NULL,
        category     TEXT NOT NULL,
        label        TEXT NOT NULL DEFAULT '',
        note         TEXT NOT NULL DEFAULT '',
        is_recurring INTEGER NOT NULL DEFAULT 0,
        timestamp    INTEGER NOT NULL,
        created_at   INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);

      -- ─── Budgets ────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS budgets (
        id         TEXT PRIMARY KEY NOT NULL,
        category   TEXT NOT NULL,
        amount     REAL NOT NULL,
        period     TEXT NOT NULL DEFAULT 'monthly',
        month      TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(category, month)
      );

      -- ─── Gamification (ligne unique id = 1) ─────────────
      CREATE TABLE IF NOT EXISTS gamification (
        id          INTEGER PRIMARY KEY CHECK (id = 1),
        xp          INTEGER NOT NULL DEFAULT 0,
        level       INTEGER NOT NULL DEFAULT 1,
        streak      INTEGER NOT NULL DEFAULT 0,
        shields     INTEGER NOT NULL DEFAULT 0,
        wins        INTEGER NOT NULL DEFAULT 0,
        losses      INTEGER NOT NULL DEFAULT 0,
        combo       INTEGER NOT NULL DEFAULT 0,
        best_combo  INTEGER NOT NULL DEFAULT 0,
        medals      TEXT NOT NULL DEFAULT '[]',
        last_active TEXT,
        updated_at  INTEGER NOT NULL
      );

      -- ─── Phase 2 : tables réservées ─────────────────────
      CREATE TABLE IF NOT EXISTS time_logs (
        id           TEXT PRIMARY KEY NOT NULL,
        adversary_id TEXT,
        activity     TEXT NOT NULL,
        category     TEXT NOT NULL DEFAULT 'other',
        start_time   INTEGER NOT NULL,
        end_time     INTEGER NOT NULL,
        is_planned   INTEGER NOT NULL DEFAULT 0,
        war_id       TEXT,
        created_at   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mood_logs (
        id        TEXT PRIMARY KEY NOT NULL,
        score     INTEGER NOT NULL,
        note      TEXT NOT NULL DEFAULT '',
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS health_logs (
        id            TEXT PRIMARY KEY NOT NULL,
        sleep_hours   REAL NOT NULL DEFAULT 0,
        water_liters  REAL NOT NULL DEFAULT 0,
        weight_kg     REAL NOT NULL DEFAULT 0,
        sport_minutes INTEGER NOT NULL DEFAULT 0,
        sport_type    TEXT NOT NULL DEFAULT 'other',
        timestamp     INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id           TEXT PRIMARY KEY NOT NULL,
        role         TEXT NOT NULL,
        text         TEXT NOT NULL,
        intents_json TEXT NOT NULL DEFAULT '[]',
        created_at   INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'custom_categories',
    sql: /* sql */ `
      -- Catégories financières créées par l'utilisateur (le catalogue
      -- statique src/domain/catalog.ts reste le socle, non dupliqué ici).
      CREATE TABLE IF NOT EXISTS categories (
        id         TEXT PRIMARY KEY NOT NULL,
        label      TEXT NOT NULL,
        icon       TEXT NOT NULL DEFAULT 'pricetag',
        color      TEXT NOT NULL DEFAULT '#8E94A8',
        kind       TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
        is_custom  INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        UNIQUE(label, kind)
      );
    `,
  },
  {
    version: 3,
    name: 'chat_action_cards',
    sql: /* sql */ `
      -- L'agent peut proposer des actions à confirmer (dépense, mission…).
      -- Migration strictement additive : les anciens messages gardent
      -- leurs valeurs par défaut (aucune action, statut informatif).
      ALTER TABLE chat_messages ADD COLUMN payload_json TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE chat_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'info';
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
