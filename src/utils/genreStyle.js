/**
 * Icon + tint for a genre row.
 *
 * MediaStore genre names are free text, so the lookup is by keyword rather than exact match,
 * and anything unrecognised falls back to a hue derived from the name — stable across
 * launches and distinct enough that a list of unknown genres still reads as a palette.
 */

const RULES = [
  { match: ['pop'], icon: 'headset', tint: '#1B6FF5' },
  { match: ['hip hop', 'hiphop', 'rap', 'trap'], icon: 'mic', tint: '#7C4DFF' },
  { match: ['rock', 'metal', 'punk', 'grunge'], icon: 'musical-note', tint: '#F43F5E' },
  { match: ['lo-fi', 'lofi', 'chill', 'ambient'], icon: 'cafe', tint: '#F97316' },
  { match: ['classical', 'orchestra', 'opera', 'symphony'], icon: 'school', tint: '#16A34A' },
  { match: ['electronic', 'edm', 'house', 'techno', 'dance', 'dubstep'], icon: 'pulse', tint: '#D946EF' },
  { match: ['acoustic', 'folk', 'country'], icon: 'musical-notes', tint: '#14B8A6' },
  { match: ['jazz', 'blues', 'swing'], icon: 'wine', tint: '#F59E0B' },
  { match: ['bollywood', 'hindi', 'desi', 'punjabi', 'indian'], icon: 'film', tint: '#EC4899' },
  { match: ['worship', 'gospel', 'devotional', 'bhajan', 'christian'], icon: 'hand-left', tint: '#0EA5E9' },
  { match: ['soundtrack', 'score', 'cinema', 'movie'], icon: 'videocam', tint: '#8B5CF6' },
  { match: ['r&b', 'rnb', 'soul', 'funk'], icon: 'disc', tint: '#EF4444' },
  { match: ['reggae', 'ska', 'latin', 'salsa'], icon: 'sunny', tint: '#22C55E' },
  { match: ['instrumental', 'piano', 'guitar'], icon: 'musical-notes-outline', tint: '#6366F1' },
];

const FALLBACK_TINTS = [
  '#1B6FF5',
  '#7C4DFF',
  '#F43F5E',
  '#F97316',
  '#16A34A',
  '#D946EF',
  '#14B8A6',
  '#F59E0B',
  '#EC4899',
  '#0EA5E9',
];

export function genreStyle(name) {
  const key = (name ?? '').toLowerCase();

  for (const rule of RULES) {
    if (rule.match.some((needle) => key.includes(needle))) {
      return { icon: rule.icon, tint: rule.tint };
    }
  }

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return { icon: 'pricetag', tint: FALLBACK_TINTS[hash % FALLBACK_TINTS.length] };
}
