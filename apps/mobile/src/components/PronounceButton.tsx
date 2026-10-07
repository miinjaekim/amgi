import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getSpokenText, getStudyLanguageConfig } from '@amgi/core';
import type { PronunciationKind, StudyLanguage } from '@amgi/core';
import { getPronunciationUrl } from '../services/gemini';
import { useTheme } from '../context/ThemeContext';
import { usePronunciation } from '../context/PronunciationContext';

interface Props {
  text: string;
  /** Japanese kana reading, when the term has one — spoken instead of `text` */
  furigana?: string;
  /** A hanja's 음, spoken instead of the glyph. Required on the Hanja deck. */
  eum?: string;
  studyLanguage: StudyLanguage;
  /** `sentence` for running text — example sentences, Writing's rewrite. Picks the speed. */
  kind?: PronunciationKind;
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

export default function PronounceButton({ text, furigana, eum, studyLanguage, kind = 'term', size = 'md', style }: Props) {
  const { C } = useTheme();
  const rate = usePronunciation().rateFor(kind);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  // No voice configured for this language yet — don't render a button that
  // can only fail on click.
  const { ttsLanguageCode, ttsVoiceName } = getStudyLanguageConfig(studyLanguage);
  if (!text.trim() || !ttsLanguageCode || !ttsVoiceName) return null;

  // **On Hanja the button speaks the 음 or does not appear.** The glyph is not
  // the answer — 水 is 수 — and no surface should be able to hand a Korean
  // voice a Han character by forgetting to pass the reading. Requiring the 음
  // makes that a silent no-button rather than a confident mispronunciation, so
  // example sentences and translations on this deck simply have no button.
  if (studyLanguage === 'Hanja' && !eum?.trim()) return null;

  const handlePress = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await ensureAudioMode();
      const url = await getPronunciationUrl(getSpokenText(text, furigana, eum), studyLanguage);
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

  // An icon's box is its size exactly, where the emoji this replaced drew
  // larger than its font size. 17 and 20 keep the button the height the 14 and
  // 17 emoji made it, so the rows it sits in — the tightest is a 21pt example
  // line — are no taller than before.
  const iconSize = size === 'sm' ? 17 : 20;
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
        : <Ionicons name="volume-medium-outline" size={iconSize} color={color} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2, alignItems: 'center', justifyContent: 'center' },
});
