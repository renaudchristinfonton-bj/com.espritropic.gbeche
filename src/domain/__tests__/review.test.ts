/**
 * Tests du moteur de bilan — tout est pur : on fixe la date de référence.
 */
import { DAY_MS } from '../review';
import {
  actionsOf,
  buildReview,
  buildReviewText,
  dayKey,
  insightsOf,
  intensityOf,
  previousWindow,
  relativeDelta,
  reviewWindow,
  scoreOf,
  startOfDay,
  type ReviewKpi,
} from '../review';
import type { AdversaryRow, TransactionRow } from '@/src/db/types';
import type { BudgetWithSpent } from '@/src/db/repositories/budgets.repo';

const NOW = new Date(2026, 10, 6, 12, 0, 0).getTime(); // 6 novembre 2026, midi

let seq = 0;
function tx(partial: Partial<TransactionRow> & { amount: number; timestamp: number }): TransactionRow {
  seq += 1;
  return {
    id: `tx-${seq}`,
    account_id: 'acc-1',
    amount: partial.amount,
    type: partial.type ?? (partial.amount >= 0 ? 'income' : 'expense'),
    category: partial.category ?? 'food',
    label: partial.label ?? 'mouvement',
    note: '',
    is_recurring: 0,
    timestamp: partial.timestamp,
    created_at: partial.timestamp,
  };
}

function adv(partial: Partial<AdversaryRow> & { scheduled_at: number; status: AdversaryRow['status'] }): AdversaryRow {
  seq += 1;
  return {
    id: `adv-${seq}`,
    template_id: null,
    battle_id: 'battle-1',
    war_id: 'war-1',
    title: 'mission',
    xp_reward: 10,
    scheduled_at: partial.scheduled_at,
    hour: 7,
    minute: 30,
    duration_min: 15,
    status: partial.status,
    completed_at: null,
    created_at: partial.scheduled_at,
    updated_at: partial.scheduled_at,
  };
}

function budget(category: string, amount: number, spent: number): BudgetWithSpent {
  return {
    id: `b-${category}`,
    category,
    amount,
    period: 'monthly',
    month: '2026-11',
    created_at: NOW,
    spent,
  };
}

const budgetLine = (category: string, amount: number, spent: number) => ({
  category,
  label: category,
  amount,
  spent,
  ratio: amount > 0 ? spent / amount : 0,
  over: spent > amount,
});

const kpiOf = (over: Partial<ReviewKpi> = {}): ReviewKpi => ({
  income: 100_000,
  expense: 60_000,
  net: 40_000,
  savingsRate: 0.4,
  wins: 8,
  losses: 2,
  pending: 1,
  completionRate: 0.8,
  transactions: 14,
  activeDays: 6,
  avgDailyExpense: 60_000 / 7,
  biggestExpense: 20_000,
  ...over,
});

describe('fenêtres de période', () => {
  it('couvre 7 jours entiers, dernier jour inclus, à partir de minuit', () => {
    const w = reviewWindow(NOW, 7);
    expect(new Date(w.from).getHours()).toBe(0);
    expect(w.to).toBe(NOW);
    expect(Math.round((startOfDay(NOW) - w.from) / DAY_MS)).toBe(6);
  });

  it('enchaîne la période précédente sans chevauchement', () => {
    const w = reviewWindow(NOW, 30);
    const p = previousWindow(w, 30);
    expect(p.to).toBe(w.from - 1);
    expect(Math.round((w.from - p.from) / DAY_MS)).toBe(30);
  });

  it('produit des clés de jour stables', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 0, 0).getTime())).toBe('2026-12-31');
  });
});

describe('intensité de la carte de chaleur', () => {
  it('suit les paliers 0 → 4', () => {
    expect([0, 1, 2, 3, 4, 9].map(intensityOf)).toEqual([0, 1, 2, 3, 3, 4]);
  });
});

describe('variation relative', () => {
  it('calcule une hausse et une baisse', () => {
    expect(relativeDelta(120, 100)).toBeCloseTo(0.2);
    expect(relativeDelta(80, 100)).toBeCloseTo(-0.2);
  });

  it('renvoie 0 quand les deux valeurs sont nulles', () => {
    expect(relativeDelta(0, 0)).toBe(0);
  });

  it('renvoie null sans base de comparaison', () => {
    expect(relativeDelta(500, 0)).toBeNull();
    expect(relativeDelta(Number.NaN, 10)).toBeNull();
  });
});

