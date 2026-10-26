/**
 * GBECHE — Agent de quartier général, 100 % local.
 *
 * Moteur de réponses automatique déterministe, sans réseau ni modèle
 * distant : il détecte l'intention d'un message court et répond avec les
 * chiffres réels de l'utilisateur (passés en contexte). Toutes les
 * fonctions sont pures pour rester testables ; la persistance et la
 * base sont gérées par chat.repo et l'écran agent.
 */

export interface AgentContext {
  /** Solde total en FCFA (null si pas encore disponible). */
  balance?: number | null;
  /** Missions planifiées non terminées aujourd'hui. */
  pendingToday?: number;
  /** Missions gagnées aujourd'hui. */
  wonToday?: number;
  /** Niveau de guerrier. */
  level?: number;
  /** Série de jours actifs. */
  streak?: number;
  /** Nombre de guerres actives. */
  activeWars?: number;
}

export type AgentIntent =
  | 'greeting'
  | 'balance'
  | 'today'
  | 'wars'
  | 'expense'
  | 'motivation'
  | 'streak'
  | 'help'
  | 'thanks'
  | 'unknown';

export interface AgentReply {
  text: string;
  intent: AgentIntent;
  suggestions: string[];
}

interface Rule {
  intent: AgentIntent;
  keywords: string[];
  reply: (ctx: AgentContext, seed: number) => string;
}

function pick<T>(options: T[], seed: number): T {
  return options[seed % options.length];
}

function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/[\s ]/g, ' ')} FCFA`;
}

const RULES: Rule[] = [
  {
    intent: 'greeting',
    keywords: ['bonjour', 'salut', 'bonsoir', 'hello', 'coucou', 'bon apres', 'bon après'],
    reply: (ctx, seed) =>
      pick(
        [
          `Salut, guerrier.${ctx.level ? ` Niveau ${ctx.level},` : ''} Prêt à remporter tes missions du jour ?`,
          'Repli au quartier général. Dis-moi ce que tu veux suivre : missions, soldes ou objectifs.',
          'Salut ! Fais le point sur ta journée ou demande ton solde, je suis là.',
        ],
        seed,
      ),
  },
  {
    intent: 'balance',
    keywords: ['solde', 'argent', 'compte', 'combien', 'trésorerie', 'tresorerie', 'cash', 'momo'],
    reply: (ctx) => {
      if (ctx.balance === null || ctx.balance === undefined) {
        return "Aucun compte n'est encore créé. Ouvre Finances → Comptes pour enregistrer ton premier solde.";
      }
      const tone =
        ctx.balance < 0
          ? 'Attention, tu es en négatif : recentre tes dépenses sur l’essentiel.'
          : 'Voilà ton niveau de munitions financières.';
      return `Ton solde total s'élève à ${formatFcfa(ctx.balance)}. ${tone}`;
    },
  },
  {
    intent: 'today',
    keywords: ["aujourd'hui", 'aujourdhui', 'mission', 'tâche', 'tache', 'programme', 'quoi faire', 'journée', 'journee', 'planning'],
    reply: (ctx) => {
      const pending = ctx.pendingToday ?? 0;
      const won = ctx.wonToday ?? 0;
      if (pending === 0 && won === 0) {
        return "Aucune mission programmée aujourd'hui. Crée une routine dans l'onglet Guerres pour bâtir ta discipline.";
      }
      if (pending === 0) {
        return `Toutes tes missions du jour sont gagnées (${won}). Excellent travail, maintiens cette cadence.`;
      }
      return `Il te reste ${pending} mission${pending > 1 ? 's' : ''} à mener aujourd'hui, ${won} déjà remportée${won > 1 ? 's' : ''}. Attaque la plus courte d'abord pour lancer l'élan.`;
    },
  },
  {
    intent: 'wars',
    keywords: ['guerre', 'objectif', 'bataille', 'but', 'vie', 'combat'],
    reply: (ctx) => {
      const wars = ctx.activeWars ?? 0;
      if (wars === 0) {
        return "Aucune guerre active. Définis un domaine de vie à conquérir dans l'onglet Guerres, puis une première bataille mesurable.";
      }
      return `Tu mènes ${wars} guerre${wars > 1 ? 's' : ''} active${wars > 1 ? 's' : ''}. Chaque routine gagnée rapproche de la victoire : reste constant plutôt qu'intense par à-coups.`;
    },
  },
  {
    intent: 'expense',
    keywords: ['dépense', 'depense', 'budget', 'épargne', 'epargne', 'économie', 'economie', 'trop dépensé', 'depenser'],
    reply: () =>
      'Garde la règle simple : note chaque dépense au fil de l’eau dans Finances, fixe un plafond mensuel par catégorie, et paie ton épargne en premier dès qu’un revenu arrive.',
  },
  {
    intent: 'motivation',
    keywords: ['fatigué', 'fatigue', 'abandon', 'abandonner', 'motiv', 'difficile', 'découragé', 'decourage', 'baisse', 'perdu', 'stress', 'peur', 'lâcher', 'lacher'],
    reply: (_ctx, seed) =>
      pick(
        [
          'La discipline bat la motivation. Fais la toute première action, même réduite à deux minutes : l’élan fera le reste.',
          'Un jour manqué ne défait pas une guerre. Reviens à la prochaine mission, sans culpabilité, et enchaîne.',
          'Tu n’as pas besoin d’être en forme pour agir, tu deviens en forme en agissant. Une mission, maintenant.',
        ],
        seed,
      ),
  },
  {
    intent: 'streak',
    keywords: ['série', 'serie', 'streak', 'habitude', 'régulier', 'regulier', 'constance'],
    reply: (ctx) => {
      const streak = ctx.streak ?? 0;
      if (streak <= 1) return 'La constance se construit jour après jour. Valide au moins une mission aujourd’hui pour lancer ta série.';
      return `Ta série active est de ${streak} jour${streak > 1 ? 's' : ''}. Protège-la : une petite mission vaut mieux qu’une journée cassée.`;
    },
  },
  {
    intent: 'help',
    keywords: ['aide', 'help', 'comment', 'explique', 'fonction', 'possible', 'peux-tu', 'peux tu'],
    reply: () =>
      'Je peux te donner ton solde, le programme du jour, le point sur tes guerres et ta série, ou un conseil de discipline. Pose une question courte ou touche une suggestion.',
  },
  {
    intent: 'thanks',
    keywords: ['merci', 'thanks', 'super', 'parfait', 'nickel', 'génial', 'genial'],
    reply: (_ctx, seed) =>
      pick(
        [
          'Toujours prêt. Maintenant, va remporter une mission.',
          'Avec plaisir, guerrier. On garde le cap.',
        ],
        seed,
      ),
  },
];

