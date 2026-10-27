import {
  addDays,
  computeOccurrences,
  dayRange,
  startOfToday,
} from '../recurrence';

const DAY_MS = 24 * 60 * 60 * 1000;

// Lundi 2 mars 2026, 10 h locales.
const base = new Date(2026, 2, 2, 10, 0, 0, 0).getTime();

describe('computeOccurrences', () => {
  test('once : une seule occurrence, à l\'heure planifiée', () => {
    const result = computeOccurrences(
      { frequency: 'once', startDate: base, endDate: null, specificDays: [], hour: 7 },
      addDays(base, 10),
    );
    expect(result).toHaveLength(1);
    expect(new Date(result[0]).getHours()).toBe(7);
  });

  test('daily : une occurrence par jour calendaire avec la bonne heure', () => {
    const result = computeOccurrences(
      { frequency: 'daily', startDate: base, endDate: null, specificDays: [], hour: 18 },
      addDays(base, 7),
    );
    expect(result).toHaveLength(7);
    expect(result.every((ts) => new Date(ts).getHours() === 18)).toBe(true);
  });

  test('weekly : uniquement le même jour de la semaine que le départ', () => {
    const result = computeOccurrences(
      { frequency: 'weekly', startDate: base, endDate: null, specificDays: [], hour: 8 },
      addDays(base, 21),
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((ts) => new Date(ts).getDay() === new Date(base).getDay())).toBe(true);
  });

  test('specific_days : respecte strictement les jours ISO choisis', () => {
    // ISO 1 = lundi, 3 = mercredi, 5 = vendredi. Heure 12 pour inclure
    // le lundi de départ (base à 10 h, un rendez-vous de 6 h serait filtré).
    const result = computeOccurrences(
      { frequency: 'specific_days', startDate: base, endDate: null, specificDays: [1, 3, 5], hour: 12 },
      addDays(base, 13),
    );
    const iso = (ts: number) => {
      const d = new Date(ts).getDay();
      return d === 0 ? 7 : d;
    };
    expect(result.every((ts) => [1, 3, 5].includes(iso(ts)))).toBe(true);
    expect(result).toHaveLength(6); // 2 semaines × 3 jours
  });

  test('monthly : uniquement le même jour du mois', () => {
    const result = computeOccurrences(
      { frequency: 'monthly', startDate: base, endDate: null, specificDays: [], hour: 12 },
      addDays(base, 62),
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((ts) => new Date(ts).getDate() === 2)).toBe(true);
  });

  test('endDate borne les occurrences', () => {
    const result = computeOccurrences(
      { frequency: 'daily', startDate: base, endDate: addDays(base, 3), specificDays: [], hour: 9 },
      addDays(base, 30),
    );
    expect(result).toHaveLength(3);
  });

  test('aucune occurrence dans le passé par rapport à startDate', () => {
    const result = computeOccurrences(
      { frequency: 'daily', startDate: base, endDate: null, specificDays: [], hour: 6 },
      addDays(base, 2),
    );
    expect(result.every((ts) => ts >= base - DAY_MS)).toBe(true);
  });

  test('interval_days : une occurrence tous les N jours exactement', () => {
    const result = computeOccurrences(
      {
        frequency: 'interval_days',
        startDate: base,
        endDate: null,
        specificDays: [],
        hour: 10,
        intervalDays: 3,
      },
      addDays(base, 10),
    );
    // Jours 0, 3, 6, 9 → 4 occurrences sur 10 jours.
    expect(result).toHaveLength(4);
    expect(result.every((ts, index) => Math.round((ts - base) / DAY_MS) === index * 3)).toBe(true);
  });

  test('la minute précise est respectée sur chaque occurrence', () => {
    const result = computeOccurrences(
      {
        frequency: 'daily',
        startDate: base,
        endDate: null,
        specificDays: [],
        hour: 6,
        minute: 45,
      },
      addDays(base, 3),
    );
    expect(result).toHaveLength(3);
    expect(result.every((ts) => {
      const d = new Date(ts);
      return d.getHours() === 6 && d.getMinutes() === 45;
    })).toBe(true);
  });

  test('interval_days avec un intervalle invalide retombe sur un rythme quotidien', () => {
    const result = computeOccurrences(
      {
        frequency: 'interval_days',
        startDate: base,
        endDate: null,
        specificDays: [],
        hour: 8,
        intervalDays: 0,
      },
      addDays(base, 2),
    );
    expect(result).toHaveLength(2);
  });
});

describe('utilitaires de dates', () => {
  test('dayRange couvre de minuit à 23:59:59.999', () => {
    const { start, end } = dayRange(base);
    const s = new Date(start);
    const e = new Date(end);
    expect(s.getHours()).toBe(0);
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getSeconds()).toBe(59);
  });

  test('startOfToday est bien minuit du jour courant', () => {
    const d = new Date(startOfToday());
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
