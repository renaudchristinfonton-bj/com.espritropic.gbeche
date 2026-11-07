/**
 * GBECHE — Moteur de projets de vie de l'agent (100 % hors-ligne).
 *
 * Transforme une aspiration exprimée en langage naturel (« je veux me
 * marier », « je vise une voiture ») en un dialogue de précisions, puis
 * en un plan exécutable : guerre, batailles, missions récurrentes et,
 * si le projet implique de l'argent, une enveloppe d'épargne mensuelle.
 *
 * Toutes les fonctions sont pures : la persistance du brouillon est gérée
 * par lifeDrafts.repo.ts et l'écriture finale par agentActions.service.ts.
 * Le matching d'intention reste sur mots entiers (jamais de includes()).
 */
import type { DomainType, Frequency } from '../../db/types';
import { LIFE_GUIDES, getLifeGuide, type LifeGuide, type LifeGuideQuestion } from '../../domain/lifeGuides';
import { formatFcfa, hasWord, normalize, parseAmount } from './agentCommand';

// ─── Brouillon de conversation ─────────────────────────────
export type LifeDraftStatus = 'collecting' | 'ready';

export interface LifeDraft {
  guideId: string;
  stepIndex: number;
  slots: Record<string, string>;
  status: LifeDraftStatus;
}

// ─── Plan produit (charge utile de l'action create-life-plan) ──
export interface LifePlanMission {
  title: string;
  frequency: Frequency;
  hour: number;
  durationMin?: number;
  specificDays?: number[];
}

export interface LifePlanBattle {
  title: string;
  priority: 'low' | 'medium' | 'high';
  missions: LifePlanMission[];
}

export interface LifePlanSavings {
  category: 'savings';
  label: string;
  targetAmount: number;
  horizonMonths: number;
  monthlyAmount: number;
  missionTitle: string;
}

export interface LifePlan {
  guideId: string;
  warTitle: string;
  icon: string;
  color: string;
  domainType: DomainType;
  battles: LifePlanBattle[];
  savings: LifePlanSavings | null;
  summary: string;
}

// ─── Annulation du dialogue ────────────────────────────────
const CANCEL_WORDS = ['annule', 'annuler', 'stop', 'arrete', 'terminer', 'abandonne', 'laisse tomber'];

export function isCancelRequest(raw: string): boolean {
  const text = normalize(raw);
  return CANCEL_WORDS.some((word) => hasWord(text, word));
}

// ─── Détection de l'aspiration ─────────────────────────────
/**
 * Retourne le guide dont un mot-clé apparaît comme mot entier dans la
 * phrase. En cas de plusieurs domaines, le premier du catalogue gagne
 * (le dialogue permet de corriger en annulant et reformulant).
 */
export function detectAspiration(raw: string): LifeGuide | null {
  const text = normalize(raw);
  if (text.length < 3) return null;
  for (const guide of LIFE_GUIDES) {
    if (guide.keywords.some((keyword) => hasWord(text, keyword))) return guide;
  }
  return null;
}

/**
 * Décision d'ouverture du dialogue d'aspiration.
 * Uniquement quand le parseur classique n'a produit qu'une réponse
 * informative : jamais sur une carte d'action, ni quand il réclame déjà
 * un montant (une dépense de voiture sans chiffre reste une dépense),
 * ni si la phrase contient un montant exploitable.
 */
export function shouldOpenAspiration(
  parsed: { kind: string; intent: string },
  raw: string,
): LifeGuide | null {
  if (parsed.kind !== 'reply') return null;
  if (parsed.intent === 'need-amount') return null;
  if (parseAmount(raw) !== null) return null;
  return detectAspiration(raw);
}

// ─── Cycle de questions ────────────────────────────────────
export function startDraft(guideId: string): LifeDraft {
  return { guideId, stepIndex: 0, slots: {}, status: 'collecting' };
}

export function currentQuestion(draft: LifeDraft, guide: LifeGuide): LifeGuideQuestion | null {
  return guide.questions[draft.stepIndex] ?? null;
}

export function isDraftComplete(draft: LifeDraft, guide: LifeGuide): boolean {
  return draft.stepIndex >= guide.questions.length;
}

