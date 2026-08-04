import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Placeholder bars in the shape of the thing being fetched.
 *
 * A spinner says "wait" and nothing else. A skeleton says what is coming, holds
 * the space it will need so nothing jumps when it lands, and makes a cold
 * launch look like the app rather than like a blank screen with a wheel on it.
 * Not for buttons: a control you just pressed should spin, because there the
 * question is whether the press registered, not what will appear.
 */

// One animation drives every bar on screen. Per-bar loops start at whatever
// moment their component mounts and drift apart within seconds, which turns a
// calm pulse into a screen full of things blinking independently.
const pulse = new Animated.Value(0);
let mounted = 0;
let loop: Animated.CompositeAnimation | null = null;

function useSharedPulse(): Animated.Value {
  useEffect(() => {
    mounted += 1;
    if (mounted === 1) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: true }),
      ]));
      loop.start();
    }
    return () => {
      mounted -= 1;
      // Nothing left to animate: stop rather than leave a native-thread loop
      // running for the rest of the session behind whatever replaced it.
      if (mounted === 0) {
        loop?.stop();
        loop = null;
        pulse.setValue(0);
      }
    };
  }, []);
  return pulse;
}

/**
 * Read once on mount rather than subscribed to. The setting is a system-level
 * one people change in Settings and not mid-launch, and a loading placeholder
 * that outlives the fetch by long enough to matter is already a bug.
 */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(on => { if (alive) setReduce(on); })
      .catch(() => { /* Animate; a pulse is the lesser risk than no feedback. */ });
    return () => { alive = false; };
  }, []);
  return reduce;
}

interface SkeletonBarProps {
  /** Defaults to filling the row — most bars stand in for a full-width line. */
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** One placeholder line. Size it from the real text it stands in for. */
export function SkeletonBar({ width = '100%', height = 14, style }: SkeletonBarProps) {
  const { C } = useTheme();
  const value = useSharedPulse();
  const reduceMotion = useReduceMotion();
  const s = useMemo(() => makeStyles(C.border), [C.border]);

  const opacity = reduceMotion
    ? 0.5
    : value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={[s.bar, { width, height, borderRadius: height >= 20 ? 8 : 6, opacity }, style]}
      // One label for the block, not one per bar: a screen reader announcing
      // "loading" six times is worse than the spinner this replaces.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

interface SkeletonGroupProps {
  /** What a reader is waiting for, announced once for the whole block. */
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Wraps a set of bars so assistive tech hears one "loading", not a dozen. */
export function SkeletonGroup({ label, children, style }: SkeletonGroupProps) {
  return (
    <View style={style} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {children}
    </View>
  );
}

/**
 * Repeats a row shape. Takes a render function rather than a count of bars,
 * because every list here has a different row and a generic one would fit none
 * of them — the whole value of a skeleton is that it is the right shape.
 */
export function SkeletonRows({ count, render }: { count: number; render: (index: number) => React.ReactNode }) {
  return <>{Array.from({ length: count }, (_, i) => <React.Fragment key={i}>{render(i)}</React.Fragment>)}</>;
}

function makeStyles(barColor: string) {
  return StyleSheet.create({
    bar: { backgroundColor: barColor },
  });
}
