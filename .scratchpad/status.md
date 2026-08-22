# Project Status

Session orientation: what's live, what's broken, what's decided.

**Shipped history is not recorded here** — git and GitHub already track it, and a
second copy only goes stale. What belongs in this file is what those two can't
show: the reasoning behind closed calls (Decisions), the console and binary state
that lives outside the repo (Builds, TestFlight), and what is currently
unverified.

_Reconciled against `main` @ `bc8cb97`, 2026-08-21. `npm test` 246/246, measured._

## Now

- **1.3.0 (build 11) is live in TestFlight and approved for external testing**
  (2026-08-12) — the first external approval the project has had. External
  testers can be invited without another review as long as the version doesn't
  change; the next version bump queues for Beta App Review again, so batching
  changes into a build beats cutting one per feature.
- ⚠️ **Nothing in 1.3.0 has been checked on the binary yet**, and the native
  paths under Builds have never been verified on *any* build. Three renders have
  additionally never been seen on a device at all: the packs list without
  per-pack descriptions, the "showing results for…" row, and the part-of-speech
  badge. 1.3.0's What to Test asks testers for both sets by name — reading what
  comes back is cheaper than testing it all by hand.
- **Mobile merges are unblocked.** The freeze held only until submission; the
  next mobile change waits for the build after this one. Anything merged since
  1.3.0 is JS-only, so it rides along rather than earning a build of its own.
- **The progress dashboard is on both platforms** (2026-08-20) but only in users'
  hands on web, since mobile ships by build. Daily rollups are written on every
  rating and every card save. The Firestore security rule for
  `users/{uid}/progress/{day}` is live in the console — it was the one blocker,
  since without it every write fails `permission-denied` *silently* by design.
- ⚠️ **Progress history began 2026-08-20 and cannot be backfilled.** New cards
  per day could be reconstructed from `createdAt`; review history cannot be
  reconstructed from anything. So the calendar is near-empty for weeks by
  construction — expected, not a bug, and the empty state says so.
- **Spanish is live on web** (2026-08-22). Registry entry, prompt branch, i18n
  and example terms merged; lookup verified against the live API in both
  directions. `cards_spanish`'s security rule and **both** composite indexes are
  in the console, and `/cards` and `/review` load clean against them. Mobile has
  the code but reaches users only through a build, and nothing has been cut since
  1.3.0 — see Builds.
  The rule uses the explicit `read, update, delete` + `create` form that `cards`
  and `cards_chinese_traditional` use, not the `read, write` form the middle four
  collections drifted into. Both work; only one says what it means. Why, and why
  a new collection needs two indexes rather than one, are in
  [lessons.md](lessons.md).
- ⚠️ **Kikuyu is code-complete and blocked on the same two console steps Spanish
  was** (2026-08-22). Registry entry, prompt branch, i18n and example terms are
  merged, and every route was exercised against the live API — lookup both
  directions, Korean back, examples, depth, word of the day. But `cards_kikuyu`
  has **no security rule and neither composite index**, so until they exist in
  the console every save fails `permission-denied` and then every review query
  fails on the missing index. Mirror `cards_spanish`, and create *both* indexes
  up front — see [lessons.md](lessons.md) for why the console's link only builds
  one.
- **Kikuyu has no pronunciation, and that is the finished state, not a gap.**
  It is the first registry entry with no `ttsLanguageCode`, so it is also the
  first time that field's optionality has ever been exercised: both apps hide
  the pronounce button and `/api/pronounce` returns a clean 400. Verified on
  both. If a future language also lands without audio, this is the path it
  takes.
- **Grammar and writing were removed from the app** (2026-08-18), but
  `/api/writing` and `/api/grammar/exercise` stay deployed because 1.3.0's binary
  still calls them. See Decisions for the one condition that lets them go.

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

