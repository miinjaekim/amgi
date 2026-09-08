/**
 * The gloss ceiling every prompt that writes a card back shares.
 *
 * **One gloss; a second only when one would mislead; never a third.** Words are
 * sometimes used interchangeably, and sometimes no single word in the other
 * language covers the term — forcing one gloss there makes the card *wrong*
 * rather than clean.
 *
 * **It caps the count, not the punctuation.** An earlier version of this rule
 * (and the seventeen hand-written copies in `/api/explain` it replaces) said
 * "never list synonyms with semicolons or slashes", which was the wrong lever
 * twice over. The failure being corrected is a *count* — a model satisfies a
 * ban on the mark while still answering "to return, to do again, to recover" —
 * and the ban fell on the mark carrying the most information: a comma joins
 * near-synonyms inside one sense, a semicolon separates two senses. 迷う is "to
 * get lost; to be undecided", and comma-joining those reads as one idea, which
 * is the misleading back the second gloss exists to prevent.
 *
 * The slash stays banned, and it is not the same kind of rule: "energy/strength"
 * is not a sense distinction, it is a comma the model declined to commit to.
 * Measured — dropping the clause brought exactly that gloss back.
 *
 * **The ceiling is stated as a total, because "never a third" has a loophole.**
 * Phrased that way, the model reads it as *never a third within one sense* and
 * nests the marks: 시원하다 came back "cool, refreshing; relieved, satisfied" and
 * 微妙 "subtle, delicate; questionable, iffy" — four glosses each, both obeying
 * the rule as written. So the sentence names the whole field and forbids using
 * both marks at once.
 *
 * Lives here rather than in either route for the reason
 * `characterBreakdownInstruction` does: `/api/explain` needs it in all eighteen
 * of its templates — nine languages × context/no-context, which it covered with
 * sixteen copies plus a seventeenth fragment on the native back — and
 * `/api/word-of-the-day` needs it once. The wording is exactly what drifts when
 * it is written more than once, and it had: the word of the day stated no rule
 * at all, and shipped "deadline, time limit, period" backs for it.
 *
 * Written field-agnostically ("every translation field") so the same sentence
 * serves a prompt with two translation fields, three when the reader's native
 * language adds a back, or one.
 */
export const GLOSS_RULE = `Every translation field takes ONE gloss — the single best translation. Give a second only when one gloss would genuinely mislead, and let the punctuation say which kind it is: a comma between two near-synonyms for one sense ("atmosphere, mood"), a semicolon between two genuinely distinct senses ("to get lost; to be undecided"). Two is the hard ceiling for the whole field, so use one separator or the other and never both — "cool, refreshing; relieved, satisfied" is four glosses wearing two marks, and it is the list to avoid just as much as "deadline, time limit, period" is. Never a slash: "energy/strength" is not a distinction, it is a refusal to pick one, so commit to a word or use the comma. A gloss running to two or three words, where one word is genuinely insufficient, is still one gloss. Before answering, check the field: it must contain at most one comma or one semicolon, and never both.`;

/**
 * The rule as a bullet for `/api/explain`'s `IMPORTANT:` lists, with the clause
 * that depends on whether the sense is already pinned.
 *
 * **The semicolon has to know about the disambiguation flow, and the base rule
 * cannot.** A lookup with no context can answer `ambiguous: true` with a
 * `meanings` list, which the learner picks from; that choice comes back as the
 * `context` of a second lookup. So the two branches want different things from
 * the same mark:
 *
 * - **No context** — a semicolon competes with `meanings`. Two senses far
 *   enough apart to need one are two chips, not one back. What is left for the
 *   semicolon is the band the ambiguity bar deliberately excludes: senses
 *   "closely related variants of the same concept", which is 迷う's "get lost"
 *   and "be undecided" — one idea applied to a place and to a decision.
 * - **Context** — the sense is already chosen. A semicolon there does not mean
 *   the word has two senses; it means the prompt ignored the one it was given.
 *
 * `/api/word-of-the-day` takes the base `GLOSS_RULE` with neither clause: it
 * picks a word rather than answering a lookup, so it has no `meanings` to defer
 * to and no context pinning it.
 */
export function glossRuleBullet(sensePinned: boolean): string {
  const clause = sensePinned
    ? ' The context above already fixes which sense this is, so translate only that sense: a comma between two near-synonyms of it is fine, a semicolon is not — two senses here means the context was ignored.'
    : ' Keep the semicolon for two senses that are close variants of one concept, like "to get lost; to be undecided". If they are further apart than that they are not one card at all — that is the ambiguous case above, and they belong in "meanings".';
  return `- ${GLOSS_RULE}${clause}`;
}
