import { describe, it, expect } from 'vitest';
import {
  CLOZE_REPETITIONS,
  PATTERN_MAX_CHARS,
  buildPatternDraft,
  clampForHints,
  buildPatternQueue,
  duePatterns,
  exerciseFormat,
  gradeCloze,
  gradeFromReview,
  isPatternDue,
  nextPatternReviewDate,
  overrideGrade,
  parsePatternExercise,
  parseWritingReview,
  patternGloss,
  reachedForPattern,
} from '@amgi/core';
import type { GrammarPattern, WritingReview } from '@amgi/core';
import { getNextReviewData } from '@/services/sm2';

const review = (kinds: WritingReview['findings'][number]['kind'][]): WritingReview => ({
  rewrite: '집에 가다가 친구를 만났어요.',
  findings: kinds.map(kind => ({ kind, note: 'n' })),
});

const exercise = { targetForms: ['가다가', '먹다가'] };

describe('exerciseFormat', () => {
  const at = (repetitions: number) => ({ nextReview: new Date(), interval: 1, ease: 2.5, repetitions });

  it('starts every pattern at cloze', () => {
    expect(exerciseFormat({ kind: 'choice', production: undefined })).toBe('cloze');
    expect(exerciseFormat({ kind: 'form', production: undefined })).toBe('cloze');
  });

  it('graduates a choice pattern once the scheduler treats it as known', () => {
    expect(exerciseFormat({ kind: 'choice', production: at(CLOZE_REPETITIONS - 1) })).toBe('cloze');
    expect(exerciseFormat({ kind: 'choice', production: at(CLOZE_REPETITIONS) })).toBe('production');
  });

  // There is no meaning being chosen, so free production has nothing to add —
  // and a rule that stayed at cloze forever is the whole point of the kind.
  it('never graduates a form rule, however well known', () => {
    expect(exerciseFormat({ kind: 'form', production: at(99) })).toBe('cloze');
  });

  // The demotion is free: getNextReviewData already resets repetitions to 0 on
  // `again`, so a failed production turn lands back on controlled practice
  // without anyone writing a rule for it.
  it('demotes back to cloze when a lapse resets repetitions', () => {
    const lapsed = getNextReviewData(at(5), 'again');
    expect(exerciseFormat({ kind: 'choice', production: lapsed })).toBe('cloze');
  });

  it('keeps a shaky production turn at production', () => {
    // `hard` is quality 3, so it increments rather than resets. Recorded as a
    // reading rather than an accident — this is the test that would catch it
    // changing.
    const shaky = getNextReviewData(at(5), 'hard');
    expect(exerciseFormat({ kind: 'choice', production: shaky })).toBe('production');
  });
});

describe('parsePatternExercise', () => {
  it('returns null only when there is no situation to pose', () => {
    expect(parsePatternExercise({ hintShape: 'x', hintName: 'y' })).toBeNull();
    expect(parsePatternExercise({ situation: '   ' })).toBeNull();
    expect(parsePatternExercise(null)).toBeNull();
  });

  it('falls back to the citation form rather than handing back an empty hint', () => {
    // The blank textbox is the failure mode the hint tier exists for, so a
    // learner who asks for help and gets an empty string is exactly who it was
    // supposed to catch.
    const parsed = parsePatternExercise({ situation: 'You were on your way home…' }, { pattern: '-다가' });
    expect(parsed).toMatchObject({ format: 'production', hintShape: '-다가', hintName: '-다가' });
  });

  it('keeps the turn when only some target forms are usable', () => {
    const parsed = parsePatternExercise(
      { situation: 's', targetForms: ['가다가', '', null, '  먹다가  '] },
      { pattern: '-다가' },
    );
    expect(parsed).toMatchObject({ targetForms: ['가다가', '먹다가'] });
  });
});

