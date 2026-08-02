import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

interface Props {
  titleKey: TranslationKey;
  helpTitleKey: TranslationKey;
  /** One sentence answering "what is this page". */
  helpLeadKey: TranslationKey;
  /** The non-obvious mechanics, one per line, split on `\n`. */
  helpPointsKey: TranslationKey;
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
 */
export default function PageHeader({ titleKey, helpTitleKey, helpLeadKey, helpPointsKey }: Props) {
  const { nativeLanguage } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{t(nativeLanguage, titleKey)}</Text>
        <TouchableOpacity
          style={s.helpBtn}
          onPress={() => setHelpOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t(nativeLanguage, 'helpButtonLabel')}
          // The icon is small by design; this keeps the tap target honest.
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="help-circle-outline" size={20} color={C.muted} />
        </TouchableOpacity>
      </View>

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
            accessibilityLabel={t(nativeLanguage, 'helpClose')}
          />
          <View style={s.sheet}>
            <Text style={s.helpTitle}>{t(nativeLanguage, helpTitleKey)}</Text>
            {/* Shaped rather than merely shortened: one sentence that answers
                the question, then the mechanics a user cannot infer from the
                screen. Someone who taps "?" wants to stop reading quickly, and
                a paragraph makes them find the sentence that applies to them.

                The scroll is now a safety net for large font settings rather
                than the normal case — the copy fits without it on a typical
                phone, which is the point. */}
            <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent}>
              <Text style={s.helpLead}>{t(nativeLanguage, helpLeadKey)}</Text>
              {t(nativeLanguage, helpPointsKey).split('\n').map(point => (
                <View key={point} style={s.pointRow}>
                  <Text style={s.bullet}>·</Text>
                  {/* `flex: 1` so a wrapped second line stays aligned with the
                      first rather than sliding back under the bullet. */}
                  <Text style={s.pointText}>{point}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.closeBtn} onPress={() => setHelpOpen(false)}>
              <Text style={s.closeBtnText}>{t(nativeLanguage, 'helpClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 20, paddingVertical: 12,
    },
    title: { fontSize: 21, fontWeight: '700', color: C.highlight },
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
