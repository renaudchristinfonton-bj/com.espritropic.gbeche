/* eslint-disable import/first */
/**
 * Tests du service d'exécution des actions de l'agent.
 * Les repositories et services de base sont mockés : on vérifie
 * l'orchestration et les messages, jamais de fausse donnée.
 */
jest.mock('../../../db/repositories/accounts.repo', () => ({
  listAccountsWithBalance: jest.fn(),
}));
jest.mock('../../../db/repositories/adversaries.repo', () => ({
  listInstancesForDay: jest.fn(),
  getDayStats: jest.fn(),
}));
jest.mock('../../../db/repositories/battles.repo', () => ({
  listBattlesByWar: jest.fn(),
}));
jest.mock('../../../db/repositories/wars.repo', () => ({
  listWars: jest.fn(),
}));
jest.mock('../../finance.service', () => ({
  getMonthStats: jest.fn(),
  getTodayExpense: jest.fn(),
  getBudgets: jest.fn(),
  getBalances: jest.fn(),
  addMovement: jest.fn(),
  addAccount: jest.fn(),
  setBudget: jest.fn(),
}));
jest.mock('../../wars.service', () => ({
  addBattle: jest.fn(),
  addQuickAdversary: jest.fn(),
}));
jest.mock('../../gamification.service', () => ({
  winAdversary: jest.fn(),
  getWarriorProfile: jest.fn(),
}));

import { listAccountsWithBalance } from '../../../db/repositories/accounts.repo';
import { listInstancesForDay } from '../../../db/repositories/adversaries.repo';
import { listBattlesByWar } from '../../../db/repositories/battles.repo';
import { listWars } from '../../../db/repositories/wars.repo';
import { addMovement, addAccount, setBudget } from '../../finance.service';
import { addBattle, addQuickAdversary } from '../../wars.service';
import { winAdversary } from '../../gamification.service';
import {
  buildDayReview,
  buildFinanceReview,
  executeAgentAction,
  type AgentSnapshot,
} from '../agentActions.service';

const mockAccount = {
  id: 'a1',
  name: 'Cash',
  type: 'cash',
  icon: 'cash',
  color: '#00FF88',
  initial_balance: 0,
  currency: 'XOF',
  is_default: 1,
  is_archived: 0,
  created_at: 0,
  updated_at: 0,
  balance: 5000,
};

beforeEach(() => {
  jest.clearAllMocks();
  (listAccountsWithBalance as jest.Mock).mockResolvedValue([mockAccount]);
});

describe('executeAgentAction — mouvements financiers', () => {
  test('dépense : écrit sur le compte par défaut', async () => {
    (addMovement as jest.Mock).mockResolvedValue('tx1');
    const result = await executeAgentAction({
      type: 'add-expense',
      amount: 2500,
      category: 'transport',
      label: 'Transport',
    });
    expect(result.ok).toBe(true);
    expect(addMovement).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'a1', type: 'expense', amount: 2500 }),
    );
    expect(result.message).toContain('2 500 FCFA');
  });

  test('revenu : type income et message adapté', async () => {
    (addMovement as jest.Mock).mockResolvedValue('tx2');
    const result = await executeAgentAction({
      type: 'add-income',
      amount: 25000,
      category: 'salary',
      label: 'Salaire',
    });
    expect(addMovement).toHaveBeenCalledWith(expect.objectContaining({ type: 'income' }));
    expect(result.message.toLowerCase()).toContain('revenu');
  });

  test('sans compte : propose une action de rattrapage', async () => {
    (listAccountsWithBalance as jest.Mock).mockResolvedValue([]);
    const result = await executeAgentAction({
      type: 'add-expense',
      amount: 1000,
      category: 'food',
      label: 'Alimentation',
    });
    expect(result.ok).toBe(false);
    expect(result.recovery).toEqual({ type: 'create-account', name: 'Cash' });
    expect(addMovement).not.toHaveBeenCalled();
  });

  test('budget : appelle setBudget avec le mois courant', async () => {
    const result = await executeAgentAction({
      type: 'set-budget',
      category: 'food',
      amount: 30000,
    });
    expect(result.ok).toBe(true);
    expect(setBudget).toHaveBeenCalledWith('food', 30000);
  });
});

