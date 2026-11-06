/* eslint-disable import/first */
/**
 * Rendu des deux cartes du bilan : objectif calibré et répartition par
 * guerre. On vérifie qu'elles s'affichent, qu'elles gèrent le vide et
 * qu'elles ne laissent jamais passer de valeur technique.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return { ...actual, useReducedMotion: () => false };
});

import { ThemeProvider } from '@/src/theme/ThemeContext';
import { WeeklyTargetCard } from '../WeeklyTargetCard';
import { WarBreakdown } from '../WarBreakdown';
import type { ReviewWarLine } from '@/src/domain/review';
import type { WeeklyTarget } from '@/src/domain/reviewSeries';

function textsOf(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap((node) => node.children.filter((child): child is string => typeof child === 'string'));
}

function render(node: React.ReactElement): TestRenderer.ReactTestRenderer {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<ThemeProvider>{node}</ThemeProvider>);
  });
  return renderer;
}

const TARGET: WeeklyTarget = {
  target: 62,
  baseline: 59,
  current: 55,
  historyWeeks: 3,
  gap: -7,
  reached: false,
  mode: 'climb',
  message: 'Il manque 7 points pour l’objectif de 62/100, calibré sur tes 3 semaines passées.',
};

const REACHED: WeeklyTarget = { ...TARGET, current: 68, gap: 6, reached: true, message: 'Objectif tenu : 68/100 contre 62 visés.' };

const WARS: ReviewWarLine[] = [
  {
    id: 'w-sport',
    title: 'Santé',
    icon: 'flame',
    color: '#00E5FF',
    wins: 4,
    losses: 0,
    pending: 1,
    total: 5,
    completionRate: 1,
    xp: 80,
    share: 0.8,
  },
  {
    id: 'w-money',
    title: 'Argent',
    icon: 'wallet',
    color: '#FFD700',
    wins: 1,
    losses: 3,
    pending: 0,
    total: 4,
    completionRate: 0.25,
    xp: 20,
    share: 0.2,
  },
];

describe('WeeklyTargetCard', () => {
  it('affiche le score, la cible et le message', () => {
    const renderer = render(<WeeklyTargetCard target={TARGET} points={[{ label: 'S-1', value: 40 }]} />);
    const joined = textsOf(renderer).join(' | ');
    expect(joined).toContain('Objectif de la semaine');
    expect(joined).toContain('55');
    expect(joined).toContain('62');
    expect(joined).toContain('Il manque 7 points');
    expect(joined).toContain('EN COURS');
  });

  it('signale un objectif tenu', () => {
    const renderer = render(<WeeklyTargetCard target={REACHED} points={[]} animated={false} />);
    const joined = textsOf(renderer).join(' | ');
    expect(joined).toContain('TENU');
    expect(joined).toContain('Objectif tenu');
  });

  it('explique l’absence de courbe au lieu de la simuler', () => {
    const renderer = render(<WeeklyTargetCard target={REACHED} points={[]} animated={false} />);
    expect(textsOf(renderer).join(' ')).toContain('deuxième semaine');
  });
});

describe('WarBreakdown', () => {
  it('affiche une ligne par guerre active', () => {
    const renderer = render(<WarBreakdown lines={WARS} />);
    const texts = textsOf(renderer);
    // Les interpolations d'un même <Text> arrivent en plusieurs nœuds :
    // on recompose donc la phrase sans séparateur pour la vérifier.
    const dense = texts.join('');
    expect(dense).toContain('Santé');
    expect(dense).toContain('Argent');
    expect(dense).toContain('100 %');
    expect(dense).toContain('25 %');
    expect(dense).toContain('4 V · 0 D');
    expect(dense).toContain('+80 XP');
  });

  it('masque une guerre sans aucune mission', () => {
    const idle: ReviewWarLine = { ...WARS[0], id: 'w-idle', title: 'Loisirs', total: 0, wins: 0, losses: 0, pending: 0 };
    const renderer = render(<WarBreakdown lines={[WARS[0], idle]} />);
    expect(textsOf(renderer).join(' ')).not.toContain('Loisirs');
  });

  it('gère une liste vide avec un message honnête', () => {
    const renderer = render(<WarBreakdown lines={[]} />);
    expect(textsOf(renderer).join(' ')).toContain('Aucune mission');
  });

  it('affiche un tiret plutôt qu’un faux taux', () => {
    const pendingOnly: ReviewWarLine = {
      ...WARS[0],
      wins: 0,
      losses: 0,
      pending: 2,
      total: 2,
      completionRate: null,
      xp: 0,
      share: 0,
    };
    const renderer = render(<WarBreakdown lines={[pendingOnly]} />);
    const joined = textsOf(renderer).join(' | ');
    expect(joined).toContain('—');
    expect(joined).not.toContain('NaN');
    expect(joined).not.toContain('null');
  });
});
