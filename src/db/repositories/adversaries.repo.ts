/**
 * Repository — Adversaires : templates récurrents + instances planifiées.
 * La matérialisation est glissante (45 jours) et idempotente grâce à
 * la contrainte UNIQUE(template_id, scheduled_at).
 */

import { all, first, getDb, newId, run, transaction } from '../client';
import type {
  AdversaryRow,
  AdversaryStatus,
  AdversaryTemplateRow,
  Frequency,
  ID,
} from '../types';
import { addDays, computeOccurrences, dayRange } from '../../utils/recurrence';

const HORIZON_DAYS = 45;

// ─── Templates ────────────────────────────────────────────
export interface CreateTemplateInput {
  battleId: ID;
  warId: ID;
  title: string;
  xpReward?: number;
  frequency: Frequency;
  specificDays?: number[];
  hour: number;
  /** Minute précise 0..59 (défaut 0). */
  minute?: number;
  /** Intervalle en jours pour la fréquence 'interval_days' (>= 2). */
  intervalDays?: number;
  durationMin?: number;
  startDate?: Date;
  endDate?: Date | null;
}

export async function listTemplatesByBattle(battleId: ID): Promise<AdversaryTemplateRow[]> {
  return all<AdversaryTemplateRow>(
    'SELECT * FROM adversary_templates WHERE battle_id = ? ORDER BY created_at DESC;',
    [battleId],
  );
}

export async function listActiveTemplates(): Promise<AdversaryTemplateRow[]> {
  return all<AdversaryTemplateRow>(
    'SELECT * FROM adversary_templates WHERE is_active = 1;',
  );
}

