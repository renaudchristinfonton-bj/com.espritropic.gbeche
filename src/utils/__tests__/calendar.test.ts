import {
  buildMonthGrid,
  dayKeyFromTimestamp,
  monthRange,
  monthTitle,
  sameDay,
  WEEKDAY_LABELS,
} from '../calendar';

describe('buildMonthGrid', () => {
  test('retourne toujours 42 cellules (6 semaines)', () => {
    const reference = new Date(2026, 9, 26);
    expect(buildMonthGrid(2026, 9, reference)).toHaveLength(42);
  });

  test('octobre 2026 commence un jeudi : 3 cellules de débordement avant', () => {
    const reference = new Date(2026, 9, 26);
    const grid = buildMonthGrid(2026, 9, reference);
    // Le 1er octobre est en position 3 (lun=0, mar=1, mer=2, jeu=3).
    expect(grid[3].day).toBe(1);
    expect(grid[3].inMonth).toBe(true);
    expect(grid[0].inMonth).toBe(false);
    expect(grid[0].day).toBe(28); // lundi 28 septembre
  });

  test('marque correctement le jour de référence comme aujourd’hui', () => {
    const reference = new Date(2026, 9, 26);
    const grid = buildMonthGrid(2026, 9, reference);
    const todays = grid.filter((cell) => cell.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].day).toBe(26);
  });

  test('les timestamps sont tous à minuit', () => {
    const grid = buildMonthGrid(2026, 0, new Date(2026, 0, 15));
    for (const cell of grid) {
      const date = new Date(cell.timestamp);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    }
  });
});

describe('sameDay', () => {
  test('compare uniquement la date civile', () => {
    expect(sameDay(new Date(2026, 9, 26, 8), new Date(2026, 9, 26, 22))).toBe(true);
    expect(sameDay(new Date(2026, 9, 26), new Date(2026, 9, 27))).toBe(false);
  });
});

describe('dayKeyFromTimestamp', () => {
  test('regroupe deux heures du même jour sur la même clé', () => {
    const a = dayKeyFromTimestamp(new Date(2026, 9, 26, 7, 30).getTime());
    const b = dayKeyFromTimestamp(new Date(2026, 9, 26, 19, 0).getTime());
    expect(a).toBe(b);
  });
});

describe('monthRange', () => {
  test('couvre tout le mois sans déborder', () => {
    const { start, end } = monthRange(2026, 9);
    expect(new Date(start).getDate()).toBe(1);
    expect(new Date(end).getDate()).toBe(31);
    expect(new Date(end).getHours()).toBe(23);
  });
});

describe('monthTitle', () => {
  test('produit un libellé français avec capitale', () => {
    expect(monthTitle(2026, 9)).toBe('Octobre 2026');
    expect(monthTitle(2026, 0)).toBe('Janvier 2026');
  });

  test('les étiquettes de semaine sont ordonnées lundi → dimanche', () => {
    expect(WEEKDAY_LABELS[0]).toBe('Lun');
    expect(WEEKDAY_LABELS[6]).toBe('Dim');
  });
});
