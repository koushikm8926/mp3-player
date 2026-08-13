import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/SettingsContext';
import { formatDuration } from '../utils/format';
import { Artwork } from './Artwork';

/**
 * Persistent bar above the tab bar, filled with the accent gradient. Tapping it opens the
 * full player.
 *
 * Renders nothing when the queue is empty so the tab bar sits flush at the bottom.
 */
export function MiniPlayer({ bottomOffset = 0 }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentTrack, isPlaying, togglePlay, skipNext, skipPrevious, positionMs, durationMs } =
    usePlayer();

  if (!currentTrack) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const onAccent = '#FFFFFF';

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Pressable
        onPress={() => navigation.navigate('NowPlaying')}
        style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
      >
        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bar, { borderRadius: theme.radius.lg }, theme.shadow.floating]}
        >
          <Artwork
            uri={currentTrack.artworkUri}
            name={currentTrack.album || currentTrack.title}
            size={50}
            radius={theme.radius.sm}
          />

          <View style={styles.meta}>
            <Text numberOfLines={1} style={[theme.font.title, { color: onAccent }]}>
              {currentTrack.title}
            </Text>
            <Text
              numberOfLines={1}
              style={[theme.font.caption, { color: onAccent, opacity: 0.82, marginTop: 2 }]}
            >
              {currentTrack.artist}
            </Text>

            <View style={styles.progressRow}>
              <Text style={[theme.font.tiny, { color: onAccent, opacity: 0.85 }]}>
                {formatDuration(positionMs)}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.32)' }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: onAccent, width: `${progress * 100}%` },
                  ]}
                />
              </View>
              <Text style={[theme.font.tiny, { color: onAccent, opacity: 0.85 }]}>
                {formatDuration(durationMs)}
              </Text>
            </View>
          </View>

          <Pressable onPress={skipPrevious} hitSlop={8} style={styles.control}>
            <Ionicons name="play-skip-back" size={21} color={onAccent} />
          </Pressable>

          <Pressable onPress={togglePlay} hitSlop={8} style={[styles.playButton, { backgroundColor: onAccent }]}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={theme.colors.accent}
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </Pressable>

          <Pressable onPress={skipNext} hitSlop={8} style={styles.control}>
            <Ionicons name="play-skip-forward" size={21} color={onAccent} />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export const MINI_PLAYER_HEIGHT = 78;

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 10, right: 10 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: MINI_PLAYER_HEIGHT,
    overflow: 'hidden',
  },
  meta: { flex: 1, marginLeft: 12, marginRight: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 8, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  control: { paddingHorizontal: 6 },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
});