describe('parsePatternExercise — cloze', () => {
  const raw = {
    sentence: '집에 ___ 편의점에 들렀어요.',
    meaning: 'On my way home I stopped at a convenience store.',
    input: '가다',
    expected: '가다가',
    alternates: ['가다가요'],
  };

  it('parses a well-formed cloze', () => {
    expect(parsePatternExercise(raw, { pattern: '-다가' }, 'cloze')).toEqual({
      format: 'cloze',
      sentence: '집에 ___ 편의점에 들렀어요.',
      meaning: 'On my way home I stopped at a convenience store.',
      input: '가다',
      expected: '가다가',
      alternates: ['가다가요'],
    });
  });

  // A sentence the UI cannot find a gap in is a turn the learner cannot
  // answer — better to fail into the retry path than to render it.
  it('rejects a sentence with no gap', () => {
    const parsed = parsePatternExercise({ ...raw, sentence: '집에 가다가 들렀어요.' }, undefined, 'cloze');
    expect(parsed).toBeNull();
  });

  it('rejects a cloze with nothing to grade against', () => {
    expect(parsePatternExercise({ ...raw, expected: '  ' }, undefined, 'cloze')).toBeNull();
  });

  // Models are inconsistent about blank length and bracket style even under a
  // precise instruction. Cheaper to accept the variants than to retry.
  it('normalizes whatever the model used for the gap', () => {
    for (const gap of ['_____', '[...]', '[___]', '(___)', '＿＿＿']) {
      const parsed = parsePatternExercise({ ...raw, sentence: `집에 ${gap} 들렀어요.` }, undefined, 'cloze');
      expect(parsed).toMatchObject({ sentence: '집에 ___ 들렀어요.' });
    }
  });

  it('keeps the turn when the meaning is missing', () => {
    // It costs the scaffolding that makes the cloze meaningful rather than
    // mechanical — worth knowing about, not worth losing the turn over.
    const parsed = parsePatternExercise({ ...raw, meaning: '' }, undefined, 'cloze');
    expect(parsed).toMatchObject({ meaning: '', expected: '가다가' });
  });

  it('omits an absent input rather than storing an empty one', () => {
    const { input, ...noInput } = raw;
    expect(input).toBeTruthy();
    expect(parsePatternExercise(noInput, undefined, 'cloze')).not.toHaveProperty('input');
  });
});

describe('gradeCloze', () => {
  const exercise = { expected: '가다가', alternates: ['가다가요'] };

  it('is easy on a clean first-try match', () => {
    // The one path to `easy`, and the thing that un-sticks the ease ratchet: a
    // string comparison is not a judgement that could be wrong.
    expect(gradeCloze('가다가', exercise)).toEqual({ verdict: 'easy', reached: true });
  });

  it('accepts an alternate', () => {
    expect(gradeCloze('가다가요', exercise).reached).toBe(true);
  });

  it('is again on a miss, with no partial credit', () => {
    expect(gradeCloze('가서', exercise)).toEqual({ verdict: 'again', reached: false });
  });

  it('ignores case, surrounding space and Korean word spacing', () => {
    expect(gradeCloze('  가다가  ', exercise).reached).toBe(true);
    expect(gradeCloze('AI MANGÉ', { expected: 'ai mangé', alternates: [] }).reached).toBe(true);
    expect(gradeCloze('가 다가', exercise).reached).toBe(true);
  });

  // The elision case is exactly why cloze grading cannot reuse
  // `normalizeForMatch`, which strips punctuation wholesale: there, `d'` would
  // compare equal to `d` and the rule being practised would be ungradeable.
  it('does not strip the punctuation that IS the answer', () => {
    const elision = { expected: "d'", alternates: [] };
    expect(gradeCloze("d'", elision).reached).toBe(true);
    expect(gradeCloze('d', elision).reached).toBe(false);
    expect(gradeCloze('de', elision).reached).toBe(false);
  });

  // Measured against the live model, not anticipated: asked for a French
  // elision cloze it answered `d’` with a curly apostrophe, which no learner
  // types. Unfolded, the one rule that prompted this redesign is ungradeable.
  it('folds typographic marks to what a keyboard produces', () => {
    expect(gradeCloze("d'", { expected: 'd’', alternates: [] }).reached).toBe(true);
    expect(gradeCloze('d’', { expected: "d'", alternates: [] }).reached).toBe(true);
    expect(gradeCloze('co-op', { expected: 'co‑op', alternates: [] }).reached).toBe(true);
  });

  it('caps a hinted match the same way production is capped', () => {
    expect(gradeCloze('가다가', exercise, 1).verdict).toBe('hard');
    expect(gradeCloze('가다가', exercise, 2).verdict).toBe('again');
  });
});

