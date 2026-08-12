import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useSettings, useTheme } from '../context/SettingsContext';

/**
 * Branded splash shown while the library scan and session restore run.
 *
 * The native splash (expo-splash-screen) covers cold start; this screen covers the
 * asynchronous work that follows, so there is never a blank frame.
 */
export function SplashScreen({ statusLabel }) {
  const theme = useTheme();
  const { t } = useSettings();

  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scale, opacity, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <LinearGradient colors={theme.colors.gradient} style={styles.container}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: theme.colors.accent, transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.logo,
            { backgroundColor: theme.colors.accent, opacity, transform: [{ scale }] },
          ]}
        >
          <Ionicons name="musical-notes" size={44} color={theme.colors.onAccent} />
        </Animated.View>

        <Animated.View style={{ opacity, alignItems: 'center' }}>
          <Text style={[theme.font.h1, { color: theme.colors.text, marginTop: 28 }]}>
            {t('appName')}
          </Text>
          <Text
            style={[
              theme.font.body,
              { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
            ]}
          >
            {t('splashTagline')}
          </Text>
        </Animated.View>
      </View>

      <Text style={[theme.font.caption, styles.status, { color: theme.colors.textTertiary }]}>
        {statusLabel ?? t('loading')}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, width: 104, height: 104, borderRadius: 52, borderWidth: 2 },
  logo: { width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  status: { position: 'absolute', bottom: 48 },
});
