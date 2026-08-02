'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Flashcard,
  saveFlashcardToFirestore,
  updateFlashcardFields,
} from '@/services/firestore';
import { getTermDepth, getTermExamples } from '@/services/gemini';
import { buildPackCardDraft, depthFieldsToPersist, getDepthTarget } from '@amgi/core';
import type { PackEntry, StudyLanguage } from '@amgi/core';
import { t } from '@/lib/i18n';

interface Options {
  /** A card the account already holds. */
  card?: Flashcard | null;
  /**
   * A pack entry with no card behind it yet. Needs `packId` and `uid`
   * alongside, because the first enrichment writes the card before the depth.
   */
  entry?: PackEntry | null;
  packId?: string;
  uid?: string;
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
  /** Fired after anything is written, so the owner can reload its list. */
  onChanged?: () => void;
}

export type EnrichKind = 'depth' | 'examples';

/**
 * Generating a card's depth on demand, and persisting it.
 *
 * A hook rather than a component because the two surfaces that need it want
 * completely different chrome: the card modal shows buttons in a row above a
 * scrollable body, review shows them inside a details panel that is already
 * nested three levels deep and duplicated per direction. What must not differ
 * is the behaviour — which card gets written, which sense the model is told to
 * explain, and what counts as an empty result — so that part lives here.
 */
export function useCardEnrichment({
  card, entry, packId, uid, studyLanguage, nativeLanguage, onChanged,
}: Options) {
  const [saved, setSaved] = useState<Flashcard | null>(card ?? null);
  const [working, setWorking] = useState<EnrichKind | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Review advances through cards without unmounting, so the hook has to follow
  // the card it was handed rather than keeping the one it started with.
  useEffect(() => {
    setSaved(card ?? null);
    setError(null);
  }, [card?.id, card]);

  /** The card to write to, saving the pack entry first if there isn't one yet. */
  const ensureSaved = useCallback(async (): Promise<Flashcard | null> => {
    if (saved?.id) return saved;
    if (!entry || !packId || !uid) return null;
    const draft = buildPackCardDraft(entry, packId, uid, studyLanguage);
    const id = await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
    const next = { ...draft, id } as unknown as Flashcard;
    setSaved(next);
    onChanged?.();
    return next;
  }, [saved, entry, packId, uid, studyLanguage, onChanged]);

  const save = useCallback(async () => {
    setWorking('save');
    setError(null);
    try {
      if (!await ensureSaved()) setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setWorking(null);
    }
  }, [ensureSaved, nativeLanguage]);

  const enrich = useCallback(async (kind: EnrichKind) => {
    setWorking(kind);
    setError(null);
    try {
      const target = await ensureSaved();
      if (!target?.id) { setError(t(nativeLanguage, 'errorSaveFlashcard')); return; }
      // getDepthTarget resolves which sense to elaborate on — for a pack card
      // that is the `briefDefinition` the entry's context hint was carried into,
      // which is what keeps depth on `fine` about penalties.
      const { term, termLanguage, translation, briefDefinition } =
        getDepthTarget(target, studyLanguage, nativeLanguage);
      const sense = { translation, briefDefinition };

      if (kind === 'depth') {
        const depth = await getTermDepth(term, termLanguage, nativeLanguage ?? 'English', '', studyLanguage, sense);
        const fields = depthFieldsToPersist(depth);
        // Nothing usable came back. Say so rather than silently doing nothing —
        // the user just waited on a request.
        if (Object.keys(fields).length === 0) { setError(t(nativeLanguage, 'cardEnrichError')); return; }
        await updateFlashcardFields(target.id, fields, studyLanguage);
        setSaved(prev => (prev ? { ...prev, ...fields } : prev));
      } else {
        const examples = await getTermExamples(term, termLanguage, nativeLanguage ?? 'English', '', studyLanguage, sense);
        if (!examples?.length) { setError(t(nativeLanguage, 'cardEnrichError')); return; }
        await updateFlashcardFields(target.id, { examples }, studyLanguage);
        setSaved(prev => (prev ? { ...prev, examples } : prev));
      }
      onChanged?.();
    } catch {
      setError(t(nativeLanguage, 'cardEnrichError'));
    } finally {
      setWorking(null);
    }
  }, [ensureSaved, studyLanguage, nativeLanguage, onChanged]);

  return {
    /** The card as it now stands, including anything just written to it. */
    saved,
    setSaved,
    working,
    error,
    setError,
    busy: working !== null,
    canEnrich: !!saved?.id || !!(entry && packId && uid),
    ensureSaved,
    save,
    enrich,
  };
}
