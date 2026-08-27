import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlbumCard, ArtistCircle, ArtistRow, CollectionRow } from '../components/cards';
import { ChipRow, EmptyState, ScreenHeader, SearchBar, SectionHeader } from '../components/common';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { searchRepo } from '../db/repositories';
import { searchLibrary } from '../services/musicLibrary';
import { genreStyle } from '../utils/genreStyle';

/** Search across every part of the library, with recent terms as suggestions. */
export function SearchScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const library = useLibrary();

  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [recent, setRecent] = useState([]);
  const [sheetTrack, setSheetTrack] = useState(null);

  useEffect(() => {
    searchRepo.recent().then(setRecent).catch(() => {});
  }, []);

  // Debounce so a 5000-track filter does not run on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(term), 220);
    return () => clearTimeout(handle);
  }, [term]);

  const results = useMemo(() => searchLibrary(library, debouncedTerm), [library, debouncedTerm]);

  const hasResults =
    results.tracks.length +
      results.albums.length +
      results.artists.length +
      results.genres.length +
      results.folders.length >
    0;

  /** A handful of the strongest hits across every type, in the order the design shows them. */
  const topResults = useMemo(() => {
    const picks = [];
    if (results.tracks[0]) picks.push({ kind: 'track', item: results.tracks[0] });
    if (results.artists[0]) picks.push({ kind: 'artist', item: results.artists[0] });
    if (results.albums[0]) picks.push({ kind: 'album', item: results.albums[0] });
    if (results.tracks[1]) picks.push({ kind: 'track', item: results.tracks[1] });
    return picks;
  }, [results]);

  const commitTerm = () => {
    if (term.trim().length >= 2) {
      searchRepo.record(term).then(() => searchRepo.recent().then(setRecent)).catch(() => {});
    }
  };

  const cancel = () => {
    setTerm('');
    setFilter('all');
    Keyboard.dismiss();
  };

  const show = (section) => filter === 'all' || filter === section;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title={t('search')}
        subtitle={t('findYourMusic')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchRow}>
        <SearchBar
          placeholder={t('searchPlaceholder')}
          value={term}
          onChangeText={setTerm}
          onClear={() => setTerm('')}
          style={{ flex: 1, marginHorizontal: 0 }}
        />
        {term.length > 0 ? (
          <Pressable onPress={cancel} hitSlop={10} style={{ marginLeft: 14 }}>
            <Text style={[theme.font.title, { color: theme.colors.accent }]}>{t('cancel')}</Text>
          </Pressable>
        ) : null}
      </View>

      <ChipRow
        style={{ marginTop: 16 }}
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: t('all'), icon: 'search' },
          { key: 'songs', label: t('songs'), icon: 'musical-notes-outline' },
          { key: 'albums', label: t('albums'), icon: 'disc-outline' },
          { key: 'artists', label: t('artists'), icon: 'person-outline' },
          { key: 'genres', label: t('genres'), icon: 'pricetag-outline' },
          { key: 'folders', label: t('folders'), icon: 'folder-outline' },
        ]}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        {debouncedTerm.length === 0 ? (
          recent.length > 0 ? (
            <>
              <SectionHeader
                title={t('recent')}
                actionLabel={t('clear')}
                onPressAction={() => {
                  searchRepo.clear();
                  setRecent([]);
                }}
              />
              {recent.map((item) => (
                <CollectionRow
                  key={item}
                  title={item}
                  icon="time"
                  accentIcon
                  trailingIcon="arrow-up-outline"
                  onPress={() => setTerm(item)}
                />
              ))}
            </>
          ) : (
            <EmptyState icon="search-outline" title={t('search')} body={t('emptySearchBody')} />
          )
        ) : !hasResults ? (
          <EmptyState icon="search-outline" title={t('emptySearchTitle')} body={t('emptySearchBody')} />
        ) : (
          <>
            {filter === 'all' && topResults.length > 0 ? (
              <>
                <SectionHeader title={t('topResults')} />
                {topResults.map(({ kind, item }, index) =>
                  kind === 'track' ? (
                    <TrackRow
                      key={`top-${kind}-${item.id}`}
                      track={item}
                      subtitle={`${item.artist} · ${t('songs')}`}
                      isActive={player.currentTrack?.id === item.id}
                      isPlaying={player.isPlaying}
                      isFavorite={library.isFavorite(item.id)}
                      onPress={() => {
                        commitTerm();
                        player.playQueue(results.tracks, results.tracks.indexOf(item));
                      }}
                      onPressMore={() => setSheetTrack(item)}
                    />
                  ) : kind === 'artist' ? (
                    <ArtistRow
                      key={`top-${kind}-${item.id}`}
                      artist={item}
                      subtitle={`${t('artists')} · ${t('songCount', { count: item.trackCount })}`}
                      onPress={() => {
                        commitTerm();
                        navigation.navigate('ArtistDetail', { name: item.name });
                      }}
                    />
                  ) : (
                    <CollectionRow
                      key={`top-${kind}-${item.id}-${index}`}
                      title={item.name}
                      subtitle={`${t('albums')} · ${item.artist}`}
                      artworkUri={item.artworkUri}
                      artworkName={item.name}
                      onPress={() => {
                        commitTerm();
                        navigation.navigate('AlbumDetail', { albumId: item.id, name: item.name });
                      }}
                    />
                  )
                )}
              </>
            ) : null}

            {show('songs') && results.tracks.length > 0 ? (
              <>
                <SectionHeader title={t('songs')} />
                {results.tracks.slice(0, filter === 'songs' ? 200 : 8).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    showAlbum
                    isActive={player.currentTrack?.id === track.id}
                    isPlaying={player.isPlaying}
                    isFavorite={library.isFavorite(track.id)}
                    onPress={() => {
                      commitTerm();
                      player.playQueue(results.tracks, index);
                    }}
                    onLongPress={() => setSheetTrack(track)}
                    onPressMore={() => setSheetTrack(track)}
                  />
                ))}
              </>
            ) : null}

            {show('albums') && results.albums.length > 0 ? (
              <>
                <SectionHeader title={t('albums')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                >
                  {results.albums.map((album) => (
                    <View key={album.id} style={{ marginRight: 14 }}>
                      <AlbumCard
                        album={album}
                        size={140}
                        subtitle={album.artist}
                        caption={t('songCount', { count: album.trackCount })}
                        onPress={() => {
                          commitTerm();
                          navigation.navigate('AlbumDetail', { albumId: album.id, name: album.name });
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {show('artists') && results.artists.length > 0 ? (
              <>
                <SectionHeader title={t('artists')} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rail}
                >
                  {results.artists.map((artist) => (
                    <ArtistCircle
                      key={artist.id}
                      artist={artist}
                      subtitle={t('songCount', { count: artist.trackCount })}
                      onPress={() => {
                        commitTerm();
                        navigation.navigate('ArtistDetail', { name: artist.name });
                      }}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {show('genres') && results.genres.length > 0 ? (
              <>
                <SectionHeader title={t('genres')} />
                {results.genres.map((genre) => (
                  <CollectionRow
                    key={genre.id}
                    title={genre.name}
                    subtitle={t('songCount', { count: genre.trackCount })}
                    icon={genreStyle(genre.name).icon}
                    accentIcon
                    onPress={() =>
                      navigation.navigate('GenreDetail', { genreId: genre.id, name: genre.name })
                    }
                  />
                ))}
              </>
            ) : null}

            {show('folders') && results.folders.length > 0 ? (
              <>
                <SectionHeader title={t('folders')} />
                {results.folders.map((folder) => (
                  <CollectionRow
                    key={folder.id}
                    title={folder.name}
                    subtitle={t('songCount', { count: folder.trackCount })}
                    icon="folder"
                    onPress={() =>
                      navigation.navigate('FolderDetail', { path: folder.path, name: folder.name })
                    }
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <TrackOptionsSheet
        track={sheetTrack}
        visible={sheetTrack != null}
        onClose={() => setSheetTrack(null)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  rail: { paddingHorizontal: 16 },
});
