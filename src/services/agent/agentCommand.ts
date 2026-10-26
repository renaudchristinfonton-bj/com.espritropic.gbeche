/**
 * GBECHE — Moteur de commandes conversationnelles de l'agent.
 *
 * Pur, déterministe et 100 % hors-ligne : transforme une phrase en
 * actions exécutables (dépense, revenu, budget, mission, victoire,
 * compte) ou en réponse informative. Aucune donnée n'est écrite ici :
 * l'exécution reste du ressort de agentActions.service.ts, ce qui rend
 * tout le parseur testable sans base.
 */

import { CATEGORIES, type CategoryMeta } from '../../domain/catalog';
import { generateReply } from '../agent.service';
import type { LifePlan } from './lifeProject.service';

// ─── Actions proposées par l'agent (cartes à confirmer) ─────
export type AgentAction =
  | { type: 'add-expense'; amount: number; category: string; label: string }
  | { type: 'add-income'; amount: number; category: string; label: string }
  | { type: 'set-budget'; category: string; amount: number }
  | {
      type: 'add-mission';
      title: string;
      when: 'today' | 'tomorrow';
      hour: number;
    }
  | { type: 'complete-mission'; query: string }
  | { type: 'create-account'; name: string }
  | { type: 'create-life-plan'; plan: LifePlan };

export interface ParsedResult {
  kind: 'reply' | 'actions';
  intent: string;
  text: string;
  suggestions: string[];
  actions?: AgentAction[];
}

