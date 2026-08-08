import { describe, it, expect } from 'vitest';
import { diffText, hasChanges, tokenize } from '@amgi/core';
import type { DiffSegment } from '@amgi/core';

/** The diff is lossless in both directions — that is the property that matters. */
const before = (segments: DiffSegment[]) =>
  segments.filter(s => s.op !== 'add').map(s => s.text).join('');
const after = (segments: DiffSegment[]) =>
  segments.filter(s => s.op !== 'remove').map(s => s.text).join('');

describe('tokenize', () => {
  it('splits words in a space-separated language', () => {
    expect(tokenize('je ai mangé', 'fr').join('|')).toBe('je| |ai| |mangé');
  });

  // Half the study languages do not put spaces between words. A whitespace
  // split gives one token and a diff that can only say "all of this changed",
  // which is the useless output this feature exists to replace.
  it('splits words in a language written without spaces', () => {
    const tokens = tokenize('私は昨日映画を見ました', 'ja');
    expect(tokens.length).toBeGreaterThan(3);
    expect(tokens.join('')).toBe('私は昨日映画を見ました');
  });

  it('is lossless, so the diff can rebuild either text exactly', () => {
    for (const [text, locale] of [
      ['Hier, je suis allé au marché.', 'fr'],
      ['어제 친구하고 밥을 먹었어요.', 'ko'],
      ['  leading and trailing  ', 'en'],
    ] as const) {
      expect(tokenize(text, locale).join('')).toBe(text);
    }
  });
});

describe('diffText', () => {
  it('marks a single replaced word and leaves the rest alone', () => {
    const segments = diffText('je veux du pain', 'je veux du gâteau', 'fr');
    expect(segments.filter(s => s.op === 'remove').map(s => s.text)).toEqual(['pain']);
    expect(segments.filter(s => s.op === 'add').map(s => s.text)).toEqual(['gâteau']);
  });

  it('rebuilds both inputs exactly', () => {
    const cases: [string, string, string][] = [
      ['je ai mangé une pomme', "j'ai mangé une pomme", 'fr'],
      ['어제 학교에 가고 있었어요. 그런데 비가 왔어요.', '어제 학교에 가고 있었는데 비가 왔어요.', 'ko'],
      ['私は昨日映画を見ました', '私は昨日映画を観ました', 'ja'],
      ['', 'a whole new sentence', 'en'],
      ['a deleted sentence', '', 'en'],
    ];
    for (const [a, b, locale] of cases) {
      const segments = diffText(a, b, locale);
      expect(before(segments)).toBe(a);
      expect(after(segments)).toBe(b);
    }
  });

  it('reports no changes when the passage was already natural', () => {
    const segments = diffText('c\'est parfait', 'c\'est parfait', 'fr');
    expect(hasChanges(segments)).toBe(false);
    expect(segments).toEqual([{ op: 'same', text: "c'est parfait" }]);
  });

  it('handles both texts being empty', () => {
    expect(diffText('', '', 'en')).toEqual([]);
  });

  // A single edit emitted as add/remove/add reads as though three things
  // happened. Every run is ordered so a change is always "what was there, then
  // what replaces it".
  it('puts removals before additions within one change', () => {
    const segments = diffText('le chat noir dort', 'le chien blanc dort', 'fr');
    const ops = segments.map(s => s.op);
    for (let i = 0; i < ops.length - 1; i++) {
      if (ops[i] === 'add') expect(ops[i + 1]).not.toBe('remove');
    }
  });

  it('never emits an empty segment', () => {
    const segments = diffText('one two three', 'one three four', 'en');
    expect(segments.every(s => s.text.length > 0)).toBe(true);
  });

  it('keeps unchanged text in as few segments as it can', () => {
    // Adjacent same-op tokens are merged, so the common tail here is one
    // segment rather than one per word — which is what keeps the rendered
    // output from being a hundred spans.
    const segments = diffText('bad start and then a long common tail', 'good start and then a long common tail', 'en');
    expect(segments.filter(s => s.op === 'same')).toHaveLength(1);
  });
});
