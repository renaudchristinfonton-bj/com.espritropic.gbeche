/**
 * Séries hebdomadaires et objectif calibré : tout doit être reproductible
 * et honnête (pas d'objectif magique, pas d'historique inventé).
 */
import type { AdversaryRow, TransactionRow } from '@/src/db/types';
import {
  WEEK_MS,
  buildReviewSeries,
  calibratedTarget,
  hasMatter,
  median,
  scoreSeries,
} from '../reviewSeries';
import { buildReview } from '../review';
import { DAY_MS } from '@/src/utils/dayKey';

const NOW = new Date(2026, 10, 6, 12).getTime();

let seq = 0;
function win(msAgo: number, xp = 20): AdversaryRow {
  seq += 1;
  return {
    id: `a-${seq}`,
    template_id: null,
    battle_id: 'b-1',
    war_id: 'w-1',
    title: 'mission',
    xp_reward: xp,
    scheduled_at: NOW - msAgo,
    hour: 7,
    minute: 0,
    duration_min: 15,
    status: 'won',
    completed_at: NOW - msAgo,
    created_at: NOW - msAgo,
    updated_at: NOW - msAgo,
  };
}

function loss(msAgo: number): AdversaryRow {
  seq += 1;
  return {
    ...win(msAgo),
    id: `a-${seq}`,
    status: 'lost',
    completed_at: null,
  };
}

function tx(amount: number, msAgo: number, type: 'income' | 'expense'): TransactionRow {
  seq += 1;
  return {
    id: `t-${seq}`,
    account_id: 'acc',
    amount: type === 'income' ? Math.abs(amount) : -Math.abs(amount),
    type,
    category: type === 'income' ? 'salary' : 'food',
    label: 'x',
    note: '',
    is_recurring: 0,
    timestamp: NOW - msAgo,
    created_at: NOW - msAgo,
  };
}

