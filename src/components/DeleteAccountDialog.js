import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLibrary } from '../context/LibraryContext';
import { useSettings, useTheme } from '../context/SettingsContext';
import { Field } from './common';

/**
 * Final confirmation before an account is deleted.
 *
 * A centred dialog rather than a bottom Sheet: email accounts type their password here, and a
 * bottom sheet ends up hidden behind the keyboard.
 */
export function DeleteAccountDialog({ visible, needsPassword, email, loading, error, onCancel, onConfirm }) {
  const theme = useTheme();
  const { t } = useSettings();
  const library = useLibrary();
  const isDarkUI = Boolean(library?.adminMode) || theme.colors.isDark;
  const [password, setPassword] = useState('');

  // Never keep a typed password around once the dialog closes.
  useEffect(() => {
    if (!visible) setPassword('');
  }, [visible]);

  const cardBg = isDarkUI ? '#130E26' : theme.colors.backgroundElevated;
  const titleColor = isDarkUI ? '#FFFFFF' : theme.colors.text;
  const bodyColor = isDarkUI ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary;
  const canConfirm = !loading && (!needsPassword || password.length > 0);

  const confirm = () => {
    if (canConfirm) onConfirm(password);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.backdrop, { backgroundColor: isDarkUI ? 'rgba(0,0,0,0.75)' : theme.colors.overlay }]}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderRadius: theme.radius.xl }]}>
          <View style={styles.iconBadge}>
            <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
          </View>
          <Text style={[theme.font.h3, styles.centered, { color: titleColor }]}>
            {t('deleteAccountTitle')}
          </Text>
          <Text style={[theme.font.body, styles.centered, styles.body, { color: bodyColor }]}>
            {t('deleteAccountWarning')}
          </Text>

          {needsPassword ? (
            <Field
              testID="delete-account-password"
              style={styles.field}
              label={t('deleteAccountPasswordLabel', { email: email ?? '' })}
              leftIcon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={confirm}
              error={error}
            />
          ) : (
            <Text
              style={[
                theme.font.caption,
                styles.centered,
                styles.note,
                { color: error ? theme.colors.danger : bodyColor },
              ]}
            >
              {error ?? t('deleteAccountGoogleHint')}
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              testID="delete-account-cancel"
              accessibilityRole="button"
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.outline,
                {
                  borderColor: isDarkUI ? 'rgba(255, 255, 255, 0.15)' : theme.colors.border,
                  opacity: loading ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[theme.font.title, { color: titleColor }]}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              testID="delete-account-confirm"
              accessibilityRole="button"
              onPress={confirm}
              disabled={!canConfirm}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.colors.danger,
                  opacity: !canConfirm && !loading ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[theme.font.title, { color: '#FFFFFF' }]}>{t('deleteAccountConfirm')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { padding: 22 },
  iconBadge: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  centered: { textAlign: 'center' },
  body: { marginTop: 8, lineHeight: 20 },
  note: { marginTop: 16, lineHeight: 18 },
  field: { marginTop: 18, marginBottom: 0 },
  actions: { flexDirection: 'row', marginTop: 22, gap: 12 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  outline: { borderWidth: 1.5 },
});
