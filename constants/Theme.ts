/**
 * HouseParty Color Theme
 * Palette: Golden Yellow + Warm Orange + Deep Purple
 * #F1C230 — Golden Yellow
 * #F2921D — Warm Orange
 * #F24F13 — Deep Orange/Red (primary CTA)
 * #8082A6 — Muted Slate Blue
 * #46334F — Deep Purple (dark bg)
 */

export const T = {
  // Backgrounds
  bg: '#F5F0F7',           // very light lavender-white
  surface: '#FFFFFF',
  surfaceAlt: '#F0EBF4',   // soft purple tint
  surfaceDark: '#121212',

  // Primary — Deep Orange/Red
  primary: '#F24F13',
  primaryDark: '#D43E0A',
  primaryLight: '#FEE8DF',
  primaryMid: '#FBCBB8',

  // Accent — Golden Yellow
  accent: '#F1C230',
  accentDark: '#D4A520',
  accentLight: '#FEF7DC',

  // Secondary — Warm Orange
  secondary: '#F2921D',
  secondaryLight: '#FEF0DC',

  // Dark — Deep Purple
  dark: '#46334F',
  darkMid: '#5C4468',
  darkLight: '#8082A6',

  // Success
  success: '#22C55E',
  successLight: '#DCFCE7',

  // Warning
  warning: '#F1C230',
  warningLight: '#FEF7DC',

  // Error
  error: '#EF4444',
  errorLight: '#FEF2F2',

  // Text
  textPrimary: '#2D1B35',    // deep purple-black
  textSecondary: '#5C4468',  // medium purple
  textMuted: '#8082A6',      // slate blue-grey
  textInverse: '#FFFFFF',

  // Borders
  border: '#E8DFF0',
  borderStrong: '#C9B8D8',

  // Shadows
  shadow: 'rgba(70, 51, 79, 0.1)',
  shadowMd: 'rgba(70, 51, 79, 0.15)',

  // Tab bar
  tabBg: '#FFFFFF',
  tabActive: '#F24F13',
  tabInactive: '#8082A6',
} as const;
