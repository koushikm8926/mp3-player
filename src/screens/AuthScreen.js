import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, PrimaryButton } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useSettings, useTheme } from '../context/SettingsContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Combined sign in / sign up screen.
 *
 * Registration is what populates the admin panel's user list, but the player itself works
 * without an account — hence the always-available "continue without an account" escape hatch.
 */
export function AuthScreen() {
  const theme = useTheme();
  const { t } = useSettings();
  const { signIn, signUp, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('login'); // login | register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const isRegister = mode === 'register';

  const validate = () => {
    const next = {};
    if (isRegister && name.trim().length < 2) next.name = t('nameRequired');
    if (!EMAIL_PATTERN.test(email.trim())) next.email = t('invalidEmail');
    if (password.length < 8) next.password = t('passwordTooShort');
    if (isRegister && password !== confirm) next.confirm = t('passwordsDoNotMatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    const result = isRegister
      ? await signUp(name, email, password)
      : await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.offline ? t('offlineNotice') : result.error);
    }
  };

  const skip = async () => {
    setGuestBusy(true);
    await continueAsGuest();
    setGuestBusy(false);
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setErrors({});
    setFormError(null);
  };

  return (
    <LinearGradient colors={theme.colors.gradient} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.logo, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="musical-notes" size={32} color={theme.colors.onAccent} />
          </View>

          <Text style={[theme.font.h1, { color: theme.colors.text, marginTop: 24 }]}>
            {isRegister ? t('createYourAccount') : t('welcomeBack')}
          </Text>
          <Text
            style={[theme.font.body, { color: theme.colors.textSecondary, marginTop: 6, marginBottom: 30 }]}
          >
            {isRegister ? t('authSubtitleRegister') : t('authSubtitleLogin')}
          </Text>

          {isRegister ? (
            <Field
              label={t('fullName')}
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
              textContentType="name"
            />
          ) : null}

          <Field
            label={t('email')}
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Field
            label={t('password')}
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            textContentType={isRegister ? 'newPassword' : 'password'}
          />

          {isRegister ? (
            <Field
              label={t('confirmPassword')}
              leftIcon="lock-closed-outline"
              value={confirm}
              onChangeText={setConfirm}
              error={errors.confirm}
              secureTextEntry
            />
          ) : null}

          {formError ? (
            <View
              style={[
                styles.banner,
                { backgroundColor: `${theme.colors.danger}1A`, borderRadius: theme.radius.sm },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
              <Text style={[theme.font.caption, { color: theme.colors.danger, marginLeft: 8, flex: 1 }]}>
                {formError}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label={isRegister ? t('signUp') : t('signIn')}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 6 }}
          />

          <Pressable onPress={switchMode} style={styles.switchRow} hitSlop={8}>
            <Text style={[theme.font.body, { color: theme.colors.textSecondary }]}>
              {isRegister ? t('alreadyHaveAccount') : t('noAccountYet')}{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>
                {isRegister ? t('signIn') : t('signUp')}
              </Text>
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          </View>

          <PrimaryButton
            label={t('continueAsGuest')}
            variant="outline"
            onPress={skip}
            loading={guestBusy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, flexGrow: 1 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 16 },
  switchRow: { alignItems: 'center', marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
