/**
 * GBECHE — Service Guerres : orchestration bataille + adversaires.
 * Les repositories portent le SQL ; ce service garantit la cohérence
 * des graphes d'objets (war → battle → template → instances).
 */

import {
  createBattle,
  getBattle,
  getBattleProgress,
  listBattlesByWar,
  setBattleStatus,
  type CreateBattleInput,
} from '../db/repositories/battles.repo';
import {
  createManualAdversary,
  createTemplate,
  deactivateTemplate,
  listInstancesByBattle,
  listInstancesForDay,
  listTemplatesByBattle,
  listUpcoming,
  materializeAllTemplates,
} from '../db/repositories/adversaries.repo';
import { getWar } from '../db/repositories/wars.repo';
import type { BattleRow, Frequency, ID } from '../db/types';

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
  await deactivateTemplate(templateId);
}

export const warsQuery = {
  battlesByWar: listBattlesByWar,
  instancesForDay: listInstancesForDay,
  upcoming: listUpcoming,
  refreshRecurrences: materializeAllTemplates,
};
