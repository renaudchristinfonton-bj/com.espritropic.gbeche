/**
 * GBECHE — Historique hebdomadaire d'une guerre (pur, déterministe).
 * Chaque point est calculé avec le même agrégateur que le Bilan et le
 * bandeau de performance ; les semaines vides sont conservées à zéro.
 */
import type { AdversaryRow, WarRow } from '@/src/db/types';
import { warBreakdownOf, reviewWindow } from '@/src/domain/review';
import { DAY_MS } from '@/src/utils/dayKey';

export interface WarWeek {
  /** Semaine la plus récente = « Cette sem. », puis S-1, S-2… */
  label: string;
  from: number;
  to: number;
  wins: number;
  losses: number;
  pending: number;
  total: number;
  xp: number;
  completionRate: number | null;
}

export function warWeeklyHistory(
  adversaries: AdversaryRow[],
  war: WarRow,
  now: number,
  weeks = 12,
): WarWeek[] {
  const count = Math.max(1, Math.min(52, Math.floor(weeks)));
  const currentFrom = reviewWindow(now, 7).from;
  return Array.from({ length: count }, (_, index) => {
    const age = count - index - 1;
    // Fenêtres strictement contiguës, alignées sur la fenêtre du Bilan.
    const from = currentFrom - age * 7 * DAY_MS;
    const to = age === 0 ? now : from + 7 * DAY_MS - 1;
    const line = warBreakdownOf(adversaries, [war], { from, to }).find((row) => row.id === war.id);
    return {
      label: age === 0 ? 'Cette sem.' : `S-${age}`,
      from,
      to,
      wins: line?.wins ?? 0,
      losses: line?.losses ?? 0,
      pending: line?.pending ?? 0,
      total: line?.total ?? 0,
      xp: line?.xp ?? 0,
      completionRate: line?.completionRate ?? null,
    };
  });
}
