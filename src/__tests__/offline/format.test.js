import {
  colorFromString,
  formatBitrate,
  formatCountdown,
  formatDate,
  formatDateTime,
  formatDuration,
  formatFileSize,
  formatLongDuration,
  initialOf,
  normalizeForSearch,
  pluralize,
} from '../../utils/format';

describe('formatDuration', () => {
  it.each([
    [215000, '3:35'],
    [3725000, '1:02:05'],
    [59999, '0:59'],
    [0, '0:00'],
    [-5000, '0:00'],
    [null, '0:00'],
    [undefined, '0:00'],
  ])('%p ms -> %p', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe('formatLongDuration', () => {
  it.each([
    [0, '0 min'],
    [12 * 60000, '12 min'],
    [3600000, '1 hr 0 min'],
    [(4 * 60 + 12) * 60000, '4 hr 12 min'],
  ])('%p ms -> %p', (input, expected) => {
    expect(formatLongDuration(input)).toBe(expected);
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '—'],
    [null, '—'],
    [500, '500 B'],
    [1536, '1.5 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
    [15 * 1024 * 1024, '15 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
    [2048 * 1024 ** 3, '2048 GB'],
  ])('%p bytes -> %p', (input, expected) => {
    expect(formatFileSize(input)).toBe(expected);
  });
});

describe('formatBitrate', () => {
  it('shows a dash when unknown', () => expect(formatBitrate(0)).toBe('—'));
  it('rounds to kbps', () => {
    expect(formatBitrate(320000)).toBe('320 kbps');
    expect(formatBitrate(128500)).toBe('129 kbps');
  });
});

describe('formatCountdown (sleep timer chip)', () => {
  it.each([
    [125000, '2:05'],
    [0, '0:00'],
    [1, '0:01'],
    [-500, '0:00'],
  ])('%p ms -> %p', (input, expected) => {
    expect(formatCountdown(input)).toBe(expected);
  });
});

describe('formatDate / formatDateTime', () => {
  it('shows a dash for missing timestamps', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime(0)).toBe('—');
  });
  it('formats a real timestamp', () => {
    expect(formatDate(Date.UTC(2024, 0, 15, 12))).toContain('2024');
    expect(formatDateTime(Date.UTC(2024, 0, 15, 12))).not.toBe('—');
  });
});

describe('initialOf', () => {
  it('uses the first visible letter, upper-cased', () => expect(initialOf('  hello')).toBe('H'));
  it('falls back to a note for empty text', () => {
    expect(initialOf('')).toBe('♪');
    expect(initialOf(null)).toBe('♪');
  });
});

describe('colorFromString', () => {
  it('is deterministic for the same text', () => {
    expect(colorFromString('Abbey Road')).toBe(colorFromString('Abbey Road'));
  });
  it('produces an hsl colour with the requested saturation and lightness', () => {
    expect(colorFromString('Abbey Road')).toMatch(/^hsl\(\d{1,3}, 55%, 42%\)$/);
    expect(colorFromString('x', 10, 20)).toMatch(/^hsl\(\d{1,3}, 10%, 20%\)$/);
    expect(colorFromString(null)).toBe('hsl(0, 55%, 42%)');
  });
});

describe('normalizeForSearch', () => {
  it('lower-cases and strips accents', () => {
    expect(normalizeForSearch('Beyoncé')).toBe('beyonce');
    expect(normalizeForSearch('ÁRBOL')).toBe('arbol');
  });
  it('handles missing text', () => expect(normalizeForSearch(null)).toBe(''));
});

describe('pluralize', () => {
  it('picks singular only for exactly one', () => {
    expect(pluralize(1, 'song', 'songs')).toBe('song');
    expect(pluralize(0, 'song', 'songs')).toBe('songs');
    expect(pluralize(2, 'song', 'songs')).toBe('songs');
  });
});
