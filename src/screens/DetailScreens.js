import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { PromptDialog } from '../components/PromptDialog';
import { useLibrary } from '../context/LibraryContext';
import { useSettings } from '../context/SettingsContext';
import { SORT_KEYS } from '../services/musicLibrary';
import { CollectionScreen } from './CollectionScreen';

export function AlbumDetailScreen({ route, navigation }) {
  const { albumId, name, album: passedAlbum } = route.params || {};
  const { t } = useSettings();
  const { albums, tracks: allTracks } = useLibrary();

  const album = useMemo(() => {
    if (passedAlbum && Array.isArray(passedAlbum.tracks) && passedAlbum.tracks.length > 0) {
      return passedAlbum;
    }
    const found =
      (albumId && albums.find((item) => item.id === albumId)) ??
      (name && albums.find((item) => item.name && item.name.toLowerCase() === name.toLowerCase()));

    if (found && found.tracks && found.tracks.length > 0) return found;

    // Fallback: dynamically filter all tracks matching this album name
    const albumName = name || albumId || 'Album';
    const albumTracks = allTracks.filter(
      (t) => (t.album || '').toLowerCase() === albumName.toLowerCase()
    );
    return {
      id: albumId || albumName,
      name: albumName,
      artist: albumTracks[0]?.artist || 'Various Artists',
      artworkUri: albumTracks[0]?.artworkUri || null,
      tracks: albumTracks,
    };
  }, [albums, albumId, name, passedAlbum, allTracks]);

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
  const { name, artist: passedArtist } = route.params || {};
  const { t } = useSettings();
  const { artists, tracks: allTracks } = useLibrary();

  const artist = useMemo(() => {
    if (passedArtist && Array.isArray(passedArtist.tracks) && passedArtist.tracks.length > 0) {
      return passedArtist;
    }
    const found = artists.find(
      (item) => item.name && name && item.name.toLowerCase() === name.toLowerCase()
    );
    if (found && found.tracks && found.tracks.length > 0) return found;

    const artistName = name || 'Artist';
    const artistTracks = allTracks.filter(
      (t) => (t.artist || '').toLowerCase() === artistName.toLowerCase()
    );
    return {
      id: artistName,
      name: artistName,
      albumCount: new Set(artistTracks.map((t) => t.album)).size,
      artworkUri: artistTracks[0]?.artworkUri || null,
      tracks: artistTracks,
    };
  }, [artists, name, passedArtist, allTracks]);

  return (
    <CollectionScreen
      navigation={navigation}
      title={artist?.name ?? name}
      subtitle={artist ? t('albumCount', { count: artist.albumCount ?? 1 }) : undefined}
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
  const { genreId, name, genre: passedGenre } = route.params || {};
  const { t } = useSettings();
  const { genres, tracks: allTracks } = useLibrary();

  const genre = useMemo(() => {
    if (passedGenre && Array.isArray(passedGenre.tracks) && passedGenre.tracks.length > 0) {
      return passedGenre;
    }
    const found = genres.find(
      (item) =>
        (genreId && item.id === genreId) ||
        (name && item.name && item.name.toLowerCase() === name.toLowerCase())
    );
    if (found && found.tracks && found.tracks.length > 0) return found;

    // Fallback: dynamically filter all tracks matching this category or genre name
    const categoryName = name || genre?.name || genreId || 'Category';
    const categoryTracks = allTracks.filter(
      (t) => (t.category || t.genre || '').toLowerCase() === categoryName.toLowerCase()
    );
    return {
      id: genreId || categoryName,
      name: categoryName,
      tracks: categoryTracks,
    };
  }, [genres, genreId, name, passedGenre, allTracks]);

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
