import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/common';
import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { createBackup, pickAndRestoreBackup, shareBackup } from '../services/backup';
import { formatDateTime } from '../utils/format';
import { Header } from './EqualizerScreen';

/** Export the user's data to a JSON file, or restore it from one. */
export function BackupRestoreScreen({ navigation }) {
  const theme = useTheme();
  const { t, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const library = useLibrary();

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const backup = async () => {
    setBackingUp(true);
    try {
      const result = await createBackup();
      update('lastBackupAt', result.createdAt);
      const shared = await shareBackup(result.uri);
      if (!shared) {
        Alert.alert(t('backupCreated'), result.uri);
      }
    } catch (error) {
      Alert.alert(t('backupFailed'), String(error?.message ?? error));
    } finally {
      setBackingUp(false);
    }
  };

  const restore = () => {
    Alert.alert(t('restoreBackup'), t('restoreConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('restoreBackup'),
        style: 'destructive',
        onPress: async () => {
          setRestoring(true);
          try {
            const result = await pickAndRestoreBackup();
            if (result.canceled) return;
            if (!result.ok) {
              Alert.alert(t('restoreFailed'));
              return;
            }
            // Overlays changed underneath the library, so a full reload is required.
            await library.refresh();
            Alert.alert(t('restoreSuccess'));
          } catch (error) {
            Alert.alert(t('restoreFailed'), String(error?.message ?? error));
          } finally {
            setRestoring(false);
          }
        },
      },
    ]);
  };

  const summary = [
    { icon: 'albums-outline', label: t('playlists'), value: library.playlists.length },
    { icon: 'heart-outline', label: t('favorites'), value: library.favoriteTracks.length },
    { icon: 'eye-off-outline', label: t('hiddenMusic'), value: library.hiddenItems.length },
    { icon: 'time-outline', label: t('recentlyPlayed'), value: library.recentTracks.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <Header title={t('backupRestore')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={[theme.font.body, { color: theme.colors.textSecondary, lineHeight: 21 }]}>
          {t('backupDescription')}
        </Text>

        <View
          style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
        >
          {summary.map((item) => (
            <View key={item.label} style={styles.summaryRow}>
              <Ionicons name={item.icon} size={19} color={theme.colors.textSecondary} style={{ width: 30 }} />
              <Text style={[theme.font.body, { color: theme.colors.text, flex: 1 }]}>{item.label}</Text>
              <Text style={[theme.font.title, { color: theme.colors.accent }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[theme.font.caption, { color: theme.colors.textTertiary, marginTop: 16 }]}>
          {settings.lastBackupAt
            ? t('lastBackup', { date: formatDateTime(settings.lastBackupAt) })
            : t('neverBackedUp')}
        </Text>

        <PrimaryButton
          label={t('createBackup')}
          icon="cloud-upload-outline"
          onPress={backup}
          loading={backingUp}
          style={{ marginTop: 24 }}
        />
        <PrimaryButton
          label={t('restoreBackup')}
          icon="cloud-download-outline"
          variant="outline"
          onPress={restore}
          loading={restoring}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20, paddingVertical: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
});
