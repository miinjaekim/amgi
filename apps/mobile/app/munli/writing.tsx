import React, { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
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
 *
 * ⚠️ **The tick in the header is how you finish writing** (the user's call,
 * 2026-10-06, after Instagram's caption screen). A multiline field has no
 * return key to dismiss with, and a scroll no longer puts the keyboard away,
 * so while the passage is being edited the title row ends in a tick that does.
 */
export default function MunliWritingScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [editing, setEditing] = useState(false);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <PageHeader
        titleKey="munliToolWriting"
        helpTitleKey="helpWritingTitle"
        helpLeadKey="helpWritingLead"
        helpPointsKey="helpWritingPoints"
        action={editing && (
          <TouchableOpacity
            style={s.done}
            onPress={Keyboard.dismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'keyboardDone')}
          >
            <Ionicons name="checkmark" size={26} color={C.bg} />
          </TouchableOpacity>
        )}
      />
      <WritingReviewPanel onEditingChange={setEditing} />
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    // Filled in the colour the Review button uses, so it reads as the button
    // it is. The negative margin keeps the title row the height it has without
    // it: the tick comes and goes with the keyboard, and the page must not
    // shift when it does.
    done: {
      width: 44, height: 44, borderRadius: 22, marginVertical: -12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.highlight,
    },
  });
}
