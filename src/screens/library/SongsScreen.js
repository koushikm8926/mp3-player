import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ScreenHeader, SearchBar, SegmentedTabs } from '../../components/common';
import { SortSheet } from '../../components/SortSheet';
import { TrackOptionsSheet } from '../../components/TrackOptionsSheet';
import { TrackRow, TRACK_ROW_TALL_HEIGHT } from '../../components/TrackRow';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings, useTheme } from '../../context/SettingsContext';
import { SORT_KEYS, sortTracks } from '../../services/musicLibrary';
import { normalizeForSearch } from '../../utils/format';

const SORT_OPTIONS = [
  SORT_KEYS.TITLE,
  SORT_KEYS.ARTIST,
  SORT_KEYS.ALBUM,
  SORT_KEYS.DURATION,
  SORT_KEYS.DATE_ADDED,
  SORT_KEYS.YEAR,
  SORT_KEYS.SIZE,
  SORT_KEYS.PLAY_COUNT,
];

const INDEX_LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** The full song list, filtered by the tab strip and searchable in place. */
export function SongsScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const library = useLibrary();
  const listRef = useRef(null);

  const { tracks, statsMap, recentlyAddedTracks, mostPlayedTracks, scanning } = library;

  const [tab, setTab] = useState(route?.params?.initialTab ?? 'all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(SORT_KEYS.TITLE);
  const [ascending, setAscending] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [sheetTrack, setSheetTrack] = useState(null);

  const listed = useMemo(() => {
    let base;
    if (tab === 'recent') base = recentlyAddedTracks;
    else if (tab === 'most') base = mostPlayedTracks;
    else if (tab === 'az') base = sortTracks(tracks, SORT_KEYS.TITLE, true, statsMap);
    else base = sortTracks(tracks, sortKey, ascending, statsMap);

    if (!query) return base;
    const needle = normalizeForSearch(query);
    return base.filter((track) => track.searchKey.includes(needle));
  }, [tab, tracks, recentlyAddedTracks, mostPlayedTracks, sortKey, ascending, statsMap, query]);

  // First row index for each letter, so the rail can jump straight to it. Only meaningful
  // while the list is alphabetical.
  const letterIndex = useMemo(() => {
    if (tab !== 'az' && !(tab === 'all' && sortKey === SORT_KEYS.TITLE && ascending)) return null;
    const map = new Map();
    listed.forEach((track, index) => {
      const first = normalizeForSearch(track.title).charAt(0).toUpperCase();
      const letter = first >= 'A' && first <= 'Z' ? first : '#';
      if (!map.has(letter)) map.set(letter, index);
    });
    return map;
  }, [listed, tab, sortKey, ascending]);

  const jumpToLetter = useCallback(
    (letter) => {
      const index = letterIndex?.get(letter);
      if (index == null) return;
      listRef.current?.scrollToIndex({ index, animated: true });
    },
    [letterIndex]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlashList
        ref={listRef}
        data={listed}
        keyExtractor={(item) => item.id}
        estimatedItemSize={TRACK_ROW_TALL_HEIGHT}
        contentContainerStyle={{ paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ backgroundColor: theme.colors.background }}>
            <ScreenHeader
              title={t('songs')}
              glyph="musical-notes"
              subtitle={t('songCount', { count: tracks.length })}
              onBack={() => navigation.goBack()}
              actions={[
                { icon: 'search', onPress: () => navigation.navigate('Search') },
                { icon: 'swap-vertical', onPress: () => setSortOpen(true) },
                { icon: 'ellipsis-vertical', onPress: () => navigation.navigate('Settings') },
              ]}
            />
            <SearchBar
              placeholder={t('searchSongs')}
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              trailingIcon="funnel-outline"
              trailingLabel={t('filter')}
              onPressTrailing={() => setSortOpen(true)}
            />
            <SegmentedTabs
              style={{ marginTop: 18, marginBottom: 6 }}
              value={tab}
              onChange={setTab}
              options={[
                { key: 'all', label: t('allSongs') },
                { key: 'recent', label: t('recentlyAdded') },
                { key: 'most', label: t('mostPlayed') },
                { key: 'az', label: t('aToZ') },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          scanning ? null : (
            <EmptyState
              title={t('emptyLibraryTitle')}
              body={t('emptyLibraryBody')}
              action={t('refreshLibrary')}
              onAction={() => library.refresh({ rescanMediaStore: true })}
            />
          )
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            showIndex
            showAlbum
            isActive={player.currentTrack?.id === item.id}
            isPlaying={player.isPlaying}
            isFavorite={library.isFavorite(item.id)}
            onPress={() => player.playQueue(listed, index)}
            onLongPress={() => setSheetTrack(item)}
            onPressMore={() => setSheetTrack(item)}
          />
        )}
      />

      {letterIndex && letterIndex.size > 1 ? (
        <View style={styles.indexRail} pointerEvents="box-none">
          {INDEX_LETTERS.map((letter) => {
            const enabled = letterIndex.has(letter);
            return (
              <Pressable key={letter} onPress={() => jumpToLetter(letter)} disabled={!enabled} hitSlop={4}>
                <Text
                  style={[
                    theme.font.tiny,
                    {
                      color: enabled ? theme.colors.accent : theme.colors.textTertiary,
                      opacity: enabled ? 1 : 0.35,
                      paddingVertical: 1.5,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {letter}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <SortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORT_OPTIONS}
        sortKey={sortKey}
        ascending={ascending}
        onChange={(key, asc) => {
          setSortKey(key);
          setAscending(asc);
          setTab('all');
        }}
      />

      <TrackOptionsSheet
        track={sheetTrack}
        visible={sheetTrack != null}
        onClose={() => setSheetTrack(null)}
        navigation={navigation}
      />
    </View>
  );
}

/** Play / shuffle / sort bar shown above long track lists on the detail screens. */
export function ListToolbar({ count, onPlay, onShuffle, onSort, subtitle }) {
  const theme = useTheme();
  const { t } = useSettings();

  return (
    <View style={styles.toolbar}>
      <View style={{ flex: 1 }}>
        <Text style={[theme.font.caption, { color: theme.colors.textSecondary }]}>
          {subtitle ?? t('songCount', { count })}
        </Text>
      </View>

      {onSort ? (
        <Pressable onPress={onSort} hitSlop={8} style={styles.toolbarButton}>
          <Ionicons name="swap-vertical" size={19} color={theme.colors.textSecondary} />
        </Pressable>
      ) : null}
      {onShuffle ? (
        <Pressable onPress={onShuffle} style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="shuffle" size={19} color={theme.colors.text} />
        </Pressable>
      ) : null}
      {onPlay ? (
        <Pressable onPress={onPlay} style={[styles.circle, { backgroundColor: theme.colors.accent }]}>
          <Ionicons name="play" size={19} color={theme.colors.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  indexRail: {
    position: 'absolute',
    right: 3,
    top: '32%',
    alignItems: 'center',
    width: 18,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolbarButton: { padding: 8, marginRight: 4 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
