import { createTranslator, isRtl, LANGUAGES, resolveDeviceLanguage } from '../../i18n';
import { catalogue, en } from '../../i18n/translations';

const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));

const placeholders = (text) =>
  [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const otherLanguages = Object.keys(catalogue).filter((code) => code !== 'en');

describe('translation catalogue', () => {
  it('offers every language listed in the picker', () => {
    expect(Object.keys(catalogue).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  it.each(otherLanguages)('%s translates every English key', (code) => {
    const missing = Object.keys(en).filter((key) => !(key in catalogue[code]));
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(catalogue))('%s has no empty strings', (code) => {
    const empty = Object.entries(catalogue[code])
      .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it.each(otherLanguages)('%s keeps the same {{placeholders}} as English', (code) => {
    const broken = Object.keys(en)
      .filter((key) => key in catalogue[code])
      .filter((key) => placeholders(en[key]).join() !== placeholders(catalogue[code][key]).join());
    expect(broken).toEqual([]);
  });
});

describe('createTranslator', () => {
  it('translates a key in the chosen language', () => {
    expect(createTranslator('hi')('onlineComingSoonAction')).toBe(catalogue.hi.onlineComingSoonAction);
  });

  it('falls back to English for an unsupported language', () => {
    expect(createTranslator('xx')('onlineComingSoonTitle')).toBe(en.onlineComingSoonTitle);
  });

  it('returns the key itself when nobody translates it', () => {
    expect(createTranslator('en')('definitely.not.a.key')).toBe('definitely.not.a.key');
  });

  const interpolated = Object.keys(en).find((key) => placeholders(en[key]).length > 0);
  (interpolated ? it : it.skip)('fills {{placeholders}}', () => {
    const params = Object.fromEntries(placeholders(en[interpolated]).map((name) => [name, 'VALUE']));
    const text = createTranslator('en')(interpolated, params);
    expect(text).toContain('VALUE');
    expect(text).not.toMatch(/\{\{/);
  });

  const pluralBase = Object.keys(en).find((key) => `${key}_plural` in en);
  (pluralBase ? it : it.skip)('uses the _plural form for counts other than one', () => {
    const t = createTranslator('en');
    expect(t(pluralBase, { count: 1 })).toBe(en[pluralBase].replace(/\{\{\s*count\s*\}\}/g, '1'));
    expect(t(pluralBase, { count: 3 })).toBe(en[`${pluralBase}_plural`].replace(/\{\{\s*count\s*\}\}/g, '3'));
  });
});

describe('resolveDeviceLanguage', () => {
  it('uses the first supported device language', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'ja' }, { languageCode: 'FR' }, { languageCode: 'hi' }]);
    expect(resolveDeviceLanguage()).toBe('fr');
  });

  it('falls back to English when nothing is supported', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'ja' }, {}]);
    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('falls back to English when the device lookup throws', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('old device');
    });
    expect(resolveDeviceLanguage()).toBe('en');
  });
});

describe('isRtl', () => {
  it('is only true for right-to-left languages', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl('zz')).toBe(false);
  });
});
