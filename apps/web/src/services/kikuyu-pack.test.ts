import { describe, it, expect } from 'vitest';
import {
  KIKUYU_BASICS_PACK,
  buildPackCardDraft,
  getPackEntries,
  getPackTerms,
  getStudyLanguageConfig,
  getVocabPacks,
  kikuyuToEnglish,
  kikuyuToHangul,
  resolvePackBack,
  splitKikuyuSyllables,
} from '@amgi/core';

const entries = getPackEntries(KIKUYU_BASICS_PACK);

describe('Kikuyu Basics pack', () => {
  it('is the only pack on the Kikuyu registry', () => {
    expect(getVocabPacks('Kikuyu')).toEqual([KIKUYU_BASICS_PACK]);
  });

  it('has no duplicate entries', () => {
    const terms = getPackTerms(KIKUYU_BASICS_PACK);
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms).toHaveLength(59);
  });

  it('authors both backs on every entry', () => {
    for (const { study, back } of entries) {
      expect(back.English, `${study} has no English back`).toBeTruthy();
      expect(back.Korean, `${study} has no Korean back`).toBeTruthy();
    }
  });

  it('shares no back between two entries, in either language', () => {
    for (const side of ['English', 'Korean'] as const) {
      const seen = new Map<string, string>();
      for (const { study, back } of entries) {
        const text = back[side]!;
        expect(seen.get(text), `${side} back "${text}" is on both ${seen.get(text)} and ${study}`).toBeUndefined();
        seen.set(text, study);
      }
    }
  });

  /**
   * `PackEntry.gender` holds a Spanish article. Kikuyu marks noun class, not
   * gender, and `STUDY_LANGUAGE_CONFIGS` refuses to teach the class because the
   * model was measured wrong on it — so nothing here may quietly reintroduce it.
   */
  it('sets no gender on any entry', () => {
    for (const { study, gender } of entries) {
      expect(gender, `${study} carries a gender`).toBeUndefined();
    }
  });

  /**
   * The registry has no `ttsLanguageCode` for Kikuyu and both apps hide the
   * pronounce button without one, so a `pronounceable` pack would promise audio
   * the deck page cannot play.
   */
  it('does not claim to be pronounceable, because the language has no voice', () => {
    expect(KIKUYU_BASICS_PACK.pronounceable).toBeFalsy();
    const { ttsLanguageCode, ttsVoiceName } = getStudyLanguageConfig('Kikuyu');
    expect(ttsLanguageCode).toBeUndefined();
    expect(ttsVoiceName).toBeUndefined();
  });

  it('writes clean lowercase Kikuyu on the study side', () => {
    // The Kikuyu alphabet, plus the space and the question mark two greetings
    // end on. f, l, p, q, s, v, x and z do not occur in the language, so a
    // letter outside this set is a typo or a word from somewhere else — which
    // is the failure that put `Nakupenda`, a Swahili word, in one of the
    // sources this pack was built from.
    const clean = /^[abcdeghijkmnortuwyĩũ]+([ '][abcdeghijkmnortuwyĩũ]+)*\??$/;
    for (const { study } of entries) {
      expect(study, `${study} is not clean lowercase Kikuyu`).toMatch(clean);
    }
  });

  it('gives each reader their own side', () => {
    const cucu = entries.find(entry => entry.study === 'cũcũ')!;
    expect(resolvePackBack(cucu.back, 'Kikuyu', 'English')).toBe('grandmother');
    expect(resolvePackBack(cucu.back, 'Kikuyu', 'Korean')).toBe('할머니');
  });

  it('saves an entry into the kikuyu slot with both backs', () => {
    const uhoro = entries.find(entry => entry.study === 'ũhoro')!;
    const draft = buildPackCardDraft(uhoro, KIKUYU_BASICS_PACK.id, 'uid-1', 'Kikuyu');
    expect(draft).toMatchObject({
      term: 'ũhoro',
      kikuyu: 'ũhoro',
      english: 'news, word',
      korean: '소식, 말',
      termLanguage: 'Kikuyu',
      packId: 'kikuyu-basics',
      uid: 'uid-1',
    });
  });

  /**
   * Kikuyu has no synthesised voice, so the respelling on the card is the only
   * pronunciation aid this deck has. Rendering the list is therefore part of
   * reviewing it — and it is what found the `Cw` bug below, in the word for
   * "hello", which reading the table would never have surfaced.
   */
  it('renders every entry without a stranded consonant', () => {
    for (const { study } of entries) {
      const respelled = kikuyuToEnglish(study);
      expect(respelled, `${study} renders a vowelless syllable: ${respelled}`)
        .not.toMatch(/(^|-)[bcdghjkmnrtwy]+(-|$)/);
    }
  });
});

/**
 * A consonant before `w` is one onset, not two syllables.
 *
 * The first reading of this was that Hangul cannot hold a `Cw` in one syllable
 * and a respelling is a lossy reading aid anyway. Both halves of that are
 * wrong here: Korean writes 뫄, 뭬, 콰, 퀘, 과 and 화, and the *English* path had
 * the identical fault where no Hangul constraint applies at all. A respelling
 * is allowed to lose information — `ĩ`/`e` merge, unmarked stress — but a
 * syllable the word does not have is not lost information.
 *
 * The claim is orthographic rather than phonological, which is what makes it
 * safe to derive under the lesson in `.scratchpad/lessons.md`: Kikuyu writes
 * the vowel when the nasal is its own syllable (`mũndũ`) and omits it when `w`
 * is a glide (`mwana`), so reading `mw` as one onset reads the spelling as it
 * is written.
 */
describe('Cw onsets', () => {
  it('keeps a labialized onset in one syllable', () => {
    expect(splitKikuyuSyllables('mwarĩ')).toEqual([
      { onset: 'mw', vowel: 'a' },
      { onset: 'r', vowel: 'ĩ' },
    ]);
    expect(kikuyuToEnglish('mwarĩ')).toBe('mwa-re');
    expect(kikuyuToHangul('mwarĩ')).toBe('뫄레');
  });

  it('does the same in both scripts across the onsets the pack uses', () => {
    expect(kikuyuToEnglish('wĩmwega')).toBe('we-mwe-ga');
    expect(kikuyuToHangul('wĩmwega')).toBe('웨뭬가');
    expect(kikuyuToEnglish('mũgwanja')).toBe('mo-gwa-nja');
    expect(kikuyuToHangul('mũgwanja')).toBe('모관자');
    expect(kikuyuToEnglish('mũihwa')).toBe('mo-ee-hwa');
    expect(kikuyuToHangul('mũihwa')).toBe('모이화');
  });

  /**
   * `mũ-` is a syllable and `mw-` is an onset, and the spelling is what says
   * which — so the words that carry a written vowel must not be regrouped.
   */
  it('leaves a written vowel alone', () => {
    expect(kikuyuToEnglish('mũndũ')).toBe('mo-ndo');
    expect(kikuyuToHangul('mũndũ')).toBe('몬도');
    expect(kikuyuToEnglish('mũgũnda')).toBe('mo-go-nda');
    expect(kikuyuToHangul('mũgũnda')).toBe('모곤다');
    expect(kikuyuToEnglish('gĩkũyũ')).toBe('ge-ko-yo');
    expect(kikuyuToHangul('cũcũ')).toBe('쇼쇼');
  });

  /** Longest-first ordering: `ngw` has to beat `ng`, and `ng` has to beat `n`. */
  it('prefers the longest onset that matches', () => {
    expect(splitKikuyuSyllables('ngwa')).toEqual([{ onset: 'ngw', vowel: 'a' }]);
    expect(splitKikuyuSyllables('nga')).toEqual([{ onset: 'ng', vowel: 'a' }]);
    expect(splitKikuyuSyllables('na')).toEqual([{ onset: 'n', vowel: 'a' }]);
  });
});