describe('agrégation du bilan', () => {
  const review = buildReview({
    period: 7,
    now: NOW,
    transactions: [
      tx({ amount: 50_000, timestamp: NOW - 2 * DAY_MS, type: 'income', category: 'salary' }),
      tx({ amount: -20_000, timestamp: NOW - 2 * DAY_MS, type: 'expense', category: 'food' }),
      tx({ amount: -5_000, timestamp: NOW - 1 * DAY_MS, type: 'expense', category: 'food' }),
      tx({ amount: -5_000, timestamp: NOW - 1 * DAY_MS, type: 'expense', category: 'transport' }),
      // Hors période : ne doit pas compter dans les indicateurs.
      tx({ amount: -99_000, timestamp: NOW - 20 * DAY_MS, type: 'expense' }),
      // Virement interne : jamais une dépense.
      tx({ amount: -70_000, timestamp: NOW - 1 * DAY_MS, type: 'transfer', category: 'other' }),
    ],
    adversaries: [
      adv({ scheduled_at: NOW - 2 * DAY_MS, status: 'won' }),
      adv({ scheduled_at: NOW - 1 * DAY_MS, status: 'won' }),
      adv({ scheduled_at: NOW - 1 * DAY_MS, status: 'lost' }),
      adv({ scheduled_at: NOW, status: 'pending' }),
      adv({ scheduled_at: NOW - 30 * DAY_MS, status: 'lost' }),
    ],
    budgets: [budget('food', 20_000, 25_000), budget('transport', 30_000, 5_000)],
    profile: { streak: 5, level: 3 },
  });

  it('ignore les virements et l’historique hors période', () => {
    expect(review.kpi.income).toBe(50_000);
    expect(review.kpi.expense).toBe(30_000);
    expect(review.kpi.net).toBe(20_000);
    expect(review.kpi.transactions).toBe(4);
    expect(review.kpi.biggestExpense).toBe(20_000);
  });

  it('calcule le taux d’épargne', () => {
    expect(review.kpi.savingsRate).toBeCloseTo(0.4);
  });

  it('compte les missions et le taux de réussite', () => {
    expect(review.kpi.wins).toBe(2);
    expect(review.kpi.losses).toBe(1);
    expect(review.kpi.pending).toBe(1);
    expect(review.kpi.completionRate).toBeCloseTo(2 / 3);
  });

  it('trie les catégories et répartit les parts', () => {
    expect(review.categories.map((c) => c.id)).toEqual(['food', 'transport']);
    expect(review.categories[0].amount).toBe(25_000);
    expect(review.categories[0].share).toBeCloseTo(25_000 / 30_000);
    expect(review.categories[0].label).toBe('Alimentation');
  });

  it('produit exactement 7 jours, du plus ancien au plus récent', () => {
    expect(review.days).toHaveLength(7);
    expect(review.days[6].date).toBe(dayKey(NOW));
    // Aujourd'hui : une seule mission, encore en attente → aucun acte accompli.
    expect(review.days[6].actions).toBe(0);
    // Hier : 2 mouvements financiers + 1 victoire.
    expect(review.days[5].actions).toBe(3);
    expect(review.days[5].intensity).toBe(3);
    expect(review.heat).toHaveLength(7);
  });

  it('compte les jours actifs', () => {
    // J-2 et J-1 ont des actes accomplis ; aujourd'hui n'a qu'une mission à mener.
    expect(review.kpi.activeDays).toBe(2);
  });

  it('marque les budgets dépassés', () => {
    expect(review.budgets[0].category).toBe('food');
    expect(review.budgets[0].over).toBe(true);
    expect(review.budgets[1].over).toBe(false);
  });

  it('classe le dépassement de budget en tête des actions', () => {
    expect(review.actions[0].id).toBe('fix-budget');
    expect(review.actions.length).toBeLessThanOrEqual(4);
  });

  it('produit un constat sur la concentration des dépenses', () => {
    expect(review.insights.some((i) => i.id === 'category-concentration')).toBe(true);
  });

  it('garde un score dans les bornes', () => {
    expect(review.score.value).toBeGreaterThanOrEqual(0);
    expect(review.score.value).toBeLessThanOrEqual(100);
    expect(review.score.grade).toBeTruthy();
  });
});

describe('bilan vide', () => {
  const review = buildReview({ period: 7, now: NOW, transactions: [], adversaries: [] });

  it('ne produit ni division par zéro ni valeur non finie', () => {
    expect(review.kpi.savingsRate).toBeNull();
    expect(review.kpi.completionRate).toBeNull();
    expect(Number.isFinite(review.kpi.net)).toBe(true);
    expect(review.score.value).toBeGreaterThanOrEqual(0);
  });

  it('affiche un message d’amorçage', () => {
    expect(review.headline).toContain("Rien d'enregistré");
  });

  it('propose malgré tout une action utile', () => {
    expect(review.actions.length).toBeGreaterThan(0);
    expect(review.actions.some((a) => a.id === 'plan-week')).toBe(true);
  });

  it('garde un résumé exportable sans trou', () => {
    const text = buildReviewText(review);
    expect(text).toContain('BILAN GBECHE');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('NaN');
  });
});

