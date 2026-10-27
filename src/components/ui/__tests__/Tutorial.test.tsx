/**
 * Tests de la logique pure du tutoriel guidé (parcours des étapes).
 * Le rendu de la modale repose sur les mêmes primitives que le reste
 * de l'app ; ici on vérifie le reducer et la cohérence des étapes.
 */
import {
  initialTutorialState,
  TUTORIAL_STEPS,
  tutorialReducer,
} from '../tutorial.model';

describe('tutoriel — reducer', () => {
  test('ouvre toujours à la première étape', () => {
    const state = tutorialReducer({ open: true, index: 4 }, { type: 'open' });
    expect(state).toEqual({ open: true, index: 0 });
  });

  test('avance étape par étape', () => {
    let state = initialTutorialState;
    state = tutorialReducer(state, { type: 'open' });
    state = tutorialReducer(state, { type: 'next' });
    expect(state.index).toBe(1);
    expect(state.open).toBe(true);
  });

  test('termine en fermant à la dernière étape', () => {
    const state = tutorialReducer(
      { open: true, index: TUTORIAL_STEPS.length - 1 },
      { type: 'next' },
    );
    expect(state.open).toBe(false);
    expect(state.index).toBe(0);
  });

  test('le retour ne descend pas sous zéro', () => {
    const state = tutorialReducer({ open: true, index: 0 }, { type: 'prev' });
    expect(state.index).toBe(0);
  });

  test('passer et fermer réinitialisent le parcours', () => {
    const skipped = tutorialReducer({ open: true, index: 3 }, { type: 'skip' });
    expect(skipped).toEqual({ open: false, index: 0 });
    const closed = tutorialReducer({ open: true, index: 2 }, { type: 'close' });
    expect(closed).toEqual({ open: false, index: 0 });
  });
});

describe('tutoriel — contenu', () => {
  test('chaque étape a un icône, un titre et un texte', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const step of TUTORIAL_STEPS) {
      expect(step.icon).toBeTruthy();
      expect(step.title.length).toBeGreaterThan(2);
      expect(step.body.length).toBeGreaterThan(20);
    }
  });

  test('une étape présente l’agent conversationnel et une autre le balayage', () => {
    const joined = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(' ');
    expect(joined).toMatch(/agent/i);
    expect(joined).toMatch(/glisse|balaye/i);
  });
});
