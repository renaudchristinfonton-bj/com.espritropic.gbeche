/**
 * GBECHE — Point d'accès unique à l'intelligence de l'app.
 *
 * Aujourd'hui, seul le cerveau local déterministe est branché. Le jour où
 * un modèle neuronal embarqué sera validé sur appareil, il suffira de
 * l'implémenter comme AiProvider et de le renvoyer ici, sans toucher aux
 * écrans ni au parseur de commandes.
 */
import { LocalBrainProvider } from './localBrain.provider';
import type { AiProvider, BrainContext, BrainReply } from './types';

let provider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!provider) provider = new LocalBrainProvider();
  return provider;
}

export function askBrain(raw: string, context?: BrainContext): BrainReply | null {
  return getAiProvider().respond({ raw, context });
}

export type { AiProvider, BrainContext, BrainReply };
