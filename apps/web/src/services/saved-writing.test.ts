import { describe, it, expect } from 'vitest';
import {
  buildSavedWriting, parseSavedWriting, savedWritingsFor, writingFirstLine, writingsToText,
} from '@amgi/core';
import type { SavedWriting, WritingReview } from '@amgi/core';

const review: WritingReview = {
  rewrite: "Hier, je suis allé au marché.",
  rewriteNative: 'Yesterday I went to the market.',
  findings: [
    { kind: 'grammar', original: 'j\'ai allé', suggested: 'je suis allé', note: 'aller takes être.' },
    {
      kind: 'vocabulary', note: 'The word you were reaching for.',
      card: { study: 'le marché', back: { English: 'market', Korean: '시장' }, gap: true },
    },
  ],
};

describe('buildSavedWriting', () => {
  it('keeps the passage, the whole review, both languages and the date', () => {
    expect(buildSavedWriting("Hier, j'ai allé au market.", review, 'French', 'English', 1_000)).toEqual({
      passage: "Hier, j'ai allé au market.",
      review,
      studyLanguage: 'French',
      nativeLanguage: 'English',
      createdAt: 1_000,
    });
  });

  // Firestore rejects a document carrying `undefined` anywhere in it.
  it('carries no undefined key, at any depth', () => {
    const loose = {
      ...review,
      rewriteNative: undefined,
      findings: [{ kind: 'grammar', note: 'n', original: undefined }],
    } as unknown as WritingReview;
    const doc = buildSavedWriting('p', loose, 'French', null, 1);
    expect('nativeLanguage' in doc).toBe(false);
    expect('rewriteNative' in doc.review).toBe(false);
    expect('original' in doc.review.findings[0]).toBe(false);
  });
});

describe('parseSavedWriting', () => {
  it('round-trips what was built', () => {
    const doc = buildSavedWriting('passage', review, 'French', 'Korean', 5);
    expect(parseSavedWriting('abc', doc)).toEqual({ id: 'abc', ...doc });
  });

  it('keeps each finding\'s kind, which later statistics count by', () => {
    const parsed = parseSavedWriting('a', buildSavedWriting('p', review, 'French', 'English', 5));
    expect(parsed?.review.findings.map(f => f.kind)).toEqual(['grammar', 'vocabulary']);
  });

  it('drops a malformed finding rather than the writing', () => {
    const doc = { passage: 'p', studyLanguage: 'French', createdAt: 5, review: { rewrite: 'r', findings: [{ kind: 'grammar' }, { kind: 'register', note: 'ok' }] } };
    expect(parseSavedWriting('a', doc)?.review.findings).toEqual([{ kind: 'register', note: 'ok' }]);
  });

  it('refuses a document that is not a saved writing', () => {
    const good = buildSavedWriting('p', review, 'French', 'English', 5);
    expect(parseSavedWriting('a', null)).toBeNull();
    expect(parseSavedWriting('a', { ...good, passage: '  ' })).toBeNull();
    expect(parseSavedWriting('a', { ...good, studyLanguage: 'Klingon' })).toBeNull();
    expect(parseSavedWriting('a', { ...good, createdAt: 'yesterday' })).toBeNull();
    expect(parseSavedWriting('a', { ...good, review: { findings: [] } })).toBeNull();
  });
});

describe('writingFirstLine', () => {
  it('is the first line with anything on it, trimmed', () => {
    expect(writingFirstLine('\n  \n  Bonjour.  \nLa suite.')).toBe('Bonjour.');
    expect(writingFirstLine('Une seule ligne')).toBe('Une seule ligne');
  });
});

describe('savedWritingsFor', () => {
  it('narrows to one study language, newest first', () => {
    const w = (id: string, studyLanguage: SavedWriting['studyLanguage'], createdAt: number): SavedWriting =>
      ({ id, passage: 'p', review, studyLanguage, createdAt });
    const all = [w('a', 'French', 1), w('b', 'Korean', 2), w('c', 'French', 3)];
    expect(savedWritingsFor(all, 'French').map(x => x.id)).toEqual(['c', 'a']);
  });
});

describe('writingsToText', () => {
  const at = (iso: string) => Date.parse(iso);
  const one: SavedWriting = {
    id: 'a', passage: "Hier, j'ai allé au market.", review, studyLanguage: 'French',
    nativeLanguage: 'English', createdAt: at('2026-10-06T10:00:00Z'),
  };

  it('writes the passage, the rewrite, its meaning and each finding', () => {
    expect(writingsToText([one], 'English')).toBe([
      '2026-10-06 · French',
      '='.repeat(40),
      '',
      '[What you wrote]',
      "Hier, j'ai allé au market.",
      '',
      '[Native version]',
      'Hier, je suis allé au marché.',
      '',
      '[What that says]',
      'Yesterday I went to the market.',
      '',
      '[What to notice]',
      "1. (grammar) j'ai allé → je suis allé",
      '   aller takes être.',
      '2. (vocabulary)',
      '   The word you were reaching for.',
      '   + le marché — market',
      '',
    ].join('\n'));
  });

  it('puts the newest first and covers every language', () => {
    const older: SavedWriting = { ...one, id: 'b', studyLanguage: 'Korean', createdAt: at('2026-09-01T10:00:00Z') };
    const text = writingsToText([older, one], 'English');
    expect(text.indexOf('2026-10-06 · French')).toBeLessThan(text.indexOf('2026-09-01 · Korean'));
  });

  it('reads a card back in the language the writing was saved in', () => {
    expect(writingsToText([{ ...one, nativeLanguage: 'Korean' }], 'Korean')).toContain('+ le marché — 시장');
  });

  it('is empty for no writings', () => {
    expect(writingsToText([], 'English')).toBe('');
  });
});
