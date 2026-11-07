/**
 * GBECHE — Intentions de navigation dans la conversation.
 *
 * Une réponse de l'assistant peut proposer d'ouvrir un écran. Comme les
 * messages sont persistés en JSON (chat_messages.intents_json), on encode
 * l'action sous forme de deux chaînes simples, sans changer le schéma :
 *
 *   "open:/(app)/review"        → destination
 *   "openlabel:Ouvrir le bilan" → libellé du bouton
 *
 * Tout est pur : on peut encoder, relire et valider sans base ni rendu.
 */

export const OPEN_PREFIX = 'open:';
export const OPEN_LABEL_PREFIX = 'openlabel:';

export interface OpenAction {
  route: string;
  label: string;
}

/** Construit les intentions à persister pour un bouton d'ouverture. */
export function buildOpenIntents(action: OpenAction): string[] {
  const route = action.route.trim();
  if (!route) return [];
  const label = action.label.trim() || 'Ouvrir';
  // Le séparateur `:` sert de préfixe : on refuse une route qui en contient
  // un second pour garder un décodage sans ambiguïté.
  if (route.split(':').length > 2) return [];
  return [`${OPEN_PREFIX}${route}`, `${OPEN_LABEL_PREFIX}${label}`];
}

/** Relit l'action d'ouverture d'un message, ou null s'il n'y en a pas. */
export function parseOpenAction(intents: readonly string[] | null | undefined): OpenAction | null {
  if (!intents || intents.length === 0) return null;
  const route = intents.find((intent) => intent.startsWith(OPEN_PREFIX));
  if (!route) return null;
  const label = intents.find((intent) => intent.startsWith(OPEN_LABEL_PREFIX));
  return {
    route: route.slice(OPEN_PREFIX.length).trim(),
    label: (label ? label.slice(OPEN_LABEL_PREFIX.length) : '').trim() || 'Ouvrir',
  };
}

/** Découpe le JSON d'intentions stocké en base, sans jamais lever. */
export function parseIntents(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

/** Routes autorisées : uniquement des écrans internes de l'app. */
export function isInternalRoute(route: string): boolean {
  return /^\/\(app\)\/[a-z-]+$/.test(route);
}
