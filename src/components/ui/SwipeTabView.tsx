/**
 * GBECHE — Navigation par balayage entre les onglets principaux.
 *
 * Utilise le PanResponder natif de React Native (aucune dépendance
 * supplémentaire, fonctionne identiquement sur iOS, Android et le web) :
 * un glissement horizontal suffisamment long change d'onglet, tandis que
 * les gestes verticaux (défilement) et les petits mouvements sont laissés
 * aux ScrollView enfants.
 */
import React, { useMemo } from 'react';
import {
  PanResponder,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type ViewStyle,
} from 'react-native';
import { router, useSegments } from 'expo-router';

import * as Haptics from '../../services/haptics';

export const TAB_ORDER = ['home', 'calendar', 'wars', 'finance', 'settings'] as const;
export type TabName = (typeof TAB_ORDER)[number];

const SWIPE_DISTANCE = 90;
const CLAIM_DISTANCE = 24;

/**
 * Décision pure (testable) : -1 = onglet précédent, 1 = suivant, 0 = rien.
 * Exige un mouvement horizontal franc, jamais une diagonale de scroll.
 */
export function decideSwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_DISTANCE) return 0;
  if (Math.abs(dy) > Math.abs(dx) / 2.2) return 0;
  return dx > 0 ? -1 : 1;
}

interface SwipeTabViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SwipeTabView({ children, style }: SwipeTabViewProps) {
  const segments = useSegments() as string[];
  const current = (segments[1] ?? 'home') as TabName;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) =>
          Math.abs(gesture.dx) > CLAIM_DISTANCE &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_event, gesture) => {
          const direction = decideSwipe(gesture.dx, gesture.dy);
          if (direction === 0) return;
          const index = TAB_ORDER.indexOf(current);
          const next = TAB_ORDER[index + direction];
          if (!next) return;
          Haptics.selectionAsync().catch(() => {});
          router.replace(`/(app)/${next}`);
        },
      }),
    [current],
  );

  return (
    <View style={[{ flex: 1 }, style]} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