// ─── Normalisation ─────────────────────────────────────────
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’-]/g, ' ')
    .replace(/[ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Montants (français, FCFA) ─────────────────────────────
const AMOUNT_RE =
  /(\d{1,3}(?:[ ]?\d{3})+|\d+(?:[.,]\d+)?)\s*(millions?|mille|milliers?|k|m|fcfa|f)?(?![a-zà-ÿ])/i;

/** Extrait le premier montant exprimé (« 2 500 », « 3k », « 1,5 million »). */
export function parseAmount(raw: string): number | null {
  // En français, le point peut être un séparateur de milliers (« 12.500 ») :
  // on le retire quand il isole exactement 3 chiffres, la virgule reste décimale.
  const pre = raw.replace(/\.(?=\d{3}(?!\d))/g, '');
  const text = normalize(pre);
  // Un horaire (« 7h ») ou une durée (« 30 min ») n'est pas un montant.
  if (/\d\s*(h|min|heure)/.test(text)) return null;
  const match = text.match(AMOUNT_RE);
  if (!match) return null;

  const numeric = Number(match[1].replace(/[ ]/g, '').replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const suffix = (match[2] ?? '').toLowerCase();
  let multiplier = 1;
  if (suffix.startsWith('million')) multiplier = 1_000_000;
  else if (suffix === 'mille' || suffix.startsWith('millier') || suffix === 'k' || suffix === 'm') {
    multiplier = 1_000;
  }
  return Math.round(numeric * multiplier);
}

// ─── Catégories ────────────────────────────────────────────
const EXPENSE_KEYWORDS: Record<string, string[]> = {
  food: ['nourriture', 'alimentation', 'manger', 'bouffe', 'restaurant', 'repas', 'petit dejeuner', 'dejeuner', 'diner', 'cantine', 'gbo'],
  transport: ['transport', 'taxi', 'essence', 'carburant', 'deplacement', 'moto', 'zem', 'bus', 'car'],
  health: ['sante', 'pharmacie', 'medicament', 'docteur', 'hopital', 'clinique', 'beaute', 'coiffure', 'infirmier'],
  rent: ['loyer', 'chambre', 'logement', 'location'],
  utilities: ['facture', 'electricite', 'eau', 'internet', 'abonnement', 'credit', 'recharge', 'forfait'],
  leisure: ['loisir', 'sortie', 'film', 'cinema', 'jeu', 'fete', 'biere', 'apero', 'boisson'],
  education: ['education', 'formation', 'ecole', 'cours', 'livre', 'etude', 'scolarite'],
  savings: ['epargne', 'epargner', 'economie', 'tontine'],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  salary: ['salaire', 'paye', 'paie', 'travail'],
  business: ['business', 'vente', 'client', 'benefice', 'recette', 'commerce'],
  gift: ['don', 'cadeau'],
};

/** Vrai match sur mot entier (gère les mots français accentués, une fois normalisés). */
export function hasWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zà-ÿ])${escaped}([^a-zà-ÿ]|$)`).test(text);
}

export function detectCategory(raw: string, kind: 'expense' | 'income'): string {
  const text = normalize(raw);
  const map = kind === 'expense' ? EXPENSE_KEYWORDS : INCOME_KEYWORDS;
  for (const [categoryId, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => hasWord(text, keyword))) return categoryId;
  }
  return kind === 'expense' ? 'other_expense' : 'other_income';
}

export function categoryLabel(categoryId: string): string {
  const meta: CategoryMeta | undefined = CATEGORIES.find((c) => c.id === categoryId);
  return meta?.label ?? (categoryId === 'other_expense' ? 'Autres dépenses' : 'Autres revenus');
}

// ─── Déclencheurs d'intention ──────────────────────────────
const INCOME_VERBS = ['recu', 'recevoir', 'revenu', 'encaisse', 'gagne', 'salaire', 'rembourse'];
const EXPENSE_VERBS = [
  'depense', 'achete', 'acheter', 'paye', 'payer', 'regle', 'coute', 'facture', 'debourse',
];
const MISSION_DONE_TRIGGERS = [
  'j ai fait', 'j ai termine', 'j ai accompli', 'j ai fini', 'c est fait',
  'mission terminee', 'je l ai fait',
];
const MISSION_ADD_TRIGGERS = [
  'ajoute', 'ajouter', 'cree', 'creer', 'rappelle', 'oublie pas', 'pense a', 'je dois',
  'il faut', 'tache', 'rdv', 'rendez vous', 'agenda', 'prevois', 'planifie',
  'nouvelle mission', 'nouvel objectif',
];
const POSSESSIVE_PREFIX = /^(mes|mon|ma|les|des|quels|quelles|quel|quelle|combien|point|bilan)/;

const TIME_TOKENS =
  /\b(aujourd hui|aujourdhui|demain|ce matin|ce midi|ce soir|tout a l heure|maintenant)\b/g;

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

// Déclencheurs écrits avec accents : la recherche est insensible à la
// casse et tolère apostrophe/tiret/espace entre les mots, afin de
// conserver les accents et la casse du titre d'origine.
const RAW_TITLE_TRIGGERS = [
  'rappelle moi de',
  'rappelle moi',
  'n oublie pas de',
  'n oublie pas',
  'oublie pas de',
  'oublie pas',
  'pense à',
  'il faut que je',
  'il faut',
  'je dois',
  'prévois dans mon agenda',
  'planifie',
  'ajoute une mission',
  'ajoute un objectif',
  'ajoute une tâche',
  'nouvelle mission',
  'nouvel objectif',
  'crée une mission',
  'crée une tâche',
  'crée un objectif',
  'ajoute',
  'crée',
  'une mission',
  'un objectif',
  'une tâche',
];

function flexiblePattern(phrase: string): RegExp {
  const escaped = phrase
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .trim();
  // Les espaces de la phrase matchent apostrophe, tiret ou espaces réels.
  return new RegExp(escaped.replace(/\\?\s+/g, "[\\s'’-]+"), 'gi');
}

/** Nettoie un titre de mission des déclencheurs et repères temporels. */
export function cleanMissionTitle(raw: string): string {
  let text = raw
    .replace(
      /\b(aujourd'hui|aujourd hui|aujourdhui|demain|ce matin|ce midi|ce soir|tout à l'heure|maintenant)\b/gi,
      ' ',
    )
    .replace(/\b\d{1,2}\s*h(?:\d{2})?\b/g, ' ')
    .replace(/[?!.]+/g, ' ');

  for (const trigger of RAW_TITLE_TRIGGERS) {
    text = text.replace(flexiblePattern(trigger), ' ');
  }
  // Articles et mots de liaison résiduels en début de phrase (itératif).
  let previous: string;
  do {
    previous = text;
    // L'élision « d' » est directement collée au verbe (« d'appeler »),
    // apostrophe droite ou typographique.
    text = text.replace(/^\s*d['’](?=\w)/i, ' ');
    text = text.replace(/^\s*(de|des|le|la|les|un|une|que je)\s+/i, ' ');
  } while (text !== previous);

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseMissionTime(raw: string): { when: 'today' | 'tomorrow'; hour: number } {
  const text = normalize(raw);
  const when = text.includes('demain') ? 'tomorrow' : 'today';
  const hourMatch = text.match(/(\d{1,2})\s*h(?:\d{2})?/);
  if (hourMatch) {
    const hour = Math.min(23, Math.max(0, parseInt(hourMatch[1], 10)));
    return { when, hour };
  }
  if (text.includes('matin')) return { when, hour: 8 };
  if (text.includes('midi')) return { when, hour: 12 };
  if (text.includes('soir')) return { when, hour: 19 };
  return { when, hour: when === 'tomorrow' ? 9 : 18 };
}

function cleanDoneQuery(raw: string): string {
  return normalize(raw)
    .replace(TIME_TOKENS, ' ')
    .replace(
      /(j ai fait|j ai termine|j ai accompli|j ai fini|c est fait|je l ai fait|mission|terminee|terminer|fini|fait|la|le|les|mon|ma|mes)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Suggestions ───────────────────────────────────────────
export const COMMAND_SUGGESTIONS = [
  'Je veux acheter une voiture',
  'J’ai dépensé 2 500 FCFA de transport',
  'Ajoute une mission sport demain 7h',
  'Bilan de ma journée',
  'Comment va mon budget ?',
];

// ─── Analyse d'une clause ──────────────────────────────────
function parseClause(raw: string): ParsedResult | null {
  const text = normalize(raw);
  if (text.length < 3) return null;

  // ── Création de compte ──
  if (includesAny(text, ['compte']) && includesAny(text, ['cree', 'creer', 'nouveau', 'ajoute', 'ouvre'])) {
    const name = text.includes('wave')
      ? 'Wave'
      : text.includes('orange')
        ? 'Orange Money'
        : text.includes('mtn') || text.includes('momo')
          ? 'MTN MoMo'
          : text.includes('banque')
            ? 'Banque'
            : 'Cash';
    return actionResult('create-account', 'Je peux créer ce compte pour toi.', [
      { type: 'create-account', name },
    ]);
  }

  // ── Budget mensuel (une question de conseil n'est pas une création) ──
  const isBudgetQuestion = /comment|conseil|va|point|bilan|recap|resume|quel/.test(text);
  if (
    !isBudgetQuestion &&
    includesAny(text, ['budget', 'plafond', 'limite', 'limiter', 'plafonner'])
  ) {
    const amount = parseAmount(text);
    const category = detectCategory(text, 'expense');
    if (!amount) {
      return reply(
        'need-amount',
        `Indique le plafond mensuel à viser, par exemple : « budget ${categoryLabel(category)} 30 000 FCFA ».`,
      );
    }
    return actionResult(
      'set-budget',
      `Je propose d'enregistrer un budget mensuel de ${formatFcfa(amount)} pour ${categoryLabel(category)}.`,
      [{ type: 'set-budget', category, amount }],
    );
  }

  // ── Revenu ──
  if (includesAny(text, INCOME_VERBS) || (parseAmount(text) !== null && includesAny(text, ['reçu', 'recu', 'revenu']))) {
    const amount = parseAmount(text);
    const category = detectCategory(text, 'income');
    if (!amount) {
      return reply(
        'need-amount',
        "Tu n'as pas indiqué de montant. Exemple : « j'ai reçu 25 000 FCFA de salaire ».",
      );
    }
    return actionResult(
      'add-income',
      `Je note un revenu de ${formatFcfa(amount)} (${categoryLabel(category)}).`,
      [{ type: 'add-income', amount, category, label: categoryLabel(category) }],
    );
  }

  // ── Dépense ──
  if (includesAny(text, EXPENSE_VERBS) || (parseAmount(text) !== null && !POSSESSIVE_PREFIX.test(text))) {
    const amount = parseAmount(text);
    const category = detectCategory(text, 'expense');
    if (!amount) {
      return reply(
        'need-amount',
        "Tu n'as pas indiqué de montant. Exemple : « j'ai dépensé 2 500 FCFA de transport ».",
      );
    }
    return actionResult(
      'add-expense',
      `Je note une dépense de ${formatFcfa(amount)} (${categoryLabel(category)}).`,
      [{ type: 'add-expense', amount, category, label: categoryLabel(category) }],
    );
  }

  // ── Mission terminée ──
  if (includesAny(text, MISSION_DONE_TRIGGERS)) {
    const query = cleanDoneQuery(text);
    if (!query) {
      return reply('need-info', 'Quelle mission veux-tu marquer comme gagnée ? Donne-moi son nom.');
    }
    return actionResult('complete-mission', `Je vérifie la mission « ${query} ».`, [
      { type: 'complete-mission', query },
    ]);
  }

  // ─— Nouvelle mission —─
  const looksPossessive = POSSESSIVE_PREFIX.test(text);
  if (!looksPossessive && includesAny(text, MISSION_ADD_TRIGGERS)) {
    const title = cleanMissionTitle(raw);
    if (!title) {
      return reply('need-info', 'Que dois-je planifier ? Décris la mission en une phrase.');
    }
    const time = parseMissionTime(text);
    return actionResult(
      'add-mission',
      `Je prépare la mission « ${title} » pour ${time.when === 'tomorrow' ? 'demain' : "aujourd'hui"} à ${pad(time.hour)}h.`,
      [{ type: 'add-mission', title, ...time }],
    );
  }

  return null;
}

