/**
 * Repository — Brouillon de projet de vie de l'agent.
 *
 * Stocke l'état du dialogue multi-tours (réponses de l'utilisateur,
 * question courante) le temps de construire la carte de plan à valider.
 * Un seul brouillon actif existe, sous l'id fixe 'active'. La conversation
 * complète reste par ailleurs tracée dans chat_messages.
 */
import { all, run } from '../client';
import type { LifeDraft, LifeDraftStatus } from '../../services/agent/lifeProject.service';

const ACTIVE_ID = 'active';

interface LifeDraftRow {
  id: string;
  guide_id: string;
  step_index: number;
  slots_json: string;
  status: LifeDraftStatus;
}

function rowToDraft(row: LifeDraftRow): LifeDraft {
  let slots: Record<string, string> = {};
  try {
    const parsed = JSON.parse(row.slots_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) slots = parsed as Record<string, string>;
  } catch {
    slots = {};
  }
  return {
    guideId: row.guide_id,
    stepIndex: row.step_index,
    slots,
    status: row.status,
  };
}

export async function getActiveDraft(): Promise<LifeDraft | null> {
  const rows = await all<LifeDraftRow>('SELECT * FROM life_project_drafts WHERE id = ?;', [ACTIVE_ID]);
  return rows[0] ? rowToDraft(rows[0]) : null;
}

export async function upsertDraft(draft: LifeDraft): Promise<void> {
  const now = Date.now();
  await run(
    `INSERT INTO life_project_drafts (id, guide_id, step_index, slots_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       guide_id = excluded.guide_id,
       step_index = excluded.step_index,
       slots_json = excluded.slots_json,
       status = excluded.status,
       updated_at = excluded.updated_at;`,
    [ACTIVE_ID, draft.guideId, draft.stepIndex, JSON.stringify(draft.slots), draft.status, now, now],
  );
}

export async function clearDraft(): Promise<void> {
  await run('DELETE FROM life_project_drafts WHERE id = ?;', [ACTIVE_ID]);
}
