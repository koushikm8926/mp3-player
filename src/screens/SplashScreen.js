import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import APP_LOGO from '../../assets/app-logo.png';
import { useSettings, useTheme } from '../context/SettingsContext';

const BAR_COUNT = 5;
const WAVE_HEIGHT = 220;
/** Points sampled per sine cycle. 32 is already past the point where segments are visible. */
const WAVE_SEGMENTS = 32;

/**
 * Two identical sine cycles laid side by side across `width * 2`.
 *
 * Because the strip repeats every `width`, sliding it left by exactly one width lands on a
 * frame identical to the start — so the drift can loop forever with no seam or snap-back.
 */
function buildWave(width, amplitude, baseline) {
  const step = width / WAVE_SEGMENTS;
  const points = [];
  for (let i = 0; i <= WAVE_SEGMENTS * 2; i++) {
    const y = baseline + amplitude * Math.sin((i / WAVE_SEGMENTS) * Math.PI * 2);
    points.push(`${(i * step).toFixed(2)},${y.toFixed(2)}`);
  }
  const crest = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')}`;
  return {
    crest,
    // The fill closes the crest down the sides to the bottom of the band.
    fill: `${crest} L${(width * 2).toFixed(2)},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`,
  };
}

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
  const driftFront = useRef(new Animated.Value(0)).current;
  const driftBack = useRef(new Animated.Value(0)).current;

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

    // The two crests travel at different speeds, so they drift in and out of phase and the
    // band keeps weaving instead of sliding as one rigid shape. Linear easing only — any
    // acceleration curve would show up as a stutter at the loop boundary.
    const drift = (value, duration) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

    loops.push(drift(driftFront, 7000), drift(driftBack, 11000));
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [scale, opacity, bars, driftFront, driftBack]);

  // The wave sits just below the midpoint, sweeping up to the right like the reference.
  const waveTop = height * 0.52;

  const front = useMemo(() => buildWave(width, 22, 62), [width]);
  const back = useMemo(() => buildWave(width, 15, 84), [width]);

  const slide = (value) => ({
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) },
    ],
  });

  const deep = theme.colors.isDark ? theme.colors.background : theme.colors.accentDark;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundElevated }]}>
      {/* Lower band: the deep accent field the wave rises out of.
          The sweep is strictly vertical and holds the wave's own accent for the first slice,
          so the band's top edge is the same colour all the way across and the join with the
          wave fill above it is invisible. A diagonal sweep would darken one end of that edge
          and draw a visible seam. */}
      <LinearGradient
        colors={[theme.colors.accent, theme.colors.accent, deep]}
        locations={[0, 0.14, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.lowerBand, { top: waveTop + WAVE_HEIGHT - 1 }]}
      />

      <View
        style={[styles.wave, { top: waveTop, width, height: WAVE_HEIGHT }]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.strip, slide(driftBack)]}>
          <Svg width={width * 2} height={WAVE_HEIGHT}>
            <Path d={back.fill} fill={theme.colors.accent} fillOpacity={0.45} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.strip, slide(driftFront)]}>
          <Svg width={width * 2} height={WAVE_HEIGHT}>
            <Path d={front.fill} fill={theme.colors.accent} />
            {/* The crest is kept as its own open path: stroking the closed fill path would
                also draw the rectangle's bottom and side edges as visible seams. */}
            <Path
              d={front.crest}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              transform="translate(0,-11)"
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.logoRing, { borderColor: theme.colors.accent }]}>
          <Image source={APP_LOGO} style={styles.logoImage} contentFit="cover" />
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
  wave: { position: 'absolute', left: 0, overflow: 'hidden' },
  strip: { position: 'absolute', left: 0, top: 0 },
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  status: { position: 'absolute', left: 0, right: 0, bottom: 70, alignItems: 'center' },
  statusBars: { flexDirection: 'row', alignItems: 'center', height: 30 },
});
