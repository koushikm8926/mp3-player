import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibrary } from '../context/LibraryContext';
import { useTheme } from '../context/SettingsContext';

/**
 * Bottom sheet built on the platform Modal.
 *
 * A dedicated gesture library would add another native dependency for very little gain here —
 * every sheet in the app is a short, tappable list rather than something the user drags.
 */
export function Sheet({ visible, onClose, title, subtitle, children, maxHeightRatio = 0.8 }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const sheetBg = isDarkUI ? '#130E26' : theme.colors.backgroundElevated;
  const handleBg = isDarkUI ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border;
  const titleColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const subtitleColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={[styles.backdrop, { backgroundColor: isDarkUI ? 'rgba(0,0,0,0.75)' : theme.colors.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: sheetBg,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: insets.bottom + 12,
            maxHeight: `${maxHeightRatio * 100}%`,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: handleBg }]} />
        {title ? (
          <View style={styles.header}>
            <Text numberOfLines={1} style={[theme.font.h3, { color: titleColor }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[theme.font.caption, { color: subtitleColor, marginTop: 3 }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** A single tappable line inside a sheet. */
export function SheetItem({ icon, label, sublabel, onPress, destructive, selected, disabled }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;

  const color = destructive
    ? theme.colors.danger
    : disabled
      ? (isDarkUI ? 'rgba(255,255,255,0.3)' : theme.colors.textTertiary)
      : (isDarkUI ? '#FFFFFF' : theme.colors.text);

  const sublabelColor = isDarkUI ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;
  const pressedBg = isDarkUI ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surfacePressed;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: pressed ? pressedBg : 'transparent' },
      ]}
    >
      {icon ? <Ionicons name={icon} size={21} color={destructive ? theme.colors.danger : (isDarkUI ? '#C084FC' : color)} style={{ width: 30 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[theme.font.title, { color }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text numberOfLines={1} style={[theme.font.caption, { color: sublabelColor, marginTop: 2 }]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={isDarkUI ? '#C084FC' : theme.colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
});
