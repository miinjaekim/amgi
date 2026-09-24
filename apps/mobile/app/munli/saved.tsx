import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { conjugationSpec, daysUntil, getStudyLanguageConfig, listSavedKinds, setEnrolled, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import ParadigmTable from '../../src/components/ParadigmTable';
import PageHeader, { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../src/components/PageHeader';
import MunliLanguageChip from '../../src/components/MunliLanguageChip';
import type { Palette } from '../../src/theme';

/**
 * Saved — an inventory of what you have taken on, and where you take it back out.
 *
 * ⚠️ **Tiles on shelves, not a list of rows**, on the user's call after using
 * the list: *"the saved tab should have verbs as tiles like items in an
 * inventory … an inventory of grammar tools used for challenges in
 * communication"*. Three levels — **kind → item → detail** — which is the split
 * Topics already makes between regular and irregular, mirrored here so the
 * catalogue and the inventory describe one set the same way.
 *
 * ⚠️ **The detail is where a tense gets explained.** A chip selects one tense,
 * the table shows that tense, and under it is a **sourced** note on what the
 * tense is for — tiered and cited in
 * `docs/packs/french-tense-notes-draft.md`, because when a French speaker
 * reaches for the imparfait is a claim about French and not a thing to
 * generate.
 *
 * ⚠️ **Removing is a button, not the chip.** On Topics a pill both shows and
 * toggles enrolment; here the chip's job is to choose what you are reading, so
 * the destructive action needs a control of its own rather than the same tap
 * meaning two things on two screens.
 *
 * Levels are local state rather than routes, the way Practice's stages are —
 * and a nested route per level is what makes expo-router draw a tab icon per
 * screen unless a `Stack` is put behind the tab.
 */
export default function SavedScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { progress, enrolment, setEnrolment, loading } = useConjugation();
  const spec = conjugationSpec(studyLanguage);

  const [openKind, setOpenKind] = useState<string | null>(null);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  /** `null` reads as "the first tense worth opening" — see `shownTense`. */
  const [chosenTense, setChosenTense] = useState<string | null>(null);

  const shelves = useMemo(
    () => (spec && enrolment ? listSavedKinds(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );
  const shelf = shelves.find(x => x.kind === openKind);
  const subject = shelf?.subjects.find(x => x.key === openSubject);
  /**
   * Which tense the detail opens on: the first with something due, else the
   * first saved. A screen you opened to practise from should not make you find
   * the work.
   */
  const shownTense = subject
    ? chosenTense ?? (subject.tenses.find(x => x.due > 0) ?? subject.tenses[0])?.tenseId
    : undefined;
  const tense = subject?.tenses.find(x => x.tenseId === shownTense);
  const specTense = spec?.tenses.find(x => x.id === shownTense);

  const header = (title: string, onBack: () => void) => (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} hitSlop={10} accessibilityRole="button"
                        accessibilityLabel={t(interfaceLanguage, 'practiceBack')}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <MunliLanguageChip />
    </View>
  );

  /** One tile. A name, what is in it, and what is owed. */
  const tile = (key: string, label: string, sub: string, due: number, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      style={s.tile}
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={() => { onPress(); setChosenTense(null); }}
    >
      <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.tileSub} numberOfLines={1}>{sub}</Text>
      <Text style={[s.tileDue, due > 0 && s.tileDueOn]}>
        {due > 0
          ? t(interfaceLanguage, 'conjugationDue', { count: due })
          : t(interfaceLanguage, 'practiceNothingDue')}
      </Text>
    </TouchableOpacity>
  );

  /**
   * ⚠️ **Nothing here may paint before the snapshot lands.**
   *
   * `users/{uid}` is subscribed to, not fetched, so `conjugation` is
   * `undefined` until the first snapshot — and both fallbacks for that are
   * *plausible*: `normalizeEnrolment` returns the default practice set, and an
   * empty progress map reads as everything due. A surface that rendered
   * through the window would show five patterns nobody saved, all of them
   * owed.
   *
   * ⚠️ **On a surface that writes, it is worse than a wrong picture.**
   * `setEnrolled` takes the enrolment it is handed, so a tap during the window
   * would write *default plus that change* over the real saved set. That is
   * data loss, from a control that looked ready.
   *
   * The window is one round trip, and it was invisible until the 2026-09-22
   * launch work began painting before the server answered. It was always here.
   */
  if (loading || !spec || !enrolment) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <PageHeader titleKey="savedTitle" />
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.empty}>
            {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── The detail: one subject, one tense at a time ────────────────────── */
  if (shelf && subject && tense && specTense) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(subject.label, () => { setOpenSubject(null); setChosenTense(null); })}
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.detailSub}>
            {t(interfaceLanguage, 'savedTenseCount', { count: subject.tenses.length })}
          </Text>

          {/* ⚠️ Single-select: the chip chooses what you are reading, so two of
              them lit would be two answers to one question. */}
          <View style={s.chips}>
            {subject.tenses.map(x => {
              const on = x.tenseId === tense.tenseId;
              return (
                <TouchableOpacity
                  key={x.tenseId}
                  style={[s.chip, on && s.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setChosenTense(x.tenseId)}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>
                    {x.label}{x.due > 0 ? ` · ${x.due}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.dueLine}>
            {tense.due > 0
              ? t(interfaceLanguage, 'conjugationDue', { count: tense.due })
              : subject.dueAt
                ? t(interfaceLanguage, 'savedDueIn', { days: daysUntil(subject.dueAt) })
                : t(interfaceLanguage, 'practiceNothingDue')}
          </Text>

          {/* The tally, where it is worth reading: this is the screen you are
              on because you wanted to know how a pattern is going. */}
          {subject.weakBoxes.length > 0 && (
            <Text style={s.missed} numberOfLines={1}>
              {t(interfaceLanguage, 'savedMissed', {
                list: subject.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
              })}
            </Text>
          )}

          <ParadigmTable spec={spec} subject={subject.subject} tenseIds={[tense.tenseId]} />

          {/* The sourced half — absent rather than invented for a tense with no
              note, which is why the keys are optional on the spec. */}
          {!!specTense.aboutLeadKey && !!specTense.aboutPointsKey && (
            <View style={s.about}>
              <Text style={s.aboutHead}>{t(interfaceLanguage, 'savedAbout')}</Text>
              <Text style={s.aboutLead}>{t(interfaceLanguage, specTense.aboutLeadKey)}</Text>
              {t(interfaceLanguage, specTense.aboutPointsKey).split('\n').map(point => (
                <View key={point} style={s.pointRow}>
                  <Text style={s.bullet}>·</Text>
                  <Text style={s.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={s.remove}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'savedRemoveLabel', { tense: tense.label })}
            onPress={() => {
              setEnrolment(setEnrolled(enrolment, subject.subject, [tense.tenseId], false));
              setChosenTense(null);
            }}
          >
            <Text style={s.removeText}>{t(interfaceLanguage, 'savedRemove')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── One shelf: the items on it ──────────────────────────────────────── */
  if (shelf) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(
          t(interfaceLanguage, shelf.kind === 'group' ? 'topicRegularVerbs' : 'verbsIrregular'),
          () => setOpenKind(null),
        )}
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.grid}>
            {shelf.subjects.map(x => tile(
              x.key, x.label,
              x.started === 0
                ? t(interfaceLanguage, 'savedNotStarted')
                : t(interfaceLanguage, 'savedTenseCount', { count: x.tenses.length }),
              x.due,
              () => setOpenSubject(x.key),
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── The shelves ─────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PageHeader titleKey="savedTitle" />
      <ScrollView contentContainerStyle={s.content}>
        {shelves.length === 0 ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'savedEmpty')}</Text>
        ) : (
          <>
            <Text style={s.intro}>{t(interfaceLanguage, 'savedIntro')}</Text>
            <View style={s.grid}>
              {shelves.map(x => tile(
                x.kind,
                t(interfaceLanguage, x.kind === 'group' ? 'topicRegularVerbs' : 'verbsIrregular'),
                t(interfaceLanguage, 'savedKindSaved', { count: x.subjects.length }),
                x.due,
                () => { setOpenKind(x.kind); setOpenSubject(null); },
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    // ⚠️ Not `PageHeader`: a level below the top carries a back chevron. It
    // takes the constants instead — `cards.tsx`'s arrangement.
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 8,
    },
    title: { flex: 1, color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700' },
    content: { padding: SCREEN_GUTTER, paddingTop: 4, paddingBottom: tabBarHeight },
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
    empty: { color: C.muted, fontSize: 13, lineHeight: 19 },
    // Two to a row at phone width. `minHeight` rather than an aspect ratio, so
    // a long label wraps instead of squaring the tile off mid-word.
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      width: '48%', minHeight: 104, justifyContent: 'flex-start',
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 14,
    },
    tileLabel: { color: C.text, fontSize: 17, fontWeight: '700' },
    tileSub: { color: C.muted, fontSize: 11, marginTop: 3 },
    tileDue: { color: C.muted, fontSize: 12, marginTop: 'auto', paddingTop: 10 },
    tileDueOn: { color: C.highlight, fontWeight: '700' },
    detailSub: { color: C.muted, fontSize: 12, marginBottom: 14 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.text, fontSize: 13 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
    dueLine: { color: C.muted, fontSize: 12, marginTop: 10 },
    missed: { color: C.muted, fontSize: 12, marginTop: 4 },
    about: { marginTop: 28 },
    aboutHead: {
      color: C.muted, fontSize: 11, textTransform: 'uppercase',
      letterSpacing: 1.5, marginBottom: 8,
    },
    aboutLead: { color: C.text, fontSize: 14, lineHeight: 20, marginBottom: 10 },
    pointRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    bullet: { color: C.muted, fontSize: 13, lineHeight: 20 },
    pointText: { flex: 1, color: C.text, opacity: 0.75, fontSize: 13, lineHeight: 20 },
    remove: {
      alignSelf: 'flex-start', marginTop: 32,
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 10, borderWidth: 1, borderColor: C.border,
    },
    removeText: { color: C.muted, fontSize: 13 },
  });
}
