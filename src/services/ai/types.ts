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
}

export interface BrainReply {
  intent: string;
  text: string;
  suggestions?: string[];
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
