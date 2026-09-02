import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/SettingsContext';

const CATEGORY_PRESETS = [
  {
    id: 'Devotional',
    title: 'Devotional',
    unit: 'Songs',
    icon: 'flame',
    gradientDark: ['#4A041D', '#831843', '#1A020B'],
    gradientLight: ['#FFF1F2', '#FFE4E6', '#FECDD3'],
    accentColor: '#FB7185',
  },
  {
    id: 'Podcasts',
    title: 'Podcasts',
    unit: 'Episodes',
    icon: 'mic',
    gradientDark: ['#3B0764', '#7E22CE', '#140029'],
    gradientLight: ['#F3E8FF', '#E9D5FF', '#D8B4FE'],
    accentColor: '#A855F7',
  },
  {
    id: 'Meditation',
    title: 'Meditation',
    unit: 'Tracks',
    icon: 'leaf',
    gradientDark: ['#0369A1', '#0284C7', '#032B43'],
    gradientLight: ['#E0F2FE', '#BAE6FD', '#7DD3FC'],
    accentColor: '#0284C7',
  },
  {
    id: 'Audiobooks',
    title: 'Audiobooks',
    unit: 'Books',
    icon: 'book',
    gradientDark: ['#581C87', '#9333EA', '#280548'],
    gradientLight: ['#FAF5FF', '#F3E8FF', '#E9D5FF'],
    accentColor: '#9333EA',
  },
  {
    id: 'Kids',
    title: 'Kids',
    unit: 'Songs',
    icon: 'sparkles',
    gradientDark: ['#831843', '#DB2777', '#42031E'],
    gradientLight: ['#FCE7F3', '#FBCFE8', '#F472B6'],
    accentColor: '#DB2777',
  },
  {
    id: 'Instrumental',
    title: 'Instrumental',
    unit: 'Tracks',
    icon: 'musical-notes',
    gradientDark: ['#1E3A8A', '#2563EB', '#0F1A4A'],
    gradientLight: ['#EFF6FF', '#DBEAFE', '#BFDBFE'],
    accentColor: '#2563EB',
  },
  {
    id: 'Motivation',
    title: 'Motivation',
    unit: 'Tracks',
    icon: 'sunny',
    gradientDark: ['#7C2D12', '#EA580C', '#331003'],
    gradientLight: ['#FFEDD5', '#FED7AA', '#FDBA74'],
    accentColor: '#EA580C',
  },
  {
    id: 'Classical',
    title: 'Classical',
    unit: 'Tracks',
    icon: 'disc',
    gradientDark: ['#78350F', '#D97706', '#361603'],
    gradientLight: ['#FEF3C7', '#FDE68A', '#FCD34D'],
    accentColor: '#D97706',
  },
  {
    id: 'Romance',
    title: 'Romance',
    unit: 'Songs',
    icon: 'heart',
    gradientDark: ['#881337', '#E11D48', '#3F0413'],
    gradientLight: ['#FFE4E6', '#FECDD3', '#FDA4AF'],
    accentColor: '#E11D48',
  },
  {
    id: 'Party',
    title: 'Party',
    unit: 'Songs',
    icon: 'headset',
    gradientDark: ['#4338CA', '#6366F1', '#1B1754'],
    gradientLight: ['#EEF2FF', '#E0E7FF', '#C7D2FE'],
    accentColor: '#4F46E5',
  },
  {
    id: 'Hip Hop',
    title: 'Hip Hop',
    unit: 'Songs',
    icon: 'mic-circle',
    gradientDark: ['#0F766E', '#14B8A6', '#05312E'],
    gradientLight: ['#CCFBF1', '#99F6E4', '#5EEAD4'],
    accentColor: '#0D9488',
  },
  {
    id: 'Pop',
    title: 'Pop',
    unit: 'Songs',
    icon: 'star',
    gradientDark: ['#701A75', '#C026D3', '#3B023E'],
    gradientLight: ['#FAE8FF', '#F5D0FE', '#F0ABFC'],
    accentColor: '#C026D3',
  },
  {
    id: 'Rock',
    title: 'Rock',
    unit: 'Songs',
    icon: 'flame-outline',
    gradientDark: ['#991B1B', '#DC2626', '#470404'],
    gradientLight: ['#FEE2E2', '#FECACA', '#FCA5A5'],
    accentColor: '#DC2626',
  },
  {
    id: 'Lo-Fi',
    title: 'Lo-Fi',
    unit: 'Tracks',
    icon: 'cafe',
    gradientDark: ['#1E293B', '#334155', '#0B101D'],
    gradientLight: ['#F1F5F9', '#E2E8F0', '#CBD5E1'],
    accentColor: '#475569',
  },
  {
    id: 'Workout',
    title: 'Workout',
    unit: 'Tracks',
    icon: 'fitness',
    gradientDark: ['#065F46', '#059669', '#02291E'],
    gradientLight: ['#D1FAE5', '#A7F3D0', '#6EE7B7'],
    accentColor: '#059669',
  },
  {
    id: 'Study',
    title: 'Study',
    unit: 'Tracks',
    icon: 'bulb',
    gradientDark: ['#713F12', '#CA8A04', '#362103'],
    gradientLight: ['#FEF9C3', '#FEF08A', '#FDE047'],
    accentColor: '#CA8A04',
  },
];

