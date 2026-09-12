'use client';
import { useEffect, useState } from 'react';
import {
  Flashcard,
  archiveFlashcard,
  deleteFlashcard,
  restoreFlashcard,
  updateFlashcardFields,
} from '@/services/firestore';
import { ExamplePair } from '@/services/gemini';
import {
  getBackSide,
  getBackSideConfig,
  getCharacterBreakdown,
  hunEum,
  getExampleSides,
  getReading,
  getStudyLangSide,
  getStudyLanguageConfig,
  resolvePackBack,
} from '@amgi/core';
import { useCardEnrichment } from '@/hooks/useCardEnrichment';
import type { PackEntry, StudyLanguage } from '@amgi/core';
import Markdown from '@/components/Markdown';
import { t, partOfSpeechLabel } from '@/lib/i18n';
import PronounceButton from '@/components/PronounceButton';

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
}

interface Props {
  /** A card the account already holds. */
  card?: Flashcard | null;
  /**
   * A pack entry with no card behind it yet — what the deck page passes when
   * you tap something you have not saved. Needs `packId` and `uid` alongside,
   * because the first enrichment writes the card before it writes the depth.
   */
  entry?: PackEntry | null;
  packId?: string;
  uid?: string;
  studyLanguage?: StudyLanguage;
  /** Section headings, buttons and confirmations — chrome. */
  interfaceLanguage: string | null | undefined;
  /**
   * The language this deck is explained in.
   *
   * Everything *on the card* reads from this: which slot holds the back, which
   * reading is shown, the part-of-speech badge, and the language any depth
   * generated here is written in.
   */
  deckNativeLanguage: string;
  onClose: () => void;
  /** Fired after anything is written, so the owner can reload its list. */
  onChanged?: () => void;
}

/**
 * One card, read in full — and the only place a card is deepened.
 *
 * This used to be a read-only view that said "no details" and stopped. That was
 * the whole problem: a card saved from a pack is born with a front and a back
 * and nothing else, so the empty state was the *normal* state for exactly the
 * cards a learner most wanted to understand. The sections below are now
 * generated on demand, which is what lets a pack ship a one-line gloss without
 * that gloss being the end of the story.
 *
 * Enrichment saves first. Asking what a word means is intent to keep it, and
 * the alternative — generating against a card that does not exist, then
 * throwing the result away when the modal closes — spends a model call to show
 * something once.
 */
