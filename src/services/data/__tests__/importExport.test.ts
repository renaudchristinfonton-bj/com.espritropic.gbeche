/* eslint-disable import/first */
/**
 * Tests du service d'import/export. Tous les repositories et le client
 * SQLite sont mockés : on vérifie les règles de mapping et les bilans.
 */
const mockWars: any[] = [];
const mockBattles: any[] = [];
const mockTemplates: any[] = [];
const mockManual: any[] = [];
const mockAccounts: any[] = [];
const mockSqlRuns: { sql: string; params: unknown[] }[] = [];
let mockIdCounter = 0;

jest.mock('../../../db/client', () => ({
  newId: jest.fn(() => `id-${++mockIdCounter}`),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockSqlRuns.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  exportTables: jest.fn(async () => ({})),
  importTables: jest.fn(async () => undefined),
}));

jest.mock('../../../db/repositories/wars.repo', () => ({
  listWars: jest.fn(async () => mockWars),
  createWar: jest.fn(async (input: any) => {
    const id = `war-${mockWars.length + 1}`;
    mockWars.push({ id, is_active: 1, ...input });
    return id;
  }),
}));

jest.mock('../../../db/repositories/battles.repo', () => ({
  listBattlesByWar: jest.fn(async (warId: string) =>
    mockBattles.filter((battle) => battle.war_id === warId),
  ),
  createBattle: jest.fn(async (input: any) => {
    const id = `battle-${mockBattles.length + 1}`;
    mockBattles.push({ id, war_id: input.warId, title: input.title });
    return id;
  }),
}));

jest.mock('../../../db/repositories/adversaries.repo', () => ({
  createTemplate: jest.fn(async (input: any) => {
    const id = `tpl-${mockTemplates.length + 1}`;
    mockTemplates.push({
      id,
      battle_id: input.battleId,
      war_id: input.warId,
      title: input.title,
      xp_reward: input.xpReward ?? 50,
      frequency: input.frequency,
      specific_days: JSON.stringify(input.specificDays ?? []),
      hour: input.hour,
      duration_min: input.durationMin ?? 30,
      start_date: Date.now(),
      end_date: null,
      is_active: 1,
      created_at: Date.now(),
    });
    return id;
  }),
  createManualAdversary: jest.fn(async (input: any) => {
    mockManual.push(input);
    return `man-${mockManual.length}`;
  }),
  listActiveTemplates: jest.fn(async () => mockTemplates),
}));

jest.mock('../../../db/repositories/accounts.repo', () => ({
  listAccounts: jest.fn(async () => mockAccounts),
  createAccount: jest.fn(async (input: any) => {
    const id = `acc-${mockAccounts.length + 1}`;
    mockAccounts.push({ id, ...input });
    return id;
  }),
}));

jest.mock('../../../db/repositories/transactions.repo', () => ({
  listTransactions: jest.fn(async () => []),
}));

import { CSV_TEMPLATE } from '../csv-template';
import { exportCsv, importCsv } from '../importExport.service';

beforeEach(() => {
  mockWars.length = 0;
  mockBattles.length = 0;
  mockTemplates.length = 0;
  mockManual.length = 0;
  mockAccounts.length = 0;
  mockSqlRuns.length = 0;
  mockIdCounter = 0;
});

