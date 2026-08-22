import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/SettingsContext';
import { PressableScale } from './animated';

/**
 * Standard screen header: optional back arrow, a large title with an optional trailing
 * glyph, a count subtitle, and up to three action icons. Every pushed screen uses this so
 * headers line up pixel-for-pixel across the app.
 */
export function ScreenHeader({
  title,
  subtitle,
  glyph,
  onBack,
  actions = [],
  large = true,
  style,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screenHeader, { paddingTop: insets.top + 10 }, style]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[large ? theme.font.h1 : theme.font.h2, { color: theme.colors.text }]}
          >
            {title}
          </Text>
          {glyph ? (
            <Ionicons
              name={glyph}
              size={large ? 20 : 18}
              color={theme.colors.accent}
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actions.map((action) => (
        <Pressable
          key={action.icon}
          onPress={action.onPress}
          hitSlop={10}
          style={styles.headerAction}
        >
          <Ionicons name={action.icon} size={23} color={action.tint ?? theme.colors.text} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Pill search field. `onPress` turns it into a button that navigates to the Search screen;
 * omit it (and pass value/onChangeText) for a live-editing field.
 */
export function SearchBar({
  placeholder,
  value,
  onChangeText,
  onPress,
  trailingIcon = 'options-outline',
  onPressTrailing,
  trailingLabel,
  autoFocus,
  onClear,
  style,
}) {
  const theme = useTheme();
  const readOnly = typeof onPress === 'function';

  const body = (
    <>
      <Ionicons name="search" size={19} color={theme.colors.textTertiary} />
      {readOnly ? (
        <Text
          numberOfLines={1}
          style={[theme.font.body, styles.searchInput, { color: theme.colors.textTertiary }]}
        >
          {placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={[theme.font.body, styles.searchInput, { color: theme.colors.text }]}
        />
      )}

      {!readOnly && value?.length > 0 && onClear ? (
        <Pressable onPress={onClear} hitSlop={8} style={{ marginRight: 4 }}>
          <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}

      {onPressTrailing ? (
        <Pressable onPress={onPressTrailing} hitSlop={10} style={styles.searchTrailing}>
          <Ionicons name={trailingIcon} size={19} color={theme.colors.accent} />
          {trailingLabel ? (
            <Text style={[theme.font.title, { color: theme.colors.accent, marginLeft: 6 }]}>
              {trailingLabel}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </>
  );

  const containerStyle = [
    styles.searchBar,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
    },
    theme.shadow.card,
    style,
  ];

  if (readOnly) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...containerStyle, { opacity: pressed ? 0.85 : 1 }]}>
        {body}
      </Pressable>
    );
  }
  return <View style={containerStyle}>{body}</View>;
}

/** White rounded container with a hairline border and soft shadow. */
export function Card({ children, style, padded = false }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        },
        theme.shadow.card,
        padded && { padding: 14 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Uppercase group label above a settings card. */
export function GroupLabel({ label, style }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        theme.font.overline,
        { color: theme.colors.accent, marginLeft: 20, marginBottom: 8, marginTop: 22 },
        style,
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

/** Section heading with an optional trailing "See All ›" action. */
export function SectionHeader({ title, actionLabel, onPressAction, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[theme.font.h3, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onPressAction} hitSlop={8} style={styles.seeAll}>
          <Text style={[theme.font.title, { color: theme.colors.accent }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
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
          { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.xxl },
        ]}
      >
        <Ionicons name={icon} size={36} color={theme.colors.accent} />
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
        <PrimaryButton label={action} onPress={onAction} style={{ marginTop: 22, minWidth: 190 }} />
      ) : null}
    </View>
  );
}

/**
 * Primary call to action. `variant`:
 *   solid    — filled accent (default)
 *   gradient — accent sweep, used for Play All / Play Now
 *   outline  — accent border on the page background, used for Shuffle
 *   ghost    — surface fill with accent text
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
  variant = 'solid',
  size = 'md',
}) {
  const theme = useTheme();
  const isGradient = variant === 'gradient' && !disabled;
  const isFilled = variant === 'solid' || isGradient;
  const isOutline = variant === 'outline';

  const textColor = disabled
    ? theme.colors.textTertiary
    : isFilled
      ? theme.colors.onAccent
      : theme.colors.accent;

  const paddingVertical = size === 'sm' ? 10 : 14;
  const iconSize = size === 'sm' ? 16 : 19;

  const inner = loading ? (
    <ActivityIndicator color={textColor} size="small" />
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={iconSize} color={textColor} style={{ marginRight: 8 }} /> : null}
      <Text style={[size === 'sm' ? theme.font.body : theme.font.title, { color: textColor }]}>
        {label}
      </Text>
    </>
  );

  const shape = {
    borderRadius: theme.radius.pill,
    paddingVertical,
    paddingHorizontal: size === 'sm' ? 16 : 24,
  };

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.96}
      style={[{ borderRadius: theme.radius.pill }, style]}
    >
      {isGradient ? (
        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, shape]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            shape,
            {
              backgroundColor: disabled
                ? theme.colors.surfaceAlt
                : variant === 'solid'
                  ? theme.colors.accent
                  : variant === 'ghost'
                    ? theme.colors.surface
                    : 'transparent',
              borderWidth: isOutline || variant === 'ghost' ? 1.5 : 0,
              borderColor: isOutline ? theme.colors.accent : theme.colors.border,
            },
          ]}
        >
          {inner}
        </View>
      )}
    </PressableScale>
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

/** Circular icon button on a bordered surface — the header/detail action treatment. */
export function IconPill({ name, size = 20, onPress, active, diameter = 44, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconPill,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: active ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: active ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={active ? theme.colors.accent : theme.colors.accent} />
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

/** Rounded selectable chip used for sort options, presets and filter rows. */
export function Chip({ label, selected, onPress, icon, style }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
          borderColor: selected ? 'transparent' : theme.colors.border,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={selected ? theme.colors.accent : theme.colors.textSecondary}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        style={[
          theme.font.body,
          { color: selected ? theme.colors.accent : theme.colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling filter chips (All / Songs / Albums / Artists …). */
export function ChipRow({ options, value, onChange, style, contentStyle }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A horizontal ScrollView has no intrinsic height, so in a flex column it grows to fill
      // whatever vertical space is left and its row of children stretches to match — which
      // turned these chips into full-height ovals. `flexGrow: 0` keeps the strip the height of
      // its content; `alignItems: 'center'` stops the chips themselves from stretching.
      style={[styles.chipRow, style]}
      contentContainerStyle={[
        { paddingHorizontal: 16, paddingVertical: 2, alignItems: 'center' },
        contentStyle,
      ]}
    >
      {options.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          icon={option.icon}
          selected={value === option.key}
          onPress={() => onChange(option.key)}
        />
      ))}
    </ScrollView>
  );
}

/**
 * Underlined tab strip (All Songs / Recently Added / Most Played / A-Z).
 * Purely presentational — the caller owns the selected key.
 */
export function SegmentedTabs({ options, value, onChange, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderBottomColor: theme.colors.border }, style]}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [styles.segmentedItem, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text
              numberOfLines={1}
              style={[
                theme.font.title,
                { color: selected ? theme.colors.accent : theme.colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
            <View
              style={[
                styles.segmentedIndicator,
                { backgroundColor: selected ? theme.colors.accent : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two-up pill toggle (Up Next / History, Folders / Recent). */
export function Switcher({ options, value, onChange, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.switcher, style]}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.switcherItem,
              {
                backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceAlt,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={17}
                color={selected ? theme.colors.onAccent : theme.colors.textSecondary}
                style={{ marginRight: 8 }}
              />
            ) : null}
            <Text
              style={[
                theme.font.title,
                { color: selected ? theme.colors.onAccent : theme.colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The Play All + Shuffle pair that heads every collection detail screen. */
export function PlayShuffleRow({ playLabel, shuffleLabel, onPlay, onShuffle, trailing, style }) {
  return (
    <View style={[styles.playRow, style]}>
      <PrimaryButton
        label={playLabel}
        icon="play"
        variant="gradient"
        onPress={onPlay}
        style={{ flex: 1 }}
      />
      <PrimaryButton
        label={shuffleLabel}
        icon="shuffle"
        variant="ghost"
        onPress={onShuffle}
        style={{ flex: 1, marginLeft: 12 }}
      />
      {trailing}
    </View>
  );
}

export function Divider({ inset = 0 }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        marginLeft: inset,
      }}
    />
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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: { marginRight: 12, padding: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  headerAction: { marginLeft: 18, padding: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 52,
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, marginLeft: 12, paddingVertical: 0 },
  searchTrailing: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 12,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  iconPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13 },
  chipRow: { flexGrow: 0, flexShrink: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentedItem: { flex: 1, alignItems: 'center', paddingTop: 12 },
  segmentedIndicator: {
    height: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginTop: 10,
    marginHorizontal: 6,
  },
  switcher: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  switcherItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  playRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
