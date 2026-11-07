/**
 * GBECHE — Jetons de mouvement.
 *
 * Une seule échelle de durées pour toute l'app, et deux fonctions pures
 * qui respectent le réglage système « Réduire les animations ».
 * Les durées ne sont jamais codées en dur dans les écrans.
 */

import { Easing } from 'react-native-reanimated';

export const MOTION = {
  /** Micro-retours (halo, pastille). */
  instant: 90,
  /** Changement d'état immédiat (case cochée). */
  fast: 160,
  /** Transition standard (apparition de carte, bascule d'onglet). */
  normal: 260,
  /** Entrée d'écran, feuille modale. */
  slow: 420,
  /** Célébration (niveau gagné). */
  slower: 640,
  /** Décalage entre deux éléments d'une liste animée. */
  stagger: 45,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  easing: {
    out: Easing.out(Easing.cubic),
    inOut: Easing.inOut(Easing.quad),
    /** Léger dépassement pour les validations. */
    pop: Easing.out(Easing.back(1.4)),
  },
} as const;

/** Durée effective : 0 quand l'utilisateur a réduit les animations. */
export function motionDuration(base: number, reduceMotion: boolean | null | undefined): number {
  if (reduceMotion) return 0;
  if (!Number.isFinite(base) || base < 0) return 0;
  return Math.round(base);
}

/** Délai d'entrée en cascade, plafonné pour ne jamais retarder la lecture. */
export function enterDelay(
  index: number,
  reduceMotion: boolean | null | undefined,
  step: number = MOTION.stagger,
  max = 240,
): number {
  if (reduceMotion) return 0;
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return Math.min(max, safeIndex * Math.max(0, step));
}