describe('median', () => {
  it('gère les listes impaires et paires', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('ignore les valeurs non finies', () => {
    expect(median([Number.NaN, 4, 2])).toBe(3);
  });

  it('renvoie null sur une liste vide', () => {
    expect(median([])).toBeNull();
  });
});

describe('buildReviewSeries', () => {
  const series = buildReviewSeries({
    now: NOW,
    weeks: 3,
    transactions: [
      tx(50_000, 2 * DAY_MS, 'income'),
      tx(10_000, 9 * DAY_MS, 'expense'),
      tx(10_000, 16 * DAY_MS, 'expense'),
    ],
    adversaries: [win(DAY_MS), win(8 * DAY_MS), loss(15 * DAY_MS)],
  });

  it('produit exactement le nombre de semaines demandées', () => {
    expect(series).toHaveLength(3);
  });

  it('place la semaine en cours en dernier', () => {
    expect(series[2].window.to).toBe(NOW);
    expect(series[1].window.to).toBe(NOW - WEEK_MS);
    expect(series[0].window.to).toBe(NOW - 2 * WEEK_MS);
  });

  it('isole correctement les données de chaque semaine', () => {
    expect(series[2].kpi.income).toBe(50_000); // la semaine en cours
    expect(series[1].kpi.expense).toBe(10_000); // il y a 9 jours
    expect(series[0].kpi.expense).toBe(10_000); // il y a 16 jours
  });

  it('borne le nombre de semaines à 12', () => {
    const big = buildReviewSeries({ now: NOW, weeks: 40, transactions: [], adversaries: [] });
    expect(big).toHaveLength(12);
  });

  it('accepte 0 ou 1 semaine sans planter', () => {
    expect(buildReviewSeries({ now: NOW, weeks: 0, transactions: [], adversaries: [] })).toHaveLength(1);
    expect(buildReviewSeries({ now: NOW, weeks: 1, transactions: [], adversaries: [] })).toHaveLength(1);
  });
});

describe('hasMatter', () => {
  it('reconnaît une semaine vide', () => {
    const empty = buildReview({ period: 7, now: NOW, transactions: [], adversaries: [] });
    expect(hasMatter(empty)).toBe(false);
  });

  it('reconnaît une semaine avec une seule victoire', () => {
    const review = buildReview({ period: 7, now: NOW, transactions: [], adversaries: [win(DAY_MS)] });
    expect(hasMatter(review)).toBe(true);
  });
});

describe('calibratedTarget', () => {
  it('annonce l’objectif d’amorce sans historique', () => {
    const target = calibratedTarget([]);
    expect(target.target).toBe(45);
    expect(target.mode).toBe('start');
    expect(target.historyWeeks).toBe(0);
    expect(target.message).toContain('amorce');
  });

  it('reste en mode amorce avec une seule semaine vide', () => {
    const series = buildReviewSeries({ now: NOW, weeks: 2, transactions: [], adversaries: [] });
    const target = calibratedTarget(series);
    expect(target.mode).toBe('start');
    expect(target.historyWeeks).toBe(0);
    expect(target.message).not.toContain('NaN');
  });

  it('calibre sur la médiane des semaines achevées', () => {
    const series = buildReviewSeries({
      now: NOW,
      weeks: 4,
      transactions: [tx(50_000, DAY_MS, 'income')],
      adversaries: [
        // semaine en cours
        win(DAY_MS),
        // semaine -1
        win(8 * DAY_MS),
        win(9 * DAY_MS),
        // semaine -2
        win(15 * DAY_MS),
        loss(16 * DAY_MS),
        // semaine -3
        win(22 * DAY_MS),
        win(23 * DAY_MS),
      ],
    });
    const target = calibratedTarget(series);
    expect(target.historyWeeks).toBe(3);
    expect(target.target).toBeGreaterThanOrEqual(10);
    expect(target.target).toBeLessThanOrEqual(95);
    expect(target.current).toBe(series[series.length - 1].score.value);
    expect(target.gap).toBe(target.current - target.target);
  });

  it('signale l’objectif tenu quand la semaine dépasse l’historique', () => {
    // Semaine passée faible : une défaite et une dépense, zéro entrée.
    const weakPast = buildReview({
      period: 7,
      now: NOW - WEEK_MS,
      transactions: [tx(5_000, 8 * DAY_MS, 'expense')],
      adversaries: [loss(8 * DAY_MS)],
    });
    // Semaine en cours très forte : 6 victoires, entrée sans dépense.
    const strongNow = buildReview({
      period: 7,
      now: NOW,
      transactions: [tx(100_000, DAY_MS, 'income')],
      adversaries: [1, 2, 3, 4, 5, 6].map((d) => win(d * DAY_MS)),
    });
    const target = calibratedTarget([weakPast, strongNow]);
    expect(target.historyWeeks).toBe(1);
    expect(target.reached).toBe(true);
    expect(target.gap).toBeGreaterThanOrEqual(0);
    expect(target.message).toContain('Objectif tenu');
  });

  it('signale le retard quand la semaine décroche', () => {
    const strongPast = buildReview({
      period: 7,
      now: NOW - WEEK_MS,
      transactions: [tx(100_000, 8 * DAY_MS, 'income')],
      adversaries: [8, 9, 10, 11, 12, 13].map((d) => win(d * DAY_MS)),
    });
    const weakNow = buildReview({
      period: 7,
      now: NOW,
      transactions: [tx(5_000, DAY_MS, 'expense')],
      adversaries: [loss(DAY_MS)],
    });
    const target = calibratedTarget([strongPast, weakNow]);
    expect(target.reached).toBe(false);
    expect(target.gap).toBeLessThan(0);
    expect(target.message).toContain('Il manque');
  });

  it('ne dépasse jamais 95 pour rester atteignable', () => {
    const perfect = Array.from({ length: 5 }, (_, index) =>
      buildReview({
        period: 7,
        now: NOW - index * WEEK_MS,
        transactions: [tx(200_000, DAY_MS + index * WEEK_MS, 'income')],
        adversaries: Array.from({ length: 7 }, (_, day) => win(day * DAY_MS + index * WEEK_MS)),
      }),
    );
    expect(calibratedTarget(perfect).target).toBeLessThanOrEqual(95);
  });

  it('reste lisible et sans valeur technique', () => {
    const series = buildReviewSeries({ now: NOW, weeks: 3, transactions: [], adversaries: [win(DAY_MS)] });
    const target = calibratedTarget(series);
    expect(target.message).not.toContain('undefined');
    expect(target.message).not.toContain('NaN');
  });
});

describe('scoreSeries', () => {
  it('nomme la dernière semaine « Cette sem. »', () => {
    const series = buildReviewSeries({ now: NOW, weeks: 3, transactions: [], adversaries: [] });
    const points = scoreSeries(series);
    expect(points).toHaveLength(3);
    expect(points[2].label).toBe('Cette sem.');
    expect(points[0].label).toBe('S-2');
    expect(points[1].label).toBe('S-1');
  });

  it('reprend les scores réels', () => {
    const series = buildReviewSeries({ now: NOW, weeks: 2, transactions: [], adversaries: [win(DAY_MS)] });
    const points = scoreSeries(series);
    expect(points[1].value).toBe(series[1].score.value);
  });
});
