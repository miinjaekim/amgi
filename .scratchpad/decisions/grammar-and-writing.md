# Decisions: Grammar and writing

The August grammar-patterns feature, its removal, and the reasoning that led to Munli. Read before touching `grammar.ts` or reopening pattern practice. Newest first. Indexed from
[status.md](../status.md).

## Grammar returns as content, not as a mode — and not as its own app (2026-09-14)

⚠️ **Largely superseded 2026-09-21 — read the two entries of that date above
first.** Both of this entry's central calls fell: grammar *is* a mode now, and
levels are *not* the spine — tools are, one at a time, with the grouping read off
them later. The French A1 ladder and its sourcing gate are cancelled outright.
What still governs is everything else here: authored or computed rather than
generated, graded locally, zero model calls in the daily loop, never pooled with
vocabulary review, and why the four 2026-08 removal reasons do not transfer to a
closed conjugation table. That last argument is the one this entry is still worth reading
for.

**The question was whether grammar belongs in Amgi at all**, reopened after the
2026-08-18 removal and with a separate grammar app on the table the way Hwasul
is for speaking. The answer: **the half of grammar that is authored content
belongs, as a pack. The half that is diagnosis stays removed.** No new tab, no
mode, no second app.

⚠️ **First, why the 2026-08 removal happened, because it was recorded nowhere.**
The commit, the merge and the entry below all say "the user's call" and list what
was deleted; none of them says why — so answering this required asking the user
rather than reading. This is the exact failure this section exists to prevent.
All four reasons fired at once: **it made the app feel unfocused, the practice
itself was not good, it went unused, and it was heavy and slow.** And one fact
sets the bar for anything replacing it — **the user is not its user**: "I want it
to exist, but I'm not the user."

**The decisive observation: verb conjugation is not the thing that was removed.**
The ask that reopened this named French conjugation, and that sits on the
opposite side of every axis the removed feature failed on. What was removed was
errors-as-syllabus — emergent from your own writing, model-*generated* per turn,
model-*graded* free production, carrying its own queue and collection. A
conjugation paradigm is **closed, finite, externally authored, gradable by string
comparison, and needs no model call at all**. So the four removal reasons do not
transfer: it is a pack rather than a toggle (focus), the exercise is a published
table rather than an invention (quality), it costs nothing while unused
(adoption), and it has no round trip (weight). Naming it "grammar" is what made
these look like one question.

**The research already said this and was read backwards.** `docs/grammar-research.md`
§1 finds the explicit-practice advantage **concentrated in easy rules** — short
scope, high reliability, few exceptions — and not significant for hard ones. A
conjugation paradigm is the paradigm case of an easy rule. Amgi built the hard
end, where the evidence is weakest, and skipped the end the evidence actually
supports.

**The precedent is the kana packs, and it transfers exactly.** `vision.md` admits
them against its own not-for-beginners rule because **a writing system is a
prerequisite, not vocabulary** — an adult who reads Chinese still cannot read
かな. An adult with 500 French words still cannot conjugate *mettre*. A
paradigm table is infrastructure in the same sense, and it is literally the same
*shape*: `layout: 'grid'` exists for a wall of cells that has to stay scannable.

**And `vision.md` amended itself on 2026-09-09, after the removal, in a way that
reopens this.** Per-level *content* is now allowed where the ladder "comes from
somewhere real — a published curriculum or exam sequence someone thought about."
That amendment was made for 급수 and it covers a conjugation table for the same
reason. **It does not reopen the curriculum**: what stays refused is the app
deciding what a learner is ready for, and a pack of tables decides nothing.

**Why not a separate app.** The test is **whether it needs new nouns.** Speaking
does — a session, a turn, a recording, realtime latency — which is why Hwasul is
a coherent idea. Conjugation needs **zero**: it is `VocabPack` + `layout: 'grid'`
+ the existing `/decks/[packId]/drill`, all built. Against that, a second app
costs its own auth, habit, retention, store listing and Beta App Review cycle —
and the no-OTA model already makes each of those expensive here. Spending that on
a feature already removed once for being unused, for a user the builder is not,
is the highest-cost and lowest-signal option available.

**Three constraints the user set the same day, and they sharpen the shape rather
than complicate it.**

1. **Grammar review is never pooled with vocabulary review.** Its own row in the
   review picker. This is already the house rule — `collections.ts` keeps
   collections apart rather than pooling and filtering, and refuses an
   "everything" collection outright. ⚠️ **And the research does not object**, which
   is easy to get backwards: the interleaving finding measured grammar points
   against *each other*, never grammar against vocabulary. The entry below already
   records that as an extrapolation. So the instinct is backed rather than
   tolerated.
2. **Levels are the spine — A1 first, building up as users need more.** See the
   `vision.md` amendment of this date, which this reverses a line of.
3. **One concept at a time, authored — not a format that fits whatever turns up.**
   This is the exercise *generator* being rejected, and it is what kills the
   remaining machinery: `getPatternExercise` and `gradeFromReview` stay dead.
   Items are written by hand, graded locally by `typedAnswer.ts`, single
   direction. Zero model calls.

