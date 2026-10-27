/**
 * GBECHE — Import / export des données.
 *
 * Deux formats complémentaires :
 *  - CSV de planification : généré ou rempli par une IA, décrit guerres,
 *    batailles, adversaires (récurrents ou ponctuels) et mouvements
 *    financiers. L'import crée les éléments manquants en les reliant par
 *    leur nom (guerre, bataille, compte).
 *  - Sauvegarde JSON : image complète de la base + secrets locaux, pour
 *    ne rien perdre lors d'un changement d'appareil / navigateur.
 */
import { parseCsvRecords, toCsv } from '../../utils/csv';
import {
  exportTables,
  importTables,
  newId,
  run,
  type BackupPayload,
} from '../../db/client';
import { listWars, createWar } from '../../db/repositories/wars.repo';
import { listBattlesByWar, createBattle } from '../../db/repositories/battles.repo';
import {
  createManualAdversary,
  createTemplate,
  listActiveTemplates,
} from '../../db/repositories/adversaries.repo';
import { listAccounts, createAccount } from '../../db/repositories/accounts.repo';
import { listTransactions } from '../../db/repositories/transactions.repo';
import type { Frequency, Priority, TxType } from '../../db/types';
import { SETTING_KEYS, setSettingBool } from '../../db/settings';
import * as secureStorage from '../secureStorage';

// ─── Résultats ────────────────────────────────────────────
export interface CsvImportReport {
  wars: number;
  battles: number;
  templates: number;
  manualAdversaries: number;
  accounts: number;
  transactions: number;
  skipped: number;
  errors: string[];
}

export interface CsvRow {
  [key: string]: string;
}

// ─── Normalisation des valeurs ────────────────────────────
const FREQUENCY_ALIASES: Record<string, Frequency> = {
  daily: 'daily', quotidien: 'daily', quotidienne: 'daily', journalier: 'daily',
  weekly: 'weekly', hebdo: 'weekly', hebdomadaire: 'weekly',
  specific_days: 'specific_days', specifique: 'specific_days', jours: 'specific_days',
  monthly: 'monthly', mensuel: 'monthly',
  yearly: 'yearly', annuel: 'yearly',
  once: 'once', ponctuel: 'once', unique: 'once',
};

const PRIORITY_ALIASES: Record<string, Priority> = {
  high: 'high', haute: 'high',
  low: 'low', basse: 'low',
  medium: 'medium', moyenne: 'medium',
};

function normalizeFrequency(raw: string): Frequency | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return FREQUENCY_ALIASES[key] ?? null;
}

function parseHour(raw: string): number {
  const hour = Number.parseInt(raw, 10);
  if (Number.isNaN(hour)) return 8;
  return Math.min(23, Math.max(0, hour));
}

function parseIsoDays(raw: string): number[] {
  return raw
    .split(/[,\s;]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => value >= 1 && value <= 7);
}

function parsePositiveInt(raw: string, fallback: number): number {
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) || value <= 0 ? fallback : value;
}

function isHexColor(raw: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(raw.trim());
}

function todayAtHour(hour: number): Date {
  const when = new Date();
  when.setHours(hour, 0, 0, 0);
  return when;
}

