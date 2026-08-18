# Project Status

Session orientation: what's live, what's broken, what's decided. Shipped history
sits at the bottom as reference — the reasoning worth keeping is in Decisions.

_Reconciled against `main` @ `b9604d9`, 2026-08-12, after 1.3.0 went live.
`npm test` 313/313, measured._

## Now

- **1.3.0 (build 11) is live in TestFlight and approved for external testing**
  (2026-08-12). **This is the first external approval the project has had** —
  1.2.0 was submitted and accepted but never cleared Beta App Review, so until
  now every build only ever reached internal testers. External testers can be
  invited without another review as long as the version doesn't change.
- **The six queued changes are in the hands of testers**, which is the first time
  any of them counts as shipped: with no OTA, a merged PR reaches nobody until a
  binary carries it. See Builds for contents.
- ⚠️ **Nothing in 1.3.0 has been checked on the binary yet.** Three renders have
  never been seen on a device at all (#81's packs list, #87's correction row,
  #88's badge), and the native paths listed under Builds have never been verified
  on *any* build. 1.3.0's What to Test asks testers for both by name — the
  cheapest path is now to read what comes back rather than to test it all by
  hand.
- **Mobile merges are unblocked.** The freeze held only until submission; the
  binary and the listing copy now describe the same app, and the next mobile
  change simply waits for the build after this one.
- **The six changes this build carries.** The `expo config --type introspect`
  pass was run when `expo-clipboard` landed and came back clean; everything
  merged after it is JS-only and doesn't disturb it.
  - PR #80 (08-04): the `/cards` loosening, the filter sheet, the first
    skeletons. Checked on web and **on a device in Expo Go** before merge.
  - PR #81 (08-08): the two military packs reach mobile through the shared
    registry, and the packs list drops the per-pack description. ⚠️ The
    description change was **typechecked but never seen rendered** — the list
    went from one deck per language to three, and the row spacing under a title
    with nothing beneath it is unverified.
  - PR #84 (08-09): grammar patterns, the whole feature on both platforms.
    Smoke-tested in Expo Go against the deployed API on 08-10 and clean — the
    only one of the three verified on a device *after* merge.
  - PR #86 (08-10): archive and delete drop the card from the review queue, not
    the index. Mobile's review screen had the same bug and was fixed with it.
  - PR #87 (08-10): spellcheck on lookup. Mobile's Learn screen gains the
    "showing results for…" row and its override. ⚠️ Verified on web; the mobile
    render of that row is **typechecked but never seen**.
  - PR #88 (08-11): part of speech on cards, both platforms. JS-only. ⚠️ Same
    caveat — the mobile badge is typechecked, never seen rendered.
- **No code is in flight.** High is empty in [backlog.md](backlog.md) — the next
  thing to build comes from Medium.

TestFlight context that isn't in the repo:

- Tegi's account is enrolled as **Individual**, which blocks non-account-holders
  from generating certs — worked around with an App Store Connect API Key.
- Bundle ID `com.tegi.amgi` is **disposable**. A public launch under the user's
  own account is a fresh relaunch, not a migration: Apple's App Transfer doesn't
  cover TestFlight-only apps. External approval doesn't change this — it is
  approval of a beta on someone else's account, not a foothold in the store.
- ⚠️ Console state (public link live? testers actually invited?) is never
  knowable from the repo. Confirm before assuming. External *approval* is
  recorded above because it was reported directly; whether anyone has been
  invited under it is not.

## Builds

No OTA, so every mobile change reaches users through one of these.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 1.3.0 | 11 | 2026-08-11 | `86c2c5a` on `release/1.3.0` (version bump) — **first build approved for external testing**, 08-12 |
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

**1.3.0 contents** — the six items above: `/cards` loosening + filter sheet +
skeletons (#80), the two military packs (#81), grammar patterns (#84), archive
and delete drop from the queue (#86), spellcheck on lookup (#87), part of speech
(#88). **Native-module build** — `expo-clipboard`, for the copy button on the
writing rewrite (`CopyButton.tsx`, the only caller).

⚠️ **Three of the six were typechecked but never seen rendered on a device** —
the packs list without per-pack descriptions (#81), the "showing results for…"
row (#87) and the part-of-speech badge (#88). All three are cosmetic-risk rather
than logic-risk (row spacing, a row that may not fit, a badge that may wrap), so
the build being live is now the cheapest way to find out.

**1.2.0 contents** — nine merged items, all JS-only (no native module, so no
`expo config --type introspect` pass): pack unification (#71), first run (#73),
per-page help (#74), tab-focus reload (#75), writing review (#69), card backs
follow native language (#67), direction choice on Review (#65), second Learn tab
tap clears search (#66), TOPIK 고급 (#68).

⚠️ **Never verified on a real binary**, on any build so far — the logic is
tested, the native bindings are not: pronunciation audio, CSV/Anki export,
sharing, offline review across a force-kill and reconnect, the review reminder
firing *and* disappearing once you review, account deletion against the
production `EXPO_PUBLIC_API_BASE_URL`, and now the copy button on the writing
rewrite (`expo-clipboard`, new in 1.3.0). 1.3.0's What to Test asks testers for
these by name — the first listing that does. **This is the caveat to retire
first**: it has outlived every release so far, and 1.3.0 is the first build in
enough hands to close it without a dedicated session.

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

### Grammar and writing are removed — the routes stay behind (2026-08-18)

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

**Collateral simplification:** `ReviewCollection.kind` is gone. It existed only
because a patterns row and your own cards were both `id: null`; with patterns
removed `id` identifies a row again, and `collectionKey` is now `id ?? ''`.
`buildReviewCollections` lost its `patterns` parameter.

**Test count: 313 → 222.** Three test files deleted (`grammar.test.ts`,
`writing-review.test.ts`, `diff.test.ts`) plus four pattern cases out of
`review.test.ts`. Measured, both apps typecheck, `next build` clean with both
retained routes in the manifest.

### Part of speech is stored as a code and rendered in the reader's language (2026-08-11)

**This reverses the backlog item's own decision**, which had the badge reading
English on every card — `noun`, `verb` — reasoning that `formality` already
renders `Standard` in English beside it, so an English part of speech needed no
i18n keys and no closed vocabulary to coerce the model onto. The user asked for
the native language instead.

The reversal was cheap because the alternative it rejected was the wrong one.
"Localized" did not mean *generating* a label per language, which is what the
original call was pricing — it meant storing a **code** and looking the label up
at render. So the closed vocabulary the item wanted to avoid turned out to be
the thing that made this easy: 15 codes in `PART_OF_SPEECH_CODES`, one
`partOfSpeechLabel(nativeLanguage, card)`, and switching native language
re-labels every existing card with no migration — the back-slot problem met
again and solved outright rather than duplicated.

What the item got right and is unchanged: the field sits beside `formality` and
`gender` on `TermCore`, the work is mostly the twelve prompt templates, and
scope is new lookups only — no backfill of old or pack cards. Two corrections to
its touch-point list: `ReviewDetailsPanel` deliberately gets **no** badge (the
review card above it now shows one on the same screen), and the word of the day
also carries the field, which the item didn't mention.

The shape, the language-generic code list, why the Japanese i/na split is out,
and the one-day lag on the word of the day are all in
[data-model.md](data-model.md).

### The spellcheck correction rides the lookup, and is written to refuse (2026-08-10)

The backlog item left one question open: where the correction comes from.
**It rides `/api/explain`**, as a `corrected` field on the no-context prompts —
one round trip, and the model that already knows this language pair does the
judging. A separate check would have been a second call *before* the first, and
a second prompt to keep in step with twelve existing ones. This is the
reuse-the-endpoint rule applied to a route that already had the context.

Three things fell out of that choice and are worth keeping:

- **The prompts echo back the term they were given** (`"term": "${term}"` is
  interpolated into all twelve), so a corrected answer arrives describing one
  word and labelled with another. `applySpellingCorrection` moves the corrected
  spelling onto `term` and strips `corrected` — which is a fact about the
  lookup, not the term, and would otherwise be spread onto a saved card. Both
  clients call it; neither may skip it.
- **The override is a request, not a filter.** "Search instead for what you
  typed" sends `exact: true`, which drops the rule from the prompt entirely.
  Asked again without it, the model explains what was typed. Filtering the
  answer client-side would have left the model still deciding.
- **Only the no-context prompts carry the rule.** A context lookup is a
  *re*-lookup of a term this route already returned — disambiguation, or "not
  what you meant?" — so the spelling question was settled a call ago. Both Learn
  screens carry the correction across those calls themselves, or the banner
  would vanish on disambiguating and take the way back with it.

The rule is written to **refuse**, because a learner typing a word they don't
know well is exactly who a correction overrules wrongly: rare, archaic,
dialectal, slang, proper-noun and validly inflected spellings are all named as
*not* misspellings, and so is any case where two corrections are equally likely.

⚠️ **It names slips per writing system, not per letter.** The first cut said
"transposed, doubled, dropped or wrong letter" and silently missed the commonest
Korean error: 마지하다 for 맞이하다 — the word spelled the way it *sounds* once
받침 and 연음 apply, with no letter out of place. The model answered "to meet"
with no correction offered, which is the exact failure the item existed to fix.
Anything added here later should be probed against a Hangul phonetic misspelling
before it is believed. The refusal set that must stay clean: `lagom`,
`dépaysement`, `積ん読`, `눈치`, `撒嬌`, `rizz`, `Gyeongju`, `serendipity`,
`맞이했습니다`, `먹었어요`, `하염없다`, `食べられなかった`, `s'agissait`.

Bulk import passes `exact` too. It has nowhere to show a correction and saves
what comes back, so a silent one would be a card the learner never agreed to.

### A word you reached for and didn't have is the best card a passage yields (2026-08-08)

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

### Grammar patterns are closed — and one constraint outlives the item (2026-08-10)

The mobile pass came back clean, so the last grammar-patterns item left
[backlog.md](backlog.md) and the feature is done. Everything the item still
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

### Grammar patterns stay their own row, and the tail is cancelled (2026-08-09)

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

### Grammar patterns: cloze first, production when it sticks (2026-08-08)

Written after (1a) was built, tried once, did not feel good, and the research
was then read properly. **Read `docs/grammar-research.md` before changing any of
this** — the design is derived from it rather than merely informed by it. The
argument is in [vision.md](vision.md), the type in
[data-model.md](data-model.md).

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

**Writing, grammar & onboarding**
- **Grammar patterns, web + mobile** (#84, 08-09) — the first thing Amgi teaches
  that isn't a word. A pattern is practised, not flipped: a cloze until it
  sticks, then free production, with the stage derived from `repetitions` so a
  lapse demotes for free. Ships with its own Review row (disabled offline), a
  Cards/Patterns management toggle, manual add, two hint tiers off stored fields,
  a learner override, `easy` on a hint-free exact cloze, within-session
  interleaving, and the writing panel's pattern offer alongside gap cards.
  `/api/grammar/exercise` generates; grading is local for cloze and reuses
  `/api/writing` for production. Design and its three corrections are in
  Decisions above — read those and `docs/grammar-research.md` before changing
  any of it. Mobile added `expo-clipboard`, which makes the next build a
  native-module build.
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
- **Archive and delete drop the card, not the index** (#86, 08-10) — the queue
  holds one entry per due *direction*, so removing by index left the card queued
  the other way round: archived cards came back, deleted ones came back pointing
  at a document that no longer existed. `removeCardFromQueue` filters by
  `card.id` and slides the index back past entries removed ahead of it, so the
  session lands on the card that followed. Mobile's review screen archives too
  and had the same bug — the backlog's note that it has no manage panel was out
  of date. Both platforms now also drop the card from local card state, or the
  due counts keep counting it. 5 tests.
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
- **Part of speech on cards, both platforms** (#88, 08-11) — a card said what a
  word means and how formal it is, but not what it *is*. `partOfSpeech` on
  `TermCore`, stored as a **code** from a closed language-generic list of 15 and
  rendered through `partOfSpeechLabel(nativeLanguage, card)`, so switching native
  language re-labels every existing card with no migration. It describes the
  study-language word, not what was typed. Twelve prompt templates gained a rule
  line each; both generating routes normalize the answer and drop anything
  unlisted. No backfill, and the word of the day lags a day because its document
  is written once per date. The reversal of the item's own English-only decision
  is in Decisions above.
- **Spellcheck on lookup, both platforms** (#87, 08-10) — a misspelled term used
  to go straight to `/api/explain`, which explained the non-word confidently;
  save it and the typo was a card. The correction now rides the same call as a
  `corrected` field, and both Learn screens show "Showing results for X" with
  "Search instead for *what you typed*" beside it. `applySpellingCorrection`
  relabels the result and strips the field before anything saves it; `exact`
  suppresses the rule for the override and for bulk import. The design calls,
  and the refusal set to re-probe before touching the prompt, are in Decisions.
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
