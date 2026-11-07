/**
 * Haptiques — implémentation web : aucune vibration native, on rend des
 * promesses résolues pour garder la même API que la version native.
 */

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Rigid: 'rigid',
  Soft: 'soft',
} as const;

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export async function impactAsync(): Promise<void> {}

export async function notificationAsync(): Promise<void> {}

export async function selectionAsync(): Promise<void> {}
