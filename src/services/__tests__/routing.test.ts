import { resolveRouteGroup, routePathFor } from '../routing';

describe('resolveRouteGroup — matrice de routage du BootGate', () => {
  test('onboarding non terminé → toujours l\'onboarding, quel que soit le reste', () => {
    expect(
      resolveRouteGroup({ onboardingDone: false, pinConfigured: true, isUnlocked: true }),
    ).toBe('(onboarding)');
    expect(
      resolveRouteGroup({ onboardingDone: false, pinConfigured: false, isUnlocked: false }),
    ).toBe('(onboarding)');
  });

  test('onboarding terminé + PIN + session verrouillée → écran de verrouillage', () => {
    expect(
      resolveRouteGroup({ onboardingDone: true, pinConfigured: true, isUnlocked: false }),
    ).toBe('(auth)');
  });

  test('onboarding terminé + PIN + session déverrouillée → l\'application', () => {
    expect(
      resolveRouteGroup({ onboardingDone: true, pinConfigured: true, isUnlocked: true }),
    ).toBe('(app)');
  });

  test('onboarding terminé sans PIN → l\'application directement', () => {
    expect(
      resolveRouteGroup({ onboardingDone: true, pinConfigured: false, isUnlocked: false }),
    ).toBe('(app)');
  });

  test('régression : le déverrouillage fait bien sortir de (auth)', () => {
    const locked = resolveRouteGroup({
      onboardingDone: true,
      pinConfigured: true,
      isUnlocked: false,
    });
    const unlocked = resolveRouteGroup({
      onboardingDone: true,
      pinConfigured: true,
      isUnlocked: true,
    });
    expect(locked).toBe('(auth)');
    expect(unlocked).toBe('(app)');
  });
});

describe('routePathFor', () => {
  test('mappe chaque groupe sur sa route d\'entrée', () => {
    expect(routePathFor('(onboarding)')).toBe('/(onboarding)');
    expect(routePathFor('(auth)')).toBe('/(auth)/pin');
    expect(routePathFor('(app)')).toBe('/(app)/home');
  });
});
