/**
 * Repository — Wars (domaines de vie).
 */

import { all, first, newId, run, transaction } from '../client';
import type { DomainType, ID, WarRow } from '../types';

export interface CreateWarInput {
  title: string;
  icon: string;
  color: string;
  domainType: DomainType;
  sortOrder?: number;
}

export async function listWars(activeOnly = false): Promise<WarRow[]> {
  const sql = activeOnly
    ? 'SELECT * FROM wars WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC;'
    : 'SELECT * FROM wars ORDER BY sort_order ASC, created_at ASC;';
  return all<WarRow>(sql);
}

export async function getWar(id: ID): Promise<WarRow | null> {
  return first<WarRow>('SELECT * FROM wars WHERE id = ?;', [id]);
}

export async function countActiveWars(): Promise<number> {
  const row = await first<{ n: number }>('SELECT COUNT(*) AS n FROM wars WHERE is_active = 1;');
  return row?.n ?? 0;
}

export async function createWar(input: CreateWarInput): Promise<ID> {
  const id = newId();
  const now = Date.now();
  const maxOrder = await first<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM wars;',
  );
  await run(
    `INSERT INTO wars (id, title, icon, color, domain_type, xp_earned, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?);`,
    [
      id,
      input.title.trim(),
      input.icon,
      input.color,
      input.domainType,
      input.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      now,
      now,
    ],
  );
  return id;
}

export async function setWarActive(id: ID, active: boolean): Promise<void> {
  await run('UPDATE wars SET is_active = ?, updated_at = ? WHERE id = ?;', [
    active ? 1 : 0,
    Date.now(),
    id,
  ]);
}

export interface UpdateWarInput {
  title?: string;
  icon?: string;
  color?: string;
}

export async function updateWar(id: ID, input: UpdateWarInput): Promise<void> {
  const fields: string[] = [];
  const params: (string | number)[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    params.push(input.title.trim());
  }
  if (input.icon !== undefined) {
    fields.push('icon = ?');
    params.push(input.icon);
  }
  if (input.color !== undefined) {
    fields.push('color = ?');
    params.push(input.color);
  }
  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(Date.now(), id);
  await run(`UPDATE wars SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export async function addWarXp(id: ID, xp: number): Promise<void> {
  await run('UPDATE wars SET xp_earned = xp_earned + ?, updated_at = ? WHERE id = ?;', [
    xp,
    Date.now(),
    id,
  ]);
}

export async function deleteWar(id: ID): Promise<void> {
  await transaction(async () => {
    await run('DELETE FROM wars WHERE id = ?;', [id]);
  });
}