describe('overrideGrade', () => {
  it('re-grades a wrong verdict as correct', () => {
    expect(overrideGrade(0)).toEqual({ verdict: 'good', reached: true, overridden: true });
  });

  // It corrects the correctness judgement, not the effort one — so a hint
  // taken still costs what it cost, and at tier 2 the override does nothing,
  // which is why the UI does not offer it there.
  it('still respects what the hints cost', () => {
    expect(overrideGrade(1).verdict).toBe('hard');
    expect(overrideGrade(2).verdict).toBe('again');
  });

  it('never claims the answer was easy', () => {
    // The learner is telling us they were right, which is not the same as
    // telling us it was effortless.
    expect(overrideGrade(0).verdict).not.toBe('easy');
  });
});

describe('reachedForPattern', () => {
  it('matches a form regardless of spacing and punctuation', () => {
    expect(reachedForPattern('집에 가다가, 친구를 만났어요!', exercise.targetForms)).toBe(true);
  });

  it('is false when the answer went around the pattern', () => {
    expect(reachedForPattern('집에 가서 친구를 만났어요.', exercise.targetForms)).toBe(false);
  });

  // A false "again" on a correct sentence is the outcome this design most
  // wants to avoid, so an unmeasurable reach is never scored as a miss.
  it('assumes the pattern was reached when there is nothing to match on', () => {
    expect(reachedForPattern("J'ai mangé une pomme.", [])).toBe(true);
  });

  it('is false on an empty answer even with nothing to match on', () => {
    expect(reachedForPattern('   ', [])).toBe(false);
  });
});

describe('clampForHints', () => {
  it('caps at hard after one tier and again after two', () => {
    expect(clampForHints('good', 0)).toBe('good');
    expect(clampForHints('good', 1)).toBe('hard');
    expect(clampForHints('good', 2)).toBe('again');
    expect(clampForHints('hard', 1)).toBe('hard');
  });

  it('leaves tier zero uncapped, which is how a clean cloze reaches easy', () => {
    expect(clampForHints('easy', 0)).toBe('easy');
    expect(clampForHints('easy', 1)).toBe('hard');
  });

  it('never improves a verdict', () => {
    // The clamp is a ceiling, not a target — a wrong answer after a hint is
    // still wrong.
    expect(clampForHints('again', 0)).toBe('again');
    expect(clampForHints('again', 1)).toBe('again');
    expect(clampForHints('hard', 0)).toBe('hard');
  });
});

describe('gradeFromReview', () => {
  it('is good when the pattern was reached and nothing came back', () => {
    expect(gradeFromReview(review([]), '집에 가다가 친구를 만났어요.', exercise))
      .toEqual({ verdict: 'good', reached: true });
  });

  // Naturalness and register are worth reading — the rewrite shows on every
  // verdict for that reason — but they are not the pattern failing.
  it('stays good when the only findings are about phrasing', () => {
    const graded = gradeFromReview(review(['naturalness', 'register']), '집에 가다가 친구를 만났어요.', exercise);
    expect(graded.verdict).toBe('good');
  });

  it('is hard when they reached for it and the form came out wrong', () => {
    const graded = gradeFromReview(review(['grammar']), '집에 가다가 친구를 만났어요.', exercise);
    expect(graded.verdict).toBe('hard');
  });

  // Correct prose that avoids the pattern is not practice of the pattern, and
  // "when to reach for it" is the first thing this feature exists to teach.
  it('is again when the answer sidestepped the pattern, however clean', () => {
    const graded = gradeFromReview(review([]), '집에 가서 친구를 만났어요.', exercise);
    expect(graded).toEqual({ verdict: 'again', reached: false });
  });

  it('applies the hint clamp to what was earned', () => {
    const clean = '집에 가다가 친구를 만났어요.';
    expect(gradeFromReview(review([]), clean, exercise, 1).verdict).toBe('hard');
    expect(gradeFromReview(review([]), clean, exercise, 2).verdict).toBe('again');
  });

  // `easy` is the only response that raises ease in `getNextReviewData`, and
  // it is deliberately excluded — which makes ease a one-way ratchet for
  // patterns. Recorded here so removing the exclusion is a decision, not a
  // slip.
  it('never emits easy', () => {
    const verdicts = [
      gradeFromReview(review([]), '집에 가다가 갔어요.', exercise, 0).verdict,
      gradeFromReview(review(['grammar']), '집에 가다가 갔어요.', exercise, 0).verdict,
      gradeFromReview(review([]), '집에 갔어요.', exercise, 0).verdict,
    ];
    expect(verdicts).not.toContain('easy');
  });
});

