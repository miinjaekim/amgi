import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { FormsTable as FormsTableData } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * A Swedish word's forms as a small grid: a noun's four, or an adjective's
 * three in one row. `formsTable()` in core decides the cells; this only draws
 * them, and web draws the same ones.
 *
 * Laid out as columns, each as wide as its longest cell, because React Native
 * has no table: rows of flexed cells would either stretch four short words
 * across the card or misalign the moment one form is longer than the rest.
 */
export default function FormsTable({ table, style }: { table: FormsTableData; style?: StyleProp<ViewStyle> }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const labelled = table.rows.some(row => row.label);
  return (
    <View style={style}>
      <View style={s.grid}>
        {labelled && (
          <View style={s.column}>
            <Text style={s.label}> </Text>
            {table.rows.map((row, index) => (
              <Text key={index} style={[s.label, s.cellHeight]}>{row.label}</Text>
            ))}
          </View>
        )}
        {table.columns.map((column, index) => (
          <View key={column} style={s.column}>
            <Text style={s.label}>{column}</Text>
            {table.rows.map((row, rowIndex) => (
              <Text key={rowIndex} style={[s.cell, s.cellHeight]}>{row.cells[index]}</Text>
            ))}
          </View>
        ))}
      </View>
      <Text style={s.caption}>{table.caption}</Text>
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    grid: { flexDirection: 'row' },
    column: { marginRight: 20 },
    label: { fontSize: 12, color: C.muted, lineHeight: 18 },
    cell: { fontSize: 14, color: C.text },
    // One line height for a label and a form, so a row reads straight across
    // the columns it is assembled from.
    cellHeight: { lineHeight: 22 },
    caption: { fontSize: 11, color: C.muted, opacity: 0.7, marginTop: 4 },
  });
}
