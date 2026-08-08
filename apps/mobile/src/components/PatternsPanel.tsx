import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { buildPatternDraft, exerciseFormat, isPatternDue, patternGloss, t } from '@amgi/core';
import type { GrammarPattern, PatternKind, StudyLanguage, TranslationKey } from '@amgi/core';
import {
  archivePattern, deletePattern, fetchAllUserPatterns, restorePattern, savePattern, updatePatternFields,
} from '../services/patterns';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../context/ThemeContext';
import { useFloatingTabBarHeight } from './FloatingTabBar';
import type { Palette } from '../theme';

/**
 * The management half of grammar patterns, behind the Cards/Grammar toggle.
 *
 * Its own component rather than more branches inside the cards screen, which is
 * already 700 lines — and the two lists share nothing but a tab. A pattern is
 * not a `Flashcard`: no deck axis, no directions, no import/export, no detail
 * modal. What they do share is the active/archived split, because that question
 * is the same for anything you accumulate.
 */

const KIND_LABEL: Record<PatternKind, TranslationKey> = {
  choice: 'patternKindChoiceShort',
  form: 'patternKindFormShort',
};

interface Draft {
  pattern: string;
  gloss: string;
  kind: PatternKind;
}

export default function PatternsPanel({
  uid, studyLanguage, nativeLanguage,
}: {
  uid: string;
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
}) {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const isOnline = useNetworkStatus();

  const [patterns, setPatterns] = useState<GrammarPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(false);

  // The gloss is stored per language and edited in the reader's own. Writing
  // back to the side they can read is the only honest thing to do — the other
  // belongs to a reader who isn't here.
  const glossField: 'English' | 'Korean' = nativeLanguage === 'Korean' ? 'Korean' : 'English';

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchAllUserPatterns(uid, studyLanguage)
      .then(setPatterns)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, studyLanguage]);

  const visible = patterns.filter(p => (showArchived ? p.archived === true : p.archived !== true));
  const activeCount = patterns.filter(p => p.archived !== true).length;
  const archivedCount = patterns.filter(p => p.archived === true).length;

  const startEdit = (pattern: GrammarPattern) => {
    setAdding(false);
    setEditingId(pattern.id ?? null);
    setDraft({ pattern: pattern.pattern, gloss: pattern.gloss[glossField] ?? '', kind: pattern.kind });
  };

  const startAdd = () => {
    setEditingId(null);
    setAdding(true);
    setDraft({ pattern: '', gloss: '', kind: 'choice' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!draft || !draft.pattern.trim()) return;
    setWorking(true);
    setError(null);
    try {
      if (adding) {
        // No model call and no endpoint. The learner types the pattern and
        // picks its kind, which is the point: the most direct statement the app
        // can make about what counts as a pattern.
        await savePattern(buildPatternDraft(
          {
            pattern: draft.pattern.trim(),
            kind: draft.kind,
            gloss: draft.gloss.trim() ? { [glossField]: draft.gloss.trim() } : {},
          },
          uid, studyLanguage, 'manual',
        ));
      } else if (editingId) {
        const existing = patterns.find(p => p.id === editingId);
        await updatePatternFields(editingId, {
          pattern: draft.pattern.trim(),
          kind: draft.kind,
          gloss: { ...existing?.gloss, ...(draft.gloss.trim() ? { [glossField]: draft.gloss.trim() } : {}) },
        });
      }
      cancelEdit();
      load();
    } catch {
      setError(t(nativeLanguage, 'errorSavePattern'));
    } finally {
      setWorking(false);
    }
  };

  const runAction = async (action: () => Promise<void>, failureKey: TranslationKey) => {
    setWorking(true);
    setError(null);
    try {
      await action();
      load();
    } catch {
      setError(t(nativeLanguage, failureKey));
    } finally {
      setWorking(false);
    }
  };

  const confirmDelete = (pattern: GrammarPattern) => {
    Alert.alert(
      t(nativeLanguage, 'patternConfirmDelete'),
      undefined,
      [
        { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(nativeLanguage, 'delete'),
          style: 'destructive',
          onPress: () => runAction(() => deletePattern(pattern.id!), 'patternDeleteFailed'),
        },
      ],
    );
  };

  const renderForm = () => {
    if (!draft) return null;
    return (
      <View style={s.form}>
        <Text style={s.fieldLabel}>{t(nativeLanguage, 'patternFieldPattern')}</Text>
        <TextInput
          style={s.field}
          value={draft.pattern}
          onChangeText={v => setDraft(d => (d ? { ...d, pattern: v } : d))}
          placeholder={t(nativeLanguage, 'patternFieldPatternPlaceholder')}
          placeholderTextColor={C.muted}
        />
        <Text style={s.fieldLabel}>{t(nativeLanguage, 'patternFieldGloss')}</Text>
        <TextInput
          style={s.field}
          value={draft.gloss}
          onChangeText={v => setDraft(d => (d ? { ...d, gloss: v } : d))}
          placeholder={t(nativeLanguage, 'patternFieldGlossPlaceholder')}
          placeholderTextColor={C.muted}
        />
        <Text style={s.fieldLabel}>{t(nativeLanguage, 'patternFieldKind')}</Text>
        {/* Two options with their consequence spelled out, not a bare toggle.
            This decides whether the pattern ever graduates from gap-filling to
            writing your own sentences, and nobody can judge that from the word
            "choice" alone. */}
        {(['choice', 'form'] as PatternKind[]).map(kind => {
          const on = draft.kind === kind;
          return (
            <TouchableOpacity
              key={kind}
              style={[s.kindOption, on && s.kindOptionOn]}
              onPress={() => setDraft(d => (d ? { ...d, kind } : d))}
            >
              <Text style={[s.kindTitle, on && { color: C.highlight }]}>
                {t(nativeLanguage, kind === 'choice' ? 'patternKindChoice' : 'patternKindForm')}
              </Text>
              <Text style={s.kindHelp}>
                {t(nativeLanguage, kind === 'choice' ? 'patternKindChoiceHelp' : 'patternKindFormHelp')}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={s.formBtnRow}>
          <TouchableOpacity
            style={[s.primaryBtn, (working || !draft.pattern.trim()) && s.btnOff]}
            onPress={handleSave}
            disabled={working || !draft.pattern.trim()}
          >
            <Text style={s.primaryBtnText}>{t(nativeLanguage, 'save')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={cancelEdit}>
            <Text style={s.ghostBtnText}>{t(nativeLanguage, 'cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, !showArchived && s.tabOn]}
          onPress={() => setShowArchived(false)}
        >
          <Text style={[s.tabText, !showArchived && s.tabTextOn]}>
            {t(nativeLanguage, 'cardsFilterActive')} ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, showArchived && s.tabOn]}
          onPress={() => setShowArchived(true)}
        >
          <Text style={[s.tabText, showArchived && s.tabTextOn]}>
            {t(nativeLanguage, 'cardsFilterArchived')} ({archivedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={startAdd}>
          <Text style={s.addBtnText}>{t(nativeLanguage, 'patternAddManual')}</Text>
        </TouchableOpacity>
      </View>

      {error && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}

      {adding && renderForm()}

      {loading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={C.muted} size="small" />
          <Text style={s.mutedText}>{t(nativeLanguage, 'patternsLoading')}</Text>
        </View>
      ) : loadFailed ? (
        <Text style={s.mutedText}>{t(nativeLanguage, 'patternsLoadFailed')}</Text>
      ) : visible.length === 0 ? (
        /* ⚠️ Offline, `getDocs` resolves against a memory-only cache and hands
           back an empty list rather than throwing — so "no connection" and "no
           patterns" arrive identically here. Network status is checked directly
           rather than inferred from the empty array, or a learner underground
           would be told their patterns are gone. */
        <Text style={s.mutedText}>
          {!isOnline
            ? t(nativeLanguage, 'patternsLoadFailed')
            : t(nativeLanguage, showArchived ? 'patternsNoneArchived' : 'patternsNone')}
        </Text>
      ) : (
        visible.map(pattern => {
          if (editingId === pattern.id) return <View key={pattern.id}>{renderForm()}</View>;
          const due = isPatternDue(pattern);
          const format = exerciseFormat(pattern);
          return (
            <View key={pattern.id} style={s.row}>
              <View style={s.rowTop}>
                <Text style={s.patternName}>{pattern.pattern}</Text>
                {!!patternGloss(pattern, nativeLanguage) && (
                  <Text style={s.gloss} numberOfLines={2}>{patternGloss(pattern, nativeLanguage)}</Text>
                )}
                <View style={s.kindBadge}>
                  <Text style={s.kindBadgeText}>{t(nativeLanguage, KIND_LABEL[pattern.kind])}</Text>
                </View>
              </View>

              {/* Which rung it is on, and whether it is waiting. Both derived,
                  so this reads the schedule rather than copying it. */}
              <Text style={[s.meta, due && { color: C.highlight }]}>
                {t(nativeLanguage, format === 'cloze' ? 'patternStageCloze' : 'patternStageProduction')}
                {' · '}
                {due
                  ? t(nativeLanguage, 'patternDueNow')
                  : t(nativeLanguage, 'patternNextOn', {
                    date: new Date(pattern.production!.nextReview).toLocaleDateString(
                      nativeLanguage === 'Korean' ? 'ko-KR' : 'en-US',
                      { month: 'short', day: 'numeric' },
                    ),
                  })}
              </Text>

              <View style={s.rowBtns}>
                <TouchableOpacity style={s.ghostBtn} onPress={() => startEdit(pattern)}>
                  <Text style={s.ghostBtnText}>{t(nativeLanguage, 'edit')}</Text>
                </TouchableOpacity>
                {pattern.archived ? (
                  <TouchableOpacity
                    style={s.ghostBtn}
                    disabled={working}
                    onPress={() => runAction(() => restorePattern(pattern.id!), 'errorRestoreFlashcard')}
                  >
                    <Text style={s.ghostBtnText}>{t(nativeLanguage, 'restore')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={s.ghostBtn}
                    disabled={working}
                    onPress={() => runAction(() => archivePattern(pattern.id!), 'errorArchiveFlashcard')}
                  >
                    <Text style={s.ghostBtnText}>{t(nativeLanguage, 'archive')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.ghostBtn} disabled={working} onPress={() => confirmDelete(pattern)}>
                  <Text style={[s.ghostBtnText, { color: C.error }]}>{t(nativeLanguage, 'delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: tabBarHeight + 24 },

    tabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    tab: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
    tabOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    tabText: { fontSize: 13, color: C.text },
    tabTextOn: { color: C.bg, fontWeight: '700' },
    addBtn: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
    },
    addBtnText: { fontSize: 13, color: C.muted },

    errorBanner: { backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 12 },
    errorText: { color: C.error, fontWeight: '600', fontSize: 13 },

    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
    mutedText: { fontSize: 14, color: C.muted, lineHeight: 21 },

    form: {
      backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
      padding: 14, marginBottom: 14, gap: 8,
    },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    field: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, color: C.text, backgroundColor: C.bg,
    },
    kindOption: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, gap: 3 },
    kindOptionOn: { borderColor: C.highlight, backgroundColor: C.bg },
    kindTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    kindHelp: { fontSize: 12, color: C.muted, lineHeight: 18 },
    formBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

    row: {
      backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
      padding: 14, marginBottom: 10,
    },
    rowTop: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    patternName: { fontSize: 17, fontWeight: '700', color: C.text },
    gloss: { fontSize: 13, color: C.muted, flexShrink: 1 },
    kindBadge: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border,
      borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    },
    kindBadgeText: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    meta: { fontSize: 12, color: C.muted, marginTop: 8 },
    rowBtns: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },

    primaryBtn: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    primaryBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },
    btnOff: { opacity: 0.5 },
    ghostBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    ghostBtnText: { fontSize: 13, color: C.muted },
  });
}
