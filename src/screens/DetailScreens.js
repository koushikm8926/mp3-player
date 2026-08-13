import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { PromptDialog } from '../components/PromptDialog';
import { useLibrary } from '../context/LibraryContext';
import { useSettings } from '../context/SettingsContext';
import { SORT_KEYS } from '../services/musicLibrary';
import { CollectionScreen } from './CollectionScreen';

export function AlbumDetailScreen({ route, navigation }) {
  const { albumId, name } = route.params;
  const { t } = useSettings();
  const { albums } = useLibrary();

  const album = useMemo(
    () => albums.find((item) => item.id === albumId) ?? albums.find((item) => item.name === name),
    [albums, albumId, name]
  );

  return (
    <CollectionScreen
      navigation={navigation}
      title={album?.name ?? name}
      subtitle={album?.artist}
      subtitleIsArtist
      artworkUri={album?.artworkUri}
      artworkName={album?.name ?? name}
      tracks={album?.tracks ?? []}
      defaultSortKey={SORT_KEYS.TRACK_NUMBER}
      emptyTitle={t('emptyLibraryTitle')}
      emptyBody={t('emptyLibraryBody')}
    />
  );
}

export function ArtistDetailScreen({ route, navigation }) {
  const { name } = route.params;
  const { t } = useSettings();
  const { artists } = useLibrary();

  const artist = useMemo(() => artists.find((item) => item.name === name), [artists, name]);

  return (
    <CollectionScreen
      navigation={navigation}
      title={artist?.name ?? name}
      subtitle={artist ? t('albumCount', { count: artist.albumCount }) : undefined}
      artworkUri={artist?.artworkUri}
      artworkName={artist?.name ?? name}
      circularArtwork
      tracks={artist?.tracks ?? []}
      defaultSortKey={SORT_KEYS.ALBUM}
      emptyTitle={t('emptyLibraryTitle')}
      emptyBody={t('emptyLibraryBody')}
    />
  );
}

export function GenreDetailScreen({ route, navigation }) {
  const { genreId, name } = route.params;
  const { t } = useSettings();
  const { genres } = useLibrary();

  const genre = useMemo(() => genres.find((item) => item.id === genreId), [genres, genreId]);

  return (
    <CollectionScreen
      navigation={navigation}
      title={genre?.name ?? name}
      artworkName={genre?.name ?? name}
      tracks={genre?.tracks ?? []}
      defaultSortKey={SORT_KEYS.TITLE}
      emptyTitle={t('emptyLibraryTitle')}
      emptyBody={t('emptyLibraryBody')}
    />
  );
}

export function FolderDetailScreen({ route, navigation }) {
  const { path, name } = route.params;
  const { t } = useSettings();
  const { folders, hideFolder } = useLibrary();

  const folder = useMemo(() => folders.find((item) => item.path === path), [folders, path]);

  return (
    <CollectionScreen
      navigation={navigation}
      title={folder?.name ?? name}
      subtitle={path}
      artworkName={folder?.name ?? name}
      tracks={folder?.tracks ?? []}
      defaultSortKey={SORT_KEYS.TITLE}
      emptyTitle={t('emptyLibraryTitle')}
      emptyBody={t('emptyLibraryBody')}
      extraMenuItems={[
        {
          icon: 'eye-off-outline',
          label: t('hideFolder'),
          destructive: true,
          onPress: () =>
            Alert.alert(t('hideFolder'), path, [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('hideFolder'),
                style: 'destructive',
                onPress: async () => {
                  await hideFolder({ path, name: folder?.name ?? name });
                  navigation.goBack();
                },
              },
            ]),
        },
      ]}
    />
  );
}

export function FavoritesScreen({ navigation }) {
  const { t } = useSettings();
  const { favoriteTracks } = useLibrary();

  return (
    <CollectionScreen
      navigation={navigation}
      title={t('favorites')}
      heroIcon="heart"
      tracks={favoriteTracks}
      defaultSortKey={SORT_KEYS.TITLE}
      emptyTitle={t('emptyFavoritesTitle')}
      emptyBody={t('emptyFavoritesBody')}
    />
  );
}

export function RecentlyPlayedScreen({ navigation }) {
  const { t } = useSettings();
  const { recentTracks } = useLibrary();

  return (
    <CollectionScreen
      navigation={navigation}
      title={t('recentlyPlayed')}
      heroIcon="time"
      description={t('recentlyPlayedBody')}
      tracks={recentTracks}
      sortable={false}
      emptyTitle={t('emptyRecentTitle')}
      emptyBody={t('emptyRecentBody')}
    />
  );
}

export function PlaylistDetailScreen({ route, navigation }) {
  const { playlistId, name } = route.params;
  const { t } = useSettings();
  const library = useLibrary();
  const [tracks, setTracks] = useState([]);
  const [renameOpen, setRenameOpen] = useState(false);

  const playlist = useMemo(
    () => library.playlists.find((item) => item.id === playlistId),
    [library.playlists, playlistId]
  );

  // Playlist membership lives in SQLite, so it has to be resolved against the scanned
  // library every time either side changes.
  useEffect(() => {
    let cancelled = false;
    library.getPlaylistTracks(playlistId).then((resolved) => {
      if (!cancelled) setTracks(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [playlistId, library.playlists, library.getPlaylistTracks]);

  const confirmDelete = () => {
    Alert.alert(t('deletePlaylist'), t('deletePlaylistConfirm', { name: playlist?.name ?? name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await library.deletePlaylist(playlistId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <>
    <CollectionScreen
      navigation={navigation}
      title={playlist?.name ?? name}
      subtitle={t('createdByYou')}
      description={playlist?.description || undefined}
      artworkUri={tracks[0]?.artworkUri}
      artworkName={playlist?.name ?? name}
      tracks={tracks}
      sortable={false}
      emptyTitle={t('emptyPlaylistTitle')}
      emptyBody={t('emptyPlaylistBody')}
      optionsContextFor={(track) => ({
        onRemoveFromPlaylist: async () => {
          await library.removeTrackFromPlaylist(playlistId, track.id);
          setTracks((previous) => previous.filter((item) => item.id !== track.id));
        },
      })}
      extraMenuItems={[
        { icon: 'create-outline', label: t('rename'), onPress: () => setRenameOpen(true) },
        {
          icon: 'trash-outline',
          label: t('deletePlaylist'),
          destructive: true,
          onPress: confirmDelete,
        },
      ]}
    />

    <PromptDialog
      visible={renameOpen}
      title={t('renamePlaylist')}
      label={t('playlistName')}
      initialValue={playlist?.name ?? name}
      onClose={() => setRenameOpen(false)}
      onConfirm={(value) => library.renamePlaylist(playlistId, value.trim())}
      validate={(value) => (value.trim() ? null : t('playlistName'))}
    />
    </>
  );
}