describe('score', () => {
  it('récompense une période pleine', () => {
    const perfect = scoreOf({ kpi: kpiOf({ savingsRate: 0.5, activeDays: 7, wins: 10, losses: 0 }), days: 7, previousWins: 2 });
    expect(perfect.value).toBeGreaterThanOrEqual(85);
    expect(perfect.grade).toBe('Légendaire');
    expect(perfect.components.consistency).toBe(100);
    expect(perfect.components.savings).toBe(100);
  });

  it('reste neutre sans matière', () => {
    const neutral = scoreOf({
      kpi: kpiOf({ income: 0, expense: 0, net: 0, savingsRate: null, wins: 0, losses: 0, activeDays: 0, completionRate: null }),
      days: 7,
      previousWins: 0,
    });
    expect(neutral.components.consistency).toBe(50);
    expect(neutral.components.savings).toBe(50);
    expect(neutral.components.momentum).toBe(50);
    expect(neutral.value).toBeGreaterThan(0);
    expect(neutral.value).toBeLessThan(40);
  });

  it('punit la contre-performance sans sortir des bornes', () => {
    const bad = scoreOf({
      kpi: kpiOf({ wins: 1, losses: 9, completionRate: 0.1, savingsRate: -0.5, activeDays: 0 }),
      days: 7,
      previousWins: 20,
    });
    expect(bad.value).toBeGreaterThanOrEqual(0);
    expect(bad.components.momentum).toBeLessThan(10);
  });

  it('classe les paliers de grade', () => {
    const grades = [0.1, 0.4, 0.6, 0.75, 0.95].map((ratio) =>
      scoreOf({ kpi: kpiOf({ wins: ratio * 10, losses: 10 - ratio * 10, savingsRate: ratio, activeDays: ratio * 7 }), days: 7, previousWins: 5 }).grade,
    );
    expect(new Set(grades).size).toBeGreaterThanOrEqual(3);
  });
});

describe('constats', () => {
  const noBudget: BudgetWithSpent[] = [];

  it('alerte quand les sorties dépassent les entrées', () => {
    const insights = insightsOf({
      kpi: kpiOf({ income: 10_000, expense: 15_000, net: -5_000, savingsRate: -0.5 }),
      delta: { net: null, expense: null, wins: null },
      categories: [],
      budgets: [],
      days: 7,
    });
    expect(insights.some((i) => i.id === 'savings-negative' && i.tone === 'warn')).toBe(true);
  });

  it('salue une discipline solide', () => {
    const insights = insightsOf({
      kpi: kpiOf({ wins: 9, losses: 1, completionRate: 0.9 }),
      delta: { net: null, expense: null, wins: null },
      categories: [],
      budgets: noBudget.length ? [] : [],
      days: 7,
    });
    expect(insights.some((i) => i.id === 'discipline-strong')).toBe(true);
  });

  it('signale une hausse de dépenses de 15 % ou plus', () => {
    const insights = insightsOf({
      kpi: kpiOf(),
      delta: { net: null, expense: 0.2, wins: null },
      categories: [],
      budgets: [],
      days: 30,
    });
    expect(insights.some((i) => i.id === 'expense-up' && i.tone === 'warn')).toBe(true);
  });

  it('ne signale rien pour une variation marginale', () => {
    const insights = insightsOf({
      kpi: kpiOf({ income: 0, expense: 0, net: 0, savingsRate: null, wins: 0, losses: 0, pending: 0, completionRate: null }),
      delta: { net: null, expense: 0.05, wins: null },
      categories: [],
      budgets: [],
      days: 7,
    });
    expect(insights.some((i) => i.id === 'expense-up')).toBe(false);
  });

  it('plafonne à cinq constats pour rester lisible', () => {
    const insights = insightsOf({
      kpi: kpiOf({ net: -1, savingsRate: -0.1, wins: 1, losses: 9, completionRate: 0.1 }),
      delta: { net: null, expense: 0.5, wins: null },
      categories: [{ id: 'food', label: 'Alimentation', icon: 'restaurant', color: '#fff', amount: 9_000, share: 0.9, count: 4 }],
      budgets: [budgetLine('food', 1000, 5000)],
      profile: { streak: 6 },
      days: 30,
    });
    expect(insights.length).toBeLessThanOrEqual(5);
    expect(insights.every((i) => i.title.length > 0 && i.body.length > 0)).toBe(true);
  });
});

