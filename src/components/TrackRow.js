import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/SettingsContext';
import { formatDuration } from '../utils/format';
import { Artwork } from './Artwork';

/**
 * One row in every track list in the app.
 *
 * Memoised on the fields that actually affect rendering — a 5000-row library list would
 * otherwise re-render every row on each playback tick.
 */
function TrackRowComponent({
  track,
  onPress,
  onLongPress,
  onPressMore,
  isActive,
  isPlaying,
  isFavorite,
  index,
  showIndex = false,
  showArtwork = true,
  trailing,
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      {showIndex ? (
        <View style={styles.indexBox}>
          {isActive ? (
            <Ionicons
              name={isPlaying ? 'volume-high' : 'pause'}
              size={16}
              color={theme.colors.accent}
            />
          ) : (
            <Text style={[theme.font.caption, { color: theme.colors.textTertiary }]}>
              {index + 1}
            </Text>
          )}
        </View>
      ) : null}

      {showArtwork ? (
        <Artwork uri={track.artworkUri} name={track.album || track.title} size={48} />
      ) : null}

      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[theme.font.title, { color: isActive ? theme.colors.accent : theme.colors.text }]}
        >
          {track.title}
        </Text>
        <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
          {track.artist}
          {track.album ? ` · ${track.album}` : ''}
        </Text>
      </View>

      {isFavorite ? (
        <Ionicons name="heart" size={15} color={theme.colors.accent} style={{ marginRight: 8 }} />
      ) : null}

      {trailing ?? (
        <Text style={[theme.font.caption, { color: theme.colors.textTertiary, marginRight: 4 }]}>
          {formatDuration(track.duration)}
        </Text>
      )}

      {onPressMore ? (
        <Pressable onPress={onPressMore} hitSlop={10} style={styles.more}>
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export const TrackRow = memo(
  TrackRowComponent,
  (prev, next) =>
    prev.track.id === next.track.id &&
    prev.isActive === next.isActive &&
    prev.isPlaying === next.isPlaying &&
    prev.isFavorite === next.isFavorite &&
    prev.index === next.index &&
    prev.showIndex === next.showIndex &&
    prev.showArtwork === next.showArtwork
);

export const TRACK_ROW_HEIGHT = 68;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: TRACK_ROW_HEIGHT,
  },
  indexBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, marginLeft: 12, marginRight: 8 },
  more: { paddingHorizontal: 4, paddingVertical: 8 },
});
