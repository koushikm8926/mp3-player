import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useSettings, useTheme } from '../context/SettingsContext';

const BAR_COUNT = 5;

/**
 * Branded splash shown while the library scan and session restore run.
 *
 * The native splash (expo-splash-screen) covers cold start; this screen covers the
 * asynchronous work that follows, so there is never a blank frame.
 */
export function SplashScreen({ statusLabel }) {
  const theme = useTheme();
  const { t } = useSettings();
  const { width, height } = useWindowDimensions();

  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bars = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.35))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();

    // Each bar breathes on its own offset so the equaliser reads as motion, not a pulse.
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 110),
          Animated.timing(bar, {
            toValue: 1,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.35,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [scale, opacity, bars]);

  // The wave sits just below the midpoint, sweeping up to the right like the reference.
  const waveTop = height * 0.52;
  const WAVE_HEIGHT = 220;

  // The crest is kept as its own open path: stroking the closed fill path would also draw
  // the rectangle's bottom and side edges as visible seams.
  const crest = useMemo(() => {
    const w = width;
    return `M0,60 C${w * 0.22},10 ${w * 0.42},96 ${w * 0.66},52 C${w * 0.84},20 ${w * 0.94},34 ${w},22`;
  }, [width]);
  const wavePath = `${crest} L${width},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`;

  const deep = theme.colors.isDark ? theme.colors.background : theme.colors.accentDark;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundElevated }]}>
      {/* Lower band: the deep accent field the wave rises out of. */}
      {/* Starts on the accent so it meets the wave's fill with no visible seam. */}
      <LinearGradient
        colors={[theme.colors.accent, deep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[styles.lowerBand, { top: waveTop + WAVE_HEIGHT - 1 }]}
      />

      <View
        style={[styles.wave, { top: waveTop, width, height: WAVE_HEIGHT }]}
        pointerEvents="none"
      >
        <Svg width={width} height={WAVE_HEIGHT} viewBox={`0 0 ${width} ${WAVE_HEIGHT}`}>
          <Path d={wavePath} fill={theme.colors.accent} />
          <Path
            d={crest}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.4}
            strokeWidth={1.5}
            transform="translate(0,-11)"
          />
        </Svg>
      </View>

      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.logoRing, { borderColor: theme.colors.accent }]}>
          <View style={styles.logoBars}>
            {[10, 18, 26, 18, 12].map((barHeight, index) => (
              <View
                key={index}
                style={{
                  width: 2.5,
                  height: barHeight,
                  borderRadius: 2,
                  marginHorizontal: 1.5,
                  backgroundColor: theme.colors.accent,
                }}
              />
            ))}
          </View>
          <Ionicons
            name="musical-note"
            size={54}
            color={theme.colors.accent}
            style={styles.logoNote}
          />
        </View>

        <Text style={[theme.font.display, { color: theme.colors.text, marginTop: 26 }]}>
          {t('appName')}
        </Text>
        <Text
          style={[
            theme.font.caption,
            { color: theme.colors.accent, marginTop: 8, letterSpacing: 4, fontWeight: '700' },
          ]}
        >
          {t('splashTagline').toUpperCase()}
        </Text>
      </Animated.View>

      <View style={styles.status}>
        <View style={styles.statusBars}>
          {bars.map((bar, index) => (
            <Animated.View
              key={index}
              style={{
                width: 4,
                height: 26,
                borderRadius: 3,
                marginHorizontal: 3,
                backgroundColor: '#FFFFFF',
                transform: [{ scaleY: bar }],
              }}
            />
          ))}
        </View>
        <Text style={[theme.font.body, { color: '#FFFFFF', opacity: 0.9, marginTop: 16 }]}>
          {statusLabel ?? t('loading')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lowerBand: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wave: { position: 'absolute', left: 0 },
  center: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBars: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 22 },
  logoNote: { position: 'absolute', right: 24, top: 30 },
  status: { position: 'absolute', left: 0, right: 0, bottom: 70, alignItems: 'center' },
  statusBars: { flexDirection: 'row', alignItems: 'center', height: 30 },
});
