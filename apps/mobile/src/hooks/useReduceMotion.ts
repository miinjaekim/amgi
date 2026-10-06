import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the system asks for reduced motion.
 *
 * Read once on mount rather than subscribed to. The setting is a system-level
 * one people change in Settings and not mid-screen, and the animations that ask
 * are short enough that the next mount picking it up is soon enough.
 *
 * Starts false and stays false if the read fails: animating is the lesser risk
 * than no feedback.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(on => { if (alive) setReduce(on); })
      .catch(() => { /* Animate. */ });
    return () => { alive = false; };
  }, []);
  return reduce;
}
