/**
 * GBECHE — Séries de bilans et objectif hebdomadaire calibré.
 *
 * Principe : on ne fixe jamais un objectif arbitraire. On rejoue le bilan
 * semaine par semaine sur les données réelles, puis on propose de dépasser
 * d'un cran la médiane des semaines déjà vécues. Sans historique, l'objectif
 * de départ est volontairement modeste et annoncé comme tel.
 *
 * Tout est pur et déterministe : mêmes données + même date = même objectif.
 */

import type { AdversaryRow, TransactionRow, WarRow } from '@/src/db/types';
import type { BudgetWithSpent } from '@/src/db/repositories/budgets.repo';
import { buildReview, type Review, type ReviewInput } from '@/src/domain/review';
import { DAY_MS } from '@/src/utils/dayKey';

export const WEEK_MS = 7 * DAY_MS;

export interface SeriesInput {
  now: number;
  /** Nombre de semaines à rejouer, semaine en cours incluse (min 1). */
  weeks: number;
  transactions: TransactionRow[];
  adversaries: AdversaryRow[];
  budgets?: BudgetWithSpent[];
  profile?: ReviewInput['profile'];
  wars?: WarRow[];
}

/**
 * Rejoue le bilan sur `weeks` semaines consécutives, de la plus ancienne à
 * la semaine en cours. La dernière entrée est donc toujours la semaine
 * actuelle, ce qui rend l'affichage trivial.
 */
export function buildReviewSeries(input: SeriesInput): Review[] {
  const weeks = Math.max(1, Math.min(12, Math.floor(input.weeks)));
  const out: Review[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const offset = (weeks - 1 - index) * WEEK_MS;
    out.push(
      buildReview({
        period: 7,
        now: input.now - offset,
        transactions: input.transactions,
        adversaries: input.adversaries,
        budgets: input.budgets,
        profile: input.profile,
        wars: input.wars,
      }),
    );
  }
  return out;
}

/** Médiane d'une liste de nombres (renvoie null si vide). */
export function median(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 1 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

/** Une semaine « compte » si au moins un acte y a été accompli. */
export function hasMatter(review: Review): boolean {
  return review.kpi.wins + review.kpi.losses > 0 || review.kpi.transactions > 0;
}

export type TargetMode = 'start' | 'climb' | 'hold';

export interface WeeklyTarget {
  /** Score à atteindre cette semaine, 0..100. */
  target: number;
  /** Médiane des semaines achevées (0 si aucun historique). */
  baseline: number;
  /** Score de la semaine en cours. */
  current: number;
  /** Nombre de semaines passées réellement exploitées. */
  historyWeeks: number;
  /** current − target : négatif tant que l'objectif n'est pas atteint. */
  gap: number;
  reached: boolean;
  mode: TargetMode;
  /** Phrase affichée telle quelle, déjà honnête sur son origine. */
  message: string;
}

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Objectif de la semaine, calibré sur l'historique :
 *   - historique ≥ 2 semaines → médiane + 3 (progression mesurée)
 *   - historique = 1 semaine  → cette semaine + 3
 *   - aucun historique        → 45, l'objectif d'amorce explicite
 * Le résultat est borné à [10, 95] : jamais irréaliste, jamais décourageant.
 */
export function calibratedTarget(series: Review[]): WeeklyTarget {
  if (series.length === 0) {
    return {
      target: 45,
      baseline: 0,
      current: 0,
      historyWeeks: 0,
      gap: -45,
      reached: false,
      mode: 'start',
      message: 'Objectif d’amorce : 45/100. Il s’ajustera tout seul dès ta première semaine terminée.',
    };
  }

  const current = series[series.length - 1];
  const past = series.slice(0, -1).filter(hasMatter);
  const historyScores = past.map((review) => review.score.value);
  const baselineRaw = median(historyScores);

  let target: number;
  let mode: TargetMode;
  if (baselineRaw === null) {
    target = 45;
    mode = 'start';
  } else {
    const step = past.length >= 2 ? 3 : 3;
    target = baselineRaw + step;
    mode = current.score.value < baselineRaw ? 'climb' : 'hold';
  }
  target = clampScore(Math.max(10, Math.min(95, target)));

  const gap = current.score.value - target;
  const reached = gap >= 0;
  const baseline = baselineRaw === null ? 0 : Math.round(baselineRaw);

  const message = (() => {
    if (mode === 'start') {
      return 'Objectif d’amorce : 45/100. Il se calibrera sur tes vraies semaines dès la prochaine.';
    }
    if (reached) {
      return `Objectif tenu : ${current.score.value}/100 contre ${target} visés. Tu peux viser ${Math.min(95, target + 3)} la semaine prochaine.`;
    }
    const missing = Math.abs(gap);
    return `Il manque ${missing} point${missing > 1 ? 's' : ''} pour l’objectif de ${target}/100, calibré sur tes ${past.length} semaine${past.length > 1 ? 's' : ''} passée${past.length > 1 ? 's' : ''}.`;
  })();

  return {
    target,
    baseline,
    current: current.score.value,
    historyWeeks: past.length,
    gap,
    reached,
    mode,
    message,
  };
}

export interface ScorePoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Étiquettes de la courbe de score : « S-3 », « S-2 », « S-1 », « Cette
 * semaine ». La semaine en cours est toujours la dernière.
 */
export function scoreSeries(series: Review[]): ScorePoint[] {
  return series.map((review, index) => {
    const fromEnd = series.length - 1 - index;
    return {
      label: fromEnd === 0 ? 'Cette sem.' : `S-${fromEnd}`,
      value: review.score.value,
    };
  });
}
