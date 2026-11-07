/**
 * GBECHE — Exécution des actions proposées par l'agent.
 *
 * Le parseur (agentCommand.ts) produit des actions neutres ; ce service
 * les applique aux repositories réels et construit les bilans chiffrés
 * (journée, finances) à partir de la base, jamais de données inventées.
 * Tout reste local : aucune connexion réseau.
 */

import { listAccountsWithBalance, type AccountWithBalance } from '../../db/repositories/accounts.repo';
import {
  listInstancesForDay,
  getDayStats,
  type DayStats,
} from '../../db/repositories/adversaries.repo';
import { listBattlesByWar } from '../../db/repositories/battles.repo';
import type { BudgetWithSpent } from '../../db/repositories/budgets.repo';
import type { AdversaryRow, BattleRow, WarRow } from '../../db/types';
import {
  getMonthStats,
  getTodayExpense,
  getBudgets,
  getBalances,
  addMovement,
  addAccount,
  setBudget,
  type MonthStats,
} from '../finance.service';
import { addBattle, addQuickAdversary, addTemplate } from '../wars.service';
import { createWar, listWars } from '../../db/repositories/wars.repo';
import type { LifePlan } from './lifeProject.service';
import { winAdversary, getWarriorProfile } from '../gamification.service';
import { ACCOUNT_PRESETS } from '../../domain/catalog';
import { categoryLabel, formatFcfa, type AgentAction } from './agentCommand';

export interface AgentSnapshot {
  hasAccounts: boolean;
  balance: number;
  accounts: AccountWithBalance[];
  monthStats: MonthStats;
  budgets: BudgetWithSpent[];
  day: DayStats;
  pendingToday: AdversaryRow[];
  todayExpense: number;
  level: number;
  streak: number;
  wars: WarRow[];
}

export async function getAgentSnapshot(): Promise<AgentSnapshot> {
  const now = new Date();
  const [balances, monthStats, budgets, instances, day, todayExpense, profile, wars] =
    await Promise.all([
      getBalances(),
      getMonthStats(),
      getBudgets(),
      listInstancesForDay(now),
      getDayStats(now),
      getTodayExpense(),
      getWarriorProfile(),
      listWars(true),
    ]);

  return {
    hasAccounts: balances.accounts.length > 0,
    balance: balances.total,
    accounts: balances.accounts,
    monthStats,
    budgets,
    day,
    pendingToday: instances.filter((i) => i.status === 'pending' || i.status === 'rescheduled'),
    todayExpense,
    level: profile.level,
    streak: profile.streak,
    wars,
  };
}

export interface ExecutionResult {
  ok: boolean;
  message: string;
  /** Propose une action de rattrapage (ex. créer un compte avant une dépense). */
  recovery?: AgentAction;
}

export async function executeAgentAction(action: AgentAction): Promise<ExecutionResult> {
  switch (action.type) {
    case 'add-expense':
    case 'add-income':
      return executeMovement(action);

    case 'set-budget':
      await setBudget(action.category, action.amount);
      return {
        ok: true,
        message: `Budget ${categoryLabel(action.category)} enregistré : ${formatFcfa(action.amount)} par mois.`,
      };

    case 'add-mission':
      return executeAddMission(action);

    case 'complete-mission':
      return executeCompleteMission(action);

    case 'create-account':
      return executeCreateAccount(action);

    case 'create-life-plan':
      return executeLifePlan(action.plan);
  }
}

// ─── Mouvements financiers ─────────────────────────────────
async function executeMovement(
  action: Extract<AgentAction, { type: 'add-expense' | 'add-income' }>,
): Promise<ExecutionResult> {
  const accounts = await listAccountsWithBalance();
  if (accounts.length === 0) {
    return {
      ok: false,
      message:
        "Aucun compte financier n'existe encore. Crée d'abord un compte Cash, puis confirme ta saisie.",
      recovery: { type: 'create-account', name: 'Cash' },
    };
  }
  const target = accounts.find((a) => a.is_default) ?? accounts[0];
  await addMovement({
    accountId: target.id,
    type: action.type === 'add-expense' ? 'expense' : 'income',
    amount: action.amount,
    category: action.category,
    label: action.label,
  });
  const word = action.type === 'add-expense' ? 'dépense' : 'revenu';
  return {
    ok: true,
    message: `${word.charAt(0).toUpperCase() + word.slice(1)} de ${formatFcfa(action.amount)} (${action.label}) ajouté sur « ${target.name} ».`,
  };
}

