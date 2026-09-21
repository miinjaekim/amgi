import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { buildParadigm } from '@amgi/core';
import type { ConjugationSpec, ConjugationSubject } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * A verb's paradigm: persons down, tenses across.
 *
 * Shared by the Topics detail and the Tables tab so one table cannot disagree
 * with the other — the same reason `buildParadigm` is in core rather than on
 * each screen.
 *
 * `tenseIds` narrows which columns are shown. Topics leaves it out and shows
 * every tense the language has, because reading a form is not bounded by having
 * enrolled it; the Tables tab passes the one tense a row is about.
 */
export default function ParadigmTable({
  spec, subject, vehicle, tenseIds,
}: {
  spec: ConjugationSpec;
  subject: ConjugationSubject;
  vehicle?: string;
  tenseIds?: readonly string[];
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const tenses = buildParadigm(spec, subject, vehicle)
    .filter(tense => (tenseIds ? tenseIds.includes(tense.tenseId) : true));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll}>
      <View>
        <View style={s.row}>
          <Text style={[s.cell, s.personCell, s.headCell]} />
          {tenses.map(tense => (
            <Text key={tense.tenseId} style={[s.cell, s.headCell]} numberOfLines={1}>{tense.label}</Text>
          ))}
        </View>
        {spec.persons.map(person => (
          <View key={person.id} style={s.row}>
            <Text style={[s.cell, s.personCell]} numberOfLines={1}>{person.label}</Text>
            {tenses.map(tense => (
              <Text key={tense.tenseId} style={s.cell} numberOfLines={1}>{tense.forms[person.id]}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    scroll: { marginTop: 12 },
    row: { flexDirection: 'row' },
    cell: {
      color: C.text, fontSize: 13, paddingVertical: 6, paddingHorizontal: 10,
      minWidth: 104, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    personCell: { color: C.muted, minWidth: 72 },
    headCell: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  });
}