describe('pattern scheduling', () => {
  const now = new Date('2026-08-08T12:00:00Z');
  const past = new Date('2026-08-07T12:00:00Z');
  const future = new Date('2026-08-15T12:00:00Z');
  const at = (nextReview: Date) => ({ nextReview, interval: 1, ease: 2.5, repetitions: 1 });

  it('treats an untracked pattern as due, the way a fresh card is', () => {
    expect(isPatternDue({ production: undefined }, now)).toBe(true);
    expect(isPatternDue({ production: at(past) }, now)).toBe(true);
    expect(isPatternDue({ production: at(future) }, now)).toBe(false);
  });

  it('reports only a future date for the caught-up line', () => {
    expect(nextPatternReviewDate([{ production: at(past) }, { production: at(future) }], now)).toEqual(future);
    // Untracked patterns are due now, so they have no future to report.
    expect(nextPatternReviewDate([{ production: undefined }], now)).toBeNull();
  });

  it('keeps the due list in the order given', () => {
    const list = [{ production: at(future) }, { production: undefined }, { production: at(past) }];
    expect(duePatterns(list, now)).toEqual([list[1], list[2]]);
  });

  it('queues exactly what is due, shuffled', () => {
    // Interleaving beats blocking for grammar on delayed tests. The order is
    // random, so the contract testable here is membership — that the queue is
    // the due set and nothing else.
    const list = [{ production: at(future) }, { production: undefined }, { production: at(past) }];
    const queue = buildPatternQueue(list, now);
    expect(queue).toHaveLength(2);
    expect(new Set(queue)).toEqual(new Set([list[1], list[2]]));
  });

  it('does not disturb the caller\'s array', () => {
    const list = [{ production: undefined }, { production: at(past) }];
    const before = [...list];
    buildPatternQueue(list, now);
    expect(list).toEqual(before);
  });
});

describe('patternGloss', () => {
  const both: Pick<GrammarPattern, 'gloss'> = { gloss: { English: 'while doing', Korean: '하다가' } };

  it('prefers the reader\'s own language', () => {
    expect(patternGloss(both, 'Korean')).toBe('하다가');
    expect(patternGloss(both, 'English')).toBe('while doing');
  });

  // Optional on both sides on purpose: the gloss is a caption beside an
  // exercise generated in the reader's language, so a missing side costs a
  // caption rather than the object.
  it('falls back to the other side, then to empty', () => {
    expect(patternGloss({ gloss: { English: 'while doing' } }, 'Korean')).toBe('while doing');
    expect(patternGloss({ gloss: {} }, 'Korean')).toBe('');
  });
});

