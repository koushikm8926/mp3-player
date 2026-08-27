import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/SettingsContext';
import { PressableScale } from './animated';
import { Artwork } from './Artwork';

/**
 * Square tile used by the Albums grid and the horizontal carousels on Home.
 *
 * `playBadge` overlays the circular play button from the "Continue Listening" rail;
 * `progress` (0–1) draws the resume bar beneath the labels.
 */
export const AlbumCard = memo(function AlbumCard({
  album,
  size,
  onPress,
  onPressMore,
  subtitle,
  caption,
  playBadge = false,
  progress,
}) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <PressableScale onPress={onPress} style={{ width: size }}>
      <View>
        <Artwork uri={album.artworkUri} name={album.name} size={size} radius={theme.radius.md} />
        {playBadge ? (
          <View
            style={[
              styles.playBadge,
              { backgroundColor: isDarkUI ? '#1A1230' : theme.colors.surface },
              theme.shadow.card,
            ]}
          >
            <Ionicons name="play" size={16} color={isDarkUI ? '#C084FC' : theme.colors.accent} style={{ marginLeft: 2 }} />
          </View>
        ) : null}
      </View>

      <View style={styles.cardMeta}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[theme.font.title, { color: textColor }]}>
            {album.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[theme.font.caption, { color: subtitleColor, marginTop: 3 }]}
          >
            {subtitle ?? album.artist}
          </Text>
          {caption ? (
            <Text
              numberOfLines={1}
              style={[theme.font.caption, { color: theme.colors.textTertiary, marginTop: 2 }]}
            >
              {caption}
            </Text>
          ) : null}
        </View>

        {onPressMore ? (
          <Pressable onPress={onPressMore} hitSlop={10} style={{ paddingLeft: 6, paddingTop: 2 }}>
            <Ionicons name="ellipsis-vertical" size={17} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {progress != null ? (
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.accent,
                width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
              },
            ]}
          />
        </View>
      ) : null}
    </PressableScale>
  );
});

/** Circular avatar + name + count, used by the Top Artists rail. */
export const ArtistCircle = memo(function ArtistCircle({ artist, size = 84, subtitle, onPress }) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <PressableScale
      onPress={onPress}
      style={{ width: size + 20, alignItems: 'center' }}
    >
      <Artwork uri={artist.artworkUri} name={artist.name} size={size} radius={size / 2} />
      <Text
        numberOfLines={1}
        style={[theme.font.body, { color: textColor, marginTop: 10, textAlign: 'center' }]}
      >
        {artist.name}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={1}
          style={[theme.font.caption, { color: subtitleColor, marginTop: 2 }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </PressableScale>
  );
});

/** Circular avatar row used by the Artists list. */
export const ArtistRow = memo(function ArtistRow({ artist, onPress, subtitle }) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;
  const chevronColor = isDarkUI ? 'rgba(255, 255, 255, 0.45)' : theme.colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? (isDarkUI ? 'rgba(255,255,255,0.08)' : theme.colors.surfacePressed) : 'transparent' },
      ]}
    >
      <Artwork uri={artist.artworkUri} name={artist.name} size={54} radius={27} />
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[theme.font.title, { color: textColor }]}>
          {artist.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[theme.font.caption, { color: subtitleColor, marginTop: 3 }]}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={chevronColor} />
    </Pressable>
  );
});

/** Generic icon + title + subtitle row used for Folders and Playlists. */
export const CollectionRow = memo(function CollectionRow({
  title,
  subtitle,
  caption,
  icon = 'folder',
  artworkUri,
  artworkName,
  onPress,
  onLongPress,
  onPressPlay,
  onPressMore,
  trailingIcon = 'chevron-forward',
  accentIcon = true,
}) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;
  const captionColor = isDarkUI ? 'rgba(255, 255, 255, 0.45)' : theme.colors.textTertiary;
  const iconColor = isDarkUI ? '#C084FC' : (accentIcon ? theme.colors.accent : theme.colors.textSecondary);
  const iconBg = isDarkUI ? 'rgba(192, 132, 252, 0.15)' : (accentIcon ? theme.colors.accentMuted : theme.colors.surfaceAlt);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? (isDarkUI ? 'rgba(255,255,255,0.08)' : theme.colors.surfacePressed) : 'transparent' },
      ]}
    >
      {artworkUri || artworkName ? (
        <Artwork uri={artworkUri} name={artworkName ?? title} size={54} radius={theme.radius.sm} />
      ) : (
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: iconBg,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={25}
            color={iconColor}
          />
        </View>
      )}

      <View style={styles.meta}>
        <Text numberOfLines={1} style={[theme.font.title, { color: textColor }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[theme.font.caption, { color: subtitleColor, marginTop: 3 }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {caption ? (
          <Text
            numberOfLines={1}
            style={[theme.font.caption, { color: captionColor, marginTop: 2 }]}
          >
            {caption}
          </Text>
        ) : null}
      </View>

      {onPressPlay ? (
        <Pressable
          onPress={onPressPlay}
          hitSlop={8}
          style={[styles.rowPlay, { backgroundColor: isDarkUI ? 'rgba(192, 132, 252, 0.2)' : theme.colors.accentSoft }]}
        >
          <Ionicons name="play" size={16} color={isDarkUI ? '#C084FC' : theme.colors.accent} style={{ marginLeft: 2 }} />
        </Pressable>
      ) : null}

      {onPressMore ? (
        <Pressable onPress={onPressMore} hitSlop={10} style={styles.rowMore}>
          <Ionicons name="ellipsis-vertical" size={18} color={captionColor} />
        </Pressable>
      ) : trailingIcon ? (
        <Ionicons name={trailingIcon} size={18} color={captionColor} />
      ) : null}
    </Pressable>
  );
});

