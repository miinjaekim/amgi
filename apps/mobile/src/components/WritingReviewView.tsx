import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offersCard, t } from '@amgi/core';
import type {
  FindingKind, StudyLanguage, TranslationKey, WritingCardCandidate, WritingReview,
} from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import PronounceButton from './PronounceButton';
import CopyButton from './CopyButton';
import TextDiff from './TextDiff';
import type { Palette } from '../theme';

const KIND_LABEL_KEY: Record<FindingKind, TranslationKey> = {
  grammar: 'writingKindGrammar',
  naturalness: 'writingKindNaturalness',
  register: 'writingKindRegister',
  vocabulary: 'writingKindVocabulary',
};

interface Props {
  review: WritingReview;
  /** The passage the review was made against, which is what the diff is from. */
  passage: string;
  studyLanguage: StudyLanguage;
  /** Which back a card candidate is read in. */
  nativeLanguage: string | null | undefined;
  /** Go back to the passage to change it. Absent on a saved writing. */
  onEdit?: () => void;
  /**
   * Saving a finding's card. Absent where the review is only being read (a
   * saved writing), and the candidate is then shown without its button.
   */
  cards?: {
    saved: Set<string>;
    saving: string | null;
    onAdd: (candidate: WritingCardCandidate) => void;
  };
}

/**
 * A writing review, drawn: the rewrite against the passage, what it means, and
 * the ordered findings. Mirrors web's `WritingReviewView`.
 *
 * Lifted out of `WritingReviewPanel` so a saved writing opens **as it looked**
 * — one drawing of a review, used fresh and from Saved, rather than a second
 * one that drifts. Its two toggles (Changes/Final, and the meaning) are its
 * own state: it is mounted per review, so a new review starts with both closed.
 */
