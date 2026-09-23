'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_PRONUNCIATION_SPEED, PRONUNCIATION_KINDS, PRONUNCIATION_SPEEDS,
  pronunciationRate, resolvePronunciationSpeeds,
} from '@amgi/core';
import type { PronunciationKind, PronunciationSpeed, PronunciationSpeeds } from '@amgi/core';

// The first key is the one that predates the split, and it is the term speed
// now — see `resolvePronunciationSpeeds`.
const STORAGE_KEYS: Record<PronunciationKind, string> = {
  term: 'amgi-pronunciation-speed',
  sentence: 'amgi-pronunciation-speed-sentence',
};

const DEFAULT_SPEEDS: PronunciationSpeeds = {
  term: DEFAULT_PRONUNCIATION_SPEED,
  sentence: DEFAULT_PRONUNCIATION_SPEED,
};

function readStoredSpeeds(): PronunciationSpeeds {
  if (typeof window === 'undefined') return DEFAULT_SPEEDS;
  return resolvePronunciationSpeeds(
    localStorage.getItem(STORAGE_KEYS.term),
    localStorage.getItem(STORAGE_KEYS.sentence),
  );
}

const PronunciationContext = createContext<{
  /** What the user picked, per kind. Use for the settings selector. */
  speeds: PronunciationSpeeds;
  /** The playback multiplier for one kind — what `HTMLAudioElement.playbackRate` wants. */
  rateFor: (kind: PronunciationKind) => number;
  setSpeed: (kind: PronunciationKind, s: PronunciationSpeed) => void;
  options: typeof PRONUNCIATION_SPEEDS;
  kinds: typeof PRONUNCIATION_KINDS;
}>({
  speeds: DEFAULT_SPEEDS,
  rateFor: () => 1,
  setSpeed: () => {},
  options: PRONUNCIATION_SPEEDS,
  kinds: PRONUNCIATION_KINDS,
});

/**
 * Device-local, like the theme and unlike study/native language. Those two live
 * on the account because they must follow the user to every device; a playback
 * rate is a property of the speakers you happen to be listening through.
 */
export function PronunciationProvider({ children }: { children: React.ReactNode }) {
  const [speeds, setSpeeds] = useState<PronunciationSpeeds>(readStoredSpeeds);

  // Writes both on mount too, which is what makes the sentence speed's
  // fallback to the old key a one-time migration rather than a live link.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.term, speeds.term);
    localStorage.setItem(STORAGE_KEYS.sentence, speeds.sentence);
  }, [speeds]);

  return (
    <PronunciationContext.Provider
      value={{
        speeds,
        rateFor: kind => pronunciationRate(speeds[kind]),
        setSpeed: (kind, s) => setSpeeds(prev => ({ ...prev, [kind]: s })),
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
