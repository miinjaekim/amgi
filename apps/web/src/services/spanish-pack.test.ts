import { describe, it, expect } from 'vitest';
import {
  SPANISH_BASICS_PACK,
  buildPackCardDraft,
  getPackEntries,
  getPackTerms,
  getVocabPacks,
  resolvePackBack,
  acceptedAnswers,
} from '@amgi/core';

const entries = getPackEntries(SPANISH_BASICS_PACK);

describe('Spanish Basics pack', () => {
  it('is the only pack on the Spanish registry', () => {
    expect(getVocabPacks('Spanish')).toEqual([SPANISH_BASICS_PACK]);
  });

  it('has no duplicate entries', () => {
    const terms = getPackTerms(SPANISH_BASICS_PACK);
    expect(new Set(terms).size).toBe(terms.length);
    expect(terms).toHaveLength(153);
  });

  /**
   * Both sides are authored here, unlike every list pack before it: on a Spanish
   * deck `getBackSideConfig` hands an English native the `english` slot and a
   * Korean native the `korean` one, so a missing side is a card that renders a
   * fallback at one reader and its own text at the other.
   */
  it('authors both backs on every entry', () => {
    for (const { study, back } of entries) {
      expect(back.English, `${study} has no English back`).toBeTruthy();
      expect(back.Korean, `${study} has no Korean back`).toBeTruthy();
    }
  });

  it('gives each reader their own side', () => {
    const hola = entries.find(entry => entry.study === 'hola')!;
    expect(resolvePackBack(hola.back, 'Spanish', 'English')).toBe('hello');
    expect(resolvePackBack(hola.back, 'Spanish', 'Korean')).toBe('안녕하세요');
  });

  /**
   * Two cards that share a back cannot be reviewed in the back→Spanish
   * direction: the learner sees "to be" and has no way to know whether `ser` or
   * `estar` is being asked. Both directions are checked because the two back
   * columns were written independently and drifted once already — the English
   * side said "the starter" where the Korean said 첫 번째 요리.
   */
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
   * A question is authored complete and with its punctuation; a frame the
   * learner finishes is authored bare. Never a half-sentence — `foldText` folds
   * away neither the `¿` nor the accents, and the pronounce button would read a
   * fragment aloud on a pack that declares `pronounceable`.
   */
  it('opens and closes every question it asks', () => {
    for (const { study } of entries) {
      expect(study.startsWith('¿'), `${study} is a half-question`).toBe(study.endsWith('?'));
    }
  });

  it('writes clean lowercase Spanish on the study side', () => {
    const word = '[a-záéíóúñ]+';
    // Lowercase letters with their accents, single spaces, the comma in
    // `bien, gracias`, and the `¿…?` pair a complete question needs — nothing
    // else. A stray capital or a trailing space would reach /api/explain as a
    // different string than the one intended, and `ü` is absent on purpose:
    // nothing in this pack needs a diaeresis, so allowing one would let a typo
    // through.
    const clean = new RegExp(`^¿?${word}(,? ${word})*\\??$`);
    for (const { study } of entries) {
      expect(study, `${study} is not clean lowercase Spanish`).toMatch(clean);
    }
  });

  /**
   * The pack's stated filter is "the word you are stuck without" — the
   * peninsular forms and the pairs English merges. A re-theming that quietly
   * swapped them for easier words would leave the module header lying.
   */
  it('keeps the words the pack was built around', () => {
    const terms = getPackTerms(SPANISH_BASICS_PACK);
    for (const word of ['caña', 'zumo', 'patata', 'todo recto', 'planta baja', 'coger', 'ser', 'estar', 'pedir', 'preguntar']) {
      expect(terms, `${word} has left the pack`).toContain(word);
    }
  });

  it('sets an article on nouns and leaves it off everything else', () => {
    const cana = entries.find(entry => entry.study === 'caña')!;
    expect(cana.gender).toBe('la');
    const comer = entries.find(entry => entry.study === 'comer')!;
    expect(comer.gender).toBeUndefined();
    for (const { study, gender } of entries) {
      if (gender) expect(['el', 'la', 'los', 'las'], `${study} has a strange article`).toContain(gender);
    }
  });

  it('saves an entry into the spanish slot with both backs and its article', () => {
    const servicios = entries.find(entry => entry.study === 'servicios')!;
    const draft = buildPackCardDraft(servicios, SPANISH_BASICS_PACK.id, 'uid-1', 'Spanish');
    expect(draft).toMatchObject({
      term: 'servicios',
      spanish: 'servicios',
      english: 'the toilets',
      korean: '화장실',
      gender: 'los',
      termLanguage: 'Spanish',
      packId: 'spanish-basics',
      uid: 'uid-1',
    });
  });

  /**
   * The reason `gender` is a field rather than part of the study text: a learner
   * who learned the noun with its article types the article, and the grader has
   * to take it. Reading the draft back through `acceptedAnswers` is what proves
   * the write-through reaches the grader — and it is what caught the first cut
   * of this pack, which had the article in the study text *and* in `gender` and
   * so accepted `la la carta`.
   */
  it('accepts the noun with or without its article once saved', () => {
    const carta = entries.find(entry => entry.study === 'carta')!;
    const draft = buildPackCardDraft(carta, SPANISH_BASICS_PACK.id, 'uid-1', 'Spanish');
    // `studyLanguage` is added the way a real read adds it. The stored document
    // does not carry the field — `mapDocToFlashcard` fills it from the
    // collection the card came out of — so a draft handed straight to the
    // grader would be read as Korean and matched against the Korean back.
    const card = { ...draft, studyLanguage: 'Spanish' } as never;
    expect(acceptedAnswers(card)).toEqual(['carta', 'la carta']);
  });

  /**
   * The same failure, stated over the whole pack rather than one entry: no study
   * side may open with the article its own `gender` names.
   */
  it('never puts the article in the study text as well', () => {
    for (const { study, gender } of entries) {
      if (gender) expect(study.startsWith(`${gender} `), `${study} carries its article twice`).toBe(false);
    }
  });
});
