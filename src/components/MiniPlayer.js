import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/SettingsContext';
import { formatDuration } from '../utils/format';
import { PopOnChange, PressableScale } from './animated';
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
  const { adminMode } = useLibrary() || {};
  const { currentTrack, isPlaying, togglePlay, skipNext, skipPrevious, positionMs, durationMs } =
    usePlayer();

  if (!currentTrack) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const onAccent = '#FFFFFF';
  const gradientColors = adminMode ? ['#2A1054', '#5B21B6'] : theme.accentGradient;
  const playIconColor = adminMode ? '#6D28D9' : theme.colors.accent;

  return (
    <Animated.View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
      // The bar only exists while something is queued, so it should arrive and leave as a
      // bar rather than blinking in and out of the layout.
      entering={SlideInDown.springify().damping(18).mass(0.6)}
      exiting={SlideOutDown.duration(220)}
    >
      <PressableScale onPress={() => navigation.navigate('NowPlaying')} scaleTo={0.975}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bar, { borderRadius: theme.radius.lg }, theme.shadow.floating]}
        >
          <Animated.View key={currentTrack.id} entering={FadeIn.duration(260)}>
            <Artwork
              uri={currentTrack.artworkUri}
              name={currentTrack.album || currentTrack.title}
              size={50}
              radius={theme.radius.sm}
            />
          </Animated.View>

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

          <PressableScale onPress={skipPrevious} hitSlop={8} style={styles.control} scaleTo={0.82}>
            <Ionicons name="play-skip-back" size={21} color={onAccent} />
          </PressableScale>

          <PressableScale
            onPress={togglePlay}
            hitSlop={8}
            scaleTo={0.88}
            style={[styles.playButton, { backgroundColor: onAccent }]}
          >
            <PopOnChange trigger={isPlaying}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={playIconColor}
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </PopOnChange>
          </PressableScale>

          <PressableScale onPress={skipNext} hitSlop={8} style={styles.control} scaleTo={0.82}>
            <Ionicons name="play-skip-forward" size={21} color={onAccent} />
          </PressableScale>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
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