export async function createTemplate(input: CreateTemplateInput): Promise<ID> {
  const id = newId();
  const now = Date.now();
  const start = input.startDate?.getTime() ?? now;

  await run(
    `INSERT INTO adversary_templates
       (id, battle_id, war_id, title, xp_reward, frequency, specific_days, hour, minute, interval_days, duration_min, start_date, end_date, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
    [
      id,
      input.battleId,
      input.warId,
      input.title.trim(),
      input.xpReward ?? 50,
      input.frequency,
      JSON.stringify(input.specificDays ?? []),
      input.hour,
      input.minute ?? 0,
      input.intervalDays ?? 0,
      input.durationMin ?? 30,
      start,
      input.endDate ? input.endDate.getTime() : null,
      now,
    ],
  );

  await materializeTemplate(id);
  return id;
}

/** Adversaire ponctuel sans template (création rapide). */
export async function createManualAdversary(
  input: Omit<CreateTemplateInput, 'frequency' | 'specificDays' | 'startDate'> & {
    scheduledAt: Date;
  },
): Promise<ID> {
  const id = newId();
  const now = Date.now();
  await run(
    `INSERT INTO adversaries
       (id, template_id, battle_id, war_id, title, xp_reward, scheduled_at, hour, minute, duration_min, status, completed_at, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?);`,
    [
      id,
      input.battleId,
      input.warId,
      input.title.trim(),
      input.xpReward ?? 50,
      input.scheduledAt.getTime(),
      input.scheduledAt.getHours(),
      input.scheduledAt.getMinutes(),
      input.durationMin ?? 30,
      now,
      now,
    ],
  );
  return id;
}

export async function deactivateTemplate(id: ID): Promise<void> {
  await run('UPDATE adversary_templates SET is_active = 0 WHERE id = ?;', [id]);
}

export async function getTemplate(id: ID): Promise<AdversaryTemplateRow | null> {
  return first<AdversaryTemplateRow>(
    'SELECT * FROM adversary_templates WHERE id = ?;',
    [id],
  );
}

export interface UpdateTemplateInput {
  title?: string;
  xpReward?: number;
  frequency?: Frequency;
  specificDays?: number[];
  hour?: number;
  minute?: number;
  intervalDays?: number;
  durationMin?: number;
  startDate?: Date;
  endDate?: Date | null;
}

/**
 * Modifie une routine récurrente puis propage les changements aux
 * instances futures encore pendantes (les victoires passées restent
 * figées) et complète l'horizon glissant de 45 jours.
 */
export async function updateTemplate(
  id: ID,
  input: UpdateTemplateInput,
): Promise<void> {
  const existing = await getTemplate(id);
  if (!existing) throw new Error('Routine introuvable.');
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Le nom de l'adversaire est obligatoire.");
  }

  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    params.push(input.title.trim());
  }
  if (input.xpReward !== undefined) {
    fields.push('xp_reward = ?');
    params.push(input.xpReward);
  }
  if (input.frequency !== undefined) {
    fields.push('frequency = ?');
    params.push(input.frequency);
  }
  if (input.specificDays !== undefined) {
    fields.push('specific_days = ?');
    params.push(JSON.stringify(input.specificDays));
  }
  if (input.hour !== undefined) {
    fields.push('hour = ?');
    params.push(input.hour);
  }
  if (input.minute !== undefined) {
    fields.push('minute = ?');
    params.push(input.minute);
  }
  if (input.intervalDays !== undefined) {
    fields.push('interval_days = ?');
    params.push(input.intervalDays);
  }
  if (input.durationMin !== undefined) {
    fields.push('duration_min = ?');
    params.push(input.durationMin);
  }
  if (input.startDate !== undefined) {
    fields.push('start_date = ?');
    params.push(input.startDate.getTime());
  }
  if (input.endDate !== undefined) {
    fields.push('end_date = ?');
    params.push(input.endDate ? input.endDate.getTime() : null);
  }
  if (fields.length === 0) return;

  await run(
    `UPDATE adversary_templates SET ${fields.join(', ')} WHERE id = ?;`,
    [...params, id],
  );

  const next = await getTemplate(id);
  if (!next || !next.is_active) return;

  // Propagation aux instances futures non terminées. L'heure modifiée
  // décale l'instance le même jour à la nouvelle heure.
  const now = Date.now();
  const rows = await all<AdversaryRow>(
    `SELECT * FROM adversaries
     WHERE template_id = ? AND status IN ('pending', 'rescheduled')
       AND scheduled_at >= ?;`,
    [id, now],
  );
  for (const instance of rows) {
    const when = new Date(instance.scheduled_at);
    when.setHours(next.hour, next.minute ?? 0, 0, 0);
    await run(
      `UPDATE adversaries
       SET title = ?, xp_reward = ?, hour = ?, minute = ?, duration_min = ?,
           scheduled_at = ?, updated_at = ?
       WHERE id = ?;`,
      [
        next.title,
        next.xp_reward,
        next.hour,
        next.minute ?? 0,
        next.duration_min,
        when.getTime(),
        now,
        instance.id,
      ],
    );
  }

  // De nouvelles occurrences peuvent apparaître (changement de fréquence
  // ou de jours) : INSERT OR IGNORE complète le reste de l'horizon.
  await materializeTemplate(id);
}

export interface UpdateManualInstanceInput {
  title?: string;
  xpReward?: number;
  scheduledAt?: Date;
  durationMin?: number;
}

/** Modifie une mission ponctuelle (instance sans template). */
export async function updateManualInstance(
  id: ID,
  input: UpdateManualInstanceInput,
): Promise<void> {
  const instance = await getInstance(id);
  if (!instance) throw new Error('Mission introuvable.');
  if (instance.template_id !== null) {
    throw new Error('Une occurrence de routine se modifie via sa routine.');
  }
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('Le nom de la mission est obligatoire.');
  }

  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    params.push(input.title.trim());
  }
  if (input.xpReward !== undefined) {
    fields.push('xp_reward = ?');
    params.push(input.xpReward);
  }
  if (input.durationMin !== undefined) {
    fields.push('duration_min = ?');
    params.push(input.durationMin);
  }
  if (input.scheduledAt !== undefined) {
    fields.push('scheduled_at = ?');
    fields.push('hour = ?');
    fields.push('minute = ?');
    params.push(
      input.scheduledAt.getTime(),
      input.scheduledAt.getHours(),
      input.scheduledAt.getMinutes(),
    );
  }
  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(Date.now(), id);
  await run(`UPDATE adversaries SET ${fields.join(', ')} WHERE id = ?;`, params);
}

/**
 * Supprime une mission ponctuelle. Les occurrences de routine ne peuvent
 * pas être supprimées ici : elles seraient recréées par la matérialisation.
 */
export async function deleteInstance(id: ID): Promise<void> {
  const instance = await getInstance(id);
  if (!instance) return;
  if (instance.template_id !== null) {
    throw new Error('Une occurrence de routine se gère via sa routine.');
  }
  await run('DELETE FROM adversaries WHERE id = ?;', [id]);
}

// ─── Moteur de matérialisation ────────────────────────────
export async function materializeTemplate(
  templateId: ID,
  horizonDays = HORIZON_DAYS,
): Promise<number> {
  const template = await first<AdversaryTemplateRow>(
    'SELECT * FROM adversary_templates WHERE id = ?;',
    [templateId],
  );
  if (!template || !template.is_active) return 0;

  const now = Date.now();
  const until = addDays(now, horizonDays);
  const occurrences = computeOccurrences(
    {
      frequency: template.frequency,
      startDate: Math.max(template.start_date, now - DAY_MS),
      endDate: template.end_date,
      specificDays: safeParseDays(template.specific_days),
      hour: template.hour,
      minute: template.minute ?? 0,
      intervalDays: template.interval_days ?? 0,
    },
    until,
  );

  if (occurrences.length === 0) return 0;
  const created = newId();

  await transaction(async () => {
    const database = getDb();
    for (const scheduledAt of occurrences) {
      await database.runAsync(
        `INSERT OR IGNORE INTO adversaries
           (id, template_id, battle_id, war_id, title, xp_reward, scheduled_at, hour, minute, duration_min, status, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?);`,
        [
          created + ':' + scheduledAt,
          template.id,
          template.battle_id,
          template.war_id,
          template.title,
          template.xp_reward,
          scheduledAt,
          template.hour,
          template.minute ?? 0,
          template.duration_min,
          now,
          now,
        ],
      );
    }
  });

  return occurrences.length;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function safeParseDays(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => n >= 1 && n <= 7) : [];
  } catch {
    return [];
  }
}

/** Appelé au boot : garantit 45 jours d'instances pour tous les templates. */
export async function materializeAllTemplates(horizonDays = HORIZON_DAYS): Promise<void> {
  const templates = await listActiveTemplates();
  for (const template of templates) {
    await materializeTemplate(template.id, horizonDays);
  }
}

// ─── Instances ────────────────────────────────────────────
export async function listInstancesByBattle(battleId: ID): Promise<AdversaryRow[]> {
  return all<AdversaryRow>(
    'SELECT * FROM adversaries WHERE battle_id = ? ORDER BY scheduled_at ASC;',
    [battleId],
  );
}

export async function listInstancesForDay(reference: number | Date): Promise<AdversaryRow[]> {
  const { start, end } = dayRange(reference);
  return all<AdversaryRow>(
    `SELECT * FROM adversaries
     WHERE scheduled_at BETWEEN ? AND ?
     ORDER BY scheduled_at ASC;`,
    [start, end],
  );
}

/** Toutes les instances d'une plage [from, to] (bornes epoch ms incluses). */
export async function listInstancesInRange(from: number, to: number): Promise<AdversaryRow[]> {
  return all<AdversaryRow>(
    `SELECT * FROM adversaries
     WHERE scheduled_at BETWEEN ? AND ?
     ORDER BY scheduled_at ASC;`,
    [from, to],
  );
}

export async function listUpcoming(limit = 5): Promise<AdversaryRow[]> {
  return all<AdversaryRow>(
    `SELECT * FROM adversaries
     WHERE status IN ('pending', 'rescheduled') AND scheduled_at >= ?
     ORDER BY scheduled_at ASC
     LIMIT ?;`,
    [Date.now(), limit],
  );
}

export async function getInstance(id: ID): Promise<AdversaryRow | null> {
  return first<AdversaryRow>('SELECT * FROM adversaries WHERE id = ?;', [id]);
}

export async function setInstanceStatus(
  id: ID,
  status: AdversaryStatus,
): Promise<void> {
  const completed = status === 'won' ? Date.now() : null;
  await run(
    `UPDATE adversaries
     SET status = ?, completed_at = ?, updated_at = ?
     WHERE id = ?;`,
    [status, completed, Date.now(), id],
  );
}

export async function rescheduleInstance(id: ID, when: Date): Promise<void> {
  await run(
    `UPDATE adversaries
     SET status = 'rescheduled', scheduled_at = ?, hour = ?, updated_at = ?
     WHERE id = ?;`,
    [when.getTime(), when.getHours(), Date.now(), id],
  );
}

export interface WarProgress {
  war_id: string;
  total: number;
  won: number;
}

export async function getWarProgress(): Promise<WarProgress[]> {
  return all<WarProgress>(
    `SELECT war_id,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won
     FROM adversaries
     GROUP BY war_id;`,
  );
}

export interface DayStats {
  total: number;
  won: number;
  pending: number;
  lost: number;
}

export async function getDayStats(reference: number | Date): Promise<DayStats> {
  const { start, end } = dayRange(reference);
  const row = await first<{ total: number; won: number; pending: number; lost: number }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won,
       SUM(CASE WHEN status IN ('pending','rescheduled') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost
     FROM adversaries WHERE scheduled_at BETWEEN ? AND ?;`,
    [start, end],
  );
  return {
    total: row?.total ?? 0,
    won: row?.won ?? 0,
    pending: row?.pending ?? 0,
    lost: row?.lost ?? 0,
  };
}
