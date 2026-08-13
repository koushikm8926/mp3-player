import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../components/Artwork';
import { EmptyState, IconPill, PlayShuffleRow } from '../components/common';
import { PlaylistPickerSheet } from '../components/PlaylistPickerSheet';
import { Sheet, SheetItem } from '../components/Sheet';
import { SortSheet } from '../components/SortSheet';
import { TrackList } from '../components/TrackList';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { SORT_KEYS, sortTracks } from '../services/musicLibrary';
import { formatLongDuration } from '../utils/format';

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
 *
 * Two hero shapes. The default puts the artwork beside the metadata, as album and playlist
 * pages do. Passing `heroIcon` switches to the centred icon treatment used by the collections
 * that have no cover of their own, like Favourites and Recently Played.
 */
export function CollectionScreen({
  navigation,
  title,
  subtitle,
  /** When true the subtitle is an artist name and links to that artist's page. */
  subtitleIsArtist = false,
  description,
  artworkUri,
  artworkName,
  circularArtwork = false,
  heroIcon,
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
  const library = useLibrary();
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

  const allFavorite = tracks.length > 0 && tracks.every((track) => library.isFavorite(track.id));

  const counts = [
    t('songCount', { count: tracks.length }),
    totalDuration > 0 ? formatLongDuration(totalDuration) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // The media hero already shows the subtitle on its own line, so only the centred-icon
  // layout folds it into the counts.
  const meta = heroIcon && subtitle ? `${subtitle} · ${counts}` : counts;

  const playAll = useCallback(
    () => player.playQueue(sorted, 0, { shuffled: false }),
    [player, sorted]
  );
  const shuffleAll = useCallback(() => player.shuffleAndPlay(sorted), [player, sorted]);

  /**
   * Drives the whole collection to one state rather than flipping each track: on a mixed
   * selection the button adds the missing favourites instead of inverting them.
   */
  const toggleAllFavorites = useCallback(() => {
    const target = !allFavorite;
    tracks.forEach((track) => {
      if (library.isFavorite(track.id) !== target) library.toggleFavorite(track);
    });
  }, [allFavorite, tracks, library]);

  const Header = useCallback(
    () => (
      <View style={{ backgroundColor: theme.colors.background }}>
        {heroIcon ? (
          <View style={styles.simpleHero}>
            <View style={[styles.simpleIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <Ionicons name={heroIcon} size={30} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[theme.font.h1, { color: theme.colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 3 }]}>
                {meta}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.mediaHero}>
            <Artwork
              uri={artworkUri}
              name={artworkName ?? title}
              size={160}
              radius={circularArtwork ? 80 : theme.radius.lg}
              style={theme.shadow.floating}
            />

            <View style={styles.mediaMeta}>
              <Text style={[theme.font.h1, { color: theme.colors.text }]} numberOfLines={2}>
                {title}
              </Text>

              {subtitle ? (
                <Pressable
                  onPress={
                    subtitleIsArtist
                      ? () => navigation.navigate('ArtistDetail', { name: subtitle })
                      : undefined
                  }
                  disabled={!subtitleIsArtist}
                  style={styles.subtitleRow}
                >
                  <Text
                    numberOfLines={1}
                    style={[theme.font.title, { color: theme.colors.accent }]}
                  >
                    {subtitle}
                  </Text>
                  {subtitleIsArtist ? (
                    <Ionicons name="chevron-forward" size={15} color={theme.colors.accent} />
                  ) : null}
                </Pressable>
              ) : null}

              <Text
                style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 6 }]}
              >
                {meta}
              </Text>

              {description ? (
                <Text
                  numberOfLines={3}
                  style={[
                    theme.font.body,
                    { color: theme.colors.textSecondary, marginTop: 10, lineHeight: 20 },
                  ]}
                >
                  {description}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {tracks.length > 0 ? (
          <PlayShuffleRow
            style={{ marginTop: 20 }}
            playLabel={t('playAll')}
            shuffleLabel={t('shuffle')}
            onPlay={playAll}
            onShuffle={shuffleAll}
            trailing={
              <IconPill
                name={allFavorite ? 'heart' : 'heart-outline'}
                active={allFavorite}
                onPress={toggleAllFavorites}
                style={{ marginLeft: 12 }}
              />
            }
          />
        ) : null}

        {/* Rounded top edge of the sheet the track rows sit on. */}
        <View
          style={[
            styles.sheetTop,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
            },
          ]}
        >
          <Text style={[theme.font.title, { color: theme.colors.accent, flex: 1 }]}>
            {t('songCount', { count: tracks.length })}
          </Text>
          {totalDuration > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={15} color={theme.colors.accent} />
              <Text style={[theme.font.body, { color: theme.colors.accent, marginLeft: 5 }]}>
                {formatLongDuration(totalDuration)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    ),
    [
      theme,
      t,
      heroIcon,
      artworkUri,
      artworkName,
      title,
      subtitle,
      subtitleIsArtist,
      description,
      circularArtwork,
      meta,
      tracks,
      totalDuration,
      allFavorite,
      navigation,
      playAll,
      shuffleAll,
      toggleAllFavorites,
    ]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.accent} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {sortable && tracks.length > 1 ? (
          <Pressable onPress={() => setSortOpen(true)} hitSlop={12} style={{ marginRight: 18 }}>
            <Ionicons name="swap-vertical" size={22} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.accent} />
        </Pressable>
      </View>

      <TrackList
        tracks={sorted}
        navigation={navigation}
        showIndex
        showArtwork={Boolean(heroIcon)}
        optionsContextFor={optionsContextFor}
        contentContainerStyle={{ backgroundColor: theme.colors.surface }}
        ListHeaderComponent={Header}
        ListFooterComponent={<View style={{ height: 170, backgroundColor: theme.colors.surface }} />}
        ListEmptyComponent={
          <View style={{ backgroundColor: theme.colors.background }}>
            <EmptyState
              title={emptyTitle ?? t('emptyPlaylistTitle')}
              body={emptyBody ?? t('emptyPlaylistBody')}
            />
          </View>
        }
      />

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
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  mediaHero: { flexDirection: 'row', paddingHorizontal: 16 },
  mediaMeta: { flex: 1, marginLeft: 18 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  simpleHero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  simpleIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
  },
});
