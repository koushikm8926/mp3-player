import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_SETTINGS, SettingsProvider, useSettings } from '../../context/SettingsContext';
import { getDatabase } from '../../db/database';
import { settingsRepo } from '../../db/repositories';
import { catalogue } from '../../i18n/translations';

const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));

const wrapper = ({ children }) => <SettingsProvider>{children}</SettingsProvider>;

async function renderSettings() {
  const hook = renderHook(() => useSettings(), { wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

/** Lets fire-and-forget SQLite writes settle. */
const flush = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

beforeEach(async () => {
  mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
  const db = await getDatabase();
  await db.runAsync('DELETE FROM settings');
});

describe('SettingsProvider', () => {
  it('starts from the defaults on a fresh install', async () => {
    const { result } = await renderSettings();
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.language).toBe('en');
    expect(result.current.rtl).toBe(false);
    expect(result.current.minDurationMs).toBe(30000);
    expect(result.current.theme.colors.isDark).toBe(false);
  });

  it('loads saved settings on top of the defaults', async () => {
    await settingsRepo.setMany({ crossfadeSeconds: 6, themeMode: 'dark' });
    const { result } = await renderSettings();
    expect(result.current.settings).toMatchObject({ crossfadeSeconds: 6, themeMode: 'dark', gaplessPlayback: true });
    expect(result.current.theme.colors.isDark).toBe(true);
  });

  it('applies a change immediately and saves it', async () => {
    const { result } = await renderSettings();
    act(() => result.current.update('gaplessPlayback', false));
    expect(result.current.settings.gaplessPlayback).toBe(false);
    await flush();
    expect((await settingsRepo.all()).gaplessPlayback).toBe(false);
  });

  it('saves several changes at once', async () => {
    const { result } = await renderSettings();
    act(() => result.current.updateMany({ keepScreenOn: true, playbackSpeed: 1.5 }));
    expect(result.current.settings).toMatchObject({ keepScreenOn: true, playbackSpeed: 1.5 });
    await flush();
    expect(await settingsRepo.all()).toMatchObject({ keepScreenOn: true, playbackSpeed: 1.5 });
  });

  it('survives an app restart', async () => {
    const first = await renderSettings();
    act(() => first.result.current.update('accentColor', 'teal'));
    await flush();
    first.unmount();
    const second = await renderSettings();
    expect(second.result.current.settings.accentColor).toBe('teal');
  });

  it('resets everything back to the defaults', async () => {
    const { result } = await renderSettings();
    act(() => result.current.updateMany({ crossfadeSeconds: 8, themeMode: 'amoled' }));
    await flush();
    act(() => result.current.reset());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    await flush();
    expect(await settingsRepo.all()).toMatchObject({ crossfadeSeconds: 0, themeMode: 'light' });
  });

  it('derives the minimum track length from the "ignore short tracks" settings', async () => {
    const { result } = await renderSettings();
    act(() => result.current.update('minTrackSeconds', 45));
    expect(result.current.minDurationMs).toBe(45000);
    act(() => result.current.update('ignoreShortTracks', false));
    expect(result.current.minDurationMs).toBe(0);
  });

  it('follows the device language until the user picks one', async () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'hi' }]);
    const { result } = await renderSettings();
    expect(result.current.language).toBe('hi');
    expect(result.current.t('onlineComingSoonAction')).toBe(catalogue.hi.onlineComingSoonAction);

    act(() => result.current.update('language', 'ar'));
    expect(result.current.language).toBe('ar');
    expect(result.current.rtl).toBe(true);
  });

  it('throws a clear error when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSettings())).toThrow('useSettings must be used inside <SettingsProvider>');
    console.error.mockRestore();
  });
});
