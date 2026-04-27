/**
 * GBECHE — WatermelonDB Configuration
 * ─────────────────────────────────────────────────────────
 * Base de données relationnelle locale, haute performance.
 * 100% offline. SQLite sous le capot via Expo.
 * ─────────────────────────────────────────────────────────
 *
 * Pour activer SQLiteAdapter sur appareil physique :
 *   pnpm add @nozbe/watermelondb
 *   pnpm add better-sqlite3 (web) ou sqlite (native)
 *
 * Sur simulateur web, LokiJSAdapter est utilisé.
 */

import { Database }   from '@nozbe/watermelondb';
import { appSchema, tableSchema } from '@nozbe/watermelondb/Schema';
import LokiJSAdapter  from '@nozbe/watermelondb/adapters/lokijs';
// import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'; // pour iOS/Android

// ─── SCHÉMA ──────────────────────────────────────────────
export const schema = appSchema({
  version: 1,
  tables: [
    // Guerres (domaines de vie)
    tableSchema({
      name: 'wars',
      columns: [
        { name: 'title',      type: 'string'  },
        { name: 'icon',       type: 'string'  },
        { name: 'color',      type: 'string'  },
        { name: 'domain_type',type: 'string'  }, // finance | health | career | spiritual | family | education | leisure
        { name: 'xp_earned',  type: 'number'  },
        { name: 'is_active',  type: 'boolean' },
        { name: 'created_at', type: 'number'  },
      ],
    }),

    // Batailles (objectifs au sein d'une guerre)
    tableSchema({
      name: 'battles',
      columns: [
        { name: 'war_id',     type: 'string'  },
        { name: 'title',      type: 'string'  },
        { name: 'deadline',   type: 'number'  },
        { name: 'status',     type: 'string'  }, // active | won | lost
        { name: 'xp_reward',  type: 'number'  },
        { name: 'created_at', type: 'number'  },
      ],
    }),

    // Adversaires (tâches au sein d'une bataille)
    tableSchema({
      name: 'adversaries',
      columns: [
        { name: 'battle_id',      type: 'string'  },
        { name: 'war_id',         type: 'string'  },
        { name: 'title',          type: 'string'  },
        { name: 'xp_reward',      type: 'number'  },
        { name: 'frequency',      type: 'string'  }, // once | daily | weekly | monthly | specific_days
        { name: 'specific_days',  type: 'string'  }, // JSON: [1,3,5] = Lun,Mer,Ven
        { name: 'scheduled_at',   type: 'number'  }, // timestamp
        { name: 'completed_at',   type: 'number'  }, // 0 = non fait
        { name: 'status',         type: 'string'  }, // pending | won | lost | rescheduled
        { name: 'hour',           type: 'number'  }, // heure prévue dans la journée
        { name: 'duration_min',   type: 'number'  }, // durée estimée
        { name: 'created_at',     type: 'number'  },
      ],
    }),

    // Comptes financiers (MOMO, Wave, Cash, Banque)
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'name',       type: 'string'  }, // MTN MOMO | Wave | Cash | Banque
        { name: 'icon',       type: 'string'  },
        { name: 'color',      type: 'string'  },
        { name: 'balance',    type: 'number'  },
        { name: 'is_default', type: 'boolean' },
        { name: 'created_at', type: 'number'  },
      ],
    }),

    // Transactions financières
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'account_id',  type: 'string'  },
        { name: 'amount',      type: 'number'  }, // négatif = dépense, positif = revenu
        { name: 'type',        type: 'string'  }, // income | expense | transfer
        { name: 'category',    type: 'string'  }, // food | transport | health | education | leisure | other
        { name: 'label',       type: 'string'  },
        { name: 'icon',        type: 'string'  },
        { name: 'note',        type: 'string'  },
        { name: 'is_recurring',type: 'boolean' },
        { name: 'timestamp',   type: 'number'  },
      ],
    }),

    // Budgets mensuels par catégorie
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'category',    type: 'string'  },
        { name: 'amount',      type: 'number'  },
        { name: 'period',      type: 'string'  }, // monthly | annual
        { name: 'created_at',  type: 'number'  },
      ],
    }),

    // Logs de temps (tracking horaire)
    tableSchema({
      name: 'time_logs',
      columns: [
        { name: 'adversary_id', type: 'string'  }, // null si non planifié
        { name: 'activity',     type: 'string'  },
        { name: 'category',     type: 'string'  }, // work | rest | social | leisure | wasted
        { name: 'start_time',   type: 'number'  },
        { name: 'end_time',     type: 'number'  },
        { name: 'is_planned',   type: 'boolean' },
        { name: 'war_id',       type: 'string'  },
      ],
    }),

    // État de gamification (un seul enregistrement)
    tableSchema({
      name: 'gamification',
      columns: [
        { name: 'xp',           type: 'number'  },
        { name: 'level',        type: 'number'  },
        { name: 'streak',       type: 'number'  },
        { name: 'shields',      type: 'number'  },
        { name: 'wins',         type: 'number'  },
        { name: 'losses',       type: 'number'  },
        { name: 'medals',       type: 'string'  }, // JSON array
        { name: 'last_active',  type: 'number'  },
        { name: 'updated_at',   type: 'number'  },
      ],
    }),

    // Journal / Mood tracking
    tableSchema({
      name: 'mood_logs',
      columns: [
        { name: 'score',      type: 'number'  }, // 1-5
        { name: 'note',       type: 'string'  },
        { name: 'timestamp',  type: 'number'  },
      ],
    }),

    // Santé tracking
    tableSchema({
      name: 'health_logs',
      columns: [
        { name: 'sleep_hours',   type: 'number'  },
        { name: 'water_liters',  type: 'number'  },
        { name: 'weight_kg',     type: 'number'  },
        { name: 'sport_minutes', type: 'number'  },
        { name: 'sport_type',    type: 'string'  }, // cardio | strength | yoga | other
        { name: 'timestamp',     type: 'number'  },
      ],
    }),
  ],
});

// ─── INITIALISATION ───────────────────────────────────────
let _db: Database | null = null;

export function getDatabase(): Database {
  if (!_db) throw new Error('DB non initialisée. Appelle initializeDatabase() d\'abord.');
  return _db;
}

export async function initializeDatabase(): Promise<Database> {
  if (_db) return _db;

  /**
   * En développement web / simulateur → LokiJS (in-memory).
   * En production iOS/Android → décommenter SQLiteAdapter.
   */
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    dbName: 'GbecheDB',
  });

  // Pour iOS/Android production :
  // const adapter = new SQLiteAdapter({
  //   schema,
  //   jsi: true, // JSI mode (plus rapide)
  //   onSetUpError: (error) => console.error('DB Setup Error:', error),
  // });

  _db = new Database({ adapter });
  console.log('[GBECHE DB] Initialisée avec succès ✅');
  return _db;
}