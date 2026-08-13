import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CollectionRow } from '../components/cards';
import { ChipRow, EmptyState, ScreenHeader, SearchBar } from '../components/common';
import { PromptDialog } from '../components/PromptDialog';
import { Sheet, SheetItem } from '../components/Sheet';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { formatDate, normalizeForSearch } from '../utils/format';

/** Playlist management: create, rename, delete, and the built-in smart lists. */
export function PlaylistsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const player = usePlayer();
  const library = useLibrary();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const { playlists, favoriteTracks, recentTracks, mostPlayedTracks, recentlyAddedTracks } = library;

  /**
   * The four built-in collections. They are not rows in the playlists table — they are
   * derived views — so they carry `smart: true` and are filtered out of "My Playlists".
   */
  const smartLists = useMemo(
    () => [
      {
        id: 'smart:favorites',
        smart: true,
        name: t('favorites'),
        icon: 'heart',
        count: favoriteTracks.length,
        onPress: () => navigation.navigate('Favorites'),
      },
      {
        id: 'smart:recent',
        smart: true,
        name: t('recentlyPlayed'),
        icon: 'time',
        count: recentTracks.length,
        onPress: () => navigation.navigate('RecentlyPlayed'),
      },
      {
        id: 'smart:most',
        smart: true,
        name: t('mostPlayed'),
        icon: 'trending-up',
        count: mostPlayedTracks.length,
        onPress: () => player.playQueue(mostPlayedTracks, 0, { shuffled: false }),
      },
      {
        id: 'smart:added',
        smart: true,
        name: t('recentlyAdded'),
        icon: 'sparkles',
        count: recentlyAddedTracks.length,
        onPress: () => player.playQueue(recentlyAddedTracks, 0, { shuffled: false }),
      },
    ],
    [t, favoriteTracks, recentTracks, mostPlayedTracks, recentlyAddedTracks, navigation, player]
  );

  const userLists = useMemo(
    () =>
      playlists.map((playlist) => ({
        id: playlist.id,
        smart: false,
        name: playlist.name,
        count: playlist.track_count ?? 0,
        updatedAt: playlist.updated_at,
        raw: playlist,
      })),
    [playlists]
  );

  const listed = useMemo(() => {
    let base;
    if (filter === 'mine') base = userLists;
    else if (filter === 'smart') base = smartLists;
    else if (filter === 'recent')
      base = [...userLists].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    else base = [...smartLists, ...userLists];

    if (!query) return base;
    const needle = normalizeForSearch(query);
    return base.filter((item) => normalizeForSearch(item.name).includes(needle));
  }, [filter, query, smartLists, userLists]);

  const create = async (name) => {
    const trimmed = name.trim();
    if (playlists.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('playlistExists'));
      return;
    }
    try {
      await library.createPlaylist(trimmed);
    } catch {
      Alert.alert(t('playlistExists'));
    }
  };

  const confirmDelete = (playlist) => {
    Alert.alert(t('deletePlaylist'), t('deletePlaylistConfirm', { name: playlist.name }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => library.deletePlaylist(playlist.id) },
    ]);
  };

  const playPlaylist = async (id, shuffled) => {
    const tracks = await library.getPlaylistTracks(id);
    if (!tracks.length) return;
    if (shuffled) player.shuffleAndPlay(tracks);
    else player.playQueue(tracks, 0, { shuffled: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlashList
        data={listed}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={76}
        contentContainerStyle={{ paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ backgroundColor: theme.colors.background }}>
            <ScreenHeader
              title={t('playlists')}
              glyph="musical-notes"
              subtitle={`${userLists.length} ${t('playlists')}`}
              actions={[
                { icon: 'search', onPress: () => navigation.navigate('Search') },
                { icon: 'ellipsis-vertical', onPress: () => navigation.navigate('Settings') },
              ]}
            />

            <View style={styles.searchRow}>
              <SearchBar
                placeholder={t('searchPlaylists')}
                value={query}
                onChangeText={setQuery}
                onClear={() => setQuery('')}
                style={{ flex: 1, marginHorizontal: 0 }}
              />
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [
                  styles.newButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.accent,
                    borderRadius: theme.radius.pill,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={19} color={theme.colors.accent} />
                <Text style={[theme.font.title, { color: theme.colors.accent, marginLeft: 4 }]}>
                  {t('newPlaylist')}
                </Text>
              </Pressable>
            </View>

            <ChipRow
              style={{ marginTop: 16, marginBottom: 8 }}
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'all', label: t('allPlaylists'), icon: 'list' },
                { key: 'mine', label: t('myPlaylists'), icon: 'person-outline' },
                { key: 'smart', label: t('smartPlaylists'), icon: 'sparkles-outline' },
                { key: 'recent', label: t('recentlyAdded'), icon: 'time-outline' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title={t('emptyPlaylistsTitle')}
            body={t('emptyPlaylistsBody')}
            action={t('createPlaylist')}
            onAction={() => setCreateOpen(true)}
          />
        }
        renderItem={({ item }) =>
          item.smart ? (
            <CollectionRow
              title={item.name}
              subtitle={t('songCount', { count: item.count })}
              caption={t('autoPlaylist')}
              icon={item.icon}
              accentIcon
              onPress={item.onPress}
            />
          ) : (
            <CollectionRow
              title={item.name}
              subtitle={t('trackCount', { count: item.count })}
              caption={`${t('createdByYou')} · ${formatDate(item.updatedAt)}`}
              icon="musical-notes"
              accentIcon
              onPress={() =>
                navigation.navigate('PlaylistDetail', { playlistId: item.id, name: item.name })
              }
              onLongPress={() => setMenuTarget(item.raw)}
              onPressPlay={() => playPlaylist(item.id, false)}
              onPressMore={() => setMenuTarget(item.raw)}
            />
          )
        }
      />

      <PromptDialog
        visible={createOpen}
        title={t('newPlaylist')}
        label={t('playlistName')}
        confirmLabel={t('create')}
        onClose={() => setCreateOpen(false)}
        onConfirm={create}
        validate={(value) => (value.trim() ? null : t('playlistName'))}
      />

      <PromptDialog
        visible={renameTarget != null}
        title={t('renamePlaylist')}
        label={t('playlistName')}
        initialValue={renameTarget?.name ?? ''}
        onClose={() => setRenameTarget(null)}
        onConfirm={(value) => library.renamePlaylist(renameTarget.id, value.trim())}
        validate={(value) => (value.trim() ? null : t('playlistName'))}
      />

      <Sheet
        visible={menuTarget != null}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.name}
        subtitle={t('trackCount', { count: menuTarget?.track_count ?? 0 })}
      >
        <SheetItem
          icon="play-outline"
          label={t('play')}
          onPress={() => {
            const target = menuTarget;
            setMenuTarget(null);
            playPlaylist(target.id, false);
          }}
        />
        <SheetItem
          icon="shuffle"
          label={t('shuffle')}
          onPress={() => {
            const target = menuTarget;
            setMenuTarget(null);
            playPlaylist(target.id, true);
          }}
        />
        <SheetItem
          icon="create-outline"
          label={t('rename')}
          onPress={() => {
            const target = menuTarget;
            setMenuTarget(null);
            setTimeout(() => setRenameTarget(target), 220);
          }}
        />
        <SheetItem
          icon="trash-outline"
          label={t('deletePlaylist')}
          destructive
          onPress={() => {
            const target = menuTarget;
            setMenuTarget(null);
            setTimeout(() => confirmDelete(target), 220);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
  },
});
