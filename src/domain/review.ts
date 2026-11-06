/**
 * GBECHE — Moteur de bilan (pur, déterministe, sans accès base).
 *
 * Toutes les fonctions sont pures : on leur passe des lignes déjà lues et
 * une date de référence. Elles ne lisent ni l'horloge ni SQLite, ce qui
 * rend les résultats reproductibles et testables au centime près.
 *
 * Le bilan répond à trois questions :
 *   1. Où j'en suis ?      → indicateurs de la période et comparaison
 *   2. Qu'est-ce que ça dit ? → constats (insights) déterministes
 *   3. Je fais quoi après ? → actions classées par priorité
 */

import type { AdversaryRow, GamificationRow, TransactionRow, WarRow } from '@/src/db/types';
import type { BudgetWithSpent } from '@/src/db/repositories/budgets.repo';
import { getCategory } from '@/src/domain/catalog';
import { formatCompact, formatCurrency } from '@/src/services/format';
import { DAY_MS, dayKeyToMs, lastDayKeys, startOfDayMs, toDayKey } from '@/src/utils/dayKey';

export { DAY_MS };
/** Alias historique — même comportement que `startOfDayMs`. */
export const startOfDay = startOfDayMs;
/** Alias historique — même comportement que `toDayKey` (jour local). */
export const dayKey = toDayKey;

/** Périodes proposées par l'écran Bilan. */
export const REVIEW_PERIODS = [7, 30, 90] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

export interface ReviewWindow {
  /** Premier jour inclus (00:00 locale). */
  from: number;
  /** Dernier instant inclus. */
  to: number;
}

export interface ReviewCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  /** Part des dépenses de la période, 0..1. */
  share: number;
  count: number;
}

export interface ReviewDay {
  /** Clé locale YYYY-MM-DD. */
  date: string;
  dayStart: number;
  income: number;
  expense: number;
  wins: number;
  /** Actions terminées ce jour (missions gagnées + mouvements financiers). */
  actions: number;
  /** Intensité 0..4 pour la carte de chaleur. */
  intensity: number;
}

export interface ReviewKpi {
  income: number;
  expense: number;
  net: number;
  /** Épargne nette / entrées, null si aucune entrée. */
  savingsRate: number | null;
  wins: number;
  losses: number;
  pending: number;
  /** Missions gagnées / missions tranchées, null si rien de tranché. */
  completionRate: number | null;
  transactions: number;
  activeDays: number;
  /** Moyenne des dépenses par jour calendaire de la période. */
  avgDailyExpense: number;
  /** Plus grosse dépense de la période. */
  biggestExpense: number;
}

export interface ReviewDelta {
  net: number | null;
  expense: number | null;
  wins: number | null;
}

export type InsightTone = 'good' | 'warn' | 'info';

export interface ReviewInsight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  icon: string;
}

export interface ReviewAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  /** Route expo-router (toujours locale, jamais de lien externe). */
  route: string;
  accent: 'primary' | 'success' | 'danger' | 'warning' | 'xp';
}

export interface ReviewScore {
  /** 0..100. */
  value: number;
  grade: string;
  label: string;
  components: {
    consistency: number;
    regularity: number;
    savings: number;
    momentum: number;
  };
}

export interface ReviewBudgetLine {
  category: string;
  label: string;
  amount: number;
  spent: number;
  /** 0..1+ (1 = plafond atteint). */
  ratio: number;
  over: boolean;
}

export interface Review {
  period: ReviewPeriod;
  window: ReviewWindow;
  previous: ReviewWindow;
  kpi: ReviewKpi;
  delta: ReviewDelta;
  categories: ReviewCategory[];
  days: ReviewDay[];
  heat: { date: string; value: number }[];
  budgets: ReviewBudgetLine[];
  /** Répartition des missions par guerre sur la période. */
  wars: ReviewWarLine[];
  score: ReviewScore;
  headline: string;
  insights: ReviewInsight[];
  actions: ReviewAction[];
}

