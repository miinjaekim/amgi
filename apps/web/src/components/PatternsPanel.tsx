'use client';

import { useEffect, useState } from 'react';
import {
  buildPatternDraft,
  exerciseFormat,
  isPatternDue,
  patternGloss,
} from '@amgi/core';
import type { GrammarPattern, PatternKind, StudyLanguage, TranslationKey } from '@amgi/core';
import {
  archivePattern,
  deletePattern,
  fetchAllUserPatterns,
  restorePattern,
  savePattern,
  updatePatternFields,
} from '@/services/patterns';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';

/**
 * The management half of grammar patterns, mounted behind the Cards/Patterns
 * toggle on `/cards`.
 *
 * Its own component rather than more branches inside the cards page, which is
 * already the longest file in the app — and the two lists share nothing but a
 * page. A pattern is not a `Flashcard`: no deck axis (patterns have no packs),
 * no directions, no import/export, no detail modal. What it does share is the
 * active/archived split, because that question is the same for anything you
 * accumulate.
 */

const KIND_LABEL: Record<PatternKind, TranslationKey> = {
  choice: 'patternKindChoiceShort',
  form: 'patternKindFormShort',
};

interface Props {
  uid: string;
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
}

interface Draft {
  pattern: string;
  gloss: string;
  kind: PatternKind;
}

