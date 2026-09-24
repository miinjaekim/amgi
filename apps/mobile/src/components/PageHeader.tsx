import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { modeFromPath, t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import StreakBadge from './StreakBadge';
import MunliLanguageChip from './MunliLanguageChip';
import type { Palette } from '../theme';

/**
 * The size of a tab's page title.
 *
 * Exported because `cards.tsx` cannot use this component — it carries
 * Import/Export buttons and a subtitle, neither of which this shape supports —
 * so it renders its own title and would otherwise drift. It already had: it sat
 * at 24 against this file's 21 until 2026-09-04. A shared constant is the only
 * thing that keeps two headers the same size without either one knowing about
 * the other.
 */
export const PAGE_TITLE_SIZE = 21;

/**
 * The gutter a screen's content lines up on.
 *
 * Exported for the same reason as the size above, and prompted by the same kind
 * of drift: Munli's tabs sat at 16 while this header sat at 20, so a title
 * adopted from here would have hung four pixels outside the list under it. A
 * screen that renders its own header — one with a back button, or one that
 * already has `ProgressHeader` above it — uses this rather than its own 20.
 *
 * ⚠️ **Amgi's four screens still hardcode theirs**, and that is a separate
 * backlog item: `review.tsx` is not uniformly 20, so a constant cannot cover it
 * until somebody decides whether its 16 is deliberate.
 */
export const SCREEN_GUTTER = 20;

interface Props {
  titleKey: TranslationKey;
  /**
   * The help sheet, all three keys or none.
   *
   * ⚠️ **Optional since 2026-09-22**, when Munli's tabs took this component for
   * its title. Practice, Saved and Topics have nothing non-obvious to say, and
   * writing copy to satisfy a required prop would be a "?" that restates the
   * page's name — the thing this component's own comment rejects.
   */
  helpTitleKey?: TranslationKey;
  /** One sentence answering "what is this page". */
  helpLeadKey?: TranslationKey;
  /** The non-obvious mechanics, one per line, split on `\n`. */
  helpPointsKey?: TranslationKey;
  /**
   * Show the streak at the right end of the title row.
   *
   * Opt-in rather than always-on: it belongs on the tabs where you *do* the
   * work — Learn and Review — and not on Packs or Cards, which are for browsing
   * what you already have. A number that only moves on the other two tabs is
   * decoration there.
   *
   * Costs nothing on an account without a streak; `StreakBadge` renders null.
   */
  streak?: boolean;
}

/**
 * A page title with a help button that explains what the page is for.
 *
 * Pull, not push — the answer is there when you wonder and invisible when you
 * don't, which is why it needs no record of who has seen what. That is the
 * whole reason this shape works where a first-run tour cannot: the tour has to
 * name every surface at the one moment you have the least context to attach
 * the names to.
 *
 * Explaining rather than demonstrating is fine here, and only here: the user
 * asked. Unsolicited, the same text would be the lecture that the first-run
 * checklist was rejected for being.
 *
 * **On Munli's screens the title row ends in the study language**, read off
 * the path rather than a prop — web's `PageHeader` makes the same check.
 */
export default function PageHeader({ titleKey, helpTitleKey, helpLeadKey, helpPointsKey, streak }: Props) {
  const { interfaceLanguage } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [helpOpen, setHelpOpen] = useState(false);
  const munli = modeFromPath(usePathname()) === 'munli';
  // An object rather than a boolean, so the three keys narrow together: they
  // are all present or all absent, and nothing downstream has to assert it.
  const help = helpTitleKey && helpLeadKey && helpPointsKey
    ? { title: helpTitleKey, lead: helpLeadKey, points: helpPointsKey }
    : null;

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{t(interfaceLanguage, titleKey)}</Text>
        {help && (
          <TouchableOpacity
            style={s.helpBtn}
            onPress={() => setHelpOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'helpButtonLabel')}
            // The icon is small by design; this keeps the tap target honest.
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="help-circle-outline" size={20} color={C.muted} />
          </TouchableOpacity>
        )}
        {munli && <MunliLanguageChip />}
      </View>

      {/* Under the title, not beside it. Sharing the row cost the title the
          space it needed — "Review" clipped on a normal phone once a streak
          long enough to be worth showing sat next to it, and shrinking the
          badge instead would have made the streak the unreadable one.
          Left-aligned on the header's own gutter, so the flame lines up under
          the first letter of the title.

          On the badge rather than a wrapper `View`: `StreakBadge` renders null
          without a streak, and a wrapper would leave its padding behind as a
          gap on every account that has not started one. */}
      {streak && <StreakBadge style={s.streakRow} />}

      {help && (
        <Modal
          visible={helpOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setHelpOpen(false)}
        >
        <View style={s.backdrop}>
          {/* Tap-to-dismiss sits on its own layer *behind* the sheet rather
              than wrapping it. Wrapping is the usual shape (see
              `SaveFlashcardModal`) and it is wrong the moment the sheet holds
              a ScrollView: the enclosing press handler and the scroll gesture
              both want the same touch, so a drag is sometimes claimed as a
              press and the body only scrolls intermittently. Keeping the sheet
              a plain View leaves the ScrollView the sole responder for
              anything that starts inside it. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHelpOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'helpClose')}
          />
          <View style={s.sheet}>
            <Text style={s.helpTitle}>{t(interfaceLanguage, help.title)}</Text>
            {/* Shaped rather than merely shortened: one sentence that answers
                the question, then the mechanics a user cannot infer from the
                screen. Someone who taps "?" wants to stop reading quickly, and
                a paragraph makes them find the sentence that applies to them.

                The scroll is now a safety net for large font settings rather
                than the normal case — the copy fits without it on a typical
                phone, which is the point. */}
            <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent}>
              <Text style={s.helpLead}>{t(interfaceLanguage, help.lead)}</Text>
              {t(interfaceLanguage, help.points).split('\n').map(point => (
                <View key={point} style={s.pointRow}>
                  <Text style={s.bullet}>·</Text>
                  {/* `flex: 1` so a wrapped second line stays aligned with the
                      first rather than sliding back under the bullet. */}
                  <Text style={s.pointText}>{point}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.closeBtn} onPress={() => setHelpOpen(false)}>
              <Text style={s.closeBtnText}>{t(interfaceLanguage, 'helpClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12,
    },
    title: { fontSize: PAGE_TITLE_SIZE, fontWeight: '700', color: C.highlight },
    // `flex-start` keeps the tap target on the badge itself; stretched, the
    // whole width of the row would navigate to Progress.
    streakRow: { alignSelf: 'flex-start', paddingHorizontal: SCREEN_GUTTER, paddingBottom: 10 },
    helpBtn: { padding: 2 },
    backdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    sheet: {
      width: '100%', maxHeight: '75%', backgroundColor: C.surface,
      borderRadius: 18, padding: 24, borderWidth: 1, borderColor: C.border,
      // Matches the other scrollable sheets — keeps a mid-scroll line from
      // painting over the rounded corners.
      overflow: 'hidden',
    },
    helpTitle: { fontSize: 18, fontWeight: '700', color: C.highlight, marginBottom: 14 },
    bodyScroll: { flexShrink: 1 },
    bodyContent: { paddingBottom: 4 },
    helpLead: { fontSize: 15, lineHeight: 22, color: C.text, marginBottom: 14 },
    pointRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    bullet: { fontSize: 14, lineHeight: 21, color: C.muted },
    pointText: { flex: 1, fontSize: 14, lineHeight: 21, color: C.text, opacity: 0.75 },
    closeBtn: {
      marginTop: 20, backgroundColor: C.border, borderRadius: 10,
      paddingVertical: 12, alignItems: 'center',
    },
    closeBtnText: { fontSize: 15, fontWeight: '600', color: C.text },
  });
}
