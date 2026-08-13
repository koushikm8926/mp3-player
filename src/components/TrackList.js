import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/SettingsContext';
import { TrackOptionsSheet } from './TrackOptionsSheet';
import { TrackRow, TRACK_ROW_HEIGHT, TRACK_ROW_TALL_HEIGHT } from './TrackRow';

/**
 * The list every track-showing screen renders.
 *
 * Centralising it means playback, the options sheet and the "now playing" highlight behave
 * identically on Songs, Album, Artist, Genre, Folder, Playlist, Favourites and Search.
 */
export function TrackList({
  tracks,
  navigation,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  showIndex = false,
  showArtwork = true,
  showAlbum = false,
  contentContainerStyle,
  onRefresh,
  refreshing = false,
  optionsContextFor,
  onTrackPress,
  subtitleFor,
}) {
  const theme = useTheme();
  const player = usePlayer();
  const library = useLibrary();
  const [sheetTrack, setSheetTrack] = useState(null);

  const handlePress = useCallback(
    (index) => {
      if (onTrackPress) {
        onTrackPress(tracks[index], index);
        return;
      }
      player.playQueue(tracks, index);
    },
    [onTrackPress, player, tracks]
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <TrackRow
        track={item}
        index={index}
        showIndex={showIndex}
        showArtwork={showArtwork}
        showAlbum={showAlbum}
        subtitle={subtitleFor ? subtitleFor(item) : undefined}
        isActive={player.currentTrack?.id === item.id}
        isPlaying={player.isPlaying}
        isFavorite={library.isFavorite(item.id)}
        onPress={() => handlePress(index)}
        onLongPress={() => setSheetTrack(item)}
        onPressMore={() => setSheetTrack(item)}
      />
    ),
    [
      showIndex,
      showArtwork,
      showAlbum,
      subtitleFor,
      player.currentTrack?.id,
      player.isPlaying,
      library,
      handlePress,
    ]
  );

  return (
    <>
      <FlashList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={showAlbum ? TRACK_ROW_TALL_HEIGHT : TRACK_ROW_HEIGHT}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent ?? <View style={{ height: 120 }} />}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
              progressBackgroundColor={theme.colors.surface}
            />
          ) : undefined
        }
      />

      <TrackOptionsSheet
        track={sheetTrack}
        visible={sheetTrack != null}
        onClose={() => setSheetTrack(null)}
        navigation={navigation}
        context={sheetTrack && optionsContextFor ? optionsContextFor(sheetTrack) : {}}
      />
    </>
  );
}
