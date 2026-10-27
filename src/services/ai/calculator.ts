/**
 * GBECHE — Moteur de calcul local de l'assistant.
 *
 * Aucun eval() : un analyseur grammatical (descente récursive) évalue des
 * expressions arithmétiques sûres. Gère les nombres français (virgule,
 * espaces de groupement), les pourcentages et les opérateurs parlés
 * (« divisé par », « fois »). Toutes les fonctions sont pures.
 */

export type DepositFrequency = 'daily' | 'weekly' | 'interval_days' | 'monthly';

/** Normalise une saisie française en expression mathématique ASCII. */
export function normalizeExpression(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/divise[e]?\s+par/g, '/')
    .replace(/multiplie[e]?\s+par/g, '*')
    .replace(/\bfois\b/g, '*')
    .replace(/\bau\b/g, '')
    .replace(/[x×]/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d)\s+(\d)/g, '$1$2')
    .replace(/(?<=\d)\s*(?=\d)/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9+\-*/().%]/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

type Token = { kind: 'num'; value: number } | { kind: 'op'; value: string } | { kind: 'paren'; value: '(' | ')' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (char === ' ') {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      const value = Number(num);
      if (!Number.isFinite(value)) throw new Error('Nombre invalide');
      tokens.push({ kind: 'num', value });
      continue;
    }
    if ('+-*/%'.includes(char)) {
      tokens.push({ kind: 'op', value: char });
      i += 1;
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      i += 1;
      continue;
    }
    throw new Error(`Caractère non supporté : ${char}`);
  }
  return tokens;
}

/**
 * Descente récursive :
 * expr   := term (('+' | '-') term)*
 * term   := factor (('*' | '/' | '%') factor)*
 * factor := ('+' | '-') factor | '(' expr ')' | number ('%')?
 */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) throw new Error('Expression mal formée');
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private parseExpr(): number {
    let left = this.parseTerm();
    while (true) {
      const token = this.peek();
      if (token?.kind === 'op' && (token.value === '+' || token.value === '-')) {
        this.pos += 1;
        const right = this.parseTerm();
        left = token.value === '+' ? left + right : left - right;
      } else {
        return left;
      }
    }
  }

  private parseTerm(): number {
    let left = this.parseFactor();
    while (true) {
      const token = this.peek();
      if (token?.kind === 'op' && ['*', '/', '%'].includes(token.value)) {
        this.pos += 1;
        const right = this.parseFactor();
        if (token.value === '*') left *= right;
        else if (token.value === '/') {
          if (right === 0) throw new Error('Division par zéro');
          left /= right;
        } else left %= right;
      } else {
        return left;
      }
    }
  }

  private parseFactor(): number {
    const token = this.peek();
    if (!token) throw new ExpressionError('fin inattendue');
    if (token.kind === 'op' && (token.value === '-' || token.value === '+')) {
      this.pos += 1;
      const value = this.parseFactor();
      return token.value === '-' ? -value : value;
    }
    if (token.kind === 'paren' && token.value === '(') {
      this.pos += 1;
      const value = this.parseExpr();
      const closing = this.peek();
      if (closing?.kind !== 'paren' || closing.value !== ')') {
        throw new ExpressionError('parenthèse fermante manquante');
      }
      this.pos += 1;
      return value;
    }
    if (token.kind === 'num') {
      this.pos += 1;
      const next = this.peek();
      // « 20% » = 0,2 ; « 50000 * 20% » suit la grammaire classique.
      if (next?.kind === 'op' && next.value === '%') {
        this.pos += 1;
        return token.value / 100;
      }
      return token.value;
    }
    throw new ExpressionError('jeton inattendu');
  }
}

class ExpressionError extends Error {}

/** Évalue une expression en français. Renvoie null si ce n'est pas calculable. */
export function evaluate(raw: string): number | null {
  try {
    const expr = normalizeExpression(raw);
    if (!expr || !/[0-9]/.test(expr) || !/[+\-*/%]/.test(expr)) return null;
    const value = new Parser(tokenize(expr)).parse();
    if (!Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

/** « 20% de 50000 » → 10000. Pur, renvoie null si introuvable. */
export function percentOf(raw: string): { percent: number; base: number; result: number } | null {
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)\s+(\d)/g, '$1$2')
    .replace(/,/g, '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*%\s*(?:de|d)?\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const percent = Number(match[1]);
  const base = Number(match[2]);
  if (!Number.isFinite(percent) || !Number.isFinite(base)) return null;
  return { percent, base, result: (percent / 100) * base };
}

// ─── Plans d'épargne ──────────────────────────────────────
export interface EnvelopeResult {
  perDeposit: number;
  occurrences: number;
  frequency: DepositFrequency;
  intervalDays: number;
}

const DAYS_PER_MONTH = 30.4;

/**
 * Enveloppe à verser pour atteindre `target` en `horizonMonths`, selon la
 * fréquence de versement choisie. Arrondi à la centaine supérieure pour
 * ne jamais viser trop juste.
 */
export function savingsEnvelope(
  target: number,
  horizonMonths: number,
  frequency: DepositFrequency,
  intervalDays = 3,
): EnvelopeResult | null {
  if (!(target > 0) || !(horizonMonths > 0)) return null;
  const totalDays = horizonMonths * DAYS_PER_MONTH;
  let occurrences: number;
  switch (frequency) {
    case 'daily':
      occurrences = Math.round(totalDays);
      break;
    case 'weekly':
      occurrences = Math.round(totalDays / 7);
      break;
    case 'interval_days':
      if (!(intervalDays >= 2)) return null;
      occurrences = Math.round(totalDays / intervalDays);
      break;
    case 'monthly':
      occurrences = Math.round(horizonMonths);
      break;
  }
  if (occurrences < 1) return null;
  const perDeposit = Math.ceil(target / occurrences / 100) * 100;
  return { perDeposit, occurrences, frequency, intervalDays };
}

/** Projection d'un versement mensuel constant sur N mois. */
export function projectSavings(monthlyAmount: number, months: number): number {
  if (!(monthlyAmount > 0) || !(months > 0)) return 0;
  return monthlyAmount * months;
}
