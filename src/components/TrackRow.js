import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/SettingsContext';
import { formatDuration } from '../utils/format';
import { Artwork } from './Artwork';

const GLYPH_BARS = [11, 17, 13];
const GLYPH_REST = 0.42;

/**
 * One bar of the playing indicator. Scales from its base so it reads as a level meter
 * rather than a bar sliding around, and each one is offset so the three never move in step.
 */
function GlyphBar({ color, height, delay, paused }) {
  const level = useSharedValue(GLYPH_REST);

  useEffect(() => {
    if (paused) {
      level.value = withTiming(GLYPH_REST, { duration: 200 });
      return;
    }
    level.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
          withTiming(GLYPH_REST, { duration: 380, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [paused, delay, level]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));

  return (
    <Animated.View
      style={[
        { width: 3, height, borderRadius: 2, backgroundColor: color, marginHorizontal: 1.5 },
        styles.glyphBar,
        animatedStyle,
      ]}
    />
  );
}

/** Three stacked bars marking the row that is currently playing. */
function NowPlayingGlyph({ color, paused }) {
  return (
    <View style={styles.glyph}>
      {GLYPH_BARS.map((height, i) => (
        <GlyphBar key={i} color={color} height={height} delay={i * 130} paused={paused} />
      ))}
    </View>
  );
}

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
  showAlbum = false,
  subtitle,
  trailing,
  moreIcon = 'ellipsis-vertical',
}) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const titleColor = isActive
    ? (isDarkUI ? '#C084FC' : theme.colors.accent)
    : (isDarkUI ? '#FFFFFF' : theme.colors.text);
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;
  const tertiaryColor = isDarkUI ? 'rgba(255, 255, 255, 0.45)' : theme.colors.textTertiary;
  const favIconColor = isDarkUI ? '#C084FC' : theme.colors.accent;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        showAlbum && styles.rowTall,
        { backgroundColor: pressed ? (isDarkUI ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfacePressed) : 'transparent' },
      ]}
    >
      {showIndex ? (
        <View style={styles.indexBox}>
          {isActive ? (
            <NowPlayingGlyph color={isDarkUI ? '#C084FC' : theme.colors.accent} paused={!isPlaying} />
          ) : (
            <Text style={[theme.font.body, { color: tertiaryColor }]}>{index + 1}</Text>
          )}
        </View>
      ) : null}

      {showArtwork ? (
        <Artwork
          uri={track.artworkUri}
          name={track.album || track.title}
          size={52}
          radius={theme.radius.sm}
        />
      ) : null}

      <View style={styles.meta}>
        <Text numberOfLines={1} style={[theme.font.title, { color: titleColor }]}>
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[theme.font.caption, { color: subtitleColor, marginTop: 3 }]}
        >
          {subtitle ?? track.artist}
        </Text>
        {showAlbum && track.album ? (
          <Text
            numberOfLines={1}
            style={[theme.font.caption, { color: tertiaryColor, marginTop: 2 }]}
          >
            {track.album}
          </Text>
        ) : null}
      </View>

      {isFavorite ? (
        <Ionicons name="heart" size={15} color={favIconColor} style={{ marginRight: 8 }} />
      ) : null}

      {trailing ?? (
        <Text style={[theme.font.body, { color: subtitleColor, marginRight: 4 }]}>
          {formatDuration(track.duration)}
        </Text>
      )}

      {onPressMore ? (
        <Pressable onPress={onPressMore} hitSlop={10} style={styles.more}>
          <Ionicons name={moreIcon} size={18} color={tertiaryColor} />
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
    prev.showArtwork === next.showArtwork &&
    prev.showAlbum === next.showAlbum &&
    prev.subtitle === next.subtitle
);

export const TRACK_ROW_HEIGHT = 72;
export const TRACK_ROW_TALL_HEIGHT = 88;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: TRACK_ROW_HEIGHT,
  },
  rowTall: { height: TRACK_ROW_TALL_HEIGHT },
  indexBox: { width: 30, alignItems: 'center', justifyContent: 'center' },
  glyph: { flexDirection: 'row', alignItems: 'flex-end', height: 18 },
  glyphBar: { transformOrigin: 'bottom' },
  meta: { flex: 1, marginLeft: 14, marginRight: 8 },
  more: { paddingHorizontal: 4, paddingVertical: 8 },
});
