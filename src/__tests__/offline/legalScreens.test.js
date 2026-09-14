import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { en } from '../../i18n/translations';
import { PrivacyPolicyScreen, TermsScreen } from '../../screens/LegalScreens';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../context/SettingsContext', () => {
  const { buildTheme } = jest.requireActual('../../theme');
  const { createTranslator } = jest.requireActual('../../i18n');
  const theme = buildTheme('light', 'blue');
  const value = { t: createTranslator('en'), theme };
  return { useSettings: () => value, useTheme: () => theme };
});
jest.mock('../../context/LibraryContext', () => ({ useLibrary: () => ({ adminMode: false }) }));

describe('LegalScreens', () => {
  const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PrivacyPolicyScreen', () => {
    it('renders privacy policy with all key sections and header', () => {
      render(<PrivacyPolicyScreen navigation={mockNavigation} />);

      expect(screen.getByText('Privacy Policy')).toBeOnTheScreen();
      expect(screen.getByText('The Short Version')).toBeOnTheScreen();
      expect(screen.getByText('1. Who We Are')).toBeOnTheScreen();
      expect(screen.getByText('2. Information We Collect')).toBeOnTheScreen();
      expect(screen.getByText('3. Information That Stays on Your Device')).toBeOnTheScreen();
      expect(screen.getByText('4. App Permissions')).toBeOnTheScreen();
      expect(screen.getByText('5. How We Use Information')).toBeOnTheScreen();
      expect(screen.getByText('6. Sharing and Service Providers')).toBeOnTheScreen();
      expect(screen.getByText('7. Storage and Security')).toBeOnTheScreen();
      expect(screen.getByText('8. How Long We Keep Information')).toBeOnTheScreen();
      expect(screen.getByText('9. Your Choices and Rights')).toBeOnTheScreen();
      expect(screen.getByText('10. Children’s Privacy')).toBeOnTheScreen();
      expect(screen.getByText('11. Changes to This Policy')).toBeOnTheScreen();
      expect(screen.getByText('12. Contact Us')).toBeOnTheScreen();
      expect(screen.getByText('support@minaxdigital.com')).toBeOnTheScreen();
    });
  });

  describe('TermsScreen', () => {
    it('renders terms and conditions with all key sections', () => {
      render(<TermsScreen navigation={mockNavigation} />);

      expect(screen.getByText('Terms & Conditions')).toBeOnTheScreen();
      expect(screen.getByText('1. Agreement')).toBeOnTheScreen();
      expect(screen.getByText('2. The App')).toBeOnTheScreen();
      expect(screen.getByText('3. Eligibility')).toBeOnTheScreen();
      expect(screen.getByText('4. Your Account')).toBeOnTheScreen();
      expect(screen.getByText('5. Your Music & Content')).toBeOnTheScreen();
      expect(screen.getByText('6. Acceptable Use')).toBeOnTheScreen();
      expect(screen.getByText('7. Licence & Ownership')).toBeOnTheScreen();
      expect(screen.getByText('8. Third-Party Services')).toBeOnTheScreen();
      expect(screen.getByText('9. Updates & Service Changes')).toBeOnTheScreen();
      expect(screen.getByText('10. Device Data & Backups')).toBeOnTheScreen();
      expect(screen.getByText('11. Termination')).toBeOnTheScreen();
      expect(screen.getByText('12. Disclaimer of Warranties')).toBeOnTheScreen();
      expect(screen.getByText('13. Limitation of Liability')).toBeOnTheScreen();
      expect(screen.getByText('14. Governing Law & Jurisdiction')).toBeOnTheScreen();
      expect(screen.getByText('15. Changes to These Terms')).toBeOnTheScreen();
      expect(screen.getByText('16. Contact Us')).toBeOnTheScreen();
    });
  });
});
