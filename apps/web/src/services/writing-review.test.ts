import { describe, it, expect } from 'vitest';
import { parseWritingReview, buildWritingCardDraft, WRITING_MAX_CHARS } from '@amgi/core';

const candidate = { study: '들르다', back: { English: 'to stop by', Korean: '잠시 방문하다' } };

describe('parseWritingReview', () => {
  it('keeps findings in the order the model returned them', () => {
    // The ordering IS the level adaptivity — the model puts what this writer
    // most needs first, and nothing downstream re-sorts by kind. A parser that
    // grouped by kind would silently turn the adaptive list back into fixed
    // sections, so this is the test that would catch that.
    const parsed = parseWritingReview({
      rewrite: '어제 친구 집에 잠깐 들렀어요.',
      findings: [
        { kind: 'register', note: 'second' },
        { kind: 'grammar', note: 'first' },
        { kind: 'vocabulary', note: 'third' },
      ],
    });
    expect(parsed?.findings.map(f => f.note)).toEqual(['second', 'first', 'third']);
  });

  it('drops a malformed finding without losing the review', () => {
    const parsed = parseWritingReview({
      rewrite: 'ok',
      findings: [{ kind: 'grammar', note: 'keep me' }, { kind: 'grammar' }, null, 'nonsense'],
    });
    expect(parsed?.findings).toHaveLength(1);
    expect(parsed?.findings[0].note).toBe('keep me');
  });

  it('falls back to a valid kind rather than dropping the note', () => {
    // An unrecognized kind means the prompt drifted, not that the finding is
    // worthless — the note is the substance the user waited on.
    const parsed = parseWritingReview({ rewrite: 'ok', findings: [{ kind: 'spelling', note: 'x' }] });
    expect(parsed?.findings[0].kind).toBe('naturalness');
    expect(parsed?.findings[0].note).toBe('x');
  });

  it('returns null only when there is no rewrite to show', () => {
    expect(parseWritingReview({ findings: [{ kind: 'grammar', note: 'x' }] })).toBeNull();
    expect(parseWritingReview({ rewrite: '   ' })).toBeNull();
    expect(parseWritingReview(null)).toBeNull();
    expect(parseWritingReview({ rewrite: 'fine' })).toEqual({ rewrite: 'fine', findings: [] });
  });

  it('offers a card only when both backs are present', () => {
    // A card saved with one back goes blank the day its owner switches native
    // language. Dropping the offer is better than making that card.
    const withBoth = parseWritingReview({ rewrite: 'r', findings: [{ kind: 'vocabulary', note: 'n', card: candidate }] });
    expect(withBoth?.findings[0].card).toEqual(candidate);

    const missingKorean = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'vocabulary', note: 'n', card: { study: '들르다', back: { English: 'to stop by' } } }],
    });
    expect(missingKorean?.findings[0].card).toBeUndefined();
    expect(missingKorean?.findings[0].note).toBe('n');
  });

  it('omits optional spans rather than storing empty strings', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'grammar', note: 'n', original: '  ', suggested: '들렀어요' }],
    });
    expect(parsed?.findings[0]).not.toHaveProperty('original');
    expect(parsed?.findings[0].suggested).toBe('들렀어요');
  });
});

describe('buildWritingCardDraft', () => {
  it('writes both backs, so switching native language keeps the card readable', () => {
    const draft = buildWritingCardDraft(candidate, 'uid-1', 'Korean');
    expect(draft.english).toBe('to stop by');
    expect(draft.korean).toBe('들르다');
    expect(draft.term).toBe('들르다');
    expect(draft.termLanguage).toBe('Korean');
  });

  it('lets the study side win the slot it shares with a back', () => {
    // On a Korean deck `korean` is the study field, and on an English deck
    // `english` is — in both cases the front must survive the back assignment.
    expect(buildWritingCardDraft(candidate, 'u', 'Korean').korean).toBe('들르다');
    const english = buildWritingCardDraft(
      { study: 'stop by', back: { English: 'stop by', Korean: '들르다' } }, 'u', 'English',
    );
    expect(english.english).toBe('stop by');
    expect(english.korean).toBe('들르다');
  });

  it('routes the study text to the right field per language', () => {
    expect(buildWritingCardDraft(candidate, 'u', 'Japanese').japanese).toBe('들르다');
    expect(buildWritingCardDraft(candidate, 'u', 'TraditionalChinese').traditionalChinese).toBe('들르다');
  });

  it('stamps no packId — a sentence you wrote came from no pack', () => {
    // `packId` is provenance and must never decide whether a term counts as
    // saved. Inventing one here would corrupt deck progress matching.
    expect(buildWritingCardDraft(candidate, 'u', 'Korean')).not.toHaveProperty('packId');
  });
});

describe('WRITING_MAX_CHARS', () => {
  it('is a paragraph, not an essay', () => {
    expect(WRITING_MAX_CHARS).toBeGreaterThan(300);
    expect(WRITING_MAX_CHARS).toBeLessThanOrEqual(2000);
  });
});
