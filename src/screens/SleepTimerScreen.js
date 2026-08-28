import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/common';
import { PromptDialog } from '../components/PromptDialog';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { formatCountdown } from '../utils/format';
import { Header } from './EqualizerScreen';

const PRESETS = [5, 10, 15, 30, 45, 60, 90, 120];

/** Stop playback after N minutes, or cleanly at the end of the current track. */
export function SleepTimerScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();

  const isOnlineMode = Boolean(library?.adminMode);

  const bgColor = isOnlineMode ? '#090713' : theme.colors.background;
  const cardBg = isOnlineMode ? 'rgba(255, 255, 255, 0.08)' : theme.colors.surface;
  const borderColor = isOnlineMode ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border;
  const textColor = isOnlineMode ? '#FFFFFF' : theme.colors.text;
  const subtextColor = isOnlineMode ? 'rgba(255, 255, 255, 0.65)' : theme.colors.textTertiary;
  const accentColor = isOnlineMode ? '#C084FC' : theme.colors.accent;
  const iconBg = isOnlineMode ? 'rgba(192, 132, 252, 0.18)' : theme.colors.accentMuted;

  const [customOpen, setCustomOpen] = useState(false);
  const [, forceTick] = useState(0);

  // Re-render once a second so the countdown stays accurate.
  useEffect(() => {
    if (!player.sleepTimer?.endsAt) return undefined;
    const handle = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, [player.sleepTimer?.endsAt]);

  const active = player.sleepTimer;
  const remaining = active?.endsAt ? Math.max(0, active.endsAt - Date.now()) : 0;

  const start = (minutes) => {
    player.startSleepTimer({ minutes });
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      <Header title={t('sleepTimer')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View
          style={[
            styles.statusCard,
            { backgroundColor: cardBg, borderRadius: theme.radius.lg, borderWidth: isOnlineMode ? 1 : 0, borderColor },
          ]}
        >
          <View style={[styles.statusIcon, { backgroundColor: iconBg }]}>
            <Ionicons
              name={active ? 'moon' : 'moon-outline'}
              size={30}
              color={accentColor}
            />
          </View>
          <Text style={[theme.font.h1, { color: textColor, marginTop: 16 }]}>
            {active
              ? active.endOfTrack
                ? t('endOfTrack')
                : formatCountdown(remaining)
              : t('sleepTimerOff')}
          </Text>
          {active ? (
            <PrimaryButton
              label={t('stopTimer')}
              variant="outline"
              onPress={() => {
                player.cancelSleepTimer();
                navigation.goBack();
              }}
              style={{ marginTop: 20, minWidth: 200 }}
            />
          ) : null}
        </View>

        <View style={styles.grid}>
          {PRESETS.map((minutes) => (
            <Pressable
              key={minutes}
              onPress={() => start(minutes)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: cardBg,
                  borderRadius: theme.radius.md,
                  borderColor,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[theme.font.h3, { color: textColor }]}>{minutes}</Text>
              <Text style={[theme.font.tiny, { color: subtextColor, marginTop: 2 }]}>
                min
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => setCustomOpen(true)} style={styles.linkRow}>
          <Ionicons name="create-outline" size={20} color={accentColor} />
          <Text style={[theme.font.body, { color: accentColor, marginLeft: 12 }]}>
            {t('customDuration')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            player.startSleepTimer({ endOfTrack: true });
            navigation.goBack();
          }}
          style={styles.linkRow}
        >
          <Ionicons name="musical-note-outline" size={20} color={accentColor} />
          <Text style={[theme.font.body, { color: accentColor, marginLeft: 12 }]}>
            {t('endOfTrack')}
          </Text>
        </Pressable>
      </ScrollView>

      <PromptDialog
        visible={customOpen}
        title={t('customDuration')}
        label={t('minutes', { count: '' }).trim()}
        keyboardType="number-pad"
        initialValue="20"
        confirmLabel={t('startTimer')}
        onClose={() => setCustomOpen(false)}
        onConfirm={(value) => start(Number(value))}
        validate={(value) => {
          const minutes = Number(value);
          return Number.isFinite(minutes) && minutes > 0 && minutes <= 720 ? null : '1 – 720';
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: { alignItems: 'center', margin: 16, paddingVertical: 28, paddingHorizontal: 20 },
  statusIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  tile: {
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
});