// ─── Entrée publique ───────────────────────────────────────
const DAY_REVIEW_RE = /bilan|recap|resume|journee|s'est passee|se passe|raconte/;
const FINANCE_REVIEW_RE = /budget|finance|depense|argent|solde|tresorerie|compte|economie/;

export function parseCommand(raw: string): ParsedResult {
  const text = normalize(raw);

  // Bilans sur données réelles : le texte final est construit par
  // agentActions.service.ts à partir du snapshot (zéro donnée inventée).
  const asksQuestion = /comment|quel|quels|quelles|bilan|recap|resume|point|conseil|va/.test(text);
  if (asksQuestion && parseAmount(text) === null) {
    if (DAY_REVIEW_RE.test(text) && !FINANCE_REVIEW_RE.test(text)) {
      return { kind: 'reply', intent: 'day-review', text: '', suggestions: COMMAND_SUGGESTIONS };
    }
    if (FINANCE_REVIEW_RE.test(text)) {
      return { kind: 'reply', intent: 'finance-review', text: '', suggestions: COMMAND_SUGGESTIONS };
    }
  }

  // Récit de journée : plusieurs actions dans un même message.
  const isJournal =
    includesAny(text, ['aujourd hui', 'aujourdhui', 'journee', 'raconte', 'bilan']) &&
    (parseAmount(text) !== null || includesAny(text, MISSION_DONE_TRIGGERS) || includesAny(text, EXPENSE_VERBS));

  if (isJournal && !text.includes('comment va')) {
    const clauses = text
      .split(/[.;!?]|\bpuis\b|\bensuite\b|\bet aussi\b|\bet j ai\b|\bet\b/)
      .map((c) => c.trim())
      .filter((c) => c.length > 3);
    const actions: AgentAction[] = [];
    let firstText = '';
    for (const clause of clauses) {
      const parsed = parseClause(clause);
      if (parsed?.kind === 'actions' && parsed.actions) {
        if (!firstText) firstText = parsed.text;
        actions.push(...parsed.actions);
      }
    }
    if (actions.length > 0) {
      return {
        kind: 'actions',
        intent: 'journal',
        text: `J'ai repéré ${actions.length} action${actions.length > 1 ? 's' : ''} dans ton récit. Vérifie et confirme.`,
        actions,
        suggestions: COMMAND_SUGGESTIONS,
      };
    }
  }

  const single = parseClause(raw);
  if (single) return { ...single, suggestions: single.suggestions ?? COMMAND_SUGGESTIONS };

  // Aucune action : réponses informatives déléguées au moteur d'intentions.
  const fallback = generateReply(raw, {});
  return {
    kind: 'reply',
    intent: fallback.intent,
    text: fallback.text,
    suggestions: fallback.suggestions,
  };
}

