import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import APP_LOGO from '../../assets/app-logo.png';
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
  const {
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    continueAsGuest,
    googleReady,
    firebaseReady,
  } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('login'); // login | register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const isRegister = mode === 'register';

  /** Auth actions return a translation key so this screen owns all user-facing copy. */
  const report = (result) => {
    if (result.ok || result.cancelled) return;
    setFormError(t(result.errorKey ?? 'signInFailed'));
  };

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
    setNotice(null);
    if (!validate()) return;
    setBusy(true);
    const result = isRegister
      ? await signUp(name, email, password)
      : await signIn(email, password);
    setBusy(false);
    report(result);
  };

  const google = async () => {
    setFormError(null);
    setNotice(null);
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    report(result);
  };

  /** Password reset only needs the email field, so it validates just that one. */
  const forgotPassword = async () => {
    setFormError(null);
    setNotice(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setErrors({ email: t('invalidEmail') });
      return;
    }
    const result = await resetPassword(email);
    if (result.ok) setNotice(t('resetEmailSent'));
    else report(result);
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
    setNotice(null);
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
          <View style={styles.logo}>
            <Image source={APP_LOGO} style={styles.logoImage} contentFit="cover" />
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

          {!isRegister ? (
            <Pressable onPress={forgotPassword} hitSlop={8} style={styles.forgotRow}>
              <Text style={[theme.font.caption, { color: theme.colors.accent }]}>
                {t('forgotPassword')}
              </Text>
            </Pressable>
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

          {notice ? (
            <View
              style={[
                styles.banner,
                { backgroundColor: `${theme.colors.success}1A`, borderRadius: theme.radius.sm },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
              <Text style={[theme.font.caption, { color: theme.colors.success, marginLeft: 8, flex: 1 }]}>
                {notice}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label={isRegister ? t('signUp') : t('signIn')}
            onPress={submit}
            loading={busy}
            disabled={!firebaseReady}
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
            <Text style={[theme.font.caption, { color: theme.colors.textTertiary, marginHorizontal: 12 }]}>
              {t('or')}
            </Text>
            <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
          </View>

          <Pressable
            onPress={google}
            disabled={!googleReady || googleBusy}
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                opacity: !googleReady ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {googleBusy ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <>
                <GoogleGlyph />
                <Text style={[theme.font.title, { color: theme.colors.text, marginLeft: 10 }]}>
                  {t('continueWithGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          <PrimaryButton
            label={t('continueAsGuest')}
            variant="outline"
            onPress={skip}
            loading={guestBusy}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/** Google's four-colour "G", drawn inline so the button needs no bundled asset. */
function GoogleGlyph({ size = 19 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, flexGrow: 1 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 16 },
  forgotRow: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  switchRow: { alignItems: 'center', marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
  },
});
