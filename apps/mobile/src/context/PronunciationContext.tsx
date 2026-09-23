import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PRONUNCIATION_SPEED, PRONUNCIATION_KINDS, PRONUNCIATION_SPEEDS,
  pronunciationRate, resolvePronunciationSpeeds,
} from '@amgi/core';
import type { PronunciationKind, PronunciationSpeed, PronunciationSpeeds } from '@amgi/core';

// The first key is the one that predates the split, and it is the term speed
// now — see `resolvePronunciationSpeeds`.
const SPEED_CACHE_KEYS: Record<PronunciationKind, string> = {
  term: 'amgi_pronunciation_speed',
  sentence: 'amgi_pronunciation_speed_sentence',
};

const DEFAULT_SPEEDS: PronunciationSpeeds = {
  term: DEFAULT_PRONUNCIATION_SPEED,
  sentence: DEFAULT_PRONUNCIATION_SPEED,
};

interface PronunciationContextType {
  /** What the user picked, per kind. Use for the settings selector. */
  speeds: PronunciationSpeeds;
  /** The playback multiplier for one kind — what `setPlaybackRate` wants. */
  rateFor: (kind: PronunciationKind) => number;
  setSpeed: (kind: PronunciationKind, s: PronunciationSpeed) => Promise<void>;
  options: typeof PRONUNCIATION_SPEEDS;
  kinds: typeof PRONUNCIATION_KINDS;
}

const PronunciationContext = createContext<PronunciationContextType>({
  speeds: DEFAULT_SPEEDS,
  rateFor: () => 1,
  setSpeed: async () => {},
  options: PRONUNCIATION_SPEEDS,
  kinds: PRONUNCIATION_KINDS,
});

/**
 * Device-local, like the theme and unlike study/native language. Those two live
 * on the account because they must follow the user to every device; a playback
 * rate is a property of the speakers you happen to be listening through.
 */
export function PronunciationProvider({ children }: { children: ReactNode }) {
  const [speeds, setSpeeds] = useState<PronunciationSpeeds>(DEFAULT_SPEEDS);

  useEffect(() => {
    AsyncStorage.multiGet([SPEED_CACHE_KEYS.term, SPEED_CACHE_KEYS.sentence]).then(([[, term], [, sentence]]) => {
      const resolved = resolvePronunciationSpeeds(term, sentence);
      setSpeeds(resolved);
      // Writing the fallback back is what makes it a one-time migration: an
      // unset sentence speed would otherwise follow the term speed forever.
      if (term && !sentence) {
        AsyncStorage.setItem(SPEED_CACHE_KEYS.sentence, resolved.sentence).catch(() => {});
      }
    });
  }, []);

  const setSpeed = async (kind: PronunciationKind, s: PronunciationSpeed) => {
    setSpeeds(prev => ({ ...prev, [kind]: s }));
    await AsyncStorage.setItem(SPEED_CACHE_KEYS[kind], s);
  };

  return (
    <PronunciationContext.Provider
      value={{
        speeds,
        rateFor: kind => pronunciationRate(speeds[kind]),
        setSpeed,
        options: PRONUNCIATION_SPEEDS,
        kinds: PRONUNCIATION_KINDS,
      }}
    >
      {children}
    </PronunciationContext.Provider>
  );
}

export function usePronunciation() {
  return useContext(PronunciationContext);
}
