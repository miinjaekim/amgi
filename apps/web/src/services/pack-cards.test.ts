import { describe, it, expect } from 'vitest';
import {
  HIRAGANA_PACK,
  buildPackCardDraft,
  collectSavedTerms,
  countSavedPackTerms,
  getPackEntries,
  getVocabPack,
  getVocabPacks,
  resolvePackBack,
  unsavedEntries,
  SUPPORTED_STUDY_LANGUAGES,
  getStudyLanguageConfig,
} from '@amgi/core';
import type { CardSides } from '@amgi/core';

describe('getVocabPack', () => {
  it('finds a pack by id within the study language', () => {
    expect(getVocabPack('Japanese', 'kana-hiragana')?.id).toBe('kana-hiragana');
    expect(getVocabPack('English', 'toeic-core')?.id).toBe('toeic-core');
  });

  // The deck route reads its id from the URL, so a stale bookmark or a study
  // language switched mid-browse must resolve to nothing rather than to another
  // language's pack.
  it('does not reach across study languages', () => {
    expect(getVocabPack('English', 'kana-hiragana')).toBeUndefined();
    expect(getVocabPack('Korean', 'toeic-core')).toBeUndefined();
    expect(getVocabPack('Japanese', 'nonsense')).toBeUndefined();
  });
});

describe('collectSavedTerms', () => {
  it('lowercases both the study side and the original term', () => {
    const cards: CardSides[] = [
      { studyLanguage: 'Japanese', japanese: 'あ', term: 'あ' },
      { studyLanguage: 'English', english: 'Comply', term: 'comply' },
    ];
    const terms = collectSavedTerms(cards);
    expect(terms.has('あ')).toBe(true);
    expect(terms.has('comply')).toBe(true);
  });

  // Progress deliberately matches on text, not packId — a word looked up on
  // your own counts, and every card saved before packId existed carries none.
  it('credits a card that never came from a pack', () => {
    const looked: CardSides[] = [{ studyLanguage: 'English', english: 'comply' }];
    const saved = collectSavedTerms(looked);
    expect(countSavedPackTerms(getVocabPacks('English')[0], saved)).toBe(1);
  });

  it('reads the study side per card, not per collection', () => {
    const mixed: CardSides[] = [
      { studyLanguage: 'Japanese', japanese: 'か' },
      { studyLanguage: 'Korean', korean: '갈등' },
    ];
    const terms = collectSavedTerms(mixed);
    expect(terms.has('か')).toBe(true);
    expect(terms.has('갈등')).toBe(true);
  });
});

describe('unsavedEntries', () => {
  const entries = getPackEntries(HIRAGANA_PACK);

  it('returns the entries not already held', () => {
    const saved = new Set(['あ', 'い']);
    const unsaved = unsavedEntries(entries, saved)!;
    expect(unsaved).toHaveLength(entries.length - 2);
    expect(unsaved.map(e => e.study)).not.toContain('あ');
  });

  it('returns everything when the account genuinely has none', () => {
    expect(unsavedEntries(entries, new Set())).toHaveLength(entries.length);
  });

  // The regression. A null saved-set means the fetch is in flight or failed,
  // and the enrol path used to read it as "nothing saved" and re-add the whole
  // deck — one account ended up holding all 71 katakana cards twice. Unknown
  // has to stay unknown all the way to the caller.
  it('refuses to answer when the saved set is unknown', () => {
    expect(unsavedEntries(entries, null)).toBeNull();
  });

  it('matches case-insensitively, as saved terms are stored', () => {
    const one = [{ study: 'Comply', back: { Korean: '따르다' } }];
    expect(unsavedEntries(one, new Set(['comply']))).toHaveLength(0);
  });

  // Taking entries rather than a pack is what lets one function serve both
  // enrolment units — a section, or the whole deck.
  it('scopes to whichever entries it is handed', () => {
    const section = HIRAGANA_PACK.sections[0];
    const unsaved = unsavedEntries(section.entries, new Set())!;
    expect(unsaved).toHaveLength(section.entries.length);
    expect(unsaved.length).toBeLessThan(entries.length);
  });
});

describe('resolvePackBack', () => {
  // The case `getPackText` gets wrong. On an English pack the English slot is
  // the *front* of the card, so both a Korean native and an English native read
  // the Korean back — the back belongs to the pair of languages, not to the
  // reader alone.
  it('picks the side the card will actually store', () => {
    const back = { Korean: '준수하다' };
    expect(resolvePackBack(back, 'English', 'Korean')).toBe('준수하다');
    expect(resolvePackBack(back, 'English', 'English')).toBe('준수하다');
  });

  it('follows native language where the two languages differ', () => {
    const back = { English: 'a', Korean: '아' };
    expect(resolvePackBack(back, 'Japanese', 'English')).toBe('a');
    expect(resolvePackBack(back, 'Japanese', 'Korean')).toBe('아');
  });

  // A pack authors only the side it can store, so the other side is routinely
  // absent and must never render as blank.
  it('falls back to whichever side exists', () => {
    expect(resolvePackBack({ English: 'conflict' }, 'Korean', 'Korean')).toBe('conflict');
    expect(resolvePackBack({}, 'Korean', 'English')).toBe('');
  });
});

