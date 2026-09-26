import { describe, expect, it } from 'vitest';
import {
  SOURCING_STALE_MS,
  canRetrySubtopic,
  getVocabPack,
  getVocabPacks,
  isUserPackId,
  normalizeTerm,
  parsePackTitle,
  setUserVocabPacks,
  userPackProgress,
  userPackToVocabPack,
  parseKnownTerms,
  parsePackBrief,
  parseSourcedLine,
  parseSourcedLines,
  parseSubtopics,
  subtopicId,
  textContainsTerm,
  tierFor,
  type UserPack,
  type UserPackSubtopic,
} from '@amgi/core';

describe('parsePackBrief', () => {
  it('needs a purpose, what it is about and where it is used', () => {
    expect(parsePackBrief({ purpose: 'goal', about: 'TOEIC 900', usage: 'exam' })).toEqual({
      purpose: 'goal',
      about: 'TOEIC 900',
      usage: 'exam',
      material: undefined,
      focus: undefined,
    });
    expect(parsePackBrief({ purpose: 'goal', about: 'TOEIC 900' })).toBeNull();
    expect(parsePackBrief({ purpose: 'level', about: 'x', usage: 'y' })).toBeNull();
    expect(parsePackBrief({ purpose: 'goal', about: '   ', usage: 'y' })).toBeNull();
  });

  it('caps the free text', () => {
    const brief = parsePackBrief({ purpose: 'struggle', about: 'a'.repeat(1000), usage: 'b' });
    expect(brief?.about).toHaveLength(300);
  });
});

describe('parseKnownTerms', () => {
  it('drops non-strings and repeats that differ only in case', () => {
    expect(parseKnownTerms(['Invoice', 'invoice', 3, ' lease ', ''])).toEqual(['Invoice', 'lease']);
    expect(parseKnownTerms('invoice')).toEqual([]);
  });
});

describe('parseSubtopics', () => {
  const good = {
    name: { English: 'Renting a flat', Korean: '집 구하기' },
    note: { English: 'Leases and landlords', Korean: '계약과 집주인' },
    estimatedWords: 25,
    searchHint: 'vocabulario alquiler Argentina',
  };

  it('reads the wrapped shape and drops malformed entries', () => {
    const raw = JSON.stringify({ subtopics: [good, { name: { English: 'No hint', Korean: '힌트 없음' } }] });
    const out = parseSubtopics(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'renting-a-flat', estimatedWords: 25 });
  });

  it('clamps the word estimate and de-duplicates ids', () => {
    const out = parseSubtopics(JSON.stringify([{ ...good, estimatedWords: 500 }, { ...good, estimatedWords: 1 }]));
    expect(out.map(s => s.estimatedWords)).toEqual([40, 8]);
    expect(out.map(s => s.id)).toEqual(['renting-a-flat', 'renting-a-flat-2']);
  });

  it('returns nothing rather than throwing on prose', () => {
    expect(parseSubtopics('Sorry, I cannot help with that.')).toEqual([]);
  });
});

describe('subtopicId', () => {
  it('never contains a slash, which would split a subpack id', () => {
    expect(subtopicId('HR / Finance', new Set())).toBe('hr-finance');
    expect(subtopicId('은행', new Set())).toBe('topic');
  });
});

describe('parseSourcedLine', () => {
  it('strips numbering, bullets and bold', () => {
    expect(parseSourcedLine('1. **invoice**')).toEqual({ study: 'invoice' });
    expect(parseSourcedLine('- fine | a penalty')).toEqual({ study: 'fine', sense: 'a penalty' });
  });

  it('moves a bracketed expansion to the sense', () => {
    expect(parseSourcedLine('CBU (Clave Bancaria Uniforme)')).toEqual({
      study: 'CBU',
      sense: 'Clave Bancaria Uniforme',
    });
  });

  it('skips headings and preambles', () => {
    expect(parseSourcedLines('Here are the words:\ninvoice\n\nlease')).toEqual([
      { study: 'invoice' },
      { study: 'lease' },
    ]);
  });
});

describe('textContainsTerm', () => {
  it('needs a word boundary in Latin script', () => {
    const page = normalizeTerm('It is forbidden to bid twice.');
    expect(textContainsTerm(page, 'bid')).toBe(true);
    expect(textContainsTerm(normalizeTerm('forbidden'), 'bid')).toBe(false);
  });

  it('keeps accents, so a page without them does not corroborate the spelling', () => {
    expect(textContainsTerm(normalizeTerm('Pedí un préstamo'), 'préstamo')).toBe(true);
    expect(textContainsTerm(normalizeTerm('Pedi un prestamo'), 'préstamo')).toBe(false);
  });

  it('matches phrases and ignores case and curly quotes', () => {
    expect(textContainsTerm(normalizeTerm('Don’t Beat Around the Bush.'), "don't beat around the bush")).toBe(true);
  });

  it('takes a substring in scripts written without spaces', () => {
    expect(textContainsTerm(normalizeTerm('계약서에 서명했다'), '계약서')).toBe(true);
  });
});

