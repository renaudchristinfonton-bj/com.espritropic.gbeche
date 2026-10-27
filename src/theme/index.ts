/**
 * GBECHE — Design System centralisé
 * Unique source de vérité pour toutes les valeurs de design.
 *
 * Usage :
 *   const { colors, typography, spacing } = useTheme();
 *   const t = useTheme();
 */

import { Platform } from 'react-native';
import { darkColors, lightColors, neon, palette, type ColorScheme } from './colors';

// ─── Typography ───────────────────────────────────────────
export const typography = {
  // Font families
  fontFamily: Platform.select({
    ios:     'System',
    android: 'sans-serif',
    default: 'System',
  }),
  fontFamilyMono: Platform.select({
    ios:     'Courier New',
    android: 'monospace',
    default: 'monospace',
  }),

  // Scale
  sizes: {
    xs:   10,
    sm:   12,
    base: 14,
    md:   16,
    lg:   18,
    xl:   20,
    '2xl':22,
    '3xl':26,
    '4xl':32,
    '5xl':40,
    '6xl':48,
  },

  // Weight
  weights: {
    light:    '300' as const,
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    extrabold:'800' as const,
    black:    '900' as const,
  },

  // Line heights
  lineHeights: {
    tight:  1.1,
    snug:   1.25,
    normal: 1.5,
    relaxed:1.625,
  },

  // Letter spacing
  tracking: {
    tighter: -1.0,
    tight:   -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1.0,
    widest:  1.5,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────
export const spacing = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
} as const;

// ─── Border radius ────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl':24,
  '3xl':28,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────
export const makeShadows = (shadowColor: string) => ({
  none: {},
  sm:   { shadowColor, shadowOffset:{ width:0, height:1 }, shadowOpacity:0.08, shadowRadius:2,  elevation:2  },
  md:   { shadowColor, shadowOffset:{ width:0, height:4 }, shadowOpacity:0.12, shadowRadius:8,  elevation:6  },
  lg:   { shadowColor, shadowOffset:{ width:0, height:8 }, shadowOpacity:0.18, shadowRadius:16, elevation:12 },
  xl:   { shadowColor, shadowOffset:{ width:0, height:16},  shadowOpacity:0.25, shadowRadius:32, elevation:20 },
  // Neon glows (iOS only via shadowColor)
  neonCyan:   { shadowColor:'#00E5FF', shadowOffset:{ width:0, height:0 }, shadowOpacity:0.50, shadowRadius:16, elevation:8 },
  neonGreen:  { shadowColor:'#00FF88', shadowOffset:{ width:0, height:0 }, shadowOpacity:0.50, shadowRadius:16, elevation:8 },
  neonGold:   { shadowColor:'#FFD700', shadowOffset:{ width:0, height:0 }, shadowOpacity:0.50, shadowRadius:16, elevation:8 },
  neonPurple: { shadowColor:'#A78BFA', shadowOffset:{ width:0, height:0 }, shadowOpacity:0.50, shadowRadius:16, elevation:8 },
  neonOrange: { shadowColor:'#FF6B35', shadowOffset:{ width:0, height:0 }, shadowOpacity:0.50, shadowRadius:16, elevation:8 },
});

// ─── Animation durations ─────────────────────────────────
export const duration = {
  instant:  80,
  fast:     150,
  normal:   250,
  slow:     400,
  slower:   600,
  slowest:  800,
} as const;

// ─── Z-index ──────────────────────────────────────────────
export const zIndex = {
  base:       0,
  raised:     10,
  dropdown:   50,
  sticky:     100,
  modal:      200,
  toast:      300,
  overlay:    400,
} as const;

// ─── Icon sizes ───────────────────────────────────────────
export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ─── Theme object builder ─────────────────────────────────
export function buildTheme(mode: 'dark' | 'light') {
  const rawColors: ColorScheme = mode === 'dark' ? darkColors : lightColors;
  const shadows = makeShadows(rawColors.shadowColor);

  // Convenience aliases so components can use colors.text, colors.textMuted, etc.
  const colors = {
    ...rawColors,
    // Text aliases
    text:      rawColors.textPrimary,
    textMuted: rawColors.textSecondary,
    textDim:   rawColors.textTertiary,
    // Tab bar alias
    tabBar:    rawColors.tabBarBg,
  };

  return {
    mode,
    isDark:     mode === 'dark',
    colors,
    neon,
    palette,
    typography,
    spacing,
    radius,
    shadows,
    duration,
    zIndex,
    iconSizes,
  } as const;
}

export type Theme = ReturnType<typeof buildTheme>;

// ─── Re-exports ───────────────────────────────────────────
export { darkColors, lightColors, neon, palette };
export type { ColorScheme };
