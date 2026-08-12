import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlbumCard, ArtistRow, CollectionRow } from '../components/cards';
import { Chip, EmptyState, SectionHeader } from '../components/common';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { TrackRow } from '../components/TrackRow';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { searchRepo } from '../db/repositories';
import { searchLibrary } from '../services/musicLibrary';

const FILTERS = ['all', 'songs', 'albums', 'artists', 'genres', 'folders'];

/** Search across every part of the library, with recent terms as suggestions. */
export function SearchScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();

  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [recent, setRecent] = useState([]);
  const [sheetTrack, setSheetTrack] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    searchRepo.recent().then(setRecent).catch(() => {});
  }, []);

  // Debounce so a 5000-track filter does not run on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(term), 220);
    return () => clearTimeout(handle);
  }, [term]);

  const results = useMemo(
    () => searchLibrary(library, debouncedTerm),
    [library, debouncedTerm]
  );

  const hasResults =
    results.tracks.length +
      results.albums.length +
      results.artists.length +
      results.genres.length +
      results.folders.length >
    0;

  const commitTerm = () => {
    if (term.trim().length >= 2) {
      searchRepo.record(term).then(() => searchRepo.recent().then(setRecent)).catch(() => {});
    }
  };

  const show = (section) => filter === 'all' || filter === section;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            ref={inputRef}
            value={term}
            onChangeText={setTerm}
            onSubmitEditing={commitTerm}
            placeholder={t('search')}
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.input, theme.font.body, { color: theme.colors.text }]}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {term.length > 0 ? (
            <Pressable onPress={() => setTerm('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginLeft: 12 }}>
          <Text style={[theme.font.body, { color: theme.colors.accent }]}>{t('cancel')}</Text>
        </Pressable>
      </View>

      {debouncedTerm.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((key) => (
            <Chip
              key={key}
              label={key === 'all' ? t('all') : t(key)}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 140 }}>
        {debouncedTerm.length === 0 ? (
          recent.length > 0 ? (
            <>
              <SectionHeader
                title={t('search')}
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
                  icon="time-outline"
                  trailingIcon="arrow-up-outline"
                  onPress={() => setTerm(item)}
                />
              ))}
            </>
          ) : (
            <EmptyState
              icon="search-outline"
              title={t('search')}
              body={t('emptySearchBody')}
            />
          )
        ) : !hasResults ? (
          <EmptyState icon="search-outline" title={t('emptySearchTitle')} body={t('emptySearchBody')} />
        ) : (
          <>
            {show('songs') && results.tracks.length > 0 ? (
              <>
                <SectionHeader title={t('songs')} />
                {results.tracks.slice(0, filter === 'songs' ? 200 : 8).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {results.albums.map((album) => (
                    <View key={album.id} style={{ marginRight: 14 }}>
                      <AlbumCard
                        album={album}
                        size={128}
                        subtitle={t('songCount', { count: album.trackCount })}
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
                {results.artists.map((artist) => (
                  <ArtistRow
                    key={artist.id}
                    artist={artist}
                    subtitle={t('songCount', { count: artist.trackCount })}
                    onPress={() => {
                      commitTerm();
                      navigation.navigate('ArtistDetail', { name: artist.name });
                    }}
                  />
                ))}
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
                    icon="pricetag-outline"
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
                    icon="folder-outline"
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 11, marginLeft: 8 },
  filters: { paddingHorizontal: 16, paddingBottom: 4 },
  rail: { paddingHorizontal: 16 },
});