// ─── Helpers ───────────────────────────────────────────────
function reply(intent: string, text: string): ParsedResult {
  return { kind: 'reply', intent, text, suggestions: COMMAND_SUGGESTIONS };
}

function actionResult(intent: string, text: string, actions: AgentAction[]): ParsedResult {
  return { kind: 'actions', intent, text, actions, suggestions: COMMAND_SUGGESTIONS };
}

export function formatFcfa(amount: number): string {
  // fr-FR utilise des espaces insécables (U+00A0/U+202F) : on normalise
  // en espaces simples pour garder une chaîne stable et testable.
  const grouped = Math.round(amount)
    .toLocaleString('fr-FR')
    .replace(/[ - ]/g, ' ');
  return `${grouped} FCFA`;
}

function pad(hour: number): string {
  return String(hour).padStart(2, '0');
}

// ─── Descripteur de carte d'action (affichage) ─────────────
export interface ActionDescriptor {
  icon: string;
  title: string;
  detail: string;
}

export function describeAction(action: AgentAction): ActionDescriptor {
  switch (action.type) {
    case 'add-expense':
      return {
        icon: 'arrow-down-circle',
        title: 'Nouvelle dépense',
        detail: `${formatFcfa(action.amount)} · ${action.label}`,
      };
    case 'add-income':
      return {
        icon: 'arrow-up-circle',
        title: 'Nouveau revenu',
        detail: `${formatFcfa(action.amount)} · ${action.label}`,
      };
    case 'set-budget':
      return {
        icon: 'wallet',
        title: 'Budget mensuel',
        detail: `${categoryLabel(action.category)} · ${formatFcfa(action.amount)}`,
      };
    case 'add-mission':
      return {
        icon: 'flag',
        title: 'Planifier une mission',
        detail: `${action.title} · ${action.when === 'tomorrow' ? 'demain' : "aujourd'hui"} ${pad(action.hour)}h`,
      };
    case 'complete-mission':
      return {
        icon: 'checkmark-done-circle',
        title: 'Gagner une mission',
        detail: `Recherche : « ${action.query} »`,
      };
    case 'create-account':
      return {
        icon: 'add-circle',
        title: 'Créer un compte',
        detail: action.name,
      };
    case 'create-life-plan': {
      const missionCount = action.plan.battles.reduce((sum, battle) => sum + battle.missions.length, 0);
      const savings = action.plan.savings
        ? ` · épargne ${formatFcfa(action.plan.savings.monthlyAmount)}/mois`
        : '';
      return {
        icon: action.plan.icon || 'rocket',
        title: `Plan de vie — ${action.plan.warTitle.replace(/^Projet — /, '')}`,
        detail: `${action.plan.battles.length} bataille(s) · ${missionCount} mission(s)${savings}`,
      };
    }
  }
}