// ─── Missions ──────────────────────────────────────────────
const QG_BATTLE_TITLE = 'Missions du QG';

async function executeAddMission(
  action: Extract<AgentAction, { type: 'add-mission' }>,
): Promise<ExecutionResult> {
  const wars = await listWars(true);
  const war = wars[0];
  if (!war) {
    return {
      ok: false,
      message: "Aucune guerre active n'existe. Crée d'abord un objectif dans l'onglet Guerres.",
    };
  }
  const existing = await listBattlesByWar(war.id);
  let battle: BattleRow | undefined = existing.find(
    (b) => b.title === QG_BATTLE_TITLE && b.status === 'active',
  );
  if (!battle) {
    const battleId = await addBattle({ warId: war.id, title: QG_BATTLE_TITLE, priority: 'low' });
    battle = { id: battleId } as BattleRow;
  }

  const when = new Date();
  if (action.when === 'tomorrow') when.setDate(when.getDate() + 1);
  when.setHours(action.hour, 0, 0, 0);

  await addQuickAdversary({ battleId: battle.id, title: action.title, scheduledAt: when });
  const dayLabel = action.when === 'tomorrow' ? 'demain' : "aujourd'hui";
  return {
    ok: true,
    message: `Mission « ${action.title} » planifiée ${dayLabel} à ${String(action.hour).padStart(2, '0')}h. Elle apparaît dans ton QG.`,
  };
}

async function executeCompleteMission(
  action: Extract<AgentAction, { type: 'complete-mission' }>,
): Promise<ExecutionResult> {
  const instances = await listInstancesForDay(new Date());
  const query = action.query.toLowerCase();
  const match = instances
    .filter((i) => i.status === 'pending' || i.status === 'rescheduled')
    .find((i) => {
      const title = i.title.toLowerCase();
      return title.includes(query) || query.includes(title);
    });

  if (!match) {
    const names = instances
      .filter((i) => i.status === 'pending' || i.status === 'rescheduled')
      .slice(0, 5)
      .map((i) => `• ${i.title}`)
      .join('\n');
    return {
      ok: true,
      message: names
        ? `Je n'ai pas trouvé de mission correspondante. Tes missions en cours aujourd'hui :\n${names}`
        : "Aucune mission en cours aujourd'hui : ajoutes-en une depuis le QG ou en me le demandant.",
    };
  }

  const result = await winAdversary(match.id);
  const levelUp = result.leveledUp ? ' Tu changes de niveau, félicitations !' : '';
  return {
    ok: true,
    message: `Mission « ${match.title} » gagnée (+${result.xpGained} XP, combo x${result.multiplier}).${levelUp}`,
  };
}

// ─── Comptes ───────────────────────────────────────────────
async function executeCreateAccount(
  action: Extract<AgentAction, { type: 'create-account' }>,
): Promise<ExecutionResult> {
  const preset =
    ACCOUNT_PRESETS.find((p) => p.name.toLowerCase() === action.name.toLowerCase()) ??
    ACCOUNT_PRESETS.find((p) => p.name === 'Cash')!;
  await addAccount({
    name: action.name,
    type: preset.type,
    icon: preset.icon,
    color: preset.color,
    initialBalance: 0,
  });
  return {
    ok: true,
    message: `Compte « ${action.name} » créé. Tu peux maintenant enregistrer tes mouvements dessus.`,
  };
}

