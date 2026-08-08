import { describe, it, expect } from 'vitest';
import {
  MILITARY_AFFAIRS_PACK_EN,
  MILITARY_AFFAIRS_PACK_KO,
  MILITARY_UNIT_PACK_EN,
  MILITARY_UNIT_PACK_KO,
  buildPackCardDraft,
  getPackEntries,
  getVocabPack,
  getVocabPacks,
  resolvePackBack,
} from '@amgi/core';
import type { VocabPack } from '@amgi/core';

const PAIRS = [
  { ko: MILITARY_UNIT_PACK_KO, en: MILITARY_UNIT_PACK_EN, base: 'military-unit', size: 220 },
  { ko: MILITARY_AFFAIRS_PACK_KO, en: MILITARY_AFFAIRS_PACK_EN, base: 'military-affairs', size: 254 },
];

const koreanPacks = [MILITARY_UNIT_PACK_KO, MILITARY_AFFAIRS_PACK_KO];
const englishPacks = [MILITARY_UNIT_PACK_EN, MILITARY_AFFAIRS_PACK_EN];

describe('military packs', () => {
  // These are the first packs to appear in two registries. The registration is
  // the whole design — one authored source of pairs, read once per direction —
  // so it is the first thing that has to hold.
  it('registers each pack under both study languages', () => {
    expect(getVocabPacks('English').map(p => p.id)).toEqual([
      'toeic-core',
      'military-unit-en',
      'military-affairs-en',
    ]);
    expect(getVocabPacks('Korean').map(p => p.id)).toEqual([
      'topik-advanced',
      'military-unit-ko',
      'military-affairs-ko',
    ]);
  });

  // The deck route resolves its pack from a URL id, so a direction being
  // reachable from the wrong registry would serve a Korean learner the deck
  // where Korean is the answer.
  it('keeps each direction out of the other language’s registry', () => {
    for (const { base } of PAIRS) {
      expect(getVocabPack('Korean', `${base}-ko`)?.id).toBe(`${base}-ko`);
      expect(getVocabPack('English', `${base}-en`)?.id).toBe(`${base}-en`);
      expect(getVocabPack('Korean', `${base}-en`)).toBeUndefined();
      expect(getVocabPack('English', `${base}-ko`)).toBeUndefined();
      expect(getVocabPack('Japanese', `${base}-ko`)).toBeUndefined();
    }
  });

  // `getCollectionId` returns `card.packId` unqualified, so two directions
  // sharing an id would collapse cards saved from the Korean deck and the
  // English deck into one collection on /cards. The suffix is what keeps them
  // apart, and it has to stay unique against every other pack too.
  it('gives all four registrations distinct ids', () => {
    const all = (['English', 'Korean', 'Japanese'] as const).flatMap(lang =>
      getVocabPacks(lang).map(p => p.id),
    );
    expect(new Set(all).size).toBe(all.length);
  });

  // The two directions are derived from one source, so a section added to one
  // and not the other is not a thing that can happen — this is the check that
  // nobody has hand-edited the derived output back apart.
  it('derives both directions from the same sections', () => {
    for (const { ko, en, size } of PAIRS) {
      expect(ko.sections.map(s => s.id)).toEqual(en.sections.map(s => s.id));
      expect(new Set(ko.sections.map(s => s.id)).size).toBe(ko.sections.length);
      expect(ko.sections).toHaveLength(10);
      expect(getPackEntries(ko)).toHaveLength(size);
      expect(getPackEntries(en)).toHaveLength(size);
      for (const section of ko.sections) {
        expect(section.entries.length, `${section.id} is empty`).toBeGreaterThan(0);
        expect(section.name.Korean, `${section.id} has no Korean name`).toBeTruthy();
        expect(section.name.English, `${section.id} has no English name`).toBeTruthy();
      }
    }
  });

  // The pair is the unit of study, which only means anything if the same pair
  // really is on both decks with the sides swapped.
  it('mirrors every pair across the two directions', () => {
    for (const { ko, en } of PAIRS) {
      const forward = getPackEntries(ko);
      const reverse = new Map(getPackEntries(en).map(e => [e.study, e]));
      expect(reverse.size).toBe(forward.length);
      for (const entry of forward) {
        const english = entry.back.English!;
        const mirrored = reverse.get(english);
        expect(mirrored, `${entry.study} has no ${english} card on the English deck`).toBeDefined();
        expect(mirrored!.back.Korean).toBe(entry.study);
        // The hint is the same sentence both ways. It is written in English on
        // both directions, which is the house style — TOEIC glosses English
        // words for Korean natives in English too.
        expect(mirrored!.context).toBe(entry.context);
      }
    }
  });

  // Two cards sharing a front are ambiguous; two sharing a back make
  // back-to-front review unanswerable. The drafts enforce this *across* both
  // packs rather than within one, which is why three traps sit in 안보·정세
  // even though they belong to 부대·참모's traps section by nature.
  it('repeats no term and no answer across both packs, in either direction', () => {
    for (const packs of [koreanPacks, englishPacks]) {
      const fronts = new Set<string>();
      const backs = new Set<string>();
      for (const pack of packs) {
        for (const entry of getPackEntries(pack)) {
          const front = entry.study.toLowerCase();
          const back = resolvePackBack(entry.back, pack.id.endsWith('-ko') ? 'Korean' : 'English', null).toLowerCase();
          expect(fronts.has(front), `${entry.study} appears twice`).toBe(false);
          expect(backs.has(back), `${back} is the answer to two cards`).toBe(false);
          fronts.add(front);
          backs.add(back);
        }
      }
    }
  });

  // Only the opposite side is authored. `buildPackCardDraft` writes the study
  // side last, so an authored back in the study slot could never be read and
  // its only effect would be to look authored.
  it('authors exactly the side the reader will get', () => {
    for (const pack of koreanPacks) {
      for (const { study, back } of getPackEntries(pack)) {
        expect(back.English, `${study} has no English back`).toBeTruthy();
        expect(back.Korean, `${study} authored a Korean back that cannot be stored`).toBeUndefined();
      }
    }
    for (const pack of englishPacks) {
      for (const { study, back } of getPackEntries(pack)) {
        expect(back.Korean, `${study} has no Korean back`).toBeTruthy();
        expect(back.English, `${study} authored an English back that cannot be stored`).toBeUndefined();
      }
    }
  });

  // Both directions are saved to Firestore by the same builder, and the study
  // side has to win over the authored side that lands in the same slot.
  it('writes the study side into the study slot on both directions', () => {
    const ko = getPackEntries(MILITARY_UNIT_PACK_KO).find(e => e.study === '대대')!;
    const en = getPackEntries(MILITARY_UNIT_PACK_EN).find(e => e.study === 'battalion')!;
    expect(buildPackCardDraft(ko, 'military-unit-ko', 'uid-1', 'Korean')).toMatchObject({
      term: '대대',
      korean: '대대',
      english: 'battalion',
      packId: 'military-unit-ko',
    });
    expect(buildPackCardDraft(en, 'military-unit-en', 'uid-1', 'English')).toMatchObject({
      term: 'battalion',
      english: 'battalion',
      korean: '대대',
      packId: 'military-unit-en',
    });
  });

  // Hints survive onto the card as `briefDefinition`, where the depth and
  // examples calls read them. 병장 is the case the field exists for: the whole
  // content of the entry is that the chart says "Sergeant" and the authority a
  // US listener hears in that word is not there.
  it('carries the trap hints onto the saved card', () => {
    const byTerm = new Map(getPackEntries(MILITARY_UNIT_PACK_KO).map(e => [e.study, e]));
    for (const term of ['병장', '부사관', '상황실', '관심병사', '군사경찰']) {
      expect(byTerm.get(term)?.context, `${term} needs its hint`).toBeTruthy();
    }
    const draft = buildPackCardDraft(byTerm.get('병장')!, 'military-unit-ko', 'uid-1', 'Korean');
    expect(draft.briefDefinition).toContain('Sergeant');
  });

  // Assembled by hand from published sources, so a term pasted with a trailing
  // space or a stray latin character is the realistic typo — and it would reach
  // /api/explain as a different term than the one intended. Hanja, digits and
  // middle dots are legitimate here (전역(戰役), 12해리, 6·25전쟁, A급 전범),
  // so the check is that the Korean side is trimmed and actually has hangul in
  // it rather than that it is hangul and nothing else.
  it('writes clean text on both sides', () => {
    for (const pack of koreanPacks) {
      for (const { study, back } of getPackEntries(pack)) {
        expect(study, `${study} is not trimmed`).toBe(study.trim());
        expect(study, `${study} has no hangul in it`).toMatch(/[가-힣]/);
        expect(back.English, `${study} back is not trimmed`).toBe(back.English!.trim());
      }
    }
  });

  it('is a list of words, worth hearing in both directions', () => {
    for (const pack of [...koreanPacks, ...englishPacks] as VocabPack[]) {
      // Words, not glyphs — 잠수함발사 탄도미사일 does not fit in a kana tile.
      expect(pack.layout).toBe('list');
      // Both directions have a spoken failure mode: a Korean interpreter has to
      // say "howitzer" out loud, an English native has to say 곡사포.
      expect(pack.pronounceable).toBe(true);
    }
  });

  // The name is shared across a direction pair and has to work in both UIs, so
  // neither side can say "Military English" — that would be wrong for the
  // English native studying Korean.
  it('names each pack the same in both directions', () => {
    for (const { ko, en } of PAIRS) {
      expect(ko.name).toEqual(en.name);
      expect(ko.description).toEqual(en.description);
      expect(ko.name.English).not.toMatch(/military english/i);
      expect(ko.name.Korean).toMatch(/군사용어/);
    }
  });
});
