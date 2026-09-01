import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PRONUNCIATION_SPEED, PRONUNCIATION_SPEEDS,
  parsePronunciationSpeed, pronunciationRate,
} from '@amgi/core';
import type { PronunciationSpeed } from '@amgi/core';

const SPEED_CACHE_KEY = 'amgi_pronunciation_speed';

interface PronunciationContextType {
  /** What the user picked. Use for the settings selector. */
  speed: PronunciationSpeed;
  /** The playback multiplier for `speed` — what `setPlaybackRate` wants. */
  rate: number;
  setSpeed: (s: PronunciationSpeed) => Promise<void>;
  speeds: typeof PRONUNCIATION_SPEEDS;
}

const PronunciationContext = createContext<PronunciationContextType>({
  speed: DEFAULT_PRONUNCIATION_SPEED,
  rate: 1,
  setSpeed: async () => {},
  speeds: PRONUNCIATION_SPEEDS,
});

/**
 * Device-local, like the theme and unlike study/native language. Those two live
 * on the account because they must follow the user to every device; a playback
 * rate is a property of the speakers you happen to be listening through.
 */
export function PronunciationProvider({ children }: { children: ReactNode }) {
  const [speed, setSpeedState] = useState<PronunciationSpeed>(DEFAULT_PRONUNCIATION_SPEED);

  useEffect(() => {
    AsyncStorage.getItem(SPEED_CACHE_KEY).then(saved => {
      if (saved) setSpeedState(parsePronunciationSpeed(saved));
    });
  }, []);

  const setSpeed = async (s: PronunciationSpeed) => {
    setSpeedState(s);
    await AsyncStorage.setItem(SPEED_CACHE_KEY, s);
  };

  return (
    <PronunciationContext.Provider
      value={{ speed, rate: pronunciationRate(speed), setSpeed, speeds: PRONUNCIATION_SPEEDS }}
    >
      {children}
    </PronunciationContext.Provider>
  );
}

export function usePronunciation() {
  return useContext(PronunciationContext);
}