describe('actions', () => {
  it('priorise les missions en attente', () => {
    const actions = actionsOf({ kpi: kpiOf({ pending: 3 }), budgets: [] });
    expect(actions[0].id).toBe('finish-today');
    expect(actions[0].subtitle).toContain('3 missions');
  });

  it('propose d’épargner quand la marge est faible', () => {
    const actions = actionsOf({ kpi: kpiOf({ savingsRate: 0.02 }), budgets: [] });
    expect(actions.some((a) => a.id === 'save-more')).toBe(true);
  });

  it('ne propose jamais plus de quatre actions', () => {
    const actions = actionsOf({
      kpi: kpiOf({ pending: 2, savingsRate: 0, completionRate: 0.2 }),
      budgets: [budgetLine('food', 100, 500)],
    });
    expect(actions).toHaveLength(4);
  });
});

describe('comparaison avec la période précédente', () => {
  it('mesure la baisse des dépenses', () => {
    const review = buildReview({
      period: 7,
      now: NOW,
      transactions: [
        tx({ amount: -10_000, timestamp: NOW - 1 * DAY_MS, type: 'expense' }),
        tx({ amount: -40_000, timestamp: NOW - 9 * DAY_MS, type: 'expense' }),
      ],
      adversaries: [],
    });
    expect(review.delta.expense).toBeCloseTo(-0.75);
    expect(review.window.from).toBeGreaterThan(review.previous.from);
  });

  it('mesure la progression des victoires', () => {
    const review = buildReview({
      period: 7,
      now: NOW,
      transactions: [],
      adversaries: [
        adv({ scheduled_at: NOW - DAY_MS, status: 'won' }),
        adv({ scheduled_at: NOW - DAY_MS, status: 'won' }),
        adv({ scheduled_at: NOW - 8 * DAY_MS, status: 'won' }),
      ],
    });
    expect(review.delta.wins).toBeCloseTo(1);
  });
});

describe('résumé texte', () => {
  it('reprend les chiffres clés et les constats', () => {
    const review = buildReview({
      period: 30,
      now: NOW,
      transactions: [
        tx({ amount: 100_000, timestamp: NOW - 3 * DAY_MS, type: 'income' }),
        tx({ amount: -30_000, timestamp: NOW - 2 * DAY_MS, type: 'expense', category: 'food' }),
      ],
      adversaries: [adv({ scheduled_at: NOW - DAY_MS, status: 'won' })],
    });
    const text = buildReviewText(review);
    expect(text).toContain('BILAN GBECHE — 30 derniers jours');
    expect(text).toContain('Score :');
    expect(text).toContain('Top dépenses');
    expect(text).toContain('Généré hors-ligne');
  });
});

describe('priorité des constats', () => {
  it('garde les alertes quand la limite de cinq est atteinte', () => {
    const review = buildReview({
      period: 30,
      now: NOW,
      transactions: [
        tx({ amount: 100_000, timestamp: NOW - 2 * DAY_MS, type: 'income' }),
        tx({ amount: -95_000, timestamp: NOW - 2 * DAY_MS, type: 'expense', category: 'food' }),
      ],
      adversaries: [
        adv({ scheduled_at: NOW - DAY_MS, status: 'won' }),
        adv({ scheduled_at: NOW - DAY_MS, status: 'lost' }),
        adv({ scheduled_at: NOW - 2 * DAY_MS, status: 'lost' }),
      ],
      budgets: [budget('food', 10_000, 95_000)],
      profile: { streak: 8 },
    });
    const tones = review.insights.map((insight) => insight.tone);
    expect(review.insights.length).toBeLessThanOrEqual(5);
    // Toutes les alertes disponibles doivent survivre à la troncature.
    const warnCount = review.insights.filter((i) => i.tone === 'warn').length;
    expect(warnCount).toBeGreaterThan(0);
    expect(tones[0]).toBe('warn');
    expect(review.insights.some((i) => i.id === 'budget-overrun')).toBe(true);
  });

  it('ne dépasse jamais cinq constats même avec beaucoup de matière', () => {
    const review = buildReview({
      period: 30,
      now: NOW,
      transactions: [
        tx({ amount: 500_000, timestamp: NOW - DAY_MS, type: 'income' }),
        tx({ amount: -400_000, timestamp: NOW - DAY_MS, type: 'expense' }),
        tx({ amount: -100_000, timestamp: NOW - 2 * DAY_MS, type: 'expense' }),
      ],
      adversaries: [1, 2, 3, 4, 5].map((d) => adv({ scheduled_at: NOW - d * DAY_MS, status: 'lost' })),
      budgets: [budget('food', 1000, 5000), budget('transport', 1000, 3000)],
      profile: { streak: 10 },
    });
    expect(review.insights.length).toBe(5);
  });
});
