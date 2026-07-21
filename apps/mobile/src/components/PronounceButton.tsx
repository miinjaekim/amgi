import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { getPronunciationUrl } from '../services/gemini';
import { useTheme } from '../context/ThemeContext';

interface Props {
  text: string;
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

export default function PronounceButton({ text, studyLanguage, size = 'md', style }: Props) {
  const { C } = useTheme();
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
      const url = await getPronunciationUrl(text, studyLanguage);
      const player = createAudioPlayer({ uri: url });
      player.addListener('playbackStatusUpdate', s => {
        if (s.didJustFinish) player.remove();
      });
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
