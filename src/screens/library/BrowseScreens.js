import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { Alert, useWindowDimensions, View } from 'react-native';

import { AlbumCard, ArtistRow, CollectionRow, GenreRow } from '../../components/cards';
import {
  EmptyState,
  ScreenHeader,
  SearchBar,
  SegmentedTabs,
} from '../../components/common';
import { useLibrary } from '../../context/LibraryContext';
import { useSettings, useTheme } from '../../context/SettingsContext';
import { formatDate, formatLongDuration, normalizeForSearch } from '../../utils/format';
import { genreStyle } from '../../utils/genreStyle';

const GRID_GAP = 14;
const GRID_PADDING = 16;

/** Case/diacritic-insensitive contains, matching the library's own search normalisation. */
function matches(text, query) {
  if (!query) return true;
  return normalizeForSearch(text ?? '').includes(normalizeForSearch(query));
}

/** Albums as an artwork grid, with a list alternative. */
export function AlbumsScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings } = useSettings();
  const library = useLibrary();
  const { albums } = library;
  const isOnlineMode = Boolean(library?.adminMode);
  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('grid');

  const filtered = useMemo(
    () => albums.filter((album) => matches(`${album.name} ${album.artist}`, query)),
    [albums, query]
  );

  const columns = settings.gridColumns ?? 3;
  const tileSize = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);

  const header = (
    <View style={{ backgroundColor: bgColor }}>
      <ScreenHeader
        title={t('albums')}
        glyph="disc"
        subtitle={t('albumCount', { count: albums.length })}
        onBack={() => navigation.goBack()}
        actions={[{ icon: 'search', onPress: () => navigation.navigate('Search') }]}
      />
      <SearchBar
        placeholder={t('searchAlbums')}
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        trailingIcon="funnel-outline"
        trailingLabel={t('filter')}
        onPressTrailing={() => setMode(mode === 'grid' ? 'list' : 'grid')}
      />
      <SegmentedTabs
        style={{ marginTop: 18 }}
        value={mode}
        onChange={setMode}
        options={[
          { key: 'grid', label: t('albums') },
          { key: 'list', label: t('listView') },
        ]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {mode === 'grid' ? (
        <FlashList
          data={filtered}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          estimatedItemSize={tileSize + 70}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 170 }}
          ListEmptyComponent={
            <EmptyState icon="disc-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
          }
          renderItem={({ item, index }) => (
            <View
              style={{
                marginTop: 20,
                marginRight: (index + 1) % columns === 0 ? 0 : GRID_GAP,
              }}
            >
              <AlbumCard
                album={item}
                size={tileSize}
                subtitle={item.artist}
                caption={t('songCount', { count: item.trackCount })}
                onPress={() =>
                  navigation.navigate('AlbumDetail', { albumId: item.id, name: item.name })
                }
              />
            </View>
          )}
        />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          estimatedItemSize={76}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 170 }}
          ListEmptyComponent={
            <EmptyState icon="disc-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
          }
          renderItem={({ item }) => (
            <CollectionRow
              title={item.name}
              subtitle={item.artist}
              caption={t('songCount', { count: item.trackCount })}
              artworkUri={item.artworkUri}
              artworkName={item.name}
              onPress={() =>
                navigation.navigate('AlbumDetail', { albumId: item.id, name: item.name })
              }
            />
          )}
        />
      )}
    </View>
  );
}

export function ArtistsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const library = useLibrary();
  const { artists } = library;
  const isOnlineMode = Boolean(library?.adminMode);
  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => artists.filter((artist) => matches(artist.name, query)),
    [artists, query]
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        estimatedItemSize={76}
        contentContainerStyle={{ paddingBottom: 170 }}
        ListHeaderComponent={
          <View style={{ backgroundColor: bgColor, paddingBottom: 12 }}>
            <ScreenHeader
              title={t('artists')}
              glyph="person"
              subtitle={String(artists.length)}
              onBack={() => navigation.goBack()}
              actions={[{ icon: 'search', onPress: () => navigation.navigate('Search') }]}
            />
            <SearchBar
              placeholder={t('searchPlaceholder')}
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              onPressTrailing={undefined}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="person-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
        }
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
    </View>
  );
}

