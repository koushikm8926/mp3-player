import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSettings, useTheme } from '../context/SettingsContext';
import { Field, PrimaryButton } from './common';

/**
 * Text-input dialog.
 *
 * `Alert.prompt` is iOS-only, so anything that needs typed input on Android (renaming a
 * playlist, a custom sleep-timer duration) goes through this instead.
 */
export function PromptDialog({
  visible,
  title,
  message,
  label,
  placeholder,
  initialValue = '',
  confirmLabel,
  keyboardType,
  onConfirm,
  onClose,
  validate,
}) {
  const theme = useTheme();
  const { t } = useSettings();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const submit = () => {
    const validationError = validate?.(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    onConfirm(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.radius.lg },
          ]}
        >
          <Text style={[theme.font.h3, { color: theme.colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 6 }]}>
              {message}
            </Text>
          ) : null}

          <Field
            label={label}
            placeholder={placeholder}
            value={value}
            onChangeText={(next) => {
              setValue(next);
              setError(null);
            }}
            error={error}
            keyboardType={keyboardType}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            style={{ marginTop: 18, marginBottom: 8 }}
          />

          <View style={styles.actions}>
            <PrimaryButton
              label={t('cancel')}
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 10 }}
            />
            <PrimaryButton
              label={confirmLabel ?? t('save')}
              onPress={submit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, padding: 22 },
  actions: { flexDirection: 'row', marginTop: 6 },
});