What a build carries is derivable from its commit, so it isn't listed here. The
one fact that isn't: **1.3.0 is a native-module build** (`expo-clipboard`), and
its `expo config --type introspect` pass came back clean. 1.2.0 and everything
merged since 1.3.0 are JS-only, so no introspect pass is owed for them.

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
- **20 lint warnings, 0 errors** (measured 2026-08-22) — 13 React Compiler, the
  rest accumulated since. Two were added by the subscribe change: the
  `set-state-in-effect` rule fires on the `if (!user) { setX([]); return; }`
  guard that every subscription effect opens with. Same class the codebase
  already carries in `useOnlineStatus` and `useCardEnrichment`, and React's own
  docs name subscribing-in-an-effect as the intended use. Scoped under
  Housekeeping in [backlog.md](backlog.md).

## Decisions

Closed calls, kept with their reasoning — a decision whose reasoning is lost gets
reopened by the next person to notice the symptom. Newest first.

### Mobile's card surfaces subscribe too — the gate was opened by a test, not a build (2026-08-22)

Step (2), the same day as step (1). The gate was "step (1) has been on a build
for a release"; what actually opened it was the user reviewing on the laptop and
watching the phone's streak move in Expo Go. **That is weaker evidence than the
gate asked for, and it was taken deliberately** — it settles the question the
gate existed to settle (does `onSnapshot` deliver on React Native, through a
memory-only cache, in this app) and settles nothing about collections. What
follows is what had to be handled *because* the test could not cover it.

**An empty snapshot from the cache is dropped, not delivered.** This is the
listener form of the trap `fetchUserFlashcardsFromServer` was written to dodge:
the cache is memory-only, so before the server answers it holds nothing, and
Firestore reports nothing as an ordinary empty result rather than an error.
Delivered as-is it is indistinguishable from "this account has no cards" — it
would blank the list on every cold start and overwrite the offline snapshot with
nothing. **The streak listener never met this**, because a missing document is
simply ignored there; a collection cannot do that, since empty is a legitimate
answer. So the clean laptop-to-phone test could never have caught it.

**Storing the snapshot is on a slower clock than showing it.** Every rating in a
session comes back as its own snapshot, so writing the offline copy on each
would re-serialise the whole collection once per card, where the fetch-per-focus
it replaced wrote once a visit. It is debounced 5s and flushed when the language
or account changes. Coalescing is safe here in a way it would not be for a
rating: this is a *cache*, unsent ratings live in their own queue and are
replayed over whatever is stored, so a dropped write costs a slightly older
starting point on the next cold offline launch and nothing else. The debounce
lives in the effect, not the module — module-scope state does not survive Fast
Refresh, which is the bug that killed this screen's first freshness attempt.

**Review needed no mid-session guard, and that is a property of the screen.**
The focus reload had to be suppressed mid-session because it reset the pick and
would rebuild the queue under someone eight cards into thirty. A listener does
not, because **`cards` is not what a session runs on**: the queue is built from
it on the Start tap and owns its copy from then on. A snapshot landing mid-review
moves the picker's due counts and leaves the cards in front of the learner alone.
`sessionRunningRef` and `reloadToken` are gone with the reload they protected.

**The one thing a listener does not give back is a deadline.** Offline with a
cold cache it says nothing at all — no data, no error, and the empty cached
snapshot is dropped by the guard above — so the screen would spin forever on a
language this device has never loaded. `withTimeout`'s 10s is now applied by the
load effect itself. This is the newest machinery in the change and the first
thing to check on a device.

Also: `sessionRatings` is cleared per language change and *not* per snapshot.
Every snapshot has the unsent queue replayed over it, so keeping them loses
nothing, and `applyPendingReviews` assigns rather than increments — but clearing
them on a snapshot that raced a rating would drag an answered card back into the
counts. The `onChanged`/`loadCards` calls that told screens to go and look again
are gone, as are `fetchAllUserFlashcards` and `fetchUserFlashcards`, which have
no callers left. `fetchUserFlashcardsFromServer` stays: warming a language nobody
is looking at has no listener to ride on.

