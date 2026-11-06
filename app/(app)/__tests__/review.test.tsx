/* eslint-disable import/first */
/**
 * Test de rendu de l'écran Bilan : avec un bilan réaliste, l'écran doit
 * afficher le score, le constat principal, les actions et rester rendable
 * sans base de données. Le calcul lui-même est testé dans
 * src/domain/__tests__/review.test.ts.
 */
jest.mock('@/src/db/useRepoQuery', () => {
  const { REVIEW_FIXTURE } = jest.requireActual('./fixtures/reviewFixture');
  return {
    useRepoQuery: () => ({ data: REVIEW_FIXTURE, status: 'ready', error: null, reload: jest.fn() }),
  };
});
jest.mock('@/src/db/repositories/adversaries.repo', () => ({
  listInstancesInRange: jest.fn(async () => []),
  listInstancesForDay: jest.fn(async () => []),
}));
jest.mock('@/src/db/repositories/transactions.repo', () => ({
  listTransactions: jest.fn(async () => []),
}));
jest.mock('@/src/db/repositories/budgets.repo', () => ({
  budgetsWithSpent: jest.fn(async () => []),
}));
jest.mock('@/src/services/gamification.service', () => ({
  getWarriorProfile: jest.fn(async () => ({
    id: 1,
    xp: 120,
    level: 3,
    streak: 5,
    shields: 1,
    wins: 12,
    losses: 3,
    combo: 2,
    best_combo: 5,
    medals: '[]',
    last_active: null,
    updated_at: 0,
  })),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSegments: jest.fn(() => ['(app)', 'review']),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/src/store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ pushReminder: jest.fn(), showXpFeedback: jest.fn() }),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { ThemeProvider } from '@/src/theme/ThemeContext';
import ReviewScreen from '../review';
import { REVIEW_FIXTURE } from './fixtures/reviewFixture';

function textsOf(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap((node) => node.children.filter((child): child is string => typeof child === 'string'));
}

describe('écran Bilan', () => {
  it('affiche le score, le constat et les actions sans crash', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <ReviewScreen />
        </ThemeProvider>,
      );
    });

    const joined = textsOf(renderer).join(' | ');

    expect(joined).toContain('Bilan');
    expect(joined).toContain(String(REVIEW_FIXTURE.score.value));
    expect(joined).toContain('Ce que ça dit');
    expect(joined).toContain('Et maintenant');
    expect(joined).toContain('Régularité');
    expect(joined).toContain('Entrées');
    expect(joined).not.toContain('undefined');
    expect(joined).not.toContain('NaN');

    act(() => {
      renderer.unmount();
    });
  });
});