/**
 * Genre row: a tall artwork strip, a tinted icon disc, the name and description, then the
 * track count. Each genre gets its own tint so the list reads as a palette, matching the design.
 */
export const GenreRow = memo(function GenreRow({ title, subtitle, count, icon, tint, artworkUri, onPress }) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const color = isDarkUI ? '#C084FC' : (tint ?? theme.colors.accent);
  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.genreRow,
        {
          backgroundColor: isDarkUI ? 'rgba(255, 255, 255, 0.06)' : (pressed ? theme.colors.surfacePressed : theme.colors.surface),
          borderColor: isDarkUI ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Artwork
        uri={artworkUri}
        name={title}
        size={72}
        radius={0}
        style={{ width: 84, height: 72 }}
      />
      <View style={[styles.genreIcon, { backgroundColor: isDarkUI ? 'rgba(192, 132, 252, 0.15)' : `${color}1F` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
        <Text numberOfLines={1} style={[theme.font.title, { color: textColor }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[theme.font.caption, { color: subtitleColor, marginTop: 3, lineHeight: 17 }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Text style={[theme.font.body, { color }]}>{count}</Text>
      <Ionicons
        name="chevron-forward"
        size={17}
        color={isDarkUI ? 'rgba(255, 255, 255, 0.45)' : theme.colors.textTertiary}
        style={{ marginLeft: 6, marginRight: 12 }}
      />
    </Pressable>
  );
});

/**
 * Grid container that sizes its children to an exact pixel width, so a row of tiles plus
 * its gaps always adds up to the available width. Percentage widths can't do this once a
 * gap is involved — 4 × 25% + 3 gaps overflows and wraps to three per row.
 */
export function TileGrid({ children, columns = 4, gap = 12, paddingHorizontal = 16, style }) {
  const { width: windowWidth } = useWindowDimensions();
  // Floored: an exact division leaves zero slack, and rounding each tile up to a whole
  // device pixel then overflows the row by a hair, wrapping the last tile onto its own line.
  const tileWidth = Math.floor(
    (windowWidth - paddingHorizontal * 2 - gap * (columns - 1)) / columns
  );

  return (
    <View style={[styles.grid, { paddingHorizontal, gap }, style]}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { width: tileWidth }) : child
      )}
    </View>
  );
}

/**
 * Large square tile for the Library hub and the Home "Quick Access" grid: a centred icon
 * over a label and count. `width` is injected by `TileGrid`.
 */
export function CategoryTile({ label, icon, count, onPress, tint, width, compact = false, style }) {
  const theme = useTheme();
  const library = useLibrary() || {};
  const isDarkUI = library.adminMode || theme.colors.isDark;

  const color = isDarkUI ? '#C084FC' : (tint ?? theme.colors.accent);
  const bgColor = isDarkUI ? 'rgba(255, 255, 255, 0.06)' : theme.colors.surface;
  const borderColor = isDarkUI ? 'rgba(255, 255, 255, 0.12)' : theme.colors.border;
  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const countColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.category,
        {
          width,
          backgroundColor: bgColor,
          borderRadius: theme.radius.lg,
          borderColor: borderColor,
          paddingVertical: compact ? 16 : 22,
        },
        theme.shadow.card,
        style,
      ]}
    >
      <Ionicons name={icon} size={compact ? 26 : 30} color={color} />
      <Text
        numberOfLines={2}
        style={[
          compact ? theme.font.caption : theme.font.title,
          { color: textColor, marginTop: compact ? 8 : 12, textAlign: 'center' },
        ]}
      >
        {label}
      </Text>
      {count != null ? (
        <Text
          numberOfLines={1}
          style={[theme.font.caption, { color: countColor, marginTop: 3 }]}
        >
          {count}
        </Text>
      ) : null}
    </PressableScale>
  );
}

/** Compact icon + label + count row tile, retained for the settings shortcuts. */
export function ShortcutTile({ label, icon, count, onPress, tint, style }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.shortcut,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
        theme.shadow.card,
        style,
      ]}
    >
      <View
        style={[
          styles.shortcutIcon,
          { backgroundColor: `${tint ?? theme.colors.accent}22`, borderRadius: theme.radius.sm },
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 76 },
  meta: { flex: 1, marginLeft: 14, marginRight: 8 },
  iconTile: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  rowPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rowMore: { paddingHorizontal: 6, paddingVertical: 8 },

  cardMeta: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  playBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },

  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  genreIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  category: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
  },

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
