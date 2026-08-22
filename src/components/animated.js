import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

/** Snappy but not twitchy: settles in ~180 ms with no visible overshoot wobble. */
export const PRESS_SPRING = { damping: 17, stiffness: 340, mass: 0.5 };
/** Used where something should overshoot on purpose, like an icon popping in. */
export const POP_SPRING = { damping: 11, stiffness: 260, mass: 0.6 };

/**
 * Pressable that dips under the finger and springs back on release.
 *
 * The dip is what separates a control that feels connected to the touch from one that just
 * changes colour a frame later. Runs entirely on the UI thread, so it stays smooth even while
 * the library scan is hammering the JS thread.
 *
 * `style` must be a plain style (not Pressable's style-as-function form) — the animated
 * transform is merged into it.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.94,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (event) => {
      pressed.value = 1;
      onPressIn?.(event);
    },
    [pressed, onPressIn]
  );

  const handlePressOut = useCallback(
    (event) => {
      pressed.value = 0;
      onPressOut?.(event);
    },
    [pressed, onPressOut]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * (1 - scaleTo), PRESS_SPRING) }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Pressable whose contents swing around and settle back — the ±10 s seek controls.
 *
 * The direction of the swing matches the direction of the jump, so the gesture reads as
 * "the track moved that way" rather than as a generic button press.
 */
export function PressableSpin({ children, style, degrees = 40, onPress, ...rest }) {
  const spin = useSharedValue(0);
  const pressed = useSharedValue(0);

  const handlePress = useCallback(
    (event) => {
      spin.value = withSequence(
        withTiming(1, { duration: 160 }),
        withSpring(0, { damping: 12, stiffness: 180 })
      );
      onPress?.(event);
    },
    [spin, onPress]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(1 - pressed.value * 0.12, PRESS_SPRING) },
      { rotate: `${spin.value * degrees}deg` },
    ],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPress={handlePress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Pops its children whenever `trigger` changes — used for the play/pause glyph so the state
 * change is felt, not just seen.
 */
export function PopOnChange({ trigger, children, style }) {
  const scale = useSharedValue(1);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    // Skip the very first run so the glyph does not pop as the screen opens.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scale.value = withSequence(withTiming(0.72, { duration: 90 }), withSpring(1, POP_SPRING));
  }, [trigger, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>;
}
