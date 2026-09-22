import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import PageHeader from '../../src/components/PageHeader';
import WritingReviewPanel from '../../src/components/WritingReviewPanel';
import type { Palette } from '../../src/theme';

/**
 * Munli's writing tool, as a tab.
 *
 * ⚠️ **It reserves the tab bar's height again** — the panel dropped that reserve
 * when Munli was a Stack with no bar, and Munli has one now. Without it the last
 * finding sits under the bar.
 *
 * ⚠️ **The header is `PageHeader`**, which brings the "?" this tab needed and
 * takes the title with it. The title it had was `fontSize: 18` in a monospace
 * face nothing else in the mode sets — the drift `PAGE_TITLE_SIZE` exists to
 * stop, which the component applies without this file knowing the number.
 */
export default function MunliWritingScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <PageHeader
        titleKey="munliToolWriting"
        helpTitleKey="helpWritingTitle"
        helpLeadKey="helpWritingLead"
        helpPointsKey="helpWritingPoints"
      />
      <WritingReviewPanel />
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
  });
}