export default function PatternsPanel({ uid, studyLanguage, nativeLanguage }: Props) {
  const [patterns, setPatterns] = useState<GrammarPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(false);

  // The gloss is stored per language and edited in the reader's own. Writing
  // back to the side they can read is the only honest thing to do — the other
  // side belongs to a reader who isn't here, and overwriting it with text in
  // the wrong language would be worse than leaving it stale.
  const glossField: 'English' | 'Korean' = nativeLanguage === 'Korean' ? 'Korean' : 'English';

  const load = () => {
    setLoading(true);
    fetchAllUserPatterns(uid, studyLanguage)
      .then(setPatterns)
      .catch(() => setError(t(nativeLanguage, 'patternsLoadFailed')))
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
    setDraft({
      pattern: pattern.pattern,
      gloss: pattern.gloss[glossField] ?? '',
      kind: pattern.kind,
    });
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
        // picks its kind themselves, which is the point: it is the most direct
        // statement the app can make about what counts as a pattern, and it is
        // a far cheaper cold-start door than a Learn arm's worth of prompts.
        await savePattern(
          buildPatternDraft(
            {
              pattern: draft.pattern.trim(),
              kind: draft.kind,
              gloss: draft.gloss.trim() ? { [glossField]: draft.gloss.trim() } : {},
            },
            uid,
            studyLanguage,
            'manual',
          ),
        );
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

  const renderForm = () => {
    if (!draft) return null;
    return (
      <div className="p-4 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] space-y-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t(nativeLanguage, 'patternFieldPattern')}
          </label>
          <input
            type="text"
            value={draft.pattern}
            onChange={e => setDraft(d => (d ? { ...d, pattern: e.target.value } : d))}
            placeholder={t(nativeLanguage, 'patternFieldPatternPlaceholder')}
            className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {t(nativeLanguage, 'patternFieldGloss')}
          </label>
          <input
            type="text"
            value={draft.gloss}
            onChange={e => setDraft(d => (d ? { ...d, gloss: e.target.value } : d))}
            placeholder={t(nativeLanguage, 'patternFieldGlossPlaceholder')}
            className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-2">
            {t(nativeLanguage, 'patternFieldKind')}
          </label>
          {/* Two options with their consequence spelled out, not a bare toggle.
              This choice decides whether the pattern ever graduates from
              gap-filling to writing your own sentences, and a learner cannot
              make it from the word "choice" alone. */}
          <div className="flex flex-col gap-2">
            {(['choice', 'form'] as PatternKind[]).map(kind => {
              const selected = draft.kind === kind;
              return (
                <button
                  key={kind}
                  onClick={() => setDraft(d => (d ? { ...d, kind } : d))}
                  className="text-left p-3 rounded-lg border transition-colors"
                  style={
                    selected
                      ? { borderColor: 'var(--color-highlight)', background: 'var(--color-bg)' }
                      : { borderColor: 'var(--color-muted)' }
                  }
                >
                  <span
                    className="block text-sm font-semibold"
                    style={{ color: selected ? 'var(--color-highlight)' : 'var(--color-text)' }}
                  >
                    {t(nativeLanguage, kind === 'choice' ? 'patternKindChoice' : 'patternKindForm')}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, kind === 'choice' ? 'patternKindChoiceHelp' : 'patternKindFormHelp')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={working || !draft.pattern.trim()}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(nativeLanguage, 'save')}
          </button>
          <button
            onClick={cancelEdit}
            className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            {t(nativeLanguage, 'cancel')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowArchived(false)}
          className="px-3 py-2 rounded-lg text-sm border transition-colors"
          style={
            !showArchived
              ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
              : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
          }
        >
          {t(nativeLanguage, 'cardsFilterActive')} ({activeCount})
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className="px-3 py-2 rounded-lg text-sm border transition-colors"
          style={
            showArchived
              ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
              : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
          }
        >
          {t(nativeLanguage, 'cardsFilterArchived')} ({archivedCount})
        </button>
        <button
          onClick={startAdd}
          className="ml-auto px-3 py-2 rounded-lg text-sm border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
        >
          {t(nativeLanguage, 'patternAddManual')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm font-semibold" style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>
          {error}
        </div>
      )}

      {adding && renderForm()}

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-[var(--color-muted)]">
          <Spinner className="w-5 h-5" />
          <span>{t(nativeLanguage, 'patternsLoading')}</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] text-center">
          <p className="text-[var(--color-muted)] text-sm">
            {t(nativeLanguage, showArchived ? 'patternsNoneArchived' : 'patternsNone')}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(pattern => {
            const editing = editingId === pattern.id;
            if (editing) return <li key={pattern.id}>{renderForm()}</li>;
            const due = isPatternDue(pattern);
            const format = exerciseFormat(pattern);
            return (
              <li
                key={pattern.id}
                className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)]"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-bold text-lg text-[var(--color-text)]">{pattern.pattern}</span>
                  {patternGloss(pattern, nativeLanguage) && (
                    <span className="text-sm opacity-60 text-[var(--color-text)]">
                      {patternGloss(pattern, nativeLanguage)}
                    </span>
                  )}
                  <span
                    className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border"
                    style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                  >
                    {t(nativeLanguage, KIND_LABEL[pattern.kind])}
                  </span>
                </div>

                {/* Which rung it is on, and whether it is waiting. Both are
                    derived, so this is a read of the schedule rather than a
                    second copy of it. */}
                <p className="mt-2 text-xs" style={{ color: due ? 'var(--color-highlight)' : 'var(--color-muted)' }}>
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
                </p>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => startEdit(pattern)}
                    className="px-3 py-1 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]"
                  >
                    {t(nativeLanguage, 'edit')}
                  </button>
                  {pattern.archived ? (
                    <button
                      onClick={() => runAction(() => restorePattern(pattern.id!), 'errorRestoreFlashcard')}
                      disabled={working}
                      className="px-3 py-1 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]"
                    >
                      {t(nativeLanguage, 'restore')}
                    </button>
                  ) : (
                    <button
                      onClick={() => runAction(() => archivePattern(pattern.id!), 'errorArchiveFlashcard')}
                      disabled={working}
                      className="px-3 py-1 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]"
                    >
                      {t(nativeLanguage, 'archive')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!window.confirm(t(nativeLanguage, 'patternConfirmDelete'))) return;
                      runAction(() => deletePattern(pattern.id!), 'patternDeleteFailed');
                    }}
                    disabled={working}
                    className="px-3 py-1 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-muted)] hover:border-red-400 hover:text-red-400"
                  >
                    {t(nativeLanguage, 'delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
