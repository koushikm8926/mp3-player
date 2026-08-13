/**
 * Design tokens for the whole app.
 *
 * Three palettes are supported (light / dark / amoled). Screens never hardcode a colour —
 * they read from the object returned by `useTheme()` so the Settings > Appearance switch
 * re-themes everything at once.
 *
 * The light palette is the reference design: a cool near-white page, pure white cards with
 * hairline borders and soft shadows, and a saturated blue accent. Dark and amoled mirror the
 * same structure so every screen works unchanged across all three.
 */

export const ACCENTS = {
  blue: '#1B6FF5',
  purple: '#6D46E6',
  teal: '#14B8A6',
  orange: '#F97316',
  pink: '#EC4899',
  green: '#1DB954',
  red: '#EF4444',
  amber: '#F59E0B',
};

/** Accent order shown in the Settings swatch row — mirrors the mockup. */
export const ACCENT_ORDER = ['blue', 'purple', 'teal', 'orange', 'pink', 'green', 'red', 'amber'];

const shared = {
  radius: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999 },
  spacing: (n) => n * 4,
  font: {
    display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
    h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
    h3: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
    title: { fontSize: 15.5, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12.5, fontWeight: '500' },
    tiny: { fontSize: 11, fontWeight: '600' },
    overline: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 },
  },
};

const lightPalette = {
  key: 'light',
  isDark: false,
  background: '#F4F6FA',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',
  surfacePressed: '#E2E8F2',
  border: '#E5EAF2',
  text: '#0E1424',
  textSecondary: '#5B6577',
  textTertiary: '#95A0B3',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  skeleton: '#E8EDF5',
  overlay: 'rgba(14,20,36,0.38)',
  tabBar: '#FFFFFF',
  // Splash backdrop: white at the top fading into the deep blue wave.
  gradient: ['#F7FAFF', '#E8F0FF'],
  shadowColor: '#0E1424',
  shadowOpacity: 0.07,
};

const darkPalette = {
  key: 'dark',
  isDark: true,
  background: '#0B0E16',
  backgroundElevated: '#141926',
  surface: '#151A28',
  surfaceAlt: '#1D2434',
  surfacePressed: '#252D40',
  border: '#242C3D',
  text: '#F2F5FA',
  textSecondary: '#9AA5BA',
  textTertiary: '#69738A',
  onAccent: '#FFFFFF',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  skeleton: '#1B2130',
  overlay: 'rgba(0,0,0,0.62)',
  tabBar: '#101521',
  gradient: ['#161C2B', '#0B0E16'],
  shadowColor: '#000000',
  shadowOpacity: 0.4,
};

const amoledPalette = {
  ...darkPalette,
  key: 'amoled',
  background: '#000000',
  backgroundElevated: '#000000',
  surface: '#0A0A0C',
  surfaceAlt: '#131318',
  surfacePressed: '#1B1B22',
  border: '#1C1C22',
  tabBar: '#000000',
  skeleton: '#101014',
  gradient: ['#101014', '#000000'],
};

const PALETTES = { light: lightPalette, dark: darkPalette, amoled: amoledPalette };

/** Hex + alpha as an 8-digit colour, so tints follow the chosen accent. */
function alpha(hex, a) {
  const value = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${value}`;
}

/** Darken a hex colour toward black — used for the accent gradient's far stop. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function buildTheme(paletteKey, accentKey) {
  const palette = PALETTES[paletteKey] ?? lightPalette;
  const accent = ACCENTS[accentKey] ?? ACCENTS.blue;

  return {
    ...shared,
    colors: {
      ...palette,
      accent,
      accentDark: shade(accent, 0.28),
      // Tint strengths: `muted` for filled icon chips, `soft` for row/section washes.
      accentMuted: alpha(accent, palette.isDark ? 0.22 : 0.13),
      accentSoft: alpha(accent, palette.isDark ? 0.13 : 0.07),
    },
    /** Accent-to-dark sweep used by the mini player, hero banner and primary CTAs. */
    accentGradient: [accent, shade(accent, 0.34)],
    /** Two elevation presets so cards look identical everywhere. */
    shadow: {
      card: {
        shadowColor: palette.shadowColor,
        shadowOpacity: palette.shadowOpacity,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      },
      floating: {
        shadowColor: palette.shadowColor,
        shadowOpacity: palette.shadowOpacity + 0.06,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
    },
  };
}

export const THEME_OPTIONS = ['system', 'light', 'dark', 'amoled'];
