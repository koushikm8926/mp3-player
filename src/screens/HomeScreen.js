import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlbumCard, CategoryTile, TileGrid } from '../components/cards';
import { EmptyState, SearchBar, SectionHeader } from '../components/common';
import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import { TrackRow } from '../components/TrackRow';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';

/**
 * The dashboard: greeting, hero call-to-action, resume rail, the browse grid and the
 * recently played list.
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
  // Admin songs mode lives in LibraryContext, so flipping it re-points every screen at the
  // panel's catalogue rather than just this one.
  const { adminMode, setAdminMode, adminLoading, adminError } = library;

  const {
    tracks,
    albums,
    artists,
    genres,
    folders,
    playlists,
    favoriteTracks,
    recentTracks,
  } = library;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  }, [t]);

  // The design shows a resume bar under each card, but `track_stats` only aggregates play
  // counts — there is no saved per-track offset. Only the track actually loaded in the player
  // has a real position, so that is the only card that gets a bar.
  const continueListening = useMemo(
    () => recentTracks.slice(0, 12),
    [recentTracks]
  );

  const activeProgress =
    player.durationMs > 0 ? Math.min(1, player.positionMs / player.durationMs) : 0;

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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
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
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
            <Ionicons name="menu" size={28} color={theme.colors.accent} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={[theme.font.body, { color: theme.colors.textSecondary }]}>{greeting}</Text>
            <View style={styles.brandRow}>
              <Text style={[theme.font.h1, { color: theme.colors.text }]} numberOfLines={1}>
                {user?.name?.split(' ')[0] ?? t('appName')}
              </Text>
              <Ionicons
                name="musical-notes"
                size={19}
                color={theme.colors.accent}
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>

          <AdminModeSwitch
            value={adminMode}
            busy={adminLoading}
            onToggle={() => setAdminMode(!adminMode)}
          />
        </View>

        <SearchBar
          placeholder={t('searchPlaceholder')}
          onPress={() => navigation.navigate('Search')}
          onPressTrailing={() => navigation.navigate('Search')}
        />

        {adminMode ? <AdminModeBanner error={adminError} /> : null}

        <HeroBanner
          onPlay={() => player.shuffleAndPlay(tracks)}
          subtitle={t('songCount', { count: tracks.length })}
        />

        {continueListening.length > 0 ? (
          <>
            <SectionHeader
              title={t('jumpBackIn')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('RecentlyPlayed')}
            />
            <FlatList
              horizontal
              data={continueListening}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: 14 }}>
                  <AlbumCard
                    album={{ name: item.title, artist: item.artist, artworkUri: item.artworkUri }}
                    size={148}
                    playBadge
                    progress={player.currentTrack?.id === item.id ? activeProgress : undefined}
                    onPress={() => player.playQueue(continueListening, index)}
                  />
                </View>
              )}
            />
          </>
        ) : null}

        <SectionHeader title={t('quickAccess')} />
        <TileGrid columns={4} gap={12}>
          <CategoryTile
            label={t('songs')}
            icon="musical-notes"
            count={String(tracks.length)}
            compact
            onPress={() => navigation.navigate('Songs')}
          />
          <CategoryTile
            label={t('albums')}
            icon="disc"
            count={String(albums.length)}
            compact
            onPress={() => navigation.navigate('Albums')}
          />
          <CategoryTile
            label={t('artists')}
            icon="person"
            count={String(artists.length)}
            compact
            onPress={() => navigation.navigate('Artists')}
          />
          <CategoryTile
            label={t('folders')}
            icon="folder"
            count={String(folders.length)}
            compact
            onPress={() => navigation.navigate('Folders')}
          />
          <CategoryTile
            label={t('playlists')}
            icon="list"
            count={String(playlists.length)}
            compact
            onPress={() => navigation.navigate('PlaylistsTab')}
          />
          <CategoryTile
            label={t('genres')}
            icon="pricetag"
            count={String(genres.length)}
            compact
            onPress={() => navigation.navigate('Genres')}
          />
          <CategoryTile
            label={t('favorites')}
            icon="heart"
            count={String(favoriteTracks.length)}
            compact
            onPress={() => navigation.navigate('Favorites')}
          />
          <CategoryTile
            label={t('recentlyPlayed')}
            icon="time"
            count={String(recentTracks.length)}
            compact
            onPress={() => navigation.navigate('RecentlyPlayed')}
          />
        </TileGrid>

        {recentTracks.length > 0 ? (
          <>
            <SectionHeader
              title={t('recentlyPlayed')}
              actionLabel={t('seeAll')}
              onPressAction={() => navigation.navigate('RecentlyPlayed')}
            />
            {recentTracks.slice(0, 5).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                isActive={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying}
                isFavorite={library.isFavorite(track.id)}
                onPress={() => player.playQueue(recentTracks, index)}
                onLongPress={() => setSheetTrack(track)}
                onPressMore={() => setSheetTrack(track)}
                trailing={
                  <Pressable
                    onPress={() => player.playQueue(recentTracks, index)}
                    hitSlop={8}
                    style={[styles.rowPlay, { borderColor: theme.colors.accent }]}
                  >
                    <Ionicons
                      name="play"
                      size={15}
                      color={theme.colors.accent}
                      style={{ marginLeft: 2 }}
                    />
                  </Pressable>
                }
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

/**
 * Header switch for Admin songs mode.
 *
 * It sits where the library-refresh button used to; pull-to-refresh already rescans storage,
 * so nothing was lost by giving the corner to the mode instead. Drawn by hand rather than
 * with the platform `Switch` so it can carry the mode's icon inside the same pill.
 */
