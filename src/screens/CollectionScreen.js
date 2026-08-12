import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../components/Artwork';
import { EmptyState, IconButton } from '../components/common';
import { PlaylistPickerSheet } from '../components/PlaylistPickerSheet';
import { Sheet, SheetItem } from '../components/Sheet';
import { SortSheet } from '../components/SortSheet';
import { TrackList } from '../components/TrackList';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { SORT_KEYS, sortTracks } from '../services/musicLibrary';
import { colorFromString, formatLongDuration } from '../utils/format';

const DETAIL_SORT_OPTIONS = [
  SORT_KEYS.TRACK_NUMBER,
  SORT_KEYS.TITLE,
  SORT_KEYS.ARTIST,
  SORT_KEYS.ALBUM,
  SORT_KEYS.DURATION,
  SORT_KEYS.DATE_ADDED,
];

/**
 * Shared layout for every "a header plus its tracks" screen: album, artist, genre, folder,
 * playlist, favourites and recently played all render through this.
 */
export function CollectionScreen({
  navigation,
  title,
  subtitle,
  artworkUri,
  artworkName,
  circularArtwork = false,
  tracks,
  defaultSortKey = SORT_KEYS.TRACK_NUMBER,
  emptyTitle,
  emptyBody,
  extraMenuItems = [],
  optionsContextFor,
  sortable = true,
}) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const insets = useSafeAreaInsets();

  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [ascending, setAscending] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  const sorted = useMemo(
    () => (sortable ? sortTracks(tracks, sortKey, ascending) : tracks),
    [tracks, sortKey, ascending, sortable]
  );

  const totalDuration = useMemo(
    () => tracks.reduce((sum, track) => sum + track.duration, 0),
    [tracks]
  );

  const tintColor = colorFromString(artworkName ?? title, 45, theme.colors.isDark ? 22 : 82);

  const Header = useCallback(
    () => (
      <View>
        <LinearGradient
          colors={[tintColor, theme.colors.background]}
          style={[styles.hero, { paddingTop: insets.top + 60 }]}
        >
          <Artwork
            uri={artworkUri}
            name={artworkName ?? title}
            size={168}
            radius={circularArtwork ? 84 : theme.radius.lg}
            style={styles.heroArt}
          />
          <Text style={[theme.font.h2, { color: theme.colors.text, textAlign: 'center', marginTop: 18 }]}>
            {title}
          </Text>
          <Text
            style={[
              theme.font.caption,
              { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6 },
            ]}
          >
            {subtitle ? `${subtitle} · ` : ''}
            {t('songCount', { count: tracks.length })}
            {totalDuration > 0 ? ` · ${formatLongDuration(totalDuration)}` : ''}
          </Text>
        </LinearGradient>

        {tracks.length > 0 ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => player.shuffleAndPlay(sorted)}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: theme.radius.pill,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="shuffle" size={18} color={theme.colors.text} />
              <Text style={[theme.font.title, { color: theme.colors.text, marginLeft: 8 }]}>
                {t('shuffle')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => player.playQueue(sorted, 0, { shuffled: false })}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.pill,
                  marginLeft: 12,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="play" size={18} color={theme.colors.onAccent} />
              <Text style={[theme.font.title, { color: theme.colors.onAccent, marginLeft: 8 }]}>
                {t('play')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [
      tintColor,
      insets.top,
      artworkUri,
      artworkName,
      title,
      subtitle,
      circularArtwork,
      theme,
      t,
      tracks.length,
      totalDuration,
      sorted,
      player,
    ]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TrackList
        tracks={sorted}
        navigation={navigation}
        showIndex
        showArtwork={false}
        optionsContextFor={optionsContextFor}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle ?? t('emptyPlaylistTitle')}
            body={emptyBody ?? t('emptyPlaylistBody')}
          />
        }
      />

      {/* Floating header controls sit above the artwork gradient. */}
      <View style={[styles.floatingBar, { top: insets.top + 6 }]} pointerEvents="box-none">
        <IconButton
          name="arrow-back"
          onPress={() => navigation.goBack()}
          style={[styles.floatingButton, { backgroundColor: theme.colors.overlay }]}
          color="#FFFFFF"
        />
        <View style={{ flex: 1 }} />
        {sortable && tracks.length > 1 ? (
          <IconButton
            name="swap-vertical"
            onPress={() => setSortOpen(true)}
            style={[styles.floatingButton, { backgroundColor: theme.colors.overlay }]}
            color="#FFFFFF"
          />
        ) : null}
        <IconButton
          name="ellipsis-vertical"
          onPress={() => setMenuOpen(true)}
          style={[styles.floatingButton, { backgroundColor: theme.colors.overlay, marginLeft: 8 }]}
          color="#FFFFFF"
        />
      </View>

      <SortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={DETAIL_SORT_OPTIONS}
        sortKey={sortKey}
        ascending={ascending}
        onChange={(key, asc) => {
          setSortKey(key);
          setAscending(asc);
        }}
      />

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={title}>
        <SheetItem
          icon="play-forward-outline"
          label={t('playNext')}
          onPress={() => {
            setMenuOpen(false);
            player.playNext(sorted);
          }}
        />
        <SheetItem
          icon="list-outline"
          label={t('addToQueue')}
          onPress={() => {
            setMenuOpen(false);
            player.addToQueue(sorted);
          }}
        />
        <SheetItem
          icon="add-circle-outline"
          label={t('addToPlaylist')}
          onPress={() => {
            setMenuOpen(false);
            setPlaylistPickerOpen(true);
          }}
        />
        {extraMenuItems.map((item) => (
          <SheetItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            destructive={item.destructive}
            onPress={() => {
              setMenuOpen(false);
              setTimeout(item.onPress, 220);
            }}
          />
        ))}
      </Sheet>

      <PlaylistPickerSheet
        visible={playlistPickerOpen}
        tracks={sorted}
        onClose={() => setPlaylistPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 24 },
  heroArt: { elevation: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  floatingBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center' },
  floatingButton: { width: 36, height: 36, borderRadius: 18 },
});