export interface ReviewInput {
  period: ReviewPeriod;
  now: number;
  transactions: TransactionRow[];
  adversaries: AdversaryRow[];
  budgets?: BudgetWithSpent[];
  profile?: Partial<Pick<GamificationRow, 'streak' | 'level' | 'xp' | 'wins' | 'best_combo'>> | null;
  /** Catalogue des guerres, pour nommer et colorer la répartition. */
  wars?: WarRow[];
}

// ─── Utilitaires de dates ────────────────────────────────

/**
 * Période demandée en langage naturel (« bilan de la semaine », « du mois »,
 * « du trimestre », « 30 derniers jours »). null quand la phrase ne précise
 * aucune durée : l'appelant garde alors son bilan par défaut.
 */
export function periodFromText(raw: string): ReviewPeriod | null {
  const text = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/trimestre|\b90\b|trois mois/.test(text)) return 90;
  if (/\b30\b|mois|mensuel/.test(text)) return 30;
  if (/\b7\b|semaine|hebdo/.test(text)) return 7;
  return null;
}

/** Fenêtre glissante de `days` jours se terminant à `now` (dernier jour inclus). */
export function reviewWindow(now: number, days: number): ReviewWindow {
  const to = now;
  const from = startOfDayMs(now) - (days - 1) * DAY_MS;
  return { from, to };
}

export function previousWindow(window: ReviewWindow, days: number): ReviewWindow {
  return { from: window.from - days * DAY_MS, to: window.from - 1 };
}

const inWindow = (ms: number, w: ReviewWindow): boolean => ms >= w.from && ms <= w.to;

// ─── Agrégation ──────────────────────────────────────────

interface FlowTotals {
  income: number;
  expense: number;
  transactions: number;
  biggestExpense: number;
}

function flowOf(transactions: TransactionRow[], w: ReviewWindow): FlowTotals {
  let income = 0;
  let expense = 0;
  let count = 0;
  let biggestExpense = 0;
  for (const tx of transactions) {
    // Un virement entre ses propres comptes n'est ni une entrée ni une sortie.
    if (tx.type === 'transfer') continue;
    if (!inWindow(tx.timestamp, w)) continue;
    count += 1;
    if (tx.type === 'income') {
      income += Math.abs(tx.amount);
    } else {
      const value = Math.abs(tx.amount);
      expense += value;
      if (value > biggestExpense) biggestExpense = value;
    }
  }
  return { income, expense, transactions: count, biggestExpense };
}

interface MissionTotals {
  wins: number;
  losses: number;
  pending: number;
}

function missionsOf(adversaries: AdversaryRow[], w: ReviewWindow): MissionTotals {
  let wins = 0;
  let losses = 0;
  let pending = 0;
  for (const row of adversaries) {
    if (!inWindow(row.scheduled_at, w)) continue;
    if (row.status === 'won') wins += 1;
    else if (row.status === 'lost') losses += 1;
    else pending += 1;
  }
  return { wins, losses, pending };
}

function toCategories(transactions: TransactionRow[], w: ReviewWindow): ReviewCategory[] {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!inWindow(tx.timestamp, w)) continue;
    const amount = Math.abs(tx.amount);
    const current = map.get(tx.category) ?? { amount: 0, count: 0 };
    map.set(tx.category, { amount: current.amount + amount, count: current.count + 1 });
    total += amount;
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const meta = getCategory(id);
      return {
        id,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        amount: value.amount,
        count: value.count,
        share: total > 0 ? value.amount / total : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function toDays(
  transactions: TransactionRow[],
  adversaries: AdversaryRow[],
  w: ReviewWindow,
  days: number,
): ReviewDay[] {
  const buckets = new Map<string, ReviewDay>();
  for (const date of lastDayKeys(w.to, days)) {
    const dayStart = dayKeyToMs(date) ?? startOfDayMs(w.to);
    buckets.set(date, {
      date,
      dayStart,
      income: 0,
      expense: 0,
      wins: 0,
      actions: 0,
      intensity: 0,
    });
  }
  for (const tx of transactions) {
    if (tx.type === 'transfer') continue;
    if (!inWindow(tx.timestamp, w)) continue;
    const bucket = buckets.get(toDayKey(tx.timestamp));
    if (!bucket) continue;
    if (tx.type === 'income') bucket.income += Math.abs(tx.amount);
    else bucket.expense += Math.abs(tx.amount);
    bucket.actions += 1;
  }
  for (const row of adversaries) {
    if (row.status !== 'won') continue;
    if (!inWindow(row.scheduled_at, w)) continue;
    const bucket = buckets.get(toDayKey(row.scheduled_at));
    if (!bucket) continue;
    bucket.wins += 1;
    bucket.actions += 1;
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    intensity: intensityOf(bucket.actions),
  }));
}

