import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { cardsToAnki, cardsToCSV, t, writingsToText } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import { fetchAllCardsForExport } from '../../src/services/firestore';
import { fetchAllSavedWritings } from '../../src/services/writings';
import { shareFile } from '../../src/services/shareFile';
import type { Palette } from '../../src/theme';

/**
 * What is held, in plain language, and a way to take a copy of it — a privacy
 * policy behind a link is not the same as telling someone.
 */
export default function DataSettings() {
  const { C, s } = useSettingsStyles();
  const d = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage, languages } = useUser();
  const [exporting, setExporting] = useState(false);

  /**
   * Every card you own, as CSV or Anki text, through the share sheet.
   *
   * In settings rather than on My Cards since 2026-09-25: a copy of your data
   * belongs with the account that can erase it, which is also where the
   * privacy policy and the delete warning send you. That is why it takes
   * everything — see `cardsToCSV` — rather than whatever a list happened to be
   * filtered to.
   */
  const exportCards = async (format: 'csv' | 'anki') => {
    if (!user) return;
    setExporting(true);
    try {
      const cards = await fetchAllCardsForExport(user.uid);
      if (format === 'csv') {
        await shareFile(cardsToCSV(cards, languages), 'amgi-cards.csv', 'text/csv', 'public.comma-separated-values-text');
      } else {
        await shareFile(cardsToAnki(cards, languages), 'amgi-cards.txt', 'text/plain', 'public.plain-text');
      }
    } catch {
      Alert.alert(t(interfaceLanguage, 'settingsExportFailed'));
    } finally {
      setExporting(false);
    }
  };

  /**
   * Saved writing, as one text file. Beside the cards because it is the other
   * thing the account holds that only this account can give back, and deleting
   * the account takes it too.
   */
  const exportWritings = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const writings = await fetchAllSavedWritings(user.uid);
      if (writings.length === 0) {
        Alert.alert(t(interfaceLanguage, 'settingsExportWritingsNone'));
        return;
      }
      await shareFile(writingsToText(writings, interfaceLanguage), 'amgi-writing.txt', 'text/plain', 'public.plain-text');
    } catch {
      Alert.alert(t(interfaceLanguage, 'settingsExportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsScreen titleKey="settingsYourData">
      <View style={s.card}>
        <Text style={d.blurbText}>{t(interfaceLanguage, 'settingsYourDataBlurb')}</Text>
        {user && (
          <>
            <View style={s.divider} />
            <Text style={s.rowText}>{t(interfaceLanguage, 'settingsExportCards')}</Text>
            <Text style={s.rowDesc}>{t(interfaceLanguage, 'settingsExportCardsDesc')}</Text>
            <View style={[s.chipRow, d.exportRow]}>
              {(['csv', 'anki'] as const).map(format => (
                <TouchableOpacity
                  key={format}
                  style={[s.chip, exporting && d.exportBusy]}
                  onPress={() => exportCards(format)}
                  disabled={exporting}
                  accessibilityRole="button"
                >
                  <Text style={s.chipText}>
                    {t(interfaceLanguage, format === 'csv' ? 'cardsExportCSV' : 'cardsExportAnki')}
                  </Text>
                </TouchableOpacity>
              ))}
              {exporting && <ActivityIndicator size="small" color={C.muted} />}
            </View>
            <View style={s.divider} />
            <Text style={s.rowText}>{t(interfaceLanguage, 'settingsExportWritings')}</Text>
            <Text style={s.rowDesc}>{t(interfaceLanguage, 'settingsExportWritingsDesc')}</Text>
            <View style={[s.chipRow, d.exportRow]}>
              <TouchableOpacity
                style={[s.chip, exporting && d.exportBusy]}
                onPress={exportWritings}
                disabled={exporting}
                accessibilityRole="button"
              >
                <Text style={s.chipText}>{t(interfaceLanguage, 'writingsExportText')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    blurbText: { fontSize: 13, color: C.muted, lineHeight: 19 },
    exportRow: { marginTop: 12, alignItems: 'center' },
    exportBusy: { opacity: 0.4 },
  });
}
