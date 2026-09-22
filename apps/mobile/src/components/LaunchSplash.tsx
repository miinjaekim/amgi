import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AmgiLogo from './AmgiLogo';

/**
 * Held from the first line of JS, so the native splash stays up through boot
 * rather than auto-hiding onto a blank frame. Module scope on purpose: by the
 * time any component mounts, iOS may already have taken it down.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (a fast refresh in development). Nothing to hold.
});

/** The splash's own colours — brand, not theme, since no theme is known yet. */
const BRAND_BG = '#173F35';
const BRAND_MARK = '#E9E0D2';

/**
 * Where the mark sits, matched to the native splash so the swap is invisible.
 *
 * `app.json` draws `splash-icon.png` 200 wide, and the mark fills 56% of that
 * canvas — the margin Android 12+ needs so its circular crop does not clip a
 * logo this wide. Change either number and the other, or the logo jumps at the
 * hand-off.
 */
const NATIVE_IMAGE_WIDTH = 200;
const MARK_SHARE = 0.56;

/**
 * The longest the splash is allowed to wait on `ready`.
 *
 * A branded pause is only professional while it is short. A device without a
 * cache waits on the server for first run, and on a weak signal that can take
 * up to `REQUEST_TIMEOUT_MS` — this lets go long before that and leaves the
 * skeletons to cover the rest.
 */
const MAX_HOLD_MS = 1500;

/**
 * The launch hand-off: the native splash, continued in JS, then animated away.
 *
 * iOS's native splash is a static image and cannot animate, so this draws the
 * identical frame over the app, takes the native one down underneath it, and
 * animates *this* instead. The mark gives a small inward beat, then swells and
 * fades as the green lifts off the app.
 *
 * `ready` is the caller's "enough is known to paint something true" — landing
 * mode and auth restored. The hand-off starts on whichever comes first, that
 * or `MAX_HOLD_MS`.
 *
 * Built on React Native's own `Animated` with the native driver rather than on
 * Reanimated: it is two values, opacity and scale, and nothing else in the app
 * uses Reanimated yet.
 */
export default function LaunchSplash({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);
  const backdrop = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(1)).current;
  const markScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (started.current || !(ready || timedOut)) return;
    started.current = true;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduceMotion => {
        if (cancelled) return;
        const lift = { toValue: 0, useNativeDriver: true } as const;
        const animation = reduceMotion
          // No movement, only the fade.
          ? Animated.timing(backdrop, { ...lift, duration: 250 })
          : Animated.sequence([
              Animated.timing(markScale, {
                toValue: 0.9, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true,
              }),
              Animated.parallel([
                Animated.timing(markScale, {
                  toValue: 1.8, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true,
                }),
                Animated.timing(markOpacity, {
                  ...lift, duration: 300, easing: Easing.in(Easing.quad),
                }),
                Animated.timing(backdrop, {
                  ...lift, duration: 380, delay: 80, easing: Easing.inOut(Easing.quad),
                }),
              ]),
            ]);
        animation.start(() => setDone(true));
      });

    return () => { cancelled = true; };
  }, [ready, timedOut, backdrop, markOpacity, markScale]);

  if (done) return null;

  return (
    <Animated.View
      // Drawn and laid out before the native splash comes down, so there is
      // never a frame with neither.
      onLayout={() => { SplashScreen.hide(); }}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { opacity: backdrop }]}
    >
      <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
        <AmgiLogo width={NATIVE_IMAGE_WIDTH * MARK_SHARE} color={BRAND_MARK} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BRAND_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
});