// ─── Projets de vie (guerre complète + enveloppe d'épargne) ─
async function executeLifePlan(plan: LifePlan): Promise<ExecutionResult> {
  const warId = await createWar({
    title: plan.warTitle,
    icon: plan.icon,
    color: plan.color,
    domainType: plan.domainType,
  });

  const warnings: string[] = [];
  let missionTotal = 0;
  for (const battleSpec of plan.battles) {
    try {
      const battleId = await addBattle({
        warId,
        title: battleSpec.title,
        priority: battleSpec.priority,
      });
      for (const mission of battleSpec.missions) {
        await addTemplate({
          battleId,
          title: mission.title,
          frequency: mission.frequency,
          specificDays: mission.specificDays,
          hour: mission.hour,
          durationMin: mission.durationMin,
          startDate: new Date(),
        });
        missionTotal += 1;
      }
    } catch {
      warnings.push(`La bataille « ${battleSpec.title} » n'a pas pu être créée complètement.`);
    }
  }

  if (plan.savings) {
    await setBudget(plan.savings.category, plan.savings.monthlyAmount);
  }

  const lines: string[] = [
    `Guerre « ${plan.warTitle} » créée : ${plan.battles.length} bataille(s), ${missionTotal} mission(s) récurrente(s). Elles apparaissent dans ton agenda sur 45 jours glissants.`,
  ];
  if (plan.savings) {
    lines.push(
      `Budget d'épargne mensuel fixé à ${formatFcfa(plan.savings.monthlyAmount)} ` +
        `(objectif ${formatFcfa(plan.savings.targetAmount)} sur ${plan.savings.horizonMonths} mois).`,
    );
  }
  lines.push('Tout reste ajustable dans les écrans Guerres et Finances.');
  lines.push(...warnings);
  return { ok: true, message: lines.join('\n') };
}

// ─── Bilans purs (testables sans base) ─────────────────────
export function buildFinanceReview(s: Pick<AgentSnapshot, 'balance' | 'monthStats' | 'budgets'>): string {
  const lines: string[] = [];
  lines.push(`Solde total : ${formatFcfa(s.balance)}.`);
  lines.push(
    `Ce mois-ci : revenus ${formatFcfa(s.monthStats.income)}, dépenses ${formatFcfa(s.monthStats.expense)}, net ${formatFcfa(s.monthStats.balance)}.`,
  );

  if (s.budgets.length === 0) {
    lines.push(
      "Aucun budget mensuel défini : fixe un plafond par catégorie, par exemple « budget alimentation 30 000 FCFA ».",
    );
    return lines.join('\n');
  }

  const overrun = s.budgets.filter((b) => b.spent > b.amount);
  for (const b of s.budgets) {
    const remaining = b.amount - b.spent;
    const pct = Math.round((b.spent / b.amount) * 100);
    const flag = b.spent > b.amount ? '❌ dépassé' : pct >= 80 ? '⚠️ presque atteint' : '✅';
    lines.push(
      `${categoryLabel(b.category)} : ${formatFcfa(b.spent)} / ${formatFcfa(b.amount)} (${pct} %), reste ${formatFcfa(remaining)} ${flag}.`,
    );
  }
  if (overrun.length > 0) {
    lines.push(
      `Attention : ${overrun.length} catégorie(s) en dépassement. Recentre les prochaines dépenses sur l'essentiel jusqu'à la fin du mois.`,
    );
  } else {
    lines.push('Aucun dépassement : tu tiens tes plafonds, continue ainsi.');
  }
  return lines.join('\n');
}

export function buildDayReview(
  s: Pick<AgentSnapshot, 'day' | 'pendingToday' | 'todayExpense'>,
): string {
  const lines: string[] = [];
  lines.push(
    `Missions du jour : ${s.day.won} gagnée(s), ${s.day.pending} restante(s) sur ${s.day.total}.`,
  );
  if (s.pendingToday.length > 0) {
    lines.push(
      `À mener : ${s.pendingToday
        .slice(0, 5)
        .map((i) => i.title)
        .join(', ')}.`,
    );
  }
  lines.push(`Dépenses du jour : ${formatFcfa(s.todayExpense)}.`);
  if (s.day.pending === 0 && s.day.total > 0) {
    lines.push('Toutes tes missions sont gagnées : journée solide, garde ce rythme.');
  } else if (s.day.total === 0) {
    lines.push("Aucune mission programmée : ajoutes-en une en me l'énonçant simplement.");
  } else {
    lines.push('Attaque la plus courte d’abord pour lancer l’élan.');
  }
  return lines.join('\n');
}
