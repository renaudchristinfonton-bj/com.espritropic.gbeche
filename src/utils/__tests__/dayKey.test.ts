import { dayKeyToMs, lastDayKeys, startOfDayMs, toDayKey } from '../dayKey';

describe('toDayKey — jours locaux', () => {
  it('garde le jour local même tard le soir', () => {
    const late = new Date(2026, 10, 6, 23, 59, 30).getTime();
    expect(toDayKey(late)).toBe('2026-11-06');
  });

  it('garde le jour local tôt le matin', () => {
    const early = new Date(2026, 10, 6, 0, 0, 1).getTime();
    expect(toDayKey(early)).toBe('2026-11-06');
  });

  it('ne décale jamais d’un jour à cause d’UTC (23 h en UTC+1 = 22 h UTC)', () => {
    // 6 novembre 23 h 30 local : en UTC c'est encore le 6, mais à Abidjan
    // ou à Cotonou l'heure d'été n'existe pas — le piège réel est 0 h 30.
    const midnightPlus = new Date(2026, 10, 6, 0, 30).getTime();
    // L'ancienne implémentation (toISOString) renvoyait 2026-11-05 en UTC+1.
    expect(toDayKey(midnightPlus)).toBe('2026-11-06');
  });

  it('complète le mois et le jour sur deux chiffres', () => {
    expect(toDayKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 11, 31, 12).getTime())).toBe('2026-12-31');
  });
});

describe('startOfDayMs', () => {
  it('ramène au minuit local', () => {
    const at = new Date(2026, 10, 6, 18, 42, 12, 500).getTime();
    const start = startOfDayMs(at);
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(start).getMinutes()).toBe(0);
    expect(toDayKey(start)).toBe(toDayKey(at));
  });

  it('est idempotent', () => {
    const at = new Date(2026, 5, 15, 9).getTime();
    expect(startOfDayMs(startOfDayMs(at))).toBe(startOfDayMs(at));
  });
});

describe('dayKeyToMs', () => {
  it('fait l’aller-retour avec toDayKey', () => {
    const at = new Date(2026, 2, 9, 16).getTime();
    const key = toDayKey(at);
    const back = dayKeyToMs(key);
    expect(back).not.toBeNull();
    expect(toDayKey(back as number)).toBe(key);
  });

  it('rejette les clés mal formées', () => {
    expect(dayKeyToMs('2026-1-5')).toBeNull();
    expect(dayKeyToMs('06/11/2026')).toBeNull();
    expect(dayKeyToMs('')).toBeNull();
  });

  it('rejette les dates qui n’existent pas au calendrier', () => {
    expect(dayKeyToMs('2026-02-30')).toBeNull();
    expect(dayKeyToMs('2026-13-01')).toBeNull();
  });

  it('accepte le 29 février d’une année bissextile', () => {
    expect(dayKeyToMs('2028-02-29')).not.toBeNull();
  });
});

describe('lastDayKeys', () => {
  const end = new Date(2026, 10, 6, 12).getTime();

  it('renvoie les jours du plus ancien au plus récent', () => {
    expect(lastDayKeys(end, 3)).toEqual(['2026-11-04', '2026-11-05', '2026-11-06']);
  });

  it('traverse correctement une fin de mois', () => {
    const monthEnd = new Date(2026, 2, 2, 8).getTime();
    expect(lastDayKeys(monthEnd, 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('renvoie une liste vide pour un compte nul ou négatif', () => {
    expect(lastDayKeys(end, 0)).toEqual([]);
    expect(lastDayKeys(end, -4)).toEqual([]);
  });

  it('produit des clés uniques', () => {
    const keys = lastDayKeys(end, 90);
    expect(keys).toHaveLength(90);
    expect(new Set(keys).size).toBe(90);
  });
});
