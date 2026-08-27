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

const CATEGORY_CHIPS = [
  { id: 'all', title: 'All', icon: 'musical-notes' },
  { id: 'Devotional', title: 'Devotional', icon: 'flame' },
  { id: 'Podcasts', title: 'Podcasts', icon: 'mic' },
  { id: 'Meditation', title: 'Meditation', icon: 'leaf' },
  { id: 'Audiobooks', title: 'Audiobooks', icon: 'book' },
  { id: 'Kids', title: 'Kids', icon: 'sparkles' },
  { id: 'Instrumental', title: 'Instrumental', icon: 'musical-notes' },
  { id: 'Motivation', title: 'Motivation', icon: 'sunny' },
  { id: 'Classical', title: 'Classical', icon: 'disc' },
  { id: 'Romance', title: 'Romance', icon: 'heart' },
  { id: 'Party', title: 'Party', icon: 'headset' },
  { id: 'Hip Hop', title: 'Hip Hop', icon: 'mic-circle' },
  { id: 'Pop', title: 'Pop', icon: 'star' },
  { id: 'Rock', title: 'Rock', icon: 'flame-outline' },
  { id: 'Lo-Fi', title: 'Lo-Fi', icon: 'cafe' },
  { id: 'Workout', title: 'Workout', icon: 'fitness' },
  { id: 'Study', title: 'Study', icon: 'bulb' },
];

const TOP_PLAYLIST_PRESETS = [
  {
    id: 'top50',
    title: 'Top 50 India',
    subtitle: '50 Songs',
    gradient: ['#4C1D95', '#8B5CF6', '#2E1065'],
  },
  {
    id: 'relax',
    title: 'Relax & Unwind',
    subtitle: '40 Songs',
    gradient: ['#065F46', '#10B981', '#022C22'],
  },
  {
    id: 'workout',
    title: 'Workout Hits',
    subtitle: '60 Songs',
    gradient: ['#9A3412', '#F97316', '#431407'],
  },
  {
    id: 'morning',
    title: 'Morning Boost',
    subtitle: '35 Songs',
    gradient: ['#854D0E', '#EAB308', '#3F2C06'],
  },
];

const RECOMMENDED_RADIOS = [
  {
    id: 'lofi',
    title: 'Lo fi Beats',
    subtitle: 'Artist Radio',
    color: '#818CF8',
    icon: 'cafe',
  },
  {
    id: 'arijit',
    title: 'Arijit Singh',
    subtitle: 'Artist Radio',
    color: '#F472B6',
    icon: 'person',
  },
  {
    id: 'spiritual',
    title: 'Spiritual Mantras',
    subtitle: 'Artist Radio',
    color: '#38BDF8',
    icon: 'flame',
  },
  {
    id: 'oldisgold',
    title: 'Old Is Gold',
    subtitle: 'Artist Radio',
    color: '#FBBF24',
    icon: 'disc',
  },
];

