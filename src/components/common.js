import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../context/SettingsContext';

/** Section heading with an optional trailing action. */
export function SectionHeader({ title, actionLabel, onPressAction, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[theme.font.h3, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={[theme.font.caption, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'musical-notes-outline', title, body, action, onAction }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.xl },
        ]}
      >
        <Ionicons name={icon} size={34} color={theme.colors.textTertiary} />
      </View>
      <Text style={[theme.font.h3, { color: theme.colors.text, textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text
          style={[
            theme.font.body,
            { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
          ]}
        >
          {body}
        </Text>
      ) : null}
      {action ? (
        <PrimaryButton label={action} onPress={onAction} style={{ marginTop: 20, minWidth: 180 }} />
      ) : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading, icon, style, variant = 'solid' }) {
  const theme = useTheme();
  const isSolid = variant === 'solid';
  const backgroundColor = isSolid
    ? disabled
      ? theme.colors.surfaceAlt
      : theme.colors.accent
    : 'transparent';
  const textColor = isSolid
    ? disabled
      ? theme.colors.textTertiary
      : theme.colors.onAccent
    : theme.colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius.pill,
          borderWidth: isSolid ? 0 : 1.5,
          borderColor: theme.colors.accent,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 8 }} /> : null}
          <Text style={[theme.font.title, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, size = 22, color, onPress, style, disabled, hitSlop = 10 }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.colors.text} />
    </Pressable>
  );
}

export function Field({ label, error, style, leftIcon, ...inputProps }) {
  const theme = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? (
        <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.fieldWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={theme.colors.textTertiary}
            style={{ marginRight: 8 }}
          />
        ) : null}
        <TextInput
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, theme.font.body, { color: theme.colors.text }]}
          {...inputProps}
        />
      </View>
      {error ? (
        <Text style={[theme.font.caption, { color: theme.colors.danger, marginTop: 5 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

/** Rounded selectable chip used for sort options, presets and timer durations. */
export function Chip({ label, selected, onPress, icon, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? theme.colors.onAccent : theme.colors.textSecondary}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        style={[
          theme.font.caption,
          { color: selected ? theme.colors.onAccent : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider({ inset = 0 }) {
  const theme = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginLeft: inset }} />
  );
}

export function LoadingView({ label }) {
  const theme = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      {label ? (
        <Text style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 12 }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  iconButton: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
