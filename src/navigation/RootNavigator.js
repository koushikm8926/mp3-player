import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer, MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { AuthScreen } from '../screens/AuthScreen';
import { BackupRestoreScreen } from '../screens/BackupRestoreScreen';
import {
  AlbumDetailScreen,
  ArtistDetailScreen,
  FavoritesScreen,
  FolderDetailScreen,
  GenreDetailScreen,
  PlaylistDetailScreen,
  RecentlyPlayedScreen,
} from '../screens/DetailScreens';
import { EqualizerScreen } from '../screens/EqualizerScreen';
import { HiddenMusicScreen } from '../screens/HiddenMusicScreen';
import { HomeScreen } from '../screens/HomeScreen';
import {
  AlbumsScreen,
  ArtistsScreen,
  FoldersScreen,
  GenresScreen,
} from '../screens/library/BrowseScreens';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { SongsScreen } from '../screens/library/SongsScreen';
import { AboutScreen, LanguageScreen, ServerSettingsScreen } from '../screens/MiscScreens';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { QueueScreen } from '../screens/QueueScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SleepTimerScreen } from '../screens/SleepTimerScreen';
import { SplashScreen } from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/** [focused, unfocused] icon pair per tab. */
const TAB_ICONS = {
  HomeTab: ['home', 'home-outline'],
  LibraryTab: ['albums', 'albums-outline'],
  Search: ['search', 'search-outline'],
  PlaylistsTab: ['list', 'list-outline'],
  Settings: ['settings', 'settings-outline'],
};

const TAB_BAR_HEIGHT = 62;

function MainTabs() {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { hasQueue } = usePlayer();

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            elevation: 0,
          },
          tabBarLabelStyle: { ...theme.font.tiny, marginTop: 3 },
          tabBarIcon: ({ focused, color }) => {
            const [active, inactive] = TAB_ICONS[route.name];
            return <Ionicons name={focused ? active : inactive} size={23} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="HomeTab" component={HomeScreen} options={{ title: t('home') }} />
        <Tabs.Screen name="LibraryTab" component={LibraryScreen} options={{ title: t('library') }} />
        <Tabs.Screen name="Search" component={SearchScreen} options={{ title: t('search') }} />
        <Tabs.Screen
          name="PlaylistsTab"
          component={PlaylistsScreen}
          options={{ title: t('playlists') }}
        />
        <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
      </Tabs.Navigator>

      {/* The mini player floats just above the tab bar rather than inside it, so it can
          overlay any tab's content without each screen having to reserve space. */}
      {hasQueue ? <MiniPlayer bottomOffset={tabBarHeight + 8} /> : null}
    </View>
  );
}

/**
 * Decides which of the three top-level flows to show: splash while bootstrapping,
 * auth when signed out, permission when media access is missing, otherwise the app.
 */
export function RootNavigator() {
  const theme = useTheme();
  const { t, ready: settingsReady } = useSettings();
  const { status } = useAuth();
  const library = useLibrary();
  const player = usePlayer();

  const [splashDone, setSplashDone] = useState(false);
  const queueRestored = useRef(false);

  const bootstrapping = !settingsReady || status === 'loading' || !library.initialised;

  // Keep the splash up for a beat even on a fast device: a 90 ms flash reads as a glitch.
  useEffect(() => {
    if (bootstrapping) return undefined;
    const handle = setTimeout(() => setSplashDone(true), 450);
    return () => clearTimeout(handle);
  }, [bootstrapping]);

  // Restore the previous queue once the library is available to resolve ids against.
  useEffect(() => {
    if (queueRestored.current) return;
    if (!library.initialised || library.tracks.length === 0) return;
    queueRestored.current = true;
    player.restoreQueue(library.resolveTracks);
  }, [library.initialised, library.tracks.length, library.resolveTracks, player]);

  const navigationTheme = useMemo(() => {
    const base = theme.colors.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.backgroundElevated,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    };
  }, [theme]);

  if (bootstrapping || !splashDone) {
    return <SplashScreen statusLabel={library.scanning ? t('scanning') : t('loading')} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        {status !== 'authenticated' ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
        ) : library.permission !== 'granted' ? (
          <Stack.Screen name="Permission" component={PermissionScreen} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />

            {/* Library browse destinations — pushed so the back arrow in each header works. */}
            <Stack.Screen name="Songs" component={SongsScreen} />
            <Stack.Screen name="Albums" component={AlbumsScreen} />
            <Stack.Screen name="Artists" component={ArtistsScreen} />
            <Stack.Screen name="Genres" component={GenresScreen} />
            <Stack.Screen name="Folders" component={FoldersScreen} />

            <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
            <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
            <Stack.Screen name="GenreDetail" component={GenreDetailScreen} />
            <Stack.Screen name="FolderDetail" component={FolderDetailScreen} />
            <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="RecentlyPlayed" component={RecentlyPlayedScreen} />

            <Stack.Screen
              name="NowPlaying"
              component={NowPlayingScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Queue"
              component={QueueScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Equalizer" component={EqualizerScreen} />
            <Stack.Screen name="SleepTimer" component={SleepTimerScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
            <Stack.Screen name="HiddenMusic" component={HiddenMusicScreen} />
            <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export { MINI_PLAYER_HEIGHT };