/** Convertit une réponse de délai en nombre de mois (« 1 an » → 12). */
export function parseMonths(raw: string): number | null {
  const text = normalize(raw);
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) return null;
  const value = Number(numMatch[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;

  if (/\ban/.test(text) || /\bannee/.test(text)) return Math.round(value * 12);
  if (/\bsemaine/.test(text)) return Math.max(1, Math.round((value * 7) / 30.4));
  if (/\bmois\b/.test(text) || /\bjour/.test(text)) {
    // Un délai en jours n'a pas de sens pour un projet de vie : on garde
    // le nombre nu comme nombre de mois, mais « jours » explicite = 1 mois.
    if (/\bjour/.test(text)) return 1;
    return Math.round(value);
  }
  // Nombre nu : on l'interprète comme des mois, c'est l'unité du dialogue.
  return Math.round(value);
}

export interface AnswerOutcome {
  draft: LifeDraft;
  error?: string;
}

/**
 * Valide et enregistre une réponse, puis avance d'une question.
 * Une réponse invalide (montant ou délai illisible) ne fait pas avancer
 * le brouillon : l'agent repose la même question avec une indication.
 */
export function applyAnswer(draft: LifeDraft, rawAnswer: string, guide: LifeGuide): AnswerOutcome {
  const answer = rawAnswer.trim();
  const question = currentQuestion(draft, guide);
  if (!question) return { draft, error: 'Je n’ai plus de question à te poser sur ce projet.' };
  if (!answer) return { draft, error: 'Ta réponse est vide. Peux-tu reformuler ?' };

  if (question.kind === 'amount') {
    const amount = parseAmount(answer);
    if (amount === null) {
      return { draft, error: 'Je n’ai pas reconnu de montant. Exemple : « 1 500 000 FCFA ».' };
    }
  }
  if (question.kind === 'months') {
    const months = parseMonths(answer);
    if (months === null || months <= 0) {
      return { draft, error: 'Indique un délai en mois ou en années, par exemple « 6 mois » ou « 1 an ».' };
    }
  }

  const slots = { ...draft.slots, [question.id]: answer };
  const stepIndex = draft.stepIndex + 1;
  const next: LifeDraft = {
    ...draft,
    slots,
    stepIndex,
    status: stepIndex >= guide.questions.length ? 'ready' : 'collecting',
  };
  return { draft: next };
}

// ─── Construction du plan ──────────────────────────────────
function interpolate(text: string, slots: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? '').replace(/\s+/g, ' ').trim();
}

function frequencyLabel(frequency: Frequency): string {
  switch (frequency) {
    case 'daily':
      return 'tous les jours';
    case 'weekly':
      return 'chaque semaine';
    case 'monthly':
      return 'chaque mois';
    case 'specific_days':
      return 'jours ciblés';
    case 'yearly':
      return 'chaque année';
    default:
      return 'une fois';
  }
}

function padHour(hour: number): string {
  return String(hour).padStart(2, '0');
}

/** Enveloppe mensuelle : on arrondit à la centaine supérieure pour ne jamais viser trop juste. */
export function monthlyEnvelope(targetAmount: number, horizonMonths: number): number {
  if (!(targetAmount > 0) || !(horizonMonths > 0)) return 0;
  return Math.ceil(targetAmount / horizonMonths / 100) * 100;
}

export function buildPlan(guide: LifeGuide, draft: LifeDraft): LifePlan {
  const slots = draft.slots;
  const warTitle = `Projet — ${guide.title}`;

  const battles: LifePlanBattle[] = guide.battles.map((battle) => ({
    title: interpolate(battle.title, slots),
    priority: battle.priority,
    missions: battle.missions.map((mission) => ({
      title: interpolate(mission.title, slots),
      frequency: mission.frequency,
      hour: mission.hour,
      durationMin: mission.durationMin,
      specificDays: mission.specificDays,
    })),
  }));

  let savings: LifePlanSavings | null = null;
  if (guide.savings) {
    const targetAmount = parseAmount(slots[guide.savings.targetSlot] ?? '') ?? 0;
    const horizonMonths = parseMonths(slots[guide.savings.horizonSlot] ?? '') ?? 0;
    if (targetAmount > 0 && horizonMonths > 0) {
      savings = {
        category: 'savings',
        label: guide.savings.label,
        targetAmount,
        horizonMonths,
        monthlyAmount: monthlyEnvelope(targetAmount, horizonMonths),
        missionTitle: guide.savings.missionTitle,
      };
      // La mission de versement mensuel rejoint la première bataille (haute priorité).
      battles[0].missions.push({
        title: guide.savings.missionTitle,
        frequency: 'monthly',
        hour: 18,
        durationMin: 15,
      });
    }
  }

  const summary = buildSummary(warTitle, battles, savings);
  return {
    guideId: guide.id,
    warTitle,
    icon: guide.icon,
    color: guide.color,
    domainType: guide.domainType,
    battles,
    savings,
    summary,
  };
}

function buildSummary(
  warTitle: string,
  battles: LifePlanBattle[],
  savings: LifePlanSavings | null,
): string {
  const lines: string[] = [];
  lines.push(`Voici le plan que je te propose pour « ${warTitle} ».`);
  lines.push('');
  let missionCount = 0;
  for (const battle of battles) {
    lines.push(`⚔️ ${battle.title}`);
    for (const mission of battle.missions) {
      missionCount += 1;
      lines.push(`• ${mission.title} (${frequencyLabel(mission.frequency)}, ${padHour(mission.hour)}h)`);
    }
    lines.push('');
  }
  if (savings) {
    lines.push(
      `💰 Objectif financier : ${formatFcfa(savings.targetAmount)} sur ${savings.horizonMonths} mois, ` +
        `soit une enveloppe de ${formatFcfa(savings.monthlyAmount)} par mois.`,
    );
    lines.push('Je pose un budget mensuel « Épargne » de ce montant et une mission de versement.');
    lines.push('');
  }
  lines.push(
    `Total : ${battles.length} bataille(s) et ${missionCount} mission(s) récurrente(s). ` +
      'Vérifie ce résumé, puis confirme : je crée tout en arrière-plan. Tu pourras ajuster chaque élément dans tes écrans.',
  );
  return lines.join('\n');
}

/** Réassemble un plan depuis une charge utile JSON (cas d'une carte rechargée). */
export function guideOfDraft(draft: LifeDraft): LifeGuide | undefined {
  return getLifeGuide(draft.guideId);
}
