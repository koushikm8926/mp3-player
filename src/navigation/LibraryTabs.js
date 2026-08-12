import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings, useTheme } from '../context/SettingsContext';
import {
  AlbumsScreen,
  ArtistsScreen,
  FoldersScreen,
  GenresScreen,
} from '../screens/library/BrowseScreens';
import { SongsScreen } from '../screens/library/SongsScreen';

const Tab = createMaterialTopTabNavigator();

/** Songs / Albums / Artists / Genres / Folders as swipeable top tabs. */
export function LibraryTabs({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[theme.font.h1, { color: theme.colors.text, flex: 1 }]}>{t('library')}</Text>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          hitSlop={8}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="search" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarActiveTintColor: theme.colors.text,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarIndicatorStyle: { backgroundColor: theme.colors.accent, height: 3, borderRadius: 2 },
          tabBarStyle: { backgroundColor: theme.colors.background, elevation: 0, shadowOpacity: 0 },
          tabBarLabelStyle: { ...theme.font.title, textTransform: 'none' },
          tabBarItemStyle: { width: 'auto', paddingHorizontal: 18 },
          lazy: true,
        }}
      >
        <Tab.Screen name="Songs" component={SongsScreen} options={{ title: t('songs') }} />
        <Tab.Screen name="Albums" component={AlbumsScreen} options={{ title: t('albums') }} />
        <Tab.Screen name="Artists" component={ArtistsScreen} options={{ title: t('artists') }} />
        <Tab.Screen name="Genres" component={GenresScreen} options={{ title: t('genres') }} />
        <Tab.Screen name="Folders" component={FoldersScreen} options={{ title: t('folders') }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
