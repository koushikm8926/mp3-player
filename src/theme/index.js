/**
 * Design tokens for the whole app.
 *
 * Three palettes are supported (dark / light / amoled). Screens never hardcode a colour —
 * they read from the object returned by `useTheme()` so the Settings > Appearance switch
 * re-themes everything at once.
 */

export const ACCENTS = {
  green: '#1DB954',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  orange: '#F97316',
  pink: '#EC4899',
  red: '#EF4444',
  teal: '#14B8A6',
  amber: '#F59E0B',
};

const shared = {
  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  spacing: (n) => n * 4,
  font: {
    h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '700' },
    title: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '500' },
    tiny: { fontSize: 11, fontWeight: '600' },
  },
};

const darkPalette = {
  key: 'dark',
  isDark: true,
  background: '#0B0B0F',
  backgroundElevated: '#14141B',
  surface: '#181820',
  surfaceAlt: '#1F1F2A',
  surfacePressed: '#25252F',
  border: '#26262F',
  text: '#FFFFFF',
  textSecondary: '#A0A0AE',
  textTertiary: '#6B6B7B',
  onAccent: '#FFFFFF',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  skeleton: '#1D1D26',
  overlay: 'rgba(0,0,0,0.65)',
  tabBar: '#101017',
  gradient: ['#1A1A24', '#0B0B0F'],
};

const amoledPalette = {
  ...darkPalette,
  key: 'amoled',
  background: '#000000',
  backgroundElevated: '#000000',
  surface: '#0A0A0A',
  surfaceAlt: '#121212',
  surfacePressed: '#1A1A1A',
  border: '#1C1C1C',
  tabBar: '#000000',
  skeleton: '#101010',
  gradient: ['#101010', '#000000'],
};

const lightPalette = {
  key: 'light',
  isDark: false,
  background: '#F6F6F9',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEFF4',
  surfacePressed: '#E4E4EC',
  border: '#E2E2EA',
  text: '#111118',
  textSecondary: '#5C5C6B',
  textTertiary: '#9494A4',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  skeleton: '#E8E8EF',
  overlay: 'rgba(0,0,0,0.35)',
  tabBar: '#FFFFFF',
  gradient: ['#FFFFFF', '#F6F6F9'],
};

const PALETTES = { dark: darkPalette, light: lightPalette, amoled: amoledPalette };

export function buildTheme(paletteKey, accentKey) {
  const palette = PALETTES[paletteKey] ?? darkPalette;
  const accent = ACCENTS[accentKey] ?? ACCENTS.green;
  return {
    ...shared,
    colors: {
      ...palette,
      accent,
      accentMuted: `${accent}26`,
      accentSoft: `${accent}14`,
    },
  };
}

export const THEME_OPTIONS = ['system', 'dark', 'light', 'amoled'];
