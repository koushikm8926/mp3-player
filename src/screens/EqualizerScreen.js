import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as MusicCore from '../../modules/expo-music-core';
import { Chip, EmptyState } from '../components/common';
import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';

/**
 * Equalizer UI over the platform AudioFx effects.
 *
 * Band count and frequencies come from the device (usually five bands), so the sliders are
 * built from whatever the hardware reports rather than a hardcoded layout.
 */
export function EqualizerScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update, updateMany } = useSettings();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState(() => MusicCore.getEqualizerState());
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    const current = MusicCore.getEqualizerState();
    setState(current);
    setLevels(
      settings.equalizerBands?.length === current.bands.length
        ? settings.equalizerBands
        : current.bands.map((band) => band.level)
    );
    // Reads the live effect state once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (patch) => {
      updateMany(patch);
    },
    [updateMany]
  );

  const setEnabled = (value) => {
    const next = MusicCore.setEqualizerEnabled(value);
    setState(next);
    update('equalizerEnabled', value);
  };

  const applyPreset = (index) => {
    const next = MusicCore.usePreset(index);
    setState(next);
    const nextLevels = next.bands.map((band) => band.level);
    setLevels(nextLevels);
    persist({ equalizerPreset: index, equalizerBands: nextLevels });
  };

  const setBand = (index, value) => {
    setLevels((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
    MusicCore.setBandLevel(index, value);
  };

  const commitBands = (index, value) => {
    const next = [...levels];
    next[index] = value;
    // Manual edits leave "preset" behind and become a custom curve.
    persist({ equalizerBands: next, equalizerPreset: -1 });
  };

  const reset = () => {
    const flat = state.bands.map(() => 0);
    setLevels(flat);
    MusicCore.setBandLevels(flat);
    MusicCore.setBassBoost(0);
    MusicCore.setVirtualizer(0);
    MusicCore.setLoudness(0);
    MusicCore.setReverb(0);
    persist({
      equalizerBands: flat,
      equalizerPreset: -1,
      bassBoost: 0,
      virtualizer: 0,
      loudness: 0,
      reverb: 0,
    });
  };

  const library = useLibrary();
  const isOnlineMode = Boolean(library?.adminMode);

  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;
  const cardBg = isOnlineMode ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surface;
  const borderColor = isOnlineMode ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border;
  const textColor = isOnlineMode ? '#FFFFFF' : theme.colors.text;
  const subtextColor = isOnlineMode ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textSecondary;
  const tertiaryColor = isOnlineMode ? 'rgba(255, 255, 255, 0.45)' : theme.colors.textTertiary;
  const accentColor = isOnlineMode ? '#C084FC' : theme.colors.accent;
  const trackMax = isOnlineMode ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border;

  if (!state.supported) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
        <Header title={t('equalizer')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="options-outline"
          title={t('equalizer')}
          body={t('equalizerUnsupported')}
          action={t('openSystemEqualizer')}
          onAction={() => MusicCore.openSystemEqualizer(0)}
        />
      </View>
    );
  }

  const [minLevel, maxLevel] = state.bandLevelRange;
  const disabled = !settings.equalizerEnabled;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      <Header
        title={t('equalizer')}
        onBack={() => navigation.goBack()}
        right={
          <Switch
            value={settings.equalizerEnabled}
            onValueChange={setEnabled}
            trackColor={{ true: accentColor, false: borderColor }}
            thumbColor="#FFFFFF"
          />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.section, { opacity: disabled ? 0.45 : 1 }]} pointerEvents={disabled ? 'none' : 'auto'}>
          <Text style={[theme.font.caption, { color: subtextColor, marginBottom: 10 }]}>
            {t('presets')}
          </Text>
          <View style={styles.chipRow}>
            {state.presets.map((preset) => (
              <Chip
                key={preset.index}
                label={preset.name}
                selected={settings.equalizerPreset === preset.index}
                onPress={() => applyPreset(preset.index)}
              />
            ))}
            <Chip label={t('custom')} selected={settings.equalizerPreset === -1} onPress={() => {}} />
          </View>
        </View>

        <View
          style={[styles.bandsCard, { backgroundColor: cardBg, borderRadius: theme.radius.md, borderWidth: isOnlineMode ? 1 : 0, borderColor, opacity: disabled ? 0.45 : 1 }]}
          pointerEvents={disabled ? 'none' : 'auto'}
        >
          {state.bands.map((band, index) => (
            <View key={band.index} style={styles.bandRow}>
              <Text style={[theme.font.tiny, { color: subtextColor, width: 54 }]}>
                {formatFrequency(band.centerFrequency)}
              </Text>
              <Slider
                style={{ flex: 1, height: 36 }}
                minimumValue={minLevel}
                maximumValue={maxLevel}
                step={100}
                value={levels[index] ?? band.level}
                onValueChange={(value) => setBand(index, value)}
                onSlidingComplete={(value) => commitBands(index, value)}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={trackMax}
                thumbTintColor={accentColor}
              />
              <Text
                style={[theme.font.tiny, { color: tertiaryColor, width: 46, textAlign: 'right' }]}
              >
                {formatGain(levels[index] ?? band.level)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { opacity: disabled ? 0.45 : 1 }]} pointerEvents={disabled ? 'none' : 'auto'}>
          {state.hasBassBoost ? (
            <EffectSlider
              label={t('bassBoost')}
              value={settings.bassBoost}
              max={1000}
              onChange={(value) => MusicCore.setBassBoost(value)}
              onCommit={(value) => update('bassBoost', value)}
              accentColor={accentColor}
              textColor={textColor}
              subtextColor={tertiaryColor}
              trackMax={trackMax}
            />
          ) : null}
          {state.hasVirtualizer ? (
            <EffectSlider
              label={t('virtualizer')}
              value={settings.virtualizer}
              max={1000}
              onChange={(value) => MusicCore.setVirtualizer(value)}
              onCommit={(value) => update('virtualizer', value)}
              accentColor={accentColor}
              textColor={textColor}
              subtextColor={tertiaryColor}
              trackMax={trackMax}
            />
          ) : null}
          {state.hasLoudnessEnhancer ? (
            <EffectSlider
              label={t('loudness')}
              value={settings.loudness}
              max={2000}
              onChange={(value) => MusicCore.setLoudness(value)}
              onCommit={(value) => update('loudness', value)}
              accentColor={accentColor}
              textColor={textColor}
              subtextColor={tertiaryColor}
              trackMax={trackMax}
            />
          ) : null}
        </View>

        <Pressable onPress={reset} style={styles.linkRow}>
          <Ionicons name="refresh-outline" size={19} color={accentColor} />
          <Text style={[theme.font.body, { color: accentColor, marginLeft: 10 }]}>
            {t('resetEqualizer')}
          </Text>
        </Pressable>

        <Pressable onPress={() => MusicCore.openSystemEqualizer(0)} style={styles.linkRow}>
          <Ionicons name="open-outline" size={19} color={accentColor} />
          <Text style={[theme.font.body, { color: accentColor, marginLeft: 10 }]}>
            {t('openSystemEqualizer')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function EffectSlider({ label, value, max, onChange, onCommit, accentColor, textColor, subtextColor, trackMax }) {
  const theme = useTheme();
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.effectHeader}>
        <Text style={[theme.font.body, { color: textColor ?? theme.colors.text, flex: 1 }]}>{label}</Text>
        <Text style={[theme.font.tiny, { color: subtextColor ?? theme.colors.textTertiary }]}>
          {Math.round((local / max) * 100)}%
        </Text>
      </View>
      <Slider
        style={{ height: 36 }}
        minimumValue={0}
        maximumValue={max}
        value={local}
        onValueChange={(next) => {
          setLocal(next);
          onChange(next);
        }}
        onSlidingComplete={(next) => onCommit(Math.round(next))}
        minimumTrackTintColor={accentColor ?? theme.colors.accent}
        maximumTrackTintColor={trackMax ?? theme.colors.border}
        thumbTintColor={accentColor ?? theme.colors.accent}
      />
    </View>
  );
}

export function Header({ title, onBack, right }) {
  const theme = useTheme();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;
  const textColor = isDarkUI ? '#FFFFFF' : theme.colors.text;

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Ionicons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <Text style={[theme.font.h3, { color: textColor, flex: 1, marginLeft: 16 }]}>
        {title}
      </Text>
      {right}
    </View>
  );
}

function formatFrequency(milliHertz) {
  const hertz = milliHertz / 1000;
  return hertz >= 1000 ? `${(hertz / 1000).toFixed(hertz % 1000 === 0 ? 0 : 1)}kHz` : `${Math.round(hertz)}Hz`;
}

function formatGain(millibels) {
  const decibels = millibels / 100;
  return `${decibels > 0 ? '+' : ''}${decibels.toFixed(1)}dB`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  bandsCard: { marginHorizontal: 16, marginTop: 16, padding: 12 },
  bandRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  effectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
});
