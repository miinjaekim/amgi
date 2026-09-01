import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getSpokenText, getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { getPronunciationUrl } from '../services/gemini';
import { useTheme } from '../context/ThemeContext';
import { usePronunciation } from '../context/PronunciationContext';

interface Props {
  text: string;
  /** Japanese kana reading, when the term has one — spoken instead of `text` */
  furigana?: string;
  studyLanguage: StudyLanguage;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

// Play through the earpiece/speaker even when the ringer switch is silenced —
// otherwise pronunciation is inaudible on a phone that's set to silent.
let audioModeReady: Promise<void> | null = null;
function ensureAudioMode() {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }
  return audioModeReady;
}

export default function PronounceButton({ text, furigana, studyLanguage, size = 'md', style }: Props) {
  const { C } = useTheme();
  const { rate } = usePronunciation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // No voice configured for this language yet — don't render a button that
  // can only fail on click.
  const { ttsLanguageCode, ttsVoiceName } = getStudyLanguageConfig(studyLanguage);
  if (!text.trim() || !ttsLanguageCode || !ttsVoiceName) return null;

  const handlePress = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await ensureAudioMode();
      const url = await getPronunciationUrl(getSpokenText(text, furigana), studyLanguage);
      const player = createAudioPlayer({ uri: url });
      player.addListener('playbackStatusUpdate', s => {
        if (s.didJustFinish) player.remove();
      });
      // Time-stretch rather than resample. Without pitch correction a slowed
      // clip also drops in pitch, which stops sounding like a careful speaker
      // and starts sounding like the wrong voice. Set before play() so the
      // first moment of audio is already at the chosen speed.
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(rate, 'high');
      player.play();
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  const fontSize = size === 'sm' ? 14 : 17;
  const color = status === 'error' ? C.error : C.muted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={status === 'loading'}
      style={[styles.btn, style]}
      accessibilityLabel="Play pronunciation"
      hitSlop={8}
    >
      {status === 'loading'
        ? <ActivityIndicator size="small" color={C.muted} />
        : <Text style={{ fontSize, color }}>🔊</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2, alignItems: 'center', justifyContent: 'center' },
});
