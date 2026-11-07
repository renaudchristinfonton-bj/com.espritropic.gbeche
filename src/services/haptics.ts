/**
 * Haptiques — implémentation native (iOS/Android).
 * Ré-exports explicites d'expo-haptics : même surface que la version web
 * (haptics.web.ts) pour que le code métier reste identique partout.
 */
import * as ExpoHaptics from 'expo-haptics';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export const impactAsync = ExpoHaptics.impactAsync;
export const notificationAsync = ExpoHaptics.notificationAsync;
export const selectionAsync = ExpoHaptics.selectionAsync;
