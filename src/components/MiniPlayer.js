import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/SettingsContext';
import { Artwork } from './Artwork';

/**
 * Persistent bar above the tab bar. Tapping it opens the full player.
 *
 * Renders nothing when the queue is empty so the tab bar sits flush at the bottom.
 */
export function MiniPlayer({ bottomOffset = 0 }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentTrack, isPlaying, togglePlay, skipNext, positionMs, durationMs } = usePlayer();

  if (!currentTrack) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Pressable
        onPress={() => navigation.navigate('NowPlaying')}
        style={({ pressed }) => [
          styles.bar,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.colors.accent, width: `${progress * 100}%` },
            ]}
          />
        </View>

        <View style={styles.content}>
          <Artwork uri={currentTrack.artworkUri} name={currentTrack.album} size={42} />
          <View style={styles.meta}>
            <Text numberOfLines={1} style={[theme.font.body, { color: theme.colors.text }]}>
              {currentTrack.title}
            </Text>
            <Text
              numberOfLines={1}
              style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
            >
              {currentTrack.artist}
            </Text>
          </View>

          <Pressable onPress={togglePlay} hitSlop={10} style={styles.control}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={skipNext} hitSlop={10} style={styles.control}>
            <Ionicons name="play-skip-forward" size={21} color={theme.colors.text} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

export const MINI_PLAYER_HEIGHT = 62;

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 8, right: 8 },
  bar: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, elevation: 8 },
  progressTrack: { height: 2, width: '100%' },
  progressFill: { height: 2 },
  content: { flexDirection: 'row', alignItems: 'center', padding: 8, height: MINI_PLAYER_HEIGHT - 2 },
  meta: { flex: 1, marginLeft: 10, marginRight: 6 },
  control: { paddingHorizontal: 8 },
});
