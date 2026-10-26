/* eslint-disable import/first */
/**
 * Test de rendu de la refonte Agenda : la grille mensuelle doit afficher
 * 42 cellules, les étiquettes de semaine et le jour courant sans crash.
 * Toutes les sources de données sont mockées (logique grille testée à
 * part dans src/utils/__tests__/calendar.test.ts).
 */
jest.mock('@/src/db/useRepoQuery', () => ({
  useRepoQuery: (fetcher: () => unknown) => ({
    data: fetcher.name.includes('Range') ? [] : [],
    status: 'ready',
    error: null,
    reload: jest.fn(),
  }),
}));
jest.mock('@/src/db/repositories/adversaries.repo', () => ({
  listInstancesForDay: jest.fn(async () => []),
  listInstancesInRange: jest.fn(async () => []),
}));
jest.mock('@/src/db/repositories/wars.repo', () => ({
  getWar: jest.fn(async () => null),
}));
jest.mock('@/src/services/gamification.service', () => ({
  winAdversary: jest.fn(async () => ({
    xpGained: 50,
    multiplier: 1,
    combo: 1,
    leveledUp: false,
  })),
}));
jest.mock('@/src/services/notifications.service', () => ({
  getNotificationPermission: jest.fn(async () => 'default'),
  requestNotificationPermission: jest.fn(async () => 'granted'),
}));
jest.mock('@/src/store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ showXpFeedback: jest.fn() }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useSegments: jest.fn(() => ['(app)', 'calendar']),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';

import { ThemeProvider } from '@/src/theme/ThemeContext';
import { WEEKDAY_LABELS } from '@/src/utils/calendar';
import CalendarScreen from '../calendar';

function renderCalendar() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <CalendarScreen />
      </ThemeProvider>,
    );
  });
  return renderer;
}

describe('<CalendarScreen />', () => {
  test('se rend sans crasher', () => {
    expect(() => renderCalendar()).not.toThrow();
  });

  test('affiche le titre et les 7 étiquettes de semaine', () => {
    const renderer = renderCalendar();
    const texts = renderer.root
      .findAllByType(Text)
      .map((node) => String(node.props.children))
      .join(' | ');
    expect(texts).toContain('Agenda');
    for (const label of WEEKDAY_LABELS) {
      expect(texts).toContain(label);
    }
  });

  test('rend une cellule pressable pour chaque jour du mois courant', () => {
    const renderer = renderCalendar();
    // Le preset masque le type Pressable : on repère la cellule racine à
    // son onPress (les View hôtes enfants n'en ont pas) + son label numérique.
    const cells = renderer.root.findAll(
      (node) =>
        typeof node.props?.onPress === 'function' &&
        /^\d{1,2}(,|$)/.test(String(node.props?.accessibilityLabel ?? '')),
    );
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(cells).toHaveLength(daysInMonth);
  });

  test('affiche l’état vide du jour sans mission', () => {
    const renderer = renderCalendar();
    const texts = renderer.root
      .findAllByType(Text)
      .map((node) => String(node.props.children))
      .join(' | ');
    expect(texts).toContain('Aucune mission ce jour');
  });

  test('contient une vue racine', () => {
    const renderer = renderCalendar();
    expect(renderer.root.findAllByType(View).length).toBeGreaterThan(10);
  });
});
