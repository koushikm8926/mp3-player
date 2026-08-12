import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/common';
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

  // `order` holds queue indices in play order, so the visible list follows shuffle.
  const rows = useMemo(
    () =>
      player.order
        .map((queueIndex, position) => ({
          queueIndex,
          position,
          track: player.queue[queueIndex],
        }))
        .filter((row) => row.track),
    [player.order, player.queue]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[theme.font.h3, { color: theme.colors.text }]}>{t('queue')}</Text>
          <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {t('trackCount', { count: rows.length })}
          </Text>
        </View>
        {rows.length > 0 ? (
          <Pressable onPress={player.clearQueue} hitSlop={10}>
            <Text style={[theme.font.body, { color: theme.colors.danger }]}>{t('clear')}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlashList
        data={rows}
        keyExtractor={(item) => `${item.queueIndex}-${item.track.id}`}
        estimatedItemSize={68}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <EmptyState icon="list-outline" title={t('emptyQueueTitle')} body={t('emptyQueueBody')} />
        }
        renderItem={({ item }) => {
          const isCurrent = item.position === player.orderPosition;
          return (
            <TrackRow
              track={item.track}
              index={item.position}
              showIndex
              showArtwork
              isActive={isCurrent}
              isPlaying={player.isPlaying}
              isFavorite={library.isFavorite(item.track.id)}
              onPress={() => player.skipToQueueIndex(item.queueIndex)}
              trailing={
                isCurrent ? null : (
                  <Pressable
                    onPress={() => player.removeFromQueue(item.queueIndex)}
                    hitSlop={10}
                    style={{ paddingHorizontal: 6 }}
                  >
                    <Ionicons name="close" size={19} color={theme.colors.textTertiary} />
                  </Pressable>
                )
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
});
