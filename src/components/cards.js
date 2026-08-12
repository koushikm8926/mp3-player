import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/SettingsContext';
import { Artwork } from './Artwork';

/** Square tile used by the Albums grid and the horizontal carousels on Home. */
export const AlbumCard = memo(function AlbumCard({ album, size, onPress, subtitle }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: size, opacity: pressed ? 0.75 : 1 }]}
    >
      <Artwork uri={album.artworkUri} name={album.name} size={size} radius={theme.radius.md} />
      <Text numberOfLines={1} style={[theme.font.body, { color: theme.colors.text, marginTop: 8 }]}>
        {album.name}
      </Text>
      <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {subtitle ?? album.artist}
      </Text>
    </Pressable>
  );
});

/** Circular avatar row used by the Artists list. */
export const ArtistRow = memo(function ArtistRow({ artist, onPress, subtitle }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      <Artwork uri={artist.artworkUri} name={artist.name} size={52} radius={26} />
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[theme.font.title, { color: theme.colors.text }]}>
          {artist.name}
        </Text>
        <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
});

/** Generic icon + title + subtitle row used for Genres, Folders and Playlists. */
export const CollectionRow = memo(function CollectionRow({
  title,
  subtitle,
  icon = 'folder-outline',
  artworkUri,
  artworkName,
  onPress,
  onLongPress,
  trailingIcon = 'chevron-forward',
  accentIcon = false,
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      {artworkUri || artworkName ? (
        <Artwork uri={artworkUri} name={artworkName ?? title} size={52} />
      ) : (
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: accentIcon ? theme.colors.accentMuted : theme.colors.surfaceAlt,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={24}
            color={accentIcon ? theme.colors.accent : theme.colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[theme.font.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailingIcon ? (
        <Ionicons name={trailingIcon} size={18} color={theme.colors.textTertiary} />
      ) : null}
    </Pressable>
  );
});

/** Compact tile for the Home dashboard shortcut grid. */
export function ShortcutTile({ label, icon, count, onPress, tint, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.shortcutIcon,
          { backgroundColor: (tint ?? theme.colors.accent) + '22', borderRadius: theme.radius.sm },
        ]}
      >
        <Ionicons name={icon} size={20} color={tint ?? theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[theme.font.body, { color: theme.colors.text }]}>
          {label}
        </Text>
        {count != null ? (
          <Text style={[theme.font.tiny, { color: theme.colors.textTertiary, marginTop: 2 }]}>
            {count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 72 },
  meta: { flex: 1, marginLeft: 12, marginRight: 8 },
  iconTile: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