describe('the writing-finding door', () => {
  it('carries a pattern offer on a grammar finding', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{
        kind: 'grammar',
        note: 'n',
        pattern: { pattern: '-다가', gloss: { English: 'while doing', Korean: '하다가' }, note: 'when…' },
      }],
    });
    expect(parsed?.findings[0].pattern?.pattern).toBe('-다가');
    expect(parsed?.findings[0].pattern?.note).toBe('when…');
  });

  // Measured, not assumed: asked to review a passage using `-고 있었어요` where a
  // native would use `-는데`, the model returns `naturalness` — correctly, since
  // no rule was broken — and `-는데` is exactly the pattern worth practising.
  // Gating this on `kind === 'grammar'` (which the design called for) hid the
  // most valuable offers behind the one kind meaning "you made an error".
  it('carries a pattern offer on a naturalness finding too', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{
        kind: 'naturalness',
        note: 'n',
        pattern: { pattern: '-는데', gloss: { English: 'and so / but' } },
      }],
    });
    expect(parsed?.findings[0].pattern?.pattern).toBe('-는데');
  });

  // Where a card needs both backs or it is dropped — it would render blank on
  // a native-language switch — a pattern needs only its citation form.
  it('keeps a pattern offer with only one gloss, or none', () => {
    const one = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'grammar', note: 'n', pattern: { pattern: '-다가', gloss: { English: 'while doing' } } }],
    });
    expect(one?.findings[0].pattern?.gloss).toEqual({ English: 'while doing' });

    const none = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'grammar', note: 'n', pattern: { pattern: '-다가' } }],
    });
    expect(none?.findings[0].pattern?.gloss).toEqual({});
  });

  it('drops a pattern offer with no citation form', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'grammar', note: 'n', pattern: { gloss: { English: 'while doing' } } }],
    });
    expect(parsed?.findings[0].pattern).toBeUndefined();
  });

  // A word the learner reached for and did not have — written in their own
  // language, or talked around. Different evidence from every other card
  // offer: not "worth knowing" but "you needed this and it wasn't there".
  it('marks a card that fills a word the learner did not have', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{
        kind: 'vocabulary',
        note: 'You wrote "corkscrew".',
        card: { study: 'un tire-bouchon', back: { English: 'a corkscrew', Korean: '코르크 마개뽑이' }, gap: true },
      }],
    });
    expect(parsed?.findings[0].card?.gap).toBe(true);
  });

  const plainCard = { study: '들르다', back: { English: 'to stop by', Korean: '잠시 방문하다' } };

  it('leaves an ordinary card unmarked rather than storing false', () => {
    // Firestore rejects undefined and the flag is meaningful by its presence;
    // a card carrying `gap: false` would read as "checked and not a gap".
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'vocabulary', note: 'n', card: plainCard }],
    });
    expect(parsed?.findings[0].card).not.toHaveProperty('gap');
  });

  it('ignores a non-boolean gap rather than trusting it', () => {
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{ kind: 'vocabulary', note: 'n', card: { ...plainCard, gap: 'yes' } }],
    });
    expect(parsed?.findings[0].card).not.toHaveProperty('gap');
  });

  it('lets a finding offer both a card and a pattern', () => {
    // The card is what mobile reads until pattern parity ships; web prefers
    // the pattern. Neither should cost the other.
    const parsed = parseWritingReview({
      rewrite: 'r',
      findings: [{
        kind: 'grammar',
        note: 'n',
        card: { study: '-다가', back: { English: 'while doing', Korean: '하다가' } },
        pattern: { pattern: '-다가', gloss: { English: 'while doing' } },
      }],
    });
    expect(parsed?.findings[0].card?.study).toBe('-다가');
    expect(parsed?.findings[0].pattern?.pattern).toBe('-다가');
  });
});

describe('buildPatternDraft', () => {
  const candidate = { pattern: '-다가', gloss: { English: 'while doing', Korean: '하다가' } };

  it('stamps provenance but no packId', () => {
    const draft = buildPatternDraft(candidate, 'uid-1', 'Korean');
    expect(draft).toMatchObject({ uid: 'uid-1', studyLanguage: 'Korean', pattern: '-다가', source: 'writing' });
    expect(draft).not.toHaveProperty('packId');
  });

  // Firestore rejects an explicit undefined, and the note is genuinely
  // optional — an absent one must be absent, not present and empty.
  it('omits a missing note rather than writing undefined', () => {
    expect(buildPatternDraft(candidate, 'u', 'Korean')).not.toHaveProperty('note');
    expect(Object.values(buildPatternDraft(candidate, 'u', 'Korean'))).not.toContain(undefined);
  });
});

describe('PATTERN_MAX_CHARS', () => {
  it('is one sentence, not a paragraph', () => {
    expect(PATTERN_MAX_CHARS).toBeGreaterThan(100);
    expect(PATTERN_MAX_CHARS).toBeLessThan(500);
  });
});
