import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlbumCard, ArtistCircle, CategoryTile, TileGrid } from '../../components/cards';
import { EmptyState, ScreenHeader, SearchBar, SectionHeader } from '../../components/common';
import { TrackOptionsSheet } from '../../components/TrackOptionsSheet';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings, useTheme } from '../../context/SettingsContext';
import { genreStyle } from '../../utils/genreStyle';

/**
 * The Library tab root: a grid of the six ways to browse, then rails for what is new and
 * what is worth opening. Every tile pushes a dedicated screen rather than switching tabs,
 * which keeps the back button meaningful.
 */
export function LibraryScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const library = useLibrary();
  const [sheetTrack, setSheetTrack] = useState(null);

  const { tracks, albums, artists, genres, folders, playlists, recentlyAddedTracks } = library;

  if (tracks.length === 0 && !library.scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title={t('musicLibrary')} glyph="musical-notes" />
        <EmptyState
          icon="musical-notes-outline"
          title={t('emptyLibraryTitle')}
          body={t('emptyLibraryBody')}
          action={t('refreshLibrary')}
          onAction={() => library.refresh({ rescanMediaStore: true })}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={t('musicLibrary')}
          glyph="musical-notes"
          actions={[
            { icon: 'search', onPress: () => navigation.navigate('Search') },
            { icon: 'ellipsis-vertical', onPress: () => navigation.navigate('Settings') },
          ]}
        />

        <SearchBar
          placeholder={t('searchPlaceholder')}
          onPress={() => navigation.navigate('Search')}
          onPressTrailing={() => navigation.navigate('Search')}
          style={{ marginBottom: 20 }}
        />

        <TileGrid columns={3} gap={12}>
          <CategoryTile
            label={t('songs')}
            icon="musical-notes"
            count={String(tracks.length)}
            onPress={() => navigation.navigate('Songs')}
          />
          <CategoryTile
            label={t('albums')}
            icon="disc"
            count={String(albums.length)}
            onPress={() => navigation.navigate('Albums')}
          />
          <CategoryTile
            label={t('artists')}
            icon="person"
            count={String(artists.length)}
            onPress={() => navigation.navigate('Artists')}
          />
          <CategoryTile
            label={t('genres')}
            icon="pricetag"
            count={String(genres.length)}
            onPress={() => navigation.navigate('Genres')}
          />
          <CategoryTile
            label={t('folders')}
            icon="folder"
            count={String(folders.length)}
            onPress={() => navigation.navigate('Folders')}
          />
          <CategoryTile
            label={t('playlists')}
            icon="list"
            count={String(playlists.length)}
            onPress={() => navigation.navigate('PlaylistsTab')}
          />
        </TileGrid>

        {recentlyAddedTracks.length > 0 ? (
          <>
            <SectionHeader
              title={t('recentlyAdded')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('Songs', { initialTab: 'recent' })}
            />
            <FlatList
              horizontal
              data={recentlyAddedTracks.slice(0, 12)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: 14 }}>
                  <AlbumCard
                    album={{ name: item.title, artist: item.artist, artworkUri: item.artworkUri }}
                    size={140}
                    playBadge
                    onPress={() => player.playQueue(recentlyAddedTracks.slice(0, 12), index)}
                    onPressMore={() => setSheetTrack(item)}
                  />
                </View>
              )}
            />
          </>
        ) : null}

        {genres.length > 0 ? (
          <>
            <SectionHeader
              title={t('browseByGenre')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('Genres')}
            />
            <FlatList
              horizontal
              data={genres.slice(0, 12)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => {
                const { icon, tint } = genreStyle(item.name);
                return (
                  <GenreTile
                    name={item.name}
                    icon={icon}
                    tint={tint}
                    count={t('songCount', { count: item.trackCount })}
                    onPress={() =>
                      navigation.navigate('GenreDetail', { genreId: item.id, name: item.name })
                    }
                  />
                );
              }}
            />
          </>
        ) : null}

        {artists.length > 0 ? (
          <>
            <SectionHeader
              title={t('topArtists')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('Artists')}
            />
            <FlatList
              horizontal
              data={artists.slice(0, 15)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <ArtistCircle
                  artist={item}
                  subtitle={t('songCount', { count: item.trackCount })}
                  onPress={() => navigation.navigate('ArtistDetail', { name: item.name })}
                />
              )}
            />
          </>
        ) : null}
      </ScrollView>

      <TrackOptionsSheet
        track={sheetTrack}
        visible={sheetTrack != null}
        onClose={() => setSheetTrack(null)}
        navigation={navigation}
      />
    </>
  );
}

/** Small tinted tile in the "Browse by Genre" rail. */
function GenreTile({ name, icon, tint, count, onPress }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.genreTile,
        {
          backgroundColor: `${tint}14`,
          borderRadius: theme.radius.lg,
          borderColor: `${tint}2E`,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={26} color={tint} />
      <Text numberOfLines={1} style={[theme.font.title, { color: theme.colors.text, marginTop: 10 }]}>
        {name}
      </Text>
      <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: 16, paddingTop: 2 },
  genreTile: {
    width: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
