import { Ionicons } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../components/Artwork';
import { PlaylistPickerSheet } from '../components/PlaylistPickerSheet';
import { Sheet, SheetItem } from '../components/Sheet';
import { TrackDetailsSheet } from '../components/TrackOptionsSheet';
import { useLibrary } from '../context/LibraryContext';
import { REPEAT_MODES, usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { formatCountdown, formatDuration } from '../utils/format';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Full-screen player with artwork, seek bar and every transport control. */
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

        <View style={styles.artWrap}>
          <Artwork
            uri={track.artworkUri}
            name={track.album || track.title}
            size={artSize}
            radius={theme.radius.xl}
            style={theme.shadow.floating}
          />
        </View>

        <View style={styles.metaRow}>
          <Pressable
            onPress={() => {
              tap();
              library.toggleFavorite(track);
            }}
            hitSlop={12}
            style={styles.metaSide}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={28}
              color={favorite ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Pressable>

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

          <Pressable
            onPress={() => setPlaylistPickerOpen(true)}
            hitSlop={12}
            style={styles.metaSide}
          >
            <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
          </Pressable>
        </View>

        <View style={styles.seekSection}>
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
            maximumTrackTintColor={theme.colors.surfaceAlt}
            thumbTintColor={theme.colors.accent}
          />
          <View style={styles.times}>
            <Text style={[theme.font.caption, { color: theme.colors.textSecondary }]}>
              {formatDuration(position)}
            </Text>
            <Text style={[theme.font.caption, { color: theme.colors.textSecondary }]}>
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              tap();
              player.toggleShuffle();
            }}
            hitSlop={12}
          >
            <Ionicons
              name="shuffle"
              size={24}
              color={player.shuffle ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable onPress={player.skipPrevious} hitSlop={12}>
            <Ionicons name="play-skip-back" size={34} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              tap();
              player.togglePlay();
            }}
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: theme.colors.accent, opacity: pressed ? 0.88 : 1 },
              theme.shadow.floating,
            ]}
          >
            <Ionicons
              name={player.isPlaying ? 'pause' : 'play'}
              size={34}
              color={theme.colors.onAccent}
              style={{ marginLeft: player.isPlaying ? 0 : 3 }}
            />
          </Pressable>

          <Pressable onPress={player.skipNext} hitSlop={12}>
            <Ionicons name="play-skip-forward" size={34} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              tap();
              player.cycleRepeat();
            }}
            hitSlop={12}
          >
            <View>
              <Ionicons
                name="repeat"
                size={24}
                color={repeatActive ? theme.colors.accent : theme.colors.textSecondary}
              />
              {player.repeatMode === REPEAT_MODES.ONE ? (
                <View style={[styles.repeatBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={{ color: theme.colors.onAccent, fontSize: 8, fontWeight: '800' }}>
                    1
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <ActionTile
            icon="list"
            label={t('queue')}
            onPress={() => navigation.navigate('Queue')}
          />
          <ActionTile
            icon="information-circle-outline"
            label={t('trackDetails')}
            onPress={() => setDetailsOpen(true)}
          />
          <ActionTile
            icon="options"
            label={t('equalizer')}
            active={settings.equalizerEnabled}
            onPress={() => navigation.navigate('Equalizer')}
          />
          <ActionTile
            icon="moon"
            label={t('sleepTimer')}
            active={player.sleepTimer != null}
            onPress={() => navigation.navigate('SleepTimer')}
          />
          <ActionTile
            icon="speedometer"
            label={`${settings.playbackSpeed}×`}
            active={settings.playbackSpeed !== 1}
            onPress={() => setSpeedOpen(true)}
          />
        </View>

        <View
          style={[
            styles.volumeRow,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Ionicons name="volume-low" size={20} color={theme.colors.accent} />
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={player.volume}
            onValueChange={player.setVolume}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.surfaceAlt}
            thumbTintColor={theme.colors.accent}
          />
          <Ionicons name="volume-high" size={20} color={theme.colors.accent} />
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

/** One of the five squares beneath the transport controls. */
function ActionTile({ icon, label, onPress, active }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        {
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: active ? 'transparent' : theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={21} color={theme.colors.accent} />
      <Text
        numberOfLines={1}
        style={[theme.font.tiny, { color: theme.colors.text, marginTop: 6, textAlign: 'center' }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chevron: { padding: 6 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  miniTrack: { width: 96, height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  miniFill: { height: 4, borderRadius: 2 },
  artWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 26, marginBottom: 26 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaSide: { width: 40, alignItems: 'center' },
  metaCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  seekSection: { marginTop: 20 },
  slider: { width: '100%', height: 32, marginHorizontal: -2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 26,
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
  actionRow: { flexDirection: 'row', gap: 8 },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  volumeSlider: { flex: 1, height: 36, marginHorizontal: 10 },
});
