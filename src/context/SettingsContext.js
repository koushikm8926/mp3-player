import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { settingsRepo } from '../db/repositories';
import { createTranslator, isRtl, resolveDeviceLanguage } from '../i18n';
import { buildTheme } from '../theme';

const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
  // appearance
  themeMode: 'light', // system | light | dark | amoled
  accentColor: 'blue',
  language: null, // null = follow device
  gridColumns: 2,

  // playback
  crossfadeSeconds: 0, // 0 disables crossfade
  gaplessPlayback: true,
  keepScreenOn: false,
  pauseOnHeadphoneDisconnect: true,
  resumeOnHeadphoneReconnect: false,
  playbackSpeed: 1,
  respectAudioFocus: true,
  rememberQueue: true,

  // library
  ignoreShortTracks: true,
  minTrackSeconds: 30,
  autoRefreshLibrary: true,

  // equalizer (mirrored here so it survives a restart)
  equalizerEnabled: false,
  equalizerPreset: -1,
  equalizerBands: [],
  bassBoost: 0,
  virtualizer: 0,
  loudness: 0,
  reverb: 0,

  // misc
  lastBackupAt: null,
  hasSeenOnboarding: false,
};

export function SettingsProvider({ children }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await settingsRepo.all().catch(() => ({}));
      if (cancelled) return;
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Optimistic: state updates immediately, SQLite catches up in the background. */
  const update = useCallback((key, value) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    settingsRepo.set(key, value).catch(() => {});
  }, []);

  const updateMany = useCallback((entries) => {
    setSettings((previous) => ({ ...previous, ...entries }));
    settingsRepo.setMany(entries).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    settingsRepo.setMany(DEFAULT_SETTINGS).catch(() => {});
  }, []);

  const language = settings.language ?? resolveDeviceLanguage();

  const value = useMemo(() => {
    const paletteKey =
      settings.themeMode === 'system'
        ? systemScheme === 'light'
          ? 'light'
          : 'dark'
        : settings.themeMode;

    return {
      ready,
      settings,
      update,
      updateMany,
      reset,
      theme: buildTheme(paletteKey, settings.accentColor),
      language,
      rtl: isRtl(language),
      t: createTranslator(language),
      minDurationMs: settings.ignoreShortTracks ? settings.minTrackSeconds * 1000 : 0,
    };
  }, [ready, settings, systemScheme, language, update, updateMany, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}

export function useTheme() {
  return useSettings().theme;
}

/** Convenience hook so screens can write `const { t } = useI18n()`. */
export function useI18n() {
  const { t, language, rtl } = useSettings();
  return { t, language, rtl };
}