describe('tierFor', () => {
  const web = (url: string) => ({ kind: 'web' as const, url, title: '' });

  it('counts domains, not pages', () => {
    expect(tierFor([web('https://www.a.com/1'), web('https://a.com/2')])).toBe('B');
    expect(tierFor([web('https://a.com/1'), web('https://b.com/1')])).toBe('A');
  });

  it('counts the learner’s material as a source of its own', () => {
    expect(tierFor([{ kind: 'material' }, web('https://a.com')])).toBe('A');
    expect(tierFor([])).toBeNull();
  });
});

describe('stored user packs', () => {
  const subtopic = (id: string, status: UserPackSubtopic['status'], words: string[] = []): UserPackSubtopic => ({
    id,
    name: { English: id, Korean: id },
    estimatedWords: 10,
    searchHint: id,
    status,
    entries: words.map(study => ({ study, back: { Korean: '뜻' }, tier: 'B', sources: [{ kind: 'material' }] })),
  });
  const pack = (subtopics: UserPackSubtopic[]): UserPack => ({
    id: 'abc',
    ownerUid: 'u',
    visibility: 'private',
    studyLanguage: 'English',
    nativeLanguage: 'Korean',
    brief: { purpose: 'goal', about: 'TOEIC', usage: 'exam' },
    name: { English: 'Mine', Korean: '내 팩' },
    description: { English: 'd', Korean: 'd' },
    subtopics,
    createdAt: 0,
  });

  it('becomes a namespaced, user-made pack with only finished parts as sections', () => {
    const vocab = userPackToVocabPack(
      pack([subtopic('a', 'ready', ['lease']), subtopic('b', 'sourcing'), subtopic('c', 'ready')]),
    );
    expect(vocab.id).toBe('user-abc');
    expect(isUserPackId(vocab.id)).toBe(true);
    expect(vocab.userMade).toBe(true);
    expect(vocab.sections.map(s => s.id)).toEqual(['a']);
  });

  it('is done once nothing is pending or running', () => {
    expect(userPackProgress(pack([subtopic('a', 'ready'), subtopic('b', 'sourcing')]))).toMatchObject({ done: false, ready: 1 });
    expect(userPackProgress(pack([subtopic('a', 'ready'), subtopic('b', 'failed')]))).toMatchObject({ done: true, failed: 1 });
  });

  it('offers a retry on failure, and on a job that never came back', () => {
    const now = 10 * SOURCING_STALE_MS;
    expect(canRetrySubtopic({ status: 'failed' }, now)).toBe(true);
    expect(canRetrySubtopic({ status: 'sourcing', startedAt: now - 1000 }, now)).toBe(false);
    expect(canRetrySubtopic({ status: 'sourcing', startedAt: now - SOURCING_STALE_MS - 1 }, now)).toBe(true);
    expect(canRetrySubtopic({ status: 'ready' }, now)).toBe(false);
  });

  it('joins the pack registry after the curated packs', () => {
    setUserVocabPacks({ English: [userPackToVocabPack(pack([subtopic('a', 'ready', ['lease'])]))] });
    try {
      const ids = getVocabPacks('English').map(p => p.id);
      expect(ids[ids.length - 1]).toBe('user-abc');
      expect(getVocabPack('English', 'user-abc')?.sections).toHaveLength(1);
      expect(getVocabPack('Korean', 'user-abc')).toBeUndefined();
    } finally {
      setUserVocabPacks({});
    }
  });
});

describe('parsePackTitle', () => {
  const brief = { purpose: 'goal' as const, about: 'TOEIC 900점 넘기기', usage: 'exam' };

  it('reads the title the model gave', () => {
    const raw = JSON.stringify({ name: { English: 'TOEIC 900', Korean: '토익 900' }, description: { English: 'd', Korean: '설명' } });
    expect(parsePackTitle(raw, brief).name).toEqual({ English: 'TOEIC 900', Korean: '토익 900' });
  });

  it("falls back to the learner's own words", () => {
    expect(parsePackTitle('{}', brief).name.Korean).toBe('TOEIC 900점 넘기기');
  });
});
