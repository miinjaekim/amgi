import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  DRILL_SIZES, advanceDrillQueue, drillAnswer, drillPrompt, drillSpokenText,
  getPackEntries, getPackText, getStudyLanguageConfig, getVocabPack, startDrillQueue, directionLabel, t,
} from '@amgi/core';
import type { DrillDirection, PackEntry } from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import PronounceButton from '../../../src/components/PronounceButton';
import type { Palette } from '../../../src/theme';

export default function DrillScreen() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { nativeLanguage, studyLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const pack = getVocabPack(studyLanguage, packId);

  const [direction, setDirection] = useState<DrillDirection>('studyToBack');
  const [size, setSize] = useState<number | null>(null);
  const [queue, setQueue] = useState<PackEntry[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<PackEntry[]>([]);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(nativeLanguage, 'drillBackToDeck')}</Text>
    </View>
  );

  // Every pack is drillable now that every pack is pre-authored — the check
  // that used to sit here excluded exactly the word lists this is most useful
  // for. Only a missing pack is an error.
  if (!pack) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <Text style={s.empty}>{t(nativeLanguage, 'deckNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const begin = (cards: readonly PackEntry[], sessionSize: number | null) => {
    const next = startDrillQueue(cards, sessionSize);
    setQueue(next);
    setAnswered(new Set());
    setMissed([]);
    setRevealed(false);
  };

  const grade = (knew: boolean) => {
    if (!queue) return;
    const current = queue[0];
    // Only the first miss counts — a card missed twice is still one card the
    // user didn't know, and the score claims "on the first try".
    if (!knew && !missed.some(c => c.study === current.study)) {
      setMissed(prev => [...prev, current]);
    }
    setAnswered(prev => new Set(prev).add(current.study));
    setQueue(advanceDrillQueue(queue, knew));
    setRevealed(false);
  };

  const entries = getPackEntries(pack);
  const sizeOptions = DRILL_SIZES.filter(option => option === null || option < entries.length);

  if (queue === null) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <ScrollView contentContainerStyle={s.centered}>
          <Text style={s.title}>{getPackText(pack.name, nativeLanguage)}</Text>

          <View style={s.pillRow}>
            {(['studyToBack', 'backToStudy'] as DrillDirection[]).map(dir => (
              <TouchableOpacity
                key={dir}
                onPress={() => setDirection(dir)}
                style={[s.pill, direction === dir && s.pillOn]}
              >
                <Text style={[s.pillText, direction === dir && s.pillTextOn]}>
                  {directionLabel(nativeLanguage, studyLanguage, dir === 'studyToBack' ? 'frontToBack' : 'backToFront')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sizeOptions.length > 1 && (
            <View style={s.pillRow}>
              {sizeOptions.map(option => (
                <TouchableOpacity
                  key={option ?? 'all'}
                  onPress={() => setSize(option)}
                  style={[s.pill, size === option && s.pillOn]}
                >
                  <Text style={[s.pillText, size === option && s.pillTextOn]}>
                    {option === null
                      ? t(nativeLanguage, 'drillSizeAll', { count: entries.length })
                      : t(nativeLanguage, 'drillSizeCards', { count: option })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={s.primaryBtn} onPress={() => begin(entries, size)}>
            <Text style={s.primaryBtnText}>{t(nativeLanguage, 'drillStart')}</Text>
          </TouchableOpacity>

          <Text style={s.note}>{t(nativeLanguage, 'drillNoProgress')}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (queue.length === 0) {
    const total = answered.size;
    const correct = total - missed.length;
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <ScrollView contentContainerStyle={s.centered}>
          <Text style={s.title}>{t(nativeLanguage, 'drillDoneTitle')}</Text>
          {/* Ending a drill before answering anything leaves nothing to score. */}
          {total > 0 && (
            <Text style={s.score}>
              {missed.length === 0
                ? t(nativeLanguage, 'drillScorePerfect', { total })
                : t(nativeLanguage, 'drillScore', { correct, total })}
            </Text>
          )}

          {missed.length > 0 && (
            <TouchableOpacity style={s.primaryBtn} onPress={() => begin(missed, null)}>
              <Text style={s.primaryBtnText}>
                {t(nativeLanguage, 'drillMissedAgain', { count: missed.length })}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.secondaryBtn} onPress={() => begin(entries, size)}>
            <Text style={s.secondaryBtnText}>{t(nativeLanguage, 'drillAgain')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const current = queue[0];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.sessionBar}>
        <Text style={s.remaining}>
          {t(nativeLanguage, 'drillRemaining', { count: queue.length })}
        </Text>
        <TouchableOpacity onPress={() => setQueue([])} hitSlop={12}>
          <Text style={s.endText}>{t(nativeLanguage, 'drillEnd')}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.prompt}>{drillPrompt(current, direction, studyLanguage, nativeLanguage)}</Text>
          {/* The answer and the pronounce button are always in the layout and
              only toggle visibility. Mounting them on reveal grew the card by a
              whole button, which pushed the grading row down — the answer text
              alone was never the thing that moved. */}
          <Text style={[s.answer, !revealed && s.hidden]}>
            {revealed ? drillAnswer(current, direction, studyLanguage, nativeLanguage) : ' '}
          </Text>
          {pack.pronounceable && (
            <View style={!revealed && s.hidden} pointerEvents={revealed ? 'auto' : 'none'}>
              <PronounceButton text={drillSpokenText(current)} studyLanguage={studyLanguage} />
            </View>
          )}
        </View>

        {revealed ? (
          <View style={s.gradeRow}>
            <TouchableOpacity style={[s.gradeBtn, s.secondaryBtn]} onPress={() => grade(false)}>
              <Text style={s.secondaryBtnText}>{t(nativeLanguage, 'drillMissed')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.gradeBtn, s.primaryBtn]} onPress={() => grade(true)}>
              <Text style={s.primaryBtnText}>{t(nativeLanguage, 'drillKnew')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.revealBtn} onPress={() => setRevealed(true)}>
            <Text style={s.revealBtnText}>{t(nativeLanguage, 'showAnswer')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
    back: { fontSize: 24, color: C.muted, lineHeight: 26 },
    headerLabel: { fontSize: 14, color: C.muted },
    empty: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, color: C.muted },
    centered: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
    title: { fontSize: 21, fontWeight: '700', color: C.highlight, textAlign: 'center', marginTop: 8 },
    score: { fontSize: 15, color: C.text, textAlign: 'center', marginTop: 12 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 },
    pill: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
    pillOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    pillText: { fontSize: 13, color: C.text },
    pillTextOn: { color: C.bg, fontWeight: '700' },
    primaryBtn: {
      backgroundColor: C.highlight, borderRadius: 10,
      paddingHorizontal: 24, paddingVertical: 13, marginTop: 20, alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
    secondaryBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 24, paddingVertical: 13, marginTop: 12, alignItems: 'center',
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '700', color: C.text },
    note: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 18 },
    sessionBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 12,
    },
    remaining: { fontSize: 13, color: C.muted },
    endText: { fontSize: 13, color: C.muted },
    body: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
    card: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20,
      paddingVertical: 36, paddingHorizontal: 20, alignItems: 'center', gap: 14,
    },
    prompt: { fontSize: 52, color: C.text, textAlign: 'center' },
    answer: { fontSize: 24, color: C.highlight, textAlign: 'center' },
    hidden: { opacity: 0 },
    gradeRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    gradeBtn: { flex: 1, marginTop: 12 },
    // paddingVertical and marginTop match the grading buttons below (13 + the
    // 4/12 the row splits between gradeRow and gradeBtn), so the reveal button
    // sits exactly where the grading pair will.
    revealBtn: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingVertical: 13, alignItems: 'center', marginTop: 16,
    },
    revealBtnText: { fontSize: 16, fontWeight: '700', color: C.text },
  });
}
