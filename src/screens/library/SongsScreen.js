import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/common';
import { SortSheet } from '../../components/SortSheet';
import { TrackList } from '../../components/TrackList';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings, useTheme } from '../../context/SettingsContext';
import { SORT_KEYS, sortTracks } from '../../services/musicLibrary';

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

/** The full song list — the default landing tab of the Library. */
export function SongsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const { tracks, statsMap, scanning, refresh } = useLibrary();

  const [sortKey, setSortKey] = useState(SORT_KEYS.TITLE);
  const [ascending, setAscending] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sorted = useMemo(
    () => sortTracks(tracks, sortKey, ascending, statsMap),
    [tracks, sortKey, ascending, statsMap]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh({ rescanMediaStore: true });
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TrackList
        tracks={sorted}
        navigation={navigation}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          sorted.length > 0 ? (
            <ListToolbar
              count={sorted.length}
              onShuffle={() => player.shuffleAndPlay(sorted)}
              onPlay={() => player.playQueue(sorted, 0, { shuffled: false })}
              onSort={() => setSortOpen(true)}
            />
          ) : null
        }
        ListEmptyComponent={
          scanning ? null : (
            <EmptyState
              title={t('emptyLibraryTitle')}
              body={t('emptyLibraryBody')}
              action={t('refreshLibrary')}
              onAction={onRefresh}
            />
          )
        }
      />

      <SortSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORT_OPTIONS}
        sortKey={sortKey}
        ascending={ascending}
        onChange={(key, asc) => {
          setSortKey(key);
          setAscending(asc);
        }}
      />
    </View>
  );
}

/** Play / shuffle / sort bar shown above long track lists. */
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
        <Pressable
          onPress={onShuffle}
          style={[styles.circle, { backgroundColor: theme.colors.surfaceAlt }]}
        >
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
