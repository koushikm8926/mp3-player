import { Alert } from 'react-native';

/**
 * Announces that online mode is not part of this release.
 *
 * `t` is the translator from `useSettings()`; it falls back to English so the
 * helper can also be called from places that have no settings context.
 */
export function showOnlineComingSoon(t) {
  const translate = typeof t === 'function' ? t : null;
  Alert.alert(
    translate ? translate('onlineComingSoonTitle') : 'Coming soon',
    translate ? translate('onlineComingSoonBody') : 'Online songs are on the way.',
    [{ text: translate ? translate('onlineComingSoonAction') : 'Got it', style: 'default' }]
  );
}
