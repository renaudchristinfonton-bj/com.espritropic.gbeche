/**
 * Tests du moteur de calcul local : arithmétique sûre (sans eval),
 * pourcentages et enveloppes d'épargne par fréquence.
 */
import {
  evaluate,
  normalizeExpression,
  percentOf,
  projectSavings,
  savingsEnvelope,
} from '../calculator';

describe('normalisation des expressions', () => {
  test('convertit les opérateurs parlés et la virgule française', () => {
    expect(normalizeExpression('1 500,5 divisé par 3')).toContain('1500.5/3');
    expect(normalizeExpression('2 fois 4')).toBe('2*4');
    expect(normalizeExpression('10 × 5')).toBe('10*5');
  });
});

describe('evaluate — arithmétique sans eval', () => {
  test('opérations de base et priorité des opérateurs', () => {
    expect(evaluate('2 + 3 × 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('250000 * 12')).toBe(3_000_000);
    expect(evaluate('10 / 4')).toBe(2.5);
    expect(evaluate('1 500 000 divisé par 12')).toBeCloseTo(125_000, 0);
  });

  test('pourcentages et signes', () => {
    expect(evaluate('20%')).toBe(0.2);
    expect(evaluate('50000 * 20%')).toBe(10_000);
    expect(evaluate('-5 + 2')).toBe(-3);
  });

  test('renvoie null sur une expression invalide ou dangereuse', () => {
    expect(evaluate('bonjour')).toBeNull();
    expect(evaluate('')).toBeNull();
    expect(evaluate('1 / 0')).toBeNull();
    // Aucun identifiant ne peut passer (pas d'eval, pas d'accès à des objets).
    expect(evaluate('process.exit(1)')).toBeNull();
  });
});

describe('percentOf', () => {
  test('calcule un pourcentage de', () => {
    expect(percentOf('20% de 50000')).toEqual({ percent: 20, base: 50000, result: 10000 });
    expect(percentOf('30 % de 1 500 000')?.result).toBe(450_000);
  });

  test('renvoie null sans motif de pourcentage', () => {
    expect(percentOf('juste du texte')).toBeNull();
  });
});

describe('savingsEnvelope — fréquences libres', () => {
  test('versement mensuel sur 12 mois', () => {
    const result = savingsEnvelope(3_000_000, 12, 'monthly');
    expect(result?.occurrences).toBe(12);
    expect(result?.perDeposit).toBe(250_000);
  });

  test('versement hebdomadaire arrondi à la centaine supérieure', () => {
    const result = savingsEnvelope(1_000_000, 12, 'weekly');
    expect(result).not.toBeNull();
    expect(result!.perDeposit).toBeGreaterThan(0);
    expect(result!.perDeposit % 100).toBe(0);
    // ~52 semaines sur 12 mois.
    expect(result!.occurrences).toBeGreaterThanOrEqual(50);
  });

  test('tous les 3 jours', () => {
    const result = savingsEnvelope(900_000, 6, 'interval_days', 3);
    expect(result?.frequency).toBe('interval_days');
    expect(result?.intervalDays).toBe(3);
    expect(result?.occurrences).toBeGreaterThan(0);
  });

  test('refuse un intervalle inférieur à 2 jours et les cibles nulles', () => {
    expect(savingsEnvelope(1000, 3, 'interval_days', 1)).toBeNull();
    expect(savingsEnvelope(0, 3, 'monthly')).toBeNull();
  });

  test('projection mensuelle', () => {
    expect(projectSavings(250_000, 12)).toBe(3_000_000);
    expect(projectSavings(0, 12)).toBe(0);
  });
});
