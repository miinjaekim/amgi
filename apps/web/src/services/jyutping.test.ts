/**
 * @vitest-environment node
 *
 * `lookupJyutping` reads the table with `node:fs`, as `lookupPitchAccent` does,
 * so this file runs in node for the reason `pitch-accent.test.ts` gives.
 */
import { describe, it, expect } from 'vitest';
import { lookupJyutping, normalizeJyutping } from '@/lib/jyutpingLookup';

describe('lookupJyutping', () => {
  // Each of these is a word the model got wrong when asked alone (2026-10-04),
  // with the answer it gave. The table overrules every one.
  it.each([
    ['長大', 'coeng4 daai6', 'zoeng2 daai6'],
    ['傳記', 'cyun4 gei3', 'zyun6 gei3'],
    ['重量', 'zung6 loeng6', 'cung5 loeng6'],
    ['尷尬', 'gam1 gaai3', 'gaam3 gaai3'],
    ['落雨', 'lok6 yu5', 'lok6 jyu5'], // Yale's "yu" leaking into Jyutping
  ])('overrules the model on %s', (term, said, reading) => {
    expect(lookupJyutping(term, said)).toBe(reading);
  });

  it('needs no model reading where the word has one', () => {
    expect(lookupJyutping('廣東話')).toBe('gwong2 dung1 waa2');
    expect(lookupJyutping('銀行')).toBe('ngan4 hong4');
  });

  it('keeps the model reading when it is one of several the table lists', () => {
    // 行 alone is haang4, hang4 or hong4, and which one depends on the sense
    // the learner asked about — the model saw that and the table did not.
    expect(lookupJyutping('行', 'hong4')).toBe('hong4');
    expect(lookupJyutping('行', 'haang4')).toBe('haang4');
    expect(lookupJyutping('身份證', 'San1 fan6  zing3')).toBe('san1 fan6 zing3');
  });

  it('falls back to the first listed reading when the model names none of them', () => {
    expect(lookupJyutping('行', 'xing2')).toBe('haang4');
    expect(lookupJyutping('嘅')).toBe('ge3'); // not ge2 or koi2: ordered by weight
  });

  it('returns undefined for a term the table does not carry', () => {
    expect(lookupJyutping('我今晚唔得閒')).toBeUndefined();
    expect(lookupJyutping('awkward')).toBeUndefined();
  });
});

describe('normalizeJyutping', () => {
  it('lowercases and collapses spacing, nothing more', () => {
    expect(normalizeJyutping('  Gwong2  dung1 WAA2 ')).toBe('gwong2 dung1 waa2');
  });
});
