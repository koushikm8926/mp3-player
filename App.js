import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { I18nManager, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// The native splash stays up until the JS bundle has mounted and the providers are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

LogBox.ignoreLogs(['new NativeEventEmitter']);

/**
 * Provider order matters:
 *   Settings -> theme, language and every user preference
 *   Auth     -> session + reporting to the admin panel
 *   Library  -> the scanned music, playlists, favourites (reads Settings)
 *   Player   -> playback engine (reads Library and Settings)
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <LibraryProvider>
              <PlayerProvider>
                <AppShell />
              </PlayerProvider>
            </LibraryProvider>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { theme, ready, rtl } = useSettings();

  useEffect(() => {
    if (!ready) return;
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, [ready, theme.colors.background]);

  // Right-to-left needs a reload to take effect on Android, so we only flip the flag and
  // let the change apply on the next launch rather than forcing a restart mid-session.
  useEffect(() => {
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
    }
  }, [rtl]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.colors.isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}
