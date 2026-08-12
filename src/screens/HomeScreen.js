import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlbumCard, ShortcutTile } from '../components/cards';
import { EmptyState, SectionHeader } from '../components/common';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { TrackRow } from '../components/TrackRow';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';

/**
 * The dashboard: a greeting, quick shortcuts, and the three collections a listener actually
 * comes back for — recently played, recently added and most played.
 */
export function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { user } = useAuth();
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const [sheetTrack, setSheetTrack] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    tracks,
    albums,
    artists,
    playlists,
    favoriteTracks,
    recentTracks,
    recentlyAddedTracks,
    mostPlayedTracks,
  } = library;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  }, [t]);

  const quickPicks = useMemo(() => {
    // A stable slice: favourites first, then anything else, capped at six tiles.
    const seen = new Set();
    const picks = [];
    for (const track of [...favoriteTracks, ...recentTracks, ...tracks]) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      picks.push(track);
      if (picks.length === 6) break;
    }
    return picks;
  }, [favoriteTracks, recentTracks, tracks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await library.refresh({ rescanMediaStore: true });
    setRefreshing(false);
  };

  if (tracks.length === 0 && !library.scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
        <EmptyState
          icon="musical-notes-outline"
          title={t('emptyLibraryTitle')}
          body={t('emptyLibraryBody')}
          action={t('refreshLibrary')}
          onAction={onRefresh}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.font.caption, { color: theme.colors.textSecondary }]}>{greeting}</Text>
            <Text style={[theme.font.h1, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
              {user?.name?.split(' ')[0] ?? t('appName')}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            hitSlop={8}
            style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="search" size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={8}
            style={[styles.headerButton, { backgroundColor: theme.colors.surface, marginLeft: 8 }]}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => player.shuffleAndPlay(tracks)}
          style={({ pressed }) => [
            styles.shuffleAll,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="shuffle" size={20} color={theme.colors.onAccent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[theme.font.title, { color: theme.colors.onAccent }]}>{t('shuffleAll')}</Text>
            <Text style={[theme.font.caption, { color: theme.colors.onAccent, opacity: 0.85, marginTop: 2 }]}>
              {t('songCount', { count: tracks.length })}
            </Text>
          </View>
          <Ionicons name="play" size={22} color={theme.colors.onAccent} />
        </Pressable>

        <View style={styles.shortcutGrid}>
          <ShortcutTile
            label={t('favorites')}
            icon="heart"
            tint="#EC4899"
            count={t('songCount', { count: favoriteTracks.length })}
            onPress={() => navigation.navigate('Favorites')}
            style={styles.shortcutTile}
          />
          <ShortcutTile
            label={t('recentlyPlayed')}
            icon="time-outline"
            tint="#3B82F6"
            count={t('songCount', { count: recentTracks.length })}
            onPress={() => navigation.navigate('RecentlyPlayed')}
            style={styles.shortcutTile}
          />
          <ShortcutTile
            label={t('playlists')}
            icon="albums-outline"
            tint="#F59E0B"
            count={t('playlistCount', { count: playlists.length })}
            onPress={() => navigation.navigate('PlaylistsTab')}
            style={styles.shortcutTile}
          />
          <ShortcutTile
            label={t('artists')}
            icon="person-outline"
            tint="#8B5CF6"
            count={String(artists.length)}
            onPress={() => navigation.navigate('LibraryTab', { screen: 'Artists' })}
            style={styles.shortcutTile}
          />
        </View>

        {quickPicks.length > 0 ? (
          <>
            <SectionHeader title={t('quickPicks')} />
            {quickPicks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                isActive={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying}
                isFavorite={library.isFavorite(track.id)}
                onPress={() => player.playQueue(quickPicks, quickPicks.indexOf(track))}
                onLongPress={() => setSheetTrack(track)}
                onPressMore={() => setSheetTrack(track)}
              />
            ))}
          </>
        ) : null}

        {recentTracks.length > 0 ? (
          <>
            <SectionHeader
              title={t('jumpBackIn')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('RecentlyPlayed')}
            />
            <HorizontalTrackRail
              tracks={recentTracks.slice(0, 12)}
              onPressTrack={(track, index) => player.playQueue(recentTracks.slice(0, 12), index)}
            />
          </>
        ) : null}

        {albums.length > 0 ? (
          <>
            <SectionHeader
              title={t('albums')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('LibraryTab', { screen: 'Albums' })}
            />
            <FlatList
              horizontal
              data={albums.slice(0, 15)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <View style={{ marginRight: 14 }}>
                  <AlbumCard
                    album={item}
                    size={132}
                    subtitle={t('songCount', { count: item.trackCount })}
                    onPress={() =>
                      navigation.navigate('AlbumDetail', { albumId: item.id, name: item.name })
                    }
                  />
                </View>
              )}
            />
          </>
        ) : null}

        {recentlyAddedTracks.length > 0 ? (
          <>
            <SectionHeader title={t('recentlyAdded')} />
            <HorizontalTrackRail
              tracks={recentlyAddedTracks.slice(0, 12)}
              onPressTrack={(track, index) =>
                player.playQueue(recentlyAddedTracks.slice(0, 12), index)
              }
            />
          </>
        ) : null}

        {mostPlayedTracks.length > 0 ? (
          <>
            <SectionHeader title={t('mostPlayed')} />
            {mostPlayedTracks.slice(0, 5).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                showIndex
                showArtwork={false}
                isActive={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying}
                isFavorite={library.isFavorite(track.id)}
                onPress={() => player.playQueue(mostPlayedTracks, index)}
                onLongPress={() => setSheetTrack(track)}
                onPressMore={() => setSheetTrack(track)}
              />
            ))}
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

function HorizontalTrackRail({ tracks, onPressTrack }) {
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={tracks}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => onPressTrack(item, index)}
          style={({ pressed }) => [{ width: 116, marginRight: 14, opacity: pressed ? 0.75 : 1 }]}
        >
          <AlbumCard
            album={{ ...item, name: item.title, artworkUri: item.artworkUri }}
            size={116}
            subtitle={item.artist}
            onPress={() => onPressTrack(item, index)}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  shuffleAll: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  shortcutTile: { flexBasis: '47%', flexGrow: 1 },
  rail: { paddingHorizontal: 16, paddingTop: 2 },
});