// ─── Import CSV ───────────────────────────────────────────
export async function importCsv(csvText: string): Promise<CsvImportReport> {
  const rows = parseCsvRecords(csvText);
  const report: CsvImportReport = {
    wars: 0, battles: 0, templates: 0, manualAdversaries: 0,
    accounts: 0, transactions: 0, skipped: 0, errors: [],
  };
  if (rows.length === 0) {
    report.errors.push('Le fichier est vide ou ne contient pas de ligne de données.');
    return report;
  }

  // Index mémoire pour résoudre les noms sans réinterroger la base.
  const wars = await listWars(false);
  const warByName = new Map(wars.map((war) => [war.title.trim().toLowerCase(), war]));
  const battleByKey = new Map<string, { id: string; war_id: string }>();
  for (const war of wars) {
    const battles = await listBattlesByWar(war.id);
    battles.forEach((battle) => battleByKey.set(`${war.id}|${battle.title.trim().toLowerCase()}`, battle));
  }
  const accounts = await listAccounts(true);
  const accountByName = new Map(accounts.map((account) => [account.name.trim().toLowerCase(), account]));

  const ensureWar = async (row: CsvRow) => {
    const title = row.guerre?.trim();
    if (!title) return null;
    const key = title.toLowerCase();
    const existing = warByName.get(key);
    if (existing) return existing;

    const created = await createWar({
      title,
      icon: row.icone_guerre?.trim() || 'shield-checkmark',
      color: isHexColor(row.couleur_guerre ?? '') ? row.couleur_guerre.trim() : '#00E5FF',
      domainType: 'custom',
    });
    const warRow = (await listWars(false)).find((war) => war.id === created)!;
    warByName.set(key, warRow);
    report.wars += 1;
    return warRow;
  };

  const ensureBattle = async (row: CsvRow, warId: string, warTitle: string) => {
    const title = row.bataille?.trim();
    if (!title) return null;
    const key = `${warId}|${title.toLowerCase()}`;
    const existing = battleByKey.get(key);
    if (existing) return existing;

    const days = Number.parseInt(row.echeance_jours ?? '', 10);
    const id = await createBattle({
      warId,
      title,
      description: row.description?.trim() ?? '',
      priority: PRIORITY_ALIASES[row.priorite?.trim().toLowerCase()] ?? 'medium',
      deadline: Number.isNaN(days) || days <= 0 ? null : new Date(Date.now() + days * 86_400_000),
    });
    const battle = { id, war_id: warId };
    battleByKey.set(key, battle);
    report.battles += 1;
    void warTitle;
    return battle;
  };

  const ensureAccount = async (name: string) => {
    const key = name.trim().toLowerCase();
    const existing = accountByName.get(key);
    if (existing) return existing;
    const id = await createAccount({
      name: name.trim(),
      type: 'cash',
      icon: 'cash',
      color: '#00FF88',
    });
    const created = (await listAccounts(true)).find((account) => account.id === id)!;
    accountByName.set(key, created);
    report.accounts += 1;
    return created;
  };

  for (const [index, row] of rows.entries()) {
    const line = index + 2; // +1 entête, +1 pour numérotation humaine
    try {
      const type = (row.type ?? '').trim().toLowerCase();

      if (type === 'guerre' || type === 'war') {
        await ensureWar(row);
        continue;
      }

      if (type === 'bataille' || type === 'battle') {
        const war = await ensureWar(row);
        if (!war) { report.errors.push(`Ligne ${line} : bataille sans guerre.`); continue; }
        await ensureBattle(row, war.id, war.title);
        continue;
      }

      if (type === 'adversaire' || type === 'adversary') {
        const war = await ensureWar(row);
        if (!war) { report.errors.push(`Ligne ${line} : adversaire sans guerre.`); continue; }
        const battle =
          (await ensureBattle(row, war.id, war.title)) ??
          (await ensureBattle({ ...row, bataille: 'Missions générales' }, war.id, war.title));
        if (!battle) { report.errors.push(`Ligne ${line} : bataille introuvable.`); continue; }

        const title = row.adversaire?.trim();
        if (!title) { report.errors.push(`Ligne ${line} : nom d'adversaire vide.`); continue; }

        const hour = parseHour(row.heure);
        const duration = parsePositiveInt(row.duree_min, 30);
        const xp = parsePositiveInt(row.xp, 50);
        const frequency = normalizeFrequency(row.frequence) ?? 'once';

        if (frequency === 'once') {
          await createManualAdversary({
            battleId: battle.id,
            warId: war.id,
            title,
            xpReward: xp,
            scheduledAt: todayAtHour(hour),
            hour,
            durationMin: duration,
          });
          report.manualAdversaries += 1;
        } else {
          const days = frequency === 'specific_days' ? parseIsoDays(row.jours_iso) : [];
          if (frequency === 'specific_days' && days.length === 0) {
            report.errors.push(`Ligne ${line} : fréquence "jours choisis" sans jour valide (1..7).`);
            continue;
          }
          await createTemplate({
            battleId: battle.id,
            warId: war.id,
            title,
            xpReward: xp,
            frequency,
            specificDays: days,
            hour,
            durationMin: duration,
          });
          report.templates += 1;
        }
        continue;
      }

      if (type === 'depense' || type === 'expense' || type === 'revenu' || type === 'income') {
        const txType: TxType = type === 'revenu' || type === 'income' ? 'income' : 'expense';
        const amount = Number.parseFloat((row.montant ?? '').replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(amount) || amount <= 0) {
          report.errors.push(`Ligne ${line} : montant invalide.`);
          continue;
        }
        const account = await ensureAccount(row.compte || 'Cash');
        await run(
          `INSERT INTO transactions
             (id, account_id, amount, type, category, label, note, is_recurring, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, '', 0, ?, ?);`,
          [
            newId(),
            account.id,
            txType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
            txType,
            row.categorie?.trim() || (txType === 'expense' ? 'other_expense' : 'other_income'),
            `Import CSV ${new Date().toLocaleDateString('fr-FR')}`,
            Date.now(),
            Date.now(),
          ],
        );
        report.transactions += 1;
        continue;
      }

      report.skipped += 1;
      if (type) report.errors.push(`Ligne ${line} : type "${type}" non reconnu.`);
    } catch (error) {
      report.errors.push(`Ligne ${line} : ${error instanceof Error ? error.message : 'erreur inconnue'}`);
    }
  }

  return report;
}