export default function CardDetailModal({
  card, entry, packId, uid, studyLanguage, interfaceLanguage, deckNativeLanguage, onClose, onChanged,
}: Props) {
  const lang: StudyLanguage = studyLanguage ?? card?.studyLanguage ?? 'Korean';
  const {
    saved, setSaved, isRunning, savingEntry, error, setError, canEnrich,
    save: handleSave, enrich,
  } = useCardEnrichment({
    card, entry, packId, uid, studyLanguage: lang, interfaceLanguage, deckNativeLanguage,
    onChanged: () => onChanged?.(),
  });
  /** Non-null while the back is being edited. */
  const [editDraft, setEditDraft] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // The header reads the same whether or not a card exists behind it, so an
  // unsaved entry is projected onto the two fields it can fill.
  const studySide = saved ? getStudyLangSide(saved) : entry?.study ?? '';
  const backSide = saved
    ? getBackSide(saved, deckNativeLanguage)
    : entry ? resolvePackBack(entry.back, lang, deckNativeLanguage) : '';

  /**
   * A hanja card's back is 훈음 for every reader, and an English native gets
   * the gloss *in addition* — the rule the review screen already follows. Here
   * that needs saying explicitly, because `getBackSide` answers with the slot
   * the language *pair* points at: 물 수 for a Korean native, "water" for an
   * English one, which silently drops the 훈음 for the reader least able to
   * supply it themselves.
   *
   * Keyed on the *deck's* language, not the interface's: this is about which
   * slot the card's back was written into.
   */
  const hunEumLine = lang === 'Hanja'
    ? (saved ? hunEum(saved) : entry?.back.Korean ?? '')
    : '';
  const glossLine = lang === 'Hanja' && deckNativeLanguage !== 'Korean' ? backSide : '';

  const { backField } = getBackSideConfig(lang, deckNativeLanguage);
  const characterBreakdown = saved ? getCharacterBreakdown(saved) : undefined;
  const characterSectionKey = getStudyLanguageConfig(lang).characterSectionKey ?? 'sectionHanja';
  const examples = saved?.examples;
  const hasExamples = !!examples && examples.length > 0;
  const hasDepth = !!(saved?.definition || characterBreakdown || saved?.notes);
  const hasDetails = hasDepth || hasExamples;

  /**
   * Editing, archiving and deleting live here too, because the deck page now
   * opens this for every entry — if management stayed on the deck as its own
   * panel there would be two card surfaces again, which is the thing this is
   * replacing. Only the back is editable: the study side is the pack's own
   * text, and rewriting あ would leave the entry unmatched against its deck.
   */
  async function handleEditSave() {
    if (!saved?.id || editDraft === null) return;
    setError(null);
    try {
      await updateFlashcardFields(saved.id, { [backField]: editDraft }, lang);
      setSaved(prev => (prev ? { ...prev, [backField]: editDraft } : prev));
      setEditDraft(null);
      onChanged?.();
    } catch {
      setError(t(interfaceLanguage, 'errorSaveChanges'));
    }
  }

  async function handleArchiveToggle() {
    if (!saved?.id) return;
    if (!saved.archived && !window.confirm(t(interfaceLanguage, 'confirmArchive'))) return;
    setError(null);
    try {
      const next = !saved.archived;
      await (next ? archiveFlashcard(saved.id, lang) : restoreFlashcard(saved.id, lang));
      setSaved(prev => (prev ? { ...prev, archived: next } : prev));
      onChanged?.();
    } catch {
      setError(t(interfaceLanguage, saved.archived ? 'errorRestoreFlashcard' : 'errorArchiveFlashcard'));
    }
  }

  async function handleDelete() {
    if (!saved?.id) return;
    if (!window.confirm(t(interfaceLanguage, 'confirmDelete'))) return;
    try {
      await deleteFlashcard(saved.id, lang);
      onChanged?.();
      onClose();
    } catch {
      setError(t(interfaceLanguage, 'errorDeleteFlashcard'));
    }
  }

  const actionClass =
    'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl font-mono"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b" style={{ borderColor: 'var(--color-muted)' }}>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-highlight)' }}>{studySide}</h2>
              <PronounceButton text={studySide} furigana={saved?.furigana} eum={saved?.eum} studyLanguage={lang} />
              {/* A fact about the word, so it reads in the deck's language
                  beside the back it describes. */}
              {saved && partOfSpeechLabel(deckNativeLanguage, saved) && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {partOfSpeechLabel(deckNativeLanguage, saved)}
                </span>
              )}
              {saved?.formality && saved.formality !== 'N/A' && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {saved.formality}
                </span>
              )}
              {saved?.gender && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {saved.gender}
                </span>
              )}
              {saved && getReading(saved, lang, deckNativeLanguage) && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {getReading(saved, lang, deckNativeLanguage)}
                </span>
              )}
            </div>
            <p className="text-base mt-1" style={{ color: 'var(--color-text)' }}>
              {lang === 'Hanja' ? hunEumLine : backSide}
            </p>
            {glossLine && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{glossLine}</p>
            )}
            {/* The hint an unsaved entry carries, which is also the sense any
                generated depth will be pinned to. */}
            {!saved && entry?.context && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{entry.context}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-1 p-1 rounded-lg hover:bg-[var(--color-muted)]/30 transition-colors flex-shrink-0"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 pt-4 flex flex-wrap items-center gap-2">
          {!saved && (
            <button
              onClick={handleSave}
              disabled={savingEntry || !canEnrich}
              className={actionClass}
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }}
            >
              {savingEntry ? t(interfaceLanguage, 'cardSaving') : t(interfaceLanguage, 'cardSaveEntry')}
            </button>
          )}
          {/* Only offered where the section is missing: a card that already has
              a definition does not need a second one, and re-rolling authored
              content is a different feature from filling a gap. */}
          {!hasDepth && (
            <button
              onClick={() => enrich('depth')}
              // Only this button waits on this request. Examples stays live.
              disabled={isRunning('depth') || !canEnrich}
              className={actionClass}
              style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
            >
              {isRunning('depth') ? t(interfaceLanguage, 'cardEnriching') : t(interfaceLanguage, 'loadDefinition')}
            </button>
          )}
          {!hasExamples && (
            <button
              onClick={() => enrich('examples')}
              disabled={isRunning('examples') || !canEnrich}
              className={actionClass}
              style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
            >
              {isRunning('examples') ? t(interfaceLanguage, 'cardEnriching') : t(interfaceLanguage, 'loadExamples')}
            </button>
          )}

          {saved?.id && (
            <>
              <span className="flex-1" />
              {editDraft === null && (
                <button
                  onClick={() => setEditDraft(saved[backField] ?? saved.english ?? saved.translation ?? '')}
                  disabled={savingEntry}
                  className={actionClass}
                  style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
                >
                  {t(interfaceLanguage, 'edit')}
                </button>
              )}
              <button
                onClick={handleArchiveToggle}
                disabled={savingEntry}
                className={actionClass}
                style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
              >
                {t(interfaceLanguage, saved.archived ? 'restore' : 'archive')}
              </button>
              <button
                onClick={handleDelete}
                disabled={savingEntry}
                className={`${actionClass} hover:border-red-400 hover:text-red-400`}
                style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
              >
                {t(interfaceLanguage, 'delete')}
              </button>
            </>
          )}
        </div>

        {/* Only the back is editable — see handleEditSave. */}
        {editDraft !== null && (
          <div className="px-6 pt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={editDraft}
              onChange={e => setEditDraft(e.target.value)}
              autoFocus
              className="flex-1 min-w-[12rem] p-2 rounded-lg border text-sm"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
            />
            <button
              onClick={handleEditSave}
              disabled={savingEntry}
              className={actionClass}
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }}
            >
              {t(interfaceLanguage, 'save')}
            </button>
            <button
              onClick={() => setEditDraft(null)}
              className={actionClass}
              style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
            >
              {t(interfaceLanguage, 'cancel')}
            </button>
          </div>
        )}

        {(!saved || error) && (
          <div className="px-6 pt-2 text-xs" style={{ color: error ? 'var(--color-error, #f87171)' : 'var(--color-muted)' }}>
            {error ?? t(interfaceLanguage, 'cardEnrichHint')}
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5">
          {!hasDetails ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'noCardDetails')}
            </p>
          ) : (
            <>
              {saved?.definition && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'sectionDefinition')}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{saved.definition}</Markdown>
                </div>
              )}

              {characterBreakdown && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, characterSectionKey)}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{characterBreakdown}</Markdown>
                </div>
              )}

              {saved?.notes && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'sectionContext')}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{saved.notes}</Markdown>
                </div>
              )}

              {hasExamples && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'sectionExamples')}
                  </h3>
                  <ul className="space-y-3">
                    {(() => {
                      const raw = examples as unknown[];
                      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
                        return (raw as string[]).map((ex, i) => (
                          <li key={i} className="text-sm" style={{ color: 'var(--color-text)' }}>{ex}</li>
                        ));
                      } else if (Array.isArray(raw) && isExamplePairArray(raw)) {
                        return (raw as ExamplePair[]).map((ex, i) => {
                          const sides = getExampleSides(ex, lang, deckNativeLanguage);
                          return (
                            <li key={i}>
                              <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                                {sides.study}
                                <PronounceButton text={sides.study} studyLanguage={lang} size="sm" className="ml-1 align-middle" />
                              </div>
                              <div className="text-sm mt-0.5" style={{ color: 'var(--color-highlight)' }}>{sides.back}</div>
                            </li>
                          );
                        });
                      }
                      return null;
                    })()}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
