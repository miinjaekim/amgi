'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flashcard,
  saveFlashcardToFirestore,
  updateFlashcardFields,
} from '@/services/firestore';
import {
  buildPackCardDraft,
  depthFieldsToPersist,
  getDepthTarget,
  parseStreamedDepth,
  parseStreamedExamples,
} from '@amgi/core';
import type { ExamplePair, PackEntry, StudyLanguage } from '@amgi/core';
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
  /**
   * The card as it now stands, after anything was written to it.
   *
   * Handed up rather than merely signalled, because a caller that unmounts this
   * hook — review hiding its details panel — loses everything held in here.
   * Whoever owns the card has to own the generated content too.
   */
  onChanged?: (card: Flashcard) => void;
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
 *
 * **These are the same two routes the Learn page streams from, deliberately.**
 * The non-streaming `/api/explain/depth` and `/api/explain/examples` carry
 * their own, older and plainer prompts — "a clear, detailed definition" against
 * the stream route's "2-3 sentences max, add what the one-liner misses,
 * connotation, nuance, how it differs from near-synonyms, no padding". Calling
 * the same route Learn calls is the only way to guarantee a word explained from
 * a deck reads like the same word explained from Learn; keeping two prompts in
 * sync by hand is a promise nobody keeps.
 */
export function useCardEnrichment({
  card, entry, packId, uid, studyLanguage, nativeLanguage, onChanged,
}: Options) {
  const [saved, setSaved] = useState<Flashcard | null>(card ?? null);
  /**
   * Which kinds are in flight — a set, not a single value.
   *
   * One `working` string meant asking for examples disabled the depth button
   * and vice versa, so the page froze on whichever request went first. They are
   * independent requests against independent fields; there is no reason one
   * should wait on the other.
   */
  const [running, setRunning] = useState<ReadonlySet<EnrichKind>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Review advances through cards without unmounting, so the hook has to follow
  // the card it was handed rather than keeping the one it started with.
  useEffect(() => {
    setSaved(card ?? null);
    setError(null);
  }, [card?.id, card]);

  /**
   * The saved card, readable from inside an in-flight request without making it
   * a dependency — two enrichments running at once must not each capture a
   * stale copy and clobber the other's write.
   */
  const savedRef = useRef<Flashcard | null>(saved);
  useEffect(() => { savedRef.current = saved; }, [saved]);

  const apply = useCallback((fields: Partial<Flashcard>) => {
    setSaved(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...fields };
      savedRef.current = next;
      return next;
    });
  }, []);

  /** The card to write to, saving the pack entry first if there isn't one yet. */
  const ensureSaved = useCallback(async (): Promise<Flashcard | null> => {
    const current = savedRef.current;
    if (current?.id) return current;
    if (!entry || !packId || !uid) return null;
    const draft = buildPackCardDraft(entry, packId, uid, studyLanguage);
    const id = await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
    const next = { ...draft, id } as unknown as Flashcard;
    savedRef.current = next;
    setSaved(next);
    onChanged?.(next);
    return next;
  }, [entry, packId, uid, studyLanguage, onChanged]);

  const [savingEntry, setSavingEntry] = useState(false);
  const save = useCallback(async () => {
    setSavingEntry(true);
    setError(null);
    try {
      if (!await ensureSaved()) setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingEntry(false);
    }
  }, [ensureSaved, nativeLanguage]);

  const enrich = useCallback(async (kind: EnrichKind) => {
    setRunning(prev => new Set(prev).add(kind));
    setError(null);
    const finish = () => setRunning(prev => {
      const next = new Set(prev);
      next.delete(kind);
      return next;
    });

    try {
      const target = await ensureSaved();
      if (!target?.id) { setError(t(nativeLanguage, 'errorSaveFlashcard')); return; }
      // getDepthTarget resolves which sense to elaborate on — for a pack card
      // that is the `briefDefinition` the entry's context hint was carried into,
      // which is what keeps depth on `fine` about penalties.
      const depthTarget = getDepthTarget(target, studyLanguage, nativeLanguage);

      const route = kind === 'depth' ? 'depth-stream' : 'examples-stream';
      const res = await fetch(`/api/explain/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...depthTarget, nativeLanguage, studyLanguage }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      // Rendered as it arrives, which is the other half of why these are the
      // streaming routes: a definition that appears line by line does not need
      // the rest of the page held still while it does.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (kind === 'depth') {
          apply(depthFieldsToPersist(parseStreamedDepth(acc)) as Partial<Flashcard>);
        } else {
          const partial = parseStreamedExamples(acc, studyLanguage, nativeLanguage);
          if (partial.length) apply({ examples: partial });
        }
      }

      if (kind === 'depth') {
        const fields = depthFieldsToPersist(parseStreamedDepth(acc));
        // Nothing usable came back. Say so rather than silently doing nothing —
        // the user just waited on a request.
        if (Object.keys(fields).length === 0) { setError(t(nativeLanguage, 'cardEnrichError')); return; }
        await updateFlashcardFields(target.id, fields, studyLanguage);
        apply(fields as Partial<Flashcard>);
        onChanged?.({ ...savedRef.current!, ...fields } as Flashcard);
      } else {
        const examples: ExamplePair[] = parseStreamedExamples(acc, studyLanguage, nativeLanguage);
        if (!examples.length) { setError(t(nativeLanguage, 'cardEnrichError')); return; }
        await updateFlashcardFields(target.id, { examples }, studyLanguage);
        apply({ examples });
        onChanged?.({ ...savedRef.current!, examples } as Flashcard);
      }
    } catch {
      setError(t(nativeLanguage, 'cardEnrichError'));
    } finally {
      finish();
    }
  }, [ensureSaved, studyLanguage, nativeLanguage, onChanged, apply]);

  return {
    /** The card as it now stands, including anything mid-stream. */
    saved,
    setSaved,
    /** Whether this particular kind is in flight — the other stays clickable. */
    isRunning: (kind: EnrichKind) => running.has(kind),
    savingEntry,
    error,
    setError,
    canEnrich: !!saved?.id || !!(entry && packId && uid),
    ensureSaved,
    save,
    enrich,
  };
}
