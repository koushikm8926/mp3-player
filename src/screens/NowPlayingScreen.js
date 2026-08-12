import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '../components/Artwork';
import { PlaylistPickerSheet } from '../components/PlaylistPickerSheet';
import { Sheet, SheetItem } from '../components/Sheet';
import { TrackDetailsSheet } from '../components/TrackOptionsSheet';
import { useLibrary } from '../context/LibraryContext';
import { REPEAT_MODES, usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { colorFromString, formatCountdown, formatDuration } from '../utils/format';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Full-screen player with artwork, seek bar and every transport control. */
export function NowPlayingScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();

  const [scrubbing, setScrubbing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  const track = player.currentTrack;

  if (!track) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.chevron} hitSlop={10}>
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

  const { width } = Dimensions.get('window');
  const artSize = Math.min(width - 72, 340);
  const favorite = library.isFavorite(track.id);
  const position = scrubbing ?? player.positionMs;
  const duration = player.durationMs || track.duration || 1;
  const tint = colorFromString(track.album || track.title, 45, theme.colors.isDark ? 24 : 80);

  const repeatIcon =
    player.repeatMode === REPEAT_MODES.ONE ? 'repeat-outline' : 'repeat-outline';
  const repeatActive = player.repeatMode !== REPEAT_MODES.OFF;

  const tap = () => Haptics.selectionAsync().catch(() => {});

  return (
    <LinearGradient colors={[tint, theme.colors.background]} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-down" size={26} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[theme.font.tiny, { color: theme.colors.textSecondary, letterSpacing: 1 }]}>
              {t('nowPlaying').toUpperCase()}
            </Text>
            {player.sleepTimer ? (
              <Text style={[theme.font.tiny, { color: theme.colors.accent, marginTop: 2 }]}>
                {player.sleepTimer.endOfTrack
                  ? t('endOfTrack')
                  : t('sleepTimerActive', {
                      time: formatCountdown(player.sleepTimer.endsAt - Date.now()),
                    })}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
            <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.artWrap}>
          <Artwork
            uri={track.artworkUri}
            name={track.album || track.title}
            size={artSize}
            radius={theme.radius.lg}
            style={styles.art}
          />
        </View>

        <View style={styles.metaRow}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[theme.font.h2, { color: theme.colors.text }]}>
              {track.title}
            </Text>
            <Pressable onPress={() => navigation.navigate('ArtistDetail', { name: track.artist })}>
              <Text
                numberOfLines={1}
                style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 5 }]}
              >
                {track.artist}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              tap();
              library.toggleFavorite(track);
            }}
            hitSlop={10}
            style={{ marginLeft: 16 }}
          >
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={27}
              color={favorite ? theme.colors.accent : theme.colors.textSecondary}
            />
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
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
          />
          <View style={styles.times}>
            <Text style={[theme.font.tiny, { color: theme.colors.textSecondary }]}>
              {formatDuration(position)}
            </Text>
            <Text style={[theme.font.tiny, { color: theme.colors.textSecondary }]}>
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
            hitSlop={10}
          >
            <Ionicons
              name="shuffle"
              size={24}
              color={player.shuffle ? theme.colors.accent : theme.colors.textSecondary}
            />
          </Pressable>

          <Pressable onPress={player.skipPrevious} hitSlop={10}>
            <Ionicons name="play-skip-back" size={32} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              tap();
              player.togglePlay();
            }}
            style={[styles.playButton, { backgroundColor: theme.colors.accent }]}
          >
            <Ionicons
              name={player.isPlaying ? 'pause' : 'play'}
              size={32}
              color={theme.colors.onAccent}
              style={{ marginLeft: player.isPlaying ? 0 : 3 }}
            />
          </Pressable>

          <Pressable onPress={player.skipNext} hitSlop={10}>
            <Ionicons name="play-skip-forward" size={32} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              tap();
              player.cycleRepeat();
            }}
            hitSlop={10}
          >
            <View>
              <Ionicons
                name={repeatIcon}
                size={24}
                color={repeatActive ? theme.colors.accent : theme.colors.textSecondary}
              />
              {player.repeatMode === REPEAT_MODES.ONE ? (
                <View style={[styles.repeatBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={{ color: theme.colors.onAccent, fontSize: 8, fontWeight: '800' }}>1</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <BottomAction
            icon="options-outline"
            label={t('equalizer')}
            onPress={() => navigation.navigate('Equalizer')}
          />
          <BottomAction
            icon="moon-outline"
            label={t('sleepTimer')}
            active={player.sleepTimer != null}
            onPress={() => navigation.navigate('SleepTimer')}
          />
          <BottomAction
            icon="speedometer-outline"
            label={`${settings.playbackSpeed}×`}
            onPress={() => setSpeedOpen(true)}
          />
          <BottomAction
            icon="list-outline"
            label={t('queue')}
            onPress={() => navigation.navigate('Queue')}
          />
        </View>
      </View>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={track.title} subtitle={track.artist}>
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
    </LinearGradient>
  );
}

function BottomAction({ icon, label, onPress, active }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.bottomAction} hitSlop={6}>
      <Ionicons name={icon} size={21} color={active ? theme.colors.accent : theme.colors.textSecondary} />
      <Text
        numberOfLines={1}
        style={[
          theme.font.tiny,
          { color: active ? theme.colors.accent : theme.colors.textTertiary, marginTop: 4 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chevron: { padding: 6 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  artWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  art: { elevation: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  seekSection: { marginBottom: 8 },
  slider: { width: '100%', height: 32, marginHorizontal: -2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 22,
  },
  playButton: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
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
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  bottomAction: { alignItems: 'center', flex: 1 },
});
