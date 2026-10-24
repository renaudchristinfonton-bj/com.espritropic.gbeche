/**
 * GBECHE — Décision de routage (logique pure, testable unitairement).
 * Le BootGate du layout racine s'appuie dessus pour choisir le groupe
 * de routes courant à partir de l'état de session réel. Aucune I/O ici :
 * l'appelant fournit un instantané de l'état.
 */

export type RouteGroup = '(onboarding)' | '(auth)' | '(app)';

export interface RoutingState {
  /** L'onboarding (5 étapes) a été mené jusqu'au bout. */
  onboardingDone: boolean;
  /** Un code PIN est stocké (Keystore/Keychain ou localStorage web). */
  pinConfigured: boolean;
  /** L'utilisateur s'est déverrouillé dans la session en cours. */
  isUnlocked: boolean;
}

/**
 * Règles de priorité :
 *  1. Onboarding non terminé  → forcer l'onboarding, quoi qu'il arrive.
 *  2. PIN existant et session verrouillée → écran de verrouillage.
 *  3. Sinon → l'application.
 */
export function resolveRouteGroup(state: RoutingState): RouteGroup {
  if (!state.onboardingDone) return '(onboarding)';
  if (state.pinConfigured && !state.isUnlocked) return '(auth)';
  return '(app)';
}

/** Chemin absolu de la première route d'un groupe. */
export function routePathFor(group: RouteGroup): string {
  switch (group) {
    case '(onboarding)':
      return '/(onboarding)';
    case '(auth)':
      return '/(auth)/pin';
    case '(app)':
      return '/(app)/home';
  }
}
