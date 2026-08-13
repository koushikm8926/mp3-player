import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Switcher } from '../components/common';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';

/** The live play queue, in the order the tracks will actually be heard. */
export function QueueScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();

  const [tab, setTab] = useState('next');

  // `order` holds queue indices in play order, so the visible list follows shuffle.
  const rows = useMemo(
    () =>
      player.order
        .map((queueIndex, position) => ({ queueIndex, position, track: player.queue[queueIndex] }))
        .filter((row) => row.track),
    [player.order, player.queue]
  );

  const currentRow = rows.find((row) => row.position === player.orderPosition);
  const upNext = rows.filter((row) => row.position > player.orderPosition);
  const history = library.recentTracks ?? [];
  const showingHistory = tab === 'history';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[theme.font.h2, { color: theme.colors.text }]}>{t('queue')}</Text>
          <Text style={[theme.font.body, { color: theme.colors.accent, marginTop: 2 }]}>
            {showingHistory ? t('history') : t('upNext')}
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <Switcher
        style={{ marginTop: 6, marginBottom: 18 }}
        value={tab}
        onChange={setTab}
        options={[
          { key: 'next', label: t('upNext'), icon: 'play' },
          { key: 'history', label: t('history'), icon: 'time-outline' },
        ]}
      />

      <FlashList
        data={showingHistory ? history : upNext}
        keyExtractor={(item, index) =>
          showingHistory ? `h-${item.id}-${index}` : `${item.queueIndex}-${item.track.id}`
        }
        estimatedItemSize={72}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          showingHistory || !currentRow ? null : (
            <View>
              <Text style={[theme.font.title, styles.groupLabel, { color: theme.colors.accent }]}>
                {t('nowPlaying')}
              </Text>
              <View
                style={[
                  styles.currentCard,
                  { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.md },
                ]}
              >
                <TrackRow
                  track={currentRow.track}
                  index={currentRow.position}
                  showIndex
                  showAlbum
                  isActive
                  isPlaying={player.isPlaying}
                  isFavorite={library.isFavorite(currentRow.track.id)}
                  onPress={() => navigation.navigate('NowPlaying')}
                />
              </View>

              <View style={styles.upNextHeader}>
                <Text style={[theme.font.h3, { color: theme.colors.accent, flex: 1 }]}>
                  {`${t('upNext')} · ${t('songCount', { count: upNext.length })}`}
                </Text>
                {upNext.length > 0 ? (
                  <Pressable
                    onPress={player.clearQueue}
                    style={({ pressed }) => [
                      styles.clearButton,
                      {
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.pill,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.accent} />
                    <Text style={[theme.font.body, { color: theme.colors.accent, marginLeft: 6 }]}>
                      {t('clear')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon={showingHistory ? 'time-outline' : 'list-outline'}
            title={t('emptyQueueTitle')}
            body={t('emptyQueueBody')}
          />
        }
        renderItem={({ item, index }) =>
          showingHistory ? (
            <TrackRow
              track={item}
              index={index}
              showAlbum
              isActive={player.currentTrack?.id === item.id}
              isPlaying={player.isPlaying}
              isFavorite={library.isFavorite(item.id)}
              onPress={() => player.playQueue(history, index)}
            />
          ) : (
            <TrackRow
              track={item.track}
              index={index}
              showIndex
              showAlbum
              moreIcon="close"
              isPlaying={player.isPlaying}
              isFavorite={library.isFavorite(item.track.id)}
              onPress={() => player.skipToQueueIndex(item.queueIndex)}
              onPressMore={() => player.removeFromQueue(item.queueIndex)}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  groupLabel: { paddingHorizontal: 16, marginBottom: 8 },
  currentCard: { marginHorizontal: 16, overflow: 'hidden' },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
