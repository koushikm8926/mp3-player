import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AlbumCard, ArtistRow, CollectionRow } from '../../components/cards';
import { EmptyState } from '../../components/common';
import { useLibrary } from '../../context/LibraryContext';
import { useSettings, useTheme } from '../../context/SettingsContext';
import { formatLongDuration } from '../../utils/format';

const GRID_GAP = 14;
const GRID_PADDING = 16;

/** Albums as a two-column artwork grid. */
export function AlbumsScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings } = useSettings();
  const { albums } = useLibrary();

  const columns = settings.gridColumns ?? 2;
  const [width, setWidth] = useState(0);
  const tileSize =
    width > 0
      ? Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns)
      : 0;

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {albums.length === 0 ? (
        <EmptyState icon="disc-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
      ) : tileSize > 0 ? (
        <FlashList
          data={albums}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          estimatedItemSize={tileSize + 52}
          contentContainerStyle={{ padding: GRID_PADDING, paddingBottom: 140 }}
          renderItem={({ item, index }) => (
            <View style={{ marginBottom: 20, marginRight: (index + 1) % columns === 0 ? 0 : GRID_GAP }}>
              <AlbumCard
                album={item}
                size={tileSize}
                subtitle={`${item.artist} · ${t('songCount', { count: item.trackCount })}`}
                onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, name: item.name })}
              />
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

export function ArtistsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { artists } = useLibrary();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {artists.length === 0 ? (
        <EmptyState icon="person-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
      ) : (
        <FlashList
          data={artists}
          keyExtractor={(item) => item.id}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <ArtistRow
              artist={item}
              subtitle={`${t('albumCount', { count: item.albumCount })} · ${t('songCount', {
                count: item.trackCount,
              })}`}
              onPress={() => navigation.navigate('ArtistDetail', { name: item.name })}
            />
          )}
        />
      )}
    </View>
  );
}

export function GenresScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { genres } = useLibrary();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {genres.length === 0 ? (
        <EmptyState icon="pricetag-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
      ) : (
        <FlashList
          data={genres}
          keyExtractor={(item) => item.id}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <CollectionRow
              title={item.name}
              subtitle={t('songCount', { count: item.trackCount })}
              icon="pricetag-outline"
              accentIcon
              onPress={() => navigation.navigate('GenreDetail', { genreId: item.id, name: item.name })}
            />
          )}
        />
      )}
    </View>
  );
}

/** Folder browser — the "where did I put that file" view. */
export function FoldersScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { folders, hideFolder } = useLibrary();

  const confirmHide = (folder) => {
    Alert.alert(t('hideFolder'), folder.path, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('hideFolder'), style: 'destructive', onPress: () => hideFolder(folder) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {folders.length === 0 ? (
        <EmptyState icon="folder-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
      ) : (
        <FlashList
          data={folders}
          keyExtractor={(item) => item.id}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <CollectionRow
              title={item.name}
              subtitle={`${t('songCount', { count: item.trackCount })} · ${formatLongDuration(
                item.tracks.reduce((sum, track) => sum + track.duration, 0)
              )}`}
              icon="folder-outline"
              onPress={() => navigation.navigate('FolderDetail', { path: item.path, name: item.name })}
              onLongPress={() => confirmHide(item)}
            />
          )}
        />
      )}
    </View>
  );
}

export const browseStyles = StyleSheet.create({});