function AdminModeSwitch({ value, busy, onToggle }) {
  const theme = useTheme();
  const { t } = useSettings();

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={t('adminSongsMode')}
      style={({ pressed }) => [
        styles.adminSwitch,
        theme.shadow.card,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: value ? theme.colors.accent : theme.colors.surface,
          borderColor: value ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={value ? theme.colors.onAccent : theme.colors.accent}
          style={{ width: 17, height: 17 }}
        />
      ) : (
        <Ionicons
          name={value ? 'cloud-done' : 'cloud-outline'}
          size={17}
          color={value ? theme.colors.onAccent : theme.colors.textSecondary}
        />
      )}
      <View
        style={[
          styles.adminTrack,
          { backgroundColor: value ? 'rgba(255,255,255,0.38)' : theme.colors.surfaceAlt },
        ]}
      >
        <View
          style={[
            styles.adminKnob,
            {
              alignSelf: value ? 'flex-end' : 'flex-start',
              backgroundColor: value ? theme.colors.onAccent : theme.colors.textTertiary,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

/** Confirms what the switch changed, so the mode is never on without the listener knowing. */
function AdminModeBanner({ error }) {
  const theme = useTheme();
  const { t } = useSettings();
  const tone = error ? theme.colors.danger : theme.colors.accent;

  return (
    <View
      style={[
        styles.adminBanner,
        {
          backgroundColor: error ? `${theme.colors.danger}14` : theme.colors.accentSoft,
          borderColor: error ? `${theme.colors.danger}33` : theme.colors.accentMuted,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Ionicons name={error ? 'cloud-offline' : 'cloud-done'} size={19} color={tone} />
      <View style={{ flex: 1, marginLeft: 11 }}>
        <Text style={[theme.font.title, { color: tone }]}>{t('adminSongsMode')}</Text>
        <Text
          style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}
        >
          {error ?? t('adminSongsModeOnBody')}
        </Text>
      </View>
    </View>
  );
}

/**
 * Accent-gradient hero with the app promise and a shuffle-everything CTA.
 *
 * The mockup fills this with a studio photograph; a local player has no such asset, so the
 * gradient carries it and a drawn waveform stands in for the artwork.
 */
function HeroBanner({ onPlay, subtitle }) {
  const theme = useTheme();
  const { t } = useSettings();

  // A fixed, hand-tuned silhouette — deterministic so the banner doesn't flicker on re-render.
  const bars = [14, 26, 38, 22, 46, 58, 34, 50, 68, 44, 30, 54, 40, 24, 36, 18, 28, 12];

  return (
    <LinearGradient
      colors={theme.accentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { borderRadius: theme.radius.xl }, theme.shadow.floating]}
    >
      <View style={styles.heroCopy}>
        <Text style={[theme.font.h2, { color: '#FFFFFF' }]}>{t('heroTitle')}</Text>
        <Text
          style={[theme.font.body, { color: '#FFFFFF', opacity: 0.88, marginTop: 8, lineHeight: 20 }]}
        >
          {t('heroSubtitle')}
        </Text>

        <Pressable
          onPress={onPlay}
          style={({ pressed }) => [
            styles.heroButton,
            { backgroundColor: '#FFFFFF', borderRadius: theme.radius.pill, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="play" size={17} color={theme.colors.accent} />
          <Text style={[theme.font.title, { color: theme.colors.accent, marginLeft: 8 }]}>
            {t('playNow')}
          </Text>
        </Pressable>

        <Text style={[theme.font.caption, { color: '#FFFFFF', opacity: 0.75, marginTop: 10 }]}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.heroWave} pointerEvents="none">
        {bars.map((height, index) => (
          <View
            key={index}
            style={{
              width: 3,
              height,
              borderRadius: 2,
              marginHorizontal: 2,
              backgroundColor: '#FFFFFF',
              opacity: 0.28,
            }}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  headerTitles: { flex: 1, marginLeft: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  adminSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingLeft: 9,
    paddingRight: 7,
    paddingVertical: 6,
  },
  adminTrack: {
    width: 26,
    height: 15,
    borderRadius: 8,
    marginLeft: 7,
    padding: 2,
    justifyContent: 'center',
  },
  adminKnob: { width: 11, height: 11, borderRadius: 6 },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 22,
    minHeight: 190,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  heroCopy: { maxWidth: '68%' },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 18,
  },
  heroWave: {
    position: 'absolute',
    right: 18,
    bottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
  },
  rail: { paddingHorizontal: 16, paddingTop: 2 },
  rowPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
