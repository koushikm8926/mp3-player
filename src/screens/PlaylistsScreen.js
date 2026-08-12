import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollectionRow } from '../components/cards';
import { EmptyState } from '../components/common';
import { PromptDialog } from '../components/PromptDialog';
import { Sheet, SheetItem } from '../components/Sheet';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { formatDate } from '../utils/format';

/** Playlist management: create, rename, delete, and the built-in smart lists. */
export function PlaylistsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);

  const { playlists, favoriteTracks, recentTracks, mostPlayedTracks, recentlyAddedTracks } = library;

  const smartLists = [
    {
      key: 'favorites',
      label: t('favorites'),
      icon: 'heart',
      count: favoriteTracks.length,
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      key: 'recent',
      label: t('recentlyPlayed'),
      icon: 'time-outline',
      count: recentTracks.length,
      onPress: () => navigation.navigate('RecentlyPlayed'),
    },
    {
      key: 'mostPlayed',
      label: t('mostPlayed'),
      icon: 'trending-up-outline',
      count: mostPlayedTracks.length,
      onPress: () => player.playQueue(mostPlayedTracks, 0, { shuffled: false }),
    },
    {
      key: 'recentlyAdded',
      label: t('recentlyAdded'),
      icon: 'sparkles-outline',
      count: recentlyAddedTracks.length,
      onPress: () => player.playQueue(recentlyAddedTracks, 0, { shuffled: false }),
    },
  ];

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
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => library.deletePlaylist(playlist.id),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[theme.font.h1, { color: theme.colors.text, flex: 1 }]}>{t('playlists')}</Text>
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="add" size={22} color={theme.colors.onAccent} />
        </Pressable>
      </View>

      <FlashList
        data={playlists}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={72}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            {smartLists.map((item) => (
              <CollectionRow
                key={item.key}
                title={item.label}
                subtitle={t('songCount', { count: item.count })}
                icon={item.icon}
                accentIcon
                onPress={item.onPress}
              />
            ))}
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
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
        renderItem={({ item }) => (
          <CollectionRow
            title={item.name}
            subtitle={`${t('trackCount', { count: item.track_count ?? 0 })} · ${formatDate(
              item.updated_at
            )}`}
            icon="musical-notes-outline"
            onPress={() =>
              navigation.navigate('PlaylistDetail', { playlistId: item.id, name: item.name })
            }
            onLongPress={() => setMenuTarget(item)}
          />
        )}
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
          onPress={async () => {
            const target = menuTarget;
            setMenuTarget(null);
            const tracks = await library.getPlaylistTracks(target.id);
            if (tracks.length) player.playQueue(tracks, 0, { shuffled: false });
          }}
        />
        <SheetItem
          icon="shuffle"
          label={t('shuffle')}
          onPress={async () => {
            const target = menuTarget;
            setMenuTarget(null);
            const tracks = await library.getPlaylistTracks(target.id);
            if (tracks.length) player.shuffleAndPlay(tracks);
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginTop: 8 },
});