/** 0 action = 0, 5 actions ou plus = 4 (échelle de la carte de chaleur). */
export function intensityOf(actions: number): number {
  if (actions <= 0) return 0;
  if (actions === 1) return 1;
  if (actions === 2) return 2;
  if (actions <= 4) return 3;
  return 4;
}

function toBudgets(budgets: BudgetWithSpent[]): ReviewBudgetLine[] {
  return budgets
    .map((budget) => {
      const meta = getCategory(budget.category);
      const ratio = budget.amount > 0 ? budget.spent / budget.amount : 0;
      return {
        category: budget.category,
        label: meta.label,
        amount: budget.amount,
        spent: budget.spent,
        ratio,
        over: budget.spent > budget.amount,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Variation relative ; null quand la base de comparaison est absente ou nulle. */
export function relativeDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

// ─── Comparaison par guerre ──────────────────────────────

export interface ReviewWarLine {
  id: string;
  title: string;
  icon: string;
  color: string;
  wins: number;
  losses: number;
  pending: number;
  /** Missions planifiées sur la période, tous statuts confondus. */
  total: number;
  /** Victoires / missions tranchées ; null si rien n'a été tranché. */
  completionRate: number | null;
  /** XP effectivement gagnée sur la période (missions gagnées seulement). */
  xp: number;
  /** Part des victoires de la période, 0..1. */
  share: number;
}

/**
 * Répartit les missions de la période par guerre. Les guerres sans aucune
 * mission sont conservées si elles sont demandées explicitement, mais
 * l'affichage les ignore : une guerre vide n'est pas un échec.
 * Tri : taux de réussite décroissant, puis volume de victoires.
 */
export function warBreakdownOf(
  adversaries: AdversaryRow[],
  wars: WarRow[],
  w: ReviewWindow,
): ReviewWarLine[] {
  const byWar = new Map<string, { wins: number; losses: number; pending: number; xp: number }>();
  for (const row of adversaries) {
    if (!inWindow(row.scheduled_at, w)) continue;
    const bucket = byWar.get(row.war_id) ?? { wins: 0, losses: 0, pending: 0, xp: 0 };
    if (row.status === 'won') {
      bucket.wins += 1;
      // L'XP réellement créditée est celle de l'instance ; on ne la fabrique pas.
      bucket.xp += Math.max(0, row.xp_reward);
    } else if (row.status === 'lost') bucket.losses += 1;
    else bucket.pending += 1;
    byWar.set(row.war_id, bucket);
  }

  const totalWins = [...byWar.values()].reduce((sum, value) => sum + value.wins, 0);
  const titles = new Map(wars.map((war) => [war.id, war]));

  return [...byWar.entries()]
    .map(([id, value]) => {
      const war = titles.get(id);
      const decided = value.wins + value.losses;
      return {
        id,
        title: war?.title ?? 'Guerre archivée',
        icon: war?.icon ?? 'flag',
        color: war?.color ?? '#8E94A8',
        wins: value.wins,
        losses: value.losses,
        pending: value.pending,
        total: value.wins + value.losses + value.pending,
        completionRate: decided > 0 ? value.wins / decided : null,
        xp: value.xp,
        share: totalWins > 0 ? value.wins / totalWins : 0,
      };
    })
    .sort((a, b) => (b.completionRate ?? -1) - (a.completionRate ?? -1) || b.wins - a.wins);
}

/** Guerre la plus solide (assez de matière) et la plus fragile, ou null. */
export function warExtremes(lines: ReviewWarLine[]): {
  best: ReviewWarLine | null;
  weakest: ReviewWarLine | null;
} {
  const judged = lines.filter((line) => line.completionRate !== null && line.wins + line.losses >= 2);
  if (judged.length === 0) return { best: null, weakest: null };
  const best = judged[0];
  const weakest = judged[judged.length - 1];
  if (best.id === weakest.id) return { best, weakest: null };
  return { best, weakest };
}

// ─── Score ───────────────────────────────────────────────

/**
 * Score de la période sur 100, en quatre blocs :
 *   - consistance (40) : missions gagnées / missions tranchées
 *   - régularité  (25) : jours actifs rapportés à 60 % des jours de la période
 *   - épargne     (20) : 20 % d'épargne ou plus = note pleine
 *   - élan        (15) : victoires comparées à la période précédente
 * Les blocs sans matière (aucune mission tranchée, aucune entrée d'argent)
 * valent la moitié de leur poids : neutres, jamais punitifs.
 */
export function scoreOf(input: {
  kpi: ReviewKpi;
  days: number;
  previousWins: number;
}): ReviewScore {
  const { kpi, days, previousWins } = input;
  const decided = kpi.wins + kpi.losses;

  const consistency = decided === 0 ? 0.5 : clamp01(kpi.wins / decided);
  const regularity = clamp01(kpi.activeDays / Math.max(1, days * 0.6));
  const savings = kpi.savingsRate === null ? 0.5 : clamp01(kpi.savingsRate / 0.2);
  const momentum =
    previousWins === 0 && kpi.wins === 0
      ? 0.5
      : clamp01(0.5 + (kpi.wins - previousWins) / (2 * Math.max(1, previousWins)));

  const value = Math.round(
    consistency * 40 + regularity * 25 + savings * 20 + momentum * 15,
  );

  const grade =
    value >= 85
      ? 'Légendaire'
      : value >= 70
        ? 'Élite'
        : value >= 55
          ? 'Sergent'
          : value >= 40
            ? 'Soldat'
            : 'Recrue';

  return {
    value,
    grade,
    label: labelForScore(value),
    components: {
      consistency: Math.round(consistency * 100),
      regularity: Math.round(regularity * 100),
      savings: Math.round(savings * 100),
      momentum: Math.round(momentum * 100),
    },
  };
}

function labelForScore(value: number): string {
  if (value >= 85) return 'Discipline hors norme';
  if (value >= 70) return 'Rythme solide';
  if (value >= 55) return 'Ça avance';
  if (value >= 40) return 'Le moteur démarre';
  return 'Reprise en main';
}

// ─── Constats ────────────────────────────────────────────

const percent = (ratio: number): string => `${Math.round(ratio * 100)} %`;

export function insightsOf(input: {
  kpi: ReviewKpi;
  delta: ReviewDelta;
  categories: ReviewCategory[];
  budgets: ReviewBudgetLine[];
  profile?: ReviewInput['profile'];
  days: number;
  /** Optionnel : active les constats par guerre. */
  adversaries?: AdversaryRow[];
  wars?: WarRow[];
  window?: ReviewWindow;
}): ReviewInsight[] {
  const { kpi, delta, categories, budgets, profile, days } = input;
  const insights: ReviewInsight[] = [];
  const decided = kpi.wins + kpi.losses;

  // 1. Épargne
  if (kpi.income > 0 && kpi.savingsRate !== null) {
    if (kpi.savingsRate >= 0.2) {
      insights.push({
        id: 'savings-good',
        tone: 'good',
        icon: 'shield-checkmark',
        title: `Tu épargnes ${percent(kpi.savingsRate)} de tes entrées`,
        body: `Sur ${formatCurrency(kpi.income)} encaissés, il te reste ${formatCurrency(kpi.net)}. Garde ce rythme et tes projets se financent tout seuls.`,
      });
    } else if (kpi.net < 0) {
      insights.push({
        id: 'savings-negative',
        tone: 'warn',
        icon: 'alert-circle',
        title: 'Tes sorties dépassent tes entrées',
        body: `Déficit de ${formatCurrency(Math.abs(kpi.net))} sur la période. Repère la catégorie la plus lourde et coupe d'abord là.`,
      });
    } else {
      insights.push({
        id: 'savings-thin',
        tone: 'info',
        icon: 'trending-up',
        title: `Marge d'épargne : ${percent(kpi.savingsRate)}`,
        body: `Viser 15 à 20 % te mettrait à l'abri : il manque ${formatCurrency(Math.max(0, kpi.income * 0.2 - kpi.net))} sur cette période.`,
      });
    }
  } else if (kpi.expense > 0) {
    insights.push({
      id: 'no-income',
      tone: 'info',
      icon: 'information-circle',
      title: 'Aucune entrée enregistrée sur la période',
      body: `Tu as dépensé ${formatCurrency(kpi.expense)} sans revenu saisi. Enregistre aussi tes entrées pour un bilan fiable.`,
    });
  }

  // 2. Discipline
  if (decided >= 3) {
    const rate = kpi.completionRate ?? 0;
    if (rate >= 0.8) {
      insights.push({
        id: 'discipline-strong',
        tone: 'good',
        icon: 'barbell',
        title: `Discipline de fer : ${percent(rate)}`,
        body: `${kpi.wins} missions gagnées sur ${decided} tranchées. C'est exactement ce qui construit un niveau.`,
      });
    } else if (rate < 0.5) {
      insights.push({
        id: 'discipline-weak',
        tone: 'warn',
        icon: 'battery-half',
        title: `Moins d'une mission sur deux tenue (${percent(rate)})`,
        body: 'Réduis la taille de tes missions : trois petites victoires valent mieux qu’une grande abandonnée.',
      });
    }
  } else if (days >= 7) {
    insights.push({
      id: 'discipline-nodata',
      tone: 'info',
      icon: 'flag-outline',
      title: 'Pas encore de missions tranchées',
      body: 'Programme au moins une mission récurrente cette semaine pour que ton bilan mesure ta discipline.',
    });
  }

  // 3. Concentration des dépenses
  const top = categories[0];
  if (top && top.share >= 0.4 && kpi.expense > 0) {
    insights.push({
      id: 'category-concentration',
      tone: 'info',
      icon: 'pie-chart',
      title: `${top.label} pèse ${percent(top.share)} de tes dépenses`,
      body: `${formatCurrency(top.amount)} sur ${formatCurrency(kpi.expense)}, en ${top.count} mouvement${top.count > 1 ? 's' : ''}. C'est le levier numéro un si tu veux réduire.`,
    });
  }

  // 4. Tendance
  if (delta.expense !== null && Math.abs(delta.expense) >= 0.15) {
    const hausse = delta.expense > 0;
    insights.push({
      id: hausse ? 'expense-up' : 'expense-down',
      tone: hausse ? 'warn' : 'good',
      icon: hausse ? 'arrow-up-circle' : 'arrow-down-circle',
      title: hausse
        ? `Dépenses en hausse de ${percent(Math.abs(delta.expense))}`
        : `Dépenses en baisse de ${percent(Math.abs(delta.expense))}`,
      body: 'Comparé à la période précédente de même durée. Les virements entre comptes sont exclus du calcul.',
    });
  }

  // 5. Budgets
  const over = budgets.filter((b) => b.over);
  if (over.length > 0) {
    insights.push({
      id: 'budget-overrun',
      tone: 'warn',
      icon: 'warning',
      title: `${over.length} budget${over.length > 1 ? 's' : ''} dépassé${over.length > 1 ? 's' : ''}`,
      body: over
        .slice(0, 3)
        .map((b) => `${b.label} : ${formatCurrency(b.spent)} / ${formatCurrency(b.amount)}`)
        .join(' · '),
    });
  }

  // 6. Guerres : là où la discipline tient, et là où elle lâche.
  const warLines = input.window
    ? warBreakdownOf(input.adversaries ?? [], input.wars ?? [], input.window)
    : [];
  const { best, weakest } = warExtremes(warLines);
  if (best && best.completionRate !== null && best.completionRate >= 0.8) {
    insights.push({
      id: 'war-strongest',
      tone: 'good',
      icon: best.icon,
      title: `${best.title} : ${percent(best.completionRate)} de réussite`,
      body: `${best.wins} victoire${best.wins > 1 ? 's' : ''} sur ${best.wins + best.losses} missions tranchées, ${best.xp} XP gagnée${best.xp > 1 ? 's' : ''}. C'est ta guerre la plus solide, appuie-toi dessus.`,
    });
  }
  if (weakest && weakest.completionRate !== null && weakest.completionRate < 0.5) {
    insights.push({
      id: 'war-weakest',
      tone: 'warn',
      icon: weakest.icon,
      title: `${weakest.title} décroche (${percent(weakest.completionRate)})`,
      body: `${weakest.losses} mission${weakest.losses > 1 ? 's' : ''} perdue${weakest.losses > 1 ? 's' : ''} sur ${weakest.wins + weakest.losses} tranchées. Réduis la taille des missions de cette guerre avant de l'abandonner.`,
    });
  }

  // 7. Série
  const streak = profile?.streak ?? 0;
  if (streak >= 3) {
    insights.push({
      id: 'streak',
      tone: 'info',
      icon: 'flame',
      title: `Série de ${streak} jour${streak > 1 ? 's' : ''}`,
      body: 'Ne casse pas la chaîne : même une mission courte suffit à garder la série vivante.',
    });
  }

  return insights.slice(0, 5);
}

// ─── Prochaines actions ──────────────────────────────────

export function actionsOf(input: {
  kpi: ReviewKpi;
  budgets: ReviewBudgetLine[];
}): ReviewAction[] {
  const { kpi, budgets } = input;
  const actions: ReviewAction[] = [];

  const over = budgets.filter((b) => b.over);
  if (over.length > 0) {
    actions.push({
      id: 'fix-budget',
      title: 'Rééquilibrer un budget',
      subtitle: `${over[0].label} est à ${percent(over[0].ratio)} de son plafond`,
      icon: 'options',
      route: '/(app)/finance',
      accent: 'danger',
    });
  }

  if (kpi.pending > 0) {
    actions.push({
      id: 'finish-today',
      title: 'Finir les missions du jour',
      subtitle: `${kpi.pending} mission${kpi.pending > 1 ? 's' : ''} encore en attente`,
      icon: 'flash',
      route: '/(app)/home',
      accent: 'warning',
    });
  }

  if ((kpi.completionRate ?? 1) < 0.6 && kpi.wins + kpi.losses >= 2) {
    actions.push({
      id: 'smaller-missions',
      title: 'Rendre tes missions plus petites',
      subtitle: 'Vise 10 minutes : la régularité bat l’intensité',
      icon: 'resize',
      route: '/(app)/wars',
      accent: 'xp',
    });
  }

  if (kpi.income > 0 && (kpi.savingsRate ?? 0) < 0.1) {
    actions.push({
      id: 'save-more',
      title: 'Créer une enveloppe d’épargne',
      subtitle: 'Un objectif chiffré, un versement par semaine',
      icon: 'wallet',
      route: '/(app)/agent',
      accent: 'success',
    });
  }

  actions.push({
    id: 'plan-week',
    title: 'Planifier la semaine',
    subtitle: 'Pose tes missions maintenant, tu les subiras moins',
    icon: 'calendar',
    route: '/(app)/calendar',
    accent: 'primary',
  });

  return actions.slice(0, 4);
}

// ─── Entrée principale ───────────────────────────────────

export function buildReview(input: ReviewInput): Review {
  const { period, now, transactions, adversaries, budgets = [], profile = null } = input;
  const window = reviewWindow(now, period);
  const previous = previousWindow(window, period);

  const flow = flowOf(transactions, window);
  const before = flowOf(transactions, previous);
  const missions = missionsOf(adversaries, window);
  const missionsBefore = missionsOf(adversaries, previous);
  const days = toDays(transactions, adversaries, window, period);
  const categories = toCategories(transactions, window);
  const budgetLines = toBudgets(budgets);

  const net = flow.income - flow.expense;
  const decided = missions.wins + missions.losses;
  const activeDays = days.filter((d) => d.actions > 0).length;

  const kpi: ReviewKpi = {
    income: flow.income,
    expense: flow.expense,
    net,
    savingsRate: flow.income > 0 ? net / flow.income : null,
    wins: missions.wins,
    losses: missions.losses,
    pending: missions.pending,
    completionRate: decided > 0 ? missions.wins / decided : null,
    transactions: flow.transactions,
    activeDays,
    avgDailyExpense: flow.expense / period,
    biggestExpense: flow.biggestExpense,
  };

  const delta: ReviewDelta = {
    net: relativeDelta(net, before.income - before.expense),
    expense: relativeDelta(flow.expense, before.expense),
    wins: relativeDelta(missions.wins, missionsBefore.wins),
  };

  const score = scoreOf({ kpi, days: period, previousWins: missionsBefore.wins });
  const insights = insightsOf({
    kpi,
    delta,
    categories,
    budgets: budgetLines,
    profile,
    days: period,
    adversaries,
    wars: input.wars ?? [],
    window,
  });
  const actions = actionsOf({ kpi, budgets: budgetLines });
  const warLines = warBreakdownOf(adversaries, input.wars ?? [], window);

  return {
    period,
    window,
    previous,
    kpi,
    delta,
    categories,
    days,
    heat: days.map((d) => ({ date: d.date, value: d.intensity })),
    budgets: budgetLines,
    wars: warLines,
    score,
    headline: headlineOf(kpi, period),
    insights,
    actions,
  };
}

function headlineOf(kpi: ReviewKpi, period: number): string {
  const span = period === 7 ? 'cette semaine' : period === 30 ? 'ce mois' : 'ce trimestre';
  if (kpi.income === 0 && kpi.expense === 0 && kpi.wins === 0) {
    return `Rien d'enregistré ${span} — le premier mouvement lance la machine.`;
  }
  if (kpi.net < 0) {
    return `${formatCurrency(Math.abs(kpi.net))} de plus sortis que rentrés ${span}.`;
  }
  if (kpi.wins > 0 && kpi.net >= 0) {
    return `${kpi.wins} victoire${kpi.wins > 1 ? 's' : ''} et ${formatCompact(kpi.net)} FCFA gardés ${span}.`;
  }
  return `${formatCompact(kpi.expense)} FCFA dépensés ${span}.`;
}

// ─── Export texte (partage hors-ligne) ───────────────────

/** Résumé lisible, copiable ou partageable sans aucune connexion. */
export function buildReviewText(review: Review): string {
  const { kpi, score, period } = review;
  const lines: string[] = [];
  lines.push(`BILAN GBECHE — ${period} derniers jours`);
  lines.push(`Score : ${score.value}/100 (${score.grade}) — ${score.label}`);
  lines.push('');
  lines.push(`Entrées       : ${formatCurrency(kpi.income)}`);
  lines.push(`Sorties       : ${formatCurrency(kpi.expense)}`);
  lines.push(`Net           : ${formatCurrency(kpi.net)}`);
  if (kpi.savingsRate !== null) {
    lines.push(`Taux d'épargne : ${Math.round(kpi.savingsRate * 100)} %`);
  }
  const decided = kpi.wins + kpi.losses;
  lines.push(`Missions      : ${kpi.wins}/${decided} tenues, ${kpi.pending} en attente`);
  lines.push(`Jours actifs  : ${kpi.activeDays}/${period}`);
  if (review.categories.length > 0) {
    lines.push('');
    lines.push('Top dépenses :');
    for (const category of review.categories.slice(0, 3)) {
      lines.push(`  - ${category.label} : ${formatCurrency(category.amount)}`);
    }
  }
  const warLines = review.wars.filter((war) => war.total > 0);
  if (warLines.length > 0) {
    lines.push('');
    lines.push('Par guerre :');
    for (const war of warLines.slice(0, 5)) {
      const rate = war.completionRate === null ? '—' : `${Math.round(war.completionRate * 100)} %`;
      lines.push(`  - ${war.title} : ${war.wins} V / ${war.losses} D (${rate})`);
    }
  }
  if (review.insights.length > 0) {
    lines.push('');
    lines.push('Constats :');
    for (const insight of review.insights.slice(0, 3)) {
      lines.push(`  - ${insight.title}`);
    }
  }
  lines.push('');
  lines.push('Généré hors-ligne par GBECHE.');
  return lines.join('\n');
}
