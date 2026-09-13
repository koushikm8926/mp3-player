import { genreStyle } from '../../utils/genreStyle';

describe('genreStyle', () => {
  it.each([
    ['Pop', 'headset', '#1B6FF5'],
    ['Hip Hop', 'mic', '#7C4DFF'],
    ['Heavy Metal', 'musical-note', '#F43F5E'],
    ['Lo-Fi Beats', 'cafe', '#F97316'],
    ['Classical', 'school', '#16A34A'],
    ['Bollywood Hits', 'film', '#EC4899'],
    ['Bhajan', 'hand-left', '#0EA5E9'],
    ['Soundtrack', 'videocam', '#8B5CF6'],
    ['Instrumental', 'musical-notes-outline', '#6366F1'],
  ])('%s -> %s', (name, icon, tint) => {
    expect(genreStyle(name)).toEqual({ icon, tint });
  });

  it('matches keywords case-insensitively', () => {
    expect(genreStyle('JAZZ FUSION').icon).toBe('wine');
  });

  it('gives unknown genres a stable fallback tint', () => {
    const first = genreStyle('Zzyzx');
    expect(first.icon).toBe('pricetag');
    expect(first.tint).toMatch(/^#[0-9A-F]{6}$/);
    expect(genreStyle('Zzyzx')).toEqual(first);
  });

  it('copes with a missing genre name', () => {
    expect(genreStyle(null).icon).toBe('pricetag');
  });
});
