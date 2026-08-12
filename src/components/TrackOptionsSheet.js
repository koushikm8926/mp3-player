import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import {
  formatBitrate,
  formatDate,
  formatDuration,
  formatFileSize,
} from '../utils/format';
import { Artwork } from './Artwork';
import { PlaylistPickerSheet } from './PlaylistPickerSheet';
import { Sheet, SheetItem } from './Sheet';

/**
 * The long-press / overflow menu for a track. Shared by every list in the app so the
 * available actions never drift between screens.
 *
 * `context` lets a screen add situational actions, e.g. "Remove from playlist".
 */
export function TrackOptionsSheet({ track, visible, onClose, navigation, context = {} }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const library = useLibrary();
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!track) return null;

  const favorite = library.isFavorite(track.id);

  const close = (then) => {
    onClose();
    if (then) setTimeout(then, 220); // let the sheet finish dismissing first
  };

  const confirmHide = () => {
    close(() => {
      Alert.alert(t('hideTrack'), track.title, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('hideTrack'),
          style: 'destructive',
          onPress: () => library.hideTrack(track),
        },
      ]);
    });
  };

  return (
    <>
      <Sheet visible={visible && !playlistPickerOpen && !detailsOpen} onClose={onClose}>
        <View style={styles.header}>
          <Artwork uri={track.artworkUri} name={track.album || track.title} size={52} />
          <View style={styles.headerMeta}>
            <Text numberOfLines={1} style={[theme.font.title, { color: theme.colors.text }]}>
              {track.title}
            </Text>
            <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
              {track.artist}
            </Text>
          </View>
        </View>

        <SheetItem
          icon="play-forward-outline"
          label={t('playNext')}
          onPress={() => close(() => player.playNext(track))}
        />
        <SheetItem
          icon="list-outline"
          label={t('addToQueue')}
          onPress={() => close(() => player.addToQueue(track))}
        />
        <SheetItem
          icon={favorite ? 'heart' : 'heart-outline'}
          label={favorite ? t('removeFromFavorites') : t('addToFavorites')}
          onPress={() => close(() => library.toggleFavorite(track))}
        />
        <SheetItem
          icon="add-circle-outline"
          label={t('addToPlaylist')}
          onPress={() => setPlaylistPickerOpen(true)}
        />

        {context.onRemoveFromPlaylist ? (
          <SheetItem
            icon="remove-circle-outline"
            label={t('removeFromPlaylist')}
            onPress={() => close(context.onRemoveFromPlaylist)}
          />
        ) : null}
        {context.onRemoveFromQueue ? (
          <SheetItem
            icon="close-circle-outline"
            label={t('remove')}
            onPress={() => close(context.onRemoveFromQueue)}
          />
        ) : null}

        {navigation && !context.hideNavigation ? (
          <>
            <SheetItem
              icon="disc-outline"
              label={t('goToAlbum')}
              onPress={() =>
                close(() =>
                  navigation.navigate('AlbumDetail', { albumId: track.albumId, name: track.album })
                )
              }
            />
            <SheetItem
              icon="person-outline"
              label={t('goToArtist')}
              onPress={() => close(() => navigation.navigate('ArtistDetail', { name: track.artist }))}
            />
          </>
        ) : null}

        <SheetItem
          icon="information-circle-outline"
          label={t('trackDetails')}
          onPress={() => setDetailsOpen(true)}
        />
        <SheetItem icon="eye-off-outline" label={t('hideTrack')} onPress={confirmHide} destructive />
      </Sheet>

      <PlaylistPickerSheet
        visible={playlistPickerOpen}
        tracks={[track]}
        onClose={() => {
          setPlaylistPickerOpen(false);
          onClose();
        }}
      />

      <TrackDetailsSheet
        track={track}
        visible={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          onClose();
        }}
      />
    </>
  );
}

export function TrackDetailsSheet({ track, visible, onClose }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { statsMap } = useLibrary();
  if (!track) return null;

  const stats = statsMap.get(track.id);
  const rows = [
    [t('sortTitle'), track.title],
    [t('sortArtist'), track.artist],
    [t('sortAlbum'), track.album],
    [t('genres'), track.genre],
    [t('year'), track.year || '—'],
    [t('composer'), track.composer || '—'],
    [t('duration'), formatDuration(track.duration)],
    [t('format'), track.mimeType?.replace('audio/', '').toUpperCase() || '—'],
    [t('bitrate'), formatBitrate(track.bitrate)],
    [t('fileSize'), formatFileSize(track.size)],
    [t('fileName'), track.fileName],
    [t('filePath'), track.folderPath],
    [t('sortDateAdded'), formatDate(track.dateAdded)],
    [t('timesPlayed'), String(stats?.play_count ?? 0)],
    [t('lastPlayed'), stats?.last_played ? formatDate(stats.last_played) : t('never')],
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={t('trackDetails')}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={[theme.font.caption, { color: theme.colors.textSecondary, width: 108 }]}>
              {label}
            </Text>
            <Text style={[theme.font.body, { color: theme.colors.text, flex: 1 }]} selectable>
              {String(value ?? '—')}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  headerMeta: { flex: 1, marginLeft: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
});
