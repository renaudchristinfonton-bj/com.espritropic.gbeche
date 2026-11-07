/**
 * GBECHE — Utilitaires texte du cerveau local.
 * Version dédiée à l'IA pour éviter tout cycle d'import avec le parseur
 * de commandes. Le matching reste sur mots entiers, jamais en sous-chaîne.
 */

export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’-]/g, ' ')
    .replace(/[ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zà-ÿ])${escaped}([^a-zà-ÿ]|$)`).test(text);
}

export function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => hasWord(text, keyword));
}

/** Extraction d'un montant FCFA (« 3 000 000 », « 1,5 million », « 250k »). */
export function extractAmount(raw: string): number | null {
  const pre = raw.replace(/\.(?=\d{3}(?!\d))/g, '');
  const text = normalizeText(pre);
  if (/\d\s*(h|min|heure)/.test(text)) return null;
  const match = text.match(
    /(\d{1,3}(?:[ ]?\d{3})+|\d+(?:[.,]\d+)?)\s*(millions?|mille|milliers?|k|m|fcfa|f)?(?![a-zà-ÿ])/i,
  );
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

/** Convertit un délai français en nombre de mois. Le nombre doit être
 *  explicitement lié à une unité de temps pour éviter de confondre le
 *  montant d'une enveloppe avec son horizon. */
export function extractMonths(raw: string): number | null {
  const text = normalizeText(raw);
  const bound = text.match(/(\d+(?:[.,]\d+)?)\s*(ans?|annee?s?|mois|semaines?|jours?)\b/);
  if (!bound) {
    // Un nombre nu n'est acceptable que si la phrase ne porte aucun montant.
    if (extractAmount(raw) !== null) return null;
    const bare = text.match(/(\d+(?:[.,]\d+)?)/);
    if (!bare) return null;
    const bareValue = Number(bare[1].replace(',', '.'));
    return Number.isFinite(bareValue) && bareValue > 0 ? Math.round(bareValue) : null;
  }
  const value = Number(bound[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = bound[2];
  if (unit.startsWith('an') || unit.startsWith('annee')) return Math.round(value * 12);
  if (unit.startsWith('semaine')) return Math.max(1, Math.round((value * 7) / 30.4));
  if (unit.startsWith('jour')) return 1;
  return Math.round(value);
}
