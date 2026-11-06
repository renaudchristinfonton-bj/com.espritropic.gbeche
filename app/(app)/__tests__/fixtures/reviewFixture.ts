/**
 * Fixture partagée du test de rendu de l'écran Bilan.
 * Module séparé pour pouvoir être chargé depuis une factory `jest.mock`
 * (qui ne peut pas référencer de variable locale au fichier de test).
 */
import { buildReview } from '@/src/domain/review';
import type { TransactionRow } from '@/src/db/types';

const NOW = new Date(2026, 10, 6, 12).getTime();

const income: TransactionRow = {
  id: 't1',
  account_id: 'a',
  amount: 120_000,
  type: 'income',
  category: 'salary',
  label: 'salaire',
  note: '',
  is_recurring: 0,
  timestamp: new Date(2026, 10, 4, 9).getTime(),
  created_at: 0,
};

const expense: TransactionRow = {
  id: 't2',
  account_id: 'a',
  amount: -45_000,
  type: 'expense',
  category: 'food',
  label: 'courses',
  note: '',
  is_recurring: 0,
  timestamp: new Date(2026, 10, 5, 18).getTime(),
  created_at: 0,
};

export const REVIEW_FIXTURE = buildReview({
  period: 7,
  now: NOW,
  transactions: [income, expense],
  adversaries: [],
  profile: { streak: 4, level: 3 },
});

/** Tendance : deux semaines rejouées + objectif calibré. */
export const PAST_WEEK_FIXTURE = buildReview({
  period: 7,
  now: NOW - 7 * 86_400_000,
  transactions: [],
  adversaries: [],
});

export const TREND_FIXTURE = {
  series: [PAST_WEEK_FIXTURE, REVIEW_FIXTURE],
  target: {
    target: 55,
    baseline: 40,
    current: REVIEW_FIXTURE.score.value,
    historyWeeks: 0,
    gap: REVIEW_FIXTURE.score.value - 55,
    reached: REVIEW_FIXTURE.score.value >= 55,
    mode: 'start' as const,
    message: 'Objectif d’amorce : 55/100.',
  },
};
