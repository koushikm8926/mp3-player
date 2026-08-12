import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/SettingsContext';
import { colorFromString, initialOf } from '../utils/format';

/**
 * Album art with a deterministic coloured fallback.
 *
 * MediaStore album-art URIs frequently 404 for tracks with no embedded cover, so a failed
 * load quietly swaps to the letter tile rather than leaving a hole in the grid.
 */
export function Artwork({ uri, name, size = 56, radius, style, textStyle }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const borderRadius = radius ?? Math.max(6, Math.round(size * 0.14));

  if (!uri || failed) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: colorFromString(name ?? '', 45, theme.colors.isDark ? 28 : 78),
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.initial,
            { fontSize: size * 0.36, color: theme.colors.isDark ? '#FFFFFF' : '#1A1A22' },
            textStyle,
          ]}
        >
          {initialOf(name)}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius, backgroundColor: theme.colors.skeleton }, style]}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