describe('importCsv avec le modèle officiel', () => {
  test('crée tous les éléments décrits par le fichier exemple', async () => {
    const report = await importCsv(CSV_TEMPLATE);

    expect(report.errors).toEqual([]);
    expect(report.wars).toBe(2);
    expect(report.battles).toBe(2);
    expect(report.templates).toBe(4);
    expect(report.manualAdversaries).toBe(1);
    expect(report.accounts).toBe(2);
    expect(report.transactions).toBe(2);
    expect(report.skipped).toBe(0);
  });

  test('mappe correctement les fréquences et les heures', async () => {
    await importCsv(CSV_TEMPLATE);

    const daily = mockTemplates.find((t) => t.title === 'Séance de sport 45 min');
    expect(daily.frequency).toBe('daily');
    expect(daily.hour).toBe(6);
    expect(daily.duration_min).toBe(45);
    expect(daily.xp_reward).toBe(60);

    const specific = mockTemplates.find((t) => t.title === 'Course du week-end');
    expect(specific.frequency).toBe('specific_days');
    expect(JSON.parse(specific.specific_days)).toEqual([1, 6]);

    expect(mockTemplates.some((t) => t.frequency === 'weekly')).toBe(true);
    expect(mockTemplates.some((t) => t.frequency === 'monthly')).toBe(true);
  });

  test('la mission ponctuelle devient un adversaire manuel du jour', async () => {
    await importCsv(CSV_TEMPLATE);
    expect(mockManual).toHaveLength(1);
    expect(mockManual[0].title).toBe('Appeler un client prospect');
    expect(mockManual[0].scheduledAt.getHours()).toBe(10);
  });

  test('les montants sont signés selon le type et rattachés au compte nommé', async () => {
    await importCsv(CSV_TEMPLATE);
    const inserts = mockSqlRuns.filter((call) => call.sql.includes('INSERT INTO transactions'));
    expect(inserts).toHaveLength(2);

    const expense = inserts.find((call) => call.params[3] === 'expense')!;
    const income = inserts.find((call) => call.params[3] === 'income')!;
    expect(expense.params[2]).toBe(-15000);
    expect(income.params[2]).toBe(250000);
    expect(mockAccounts.map((account) => account.name).sort()).toEqual(['Cash', 'MTN MoMo']);
  });
});

describe('importCsv — robustesse', () => {
  test('un fichier vide renvoie une erreur explicite', async () => {
    const report = await importCsv('type,guerre\n');
    expect(report.errors).toHaveLength(1);
    expect(report.wars + report.battles + report.templates).toBe(0);
  });

  test('une ligne adversaire sans guerre est rejetée sans planter', async () => {
    const csv = [
      'type,guerre,bataille,adversaire,frequence,heure',
      'adversaire,,,Mission orpheline,daily,8',
    ].join('\n');
    const report = await importCsv(csv);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.templates).toBe(0);
  });

  test('specific_days sans jour valide remonte une erreur', async () => {
    const csv = [
      'type,guerre,bataille,adversaire,frequence,heure,jours_iso',
      'adversaire,MaGuerre,MaBataille,Mission,specific_days,8,',
    ].join('\n');
    const report = await importCsv(csv);
    expect(report.errors.some((message) => message.includes('jour valide'))).toBe(true);
  });

  test('accepte les alias français de fréquence', async () => {
    const csv = [
      'type,guerre,bataille,adversaire,frequence,heure',
      'adversaire,MaGuerre,MaBataille,Mission,quotidien,7',
    ].join('\n');
    const report = await importCsv(csv);
    expect(report.templates).toBe(1);
    expect(mockTemplates[0].frequency).toBe('daily');
  });

  test('un montant invalide est signalé', async () => {
    const csv = [
      'type,guerre,montant,categorie,compte',
      'depense,MaGuerre,abc,transport,Cash',
    ].join('\n');
    const report = await importCsv(csv);
    expect(report.transactions).toBe(0);
    expect(report.errors.some((message) => message.includes('montant'))).toBe(true);
  });
});

describe('exportCsv', () => {
  test('produit un fichier contenant les guerres et réimportable', async () => {
    await importCsv(CSV_TEMPLATE);
    const csv = await exportCsv();
    expect(csv).toContain('type,guerre');
    expect(csv).toContain('Santé & Physique');
    expect(csv).toContain('Séance de sport 45 min');

    // Le fichier exporté doit être réimportable sans erreur.
    const secondPass = await importCsv(csv);
    expect(secondPass.errors).toEqual([]);
  });
});
