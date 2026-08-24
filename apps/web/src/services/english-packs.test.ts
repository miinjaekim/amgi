import { describe, it, expect } from 'vitest';
import {
  DAILY_LIFE_PACK,
  IDIOMS_PACK,
  buildPackCardDraft,
  getPackEntries,
  getPackTerms,
  getVocabPack,
  getVocabPacks,
  resolvePackBack,
} from '@amgi/core';
import type { VocabPack } from '@amgi/core';

const dailyLife = getPackEntries(DAILY_LIFE_PACK);
const idioms = getPackEntries(IDIOMS_PACK);
const bothPacks: VocabPack[] = [DAILY_LIFE_PACK, IDIOMS_PACK];

describe('the English packs', () => {
  it('sit between TOEIC and the military packs in the English registry', () => {
    expect(getVocabPacks('English').map(pack => pack.id)).toEqual([
      'toeic-core',
      'daily-life',
      'english-idioms',
      'military-unit-en',
      'military-affairs-en',
    ]);
    for (const pack of bothPacks) {
      // Words and phrases, not glyphs — `put yourself in someone's shoes` has
      // no chance in a kana tile.
      expect(pack.layout).toBe('list');
      expect(getVocabPack('Korean', pack.id)).toBeUndefined();
      expect(getVocabPack('Japanese', pack.id)).toBeUndefined();
    }
  });

  /**
   * On an English pack the study side *is* the `english` slot, so an authored
   * English back is overwritten the moment the card saves and no reader could
   * ever see it. Authoring one is not harmless — it is 250 glosses of work that
   * silently does nothing.
   */
  it('authors Korean backs only', () => {
    for (const { study, back } of [...dailyLife, ...idioms]) {
      expect(back.Korean, `${study} has no Korean back`).toBeTruthy();
      expect(back.English, `${study} has an English back that will be overwritten`).toBeUndefined();
    }
  });

  // Both readers land on the Korean back here, for different reasons: it is the
  // native-language back for a Korean speaker, and the only authored one for
  // everybody else.
  it('resolves the Korean back whichever native language is set', () => {
    const kitchen = dailyLife.find(entry => entry.study === 'kitchen')!;
    expect(resolvePackBack(kitchen.back, 'English', 'Korean')).toBe('부엌');
    expect(resolvePackBack(kitchen.back, 'English', 'English')).toBe('부엌');
  });

  /**
   * Saved-marking is keyed on the study text, not on `packId` — so a word in
   * two English packs would show as already-saved in the pack the user has not
   * touched, and its one card would be filed under whichever deck they enrolled
   * in first. Checked across all three list packs the English registry now
   * holds rather than just the new pair.
   */
  it('shares no entry with each other or with TOEIC', () => {
    const [toeic] = getVocabPacks('English');
    const seen = new Map<string, string>();
    for (const pack of [toeic, ...bothPacks]) {
      for (const term of getPackTerms(pack)) {
        const key = term.toLowerCase();
        expect(seen.get(key), `${term} is in both ${seen.get(key)} and ${pack.id}`).toBeUndefined();
        seen.set(key, pack.id);
      }
    }
  });

  it('writes clean lowercase English on the study side', () => {
    for (const { study } of [...dailyLife, ...idioms]) {
      // Letters, spaces and the apostrophe in `have someone's back` — nothing
      // else, and no stray capital or trailing space, which would reach
      // /api/explain as a different string than the one intended.
      expect(study, `${study} is not clean lowercase English`).toMatch(/^[a-z]+(['’][a-z]+)?( [a-z]+(['’][a-z]+)?)*$/);
    }
  });
});

describe('Everyday English pack', () => {
  it('has no duplicate entries', () => {
    const terms = getPackTerms(DAILY_LIFE_PACK);
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms).toHaveLength(149);
  });

  /**
   * A phrasal verb cannot be read from its parts — `put away` is not `put`, and
   * the particle carries the whole meaning. Without the hint the depth call
   * explains the bare verb, which is the same failure 발이 넓다 has in the
   * TOPIK pack.
   */
  it('gives every phrasal verb a context hint', () => {
    const particles = ['away', 'off', 'on', 'in', 'up'];
    const phrasal = dailyLife.filter(entry => {
      const parts = entry.study.split(' ');
      return parts.length === 2 && particles.includes(parts[1]);
    });
    expect(phrasal.length).toBeGreaterThan(4);
    for (const { study, context } of phrasal) {
      expect(context, `${study} has no context hint`).toBeTruthy();
    }
  });

  // The pack's stated filter is concrete over frequent. These are the words it
  // exists to teach; a re-theming that quietly drops the specific half in
  // favour of easier ones would leave the description lying.
  it('keeps the concrete words the pack was built around', () => {
    const terms = getPackTerms(DAILY_LIFE_PACK);
    for (const word of ['faucet', 'drawer', 'leftovers', 'errand', 'deposit', 'prescription']) {
      expect(terms, `${word} has left the pack`).toContain(word);
    }
  });

  it('saves an entry into the english slot with its Korean back', () => {
    const errand = dailyLife.find(entry => entry.study === 'errand')!;
    const draft = buildPackCardDraft(errand, DAILY_LIFE_PACK.id, 'uid-1', 'English');
    expect(draft).toMatchObject({
      term: 'errand',
      english: 'errand',
      korean: '볼일, 심부름',
      termLanguage: 'English',
      packId: 'daily-life',
    });
  });
});

describe('idioms pack', () => {
  it('has no duplicate entries', () => {
    const terms = getPackTerms(IDIOMS_PACK);
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms).toHaveLength(100);
  });

  /**
   * The rule the whole pack rests on. Read compositionally, `spill the beans`
   * is a sentence about legumes and `cost an arm and a leg` is an injury — so
   * every entry has to say what kind of thing it is, and say it in the field
   * that survives onto the saved card as `briefDefinition`, where
   * /api/explain/depth and /api/explain/examples read it months later.
   *
   * The `idiom —` prefix is the convention the TOPIK pack set for its 관용 표현
   * and 사자성어; matching it means one grep finds every figurative entry in
   * the app.
   */
  it('marks every entry as an idiom and says when to use it', () => {
    for (const { study, context } of idioms) {
      expect(context, `${study} has no context hint`).toBeTruthy();
      expect(context, `${study} is not marked as an idiom`).toMatch(/^idiom — /);
      // The hint is an occasion, not a restatement of the Korean back. A bare
      // few words would be the gloss again, in the field meant for usage.
      expect(context!.length, `${study}'s hint is too short to be a usage note`).toBeGreaterThan(30);
    }
  });

  it('carries the usage hint onto the saved card', () => {
    const iceBreaker = idioms.find(entry => entry.study === 'break the ice')!;
    const draft = buildPackCardDraft(iceBreaker, IDIOMS_PACK.id, 'uid-1', 'English');
    expect(draft).toMatchObject({
      term: 'break the ice',
      english: 'break the ice',
      korean: '어색한 분위기를 깨다',
      briefDefinition: iceBreaker.context,
    });
  });
});