**Progress is deliberately not subscribed**, on either platform. It is a
historical rollup whose only moving row is today's, it re-reads on focus, and the
review tab is one tap away. Subscribing it would add a listener for a number that
cannot change while you are looking at it.

### Mobile subscribes for display only, and a ref is what serialises its writes (2026-08-22)

Step (1) of the mobile half, done the day web shipped. The scope was set in
advance — subscribe to `users/{uid}` for **display**, leave the offline write
path alone — and it held. What is worth keeping is *how* a listener is prevented
from quietly becoming a second writer, since the obvious wiring does become one.

**Merge, never assign.** The snapshot handler runs `mergeStreakState` against
what the device holds, which is the same reconcile the launch path already ran.
Assigning the server's copy would discard a session reviewed underground the
instant a snapshot landed. This is the whole reason the listener is safe next to
an offline-first write path rather than in competition with it.

**The AsyncStorage cache is refreshed only when nothing is unsent.** While
`dirty`, that copy belongs to `recordReview` and its retry, and a listener
writing over it would race `markStreakSynced`. Clean, the write is the one the
next launch would have done anyway — worth doing early because `refreshReminders`
plans from the cached `lastReviewDate`, so a laptop review now also stops the
phone nagging about work already done. That second-order effect was the argument
for writing the cache at all; display alone would have left the badge and the
notification disagreeing.

**Streak fields only, though the listener carries the whole document.** The
languages are in there too, and `nativeLanguage` going momentarily null is
exactly what the first-run modal watches for — a snapshot racing the setup flow
would pop it over someone mid-answer. Languages are read at launch and changed
on one device at a time; the streak is the field that genuinely moves elsewhere.

**The streak became one value behind a ref, and that fixed a real bug on the
way.** Four `useState`s could not be merged atomically, and the merge would have
had to read a render-old closure. Moving to one `StreakState` plus a ref means
`recordReview` computes from the ref, not from React state — and consecutive
ratings now compose instead of both starting from the value the last render
happened to see, where the second write silently replaced the first. **That is
web's local-counter bug in its single-device form**, and it was sitting in the
mobile write path unnoticed while the item said mobile did not have that problem.
The item was right that mobile's *cross-device* story was already reconciled; it
was wrong that nothing local could disagree. A transaction still is not the
answer here — it fails offline — and a ref costs nothing.

`recordReview` now calls core's `advanceStreak`, the same pure rule web runs
inside its transaction, rather than its own copy of the arithmetic. Verified
equivalent field by field before swapping, including the new-day restart of
`reviewedToday`; `reviewedToday` is now *derived* for display rather than stored
as zero, so the value the streak is computed from stays honest.

One thing deliberately not done: the in-memory copy stays `dirty` for the rest
of a session once this device records a review — only the cached copy is
cleared, by `markStreakSynced`, and only when it still says what was sent. So
later snapshots merge by date and then by highest rather than taking the server
outright. Left as it is because highest never loses a review and a genuinely
newer day still wins outright; clearing it in state would mean duplicating
`markStreakSynced`'s "only if it still says what was sent" guard.

Unverified on a device: this typechecks, bundles and rides on core logic with
252 passing tests, but **the listener itself has not been watched on a phone**.
Mobile has no test harness, so the wiring is argued rather than exercised — and
that is precisely why step (2) is gated on this having been in a build for a
release. See [backlog.md](backlog.md).

### Web subscribes; the archived bug was never real (2026-08-22)

Four calls out of the data-freshness item, two of which **retract things this
scratchpad asserted**.

**Subscribe, not invalidate.** The item posed it as an open question —
TanStack Query/SWR against `onSnapshot` — and framed listeners as the risky
option whose "read billing should be measured rather than assumed". That has it
backwards, and the measurement is the wrong way round. Firestore bills a
listener for the documents in its *first* snapshot and thereafter only for
documents that actually change, so an idle listener costs nothing, where the
code it replaced re-read the whole collection on every mount of three separate
list surfaces. **A listener is cheaper than what was already there.** The
deciding argument is not cost though: web already initialises
`persistentLocalCache` with `persistentMultipleTabManager` and then reads past
it with one-shot `getDocs`. A query cache on top would have been a *third*
cache — Query → Firestore local → server — each with its own idea of the truth,
which is the disease rather than the cure. Firestore is a sync engine; the
invalidation problem it would have managed is one it does not have.

