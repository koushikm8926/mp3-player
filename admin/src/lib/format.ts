/** Formatting helpers shared by the admin views. */

export function formatNumber(value: number | bigint): string {
  return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

/** 8_400_000 -> "2h 20m" */
export function formatListeningTime(milliseconds: number | bigint): string {
  const totalMinutes = Math.floor(Number(milliseconds ?? 0) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${minutes}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 minutes ago", "in 2 days" — used for last-seen columns. */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return 'never';
  const target = new Date(value).getTime();
  const deltaSeconds = Math.round((target - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds || unit === 'second') {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return 'just now';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Escapes a value for CSV export (used by Reports). */
export function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
}