// ─── Export CSV ───────────────────────────────────────────
export async function exportCsv(): Promise<string> {
  const wars = await listWars(false);
  const accounts = await listAccounts(true);
  const transactions = await listTransactions({ limit: 5000 });

  const header = [
    'type', 'guerre', 'icone_guerre', 'couleur_guerre', 'bataille', 'description',
    'priorite', 'echeance_jours', 'adversaire', 'frequence', 'heure', 'jours_iso',
    'duree_min', 'xp', 'montant', 'categorie', 'compte',
  ];
  const lines: (string | number)[][] = [header];

  for (const war of wars) {
    lines.push(['guerre', war.title, war.icon, war.color, '', '', '', '', '', '', '', '', '', '', '', '', '']);
    const battles = await listBattlesByWar(war.id);
    for (const battle of battles) {
      lines.push(['bataille', war.title, '', '', battle.title, battle.description, battle.priority, '', '', '', '', '', '', '', '', '', '']);
    }
  }

  const templates = await listActiveTemplates();
  const warById = new Map(wars.map((war) => [war.id, war]));
  const battleCache = new Map<string, string>();
  for (const template of templates) {
    let battleTitle = battleCache.get(template.battle_id);
    if (!battleTitle) {
      const battles = await listBattlesByWar(template.war_id);
      battleTitle = battles.find((battle) => battle.id === template.battle_id)?.title ?? '';
      battleCache.set(template.battle_id, battleTitle);
    }
    const war = warById.get(template.war_id);
    const days = JSON.parse(template.specific_days || '[]') as number[];
    lines.push([
      'adversaire', war?.title ?? '', '', '', battleTitle, '', '', '',
      template.title, template.frequency, template.hour, days.join(','),
      template.duration_min, template.xp_reward, '', '', '',
    ]);
  }

  for (const tx of transactions) {
    const account = accounts.find((item) => item.id === tx.account_id);
    lines.push([
      tx.type === 'income' ? 'revenu' : 'depense',
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      Math.abs(tx.amount), tx.category, account?.name ?? '',
    ]);
  }

  return toCsv(lines);
}

// ─── Sauvegarde JSON complète ─────────────────────────────
const PIN_KEY = 'gbeche_pin_hash';
const MASTER_KEY = 'gbeche_master_key';

export interface BackupFile {
  app: 'GBECHE';
  format: 1;
  exportedAt: number;
  data: BackupPayload;
  secrets: Record<string, string | null>;
}

export async function exportBackup(): Promise<BackupFile> {
  const [data, pinHash, masterKey] = await Promise.all([
    exportTables(),
    secureStorage.getItemAsync(PIN_KEY),
    secureStorage.getItemAsync(MASTER_KEY),
  ]);
  return {
    app: 'GBECHE',
    format: 1,
    exportedAt: Date.now(),
    data,
    secrets: { [PIN_KEY]: pinHash, [MASTER_KEY]: masterKey },
  };
}

export async function importBackup(file: BackupFile): Promise<void> {
  if (file.app !== 'GBECHE' || typeof file.data !== 'object') {
    throw new Error('Fichier de sauvegarde GBECHE invalide.');
  }
  // importTables porte déjà sa propre transaction.
  await importTables(file.data);
  for (const [key, value] of Object.entries(file.secrets ?? {})) {
    if (value) await secureStorage.setItemAsync(key, value);
  }
  // Le cache de préférences doit refléter la base restaurée.
  const { loadSettingsCache } = await import('../../db/settings');
  await loadSettingsCache();
  await setSettingBool(SETTING_KEYS.onboardingDone, true);
}
