import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/common';
import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { HIDDEN_KIND } from '../db/repositories';
import { Header } from './EqualizerScreen';
import { Section } from './SettingsScreen';

/** Manage tracks and folders that are excluded from the library. */
export function HiddenMusicScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  const { hiddenItems, unhide, unhideAll } = useLibrary();

  const tracks = hiddenItems.filter((item) => item.kind === HIDDEN_KIND.TRACK);
  const folders = hiddenItems.filter((item) => item.kind === HIDDEN_KIND.FOLDER);

  const confirmUnhideAll = () => {
    Alert.alert(t('hiddenMusic'), t('excludedFromLibrary'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('unhideTrack'), onPress: unhideAll },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Header
        title={t('hiddenMusic')}
        onBack={() => navigation.goBack()}
        right={
          hiddenItems.length > 0 ? (
            <Pressable onPress={confirmUnhideAll} hitSlop={10}>
              <Text style={[theme.font.body, { color: theme.colors.accent }]}>{t('clear')}</Text>
            </Pressable>
          ) : null
        }
      />

      {hiddenItems.length === 0 ? (
        <EmptyState icon="eye-off-outline" title={t('emptyHiddenTitle')} body={t('emptyHiddenBody')} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          <Text style={[theme.font.caption, styles.note, { color: theme.colors.textSecondary }]}>
            {t('excludedFromLibrary')}
          </Text>

          {folders.length > 0 ? (
            <Section title={t('hiddenFolders')}>
              {folders.map((item) => (
                <HiddenRow
                  key={`${item.kind}-${item.value}`}
                  icon="folder-outline"
                  title={item.label || item.value}
                  subtitle={item.value}
                  onUnhide={() => unhide(item.kind, item.value)}
                />
              ))}
            </Section>
          ) : null}

          {tracks.length > 0 ? (
            <Section title={t('hiddenTracks')}>
              {tracks.map((item) => (
                <HiddenRow
                  key={`${item.kind}-${item.value}`}
                  icon="musical-note-outline"
                  title={item.label || item.value}
                  onUnhide={() => unhide(item.kind, item.value)}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function HiddenRow({ icon, title, subtitle, onUnhide }) {
  const theme = useTheme();
  const { t } = useSettings();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} style={{ width: 30 }} />
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text numberOfLines={1} style={[theme.font.body, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[theme.font.tiny, { color: theme.colors.textTertiary, marginTop: 3 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={onUnhide} hitSlop={8}>
        <Text style={[theme.font.caption, { color: theme.colors.accent }]}>{t('unhideTrack')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: 20, paddingTop: 6, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13 },
});
