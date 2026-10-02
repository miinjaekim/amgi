import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  PACK_BRIEF_LIMITS, getPackText, getStudyLangSide, t, userPackId,
  type PackBrief, type PackPurpose, type ProposedSubtopic, type SubtopicProposal, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { subscribeToAllUserFlashcards } from '../../../src/services/firestore';
import { createUserPack, proposePackSubtopics, startPackSubtopic } from '../../../src/services/userPacks';
import { useFloatingTabBarHeight } from '../../../src/components/FloatingTabBar';
import type { Palette } from '../../../src/theme';

const PURPOSES: { id: PackPurpose; label: TranslationKey; hint: TranslationKey }[] = [
  { id: 'goal', label: 'makePackPurposeGoal', hint: 'makePackPurposeGoalHint' },
  { id: 'struggle', label: 'makePackPurposeStruggle', hint: 'makePackPurposeStruggleHint' },
  { id: 'situation', label: 'makePackPurposeSituation', hint: 'makePackPurposeSituationHint' },
];

/**
 * Making a pack — mobile's counterpart to web's `/decks/new`, calling the same
 * routes: a few set questions, then the subtopics the model proposes. No level
 * question; the learner's saved cards answer it.
 */
export default function MakePackScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, interfaceLanguage, studyLanguage, deckNativeLanguage } = useUser();
  const [purpose, setPurpose] = useState<PackPurpose | null>(null);
  const [about, setAbout] = useState('');
  const [usage, setUsage] = useState('');
  const [material, setMaterial] = useState('');
  const [focus, setFocus] = useState('');
  const [proposal, setProposal] = useState<SubtopicProposal | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownTerms, setKnownTerms] = useState<string[]>([]);

  // What the learner already has: their level, and words not to suggest again.
  useEffect(() => {
    if (!user) return;
    return subscribeToAllUserFlashcards(
      user.uid,
      studyLanguage,
      cards => setKnownTerms(cards.map(c => getStudyLangSide(c)).filter(Boolean)),
      () => {},
    );
  }, [user, studyLanguage]);

  const brief = (): PackBrief | null =>
    purpose && about.trim() && usage.trim()
      ? {
          purpose,
          about: about.trim(),
          usage: usage.trim(),
          ...(material.trim() ? { material: material.trim() } : {}),
          ...(focus.trim() ? { focus: focus.trim() } : {}),
        }
      : null;

  const suggest = async () => {
    const b = brief();
    if (!b) return;
    setBusy(true);
    setError(null);
    try {
      const next = await proposePackSubtopics(b, studyLanguage, knownTerms);
      setProposal(next);
      setPicked(new Set(next.subtopics.map(sub => sub.id)));
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
    }
    setBusy(false);
  };

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name || !proposal) return;
    const id = `custom-${proposal.subtopics.length + 1}`;
    const part: ProposedSubtopic = {
      id,
      // The learner's own words, in whichever language they typed them.
      name: { English: name, Korean: name },
      estimatedWords: 20,
      searchHint: name,
    };
    setProposal({ ...proposal, subtopics: [...proposal.subtopics, part] });
    setPicked(new Set([...picked, id]));
    setCustom('');
  };

  const create = async () => {
    const b = brief();
    if (!b || !proposal || !user) return;
    const subtopics = proposal.subtopics.filter(sub => picked.has(sub.id));
    if (subtopics.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { id, subtopicIds } = await createUserPack(user, {
        brief: b,
        studyLanguage,
        nativeLanguage: deckNativeLanguage,
        name: proposal.name,
        description: proposal.description,
        level: proposal.level,
        subtopics,
      });
      // Each part is its own background job. Once the server has taken them
      // all, the learner is free to go; the pack screen shows the rest.
      await Promise.all(subtopicIds.map(sid => startPackSubtopic(user, id, sid, knownTerms)));
      // Replace, so Back from the new pack lands on Packs rather than on a
      // form that would make the same pack again.
      router.replace(`/decks/${userPackId(id)}`);
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
      setBusy(false);
    }
  };

  const header = (onBack: () => void, labelKey: TranslationKey) => (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} disabled={busy}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(interfaceLanguage, labelKey)}</Text>
    </View>
  );

  const primary = (labelKey: TranslationKey, busyKey: TranslationKey, onPress: () => void, disabled: boolean) => (
    <TouchableOpacity style={[s.primary, disabled && s.disabled]} onPress={onPress} disabled={disabled}>
      {busy && <ActivityIndicator color={C.bg} size="small" />}
      <Text style={s.primaryText}>{t(interfaceLanguage, busy ? busyKey : labelKey)}</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header(() => router.back(), 'decksBack')}
        <Text style={s.signIn}>{t(interfaceLanguage, 'makePackSignIn')}</Text>
      </SafeAreaView>
    );
  }

  const body = proposal ? (
    <>
      <Text style={s.title}>{getPackText(proposal.name, interfaceLanguage)}</Text>
      <Text style={s.intro}>{getPackText(proposal.description, interfaceLanguage)}</Text>
      {/* Shown before anything is searched, so a wrong guess about the learner
          costs a Back tap rather than a pack of wrong words. */}
      {proposal.level && (
        <Text style={s.level}>
          {t(interfaceLanguage, 'makePackLevel', {
            level: `${getPackText(proposal.level.summary, interfaceLanguage)} (${proposal.level.cefr})`,
          })}
        </Text>
      )}

      <Text style={s.partsTitle}>{t(interfaceLanguage, 'makePackPartsTitle')}</Text>
      <Text style={s.intro}>{t(interfaceLanguage, 'makePackPartsIntro')}</Text>

      <View style={s.parts}>
        {proposal.subtopics.map(sub => {
          const on = picked.has(sub.id);
          return (
            <TouchableOpacity
              key={sub.id}
              style={[s.part, on && s.partOn]}
              onPress={() => toggle(sub.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Text style={[s.check, on && s.checkOn]}>{on ? '✓' : ''}</Text>
              <View style={s.partBody}>
                <View style={s.partTitleRow}>
                  <Text style={s.partName}>{getPackText(sub.name, interfaceLanguage)}</Text>
                  <Text style={s.partCount}>
                    {t(interfaceLanguage, 'makePackPartWords', { count: sub.estimatedWords })}
                  </Text>
                </View>
                {sub.note && <Text style={s.partNote}>{getPackText(sub.note, interfaceLanguage)}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>{t(interfaceLanguage, 'makePackAddPart')}</Text>
      <View style={s.addRow}>
        <TextInput
          style={[s.input, s.addInput]}
          value={custom}
          onChangeText={setCustom}
          maxLength={80}
          placeholder={t(interfaceLanguage, 'makePackAddPartPlaceholder')}
          placeholderTextColor={C.muted}
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <TouchableOpacity style={[s.addBtn, !custom.trim() && s.disabled]} onPress={addCustom} disabled={!custom.trim()}>
          <Text style={s.addBtnText}>{t(interfaceLanguage, 'makePackAdd')}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.error}>{error}</Text>}
      {primary('makePackCreate', 'makePackCreating', create, busy || picked.size === 0)}
    </>
  ) : (
    <>
      <Text style={s.title}>{t(interfaceLanguage, 'makePackTitle')}</Text>
      <Text style={s.intro}>{t(interfaceLanguage, 'makePackIntro')}</Text>

      <Text style={s.label}>{t(interfaceLanguage, 'makePackPurpose')}</Text>
      <View style={s.purposes}>
        {PURPOSES.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.purpose, purpose === p.id && s.partOn]}
            onPress={() => setPurpose(p.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: purpose === p.id }}
          >
            <Text style={s.partName}>{t(interfaceLanguage, p.label)}</Text>
            <Text style={s.partNote}>{t(interfaceLanguage, p.hint)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>{t(interfaceLanguage, 'makePackAbout')}</Text>
      <TextInput
        style={[s.input, s.multiline]}
        value={about}
        onChangeText={setAbout}
        maxLength={PACK_BRIEF_LIMITS.about}
        multiline
        placeholder={purpose ? t(interfaceLanguage, PURPOSES.find(p => p.id === purpose)!.hint) : undefined}
        placeholderTextColor={C.muted}
      />

      <Text style={s.label}>{t(interfaceLanguage, 'makePackUsage')}</Text>
      <TextInput style={s.input} value={usage} onChangeText={setUsage} maxLength={PACK_BRIEF_LIMITS.usage} />

      <Text style={s.label}>{t(interfaceLanguage, 'makePackMaterial')}</Text>
      <TextInput
        style={[s.input, s.material]}
        value={material}
        onChangeText={setMaterial}
        maxLength={PACK_BRIEF_LIMITS.material}
        multiline
        placeholder={t(interfaceLanguage, 'makePackMaterialHint')}
        placeholderTextColor={C.muted}
      />

      <Text style={s.label}>{t(interfaceLanguage, 'makePackFocus')}</Text>
      <TextInput style={s.input} value={focus} onChangeText={setFocus} maxLength={PACK_BRIEF_LIMITS.focus} />

      {error && <Text style={s.error}>{error}</Text>}
      {primary('makePackSuggest', 'makePackSuggesting', suggest, busy || !brief())}
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {proposal
        ? header(() => setProposal(null), 'makePackBack')
        : header(() => router.back(), 'decksBack')}
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
    back: { fontSize: 24, color: C.muted, lineHeight: 26 },
    headerLabel: { fontSize: 14, color: C.muted },
    signIn: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, color: C.muted },
    scroll: { paddingHorizontal: 20, paddingBottom: tabBarHeight + 16 },
    title: { fontSize: 21, fontWeight: '700', color: C.text },
    intro: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
    level: { fontSize: 13, color: C.text, marginTop: 10 },
    partsTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 24 },
    label: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 22, marginBottom: 8 },

    purposes: { gap: 8 },
    purpose: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },

    input: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
      color: C.text, backgroundColor: C.surface,
    },
    multiline: { minHeight: 64, textAlignVertical: 'top' },
    material: { minHeight: 110, textAlignVertical: 'top' },

    parts: { gap: 8, marginTop: 14 },
    part: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12,
    },
    partOn: { borderColor: C.highlight, backgroundColor: C.surface },
    check: {
      width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: C.muted,
      textAlign: 'center', lineHeight: 18, fontSize: 13, color: C.bg, overflow: 'hidden',
    },
    checkOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    partBody: { flex: 1 },
    partTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
    partName: { fontSize: 15, color: C.text, flexShrink: 1 },
    partCount: { fontSize: 12, color: C.muted },
    partNote: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 17 },

    addRow: { flexDirection: 'row', gap: 8 },
    addInput: { flex: 1 },
    addBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 16, justifyContent: 'center',
    },
    addBtnText: { fontSize: 14, fontWeight: '600', color: C.text },

    error: { fontSize: 13, color: C.error, marginTop: 14 },
    primary: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
      backgroundColor: C.highlight, borderRadius: 12, paddingVertical: 14, marginTop: 28,
    },
    primaryText: { fontSize: 15, fontWeight: '700', color: C.bg },
    disabled: { opacity: 0.4 },
  });
}
