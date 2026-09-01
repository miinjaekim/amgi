'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_PRONUNCIATION_SPEED, PRONUNCIATION_SPEEDS,
  parsePronunciationSpeed, pronunciationRate,
} from '@amgi/core';
import type { PronunciationSpeed } from '@amgi/core';

const STORAGE_KEY = 'amgi-pronunciation-speed';

function readStoredSpeed(): PronunciationSpeed {
  if (typeof window === 'undefined') return DEFAULT_PRONUNCIATION_SPEED;
  return parsePronunciationSpeed(localStorage.getItem(STORAGE_KEY));
}

const PronunciationContext = createContext<{
  speed: PronunciationSpeed;
  /** The playback multiplier for `speed` — what `HTMLAudioElement.playbackRate` wants. */
  rate: number;
  setSpeed: (s: PronunciationSpeed) => void;
  speeds: typeof PRONUNCIATION_SPEEDS;
}>({
  speed: DEFAULT_PRONUNCIATION_SPEED,
  rate: 1,
  setSpeed: () => {},
  speeds: PRONUNCIATION_SPEEDS,
});

/**
 * Device-local, like the theme and unlike study/native language. Those two live
 * on the account because they must follow the user to every device; a playback
 * rate is a property of the speakers you happen to be listening through.
 */
export function PronunciationProvider({ children }: { children: React.ReactNode }) {
  const [speed, setSpeedState] = useState<PronunciationSpeed>(readStoredSpeed);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, speed);
  }, [speed]);

  return (
    <PronunciationContext.Provider
      value={{ speed, rate: pronunciationRate(speed), setSpeed: setSpeedState, speeds: PRONUNCIATION_SPEEDS }}
    >
      {children}
    </PronunciationContext.Provider>
  );
}

export function usePronunciation() {
  return useContext(PronunciationContext);
}
