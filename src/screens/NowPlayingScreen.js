import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopOnChange, PressableScale, PressableSpin } from '../components/animated';
import { Artwork } from '../components/Artwork';
import { PlaylistPickerSheet } from '../components/PlaylistPickerSheet';
import { Sheet, SheetItem } from '../components/Sheet';
import { TrackDetailsSheet } from '../components/TrackOptionsSheet';
import { useLibrary } from '../context/LibraryContext';
import { REPEAT_MODES, usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { formatCountdown, formatDuration } from '../utils/format';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Step for the seek controls flanking the seek bar. */
const SEEK_STEP_MS = 10000;

/** Full-screen player matching the updated design layout. */
export function NowPlayingScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();
  const { width } = useWindowDimensions();

  const [scrubbing, setScrubbing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  const track = player.currentTrack;

  if (!track) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.chevron} hitSlop={12}>
          <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={[theme.font.h3, { color: theme.colors.textSecondary }]}>
            {t('emptyQueueTitle')}
          </Text>
        </View>
      </View>
    );
  }

  const artSize = Math.min(width - 72, 340);
  const favorite = library.isFavorite(track.id);
  const position = scrubbing ?? player.positionMs;
  const duration = player.durationMs || track.duration || 1;
  const repeatActive = player.repeatMode !== REPEAT_MODES.OFF;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const tap = () => Haptics.selectionAsync().catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[theme.font.h3, { color: theme.colors.text }]}>{t('nowPlaying')}</Text>
            <View style={[styles.miniTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
              <View
                style={[
                  styles.miniFill,
                  { backgroundColor: theme.colors.accent, width: `${progress * 100}%` },
                ]}
              />
            </View>
            {player.sleepTimer ? (
              <Text style={[theme.font.tiny, { color: theme.colors.accent, marginTop: 4 }]}>
                {player.sleepTimer.endOfTrack
                  ? t('endOfTrack')
                  : t('sleepTimerActive', {
                      time: formatCountdown(player.sleepTimer.endsAt - Date.now()),
                    })}
              </Text>
            ) : null}
          </View>

          <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
            <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <Animated.View key={track.id} entering={FadeIn.duration(320)} style={styles.artWrap}>
          <Artwork
            uri={track.artworkUri}
            name={track.album || track.title}
            size={artSize}
            radius={theme.radius.xl}
            style={theme.shadow.floating}
          />
        </Animated.View>

        {/* Track details centered */}
        <View style={styles.metaCenter}>
          <Text numberOfLines={1} style={[theme.font.h2, { color: theme.colors.text }]}>
            {track.title}
          </Text>
          <Pressable onPress={() => navigation.navigate('ArtistDetail', { name: track.artist })}>
            <Text
              numberOfLines={1}
              style={[theme.font.title, { color: theme.colors.accent, marginTop: 6 }]}
            >
              {track.artist}
            </Text>
          </Pressable>
          {track.album ? (
            <Text
              numberOfLines={1}
              style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 4 }]}
            >
              {track.album}
            </Text>
          ) : null}
        </View>

        {/* Quick Action Icons Row directly under title & artist (matching updated layout) */}
        <View style={styles.quickActionRow}>
          <PressableScale
            onPress={() => {
              tap();
              library.toggleFavorite(track);
            }}
            hitSlop={12}
            scaleTo={0.82}
            style={styles.iconButton}
          >
            <PopOnChange trigger={favorite}>
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={favorite ? theme.colors.accent : theme.colors.textSecondary}
              />
            </PopOnChange>
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              setPlaylistPickerOpen(true);
            }}
            hitSlop={12}
            scaleTo={0.85}
            style={styles.iconButton}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.textSecondary} />
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              navigation.navigate('Equalizer');
            }}
            hitSlop={12}
            scaleTo={0.85}
            style={styles.iconButton}
          >
            <View style={styles.activeIconContainer}>
              <Ionicons
                name="options-outline"
                size={24}
                color={settings.equalizerEnabled ? theme.colors.accent : theme.colors.textSecondary}
              />
              {settings.equalizerEnabled ? (
                <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
              ) : null}
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              navigation.navigate('SleepTimer');
            }}
            hitSlop={12}
            scaleTo={0.85}
            style={styles.iconButton}
          >
            <View style={styles.activeIconContainer}>
              <Ionicons
                name="moon-outline"
                size={24}
                color={player.sleepTimer != null ? theme.colors.accent : theme.colors.textSecondary}
              />
              {player.sleepTimer != null ? (
                <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
              ) : null}
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              navigation.navigate('Queue');
            }}
            hitSlop={12}
            scaleTo={0.85}
            style={styles.iconButton}
          >
            <Ionicons name="list-outline" size={24} color={theme.colors.textSecondary} />
          </PressableScale>
        </View>

        {/* Seek section flanked by 10s Rewind and Fast-Forward controls */}
        <View style={styles.seekRow}>
          <PressableSpin
            onPress={() => {
              tap();
              player.seekBy(-SEEK_STEP_MS);
            }}
            degrees={-40}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="rewind-10" size={28} color={theme.colors.text} />
          </PressableSpin>

          <View style={styles.seekCenterContainer}>
            <View style={styles.timePillContainer}>
              <View style={[styles.timePill, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[theme.font.caption, { color: theme.colors.text, fontWeight: '600', fontSize: 12 }]}>
                  {formatDuration(position)} / {formatDuration(duration)}
                </Text>
              </View>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onValueChange={setScrubbing}
              onSlidingComplete={(value) => {
                player.seekTo(value);
                setScrubbing(null);
              }}
              minimumTrackTintColor={theme.colors.accent}
              maximumTrackTintColor={theme.colors.isDark ? '#374151' : '#D1D5DB'}
              thumbTintColor={theme.colors.accent}
            />
          </View>

          <PressableSpin
            onPress={() => {
              tap();
              player.seekBy(SEEK_STEP_MS);
            }}
            degrees={40}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="fast-forward-10" size={28} color={theme.colors.text} />
          </PressableSpin>
        </View>

        {/* Main transport controls (Shuffle | Skip Back | Play/Pause | Skip Forward | Repeat) */}
        <View style={styles.controls}>
          <PressableScale
            onPress={() => {
              tap();
              player.toggleShuffle();
            }}
            hitSlop={12}
            scaleTo={0.85}
          >
            <PopOnChange trigger={player.shuffle}>
              <Ionicons
                name="shuffle"
                size={22}
                color={player.shuffle ? theme.colors.accent : theme.colors.textSecondary}
              />
            </PopOnChange>
          </PressableScale>

          <PressableScale onPress={player.skipPrevious} hitSlop={12} scaleTo={0.86}>
            <Ionicons name="play-skip-back" size={30} color={theme.colors.text} />
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              player.togglePlay();
            }}
            scaleTo={0.9}
            style={[
              styles.playButton,
              { backgroundColor: theme.colors.accent },
              theme.shadow.floating,
            ]}
          >
            <PopOnChange trigger={player.isPlaying}>
              <Ionicons
                name={player.isPlaying ? 'pause' : 'play'}
                size={34}
                color={theme.colors.onAccent}
                style={{ marginLeft: player.isPlaying ? 0 : 3 }}
              />
            </PopOnChange>
          </PressableScale>

          <PressableScale onPress={player.skipNext} hitSlop={12} scaleTo={0.86}>
            <Ionicons name="play-skip-forward" size={30} color={theme.colors.text} />
          </PressableScale>

          <PressableScale
            onPress={() => {
              tap();
              player.cycleRepeat();
            }}
            hitSlop={12}
            scaleTo={0.85}
          >
            <PopOnChange trigger={player.repeatMode}>
              <View>
                <Ionicons
                  name="repeat"
                  size={22}
                  color={repeatActive ? theme.colors.accent : theme.colors.textSecondary}
                />
                {player.repeatMode === REPEAT_MODES.ONE ? (
                  <Animated.View
                    entering={FadeIn.duration(160)}
                    style={[styles.repeatBadge, { backgroundColor: theme.colors.accent }]}
                  >
                    <Text style={{ color: theme.colors.onAccent, fontSize: 8, fontWeight: '800' }}>
                      1
                    </Text>
                  </Animated.View>
                ) : null}
              </View>
            </PopOnChange>
          </PressableScale>
        </View>
      </ScrollView>

      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={track.title}
        subtitle={track.artist}
      >
        <SheetItem
          icon="add-circle-outline"
          label={t('addToPlaylist')}
          onPress={() => {
            setMenuOpen(false);
            setPlaylistPickerOpen(true);
          }}
        />
        <SheetItem
          icon="disc-outline"
          label={t('goToAlbum')}
          onPress={() => {
            setMenuOpen(false);
            navigation.navigate('AlbumDetail', { albumId: track.albumId, name: track.album });
          }}
        />
        <SheetItem
          icon="person-outline"
          label={t('goToArtist')}
          onPress={() => {
            setMenuOpen(false);
            navigation.navigate('ArtistDetail', { name: track.artist });
          }}
        />
        <SheetItem
          icon="information-circle-outline"
          label={t('trackDetails')}
          onPress={() => {
            setMenuOpen(false);
            setTimeout(() => setDetailsOpen(true), 220);
          }}
        />
        <SheetItem
          icon="speedometer-outline"
          label={`${t('playbackSpeed')} (${settings.playbackSpeed}×)`}
          onPress={() => {
            setMenuOpen(false);
            setTimeout(() => setSpeedOpen(true), 220);
          }}
        />
        <SheetItem
          icon="eye-off-outline"
          label={t('hideTrack')}
          destructive
          onPress={() => {
            setMenuOpen(false);
            library.hideTrack(track);
            navigation.goBack();
          }}
        />
      </Sheet>

      <Sheet visible={speedOpen} onClose={() => setSpeedOpen(false)} title={t('playbackSpeed')}>
        {SPEEDS.map((speed) => (
          <SheetItem
            key={speed}
            label={`${speed}×`}
            selected={settings.playbackSpeed === speed}
            onPress={() => {
              update('playbackSpeed', speed);
              setSpeedOpen(false);
            }}
          />
        ))}
      </Sheet>

      <TrackDetailsSheet track={track} visible={detailsOpen} onClose={() => setDetailsOpen(false)} />

      <PlaylistPickerSheet
        visible={playlistPickerOpen}
        tracks={[track]}
        onClose={() => setPlaylistPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chevron: { padding: 6 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  miniTrack: { width: 96, height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  miniFill: { height: 4, borderRadius: 2 },
  artWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  metaCenter: { alignItems: 'center', paddingHorizontal: 16, marginBottom: 24 },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  iconButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  seekCenterContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  timePillContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slider: { width: '100%', height: 32 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    width: 13,
    height: 13,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
