import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: insets.bottom + 12,
            maxHeight: `${maxHeightRatio * 100}%`,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        {title ? (
          <View style={styles.header}>
            <Text numberOfLines={1} style={[theme.font.h3, { color: theme.colors.text }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
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
  const color = destructive
    ? theme.colors.danger
    : disabled
      ? theme.colors.textTertiary
      : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      {icon ? <Ionicons name={icon} size={21} color={color} style={{ width: 30 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[theme.font.title, { color }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.accent} /> : null}
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