**The `archived` "query bug" does not exist.** The item called it "one genuine
query bug" and prescribed a backfill. It was reasoned from code and never
checked against data. Checked 2026-08-22 with a read-only audit over all seven
collections: **1,316 cards, zero missing the field.** Nor can one be created —
`buildFlashcardDoc` is the single card constructor on each platform and both
hardcode `archived: false`, and every write path (`addDoc` for saves,
`batch.set` for pack imports) goes through it. The reasoning about `!=` was
correct in the abstract and simply had no instances. **No backfill was run and
none is needed.** Left as it is rather than "fixed defensively", because a
migration over 1,316 documents to repair nothing is a real risk taken against
an imagined one.

**Deck counts show every card; archived filters belong to review and Cards.**
This was posed as "which number is true when two surfaces legitimately count
differently". Decided: browsing a deck is asking how big it is, so decks counts
everything; review and Cards are working surfaces where archiving means
something. **The code already did exactly this** — no change was made, and the
backlog's framing of it as a discrepancy was wrong.

**The streak needed a transaction, not just a listener.** Worth separating,
because subscribing looked sufficient and is not. A listener fixes *displaying*
a stale value; it does nothing about two writers computing from the same
starting value. Two tabs both loading `reviewedToday: 0` and reviewing 10 and 1
times stored `1` — and this needs no second device, only the multi-tab setup
web already enables. So `recordReview` keeps no local copy at all now:
`recordReviewStreak` re-reads inside a transaction, and the subscription brings
the answer back. This is the pattern `recordProgress` has used since the
dashboard shipped, sitting directly above the streak write that did not.

**Mobile stays as it is,** and its reasons are in [backlog.md](backlog.md).
The short version: mobile's streak is already offline-first and reconciled
rather than divergent, and the transaction that fixes web *fails offline*,
which is the bug mobile's cache exists to prevent. Same symptom name, opposite
correct answer.

### Kikuyu ships with no audio and no noun class, both measured (2026-08-22)

Kikuyu is the first study language added where the open questions were about the
*language's* support rather than the app's, and the backlog item said to answer
them on real words before wiring any UI. Both were answered that way.

**No pronunciation, because no voice exists.** Checked against the live Google
Cloud TTS voice list rather than inferred: 2066 voices across 62 locales, and no
`ki`. The only Bantu locale is `sw-KE`, and Swahili is the wrong stand-in for a
reason worse than accent — its alphabet has no `ĩ` or `ũ`, which are the two
vowels that separate Kikuyu words from each other. A voice that cannot say the
distinguishing sounds teaches the wrong pronunciation confidently, which is worse
than a hidden button. So the entry has no `ttsLanguageCode`, and the optional-TTS
path that had been written but never used is now live.

**No noun class on the card, even though it is the obvious analogue of
`gender`.** Kikuyu marks class, not gender, and class governs agreement across
the whole sentence — so it is more useful than `el`/`la`, and a wrong one is
also much more damaging. Probed on eight nouns: `mũndũ` (1/2, `andũ`) and `mũtĩ`
(3/4, `mĩtĩ`) came back right, but `rũthiomi` came back with `ndimi` — the
*Swahili* plural, where Kikuyu has `thiomi`. A field that is wrong that often
teaches wrong agreement everywhere the learner uses the word. Left off until
something better than the model can fill it. The Swahili leak is also why the
prompt branch names Swahili explicitly as something not to answer with; the
nearest high-resource Bantu language is a live contamination risk, not a
theoretical one.

