import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Divider, GroupLabel, ScreenHeader } from '../components/common';
import { Sheet, SheetItem } from '../components/Sheet';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { ACCENT_ORDER, ACCENTS } from '../theme';

const CROSSFADE_OPTIONS = [0, 2, 3, 4, 5, 6, 8, 10, 12];
const MIN_TRACK_OPTIONS = [5, 10, 15, 30, 45, 60];

/** Every user-facing preference lives here. */
export function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update, language } = useSettings();
  const insets = useSafeAreaInsets();
  const { user, signOut, serverReachable } = useAuth();
  const library = useLibrary();

  const [themeSheet, setThemeSheet] = useState(false);
  const [crossfadeSheet, setCrossfadeSheet] = useState(false);
  const [minTrackSheet, setMinTrackSheet] = useState(false);
  const [scanning, setScanning] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const refreshLibrary = async () => {
    setScanning(true);
    await library.refresh({ rescanMediaStore: true });
    setScanning(false);
    Alert.alert(t('scanComplete', { count: library.tracks.length }));
  };

  const confirmSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const themeLabel = {
    system: t('themeSystem'),
    dark: t('themeDark'),
    light: t('themeLight'),
    amoled: t('themeAmoled'),
  }[settings.themeMode];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title={t('settings')}
        large={false}
        actions={[{ icon: 'search', onPress: () => navigation.navigate('Search') }]}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 170 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------------------------------------------ account */}
        <Pressable
          onPress={() => navigation.navigate('ServerSettings')}
          style={({ pressed }) => [
            styles.accountCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              opacity: pressed ? 0.9 : 1,
            },
            theme.shadow.card,
          ]}
        >
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={{ color: theme.colors.onAccent, fontSize: 20, fontWeight: '700' }}>
                {(user?.name ?? 'G')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text numberOfLines={1} style={[theme.font.title, { color: theme.colors.text }]}>
                {user?.name ?? 'Guest'}
              </Text>
              <Text numberOfLines={1} style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
                {user?.email ?? t('continueAsGuest')}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: serverReachable ? theme.colors.success : theme.colors.textTertiary },
              ]}
            />
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textTertiary}
              style={{ marginLeft: 10 }}
            />
        </Pressable>

        {/* ------------------------------------------------------------ appearance */}
        <Section title={t('appearance')}>
          <Row icon="contrast-outline" label={t('theme')} value={themeLabel} onPress={() => setThemeSheet(true)} />
          <View style={styles.accentRow}>
            <Text style={[theme.font.body, { color: theme.colors.text, flex: 1 }]}>
              {t('accentColor')}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {ACCENT_ORDER.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => update('accentColor', key)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: ACCENTS[key],
                      borderColor:
                        settings.accentColor === key ? theme.colors.text : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <Row
            icon="language-outline"
            label={t('language')}
            value={language.toUpperCase()}
            onPress={() => navigation.navigate('Language')}
          />
        </Section>

        {/* ------------------------------------------------------------ playback */}
        <Section title={t('playback')}>
          <Row
            icon="swap-horizontal-outline"
            label={t('crossfade')}
            value={
              settings.crossfadeSeconds > 0
                ? t('crossfadeDescription', { seconds: settings.crossfadeSeconds })
                : t('crossfadeOff')
            }
            onPress={() => setCrossfadeSheet(true)}
          />
          <ToggleRow
            icon="git-merge-outline"
            label={t('gaplessPlayback')}
            description={t('gaplessDescription')}
            value={settings.gaplessPlayback}
            onValueChange={(value) => update('gaplessPlayback', value)}
          />
          <ToggleRow
            icon="phone-portrait-outline"
            label={t('keepScreenOn')}
            description={t('keepScreenOnDescription')}
            value={settings.keepScreenOn}
            onValueChange={(value) => update('keepScreenOn', value)}
          />
          <ToggleRow
            icon="headset-outline"
            label={t('pauseOnDisconnect')}
            description={t('pauseOnDisconnectDescription')}
            value={settings.pauseOnHeadphoneDisconnect}
            onValueChange={(value) => update('pauseOnHeadphoneDisconnect', value)}
          />
          <ToggleRow
            icon="volume-medium-outline"
            label={t('audioFocus')}
            description={t('audioFocusDescription')}
            value={settings.respectAudioFocus}
            onValueChange={(value) => update('respectAudioFocus', value)}
          />
          <ToggleRow
            icon="bookmark-outline"
            label={t('rememberQueue')}
            description={t('rememberQueueDescription')}
            value={settings.rememberQueue}
            onValueChange={(value) => update('rememberQueue', value)}
          />
          <Row icon="options-outline" label={t('equalizer')} onPress={() => navigation.navigate('Equalizer')} />
          <Row icon="moon-outline" label={t('sleepTimer')} onPress={() => navigation.navigate('SleepTimer')} />
        </Section>

        {/* ------------------------------------------------------------ library */}
        <Section title={t('librarySection')}>
          <Row
            icon="refresh-outline"
            label={t('refreshLibrary')}
            description={t('refreshLibraryDescription')}
            value={scanning ? t('scanning') : undefined}
            onPress={refreshLibrary}
          />
          <ToggleRow
            icon="timer-outline"
            label={t('ignoreShortTracks')}
            description={t('ignoreShortTracksDescription', { seconds: settings.minTrackSeconds })}
            value={settings.ignoreShortTracks}
            onValueChange={(value) => update('ignoreShortTracks', value)}
          />
          {settings.ignoreShortTracks ? (
            <Row
              icon="hourglass-outline"
              label={t('minimumLength')}
              value={`${settings.minTrackSeconds}s`}
              onPress={() => setMinTrackSheet(true)}
            />
          ) : null}
          <ToggleRow
            icon="sync-outline"
            label={t('autoRefreshLibrary')}
            description={t('autoRefreshLibraryDescription')}
            value={settings.autoRefreshLibrary}
            onValueChange={(value) => update('autoRefreshLibrary', value)}
          />
          <Row
            icon="eye-off-outline"
            label={t('hiddenMusic')}
            value={String(library.hiddenItems.length)}
            onPress={() => navigation.navigate('HiddenMusic')}
          />
          <Row
            icon="cloud-download-outline"
            label={t('backupRestore')}
            onPress={() => navigation.navigate('BackupRestore')}
          />
        </Section>

        {/* ------------------------------------------------------------ about */}
        <Section title={t('aboutSection')}>
          <Row
            icon="server-outline"
            label={t('serverUrl')}
            onPress={() => navigation.navigate('ServerSettings')}
          />
          <Row
            icon="information-circle-outline"
            label={t('about')}
            value={`v${version}`}
            onPress={() => navigation.navigate('About')}
          />
          <Row icon="log-out-outline" label={t('signOut')} destructive onPress={confirmSignOut} />
        </Section>
      </ScrollView>

      <Sheet visible={themeSheet} onClose={() => setThemeSheet(false)} title={t('theme')}>
        {[
          ['system', t('themeSystem')],
          ['dark', t('themeDark')],
          ['light', t('themeLight')],
          ['amoled', t('themeAmoled')],
        ].map(([key, label]) => (
          <SheetItem
            key={key}
            label={label}
            selected={settings.themeMode === key}
            onPress={() => {
              update('themeMode', key);
              setThemeSheet(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={crossfadeSheet} onClose={() => setCrossfadeSheet(false)} title={t('crossfade')}>
        {CROSSFADE_OPTIONS.map((seconds) => (
          <SheetItem
            key={seconds}
            label={seconds === 0 ? t('crossfadeOff') : `${seconds}s`}
            selected={settings.crossfadeSeconds === seconds}
            onPress={() => {
              update('crossfadeSeconds', seconds);
              setCrossfadeSheet(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={minTrackSheet} onClose={() => setMinTrackSheet(false)} title={t('ignoreShortTracks')}>
        {MIN_TRACK_OPTIONS.map((seconds) => (
          <SheetItem
            key={seconds}
            label={`${seconds}s`}
            selected={settings.minTrackSeconds === seconds}
            onPress={() => {
              update('minTrackSeconds', seconds);
              setMinTrackSheet(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

/**
 * A titled group of rows rendered as one rounded card, with hairline dividers between
 * children so the card reads as a single surface.
 */
export function Section({ title, children }) {
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View>
      <GroupLabel label={title} />
      <Card style={{ marginHorizontal: 16 }}>
        {rows.map((row, index) => (
          <View key={row.key ?? index}>
            {index > 0 ? <Divider inset={52} /> : null}
            {row}
          </View>
        ))}
      </Card>
    </View>
  );
}

export function Row({ icon, label, description, value, onPress, destructive }) {
  const theme = useTheme();
  const color = destructive ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={21}
          color={destructive ? theme.colors.danger : theme.colors.accent}
          style={{ width: 34 }}
        />
      ) : null}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={[theme.font.title, { color }]}>{label}</Text>
        {description ? (
          <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          numberOfLines={1}
          style={[theme.font.body, { color: theme.colors.accent, maxWidth: 150 }]}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} style={{ marginLeft: 6 }} />
      ) : null}
    </Pressable>
  );
}

export function ToggleRow({ icon, label, description, value, onValueChange }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {icon ? (
        <Ionicons name={icon} size={21} color={theme.colors.accent} style={{ width: 34 }} />
      ) : null}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[theme.font.title, { color: theme.colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  accentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  swatch: { width: 22, height: 22, borderRadius: 11, marginLeft: 7, borderWidth: 2 },
});