const MOODS = [
  { id: 'happy', label: 'Happy', icon: 'sunny-outline', color: '#FBBF24' },
  { id: 'relax', label: 'Relax', icon: 'leaf-outline', color: '#34D399' },
  { id: 'sad', label: 'Sad', icon: 'cloud-rain-outline', color: '#60A5FA' },
  { id: 'energetic', label: 'Energetic', icon: 'flash-outline', color: '#F87171' },
  { id: 'calm', label: 'Calm', icon: 'moon-outline', color: '#C084FC' },
];

export function CategoriesScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const { adminMode, setAdminMode, tracks, genres } = library;

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const track of tracks) {
      const cat = (track.category || track.genre || 'Pop').trim().toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [tracks]);

  const categoriesList = useMemo(() => {
    const presetMap = new Map(CATEGORY_PRESETS.map((p) => [p.id.toLowerCase(), p]));
    const list = [...CATEGORY_PRESETS];

    for (const g of genres) {
      if (g.name && !presetMap.has(g.name.toLowerCase())) {
        list.push({
          id: g.name,
          title: g.name,
          unit: 'Songs',
          icon: 'musical-notes',
          gradientDark: ['#3B0764', '#7E22CE', '#140029'],
          gradientLight: ['#F3E8FF', '#E9D5FF', '#D8B4FE'],
          accentColor: '#A855F7',
        });
      }
    }

    // Sort so categories with tracks in the library appear first
    return list.sort((a, b) => {
      const countA = categoryCounts[a.title.toLowerCase()] || 0;
      const countB = categoryCounts[b.title.toLowerCase()] || 0;
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      if (countA !== countB) return countB - countA;
      return 0;
    });
  }, [genres, categoryCounts]);

  const handleCategoryPress = (category) => {
    const targetName = category.title.trim().toLowerCase();
    const categoryTracks = tracks.filter(
      (t) => (t.category || t.genre || '').trim().toLowerCase() === targetName
    );
    const matchingGenre = genres.find(
      (g) => (g.name || '').trim().toLowerCase() === targetName
    );

    const genreObj = {
      id: matchingGenre?.id || category.id,
      name: category.title,
      tracks: categoryTracks.length > 0 ? categoryTracks : (matchingGenre?.tracks || []),
    };

    navigation.navigate('GenreDetail', {
      genreId: genreObj.id,
      name: category.title,
      genre: genreObj,
    });
  };

  const isDarkUI = adminMode || theme.colors.isDark;
  const bg = isDarkUI ? '#090713' : theme.colors.background;
  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
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
            <Text style={[styles.brandTitle, { color: textColor }]}>MP3 Player</Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => navigation.navigate('Search')}
              style={styles.headerIconButton}
              hitSlop={8}
            >
              <Ionicons name="search-outline" size={22} color={textColor} />
            </Pressable>

            {/* Offline / Online Pill Switch */}
            <Pressable
              onPress={() => setAdminMode(!adminMode)}
              style={[
                styles.togglePill,
                {
                  borderColor: isDarkUI ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border,
                  backgroundColor: isDarkUI ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfaceAlt,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleHalf,
                  !adminMode && (isDarkUI ? styles.toggleActiveOfflineDark : styles.toggleActiveOfflineLight),
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: !adminMode
                        ? isDarkUI
                          ? '#FFFFFF'
                          : theme.colors.text
                        : isDarkUI
                        ? 'rgba(255, 255, 255, 0.45)'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Offline
                </Text>
              </View>
              <LinearGradient
                colors={adminMode ? ['#9333EA', '#C084FC'] : ['transparent', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.toggleHalf, adminMode && styles.toggleActiveOnline]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: adminMode
                        ? '#FFFFFF'
                        : isDarkUI
                        ? 'rgba(255, 255, 255, 0.45)'
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Online
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { color: textColor }]}>Categories</Text>
          <Text style={[styles.subTitle, { color: subtitleColor }]}>
            Explore music for every mood and moment
          </Text>
        </View>

        {/* 2-Column Categories Grid */}
        <View style={styles.grid}>
          {categoriesList.map((item) => {
            const count = categoryCounts[item.title.toLowerCase()] || 0;
            const cardGradients = isDarkUI ? item.gradientDark : item.gradientLight;
            const cardTitleColor = isDarkUI ? '#FFFFFF' : '#0F172A';
            const cardCountColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : '#475569';

            return (
              <Pressable
                key={item.id}
                onPress={() => handleCategoryPress(item)}
                style={styles.cardContainer}
              >
                <LinearGradient
                  colors={cardGradients}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.card,
                    { borderColor: isDarkUI ? `${item.accentColor}44` : `${item.accentColor}30` },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isDarkUI
                          ? `${item.accentColor}25`
                          : `${item.accentColor}20`,
                      },
                    ]}
                  >
                    <Ionicons name={item.icon} size={20} color={item.accentColor} />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: cardTitleColor }]}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.cardCount, { color: cardCountColor }]}>
                      {count} {item.unit}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.arrowCircle,
                      {
                        backgroundColor: isDarkUI
                          ? `${item.accentColor}30`
                          : `${item.accentColor}25`,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={14} color={item.accentColor} />
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Browse by Mood Section */}
        <View style={styles.moodSection}>
          <View style={styles.moodHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="happy-outline" size={20} color="#C084FC" style={{ marginRight: 8 }} />
              <Text style={[styles.moodSectionTitle, { color: textColor }]}>Browse by Mood</Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Genres')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ color: '#C084FC', fontWeight: '600', fontSize: 13 }}>
                View All
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#C084FC" style={{ marginLeft: 2 }} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodScroll}
          >
            {MOODS.map((mood) => (
              <Pressable
                key={mood.id}
                onPress={() => navigation.navigate('Search')}
                style={[
                  styles.moodChip,
                  {
                    backgroundColor: isDarkUI ? `${mood.color}1E` : `${mood.color}18`,
                    borderColor: isDarkUI ? `${mood.color}44` : `${mood.color}30`,
                  },
                ]}
              >
                <Ionicons name={mood.icon} size={16} color={mood.color} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, { color: mood.color }]}>{mood.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 21,
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
  togglePill: {
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
  toggleActiveOfflineDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  toggleActiveOfflineLight: {
    backgroundColor: '#FFFFFF',
  },
  toggleActiveOnline: {},
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleSection: {
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48.5%',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 76,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardCount: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  moodSection: {
    marginTop: 18,
    paddingTop: 10,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  moodSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  moodScroll: {
    paddingHorizontal: 18,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
