/* eslint-disable import/first */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useSegments: jest.fn(() => ['(app)', 'home']),
}));

import { decideSwipe, TAB_ORDER } from '../SwipeTabView';

describe('decideSwipe — navigation par balayage', () => {
  test('ignore les petits mouvements', () => {
    expect(decideSwipe(40, 0)).toBe(0);
    expect(decideSwipe(-80, 0)).toBe(0);
  });

  test('glissement vers la droite = onglet précédent', () => {
    expect(decideSwipe(120, 10)).toBe(-1);
  });

  test('glissement vers la gauche = onglet suivant', () => {
    expect(decideSwipe(-120, 10)).toBe(1);
  });

  test('ignore les diagonales trop verticales (défilement)', () => {
    expect(decideSwipe(150, 120)).toBe(0);
    expect(decideSwipe(-200, 160)).toBe(0);
  });

  test('les onglets sont ordonnés de façon stable', () => {
    expect(TAB_ORDER).toEqual(['home', 'calendar', 'wars', 'finance', 'settings']);
  });
});
