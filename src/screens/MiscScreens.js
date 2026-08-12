import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, PrimaryButton } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { LANGUAGES, resolveDeviceLanguage } from '../i18n';
import { api, getBaseUrl, setBaseUrl } from '../services/api';
import { Header } from './EqualizerScreen';
import { Row, Section } from './SettingsScreen';

/** Language picker. `null` means "follow the device locale". */
export function LanguageScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const deviceLanguage = resolveDeviceLanguage();

  const choose = (code) => {
    update('language', code);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Header title={t('language')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={[theme.font.caption, styles.note, { color: theme.colors.textSecondary }]}>
          {t('languageDescription')}
        </Text>

        <LanguageRow
          label={t('themeSystem')}
          nativeLabel={LANGUAGES.find((l) => l.code === deviceLanguage)?.nativeLabel}
          selected={settings.language == null}
          onPress={() => choose(null)}
        />
        {LANGUAGES.map((item) => (
          <LanguageRow
            key={item.code}
            label={item.label}
            nativeLabel={item.nativeLabel}
            selected={settings.language === item.code}
            onPress={() => choose(item.code)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function LanguageRow({ label, nativeLabel, selected, onPress }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent' },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[theme.font.body, { color: theme.colors.text }]}>{label}</Text>
        {nativeLabel && nativeLabel !== label ? (
          <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 3 }]}>
            {nativeLabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={21} color={theme.colors.accent} /> : null}
    </Pressable>
  );
}

/** Lets the operator point the app at their own admin/API deployment. */
export function ServerSettingsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBaseUrl().then(setUrl);
  }, []);

  const save = async () => {
    setSaving(true);
    await setBaseUrl(url);
    const response = await api.remoteSettings();
    setSaving(false);
    Alert.alert(
      t('serverUrl'),
      response.ok ? t('upToDate') : t('offlineNotice')
    );
    if (response.ok) navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Header title={t('serverUrl')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Field
          label={t('serverUrl')}
          leftIcon="server-outline"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://10.0.2.2:3000"
        />
        <Text style={[theme.font.caption, { color: theme.colors.textTertiary, lineHeight: 18 }]}>
          Use http://10.0.2.2:3000 from the Android emulator, or your machine&apos;s LAN address
          (for example http://192.168.1.20:3000) from a physical device.
        </Text>
        <PrimaryButton label={t('save')} onPress={save} loading={saving} style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}

/** About + update check against the admin panel's version registry. */
export function AboutScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { deviceInfo } = useAuth();
  const [checking, setChecking] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const checkForUpdates = async () => {
    setChecking(true);
    const response = await api.checkVersion({ version, build: deviceInfo.buildNumber });
    setChecking(false);

    if (!response.ok) {
      Alert.alert(t('checkForUpdates'), t('offlineNotice'));
      return;
    }
    const info = response.data;
    if (info?.updateAvailable) {
      Alert.alert(
        t('updateAvailable'),
        `${t('updateAvailableBody', { version: info.latestVersion })}\n\n${info.releaseNotes ?? ''}`.trim(),
        [
          { text: t('cancel'), style: 'cancel' },
          info.downloadUrl
            ? { text: t('ok'), onPress: () => Linking.openURL(info.downloadUrl) }
            : { text: t('ok') },
        ]
      );
    } else {
      Alert.alert(t('checkForUpdates'), t('upToDate'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Header title={t('about')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.aboutHero}>
          <View style={[styles.logo, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="musical-notes" size={36} color={theme.colors.onAccent} />
          </View>
          <Text style={[theme.font.h2, { color: theme.colors.text, marginTop: 18 }]}>
            {t('appName')}
          </Text>
          <Text style={[theme.font.caption, { color: theme.colors.textSecondary, marginTop: 5 }]}>
            {t('version')} {version} ({deviceInfo.buildNumber})
          </Text>
        </View>

        <Section title={t('aboutSection')}>
          <Row
            icon="cloud-download-outline"
            label={t('checkForUpdates')}
            value={checking ? t('loading') : undefined}
            onPress={checkForUpdates}
          />
          <Row
            icon="shield-checkmark-outline"
            label={t('privacyPolicy')}
            onPress={() =>
              Alert.alert(
                t('privacyPolicy'),
                'Minax Music reads audio files from this device to build your library. Playlists, favourites and listening history stay on the device. Only account details and anonymous usage counters are sent to the admin server you configure.'
              )
            }
          />
          <Row
            icon="document-text-outline"
            label={t('termsOfService')}
            onPress={() =>
              Alert.alert(
                t('termsOfService'),
                'This application is provided for playback of audio files you already own or are licensed to use.'
              )
            }
          />
        </Section>

        <Text style={[theme.font.tiny, styles.credit, { color: theme.colors.textTertiary }]}>
          Minax Digital Pvt. Ltd.{'\n'}Wework, B Narayanapura, Mahadevapura, Bengaluru 560016
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  aboutHero: { alignItems: 'center', paddingVertical: 28 },
  logo: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  credit: { textAlign: 'center', marginTop: 36, lineHeight: 17 },
});