**Everything else was better than expected.** Single-word lookup was correct on
~19 of 20 real words in both directions, `ũhoro` was correctly split into its two
senses, depth returned accurate cultural notes (including the `mũgũnda`/`werũ`
contrast), and example sentences carried correct locative morphology. The one
gloss believed wrong was `gũtherũka`, returned as "to become clear" where it
means "to boil" — close to `gũthera`, which is the shape of error to expect here:
a real Kikuyu word confused with a near neighbour, not an invented one.

**Worth knowing: the spellcheck rule turned out to be a Kikuyu feature.** It was
written for transposed letters and missing accents, and on Kikuyu it restores
dropped vowel diacritics — `muthenya` → `mũthenya`, which is exactly how a
learner will type. The fear was the opposite, that a low-resource language would
be over-corrected into hallucinated forms; five real-but-less-common words
(`gĩthomo`, `mũhĩrĩga`, `kĩrĩma`, `nyeki`, `gũtherũka`) all came back with
`corrected: null`. Re-measure this if the rule is ever loosened.

### Spanish is European Spanish, and that is a deck not a setting (2026-08-21)

The registry needs a locale and a voice, and Spanish is the first language added
where the obvious choice is genuinely contested: `es-ES` against `es-US`, where
the Latin American varieties have the larger audience and differ well past the
accent — `coche`/`carro`, `vosotros`, `ordenador`/`computadora`.

**Went with `es-ES`/`es-ES-Chirp3-HD-Charon`**, on consistency with how `fr-FR`
and `sv-SE` were already chosen: one registry entry names one variety and speaks
it. The alternative was never "support both" — it was a preference toggle, and
that is the design the file header already rejects for Traditional vs Simplified
Chinese. If Latin American Spanish is ever wanted it is **its own entry with its
own collection**, so neither deck constrains the other and a learner's cards
never silently change which Spanish they teach. The comment on the entry says so,
because the cheap-looking fix is to add an accent setting.

Worth knowing: the voice was **verified against the live TTS API**, listed and
synthesized, rather than assumed from the naming pattern. A wrong voice name is a
runtime 400 on the pronounce path that no build or test would catch — the same
class of gap as the two console steps this language is still blocked on.

### Progress is a daily rollup, and the streak stays where it is (2026-08-19)

Four calls made while building the dashboard, each of which would be expensive
to revisit later.

**Grain: one document per user-day, not one row per rating.** Every question
asked of it — which days, how much, how many new cards, habit, recap — is a
per-day question, and a year is 365 documents rather than ~20,000. The cost is
real and worth naming: a rollup discards whatever it didn't count in advance, so
time-of-day and per-card history are gone once a day is summed. Event rows can
be added *alongside* later if a question needs them; the rollup does not have to
be undone first.

**The day is per user, with the language breakdown inside it.** The habit being
tracked is "studied today", not "studied Korean today" — someone who reviews
Japanese has kept their streak. Splitting the streak six ways would punish
exactly the multilingual use the app is built for. The dashboard can still break
any day down by language.

**`reviews` counts directions, not cards** — the same thing `reviewedToday` has
always counted. This is *not* an endorsement of that number: it reads roughly
double what a learner thinks they did. It is a refusal to have two counters that
disagree about what one number means while the honest fix is still an open,
user-visible call. Fix both together or neither.

**The dashboard shows the stored streak, not one derived from the rows.** The
derived number is the better one eventually, and `deriveStreak` is written and
tested in core against that day. But the rows begin empty, so deriving it today
shows `1` to someone on a 200-day streak — and adding a fourth surface that
disagrees about the streak is the precise failure the data-freshness item exists
to stop. The swap is safe once the history is older than the longest live
streak.

One consequence to hold on to: **history begins the day this ships**. New cards
per day could be reconstructed from `createdAt`, but review history cannot be
reconstructed at all, from anything. That asymmetry is why the write shipped
ahead of the screen rather than behind it, and ahead of the data-freshness item
it nominally depends on — the dependency was always about the screen being a
fourth stale surface, never about the write.

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
