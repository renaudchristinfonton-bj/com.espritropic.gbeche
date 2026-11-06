/**
 * GBECHE — Accès au bilan depuis l'application.
 *
 * L'écran Bilan et l'assistant lisent les mêmes lignes SQLite puis passent
 * par le moteur pur `src/domain/review.ts`. Ce service ne fait que trois
 * choses : lire la base, construire le bilan, le formuler pour le chat.
 */

import { listInstancesInRange } from '@/src/db/repositories/adversaries.repo';
import { budgetsWithSpent } from '@/src/db/repositories/budgets.repo';
import { listTransactions } from '@/src/db/repositories/transactions.repo';
import { getWarriorProfile } from '@/src/services/gamification.service';
import { currentMonthKey, formatCompact, formatCurrency } from '@/src/services/format';
import {
  buildReview,
  previousWindow,
  reviewWindow,
  type Review,
  type ReviewPeriod,
} from '@/src/domain/review';

export const REVIEW_ROUTE = '/(app)/review';

/** Charge les données réelles puis construit le bilan de la période. */
export async function loadReview(period: ReviewPeriod, now: number = Date.now()): Promise<Review> {
  const window = reviewWindow(now, period);
  const before = previousWindow(window, period);
  const [transactions, adversaries, budgets, profile] = await Promise.all([
    listTransactions({ from: before.from, to: now, limit: 4000 }),
    listInstancesInRange(before.from, now),
    budgetsWithSpent(currentMonthKey()),
    getWarriorProfile(),
  ]);
  return buildReview({ period, now, transactions, adversaries, budgets, profile });
}

export interface ReviewChatAnswer {
  text: string;
  action: { label: string; route: string };
}

const periodLabel = (period: ReviewPeriod): string =>
  period === 7 ? 'des 7 derniers jours' : period === 30 ? 'des 30 derniers jours' : 'des 90 derniers jours';

/**
 * Formule le bilan pour la conversation. Court, chiffré, actionnable :
 * le score, l'argent, les missions, un constat et une étape suivante.
 */
export function reviewToChat(review: Review): ReviewChatAnswer {
  const { kpi, score, insights, actions, period } = review;
  const decided = kpi.wins + kpi.losses;
  const lines: string[] = [];

  lines.push(`Bilan ${periodLabel(period)} — ${score.value}/100 (${score.grade}).`);
  lines.push(
    `Argent : ${formatCurrency(kpi.income)} entrés, ${formatCurrency(kpi.expense)} sortis, net ${formatCurrency(kpi.net)}.`,
  );
  if (decided > 0) {
    lines.push(`Missions : ${kpi.wins}/${decided} tenues${kpi.pending > 0 ? `, ${kpi.pending} en attente` : ''}.`);
  } else {
    lines.push('Missions : aucune n’a encore été tranchée sur la période.');
  }
  if (insights[0]) lines.push(`À retenir : ${insights[0].title.toLowerCase()}.`);
  if (actions[0]) lines.push(`Prochaine étape : ${actions[0].title.toLowerCase()} — ${actions[0].subtitle}.`);

  return {
    text: lines.join('\n'),
    action: { label: 'Ouvrir le bilan', route: REVIEW_ROUTE },
  };
}

/** Résumé très court pour les suggestions de l'assistant. */
export function reviewOneLiner(review: Review): string {
  const { kpi, score } = review;
  return `Score ${score.value}/100 · net ${formatCompact(kpi.net)} FCFA · ${kpi.wins} victoire${kpi.wins > 1 ? 's' : ''}`;
}
