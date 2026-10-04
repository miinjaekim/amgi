import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { buildParadigm, isUserVerb, t } from '@amgi/core';
import type { ConjugationSpec, ConjugationSubject } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import type { Palette } from '../theme';

/** Past this many tenses, a card that is not saved starts closed. */
const ALL_OPEN_UP_TO = 3;

/**
 * A verb's paradigm as a card per tense, stacked.
 *
 * ⚠️ **The tense is the row, not the column** — the user's call, 2026-10-04.
 * This was one table with a column per tense and a row of save chips above
 * it: it scrolled sideways with no sign of how far, each new tense made it
 * wider, and a chip had to be matched by name to the column it saved. A card
 * per tense grows downward, and carries its own Save in its header, the way a
 * subpack does on a pack's screen.
 *
 * ⚠️ **One column of persons, where web has two.** Half a card on a phone
 * holds about nine characters of verb, and `travaillerons` and `choisissaient`
 * are thirteen, so two columns wrapped on most verbs' imparfait and futur. One
 * column gives a form the whole width and reads in the order it is recited.
 *
 * Shared by the Verbs topic and Saved so one cannot disagree with the other —
 * the same reason `buildParadigm` is in core. `tenseIds` narrows which tenses
 * are shown; Saved passes the one a row is about. Without `onToggleSave` a
 * card has no Save, for a surface that manages saving its own way.
 *
 * ⚠️ **A verb the learner added is labelled here, under its forms.** They came
 * from the model, and saying so wherever they are shown is the condition
 * `docs/packs/README.md` allows them on. In this component rather than on each
 * screen, so a new surface that shows a paradigm cannot forget it.
 */
export default function TenseCards({
  spec, subject, vehicle, tenseIds, isSaved, onToggleSave, notes = false,
}: {
  spec: ConjugationSpec;
  subject: ConjugationSubject;
  vehicle?: string;
  tenseIds?: readonly string[];
  isSaved?: (tenseId: string) => boolean;
  onToggleSave?: (tenseId: string, save: boolean) => void;
  /** Show each tense's one-line note, where the language has a sourced one. */
  notes?: boolean;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [opened, setOpened] = useState<readonly string[]>([]);
  const tenses = buildParadigm(spec, subject, vehicle)
    .filter(tense => (tenseIds ? tenseIds.includes(tense.tenseId) : true));
  // The verb `buildTable` lands on: the subject itself, or the group's vehicle.
  const shown = subject.kind === 'verb'
    ? subject.infinitive
    : vehicle && subject.vehicles.includes(vehicle) ? vehicle : subject.vehicles[0];
  // Reading the forms is the point, so everything is open while it fits. Once
  // a language has more tenses, the ones not being practised fold to a line.
  const foldable = tenses.length > ALL_OPEN_UP_TO;

  return (
    <View style={s.stack}>
      {tenses.map(tense => {
        const saved = isSaved?.(tense.tenseId) ?? false;
        const open = !foldable || saved || opened.includes(tense.tenseId);
        const specTense = spec.tenses.find(x => x.id === tense.tenseId);
        return (
          <View key={tense.tenseId} style={s.card}>
            <View style={s.head}>
              <Text style={s.tense}>{tense.label}</Text>
              {onToggleSave && (
                <TouchableOpacity
                  style={[s.save, saved && s.saveOn]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: saved }}
                  accessibilityLabel={t(interfaceLanguage, saved ? 'verbsSaved' : 'verbsSave', { tense: tense.label })}
                  onPress={() => onToggleSave(tense.tenseId, !saved)}
                >
                  <Text style={[s.saveText, saved && s.saveTextOn]}>
                    {saved ? `✓ ${t(interfaceLanguage, 'writingCardSaved')}` : t(interfaceLanguage, 'save')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {open ? (
              // Labels and forms are two stacks side by side rather than a
              // row per person: the label stack is then as wide as its longest
              // label and no wider, so the form sits right beside its person.
              // One line height keeps the two stacks level.
              <View style={s.forms}>
                <View>
                  {spec.persons.map(person => (
                    <Text key={person.id} style={s.person} numberOfLines={1}>{person.label}</Text>
                  ))}
                </View>
                <View style={s.formStack}>
                  {spec.persons.map(person => (
                    <Text key={person.id} style={s.form} numberOfLines={1}>{tense.forms[person.id]}</Text>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setOpened(prev => [...prev, tense.tenseId])} accessibilityRole="button">
                <Text style={s.preview} numberOfLines={1}>
                  {spec.persons.slice(0, 3).map(person => tense.forms[person.id]).join(', ')}… ▾
                </Text>
              </TouchableOpacity>
            )}

            {open && notes && specTense?.aboutLeadKey && (
              <Text style={s.note}>{t(interfaceLanguage, specTense.aboutLeadKey)}</Text>
            )}
          </View>
        );
      })}
      {isUserVerb(spec, shown) && <Text style={s.unverified}>{t(interfaceLanguage, 'verbUnverified')}</Text>}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    stack: { marginTop: 14, gap: 10 },
    card: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tense: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700' },
    save: { borderWidth: 1, borderColor: C.highlight, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 5 },
    saveOn: { backgroundColor: C.highlight },
    saveText: { color: C.highlight, fontSize: 12, fontWeight: '700' },
    saveTextOn: { color: C.bg },
    forms: { flexDirection: 'row', gap: 56, marginTop: 8 },
    formStack: { flex: 1 },
    person: { color: C.muted, fontSize: 13, lineHeight: 24 },
    form: { color: C.text, fontSize: 14, lineHeight: 24 },
    preview: { color: C.muted, fontSize: 13, marginTop: 8 },
    note: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 10 },
    unverified: { color: C.muted, fontSize: 11 },
  });
}
