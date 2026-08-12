/** Formatting helpers shared by every screen. */

/** 215000 -> "3:35", 3725000 -> "1:02:05" */
export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((milliseconds ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Long-form duration for summaries: "4 hr 12 min". */
export function formatLongDuration(milliseconds) {
  const totalMinutes = Math.floor((milliseconds ?? 0) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatBitrate(bitsPerSecond) {
  if (!bitsPerSecond) return '—';
  return `${Math.round(bitsPerSecond / 1000)} kbps`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** "2:05" style countdown used by the sleep timer chip. */
export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** First letter used for the fallback artwork tile. */
export function initialOf(text) {
  const trimmed = (text ?? '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '♪';
}

/**
 * Deterministic hue from a string, so the same album always gets the same placeholder colour.
 */
export function colorFromString(text, saturation = 55, lightness = 42) {
  let hash = 0;
  const value = text ?? '';
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return `hsl(${Math.abs(hash) % 360}, ${saturation}%, ${lightness}%)`;
}

/** Case/diacritic-insensitive comparison key used for sorting and search. */
export function normalizeForSearch(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}