describe('executeAgentAction — missions', () => {
  test('crée la bataille QG à la première mission puis planifie', async () => {
    (listWars as jest.Mock).mockResolvedValue([{ id: 'w1', title: 'Santé', is_active: 1 }]);
    (listBattlesByWar as jest.Mock).mockResolvedValue([]);
    (addBattle as jest.Mock).mockResolvedValue('b1');
    (addQuickAdversary as jest.Mock).mockResolvedValue('adv1');

    const result = await executeAgentAction({
      type: 'add-mission',
      title: 'Footing',
      when: 'tomorrow',
      hour: 7,
    });

    expect(addBattle).toHaveBeenCalledWith(
      expect.objectContaining({ warId: 'w1', title: 'Missions du QG' }),
    );
    expect(addQuickAdversary).toHaveBeenCalledWith(
      expect.objectContaining({ battleId: 'b1', title: 'Footing' }),
    );
    expect(result.message).toContain('demain');
    expect(result.message).toContain('07h');
  });

  test('gagne la mission correspondante et annonce l’XP', async () => {
    (listInstancesForDay as jest.Mock).mockResolvedValue([
      { id: 'i1', title: 'Footing', status: 'pending', xp_reward: 50 },
    ]);
    (winAdversary as jest.Mock).mockResolvedValue({
      xpGained: 50,
      multiplier: 1,
      combo: 1,
      leveledUp: false,
    });
    const result = await executeAgentAction({ type: 'complete-mission', query: 'footing' });
    expect(winAdversary).toHaveBeenCalledWith('i1');
    expect(result.message).toContain('Footing');
    expect(result.message).toContain('50 XP');
  });

  test('aucune correspondance : liste les missions en cours', async () => {
    (listInstancesForDay as jest.Mock).mockResolvedValue([
      { id: 'i1', title: 'Lecture', status: 'pending', xp_reward: 50 },
    ]);
    const result = await executeAgentAction({ type: 'complete-mission', query: 'natation' });
    expect(winAdversary).not.toHaveBeenCalled();
    expect(result.message).toContain('Lecture');
  });
});

describe('executeAgentAction — compte', () => {
  test('crée un compte Wave avec le preset de catalogue', async () => {
    (addAccount as jest.Mock).mockResolvedValue('acc1');
    const result = await executeAgentAction({ type: 'create-account', name: 'Wave' });
    expect(result.ok).toBe(true);
    expect(addAccount).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Wave', initialBalance: 0 }),
    );
  });
});

describe('buildFinanceReview — conseil sur chiffres réels', () => {
  const base = {
    balance: 120000,
    monthStats: { income: 200000, expense: 80000, balance: 120000, month: '2026-10' },
    budgets: [],
  } as Pick<AgentSnapshot, 'balance' | 'monthStats' | 'budgets'>;

  test('annonce solde, revenus, dépenses et net', () => {
    const text = buildFinanceReview(base);
    expect(text).toContain('120 000 FCFA');
    expect(text).toContain('200 000 FCFA');
    expect(text).toContain('80 000 FCFA');
  });

  test('suggère un budget quand aucun n’existe', () => {
    expect(buildFinanceReview(base)).toContain('Aucun budget');
  });

  test('détecte un dépassement de plafond', () => {
    const text = buildFinanceReview({
      ...base,
      budgets: [
        { id: 'b1', category: 'food', amount: 30000, period: 'monthly', month: '2026-10', created_at: 0, spent: 35000 },
      ],
    });
    expect(text).toContain('dépassé');
  });

  test('confirme quand les plafonds sont tenus', () => {
    const text = buildFinanceReview({
      ...base,
      budgets: [
        { id: 'b1', category: 'transport', amount: 20000, period: 'monthly', month: '2026-10', created_at: 0, spent: 5000 },
      ],
    });
    expect(text).toContain('Aucun dépassement');
  });
});

describe('buildDayReview — bilan de journée', () => {
  test('journée sans mission', () => {
    const text = buildDayReview({
      day: { total: 0, won: 0, pending: 0, lost: 0 },
      pendingToday: [],
      todayExpense: 0,
    });
    expect(text).toContain('Aucune mission');
  });

  test('liste les missions restantes et les dépenses du jour', () => {
    const text = buildDayReview({
      day: { total: 3, won: 1, pending: 2, lost: 0 },
      pendingToday: [
        { id: '1', title: 'Lecture' },
        { id: '2', title: 'Sport' },
      ] as never,
      todayExpense: 4500,
    });
    expect(text).toContain('1 gagnée');
    expect(text).toContain('Lecture');
    expect(text).toContain('4 500 FCFA');
  });

  test('félicite quand tout est gagné', () => {
    const text = buildDayReview({
      day: { total: 2, won: 2, pending: 0, lost: 0 },
      pendingToday: [],
      todayExpense: 0,
    });
    expect(text).toContain('Toutes tes missions sont gagnées');
  });
});