describe('buildPackCardDraft', () => {
  it('stamps the pack it came from', () => {
    const draft = buildPackCardDraft(getPackEntries(HIRAGANA_PACK)[0], 'hiragana', 'uid-1', 'Japanese');
    expect(draft.packId).toBe('hiragana');
    expect(draft.uid).toBe('uid-1');
    expect(draft.termLanguage).toBe('Japanese');
  });

  // Both authored backs are stored, not just the one the saver happened to be
  // reading — this is what lets `getBackSide` switch with native language on a
  // card that is already saved.
  it('fills the study side and both backs', () => {
    const draft = buildPackCardDraft(
      { study: 'あ', back: { English: 'a', Korean: '아' } },
      'kana-hiragana', 'uid-1', 'Japanese',
    );
    expect(draft.japanese).toBe('あ');
    expect(draft.english).toBe('a');
    expect(draft.korean).toBe('아');
  });

  // The study side is one of the two back slots on an English or Korean deck,
  // so it has to be written last — a back overwriting the front would leave the
  // card unmatched against the deck it came from.
  it('never lets a back overwrite the study side', () => {
    const draft = buildPackCardDraft(
      { study: 'comply', back: { Korean: '준수하다, 따르다' } },
      'toeic-core', 'uid-1', 'English',
    );
    expect(draft.english).toBe('comply');
    expect(draft.korean).toBe('준수하다, 따르다');

    const ko = buildPackCardDraft(
      { study: '갈등', back: { English: 'conflict' } }, 'p', 'uid-1', 'Korean',
    );
    expect(ko.korean).toBe('갈등');
    expect(ko.english).toBe('conflict');
  });

  it('omits a side the pack did not author rather than writing undefined', () => {
    // Firestore throws on an explicit undefined, and the write path filters
    // them — but only the ones it knows about. Absent is the safe shape.
    const draft = buildPackCardDraft(
      { study: '갈등', back: { English: 'conflict' } }, 'p', 'uid-1', 'Korean',
    );
    expect(Object.keys(draft)).not.toContain('formality');
    expect(draft.korean).toBe('갈등');
  });

  // The carry that makes on-demand depth correct. Both /api/explain/depth and
  // /api/explain/examples read briefDefinition to pin which sense they are
  // explaining, so a hint dropped at save time means `fine` gets a paragraph
  // about quality months later.
  it('carries the sense hint onto the card as briefDefinition', () => {
    const draft = buildPackCardDraft(
      { study: 'fine', back: { Korean: '벌금' }, context: 'a penalty payment' },
      'toeic-core', 'uid-1', 'English',
    );
    expect(draft.briefDefinition).toBe('a penalty payment');
  });

  it('leaves briefDefinition off an entry with no hint', () => {
    const draft = buildPackCardDraft(
      { study: 'comply', back: { Korean: '준수하다' } }, 'toeic-core', 'uid-1', 'English',
    );
    expect('briefDefinition' in draft).toBe(false);
  });
});

// `english` is required on every Flashcard and is the fallback `getBackSide`
// reaches for on documents written before backs were native-aware. A pack that
// authors only the side its study language overwrites would produce cards with
// no English at all — this is the check that a future pack cannot do that
// quietly.
describe('every registered pack authors a storable back', () => {
  it('leaves english populated on every entry of every pack', () => {
    for (const { code: lang } of SUPPORTED_STUDY_LANGUAGES) {
      for (const pack of getVocabPacks(lang)) {
        for (const entry of getPackEntries(pack)) {
          const draft = buildPackCardDraft(entry, pack.id, 'uid-1', lang);
          expect(draft.english, `${pack.id}/${entry.study} left english empty`).toBeTruthy();
        }
      }
    }
  });

  it('gives every entry a back the reader can actually see', () => {
    for (const { code: lang } of SUPPORTED_STUDY_LANGUAGES) {
      for (const pack of getVocabPacks(lang)) {
        const { studyField } = getStudyLanguageConfig(lang);
        for (const entry of getPackEntries(pack)) {
          for (const native of ['English', 'Korean']) {
            const back = resolvePackBack(entry.back, lang, native);
            expect(back, `${pack.id}/${entry.study} has no back for a ${native} native`).toBeTruthy();
            // The back must not just be the front again, which is what an
            // authored side landing in the study slot would produce.
            expect(back, `${pack.id}/${entry.study} back repeats the front`).not.toBe(entry.study);
          }
        }
        expect(studyField).toBeTruthy();
      }
    }
  });
});