export default function WritingReviewView({ review, passage, studyLanguage, nativeLanguage, onEdit, cards }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [showClean, setShowClean] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);

  return (
    <>
      {/* Above the box, as "What to notice" is above its findings. Inside,
          it shared a row with three buttons and the last was pushed onto a
          line of its own. */}
      <Text style={s.findingsHeading}>{t(interfaceLanguage, 'writingRewriteHeading')}</Text>
      <View style={s.card}>
        <View style={s.rewriteHeaderRow}>
          {/* ⚠️ No pronounce button here (the user's call, 2026-10-06):
              this tool is for writing, not listening. The ones on the
              findings stay: hearing the one new word is worth more than
              hearing back the passage you just wrote. */}
          {/* Always the clean rewrite, never the diff — copying text with
              the deletions in it would paste the mistakes back. */}
          <CopyButton text={review.rewrite} interfaceLanguage={interfaceLanguage} />
          {/* The clean rewrite stays reachable — it is the version you
              would read aloud, and a heavily edited passage is hard to read
              as a sentence through its own diff. */}
          {/* Back to the passage as you wrote it, editable. Absent on a saved
              writing, which is only read. */}
          {onEdit && (
            <TouchableOpacity style={s.editBtn} accessibilityRole="button" onPress={onEdit}>
              <Text style={s.viewToggleText}>{t(interfaceLanguage, 'edit')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.viewToggle} onPress={() => setShowClean(v => !v)}>
            <Text style={s.viewToggleText}>
              {t(interfaceLanguage, showClean ? 'writingViewChanges' : 'writingViewFinal')}
            </Text>
          </TouchableOpacity>
        </View>
        {showClean ? (
          <Text style={s.rewriteText}>{review.rewrite}</Text>
        ) : (
          <TextDiff before={passage} after={review.rewrite} studyLanguage={studyLanguage} />
        )}

        {/* The check that a correction didn't change what they meant.
            ⚠️ Behind a tap since 2026-10-06, on the user's call: open it
            when you are curious what the rewrite says. It was always
            shown before, on the argument that a check nobody opens is a
            check nobody runs; the user weighed that against the room it
            takes on every review and chose the tap. */}
        {review.rewriteNative && (
          <View style={s.nativeBlock}>
            <TouchableOpacity
              style={s.nativeToggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: showMeaning }}
              onPress={() => setShowMeaning(v => !v)}
            >
              <Text style={s.sectionLabel}>{t(interfaceLanguage, 'writingRewriteMeaning')}</Text>
              <Ionicons name={showMeaning ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
            </TouchableOpacity>
            {showMeaning && <Text style={s.nativeText}>{review.rewriteNative}</Text>}
          </View>
        )}
      </View>

      <Text style={s.findingsHeading}>{t(interfaceLanguage, 'writingFindingsHeading')}</Text>

      {review.findings.length === 0 ? (
        <Text style={s.noFindings}>{t(interfaceLanguage, 'writingNoFindings')}</Text>
      ) : (
        /* One ordered list, never grouped by kind — the order is the
           model's judgement of what this writer most needs, which is what
           makes the feedback meet them at their level. */
        review.findings.map((finding, i) => {
          const saved = finding.card ? !!cards?.saved.has(finding.card.study) : false;
          const savingThis = finding.card ? cards?.saving === finding.card.study : false;

          const showCard = offersCard(finding);
          return (
            <View key={i} style={s.finding}>
              <View style={s.kindBadge}>
                <Text style={s.kindText}>{t(interfaceLanguage, KIND_LABEL_KEY[finding.kind])}</Text>
              </View>

              {(finding.original || finding.suggested) && (
                <View style={s.spanRow}>
                  {finding.original && <Text style={s.original}>{finding.original}</Text>}
                  {finding.original && finding.suggested && <Text style={s.arrow}>→</Text>}
                  {finding.suggested && <Text style={s.suggested}>{finding.suggested}</Text>}
                </View>
              )}

              <Text style={s.note}>{finding.note}</Text>

              {showCard && finding.card && (
                <View style={s.cardRow}>
                  {/* A word they demonstrably reached for and did not have.
                      Marked, because it is different evidence from every
                      other suggestion: not "this would be worth knowing"
                      but "you needed this and it wasn't there." */}
                  {finding.card.gap && (
                    <View style={s.gapBadge}>
                      <Text style={s.gapBadgeText}>{t(interfaceLanguage, 'writingWordYouNeeded')}</Text>
                    </View>
                  )}
                  <Text style={s.cardStudy}>{finding.card.study}</Text>
                  <PronounceButton text={finding.card.study} studyLanguage={studyLanguage} />
                  <Text style={s.cardBack} numberOfLines={2}>
                    {nativeLanguage === 'Korean' ? finding.card.back.Korean : finding.card.back.English}
                  </Text>
                  {cards && (
                    <TouchableOpacity
                      style={[s.addBtn, (saved || savingThis) && s.addBtnDisabled]}
                      onPress={() => finding.card && cards.onAdd(finding.card)}
                      disabled={saved || savingThis}
                    >
                      {savingThis
                        ? <ActivityIndicator color={C.text} size="small" />
                        : <Text style={s.addBtnText}>{t(interfaceLanguage, saved ? 'writingCardSaved' : 'writingAddCard')}</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
    // Copy, Edit, and the Changes/Final toggle at the far end. Still wraps, so
    // a wide label on a narrow phone drops a line rather than running off the
    // edge; with the heading out of the row it should not need to.
    rewriteHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    viewToggle: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    viewToggleText: { fontSize: 11, color: C.muted },
    editBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    nativeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    rewriteText: { fontSize: 17, color: C.text, lineHeight: 26 },
    nativeBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
    nativeText: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 21 },

    findingsHeading: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    noFindings: { fontSize: 14, color: C.muted, lineHeight: 21 },

    finding: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
    kindBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    kindText: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    spanRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    original: { fontSize: 15, color: C.text, opacity: 0.5, textDecorationLine: 'line-through' },
    arrow: { fontSize: 15, color: C.muted },
    suggested: { fontSize: 15, fontWeight: '700', color: C.highlight },
    note: { fontSize: 14, color: C.text, opacity: 0.8, lineHeight: 21, marginTop: 8 },

    cardRow: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    gapBadge: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    gapBadgeText: { fontSize: 9, color: C.bg, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    cardStudy: { fontSize: 15, fontWeight: '700', color: C.text },
    cardBack: { fontSize: 13, color: C.muted, flexShrink: 1 },
    addBtn: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border, borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 5, minWidth: 62, alignItems: 'center',
    },
    addBtnDisabled: { opacity: 0.5 },
    addBtnText: { fontSize: 13, color: C.text },
  });
}
