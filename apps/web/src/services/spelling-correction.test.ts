import { describe, it, expect } from 'vitest';
import { applySpellingCorrection } from '@amgi/core';
import type { ExplainResult, TermAmbiguous, TermCore } from '@amgi/core';

/**
 * The lookup echoes back the term it was given, so a corrected answer arrives
 * describing one word and labelled with another. Everything here is about the
 * two things that have to happen before a client shows or saves it: the label
 * moves to the corrected spelling, and the correction itself comes off.
 */
const core = (over: Partial<TermCore & { corrected: string | null }> = {}): ExplainResult => ({
  term: 'annyeonghaseyoo',
  termLanguage: 'Korean',
  korean: '안녕하세요',
  english: 'hello',
  ...over,
} as ExplainResult);

describe('applySpellingCorrection', () => {
  it('relabels the result with the corrected spelling', () => {
    const { result, correction } = applySpellingCorrection(
      core({ corrected: 'annyeonghaseyo' }),
      'annyeonghaseyoo'
    );
    expect(result.term).toBe('annyeonghaseyo');
    expect(correction).toEqual({ typed: 'annyeonghaseyoo', corrected: 'annyeonghaseyo' });
  });

  // A card is saved by spreading this object, so the field cannot survive.
  it('takes `corrected` off, corrected or not', () => {
    const corrected = applySpellingCorrection(core({ corrected: 'annyeonghaseyo' }), 'annyeonghaseyoo');
    const untouched = applySpellingCorrection(core({ corrected: null }), 'annyeonghaseyoo');
    expect('corrected' in corrected.result).toBe(false);
    expect('corrected' in untouched.result).toBe(false);
  });

  it('leaves the term alone when nothing was corrected', () => {
    const { result, correction } = applySpellingCorrection(core({ corrected: null }), 'annyeonghaseyoo');
    expect(result.term).toBe('annyeonghaseyoo');
    expect(correction).toBeNull();
  });

  it('reports nothing when the field is absent entirely — an `exact` lookup', () => {
    const { result, correction } = applySpellingCorrection(core(), 'annyeonghaseyoo');
    expect(result.term).toBe('annyeonghaseyoo');
    expect(correction).toBeNull();
  });

  // Announcing "showing results for Fika" over a search for "fika" would be a
  // correction the learner cannot tell from a bug.
  it('ignores a model echoing the term back, in any case or spacing', () => {
    for (const echo of ['fika', 'Fika', '  fika  ']) {
      const { correction } = applySpellingCorrection(core({ term: 'fika', corrected: echo }), 'fika');
      expect(correction).toBeNull();
    }
  });

  it('trims what it reports and what it labels with', () => {
    const { result, correction } = applySpellingCorrection(
      core({ corrected: '  annyeonghaseyo ' }),
      ' annyeonghaseyoo '
    );
    expect(result.term).toBe('annyeonghaseyo');
    expect(correction).toEqual({ typed: 'annyeonghaseyoo', corrected: 'annyeonghaseyo' });
  });

  // The corrected word can turn out to be the ambiguous one, and the picker
  // then re-looks-up `term` — so it has to be the corrected spelling too.
  it('relabels a disambiguation the same way', () => {
    const ambiguous = {
      ambiguous: true,
      term: 'bae',
      termLanguage: 'Korean',
      meanings: [{ label: 'boat', hint: 'a vessel' }, { label: 'pear', hint: 'the fruit' }],
      corrected: '배',
    } as unknown as TermAmbiguous;
    const { result, correction } = applySpellingCorrection(ambiguous, 'bae');
    expect(result.term).toBe('배');
    expect((result as TermAmbiguous).meanings).toHaveLength(2);
    expect(correction?.corrected).toBe('배');
  });

  it('does not mutate what it was given', () => {
    const original = core({ corrected: 'annyeonghaseyo' });
    applySpellingCorrection(original, 'annyeonghaseyoo');
    expect(original.corrected).toBe('annyeonghaseyo');
    expect(original.term).toBe('annyeonghaseyoo');
  });
});
