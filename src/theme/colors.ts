/**
 * GBECHE — Palette de couleurs centralisée
 * Modes dark & light avec tokens sémantiques.
 */

export const palette = {
  // Neons (invariants — identité visuelle GBECHE)
  cyan:      '#00E5FF',
  cyan100:   'rgba(0,229,255,0.10)',
  cyan200:   'rgba(0,229,255,0.20)',
  cyan500:   'rgba(0,229,255,0.50)',

  green:     '#00FF88',
  green100:  'rgba(0,255,136,0.10)',
  green200:  'rgba(0,255,136,0.20)',

  orange:    '#FF6B35',
  orange100: 'rgba(255,107,53,0.10)',
  orange200: 'rgba(255,107,53,0.20)',

  red:       '#FF4757',
  red100:    'rgba(255,71,87,0.10)',
  red200:    'rgba(255,71,87,0.20)',

  gold:      '#FFD700',
  gold100:   'rgba(255,215,0,0.10)',
  gold200:   'rgba(255,215,0,0.20)',

  purple:    '#A78BFA',
  purple100: 'rgba(167,139,250,0.10)',
  purple200: 'rgba(167,139,250,0.20)',

  indigo:    '#6366F1',
  blue:      '#0099FF',

  // Neutrals
  white:     '#FFFFFF',
  black:     '#000000',

  // Dark shades
  dark900:   '#070911',
  dark800:   '#0C0F1C',
  dark700:   '#111525',
  dark600:   '#161A28',
  dark500:   '#1D2235',
  dark400:   '#252B3D',
  dark300:   '#2F3650',
  dark200:   '#3D4561',

  // Light shades
  light100:  '#F8F9FF',
  light200:  '#EEF0FF',
  light300:  '#E0E3F5',
  light400:  '#C8CCDF',
  light500:  '#A0A5BC',
  light600:  '#70768E',
  light700:  '#454D6A',
  light800:  '#2A3048',
} as const;

export const darkColors = {
  // Backgrounds
  background:        palette.dark900,
  backgroundElevated:palette.dark800,
  surface:           palette.dark700,
  surfaceHigh:       palette.dark600,
  overlay:           'rgba(0,0,0,0.72)',

  // Glass
  glass:             'rgba(255,255,255,0.055)',
  glassBorder:       'rgba(255,255,255,0.07)',
  glassBorderHover:  'rgba(255,255,255,0.12)',

  // Text
  textPrimary:       '#EEF0FF',
  textSecondary:     'rgba(238,240,255,0.55)',
  textTertiary:      'rgba(238,240,255,0.35)',
  textDisabled:      'rgba(238,240,255,0.20)',
  textInverse:       '#070911',

  // Brand
  primary:           palette.cyan,
  primaryDim:        palette.cyan100,
  success:           palette.green,
  successDim:        palette.green100,
  warning:           palette.gold,
  warningDim:        palette.gold100,
  danger:            palette.red,
  dangerDim:         palette.red100,
  accent:            palette.orange,
  accentDim:         palette.orange100,
  xp:                palette.purple,
  xpDim:             palette.purple100,

  // Borders
  border:            'rgba(255,255,255,0.07)',
  borderStrong:      'rgba(255,255,255,0.13)',
  separator:         'rgba(255,255,255,0.04)',

  // Tab bar
  tabBarBg:          'rgba(7,9,17,0.88)',
  tabBarBorder:      'rgba(255,255,255,0.06)',
  tabActive:         palette.cyan,
  tabInactive:       'rgba(238,240,255,0.35)',

  // Shadows
  shadowColor:       '#000000',

  // Status
  streakColor:       palette.orange,
  warningBg:         'rgba(255,107,53,0.10)',
} as const;

export const lightColors = {
  // Backgrounds
  background:        '#F5F6FF',
  backgroundElevated:'#FFFFFF',
  surface:           '#FFFFFF',
  surfaceHigh:       '#F0F2FF',
  overlay:           'rgba(10,12,40,0.60)',

  // Glass
  glass:             'rgba(255,255,255,0.80)',
  glassBorder:       'rgba(10,12,40,0.08)',
  glassBorderHover:  'rgba(10,12,40,0.14)',

  // Text
  textPrimary:       '#0D1035',
  textSecondary:     'rgba(13,16,53,0.60)',
  textTertiary:      'rgba(13,16,53,0.40)',
  textDisabled:      'rgba(13,16,53,0.25)',
  textInverse:       '#FFFFFF',

  // Brand (same neons, slightly deeper in light mode)
  primary:           '#00B8D9',
  primaryDim:        'rgba(0,184,217,0.10)',
  success:           '#00C96B',
  successDim:        'rgba(0,201,107,0.10)',
  warning:           '#E6B800',
  warningDim:        'rgba(230,184,0,0.10)',
  danger:            '#E03545',
  dangerDim:         'rgba(224,53,69,0.10)',
  accent:            '#E05A25',
  accentDim:         'rgba(224,90,37,0.10)',
  xp:                '#7C3AED',
  xpDim:             'rgba(124,58,237,0.10)',

  // Borders
  border:            'rgba(10,12,40,0.08)',
  borderStrong:      'rgba(10,12,40,0.14)',
  separator:         'rgba(10,12,40,0.05)',

  // Tab bar
  tabBarBg:          'rgba(245,246,255,0.92)',
  tabBarBorder:      'rgba(10,12,40,0.08)',
  tabActive:         '#00B8D9',
  tabInactive:       'rgba(13,16,53,0.40)',

  // Shadows
  shadowColor:       '#0D1035',

  // Status
  streakColor:       '#E05A25',
  warningBg:         'rgba(224,90,37,0.10)',
} as const;

export type ColorScheme = { [K in keyof typeof darkColors]: string };

// Always the same neon palette regardless of mode
export const neon = {
  cyan:   palette.cyan,
  green:  palette.green,
  orange: palette.orange,
  red:    palette.red,
  gold:   palette.gold,
  purple: palette.purple,
  indigo: palette.indigo,
  blue:   palette.blue,
} as const;
