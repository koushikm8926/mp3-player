import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/common';
import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';

/** Explains why media access is needed before Android shows the system dialog. */
export function PermissionScreen() {
  const theme = useTheme();
  const { t } = useSettings();
  const { requestPermission, permission } = useLibrary();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const blocked = permission === 'denied';

  const ask = async () => {
    setBusy(true);
    await requestPermission();
    setBusy(false);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: theme.colors.accentMuted }]}>
          <Ionicons name="folder-open-outline" size={40} color={theme.colors.accent} />
        </View>

        <Text style={[theme.font.h2, { color: theme.colors.text, textAlign: 'center', marginTop: 26 }]}>
          {blocked ? t('permissionDenied') : t('permissionTitle')}
        </Text>
        <Text
          style={[
            theme.font.body,
            {
              color: theme.colors.textSecondary,
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 21,
            },
          ]}
        >
          {blocked ? t('permissionDeniedBody') : t('permissionBody')}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={blocked ? t('openSettings') : t('grantPermission')}
          onPress={blocked ? () => Linking.openSettings() : ask}
          loading={busy}
        />
        {blocked ? (
          <PrimaryButton
            label={t('retry')}
            variant="outline"
            onPress={ask}
            style={{ marginTop: 10 }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actions: { paddingBottom: 8 },
});
