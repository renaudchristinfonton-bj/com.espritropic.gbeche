/**
 * Repository — Profil de gamification (ligne unique id = 1).
 */

import { first, run } from '../client';
import type { GamificationRow } from '../types';

const DEFAULT_PROFILE: Omit<GamificationRow, 'id'> = {
  xp: 0,
  level: 1,
  streak: 0,
  shields: 0,
  wins: 0,
  losses: 0,
  combo: 0,
  best_combo: 0,
  medals: '[]',
  last_active: null,
  updated_at: 0,
};

export async function getProfile(): Promise<GamificationRow> {
  const row = await first<GamificationRow>('SELECT * FROM gamification WHERE id = 1;');
  if (row) return row;

  await run(
    `INSERT OR IGNORE INTO gamification (id, xp, level, streak, shields, wins, losses, combo, best_combo, medals, last_active, updated_at)
     VALUES (1, 0, 1, 0, 0, 0, 0, 0, 0, '[]', NULL, ?);`,
    [Date.now()],
  );
  const created = await first<GamificationRow>('SELECT * FROM gamification WHERE id = 1;');
  return created ?? { id: 1, ...DEFAULT_PROFILE };
}

export async function saveProfile(profile: GamificationRow): Promise<void> {
  await run(
    `UPDATE gamification SET
       xp = ?, level = ?, streak = ?, shields = ?, wins = ?, losses = ?,
       combo = ?, best_combo = ?, medals = ?, last_active = ?, updated_at = ?
     WHERE id = 1;`,
    [
      profile.xp,
      profile.level,
      profile.streak,
      profile.shields,
      profile.wins,
      profile.losses,
      profile.combo,
      profile.best_combo,
      profile.medals,
      profile.last_active,
      Date.now(),
    ],
  );
}

export async function recordLoss(): Promise<void> {
  await run(
    `UPDATE gamification
     SET losses = losses + 1, combo = 0, updated_at = ?
     WHERE id = 1;`,
    [Date.now()],
  );
}

export async function resetProfile(): Promise<void> {
  await run(
    `UPDATE gamification
     SET xp = 0, level = 1, streak = 0, shields = 0, wins = 0, losses = 0,
         combo = 0, best_combo = 0, medals = '[]', last_active = NULL, updated_at = ?
     WHERE id = 1;`,
    [Date.now()],
  );
}
