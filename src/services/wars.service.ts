/**
 * GBECHE — Service Guerres : orchestration bataille + adversaires.
 * Les repositories portent le SQL ; ce service garantit la cohérence
 * des graphes d'objets (war → battle → template → instances).
 */

import {
  createBattle,
  deleteBattle,
  getBattle,
  getBattleProgress,
  listBattlesByWar,
  setBattleStatus,
  updateBattle,
  type CreateBattleInput,
  type UpdateBattleInput,
} from '../db/repositories/battles.repo';
import {
  createManualAdversary,
  createTemplate,
  deactivateTemplate,
  deleteInstance,
  listInstancesByBattle,
  listInstancesForDay,
  listTemplatesByBattle,
  listUpcoming,
  materializeAllTemplates,
  updateManualInstance,
  updateTemplate,
  type UpdateManualInstanceInput,
  type UpdateTemplateInput,
} from '../db/repositories/adversaries.repo';
import { deleteWar, getWar, updateWar, type UpdateWarInput } from '../db/repositories/wars.repo';
import type {
  AdversaryRow,
  AdversaryTemplateRow,
  BattleRow,
  Frequency,
  ID,
  WarRow,
} from '../db/types';

export type NewBattleInput = CreateBattleInput;

export async function addBattle(input: NewBattleInput): Promise<ID> {
  const war = await getWar(input.warId);
  if (!war) throw new Error('Guerre introuvable.');
  if (!input.title.trim()) throw new Error('Le titre de la bataille est obligatoire.');
  return createBattle(input);
}

export interface NewTemplateInput {
  battleId: ID;
  title: string;
  xpReward?: number;
  frequency: Frequency;
  specificDays?: number[];
  hour: number;
  durationMin?: number;
  startDate?: Date;
  endDate?: Date | null;
}

export async function addTemplate(input: NewTemplateInput): Promise<ID> {
  const battle = await getBattle(input.battleId);
  if (!battle) throw new Error('Bataille introuvable.');
  if (input.frequency === 'specific_days' && !(input.specificDays?.length)) {
    throw new Error('Sélectionne au moins un jour de la semaine.');
  }
  return createTemplate({
    battleId: input.battleId,
    warId: battle.war_id,
    title: input.title,
    xpReward: input.xpReward,
    frequency: input.frequency,
    specificDays: input.specificDays,
    hour: input.hour,
    durationMin: input.durationMin,
    startDate: input.startDate,
    endDate: input.endDate,
  });
}

export interface QuickAdversaryInput {
  battleId: ID;
  title: string;
  xpReward?: number;
  scheduledAt: Date;
  durationMin?: number;
}

export async function addQuickAdversary(input: QuickAdversaryInput): Promise<ID> {
  const battle = await getBattle(input.battleId);
  if (!battle) throw new Error('Bataille introuvable.');
  return createManualAdversary({
    battleId: input.battleId,
    warId: battle.war_id,
    title: input.title,
    xpReward: input.xpReward,
    scheduledAt: input.scheduledAt,
    hour: input.scheduledAt.getHours(),
    durationMin: input.durationMin,
  });
}

export interface BattleDetail {
  battle: BattleRow;
  templates: Awaited<ReturnType<typeof listTemplatesByBattle>>;
  instances: Awaited<ReturnType<typeof listInstancesByBattle>>;
  progress: Awaited<ReturnType<typeof getBattleProgress>>;
}

export async function getBattleDetail(battleId: ID): Promise<BattleDetail> {
  const battle = await getBattle(battleId);
  if (!battle) throw new Error('Bataille introuvable.');
  const [templates, instances, progress] = await Promise.all([
    listTemplatesByBattle(battleId),
    listInstancesByBattle(battleId),
    getBattleProgress(battleId),
  ]);
  return { battle, templates, instances, progress };
}

export async function completeBattleIfDone(battleId: ID): Promise<boolean> {
  const progress = await getBattleProgress(battleId);
  if (progress.total > 0 && progress.pending === 0 && progress.lost === 0) {
    await setBattleStatus(battleId, 'won');
    return true;
  }
  return false;
}

export async function removeTemplate(templateId: ID): Promise<void> {
  // Désactivation plutôt que suppression : l'historique des victoires
  // passées est préservé, et aucune nouvelle instance n'est matérielle.
  await deactivateTemplate(templateId);
}

// ─── Modification / suppression ───────────────────────────
export async function editWar(warId: ID, input: UpdateWarInput): Promise<void> {
  const war = await getWar(warId);
  if (!war) throw new Error('Guerre introuvable.');
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('Le nom de la guerre est obligatoire.');
  }
  await updateWar(warId, input);
}

export async function removeWar(warId: ID): Promise<void> {
  await deleteWar(warId);
}

export async function editBattle(battleId: ID, input: UpdateBattleInput): Promise<void> {
  const battle = await getBattle(battleId);
  if (!battle) throw new Error('Bataille introuvable.');
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('Le titre de la bataille est obligatoire.');
  }
  await updateBattle(battleId, input);
}

export async function removeBattle(battleId: ID): Promise<void> {
  await deleteBattle(battleId);
}

export async function editTemplate(
  templateId: ID,
  input: UpdateTemplateInput,
): Promise<void> {
  if (input.frequency === 'specific_days' && !(input.specificDays?.length)) {
    throw new Error('Sélectionne au moins un jour de la semaine.');
  }
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Le nom de l'adversaire est obligatoire.");
  }
  await updateTemplate(templateId, input);
}

export async function editManualInstance(
  instanceId: ID,
  input: UpdateManualInstanceInput,
): Promise<void> {
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('Le nom de la mission est obligatoire.');
  }
  await updateManualInstance(instanceId, input);
}

export async function removeInstance(instanceId: ID): Promise<void> {
  await deleteInstance(instanceId);
}

export type { WarRow, BattleRow, AdversaryRow, AdversaryTemplateRow };

export const warsQuery = {
  battlesByWar: listBattlesByWar,
  instancesForDay: listInstancesForDay,
  upcoming: listUpcoming,
  refreshRecurrences: materializeAllTemplates,
};
