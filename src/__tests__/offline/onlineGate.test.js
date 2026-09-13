import { Alert } from 'react-native';

import { ONLINE_FEATURES_ENABLED } from '../../config/features';
import { createTranslator } from '../../i18n';
import { en, hi } from '../../i18n/translations';
import { showOnlineComingSoon } from '../../utils/comingSoon';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

describe('v1 is offline-only', () => {
  beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('ships with online features switched off', () => {
    expect(ONLINE_FEATURES_ENABLED).toBe(false);
  });

  it('shows the coming-soon alert in the user language', () => {
    showOnlineComingSoon(createTranslator('en'));
    expect(Alert.alert).toHaveBeenCalledWith(en.onlineComingSoonTitle, en.onlineComingSoonBody, [
      { text: en.onlineComingSoonAction, style: 'default' },
    ]);

    showOnlineComingSoon(createTranslator('hi'));
    expect(Alert.alert).toHaveBeenLastCalledWith(hi.onlineComingSoonTitle, hi.onlineComingSoonBody, [
      { text: hi.onlineComingSoonAction, style: 'default' },
    ]);
  });

  it('still shows an English alert without a translator', () => {
    showOnlineComingSoon();
    expect(Alert.alert).toHaveBeenCalledWith('Coming soon', 'Online songs are on the way.', [
      { text: 'Got it', style: 'default' },
    ]);
  });
});
