/* eslint-disable import/first */
/**
 * Bandeau de performance d'une guerre : il doit dire la vérité, y compris
 * quand il n'y a rien à dire (aucune mission, aucun comparatif).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

import { ThemeProvider } from '@/src/theme/ThemeContext';
import { WarPerformanceStrip } from '../WarPerformanceStrip';
import type { WarPerformance, ReviewWarLine } from '@/src/domain/review';

const LINE: ReviewWarLine = {
  id: 'w-money',
  title: 'Argent',
  icon: 'wallet',
  color: '#FFD700',
  wins: 1,
  losses: 3,
  pending: 1,
  total: 5,
  completionRate: 0.25,
  xp: 10,
  share: 0.2,
};

function performance(over: Partial<WarPerformance> = {}): WarPerformance {
  return {
    warId: 'w-money',
    current: LINE,
    previous: null,
    rateDelta: null,
    winsDelta: null,
    ...over,
  };
}

function texts(perf: WarPerformance): string {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <WarPerformanceStrip performance={perf} color="#FFD700" />
      </ThemeProvider>,
    );
  });
  const out = renderer.root
    .findAllByType('Text' as never)
    .flatMap((node) => node.children.filter((child): child is string => typeof child === 'string'))
    .join(' ')
    // Les interpolations d'un même <Text> produisent des espaces multiples.
    .replace(/\s+/g, ' ');
  act(() => renderer.unmount());
  return out;
}

describe('WarPerformanceStrip', () => {
  it('affiche le taux, le détail et l’XP', () => {
    const out = texts(performance());
    expect(out).toContain('25 %');
    expect(out).toContain('1 V · 3 D');
    expect(out).toContain('+10 XP');
    expect(out).toContain('30 derniers jours');
  });

  it('annonce l’absence de comparatif quand il n’y a pas d’historique', () => {
    expect(texts(performance())).toContain('Pas de comparatif');
  });

  it('signale une progression en points', () => {
    const out = texts(
      performance({
        previous: { ...LINE, wins: 0, losses: 4, completionRate: 0 },
        rateDelta: 0.25,
        winsDelta: 1,
      }),
    );
    expect(out).toContain('+25 pts');
    expect(out).toContain('1 victoire de plus');
  });

  it('signale une baisse', () => {
    const out = texts(
      performance({
        current: { ...LINE, wins: 0, losses: 4, completionRate: 0 },
        previous: { ...LINE, wins: 4, losses: 0, completionRate: 1 },
        rateDelta: -1,
        winsDelta: -4,
      }),
    );
    expect(out).toContain('−100 pts');
    expect(out).toContain('4 victoires de moins');
  });

  it('affiche « Stable » pour un écart négligeable', () => {
    expect(texts(performance({ rateDelta: 0, winsDelta: 0, previous: LINE }))).toContain('Stable');
  });

  it('explique le vide au lieu d’afficher un faux zéro', () => {
    const out = texts(performance({ current: null }));
    expect(out).toContain('Aucune mission planifiée');
    expect(out).not.toContain('0 %');
  });

  it('affiche un tiret quand rien n’est tranché', () => {
    const out = texts(
      performance({
        current: { ...LINE, wins: 0, losses: 0, pending: 3, total: 3, completionRate: null, xp: 0 },
      }),
    );
    expect(out).toContain('—');
    expect(out).toContain('Aucune mission tranchée pour l’instant');
    expect(out).not.toContain('NaN');
    expect(out).not.toContain('null');
  });
});
