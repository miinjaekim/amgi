import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  collectSavedTerms, countSavedPackTerms, getPackText, getPackTerms, getVocabPacks, t,
} from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { fetchAllUserFlashcards } from '../../../src/services/firestore';
import { useFloatingTabBarHeight } from '../../../src/components/FloatingTabBar';
import PageHeader from '../../../src/components/PageHeader';
import type { Palette } from '../../../src/theme';

export default function DecksScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage } = useUser();
  const packs = getVocabPacks(studyLanguage);
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => { if (!cancelled) setSavedTerms(collectSavedTerms(cards)); })
      .catch(() => {}); // progress is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* A tab root, so no back arrow — there is nothing behind it. The help
          button answers "what is a pack, and why is it separate from my
          cards?", which the list itself cannot. */}
      <PageHeader
        titleKey="decksTitle"
        helpTitleKey="helpPacksTitle"
        helpBodyKey="helpPacksBody"
      />

      {packs.length === 0 ? (
        // The tab is there for every language, so this state is reachable on
        // most of them. It says what a pack is rather than promising one:
        // nothing is committed to a date.
        <View style={s.emptyWrap}>
          <Text style={s.empty}>{t(nativeLanguage, 'decksEmpty')}</Text>
          <Text style={s.emptyBody}>{t(nativeLanguage, 'decksEmptyBody')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {packs.map(pack => {
            const total = getPackTerms(pack).length;
            const saved = savedTerms ? countSavedPackTerms(pack, savedTerms) : null;
            return (
              <TouchableOpacity
                key={pack.id}
                style={s.packRow}
                onPress={() => router.push(`/decks/${pack.id}`)}
              >
                <View style={s.packTitleRow}>
                  <Text style={s.packName}>{getPackText(pack.name, nativeLanguage)}</Text>
                  <Text style={s.packCount}>
                    {saved !== null
                      ? t(nativeLanguage, 'packsSaved', { added: saved, total })
                      : t(nativeLanguage, 'deckEntryCount', { count: total })}
                  </Text>
                </View>
                <Text style={s.packDesc}>{getPackText(pack.description, nativeLanguage)}</Text>
                {saved !== null && total > 0 && (
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${(saved / total) * 100}%` }]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    emptyWrap: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
    empty: { fontSize: 14, color: C.muted },
    emptyBody: { fontSize: 13, color: C.muted, opacity: 0.7, lineHeight: 19 },
    scroll: { paddingHorizontal: 20, paddingBottom: tabBarHeight, gap: 12 },
    packRow: { padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
    packTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
    packName: { fontSize: 16, fontWeight: '700', color: C.text, flexShrink: 1 },
    packCount: { fontSize: 12, color: C.muted },
    packDesc: { fontSize: 13, color: C.muted, marginTop: 4 },
    progressTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 12, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: C.highlight },
  });
}
