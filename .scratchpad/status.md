# Project Status

Session orientation: what's live, what's broken, what's decided. Shipped history
sits at the bottom as reference — the reasoning worth keeping is in Decisions.

_Reconciled against `main` @ `f722774`, 2026-08-08. `npm test` 200/200._

## Now

- **1.2.0 is in TestFlight.** Submitted and accepted; **internal testing is
  live**, external is waiting on Beta App Review.
- **Two mobile changes are queued behind it**, both JS-only — a build to reach a
  tester, no native pass. See Builds below for the pre-flight.
  - PR #80 (08-04): the `/cards` loosening, the filter sheet, the first
    skeletons. Checked on web and **on a device in Expo Go** before merge.
  - PR #81 (08-08): the two military packs reach mobile through the shared
    registry, and the packs list drops the per-pack description. ⚠️ The
    description change was **typechecked but never seen rendered** — the list
    went from one deck per language to three, and the row spacing under a title
    with nothing beneath it is unverified.
- **No code is in flight.** Next thing to build comes from
  [backlog.md](backlog.md).

TestFlight context that isn't in the repo:

- Tegi's account is enrolled as **Individual**, which blocks non-account-holders
  from generating certs — worked around with an App Store Connect API Key.
- Bundle ID `com.tegi.amgi` is **disposable**. A public launch under the user's
  own account is a fresh relaunch, not a migration: Apple's App Transfer doesn't
  cover TestFlight-only apps.
- ⚠️ Console state (review approved? public link live?) is never knowable from
  the repo. Confirm before assuming.

## Builds

