/**
 * Repository — Battles (objectifs).
 */

import { all, first, newId, run } from '../client';
import type { BattleRow, BattleStatus, ID, Priority } from '../types';

export interface CreateBattleInput {
  warId: ID;
  title: string;
  description?: string;
  deadline?: Date | null;
  priority?: Priority;
  xpReward?: number;
}

export async function listBattlesByWar(warId: ID): Promise<BattleRow[]> {
  return all<BattleRow>(
    `SELECT * FROM battles WHERE war_id = ?
     ORDER BY status ASC, deadline IS NULL, deadline ASC, created_at DESC;`,
    [warId],
  );
}

export async function listActiveBattles(): Promise<BattleRow[]> {
  return all<BattleRow>("SELECT * FROM battles WHERE status = 'active' ORDER BY created_at DESC;");
}

export async function getBattle(id: ID): Promise<BattleRow | null> {
  return first<BattleRow>('SELECT * FROM battles WHERE id = ?;', [id]);
}

export async function createBattle(input: CreateBattleInput): Promise<ID> {
  const id = newId();
  const now = Date.now();
  await run(
    `INSERT INTO battles
       (id, war_id, title, description, deadline, status, priority, xp_reward, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NULL, ?, ?);`,
    [
      id,
      input.warId,
      input.title.trim(),
      input.description?.trim() ?? '',
      input.deadline ? input.deadline.getTime() : null,
      input.priority ?? 'medium',
      input.xpReward ?? 100,
      now,
      now,
    ],
  );
  return id;
}

export async function setBattleStatus(id: ID, status: BattleStatus): Promise<void> {
  await run(
    `UPDATE battles SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?;`,
    [status, status === 'active' ? null : Date.now(), Date.now(), id],
  );
}

export interface UpdateBattleInput {
  title?: string;
  description?: string;
  priority?: Priority;
  deadline?: Date | null;
  xpReward?: number;
}

export async function updateBattle(id: ID, input: UpdateBattleInput): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    params.push(input.title.trim());
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description.trim());
  }
  if (input.priority !== undefined) {
    fields.push('priority = ?');
    params.push(input.priority);
  }
  if (input.deadline !== undefined) {
    fields.push('deadline = ?');
    params.push(input.deadline ? input.deadline.getTime() : null);
  }
  if (input.xpReward !== undefined) {
    fields.push('xp_reward = ?');
    params.push(input.xpReward);
  }
  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(Date.now(), id);
  await run(`UPDATE battles SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export async function deleteBattle(id: ID): Promise<void> {
  await run('DELETE FROM battles WHERE id = ?;', [id]);
}

export interface BattleProgress {
  total: number;
  won: number;
  pending: number;
  lost: number;
}

export async function getBattleProgress(battleId: ID): Promise<BattleProgress> {
  const row = await first<{
    total: number;
    won: number;
    pending: number;
    lost: number;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won,
       SUM(CASE WHEN status = 'pending' OR status = 'rescheduled' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost
     FROM adversaries WHERE battle_id = ?;`,
    [battleId],
  );
  return {
    total: row?.total ?? 0,
    won: row?.won ?? 0,
    pending: row?.pending ?? 0,
    lost: row?.lost ?? 0,
  };
}