export function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { user } = useAuth();
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  const library = useLibrary();

  const [sheetTrack, setSheetTrack] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  const continueListening = useMemo(() => recentTracks.slice(0, 12), [recentTracks]);

  const activeProgress =
    player.durationMs > 0 ? Math.min(1, player.positionMs / player.durationMs) : 0;

  const filteredTracks = useMemo(() => {
    if (selectedCategory === 'all') return tracks;
    return tracks.filter(
      (tr) => (tr.category || tr.genre || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [tracks, selectedCategory]);

  const trendingSongs = useMemo(() => filteredTracks.slice(0, 10), [filteredTracks]);
  const recentlyAdded = useMemo(
    () => [...filteredTracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 10),
    [filteredTracks]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (adminMode) await library.refreshAdminSongs();
    else await library.refresh({ rescanMediaStore: true });
    setRefreshing(false);
  };

  // If library is empty and not loading
  if (tracks.length === 0 && !library.scanning && !adminLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
        <EmptyState
          icon={adminMode ? 'cloud-offline-outline' : 'musical-notes-outline'}
          title={adminMode ? t('adminSongsEmptyTitle') : t('emptyLibraryTitle')}
          body={adminMode ? adminError ?? t('adminSongsEmptyBody') : t('emptyLibraryBody')}
          action={adminMode ? t('adminSongsTurnOff') : t('refreshLibrary')}
          onAction={adminMode ? () => setAdminMode(false) : onRefresh}
        />
      </View>
    );
  }

  // ==================== ONLINE MODE DASHBOARD ====================
  if (adminMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090713' }}>
        <ScrollView
          style={{ backgroundColor: '#090713' }}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C084FC"
              colors={['#C084FC']}
              progressBackgroundColor="#120E24"
            />
          }
        >
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoBadge}
              >
                <Ionicons name="musical-notes" size={19} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.brandTitle, { color: '#FFFFFF' }]}>MP3 Player</Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => navigation.navigate('Search')}
                style={styles.headerIconButton}
                hitSlop={8}
              >
                <Ionicons name="search-outline" size={22} color="#FFFFFF" />
              </Pressable>

              {/* Offline / Online Pill Switch */}
              <Pressable
                onPress={() => setAdminMode(false)}
                style={styles.togglePillDark}
              >
                <View style={styles.toggleHalf}>
                  <Text style={[styles.toggleText, { color: 'rgba(255, 255, 255, 0.45)' }]}>
                    Offline
                  </Text>
                </View>
                <LinearGradient
                  colors={['#9333EA', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.toggleHalf, styles.toggleActiveOnline]}
                >
                  <Text style={[styles.toggleText, { color: '#FFFFFF' }]}>
                    Online
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {adminError ? <AdminModeBanner error={adminError} /> : null}

          {/* Featured Albums Hero Banner (Carousel) */}
          <HeroCarousel
            onPlay={() => player.shuffleAndPlay(filteredTracks.length > 0 ? filteredTracks : tracks)}
          />

          {/* Category Pills Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsScroll}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const isSelected = selectedCategory === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setSelectedCategory(chip.id)}
                  style={[
                    styles.categoryPill,
                    isSelected
                      ? styles.categoryPillSelected
                      : { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Ionicons
                    name={chip.icon}
                    size={15}
                    color={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)' },
                    ]}
                  >
                    {chip.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Trending Songs Section */}
          <SectionHeader
            title="Trending Songs"
            actionLabel="See All"
            onPressAction={() => navigation.navigate('Songs')}
          />
          {trendingSongs.length > 0 ? (
            <FlatList
              horizontal
              data={trendingSongs}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: 14 }}>
                  <AlbumCard
                    album={{ name: item.title, artist: item.artist, artworkUri: item.artworkUri }}
                    size={148}
                    playBadge
                    onPress={() => player.playQueue(trendingSongs, index)}
                    onPressMore={() => setSheetTrack(item)}
                  />
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyRail}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                No online songs uploaded in this category yet.
              </Text>
            </View>
          )}

          {/* Recently Added Section */}
          <SectionHeader
            title="Recently Added"
            actionLabel="See All"
            onPressAction={() => navigation.navigate('Songs')}
          />
          {recentlyAdded.length > 0 ? (
            <FlatList
              horizontal
              data={recentlyAdded}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: 14 }}>
                  <AlbumCard
                    album={{ name: item.title, artist: item.artist, artworkUri: item.artworkUri }}
                    size={148}
                    onPress={() => player.playQueue(recentlyAdded, index)}
                    onPressMore={() => setSheetTrack(item)}
                  />
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyRail}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                No recent additions.
              </Text>
            </View>
          )}

          {/* Top Playlists Section */}
          <SectionHeader
            title="Top Playlists"
            actionLabel="See All"
            onPressAction={() => navigation.navigate('PlaylistsTab')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {TOP_PLAYLIST_PRESETS.map((pl) => (
              <Pressable
                key={pl.id}
                onPress={() => navigation.navigate('PlaylistsTab')}
                style={styles.playlistCardContainer}
              >
                <LinearGradient
                  colors={pl.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playlistCard}
                >
                  <View style={styles.playlistWatermark}>
                    <Text style={styles.watermarkText}>50</Text>
                  </View>
                  <View style={styles.playlistMeta}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>
                      {pl.title}
                    </Text>
                    <Text style={styles.playlistSubtitle}>{pl.subtitle}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>

          {/* Recommended For You Section */}
          <SectionHeader
            title="Recommended For You"
            actionLabel="See All"
            onPressAction={() => navigation.navigate('Artists')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {RECOMMENDED_RADIOS.map((radio) => (
              <Pressable
                key={radio.id}
                onPress={() => player.shuffleAndPlay(tracks)}
                style={styles.radioContainer}
              >
                <View style={[styles.radioCircle, { backgroundColor: `${radio.color}22` }]}>
                  <Ionicons name={radio.icon} size={32} color={radio.color} />
                  <View style={styles.radioPlayOverlay}>
                    <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                </View>
                <Text numberOfLines={1} style={[styles.radioTitle, { color: '#FFFFFF' }]}>
                  {radio.title}
                </Text>
                <Text style={[styles.radioSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
                  {radio.subtitle}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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

  // ==================== ORIGINAL OFFLINE MODE DASHBOARD ====================
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
        <View style={styles.offlineHeader}>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
            <Ionicons name="menu" size={28} color={theme.colors.accent} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={[theme.font.body, { color: theme.colors.textSecondary }]}>{greeting}</Text>
            <View style={styles.brandRowOffline}>
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

          {/* Offline / Online Pill Switch in Light Theme */}
          <Pressable
            onPress={() => setAdminMode(true)}
            style={[
              styles.togglePillLight,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.toggleHalf, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.toggleText, { color: theme.colors.text }]}>Offline</Text>
            </View>
            <View style={styles.toggleHalf}>
              <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>Online</Text>
            </View>
          </Pressable>
        </View>

        <SearchBar
          placeholder={t('searchPlaceholder')}
          onPress={() => navigation.navigate('Search')}
          onPressTrailing={() => navigation.navigate('Search')}
        />

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

/** Featured Albums Hero Carousel Banner matching Image 2 */
function HeroCarousel({ onPlay }) {
  return (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={['#2A0A4B', '#5B1A8C', '#120424']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroLeft}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>Featured Albums</Text>
          </View>

          <Text style={styles.heroTitle}>Feel The</Text>
          <Text style={styles.heroTitleGradient}>Music</Text>

          <Text style={styles.heroSubtitle}>
            Discover new sounds and timeless classics
          </Text>

          <Pressable onPress={onPlay} style={styles.listenButton}>
            <Text style={styles.listenButtonText}>Listen Now</Text>
            <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>

        <View style={styles.heroRight}>
          <View style={styles.heroGlowCircle} />
          <Ionicons name="headset" size={96} color="rgba(192, 132, 252, 0.4)" />
        </View>
      </LinearGradient>

      <View style={styles.dotsRow}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

/** Original Hero Banner for Offline mode */
function HeroBanner({ onPlay, subtitle }) {
  const theme = useTheme();
  const { t } = useSettings();
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
          style={[
            theme.font.body,
            { color: '#FFFFFF', opacity: 0.88, marginTop: 8, lineHeight: 20 },
          ]}
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

function AdminModeBanner({ error }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.adminBanner,
        {
          backgroundColor: `${theme.colors.danger}14`,
          borderColor: `${theme.colors.danger}33`,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Ionicons name="cloud-offline" size={19} color={theme.colors.danger} />
      <View style={{ flex: 1, marginLeft: 11 }}>
        <Text style={[theme.font.title, { color: theme.colors.danger }]}>Connection Warning</Text>
        <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          {error}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  headerTitles: { flex: 1, marginLeft: 14 },
  brandRowOffline: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginRight: 12,
    padding: 4,
  },
  togglePillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  togglePillLight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    padding: 2,
  },
  toggleHalf: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  toggleActiveOnline: {},
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
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
  heroContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 180,
  },
  heroLeft: {
    flex: 1,
    zIndex: 2,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroTitleGradient: {
    color: '#C084FC',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 14,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  listenButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroRight: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroGlowCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B5CF644',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 3,
  },
  dotActive: {
    width: 16,
    backgroundColor: '#C084FC',
  },
  categoryPillsScroll: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rail: {
    paddingHorizontal: 16,
    paddingTop: 2,
    marginBottom: 16,
  },
  emptyRail: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  rowPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  playlistCardContainer: {
    width: 140,
    height: 140,
    marginRight: 14,
  },
  playlistCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  playlistWatermark: {
    opacity: 0.15,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
  },
  playlistMeta: {},
  playlistTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  playlistSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  radioContainer: {
    width: 110,
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  radioPlayOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  radioSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