No OTA, so every mobile change reaches users through one of these.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 1.2.0 | 9 | 2026-08-02 | `51a53e9` (PR #76, version bump) |
| 1.1.0 | 8 | 2026-07-27 | `8359adf` on `fix/drop-push-entitlement`, pre-merge |
| 1.0.2 | 4 | 2026-07-24 | `0288136` |
| 1.0.1 | 3 | 2026-07-21 | `a85270d` (PR #43, EAS channel fix) |
| 1.0.1 | 2 | 2026-07-21 | `4d217f3` |
| 1.0.0 | 1 | 2026-07-17 | `db8a6ea` (PR #37) |

Build numbers live in EAS (`appVersionSource: remote`), not the repo, so they
have to be read off the console and recorded here. Gaps are normal: the number is
reserved when a job is created, not awarded on success. Builds 5–7 were failed
attempts.

**1.2.0 contents** — nine merged items, all JS-only (no native module, so no
`expo config --type introspect` pass): pack unification (#71), first run (#73),
per-page help (#74), tab-focus reload (#75), writing review (#69), card backs
follow native language (#67), direction choice on Review (#65), second Learn tab
tap clears search (#66), TOPIK 고급 (#68).

⚠️ **Never verified on a real binary**, on this build or any before it — the
logic is tested, the native bindings are not: pronunciation audio, CSV/Anki
export, sharing, offline review across a force-kill and reconnect, the review
reminder firing *and* disappearing once you review, and account deletion against
the production `EXPO_PUBLIC_API_BASE_URL`.

## Known Issues

- **OTA updates never reached the device.** CI published PR #44 successfully
  (run `29892869152`); the change never appeared and debugging dead-ended, so
  **OTA was abandoned 2026-07-23** rather than diagnosed. Not a blocker under the
  Expo Go + production build model — reopen only with a specific reason to want
  OTA back. See [tech-stack.md](tech-stack.md).
- **18 lint warnings, 0 errors** — 13 React Compiler, 5 accumulated since. Scoped
  under Housekeeping in [backlog.md](backlog.md).

## Decisions

Closed calls, kept with their reasoning — a decision whose reasoning is lost gets
reopened by the next person to notice the symptom. Newest first.

### Grammar patterns: the exercise follows the kind (2026-08-08)

Written after (1a) was built, tried once, and did not feel good. The trial is
the evidence and it is worth keeping: **one exercise format was serving two
different kinds of grammar point.** The argument is in [vision.md](vision.md)
and is the part to read first; the type is in [data-model.md](data-model.md).

What the trial reported, in the user's order:

1. no way to manage saved patterns;
2. saving one feels too vague — unclear what should and shouldn't count;
3. during practice it is ambiguous which pattern is being asked for;
4. too much variance everywhere — saving, generation, grading.

(3) is the root and the other three are largely downstream of it. The clean case
was a saved French pattern, `de` → `d'` before a vowel: a rule with no meaning
to choose, handed a situational production exercise that had nothing to build a
situation out of.

- **Two kinds, `choice` and `form`, and the format follows the kind.** A choice
  pattern keeps everything (1a) built: situation, free production, pattern never
  named, `/api/writing` grading. A form rule gets a named rule and a gap to
  fill. Not a third `construction` kind — see the note in data-model.md; an axis
  whose members share a format is not an axis.
- **Name a form rule, hide a choice pattern.** "Never name the pattern" was
  written for the case where reaching for it is the skill, and it is right
  there. For a mechanical rule the name was never the hard part, so hiding it
  hides nothing and costs the learner all knowledge of what is being asked.
  This is a scoping of the old rule, not a reversal of it.
- **The kind describes the error, not the pattern**, and the writing finding
  already knows which. 은/는 is both a choice and a form rule; "which kind is
  it" has no answer, "which did this writer just get wrong" always does. Keeps
  the syllabus emergent, and means the same pattern can be `form` for one
  learner and `choice` for another.
- **A form drill needs no grading call.** Generation supplies the expected
  answer, comparison is local. Cost drops from *2n* to `2·n_choice + n_form`,
  and the grading variance — complaint (4) — disappears for the patterns where
  it was worst. It has no hint tier either: the rule is named, so tier 1 nudges
  toward nothing and tier 2 is the answer.
- **Choice situations state the meaning, not just a scene.** The narrower fix
  for (3), and it costs nothing. Today the generator writes "you were walking,
  suddenly you saw a celebrity" and the learner cannot tell whether the target
  is the interruption, the surprise or the tense. Textbooks state the meaning to
  express and withhold only the form — "say that you were walking home and,
  part-way, it started raining". The pattern still isn't named.
- **Patterns get a management surface: a mode toggle on Cards.** _User's call._
  Not a fifth nav entry for ten items, and not the deck-filter row either —
  `filterCardsByDeck` returns `Flashcard[]` and a pattern is not one. A
  Cards/Patterns switch above the existing list, with its own simpler list
  beneath: pattern, gloss, kind, next practice, and edit / archive / delete.
  This is complaint (1) and it is the cheapest of the four to answer.
- **Patterns can be added by hand.** _User's call._ The manual form asks for the
  pattern, an optional gloss, and **the kind, chosen by the user from two
  labelled options**. No model call, so no new endpoint — and making the learner
  answer "is this a choice or a rule?" is the most direct statement the app can
  make about what counts as a pattern, which is complaint (2). It is also a far
  cheaper cold-start door than the Learn arm's 12 prompt templates, which stays
  deferred.
- **The curated grammar pack stays closed.** Textbooks supply exercise formats
  *and* an ordered curriculum; only the formats are being adopted. The
  no-curriculum call below is untouched and was not reopened by this.
- **Still open, and now sharper:** the learner override. It was already the home
  for the `easy` the ease ratchet removes; it is now also the only honest
  mitigation for a wrong verdict from a thin `targetForms` or `alternates` list.
  Two trials have pointed at it. The other two opens — interleaving into the
  vocab queue, and an unprompted tier-1 hint — are untouched, and the second now
  applies to `choice` only.

### No local model yet — and the first step isn't a model (2026-08-08)

The spike ran and produced what it was supposed to: a written answer, not a
feature. **`docs/local-model.md` is that answer** and is the thing to read
before this reopens. The backlog item is closed rather than deferred; the two
pieces worth doing were scoped out of it into Medium.

Why closed:

- **The hot path is one route.** Only `/api/explain`'s core arm is worth
  replacing, and 293 pack entries already bypass it — now many more, with #81.
  Depth, examples and writing review carry the actual differentiation and are
  exactly what small models fail.
- **The size band that fits a 4 GB phone is the band that fails the quality
  bar.** RAM binds before disk (~1.5 GB of weights on beta devices). Ambiguity
  judgment, Korean register and Traditional Chinese script fidelity all sit
  below that line — and a 简体字 leak is invisible to anyone who can't read the
  difference, which is the worst kind of failure to ship.
- **Latency was never the win people assume.** ~60–100 tokens of JSON on-device
  is 2–5 s, the same band as a Flash round trip. A *cache hit* is two orders of
  magnitude faster. Cost isn't a problem at a single-digit beta either.
- **Expo Go can't load a native inference module**, so the whole app would run
  without the dev loop the no-OTA shipping model is built around — and web can't
  follow at all, which forks the mobile↔web parity reached in July.

**One correction worth keeping**, because it was assumed the other way for
months: **weights are data, not code.** `expo-file-system` is already a
dependency, so model files download at runtime like any other asset. Only the
*runtime* is a native module — one build gets it in and models are swappable
after. The no-OTA constraint is real but narrower than the backlog claimed.

**Reopen condition, and it is specific: an eval harness first.** `npm test` is
unit tests; nothing measures model output, so no candidate can be judged today
and any comparison would be vibes. Reopen when the term cache is live and has a
measured hit rate, *and* there is an eval set to score a candidate on — at which
point the question is answerable instead of speculative. Apple Foundation Models
is the one path that dodges the size problem entirely (zero download, guided
generation would kill the JSON-parsing fragility), and is worth re-checking when
the floor is no longer iOS 26 / iPhone 15 Pro.

### A pack may be authored as pairs, and register twice (2026-08-08)

The military packs are the first content where **both sides are terms a
professional has to produce**, not a study side and a gloss. So the source in
`packages/core/src/military.ts` is `BilingualSection[]` with neither side
privileged, and `derivePack` reads it once per direction.

- **No new pack shape was needed**, which was the bet the draft made and it held.
  `buildPackCardDraft` already writes the study side last, so it wins over
  whichever authored side lands in the same slot. Only the *opposite* side is
  authored: a Korean back on a Korean deck could never be read, and its only
  effect would be to look authored.
- **Four ids, not two.** `getCollectionId` returns `card.packId` unqualified, so
  two directions sharing an id collapse cards saved from the Korean deck and the
  English deck into one collection on `/cards`. Producing `battalion` from 대대
  is not the same skill as the reverse and drilling both is the premise, so the
  id carries the direction (`-ko` / `-en`) and the display name does not.
- **The name has to be direction-neutral on both sides.** "Military English" is
  wrong for the English native studying Korean; 군사용어 is what the field calls
  the material anyway. A test pins this, because it is the kind of thing a later
  rename undoes without noticing.
- **The split is by register, not difficulty** — neither pack is the beginner
  one. 부대·참모 is a unit and a combined staff, where the failure mode is
  stumbling. 안보·정세 is a briefing and a press statement, where it is saying
  "joint" for 연합 in front of people who will quote it. They are also **not a
  sequence**: a 통역병 in a line unit wants one first, a 통역장교 headed for
  public affairs the other, and the deck page cannot say "either, depending" —
  so the order in `VOCAB_PACKS` is not a recommendation and says so in a comment.
- **No term appears twice and no two terms share a back, across both packs and in
  both directions.** Same constraint that forced the 초래하다/야기하다 splits on
  TOPIK, now enforced across two packs rather than within one — which is why
  three traps (취역식/임관식, the 전역 homograph, 제병협동) sit in 안보·정세
  despite belonging to 부대·참모's traps section by nature.
- **Hints stay out of the drafts' own numbering.** Five `context` strings pointed
  at draft sections ("see §10"). A hint survives onto the card as
  `briefDefinition` and is read by the depth and examples calls, so a pointer to
  a document neither the learner nor the model can see is worse than useless.
  They state the point directly now, in the drafts too, so what a reviewer reads
  is what ships.

### Skeletons stop at the three that shipped (2026-08-06)

The long tail is **cancelled, not deferred** — deck and drill screens, the writing
panel, and the web port that parity argued for. The three in PR #80 were picked
because they were the worst: a cold launch opening on a full-screen spinner with
nothing on it, and the two longest lists. Those are fixed. What was left is the
tail where the wait is already short enough that a shaped placeholder and a
spinner are the same experience, and each one is still a real diff to write and
maintain against a layout that changes.

`SkeletonBar` / `SkeletonGroup` / `SkeletonRows` **stay** in
`apps/mobile/src/components/Skeleton.tsx` — they're in use, and a fourth case is a
composition away if some screen turns out to load slowly enough to earn one. That
is the reopen condition: **a measured slow load on a specific screen**, not
coverage for its own sake. "Web has no skeleton component" is not by itself a
reason to build one; parity is about what a user can do, not about which
primitives each platform owns.

_In-button spinners were already excluded and remain so — there the question is
whether the press registered, which a spinner answers and a skeleton doesn't._

### Contextual tips: cancelled, pull help is the answer (2026-08-04)

Dropped from the backlog, not deferred. The "?" shipped in PR #74 on Learn, Packs
and Review **is** the answer to contextual help: it's pull, so it needs no record
of who has seen what — which was the item's only hard problem.

The surfaces the old item still listed as unexplained — drill, export, archive,
and the Cards page's two filter axes — get another "?" if they turn out to need
one. That's a small addition to an existing pattern, not a feature to carry on a
list. **Reopen only for a genuinely *pushed* tip**, which brings back both costs
at once: somewhere to store "seen tip X", and a per-tip trigger that must not
fire before that feature exists for that user. Nothing observed so far justifies
either. Sits with *Onboarding is not a checklist* below: the fix for "onboarding
is just text" is never another widget describing the app.

### Export stays as it is — own cards only (2026-08-04)

Cancelled for the plainest reason: **nobody has asked.** It was noticed in PR #51
and written down, never requested. That a CSV/Anki dump omits pack cards is
consistent with what `/cards` means, and neither of the sketched fixes (an export
on the deck page, an "include pack cards" toggle) has a user behind it.

Consequence to know about, since it lands without anyone choosing it: **export
follows the visible filter**, so an export taken on the default view now includes
pack cards. The old item kept the two apart precisely so that wouldn't happen
silently — that caution is now spent deliberately rather than by accident. If the
wider dump is ever wrong, the axis is already there to narrow it. _Shipped in #80
(08-04), which also dropped the Anki export's own archived skip: with the filter
in charge, a second one would hand you an empty file from the Archived tab._

### Grammar is patterns you exercise, not cards you flip (2026-08-03)

Designed before any code. The *argument* is in [vision.md](vision.md) and is the
part to read first — vocabulary is a lookup table, grammar is a function, and a
card runs the function on zero arguments. The type is in
[data-model.md](data-model.md), the staging in [backlog.md](backlog.md).

- **A pattern review is a one-sentence writing review with a target.**
  `/api/writing` already returns the native rewrite plus what to notice, pitched
  at the level the writing shows. A prompt gives a situation and a meaning in the
  native language, the learner writes the sentence, the verdict and the why come
  back through `WritingFinding`. Nothing new is invented.
- **The prompt never names the pattern.** "Use `-다가` in a sentence" teaches the
  label; the reach is the skill. The situation is chosen so the pattern is the
  natural way to say it.
- **Every exercise is production — no multiple choice.** Offering candidates does
  the retrieval for the learner. The latency objection doesn't hold: a turn costs
  20–60 seconds of thinking, so a two-second evaluation is invisible.
- **A hint tier, because the blank textbox is the real failure mode.** Refusing
  multiple choice leaves a stuck learner with nothing to do but be wrong, and it
  bites hardest on the patterns needing the most practice. One Hint control, two
  tiers: (1) the shape without the name, (2) the citation form itself. **Hints
  clamp the verdict** — `hard` after tier 1, `again` after tier 2 — which keeps
  retrieval the learner's and tells the scheduler the truth, with no new
  scheduler work. Both tiers generate with the situation, so no extra round trip.
  **Open:** whether a tier-1 hint is ever offered unprompted after an idle.
  Offering rescues the learner who won't ask; it also interrupts thinking, which
  is what this design exists to protect.
- **Verdicts are coarse: `good` / `hard` / `again`, never `easy`.** The rewrite
  shows on every verdict — a "got it" that still differs from native phrasing is
  worth seeing (same reasoning as `rewriteNative`).
  ⚠️ **`sm2.ts` is untouched as a file but not as behaviour.** In
  `getNextReviewData` (`sm2.ts:77`) `good` is exactly ease-neutral
  (`+0.1 − 1×(0.08 + 0.02)`) and `hard` is `−0.14`; `easy` (`+0.1`) is the only
  response that raises ease and it is the one excluded. So ease becomes a
  **one-way ratchet** for patterns: it falls and never climbs back, where a card
  recovers. Two exits when it bites, neither taken: emit `easy` for a clean
  first-try answer, or let the learner's override produce it. That makes the
  override question load-bearing, not cosmetic.
  *Risk, recorded not solved:* a wrong harsh verdict demoralises in a way a
  self-graded card never does. Mitigated by coarse verdicts, the rewrite always
  visible, and the note in the learner's language. **Open:** may the learner
  override a verdict.
- **`again` keeps a pattern due now, which reads differently here.**
  `sm2.ts:79-89` leaves a missed card due immediately so a restarted session
  picks it up — right for cards, hard-won (it was a platform divergence). For a
  pattern the rewrite was on screen seconds ago, so an immediate retry is nearer
  copying than recall. A fresh situation blunts it. Not a blocker and *not* a
  reason to touch `sm2.ts`: the fix, if needed, is a floor on reappearance where
  patterns are queued.
- **A review is two model calls.** Generate the situation, then grade — they
  can't collapse, since the exercise must exist before there's anything to grade.
  A session of _n_ patterns is _2n_ calls where a vocab session is zero; that's
  the running cost and it belongs next to the design. Only generation is new.
  Generation can be batched for the whole due set if per-turn latency
  disappoints, which trades a slower start for faster turns — a real-sessions
  question, not a v1 one.
- **Grading failure mid-session is the case with no obvious answer**, and it is
  not the offline case. The learner has spent 40 seconds on that sentence, so
  losing it is the one outcome to rule out. v1: keep the text, offer retry, allow
  a skip with no verdict — a skip writes no `ReviewTracking`, leaving the pattern
  due. Never write a verdict the model didn't produce.
- **Patterns get their own row in the Review picker — no fifth tab.** A 40-second
  production turn between two 3-second flips changes what Review feels like;
  doing that silently isn't a change to make by accident. The surface is free but
  **the function is not**: `buildReviewCollections` is `(cards: Flashcard[], …)`
  and `ReviewCollection.id` is contractually "null is your own cards, anything
  else is a pack id". A patterns row needs a second input and an identity outside
  that namespace — prefer a discriminating field over a reserved string, which is
  one future pack id away from colliding. **Open:** interleaving patterns into the
  vocab queue; decide once the rhythm is known.
- **Two ways in, both emergent.** A `kind === 'grammar'` writing finding offers
  "Practice this pattern" instead of "Save card" (a `WritingFinding.pattern?`
  sibling to `card?`; the prompt already asks for citation form). And Learn, by
  detection — a third `ExplainResult` arm, no new UI. Cost, named: `/api/explain`
  has six language branches each splitting again on `if (context)` — **12 prompt
  templates, not 6**. `/api/writing` is language-generic by comparison, which is
  why the writing-finding door ships first.
- **No curated grammar pack.** An ordered grammar curriculum is exactly the
  configured levelling [vision.md](vision.md) argues against twice. Errors are the
  syllabus; Learn covers cold start, the only thing a pack was for.
- **Spoken production is scoped with conversation practice, not ahead of it.** The
  app has no ASR at all — TTS out, nothing in. Web has Web Speech; mobile needs a
  native module, so a build of its own. Conversation practice already owns
  "transcription + per-participant feedback" and is already told to reuse
  `writing.ts`. Solving capture twice is the drift that put
  `reviewQueue`/`drill`/`reminders` in core. v1 is typed production.
- **Pattern review requires a connection in v1.** Model-graded production can't
  work offline and offline review is shipped, so the row is disabled offline
  rather than failing (`useOnlineStatus` / `useNetworkStatus` already exist). The
  resolution path is produce-offline / evaluate-on-reconnect, the same
  queue-and-flush as `enqueueReview`. Recorded, not built.
- **The acquisition signal is the north star, and it reopens a closed call.** A
  pattern that **stops appearing as a grammar finding in your own writing** is
  measurable evidence of acquisition, where a review count isn't. That needs
  writing stored over time, which the ephemeral-submissions call below closed off
  — reopened explicitly rather than assumed away. Not v1.

#### What building (1a) corrected (2026-08-08)

Three things the design did not survive contact with. The first two are settled;
the third is a step nobody has taken yet.

- **A verdict cannot be derived from `/api/writing` alone.** The design has
  grading reuse the route unchanged, and it does — but that route grades prose
  without knowing which pattern was being practised. A learner who sidesteps
  `-다가` entirely and writes something correct gets a clean review and a `good`,
  which schedules out the very pattern they avoided. Since "when to reach for
  it" is the *first* of the three things this feature exists to teach, that is
  the feature failing at its own premise, not an edge case. Fix:
  `PatternExercise.targetForms`, the surface fragments that count as having
  reached — generation knows the pattern and is a call already being paid for,
  so it lists them for free. Grading stays `/api/writing` unchanged; the check
  is local. **Cost, named:** it is a substring match, so it is exact for
  suffixal patterns and approximate elsewhere, and a thin form list scores a
  correct answer as a miss. An unmeasurable reach is therefore scored as
  *reached* — a wrong `again` on a good sentence is the outcome this design
  least wants. Measured over three answers against a generated `-다가` exercise:
  correct use → `good`, sidestep → `again`, botched form → `hard`.
- **The entry door is not `kind === 'grammar'`.** The design says a grammar
  finding offers "Practice this pattern". Measured on a passage using
  `-고 있었어요` where a native would use `-는데`, the model returns `naturalness`
  — correctly, since no rule was broken — and `-는데` is exactly the pattern
  worth practising. Gating on `grammar` hid the best offers behind the one kind
  that means "you made an error". The gate is gone; what a pattern *is* lives in
  the prompt, which defines it. The kind describes the finding, not the
  take-away.
- ⚠️ **The `patterns` collection has no Firestore security rule, so nothing
  works yet.** Reads fail with `Missing or insufficient permissions` and the
  patterns row silently doesn't appear — which is the isolation working as
  designed (a patterns read that throws must not cost the user their cards), and
  is also why this will not announce itself. There is no `firestore.rules` in
  the repo, so it is a console step, and it is the *only* thing standing between
  this branch and a usable feature. The composite index the design budgeted for
  turned out not to be needed: two equality filters with no `orderBy` are served
  by merging single-field indexes, and `archived`/sort are handled in JS because
  patterns number in the tens.

### Onboarding is not a checklist (2026-08-02)

Built, then rejected — measured, not guessed. The complaint was fair (the tour
card only *names* the four surfaces), but a three-step card on the Learn empty
state was the wrong answer twice over:

- **It occupied Learn permanently** until the loop closed. Learn is the surface
  [vision.md](vision.md) most wants out of the way; a progress tracker above the
  search field is the opposite.
- **It was still telling, not showing.** Ticking a box narrates what you just
  did. That was the same objection the checklist was *meant* to answer — so the
  lesson is that the fix for "onboarding is just text" is not a different widget
  describing the app.

Whatever comes next should teach inside the flow and not live on Learn. The
derived-signal machinery was the good part (`cardCount > 0`, `lastReviewDate`
— no stored state) and is at `ba9a844` in the reflog of
`feat/onboarding-first-run`. What shipped: two setup questions plus a one-card
tour, and that's where onboarding rests.

### Learn-flow `packId` stamping and daily draw: both dropped (2026-08-02)

Removed, not deferred — the pack unification answered both.

- *Stamping `packId` on Learn saves* existed because one word saved two ways
  landed in two places. Decks no longer route to Learn, so there is one path.
  What remains is typing a pack word in by hand, which is a person deliberately
  looking something up — that card genuinely is their own. Reopen only if a second
  surface starts saving pack words without a `packId`.
- *Daily draw* was one of four ways to make a 160-word pack learnable. Section
  enrolment solved it more simply — six sittings of 20–40, no scheduling state, and
  the user picks when to sit down rather than the app rationing. Reopen only if
  sections land too much at once in practice.

### Packs: one kind, not two (2026-08-02)

The `lookup`/`cards` split was a cheap way to ship a word list without authoring
backs, and it was cheap in the wrong place: a `lookup` pack couldn't be
bulk-saved, drilled or reviewed, so the packs with the most words had the least
machinery. Rejected alternatives: *batch-generate backs at enrol time* (a long
spinner on the tap, and it generates the curated half of the content, against
[vision.md](vision.md)); *migrate pack by pack* (two live code paths
indefinitely).

**The tension worth remembering:** both packs' headers argue these are words
where one gloss is *not enough* (여건, 취지, `outstanding`). Still true. The
resolution is that **the back is a seed, not a finished card** — it makes the word
savable and reviewable at all, and depth is generated on demand afterwards.
Before, that generation was mandatory and came *before* the card existed. If a
future change makes on-demand depth hard to reach, this justification goes with
it and gloss-only cards become a real regression.

Sections are **semantic, not uniform slices** — "Familiar words, second meanings"
is a theme a learner can hold, "words 31–60" isn't. Costs evenness (sections run
20–45); accepted. `layout` replaced `kind` for grid-vs-list, keyed on the content's
shape, so a future single-character pack inherits the grid without being asked.

### Writing review: design calls (2026-07-31 → 2026-08-01)

- **A Word/Passage toggle on Learn, not a fifth tab.** Alternatives were a
  `/write` route (the `/decks` precedent) and a tab. The toggle won on the vision
  statement — "ONE place to ask, understand, and remember" — since a passage
  you're unsure about is the same question as a word, at a different size. It also
  **defers the nav question until conversation practice lands** and there are two
  output surfaces to place together. Cost accepted: discoverability rests on the
  toggle, so it's a visible segmented control.
- **Findings are one ordered list, not fixed sections.** This *is* the
  level-adaptivity mechanism and is easy to undo by accident. The model orders by
  what this writer most needs. Fixed sections give a beginner an empty register
  heading and an advanced writer an empty grammar one — and adaptivity has to be
  rebuilt as configuration. Verified against real passages, both directions.
- **Any teachable unit becomes a card, including grammar patterns.** The first
  draft said vocabulary only — wrong, for the reason the audience amendment in
  [vision.md](vision.md) fixes. One-off typos still get no card.
  ⚠️ Superseded for grammar specifically by the grammar-pattern design above: a
  pattern is no longer a card at all.
- **The rewrite is shown in the native language too** (`rewriteNative`). A
  correctness check, not a convenience: the rewrite is the one text on screen the
  user did *not* write, so its meaning is the one they cannot verify, and a
  correction that quietly changed their meaning is worse than none — they'll learn
  the changed version. Subordinate to the rewrite but **not** behind a tap, despite
  "depth on demand": a check nobody opens is a check nobody runs. The prompt
  translates faithfully *including* where the rewrite departs.
- **A card back may carry up to two glosses, never more.** Forcing exactly one
  (copied from `/api/explain`) makes the card wrong rather than clean when no
  single word covers the term. Two is a ceiling for necessity, never a third.
  ⚠️ `/api/explain` still enforces strictly one, left alone deliberately —
  relaxing the core lookup loop didn't belong in a writing-review change. The
  inconsistency is the open question, not the rule.
- **Submissions are ephemeral; only saved cards persist.** No new collection, so
  neither manual console step applies.
  ⚠️ **Being reopened** by the grammar acquisition signal above, which needs
  exactly this. Still not owed; no longer settled.

### Decks, drill and review shape (2026-07-25 → 2026-07-26)

- **Drilling lives on Decks, not in Review.** A deck-scoped Review either respects
  due dates (4 of 71 kana, can't drill) or ignores them (two loops behind one tab
  with no way to tell which you'll get). Drill is a closed set, repeatable, not
  due-gated; Review is what the scheduler says. *Amended by PR #51:* Review
  composes collections rather than filtering a pool, so "which cards" is a choice
  made before starting. The load-bearing half stands — the two loops stay distinct.
- **Drill writes no SM-2 state.** Practice and scheduling stay separate, so
  grinding the kana chart five times can't wreck intervals. If drill ever feels
  like it "doesn't count", the fix is progress shown in the deck, not writes to the
  scheduler.
- **No "All cards" row on Decks.** It's a nav entry pointing at a nav entry, and a
  naming fix isn't worth a fake row. The one thing it would buy — drill my whole
  collection ignoring due dates — is a button on Cards if anyone ever asks.
- **Decks is a nav item on both platforms** (reversing the 2026-07-25 "route, not
  a tab"). The original trigger was pack *coverage*; what actually justified it was
  the **model** changing — a pack became a collection you review, a peer of Cards,
  and a peer doesn't live behind a link on Learn. The empty-for-four-languages
  objection was answered rather than outgrown: a *conditional* nav item reflows the
  bar on every language switch, worse than a quiet empty state that explains what a
  pack is. Nav reads Learn / Review / Cards / **Packs** — "Packs" rather than
  "Decks" so the two entries don't ask to be compared as Anki-style decks.

### Naming and audio (2026-07-23 → 2026-07-25)

- **The app keeps the name "Amgi."** Whether 암기 still fits as the app grew past
  Korean was weighed; the answer is yes. Settled — don't re-raise it as growth
  advice. A domain can be bought against the current name whenever wanted.
- **`cmn-TW-Wavenet-A` stays** for Traditional Chinese. Samples were listened to
  against `cmn-CN-Chirp3-HD-Charon` and accepted. `cmn-TW` has no Chirp 3: HD voice
  at all, so this trades voice quality for a Taiwanese rather than Mainland accent.
  The accent won.
- **A single kana may sound different from the rest of its deck.** Single
  characters route to a Neural2 voice while longer text uses Chirp 3: HD, so the
  speaker audibly changes between a tile and a sentence. Correctness beat
  consistency; moving Japanese and Korean wholesale to Neural2 would cost quality
  on longer text. **Not a consistency bug** — if it resurfaces it's a re-decision.
- **No OTA.** See Known Issues and [tech-stack.md](tech-stack.md).

## Shipped

Reference only — one line per item, newest area first. Reasoning that outlived
the change is in Decisions above; durable gotchas are in
[lessons.md](lessons.md); the blow-by-blow is in git.

**Writing & onboarding**
- **Writing review, web + mobile** (#69, 08-01) — Passage mode on Learn: native
  rewrite, that rewrite in your own language as a meaning check, and an ordered
  finding list each offering a card. First surface above word level on the
  production side of the ladder. `packages/core/src/writing.ts` holds the types,
  parser, `buildWritingCardDraft` and the one fetch both apps call — it says
  nothing about *writing*, because conversation practice is the same job on a
  different capture.
- **First run, both platforms** (#73, 08-02) — mobile gained the blocking language
  setup it never had, plus a third step naming Learn / Review / Packs / Writing.
  Filtering the native language out of the study options makes "native Korean,
  studying Korean" unreachable by construction. Both answers commit on the last
  tap and neither is awaited — an awaited write strands a signed-in offline user
  behind a modal with no dismiss. A brand-new account inherits what the device
  already answered.
- **Per-page help on mobile** (#74, 08-02) — a "?" in the title on Learn, Packs
  and Review. Pull, not push, which is why it needs **no per-user state** — the
  blocker on the contextual-tips item. Review mounts it twice so a brand-new user
  can reach it. Korean copy was reworked, not re-translated (see
  [ui-ux.md](ui-ux.md)).
- **Card lists reload on tab focus** (#75, 08-02) — Expo Router keeps tab screens
  mounted, so loads keyed on `[user, studyLanguage]` never re-ran and only killing
  the app refreshed. Review defers a refresh mid-session, since its load resets
  `collectionId`.

**Packs, decks & collections**
- **Two military terminology packs, in both directions** (#81, 08-08) — 474
  Korean–English pairs from one authored source, registered four ways:
  `military-unit-{ko,en}` (220, 부대·참모 — a unit and a combined staff) and
  `military-affairs-{ko,en}` (254, 안보·정세 — a briefing and a press statement).
  Design calls in Decisions above. The second pack exists because the first draft
  was reconciled against a 어학병/통역장교 선발 prep glossary built for the
  selection exam's news-interpretation task: **the overlap was about fifty
  concepts, under a quarter of either list**, so nearly everything it covered
  and the draft did not became 안보·정세. That comparison also caught a real
  error — §1 gave Army rank equivalents with no note they are service-specific,
  and a ROK Navy 대위 introduced as "Captain" sounds four grades senior than they
  are. Mobile's packs list dropped the per-pack description in the same PR: one
  deck per language became three, and three paragraphs stacked is a page to read
  rather than a list to choose from. Drafts stay in `docs/packs/` as the review
  artifacts and still hold the open questions — the acronym convention (nobody
  says "Korea Massive Punishment and Retaliation" aloud), ten section rows
  against a deck page laid out for four and six, and the contested renderings
  (동해, 독도, 위안부) that deliberately use the ROK government's English.
- **`/cards` holds every card, packs included** (#80, 08-04) — the last
  structural piece of the pack work, and the reversal of the "pack cards left
  `/cards` entirely" line below: a card belongs to a pack *and* to your list. The
  load stopped filtering; a **second axis** narrows instead — All / My Cards /
  each enrolled deck, orthogonal to active/archived. `all` leaves out
  `layout === 'grid'` packs only, so kana is hidden but still one chip away and a
  future single-character pack inherits the rule. `filterCardsByDeck` and
  `buildDeckFilters` are in `collections.ts`, shared by both platforms.
  **The default is `mine`, not `all`** (`DEFAULT_DECK_FILTER`, pinned by a test):
  the page is called My Cards, so it opens on them and widening to a pack is
  deliberate. It is also where a selection lands when the deck it pointed at
  stops existing. The status chip is **"Both" (둘 다), not "All"** — there are
  exactly two states, so it is the more precise word, and it stops that chip
  reading identically to the deck row's "All", which means something else.
  Web briefly carried group headings to disambiguate the two; renaming fixed it
  at the source, so the headings went and the rows are told apart by fill alone
  (`text` vs `highlight`). The headings survive in mobile's sheet, where they
  are structure rather than a patch.
  _Considered and rejected: dropping the both-states option altogether. It is
  what makes search state-agnostic — "did I already save this?" is asked without
  knowing whether you archived it — and, now that export follows the filter, the
  only way to get a complete library into one file. The CSV's Status column
  exists for exactly that export._
  Deck chips are built from **all** cards, not the status-filtered ones — the
  other order retires a chip the moment its deck has nothing archived, including
  the selected one. **Export follows the visible filter**, which is why the Anki
  export lost its own archived skip and `cardsExportCSV` lost "(all cards)".
  Review untouched (it filters by collection itself); `deckManageHint` deleted as
  a dead key asserting the old rule.
  **The platforms diverge on the control, deliberately.** Web has the room for
  two chip rows and reads well with them. Mobile did not — deck, status and sort
  came to three rows plus search, half a screen of chrome before the first card,
  to answer a question you ask once. All three moved behind one summary button
  (`FilterSheet.tsx`) that states what is currently on, which a row of chips
  never did well: it shows what is *available* and leaves you to spot which one
  is lit. Counts went with them, since a count informs the choice and belongs
  where the choice is made. Selections apply on tap, so there is no draft state
  and "Done" only closes. Section themes as filters land as a fourth group here,
  not a fourth row.
- **Packs unified into one pre-authored kind** (#71, 08-02) — `lookup`/`cards`,
  `LookupPack`, `CardPack`, `PackWord`, `PackCard` all gone. Every pack is
  `PackEntry {study, back, context?}` in named `PackSection`s, with `layout` and
  `pronounceable` the only differences. Section enrolment is the unit (TOEIC 4,
  TOPIK 6, kana 3). 293 card backs authored and approved. `CardDetailModal` is now
  the one card surface. On-demand depth/examples callable from deck, list and
  mid-review. Drill works on every pack.
- **Review by collection** (#51, 07-26) — your own cards and each pack are separate
  collections, reviewed apart. `getCollectionId` is the one place `packId` is read
  for grouping. `isDue` moved into core with one signature (the two copies
  disagreed). Review lands on the collection picker; direction chips moved inside.
  Pack cards left `/cards` entirely — reversed by #80 above. Decks became a nav
  item on both platforms.
- **Decks page** (#50, 07-25) — `PacksModal` retired; `/decks` and `/decks/[packId]`.
  `packId` on saved cards is **provenance only** — progress still matches on the
  study side. **Drill** added the same branch: shuffled prompt → reveal →
  knew/missed, missed requeued 4 later; queue is pure, in `drill.ts`, 13 tests.
  Shuffle before cutting to size, or every session drills the same opening kana.
- **TOPIK 고급 pack** (#68, 07-30) — Korean's first pack, 160 words, six sections,
  48 context hints (Korean homographs are one form with unrelated senses). Word
  list approved after use on mobile. Fixed on the way: `.gitignore` said `docs/`
  and git never descends into an excluded directory, so `!docs/packs/**` had never
  worked.
- **TOEIC pack + Korean-user UX** (#34, 07-13) — 133 curated words; cards
  import/export fully localized EN+KO.

**Review loop & reminders**
- **Offline review on mobile** (#53, 07-26) — mobile keeps its own durable state
  because Firestore's persistent cache is IndexedDB and therefore web-only. Card
  snapshots per user and language in AsyncStorage; a durable queue of unsent
  ratings committed to disk *before* the network is tried. Conflicts are
  last-flush-wins. A session can be stopped early and is allowed to finish. Added
  `expo-network`.
- **Web review session parity** (#54, 07-26) — ratings never fed back into
  `userFlashcards`, so the due count was frozen at page load and a second session
  re-served the whole deck.
- **Direction choice on mobile Review** (#65, 07-28) — a start screen after the
  collection pick, not pills on the picker, which single-collection users never
  see. Per-session, reset with the collection. Queue moved to `reviewQueue.ts`
  beside the drill queue (12 tests).
- **Word-of-the-day and review reminders** (#61, 07-27) — local scheduled
  notifications, not remote push: everything the decision needs is already on the
  device, and it avoids an APNs key on a borrowed account. Both opt-in, off by
  default. WOTD fires at a fixed 09:00. The review reminder is a one-shot
  re-planned when its inputs move, scheduled only when cards are due *and* today
  has had no review. A "streak at risk" reminder was considered and dropped —
  what it adds is loss-aversion framing. Logic is pure, in `reminders.ts`, 15
  tests. Added `expo-notifications`.

**Multi-language**
- Six study languages via the `STUDY_LANGUAGE_CONFIGS` registry: Korean, Swedish
  (#gender, 07-04), English/French/Japanese (#31, 07-06), Traditional Chinese
  (07-24). Per-language collection routing, prompts, and readings
  (`furigana`/`pinyin` through `getReading()`).
- **Card backs follow native language** (#67, 07-28) — the back slot was decided
  per *study* language, so a Korean native studying Japanese got English backs
  everywhere. `getBackSideConfig(studyLanguage, nativeLanguage)` made the 31-file
  change tractable by turning 42 reads into compiler errors. Cards carry **both**
  slots, so switching native language switches existing cards and no migration was
  needed. Two one-off scripts in `apps/web/scripts/` were applied to production
  (backfill 355 cards, dedupe 71).
- **Japanese & Chinese depth** (#49, 07-25) — pronunciation for four more
  languages; per-language character breakdown (`TermDepth.hanja` →
  `characterBreakdown`, read through a helper that falls back, so no migration);
  kana packs generated from one table in `kana.ts`.

**Privacy & account**
- **Account deletion + "your data"** (#59, 07-27) — App Store 5.1.1(v) makes this
  a submission blocker, not hygiene. Client `deleteUser()` plus the Delete User
  Data extension: no API route, no `firebase-admin`. **Second attempt** — PR #55
  did it server-side and adding `firebase-admin/auth` took `/api/pronounce` and
  `/api/word-of-the-day` down with it; **root cause never found**, and the current
  design simply doesn't need that module. Requires a console step (see
  [tech-stack.md](tech-stack.md)). Pronunciation audio is deliberately kept —
  it's keyed by text hash and shared. Verified end to end on both platforms.

**iOS & mobile parity**
- **TestFlight prep** (#38, 07-19), **EAS OTA automation** (#39–41, 07-21),
  **channel fix** (#43, 07-21), **Korean beta info + `/privacy/ko`** (#42, 07-21),
  **theme parity** (#44, 07-22).
- **Mobile ↔ web parity** (4 phases, 07-21) — study languages across all screens,
  Learn features, Cards import/export + detail modal, streaming depth/examples.
- **Push entitlement dropped** (#63, 07-27) — the 1.1.0 build failed on a Push
  Notifications capability the app has no use for; `expo-notifications` sets
  `aps-environment` unconditionally. `withoutPushEntitlement.js` deletes it.
  **Registration order is the subtle part** — the plugin must be listed *first* to
  have the last word. See [lessons.md](lessons.md).

**Learn screen**
- **Skeletons for the three worst spinners** (#80, 08-04) — the full-screen one a
  cold launch opened on (`authLoading`, first impression, nothing on it), plus
  the card and review lists. Each is laid out as the surface that replaces it, so
  the load resolves into position instead of swapping a centred wheel for a full
  screen. The cold-launch one is text-free for a second reason: `nativeLanguage`
  is still undefined there, so any label would render in English and correct
  itself a beat later. `Skeleton.tsx` drives every bar from **one** shared
  `Animated.Value` — per-bar loops drift apart within seconds — stops it when the
  last bar unmounts, and honours Reduce Motion. In-button spinners left alone.
- **Keyboard + generate link** (#60, 07-27) — the search bar now sits above a band
  held open at 46% of screen height, so the field doesn't move on focus. 46% is
  *tuned, not measured*: measuring means reacting, and reacting means movement.
  Removed the "generate words for a goal" link from both platforms.
- **A second Learn tab tap clears the search** (#66, 07-28) — the screen had no way
  back. Arriving from another tab is left alone. Clearing exposed a race: a `runId`
  ref now marks the lookup on screen so async writers can check it.
- **Empty state + WOTD skeleton** (07-24) and **depth/examples sense pinning**
  (#35, 07-14); **WOTD persisted in Firestore** (#37) so the word is stable
  regardless of cache; **WOTD repeats fixed** (#47, 07-24) by excluding the last 60
  days by document ID.

**Foundation**
- Core loop (lookup → Gemini → save → bidirectional SM-2), Firebase Auth +
  Firestore + rules, Gemini proxied server-side, Next.js 16.2.7 on Vercel.
- Cards page (search, filter, sort, detail modal, bulk actions, CSV + Anki export,
  import), streaks, NDJSON streaming with typewriter, Firestore IndexedDB cache.
- Design system — Forest/Sonokai/Paper/System themes, Source Code Pro, localized
  UI (EN + KO), desktop side nav, pre-paint theme script.
- **Pronunciation audio** (07-11) — Google Cloud TTS, lazy-generated, cached in
  Firebase Storage keyed by text+language+voice+rate.

**Tooling**
- **Test suite green** (07-26) — the two stale review tests are gone. One was
  scoped as "delete line 150", which was wrong: that line masked a **date bug in
  the same test** that would have started failing on its own on 25 July. A test
  failing for the stated reason doesn't mean that's the only reason it fails.
- **`npm run lint` works again** (07-26) — `next lint` was removed in Next 16.
  `eslint-config-next@16` **is** flat config, so the `FlatCompat` wrapper fails on
  it. Running eslint directly doesn't ignore build output implicitly, and `.next/`
  buried 90 real findings under 25,000 generated ones — the ignores are
  load-bearing. 24 real errors fixed.