const FALLBACKS = [
  'Je ne suis pas certain de saisir. Demande-moi ton solde, tes missions du jour ou un conseil de discipline.',
  'Je réponds surtout sur tes finances, tes missions et tes objectifs. Essaie une suggestion ci-dessous.',
];

export const SUGGESTIONS = [
  'Quelles missions aujourd’hui ?',
  'Quel est mon solde ?',
  'Mon point sur mes guerres',
  'Je me sens découragé',
  'Comment économiser ?',
];

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Correspondance sur mot entier : le mot-clé doit commencer un token
 * (un espace ou une apostrophe précèdent), et ses flexions/pluriels sont
 * acceptés (« guerre » couvre « guerres », « épargne » couvre « épargner »).
 * Évite les faux positifs de sous-chaîne du type « en*vie* ».
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const escaped = normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z])${escaped}[a-z]*([^a-z]|$)`);
  return regex.test(text);
}

/** Détecte l'intention (exposé pour les tests). */
export function detectIntent(raw: string): AgentIntent {
  const text = normalize(raw);
  if (!text) return 'unknown';
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => matchesKeyword(text, keyword))) {
      return rule.intent;
    }
  }
  return 'unknown';
}

/** Génère la réponse automatique à partir du message et du contexte chiffré. */
export function generateReply(raw: string, context: AgentContext = {}): AgentReply {
  const intent = detectIntent(raw);
  const seed = Math.max(1, normalize(raw).length);
  if (intent === 'unknown') {
    return {
      text: pick(FALLBACKS, seed),
      intent,
      suggestions: SUGGESTIONS.slice(0, 3),
    };
  }
  const rule = RULES.find((item) => item.intent === intent)!;
  return {
    text: rule.reply(context, seed),
    intent,
    suggestions: SUGGESTIONS,
  };
}

/** Message d'accueil affiché automatiquement à l'ouverture d'une conversation vide. */
export function welcomeMessage(context: AgentContext = {}): string {
  const pending = context.pendingToday ?? 0;
  if (pending > 0) {
    return `Bienvenue au quartier général. Tu as ${pending} mission${pending > 1 ? 's' : ''} à mener aujourd'hui : on commence par laquelle ?`;
  }
  return 'Bienvenue au quartier général. Je peux suivre tes missions, ton solde et tes objectifs, entièrement sur cet appareil.';
}
