import { getLocales } from 'expo-localization';

import { catalogue, en, LANGUAGES } from './translations';

export { LANGUAGES };

export const DEFAULT_LANGUAGE = 'en';

/** Picks the best supported language for the device, falling back to English. */
export function resolveDeviceLanguage() {
  try {
    const locales = getLocales();
    for (const locale of locales) {
      const code = (locale.languageCode || '').toLowerCase();
      if (catalogue[code]) return code;
    }
  } catch {
    // getLocales can throw on very old devices; English is a safe default.
  }
  return DEFAULT_LANGUAGE;
}

export function isRtl(language) {
  return LANGUAGES.find((l) => l.code === language)?.rtl ?? false;
}

/**
 * Creates the `t()` function for a language.
 *
 * Supports `{{placeholder}}` interpolation and a `_plural` key variant selected by `count`.
 */
export function createTranslator(language) {
  const dictionary = catalogue[language] ?? en;

  return function t(key, params) {
    let lookupKey = key;
    if (params && typeof params.count === 'number' && params.count !== 1) {
      const pluralKey = `${key}_plural`;
      if (dictionary[pluralKey] ?? en[pluralKey]) lookupKey = pluralKey;
    }

    let value = dictionary[lookupKey] ?? en[lookupKey] ?? en[key] ?? key;
    if (!params) return value;

    for (const [name, replacement] of Object.entries(params)) {
      value = value.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), String(replacement));
    }
    return value;
  };
}