**The structural insight that makes all of this cheap: a grammar point is a
*subpack*, and its practice items are the *entries*.** One pack per level, one
subpack per concept, each entry an authored cloze. Level → concept → item is two
levels, and packs are exactly one subpack deep, so this needs **no nesting
change** and inherits enrolment, the review picker, progress and drill as they
stand.

⚠️ **This does not contradict "a grammar point is not a card."** That argument
rejected one card *per pattern* carrying a gloss — the lookup-table row that
teaches the card instead of the function. Here the concept is the subpack and the
cards are *instances of exercising it*. Losing that distinction is how this
becomes the thing that already failed.

⚠️ **`ReviewCollection.kind` does not come back.** It existed only because a
patterns row and your own cards were both `id: null`; a grammar pack carries a
pack-shaped id, so `collectionKey = id ?? ''` still resolves. The separation is
cheaper now than the version that was deleted.

**Writing comes back — as the diagnostic, never as the practice** (added later the
same day, on the user's ask). ⚠️ **This revises the line that stood here**, which
said writing review stays dead. It is revised for a reason inside this entry
rather than because it was asked for: the `vision.md` amendment above justifies
the levels reversal on the grounds that **errors-as-syllabus lost its sensor**.
Writing *was* the sensor. Bringing it back restores the premise, so the
conclusion has to be re-examined rather than quietly kept.

**The two were built as competitors and are actually complements.** The old
design had a finding *generate* a `GrammarPattern` and then *generate* exercises
for it — two model calls per practice turn, unbounded scope, invented exercises.
With an authored ladder in place a finding instead **classifies into a closed
set**: "this is `la négation ne…pas`, A1 #7", which already has its items
written. That is the same move `normalizePartOfSpeech` makes — match a closed
code list, drop what does not fit — and it is far more reliable than generation.

**The cost profile inverts, which answers the "heavy and slow" failure
directly.** The old design put the model **inside the daily loop**, a call per
turn. This puts it **only at the diagnostic moment** — `/api/writing` is one
`gemini-2.5-flash` call at temperature 0.1, already deployed and unchanged. Daily
practice stays authored, local and offline.

**One real change to a recorded decision: submissions stay ephemeral, findings do
not.** Store the **concept ids and counts**, never the prose — "missed `la
négation` four times" is the syllabus signal, and the passage still is not kept.
Strictly less persistence than the version that was rejected, and it is the piece
that turns a one-shot review into a syllabus. It also earns the best surface in
the plan: **the grammar collection ordered by the learner's own error counts.**
That is the whole synthesis in one line — **authored content, emergent
ordering.** Neither half was sufficient alone, which is why both previous
attempts failed.

**The gap card returns for free** — `WritingCardCandidate.gap` is implemented,
the prompt already specifies it, and the route is deployed. It is vocabulary, so
it feeds the ordinary card flow. Cheapest win here by a distance.

**What stays dead, and this is still the load-bearing half:** generated
exercises, model-graded free production, and writing as a *practice* surface.
`getPatternExercise` and `gradeFromReview` do not come back. Writing diagnoses;
authored clozes practise; the two never swap jobs.

⚠️ **Sequencing is the whole risk control, and writing is third.** A finding has
nowhere to point until the ladder exists, so: (1) one concept end to end, (2) the
French A1 ladder, (3) writing as the router into it. That ordering doubles as a
**gate** — writing returns only if (1) and (2) get used, which is the honest
response to "it went unused" from a builder who is not the user. It buys the
option rather than the commitment.

⚠️ **Do not oversell what this buys.** Authored cloze is Paulston's *controlled*
rung, and the same research is blunt that controlled practice alone does not
build form-meaning mapping — Bunpro is the shipped cautionary case, and with
production removed and no writing surface, Amgi now buys its ceiling knowingly.
Accepted for now rather than solved. This does **not** fill the
sentence × production cell `vision.md` wants and must not be described as doing
so. **First language is French, A1** — and one concept ships end to end before a
level is authored.

## Grammar and writing are removed — the routes stay behind (2026-08-18)

**The user's call, and it reverses everything in the four grammar entries below
rather than amending them.** Grammar patterns and writing review were built,
trialled and redesigned across two weeks; the conclusion is that neither belongs
in Amgi for now. Removed on `chore/remove-grammar-features`: pattern practice,
the writing review panel, the Cards/Grammar management toggle, the Learn
Word/Passage toggle, the patterns Review collection, `services/patterns.ts` on
both platforms, `packages/core/src/diff.ts` and both `TextDiff` components, and
88 i18n keys × 2 languages.

**Two API routes and their parsers deliberately survive**, and this is the part
that will look like an oversight later. `/api/writing` and
`/api/grammar/exercise` stay deployed, which forces `packages/core/src/writing.ts`
and `grammar.ts` to stay too — the routes import `parseWritingReview`,
`WRITING_MAX_CHARS` and `parsePatternExercise`. Both modules now have **zero
callers in the tree**, which is exactly the shape of something safe to delete.

The reason is the no-OTA model. TestFlight 1.3.0 is in external testers' hands
with the writing and pattern UI compiled into the binary; deleting source here
cannot reach it, so those screens keep rendering and keep calling the deployed
routes. Delete the routes and a tester's Writing tab errors out mid-use. Each
module carries a `DO NOT DELETE AS DEAD CODE` header pointing back here.

**When they can go:** once no build predating the removal is still in use — i.e.
after the next build ships and testers have updated. That is the one condition;
nothing else gates it.

**What was given up, recorded because it was argued for at length.** The
"demonstrated gap" card offer — a word the learner reached for and did not have —
went with the writing panel. The entry below at 2026-08-08 calls it the
highest-confidence signal a passage can produce about what to learn next, and
writing review was the only surface that could observe it. Lookup, packs, manual
add and CSV import are the remaining card doors. `docs/grammar-research.md`
stays: it is the argument, and it outlives the code.

**Word order practice is cancelled with it.** It sat in the backlog as a
controlled rung *below* the cloze, inside `ExerciseFormat`'s ladder — with no
ladder there is nothing for it to be a rung of. The case for it (L1 interference
on SOV order, which a cloze structurally cannot reach) was never refuted and is
worth re-reading in `docs/grammar-research.md` if grammar is ever revisited, but
it does not survive as a standalone drill: the same research §"controlled →
meaningful → free" calls a bare ordering task mechanical in Paulston's sense, and
mechanical drills do not build form-meaning mapping on their own.

**The writing-review follow-ups die with it** (2026-08-21), and they were never a
separate call: untested long rewrites through `PronounceButton`, two-gloss card
backs from `/api/writing`, streaming findings as NDJSON. All three describe a
surface that no longer exists. The one that outlived the feature is
`/api/writing`'s missing `try`/`catch` — because `/api/explain` has the same
exposure and is still the core loop, so it stays on the backlog in its own right.

**Collateral simplification:** `ReviewCollection.kind` is gone. It existed only
because a patterns row and your own cards were both `id: null`; with patterns
removed `id` identifies a row again, and `collectionKey` is now `id ?? ''`.
`buildReviewCollections` lost its `patterns` parameter.

**Test count: 313 → 222.** Three test files deleted (`grammar.test.ts`,
`writing-review.test.ts`, `diff.test.ts`) plus four pattern cases out of
`review.test.ts`. Measured, both apps typecheck, `next build` clean with both
retained routes in the manifest.

## A word you reached for and didn't have is the best card a passage yields (2026-08-08)

From a trial: writing in French, the user hit a word they didn't know, wrote the
English one inline, and got a *pattern* offer back but no vocabulary card.

- **Two marks tell you a word was missing**, and both are easy to read past
  because the rest of the sentence often looks fine: the word appears in the
  native language mid-sentence, or the learner talks around it — "the thing for
  cutting bread" where a native says `un couteau à pain`. The prompt now hunts
  for both by name, gives each its own finding, and ranks them high.
- **`WritingCardCandidate.gap` marks them**, and the flag earns its place by
  being *different evidence*. Every other card offer is a judgement — this would
  be worth knowing. A gap card is a demonstration: the learner tried to say
  something and the word was not there. That is the highest-confidence signal a
  passage can produce about what to learn next, so the UI labels it rather than
  letting it look like any other suggestion.
- **⚠️ This corrects a call in the grammar entry below.** That entry had a
  pattern offer *replace* the card offer, reasoning that showing both for one
  grammar point asks the learner to choose between two things the app has not
  explained. That reasoning holds for one point and was wrong as a blanket rule:
  a word you didn't have and a pattern the same sentence illustrates are two
  objects, and hiding the first behind the second is what the trial hit. Now a
  card shows alongside a pattern **when it is a gap card**, and otherwise still
  gives way.
- **Why gap and not "whenever they differ"**, which was the first fix and was
  measured to be worse: on a grammar finding the model often emits a card whose
  front is a *description* — `accord du participé passé avec être` is a heading,
  not something anyone wants in a deck. Those differ from the pattern text and
  would have come back. Keying on `gap` admits exactly the case that prompted
  this and nothing else.
- Verified live in both directions: `corkscrew` → `un tire-bouchon` and the
  circumlocution → `un couteau à pain`, both ranked first; and in Korean,
  `crowded` → 붐비다 shown alongside a separate `-아/어서` pattern offer.
- Mobile gets the new cards for free — its panel reads `finding.card` and does
  not branch on patterns — though not the `gap` label until parity.

## Grammar patterns are closed — and one constraint outlives the item (2026-08-10)

The mobile pass came back clean, so the last grammar-patterns item left
[backlog.md](../backlog.md) and the feature is done. Everything the item still
carried was either answered or is recorded below; nothing is deferred.

- **What the pass answered.** Both blockers the item named are gone: the API half
  shipped with `c70c47c`, so `/api/grammar/exercise` and `/api/writing`'s
  `pattern` field exist on the deployed API that `EXPO_PUBLIC_API_BASE_URL`
  points at, and Expo Go against production exercised the feature end to end
  with no issues found. The drawn cloze blank and the offline-disabled patterns
  row were part of that pass.
- ⚠️ **Carried forward, and the one reason to read this entry: don't remove the
  "+ card" fallback from `/api/writing`.** It emits `card` alongside `pattern` so
  a *shipped* build — which reads `card` and ignores `pattern` — still gets the
  take-away. Both platforms now apply the gap-card rule, so the duplicate is
  inert in current code and will look like dead weight to whoever next reads that
  route. It stays until no old build is in the wild, and **with no OTA that is a
  while** — the first build that could retire it is the one this queue produces,
  plus however long users take to update.
- **Two things stay unverified and neither is a task.** Graduation from cloze to
  the production rung still needs about a week of real intervals to reach, which
  is deliberate and argued in the entry below — don't build a "make due now"
  control to shortcut it. And `alternates` is still coming back empty on live
  clozes, absorbed by the learner override; the signal to watch is **being marked
  wrong while right**, and one real instance is worth more than a prompt rewritten
  on speculation.
- **The last open design question is unchanged and still off the backlog:**
  whether a tier-1 hint is ever offered unprompted after an idle on production
  turns. It wants a real session to answer it, not a slot.

## Grammar patterns stay their own row, and the tail is cancelled (2026-08-09)

_User's calls, after trialling the built feature. Closes the last of the design
questions and cuts the backlog item down to what is actually left to do._

- **Patterns do NOT interleave into the vocab queue.** This was one of the two
  remaining opens and it closes as **no, for now**. The research argument for
  interleaving was always narrower than it looked: the studies measured grammar
  points against *each other*, which the session queue already does via
  `buildPatternQueue`, not grammar against vocabulary — that was always an
  extrapolation. And the original objection stands on its own: sitting down to
  flip cards and sitting down to produce sentences are different acts, and
  mixing them changes what Review feels like without anyone choosing it.
  Reversible; nothing was built to prevent it.
- **The Learn door (1b) is cancelled, not deferred.** It was the cold-start path
  — a third `ExplainResult` arm on `/api/explain`, costing **12 prompt
  templates** across six language branches each splitting on `if (context)`.
  Manual add now covers what it was for: you type the pattern, pick its kind,
  done — no endpoint, no model call, and more control over what counts than the
  detector would have given. A twelve-template feature that duplicates a
  free-form one is not worth carrying on a list.
- **No dev-only "make due now" control, and graduation ships unverified.** The
  cloze → production step cannot be reached in a sitting — a correct cloze
  schedules a day out and the next six — so seeing it happen would have needed
  either a week or a scheduling override built for testing. Neither is worth it:
  the step is derived from `repetitions` in four lines, it is unit-tested both
  directions including the lapse-demotes case, and the remaining risk is one a
  real session surfaces on its own. **Deliberate**, so don't read "unverified"
  as an oversight and add the tool.
- **One open question left, and it is the last one:** whether a tier-1 hint is
  ever offered unprompted after an idle, on production turns only. Offering
  rescues the learner who won't ask; it also interrupts thinking, which is what
  the design exists to protect. Not on the backlog — it wants a real session to
  answer it, not a slot.
- **Known weak spot, measured and left alone:** `alternates` came back **empty
  on every live cloze generated so far**, across French and Korean, despite the
  prompt asking outright for every acceptable variant and warning that a missing
  one marks a correct answer wrong. So the learner override is currently
  absorbing all of it. Left as-is deliberately: it is one prompt away from being
  fixed *if* it turns out to bite, and guessing at which variants matter without
  real answers to look at is how you write a worse prompt. The signal to watch
  is being marked wrong while right.
- **The speculative tail is off the backlog**, and none of the reasoning is lost
  because all of it already lives elsewhere: produce-offline /
  evaluate-on-reconnect and the acquisition signal are both in the older design
  calls below; the acquisition signal and the structured-input comprehension
  rung are both argued in `docs/grammar-research.md` §4, which is also honest
  that structured input is forced-choice and sits awkwardly beside
  no-multiple-choice. Contrast turns — paired situations, both *produced* — stay
  a live idea in `vision.md`'s "why it and not its neighbour", and would be a
  refinement of the production rung rather than a new one. Any of these can come
  back as its own item when there is a reason; none of them are next.

## Grammar patterns: cloze first, production when it sticks (2026-08-08)

Written after (1a) was built, tried once, did not feel good, and the research
was then read properly. **Read `docs/grammar-research.md` before changing any of
this** — the design is derived from it rather than merely informed by it. The
argument is in [vision.md](../vision.md), the type in
[data-model.md](../data-model.md).

_This entry replaces an earlier same-day version that had the pattern's **kind**
select between two exercise formats. That was a real distinction aimed at the
wrong axis, and its bare transformation drill is dropped outright: mechanical
drills are close to the one practice type the literature is unanimous against.
The trail is kept because the choice/form distinction survives — demoted._

What the trial reported, in the user's order:

1. no way to manage saved patterns;
2. saving one feels too vague — unclear what should and shouldn't count;
3. during practice it is ambiguous which pattern is being asked for;
4. too much variance everywhere — saving, generation, grading.

**One mistake produced (2), (3) and (4): free production was made rung one when
it is rung three.** Practice runs controlled → meaningful → free. A situation is
the least constrained prompt there is, which is (3); free text has unbounded
correct answers, which is (4); and with only one exercise available everything
had to be squeezed into it, which is (2). (1) is an independent gap.

- **Two formats, and the learner's *stage* picks between them.** A cloze — one
  sentence with the pattern blanked, typed into — until the pattern sticks, then
  free production. Everything (1a) built survives as the second rung; nothing is
  thrown away.
- **Cloze does not break "no multiple choice."** That principle exists because
  offering candidates does the retrieval for the learner. A cloze offers
  nothing: it is cued recall, which measurably beats recognition for retention.
  The learner still arrives at the form; the sentence only fences off part of
  the search space, which is the same trade the hint tiers already make.
- **Cloze cannot be the terminal state either.** Production forces syntactic
  processing that gap-filling does not, and the cautionary case is a shipped
  product: Bunpro is a Japanese grammar SRS built entirely on cloze, and its own
  community's most-asked question is how to practise speaking. Stopping there
  buys a learner who is excellent at grammar exercises — the exact thing the
  research is weakest at showing transfers.
- **`kind` is demoted to deciding whether a pattern graduates.** `form` rules
  (`de` → `d'`) stay at cloze permanently, because there is no meaning to choose
  and production has nothing to add. `choice` patterns must graduate. Still read
  off the learner's error rather than off a grammar reference — see
  data-model.md.
- **Stage is derived from `repetitions`, never stored.** No field, no migration,
  no way for stage and schedule to disagree — and a lapse demotes a pattern back
  to cloze for free, because `getNextReviewData` already resets `repetitions` on
  `again` (`sm2.ts:68`). The threshold borrows SM-2's own boundary rather than
  inventing a second definition of "learned".
- **The cloze hints are free.** Tier 1 is the pattern's stored `gloss` — the
  meaning of the point being asked for, which is exactly Bunpro's first tier —
  and tier 2 is the citation form. Neither is generated. This is the direct fix
  for (3): the sentence disambiguates, and the meaning is one keypress away
  without being given up front.
- **A cloze turn is one model call and grades locally.** Session cost drops from
  a flat *2n* to `n_cloze + 2·n_production`, weighted cheap because everything
  starts at cloze — and (4) disappears entirely for cloze turns, since exact
  comparison has no variance at all.
- **Interleave within a session, keep the separate row for now.** Interleaving
  beats blocking for grammar on delayed tests, so the session queue shuffles.
  Folding patterns into the *vocab* queue stays open: the measured comparison is
  grammar points against each other, not grammar against vocabulary. ⚠️ **Do not
  judge this by feel** — blocked practice reliably *feels* smoother during a
  session and is worse a week later, so "that flowed better" is evidence of
  nothing here.
- **Patterns get a management surface: a mode toggle on Cards.** _User's call._
  Not a fifth nav entry for ten items, and not the deck-filter row either —
  `filterCardsByDeck` returns `Flashcard[]` and a pattern is not one. A
  Cards/Patterns switch above the existing list: pattern, gloss, kind, next
  practice, and edit / archive / delete. Answers (1).
- **Patterns can be added by hand.** _User's call._ Pattern, optional gloss, and
  **the kind, chosen by the user from two labelled options**. No model call, so
  no new endpoint — and making the learner answer "is this a rule that always
  applies, or a choice about how to say something?" is the most direct statement
  the app can make about what counts, which is (2). Far cheaper than the Learn
  arm's 12 prompt templates, which is now weaker rather than merely later.
- **The curated grammar pack stays closed, and is now better argued.** It was
  rejected on the aesthetic ground that adaptivity should be emergent.
  Pienemann's teachability hypothesis supplies a mechanism: instruction changes
  the *rate* of acquisition but not the *route*, so an ordered syllabus is
  fighting a constraint rather than merely being un-Amgi. Errors-as-syllabus is
  well-founded — the patterns you get wrong are by construction the ones at your
  developmental edge.
- **The learner override is in, and the ease ratchet closes with it.** _User's
  call, 2026-08-08 — this was the last of the three opens._ On any verdict below
  `good`, one control re-grades as if the answer had been right. Cloze is what
  made it obviously correct rather than merely tempting: the expected answer sits
  on screen beside what the learner typed, so they are not appealing a
  judgement, they are reading two strings and reporting that `alternates` was
  short. It re-grades correctness, not effort — the hint clamp still applies, so
  at tier 2 it does nothing, which is right.
  Separately, **a hint-free exact cloze match now emits `easy`**, which is what
  actually un-sticks the ratchet. That reasoning is cloze-specific: a string
  comparison is not a judgement that can be wrong, so a clean hit is exactly the
  signal `easy` is for. Production stays capped at `good`. `sm2.ts` is still
  untouched — `getNextReviewData` already takes all four responses.
  **Two opens remain:** folding into the vocab queue (above), and an unprompted
  tier-1 hint after an idle, which now applies to production turns only.
- **What building it corrected** (2026-08-08, same day): only one thing, and it
  was found by running the real model rather than by reasoning. Asked for a
  French elision cloze, Gemini returns `d’` with a **curly** apostrophe — which
  no learner types, so the single rule that prompted this entire redesign would
  have been ungradeable on every attempt. Cloze comparison now folds
  typographic apostrophes, quotes and dashes to their ASCII forms. Worth
  remembering as a class of bug rather than an instance: the cloze grader is
  exact by design, so *every* character the model and the keyboard disagree
  about is a false negative.
  Classification was verified live at the same time and needed no change —
  `-는데` came back `choice` off a naturalness finding, and both French elisions
  came back `form` off grammar findings.
- **Recorded, not solved:** the meta-analyses behind all of this largely
  measured *explicit* knowledge — being good at grammar exercises. The claim
  that any of it transfers to writing Korean rests on the production rung and on
  the sequence argument, not on the effect sizes. Amgi's own acquisition signal
  (a pattern that stops appearing as a finding in your writing) remains the best
  available answer and is still not v1.

## Grammar is patterns you exercise, not cards you flip (2026-08-03)

Designed before any code. The *argument* is in [vision.md](../vision.md) and is the
part to read first — vocabulary is a lookup table, grammar is a function, and a
card runs the function on zero arguments. The type is in
[data-model.md](../data-model.md), the staging in [backlog.md](../backlog.md).

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
  configured levelling [vision.md](../vision.md) argues against twice. Errors are the
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

### What building (1a) corrected (2026-08-08)

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

## Writing review: design calls (2026-07-31 → 2026-08-01)

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
  [vision.md](../vision.md) fixes. One-off typos still get no card.
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

## `GrammarPattern` — designed 2026-08-03, web built 2026-08-08

_Built as designed, in `packages/core/src/grammar.ts`, with three changes worth
knowing before reading the shape below as authoritative. All three are recorded
in the Decisions entry in [status.md](../status.md); the third is a live blocker._

1. **`PatternExercise` gained `targetForms`** — the surface fragments that count
   as having reached for the pattern. Without it a learner who sidesteps the
   pattern and writes correct prose scores `good`, which schedules out the exact
   thing they avoided. Generation supplies them; grading stays `/api/writing`
   unchanged and the check stays local.
2. **The writing-finding door is not gated on `kind === 'grammar'`** — measured,
   the most valuable patterns come back as `naturalness` findings.
3. **The `patterns` collection needs a Firestore security rule** before any of
   this works. There is no rules file in the repo, so this is a console step.
   _Added by the user 2026-08-08._

**⚠️ The shape below is superseded in one respect by the redesign of 2026-08-08**
(trial → [vision.md](../vision.md) → design calls in [status.md](../status.md)):
`GrammarPattern` gains a `kind`, and `PatternExercise` becomes a union of two
exercise shapes rather than one. The revision is at the end of this section; the
original shape is kept because everything else in it still stands and the
reasoning attached to each field is still the reasoning.


A grammar pattern is **not a card**, and the reasoning is in
[vision.md](../vision.md): a card is a lookup-table row, and a grammar point is a
function from stem + context + intended meaning to a form. It is a separate type
with a separate review verb — you produce a sentence, you do not flip it.

**This does not reintroduce the discriminated union**, and the distinction
matters enough to state beside the warning above. That union was *one card
subtype per language* — it scaled with the language axis, which is exactly the
axis the registry replaced. A pattern is not a language variant of a card; it is
a different kind of object, the way `PackEntry` and `WritingFinding` already
are, and it is language-generic in the same way everything else here is. The
warning stands unchanged: don't add `KoreanGrammarPattern` either.

Proposed shape, for a new `packages/core/src/grammar.ts` (introduced the way
`writing.ts` was — pure types, a tolerant parser, and the shared fetches both
apps call; **two of them, not one**, for the reason under "A review is two model
calls" below):

```ts
export interface GrammarPattern {
  id?: string;
  uid: string;
  studyLanguage: StudyLanguage;
  /** Citation form — `-다가`, `passé composé`. In the study language. */
  pattern: string;
  /**
   * What it does, in a few words. Same rule as `PackBack` — which means
   * *optional on both sides*, because that type is partial on purpose. Its
   * reason carries over unchanged: a pattern's gloss is generated at capture
   * time in the learner's native language, so requiring both would mean
   * generating a Korean gloss for an English native that no reader could ever
   * see. Don't tighten these to required.
   */
  gloss: { English?: string; Korean?: string };
  /** One or two sentences on when to reach for it, in the native language. */
  note?: string;
  /** Provenance only, never identity — mirrors `packId`'s rule. */
  source?: 'writing' | 'lookup';
  createdAt: Date;
  archived?: boolean;
  /** One tracking, not two — see below. */
  production?: ReviewTracking;
}
```

**One `ReviewTracking`, not two.** A card carries `frontToBack` and
`backToFront` because both are real skills. A pattern has one direction that
matters — meaning → form. Recognising `-다가` in running text is comprehension
of the *sentence*, and it comes free from reading; there is no second rung to
schedule. Don't build a `backToFront` for patterns.

**Exercises are not stored; patterns are.** The sentence you were asked to write
is generated per review, the way depth and examples are generated on demand.
Same rule as writing review's "submissions are ephemeral" — the pattern is the
durable artifact. The generated exercise is a transient object, not a document:
the situation in the native language, plus the two hint tiers, which ride along
in the same response so asking for a hint costs no round trip and reveals
nothing until asked.

**A review is two model calls, not one**, and that is a correction to the line
above about `writing.ts`'s single shared fetch. Generating the situation and
grading the answer are separate round trips, and they cannot be collapsed: the
exercise has to exist before the learner can respond to it. Grading reuses
`/api/writing` unchanged; only generation is new. Consequences to design for
rather than discover:

- **A session of _n_ patterns is 2 _n_ model calls**, where a vocab session of
  any length is zero. That is the running cost of this feature and it should be
  stated in the same breath as the design, not found on a bill.
- **Generation can be batched, grading cannot.** One call can produce the
  situations for the whole due set up front, which is the obvious optimisation
  if per-turn latency disappoints. Not v1 — it trades a slower session start
  for faster turns, and which one the learner feels is a question for real
  sessions, not for this document.
- **Grading failing mid-session is the case with no obvious answer.** Offline is
  handled (the row is disabled), but a 500 on turn 3 of 6 is not offline. The
  learner has already spent 40 seconds producing a sentence, so losing it is the
  one outcome to rule out. v1: keep the text on screen, offer retry, and let the
  turn be skipped without a verdict — a skipped turn writes no `ReviewTracking`
  at all, leaving the pattern due, which is the honest result. Never write a
  verdict the model did not produce.

**One `patterns` collection, not one per language.** Cards shard per language
because there are hundreds of them and the collection name routes the query.
Patterns will number in the tens, so six near-empty collections buy nothing. One
collection carrying `studyLanguage` on the document — which is already what
makes a document self-describing here — is simpler. ~~Cost, named so it isn't a
surprise: a composite index on `uid + studyLanguage`~~ — **no index was needed.**
Two equality filters with no `orderBy` are served by merging single-field
indexes, and `archived` and the sort are handled in JS because this is tens of
documents. The console step this collection *does* need is a security rule.

### Revision, 2026-08-08: stage picks the format, kind picks the ceiling

_This replaces an earlier same-day revision that had `kind` selecting between
two exercise formats. The research (`docs/grammar-research.md`) moved the
primary axis: the format follows the learner's **stage** with a pattern, and
`kind` only decides whether that pattern ever reaches the top rung. The earlier
version's bare transformation drill is gone entirely — mechanical drills are the
one practice type the literature is close to unanimous against._

Two exercise formats, not three, and the pattern carries one new field.

```ts
/**
 * Whether a pattern ever graduates from cloze to free production.
 *
 * - `choice` — a meaning maps to a form and the skill is picking it (`-다가`,
 *   `-는데`, passé composé). Free production has something to test, so these
 *   graduate.
 * - `form` — a rule that applies to something the learner was going to write
 *   anyway (`de` → `d'`, 을/를 by batchim). There is no meaning being chosen, so
 *   free production adds nothing and these stay at cloze permanently.
 *
 * Not a third `construction` kind, however tempting: `il faut que` + subjunctive
 * looks like one, but it graduates like any other choice pattern, and an axis
 * whose members behave identically is not an axis. The warning at the top of
 * this file about speculative subtypes applies to this type too.
 */
export type PatternKind = 'choice' | 'form';
```

`GrammarPattern` gains `kind: PatternKind`, and `source` gains `'manual'`.

**The kind describes the learner's error, not the pattern.** This is the part
most easily got wrong, and getting it wrong rebuilds the taxonomy the vision
rejects. 은/는 has both aspects: choosing topic over subject, and picking the
right allomorph by batchim. Asking "which kind of point is 은/는" has no answer.
Asking "which of the two did *this writer* just get wrong" always does, and the
writing finding already knows — a learner who wrote `de eau` failed the form
rule, and one who wrote something correct but unnatural failed the choice. So
the classifier reads the finding, not a grammar reference, and the same pattern
can legitimately be saved as `form` by one learner and `choice` by another.

#### Stage is derived, never stored

```ts
/** Reviews at cloze before a choice pattern is offered free production. */
export const CLOZE_REPETITIONS = 2;

export type ExerciseFormat = 'cloze' | 'production';

export function exerciseFormat(
  pattern: Pick<GrammarPattern, 'kind' | 'production'>,
): ExerciseFormat {
  if (pattern.kind === 'form') return 'cloze';
  return (pattern.production?.repetitions ?? 0) >= CLOZE_REPETITIONS
    ? 'production'
    : 'cloze';
}
```

Derived rather than stored, and it is worth being explicit about what that buys,
because it is more than tidiness:

- **No field, no migration, no way for stage and schedule to disagree.**
- **A lapse demotes you for free.** `getNextReviewData` resets `repetitions` to
  0 on `again` (`sm2.ts:68`), so failing a production turn drops the pattern
  back to cloze on its own — which is exactly what controlled → free prescribes
  and would otherwise have been a rule someone had to remember to write.
- **`CLOZE_REPETITIONS = 2` is not arbitrary.** Read at the top of a turn, a
  stored `repetitions` of 2 means the *next* success is the first that stops
  setting a fixed interval (1 day, then 6) and starts multiplying by ease
  (`sm2.ts:71-75`). So production begins exactly where the scheduler itself
  starts treating the item as known — two clean cloze passes, then the rung
  changes. Borrowing that boundary rather than inventing a second one keeps one
  definition of "learned" in the codebase.
- **Consequence, recorded not solved:** `hard` is quality 3, so it *increments*
  repetitions and does not demote. A shaky production turn keeps you at
  production. That reads right — `hard` means the skill is there and wobbling,
  not that controlled practice is needed again — but it is a reading, and if
  demotion turns out to want a wider trigger this is the line to change.

#### The two exercises

```ts
interface ClozeExercise {
  format: 'cloze';
  /** One sentence with a gap where the pattern goes. */
  sentence: string;
  /**
   * The whole sentence in the learner's native language — **always shown, not a
   * hint.**
   *
   * This is what makes the cloze *meaningful* practice rather than mechanical,
   * and that distinction is the one the literature is sharpest about: a gap
   * filled without understanding the sentence is the drill type nothing
   * supports. It also mirrors what a production turn already does — there the
   * meaning is handed over as a situation and the learner supplies the form.
   * A cloze gives the meaning *and* most of the sentence, which is precisely
   * what "one rung more scaffolded" means.
   *
   * So yes, it gives away the relation being expressed. That was never the part
   * being tested.
   */
  meaning: string;
  /**
   * The base form to put into the gap, when the gap needs one — `가다` for a
   * `-다가` cloze, `de` for an elision cloze. Absent where the slot is bare, as
   * for a particle choice, and there the sentence and the hint carry it alone.
   */
  input?: string;
  /** What the gap should become, plus anything else acceptable. */
  expected: string;
  alternates: string[];
}

interface ProductionExercise {
  format: 'production';
  /** The meaning to express, in the native language. Never names the pattern. */
  situation: string;
  hintShape: string;
  hintName: string;
  targetForms: string[];
}

export type PatternExercise = ClozeExercise | ProductionExercise;
```

Four consequences to design for rather than discover:

- **The cloze hints cost nothing to generate, because they are already stored.**
  Tier 1 is the pattern's `gloss` — the meaning of the point being asked for,
  which is exactly what Bunpro's first hint tier is — and tier 2 is
  `pattern.pattern`, the citation form. Neither comes from the model, so
  `ClozeExercise` carries no hint fields. The gloss being optional on both sides
  is handled the way it already is: tier 1 falls back to tier 2.
- **A cloze turn is one model call; a production turn is two.** Generation
  supplies `expected` and `alternates`, so cloze grading is a local comparison
  with no `/api/writing` round trip and no grading variance at all. Session cost
  drops from a flat *2n* to `n_cloze + 2·n_production`, weighted toward the
  cheap end because every pattern starts at cloze.
- **The pattern is still never named during a production turn** — that rule is
  unchanged and is the reason `ProductionExercise` keeps its two generated hint
  tiers. During a *cloze* the pattern is not named either; the sentence is what
  disambiguates, with the gloss one keypress away.
- **The false-negative risk shrinks but does not vanish.** `alternates` plays
  the role `targetForms` plays for production: an acceptable answer the
  generator failed to list is scored wrong. A gap with a supplied base form has
  far fewer plausible fillers than a free sentence, so the exposure is much
  smaller — but the honest mitigation is still the learner override, and cloze
  makes that override cheap and obviously correct to offer, because the expected
  answer is on screen and the learner can see whether theirs was also right.

#### Grading, verdicts, and the override — decided 2026-08-08

Cloze grades locally: an exact match against `expected` or one of `alternates`,
then the hint clamp. Production grading is unchanged from (1a): `/api/writing`,
`targetForms` for the reach check, findings for the form check.

**The learner may override a wrong verdict.** This was the last of the three
open questions and it closes here. On any verdict below `good`, one control —
"my answer was right too" — re-grades as if the answer had been correct.

Why it closes now rather than staying open: cloze makes it *cheap and obviously
correct*. The expected answer is on screen next to what the learner typed, so
they are not appealing a judgement, they are reading two strings and telling us
the generator's `alternates` list was short. That is a question they can answer
better than the model can, which is exactly when an override is legitimate.

- **The override changes the correctness judgement, not the effort judgement.**
  It re-grades to `good` and then applies the same hint clamp, so at tier 1 it
  yields `hard` and at tier 2 it yields `again` — i.e. it does nothing at tier
  2, where the answer had already been shown. That is the honest result, not a
  gap.
- **It never writes anything the learner did not assert.** A skipped turn and a
  failed grading still write no `ReviewTracking` at all.

**`easy` is emitted, and the ease ratchet closes.** A cloze answered correctly
with **no hints taken** grades `easy`, not `good`. The reasoning is specific to
cloze and does not extend to production: an exact string match is not a
judgement that could be wrong, so a clean hit is precisely the signal `easy`
exists for. Production stays capped at `good`, because there the verdict is
derived from a model's reading and a false `easy` inflates the interval on the
strength of a guess.

That makes `easy` reachable on exactly one path, and it is enough to un-stick
the ratchet: ease can now climb for a pattern the learner reliably knows, where
before it could only fall. The trivial-rule case this most helps is the one that
prompted the redesign — `de` → `d'` climbs out to long intervals fast, which is
the scheduler answering "does this really need practising" on its own.

`PatternVerdict` therefore becomes `'again' | 'hard' | 'good' | 'easy'`, which
is `getNextReviewData`'s existing signature — no scheduler change, and `sm2.ts`
stays untouched in fact as well as in file.