export function GenresScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const library = useLibrary();
  const { genres } = library;
  const isOnlineMode = Boolean(library?.adminMode);
  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => genres.filter((genre) => matches(genre.name, query)),
    [genres, query]
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <FlashList
        data={filtered}
        keyExtractor={(item) => item.id}
        estimatedItemSize={82}
        contentContainerStyle={{ paddingBottom: 170 }}
        ListHeaderComponent={
          <View style={{ backgroundColor: bgColor, paddingBottom: 14 }}>
            <ScreenHeader
              title={t('genres')}
              glyph="pricetag"
              subtitle={`${genres.length} ${t('genres')}`}
              onBack={() => navigation.goBack()}
              actions={[
                { icon: 'search', onPress: () => navigation.navigate('Search') },
                { icon: 'ellipsis-vertical', onPress: () => navigation.navigate('Settings') },
              ]}
            />
            <SearchBar
              placeholder={t('searchGenres')}
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="pricetag-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
        }
        renderItem={({ item }) => {
          const { icon, tint } = genreStyle(item.name);
          return (
            <GenreRow
              title={item.name}
              subtitle={item.tracks?.[0]?.artist}
              count={t('songCount', { count: item.trackCount })}
              icon={icon}
              tint={tint}
              artworkUri={item.tracks?.find((track) => track.artworkUri)?.artworkUri}
              onPress={() =>
                navigation.navigate('GenreDetail', { genreId: item.id, name: item.name })
              }
            />
          );
        }}
      />
    </View>
  );
}

/** Folder browser — the "where did I put that file" view. */
export function FoldersScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const library = useLibrary();
  const { folders, hideFolder } = library;
  const isOnlineMode = Boolean(library?.adminMode);
  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('folders');

  const confirmHide = (folder) => {
    Alert.alert(t('hideFolder'), folder.path, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('hideFolder'), style: 'destructive', onPress: () => hideFolder(folder) },
    ]);
  };

  // "Recent" reorders by the newest file each folder contains. The native scanner already
  // returns dateAdded in milliseconds, so it feeds formatDate directly.
  const listed = useMemo(() => {
    const withRecency = folders
      .filter((folder) => matches(`${folder.name} ${folder.path}`, query))
      .map((folder) => ({
        folder,
        newest: folder.tracks.reduce((max, track) => Math.max(max, track.dateAdded ?? 0), 0),
      }));

    if (tab === 'recent') withRecency.sort((a, b) => b.newest - a.newest);
    return withRecency;
  }, [folders, query, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <FlashList
        data={listed}
        keyExtractor={(item) => item.folder.id}
        estimatedItemSize={76}
        contentContainerStyle={{ paddingBottom: 170 }}
        ListHeaderComponent={
          <View style={{ backgroundColor: bgColor }}>
            <ScreenHeader
              title={t('folders')}
              glyph="folder"
              subtitle={`${folders.length} ${t('folders')}`}
              onBack={() => navigation.goBack()}
              actions={[
                { icon: 'search', onPress: () => navigation.navigate('Search') },
                { icon: 'ellipsis-vertical', onPress: () => navigation.navigate('Settings') },
              ]}
            />
            <SearchBar
              placeholder={t('searchFolders')}
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              trailingIcon="funnel-outline"
              trailingLabel={t('filter')}
              onPressTrailing={() => setTab(tab === 'folders' ? 'recent' : 'folders')}
            />
            <SegmentedTabs
              style={{ marginTop: 18, marginBottom: 6 }}
              value={tab}
              onChange={setTab}
              options={[
                { key: 'folders', label: t('folders') },
                { key: 'recent', label: t('recent') },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="folder-outline" title={t('emptyLibraryTitle')} body={t('emptyLibraryBody')} />
        }
        renderItem={({ item }) => (
          <CollectionRow
            title={item.folder.name}
            subtitle={`${t('songCount', { count: item.folder.trackCount })} · ${formatLongDuration(
              item.folder.tracks.reduce((sum, track) => sum + track.duration, 0)
            )}`}
            caption={item.newest ? formatDate(item.newest) : undefined}
            icon="folder"
            onPress={() =>
              navigation.navigate('FolderDetail', { path: item.folder.path, name: item.folder.name })
            }
            onLongPress={() => confirmHide(item.folder)}
          />
        )}
      />
    </View>
  );
}
