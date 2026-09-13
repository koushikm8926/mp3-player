import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { DeleteAccountDialog } from '../../components/DeleteAccountDialog';
import { en } from '../../i18n/translations';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));
jest.mock('../../context/SettingsContext', () => {
  const { buildTheme } = jest.requireActual('../../theme');
  const { createTranslator } = jest.requireActual('../../i18n');
  const theme = buildTheme('light', 'blue');
  const value = { t: createTranslator('en'), theme };
  return { useSettings: () => value, useTheme: () => theme };
});
jest.mock('../../context/LibraryContext', () => ({ useLibrary: () => ({ adminMode: false }) }));
// The shared Field lives in common.js, which also exports Reanimated-based buttons that cannot
// start under Jest. The dialog itself uses none of them.
jest.mock('../../components/animated', () => ({
  PressableScale: jest.requireActual('react-native').Pressable,
}));

function renderDialog(props = {}) {
  const handlers = { onCancel: jest.fn(), onConfirm: jest.fn() };
  const view = render(
    <DeleteAccountDialog
      visible
      needsPassword
      email="listener@example.com"
      loading={false}
      error={null}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...view };
}

describe('DeleteAccountDialog', () => {
  it('warns about what will be deleted', () => {
    renderDialog();
    expect(screen.getByText(en.deleteAccountTitle)).toBeOnTheScreen();
    expect(screen.getByText(en.deleteAccountWarning)).toBeOnTheScreen();
  });

  it('needs the password before an email account can be deleted', () => {
    const { onConfirm } = renderDialog();
    expect(screen.getByText('Enter the password for listener@example.com to confirm')).toBeOnTheScreen();

    const confirm = screen.getByTestId('delete-account-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('delete-account-password'), 'secret');
    expect(confirm).toBeEnabled();
    fireEvent.press(confirm);
    expect(onConfirm).toHaveBeenCalledWith('secret');
  });

  it('lets a Google account confirm without typing a password', () => {
    const { onConfirm } = renderDialog({ needsPassword: false });
    expect(screen.queryByTestId('delete-account-password')).toBeNull();
    expect(screen.getByText(en.deleteAccountGoogleHint)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('delete-account-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('shows why the last attempt failed', () => {
    renderDialog({ error: en.invalidCredentials });
    expect(screen.getByText(en.invalidCredentials)).toBeOnTheScreen();
  });

  it('cancels', () => {
    const { onCancel } = renderDialog();
    fireEvent.press(screen.getByTestId('delete-account-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('locks both buttons while the account is being deleted', () => {
    const { onCancel, onConfirm } = renderDialog({ needsPassword: false, loading: true });
    expect(screen.getByTestId('delete-account-cancel')).toBeDisabled();
    expect(screen.getByTestId('delete-account-confirm')).toBeDisabled();
    expect(screen.queryByText(en.deleteAccountConfirm)).toBeNull();
    fireEvent.press(screen.getByTestId('delete-account-confirm'));
    fireEvent.press(screen.getByTestId('delete-account-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('forgets the typed password when closed', () => {
    const { rerender, onCancel, onConfirm } = renderDialog();
    fireEvent.changeText(screen.getByTestId('delete-account-password'), 'secret');
    const props = { needsPassword: true, email: 'listener@example.com', loading: false, error: null, onCancel, onConfirm };
    rerender(<DeleteAccountDialog visible={false} {...props} />);
    rerender(<DeleteAccountDialog visible {...props} />);
    expect(screen.getByTestId('delete-account-password')).toHaveDisplayValue('');
  });

  it('renders nothing while hidden', () => {
    renderDialog({ visible: false });
    expect(screen.queryByText(en.deleteAccountTitle)).toBeNull();
  });
});
