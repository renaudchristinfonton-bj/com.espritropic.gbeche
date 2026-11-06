/**
 * GBECHE — Contrat des fournisseurs d'intelligence.
 *
 * Aujourd'hui, un seul fournisseur existe : le cerveau local déterministe
 * (LocalBrainProvider), 100 % hors-ligne. Cette interface est la frontière
 * prévue pour brancher plus tard un modèle neuronal embarqué (llama.cpp
 * sur natif, WebLLM/WebGPU sur web) sans modifier l'écran de conversation :
 * il suffira d'une autre implémentation de AiProvider.
 */

export interface BrainContext {
  balance?: number | null;
  pendingToday?: number;
  wonToday?: number;
  overrunBudgets?: number;
  activeWars?: number;
  /** Bilan glissant déjà calculé (30 jours par défaut). */
  periodDays?: number;
  periodExpense?: number;
  savingsRate?: number | null;
  completionRate?: number | null;
  score?: number | null;
  /** Prochaine mission encore en attente aujourd'hui. */
  nextMissionTitle?: string | null;
  nextMissionAt?: number | null;
}

/** Écran que l'assistant propose d'ouvrir après sa réponse. */
export interface BrainAction {
  label: string;
  route: string;
}

export interface BrainReply {
  intent: string;
  text: string;
  suggestions?: string[];
  action?: BrainAction;
  /** Sujet retenu pour la mémoire courte de la conversation. */
  topic?: string;
}

export interface AiProvider {
  /** Identifiant technique (journalisation, réglages). */
  readonly name: string;
  /**
   * Traite un message libre. Renvoie null si le fournisseur ne reconnaît
   * pas le sujet : l'appelant retombe alors sur le moteur de règles.
   */
  respond(input: { raw: string; context?: BrainContext }): BrainReply | null;
}
