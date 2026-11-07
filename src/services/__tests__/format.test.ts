import {
  daysBetween,
  formatCompact,
  formatCurrency,
  greeting,
  monthKey,
  todayKey,
} from '../format';

// Node/ICU utilise l'espace insécable fine (U+202F) comme séparateur de
// milliers fr-FR : on normalise pour comparer avec une espace classique.
const normalizeSpaces = (value: string) => value.replace(/[\u202F\u00A0]/g, ' ');

describe('formatCurrency', () => {
  test('arrondit et ajoute le suffixe FCFA', () => {
    expect(normalizeSpaces(formatCurrency(1500))).toBe('1 500 FCFA');
    expect(normalizeSpaces(formatCurrency(1234.6))).toBe('1 235 FCFA');
  });

  test('gère zéro et les montants négatifs', () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe('0 FCFA');
    expect(normalizeSpaces(formatCurrency(-2500))).toBe('-2 500 FCFA');
  });
});

describe('formatCompact', () => {
  test('k et M selon l\'ordre de grandeur', () => {
    expect(formatCompact(15000)).toBe('15 k');
    expect(formatCompact(2500000)).toBe('2,5 M');
    expect(formatCompact(999)).toBe('999');
  });
});

describe('dates clés', () => {
  test('todayKey a le format YYYY-MM-DD', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('monthKey a le format YYYY-MM', () => {
    expect(monthKey(new Date(2026, 0, 15).getTime())).toBe('2026-01');
  });

  test('daysBetween traverse correctement les mois', () => {
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10);
    expect(daysBetween('2026-03-05', '2026-03-05')).toBe(0);
  });
});

describe('greeting', () => {
  const fakeNow = (hour: number) =>
    new Date(2026, 2, 2, hour, 0, 0, 0).getTime();

  afterEach(() => {
    jest.useRealTimers();
  });

  test('matin / après-midi / soir', () => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow(8));
    expect(greeting()).toBe('Bonjour');

    jest.setSystemTime(fakeNow(14));
    expect(greeting()).toBe('Bon après-midi');

    jest.setSystemTime(fakeNow(21));
    expect(greeting()).toBe('Bonsoir');
  });
});
