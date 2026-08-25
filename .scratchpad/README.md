# Amgi Scratchpad

Working notes for the project, split by topic so a single file can be pulled
into context without loading everything. Read only what the task needs.

| File | What's in it | Read it when |
|---|---|---|
| [vision.md](vision.md) | Product aspiration, design principles, audience, long-term direction | Making product calls |
| [ui-ux.md](ui-ux.md) | Palette, themes, navigation, copy/i18n, open design questions | Styling or laying out a surface |
| [tech-stack.md](tech-stack.md) | Web + mobile stack, deployment, CI, shared package layout | Setting up, adding a dependency, touching build/deploy |
| [data-model.md](data-model.md) | Flashcard discriminated union, Firestore collections, `STUDY_LANGUAGE_CONFIGS`, API shapes | Adding a language, changing card fields, touching API routes |
| [status.md](status.md) | What's live, what's decided and why, known issues, build/console state | Orienting at the start of a session |
| [backlog.md](backlog.md) | Open work only — prioritized, plus unscoped ideas | Picking the next thing to build |
| [lessons.md](lessons.md) | Gotchas already paid for — Firestore, Expo monorepo, EAS, Next.js | Debugging something that smells familiar |

Related docs outside this folder:

- `docs/packs/toeic-pack-draft.md` — source draft for the TOEIC vocabulary pack
  (referenced from `packages/core/src/packs.ts`)
- `docs/packs/topik-pack-draft.md` — source draft for the TOPIK 고급 pack
  (referenced from `packages/core/src/topik.ts`)
- `docs/packs/military-unit-pack-draft.md`,
  `docs/packs/military-affairs-pack-draft.md` — the two military packs, 474
  pairs (referenced from `packages/core/src/military.ts`). Unlike the drafts
  above these are **bilingual pair lists**, not a study side plus glosses, and
  they still carry live open questions — read them before changing a term or a
  hint, and hand *these* to a reviewer rather than the TS.
- `docs/packs/daily-life-pack-draft.md`, `docs/packs/idioms-pack-draft.md`,
  `docs/packs/kanji-pack-draft.md` — the three packs added 2026-08-24 (referenced
  from `dailyLife.ts`, `idioms.ts`, `kanji.ts`), **approved 2026-08-24**. Each
  carries the word list *and* its backs in one file, rather than the list/backs
  split the older drafts use, and each leads
  with the calls that need a decision: the daily-life pack sets aside the
  not-for-beginners rule, the idioms pack's Korean 관용구 matches are judgement
  calls, and the kanji pack trades the kana grid for a list to fit readings on the
  back. Hand *these* to a reviewer, not the TS.
- `docs/packs/toeic-backs-draft.md`, `docs/packs/topik-backs-draft.md` — the 293
  card backs, approved 2026-08-02. Kept as the record of what was authored and
  why; still the place to read before changing a gloss, since each leads with
  the near-synonym collisions that a bare source diff would not explain.
- `docs/local-model.md` — the written answer to the "Local model spike" item:
  the three meanings of "local", what a local model could and couldn't replace
  route by route, size/RAM limits, fine-tuning vs prompting, and the recommended
  first step (a shared term cache, not a model). **The item is closed** — read
  this and the Decisions entry in `status.md` before reopening the on-device
  question.
- `docs/grammar-research.md` — what SLA research says about how grammar is
  learned and practised, written 2026-08-08 after the first grammar-patterns
  trial failed. **Read it before touching the grammar design**: it confirms
  three decisions already made (no curriculum, no multiple choice, spacing),
  contradicts one (free production was made rung one when the evidence puts it
  third), settles the interleaving question, and documents Bunpro as the closest
  prior art — including the failure mode Amgi would inherit by copying it.
  Tracked via an explicit `!docs/grammar-research.md` re-include.
- `docs/testflight-beta-info.md` — TestFlight listing copy, Korean *and*
  English in one file (the `-ko` suffix was dropped 2026-08-02 for that
  reason). Tracked, despite `.gitignore` excluding `docs/*`, via an explicit
  `!docs/testflight-beta-info.md` re-include — so if you rename it again,
  rename it there too or it silently stops being tracked. **The code blocks are
  one line per paragraph on purpose** — this is pasted text, not source, and a
  hard wrap survives into TestFlight to fight the phone's own wrapping. Don't
  reflow them to match the prose around them.

**Convention:** `backlog.md` holds **only open work**. When something closes it
leaves that file:

- **Shipped** → nowhere. Git and GitHub already track what shipped and when; a
  second copy in these notes only goes stale. Delete the bullet.
- **Decided or cancelled** → the Decisions section in `status.md`, *with the
  reasoning* — a closed call whose reasoning is lost gets reopened by whoever
  next notices the symptom.
- **Durable gotcha** → `lessons.md`.

The test these files have to pass: **would GitHub tell me this?** If yes, it
doesn't belong here. What does belong is reasoning, console and binary state that
lives outside the repo, and what is currently unverified.

Backlog priority mirrors the user's Google Tasks list — `backlog.md` is the
scoped version of it. Keep entries at the size that says what to do next; the
argument behind a call goes in `status.md`, not in the item.

_Last reviewed against the codebase: 2026-08-22, `main` @ `032cdad`.
`npm test` 289/289, measured 2026-08-24 on `feat/typed-responses` — 273 of them
on `main`, which the 252 recorded here had already gone stale against. Mobile has no test script — its half of the
freshness work is covered by `tsc` and a bundle, not by tests._

_This pass **built typed responses during review**, the last starred item —
`backlog.md`'s High section is empty again. It was designed before any code, as
the item asked, and the four questions it posed are answered in the Decisions
entry in [status.md](status.md). **The one thing to read before touching the
grader:** it matches accents *strictly*, which is the opposite of what the
backlog item prescribed — Kikuyu's `ĩ`/`ũ` and French `ou`/`où` are word
distinctions, and the `STUDY_LANGUAGE_CONFIGS` comment refusing a Swahili voice
for Kikuyu is the same argument. What makes strictness affordable is that the
verdict only **preselects** a rating: all four buttons stay live with both
strings on screen, so the learner corrects a false miss with the tap they were
making anyway. `sm2.ts` is untouched._

_Two structural notes. The grader is **not new code** — `foldText` and the
spacing-insensitive compare are the cloze grader's, lifted out of `grammar.ts`
into `packages/core/src/typedAnswer.ts` so they outlive that module's queued
deletion; `grammar.ts` imports them back, so the deployed route is unaffected
and **the deletion takes the importer, not the module**. And typing is a
**session** property, not a stored preference: a toggle beside the direction
filter, applying only to the produce-the-word direction, with a per-card way to
flip instead — which is what keeps a learner with no IME to hand from being
stuck._

_This pass **made web read its data live** and, in doing so, **retracted two
claims these notes had asserted**. Both retractions are the more useful half, so
read the Decisions entry in [status.md](status.md) before the code. The
`archived` "query bug" — called "one genuine query bug" here and prescribed a
backfill — **does not exist**: an audit over all seven collections found 1,316
cards and **zero** missing the field, and `buildFlashcardDoc` is a single
constructor per platform that hardcodes it, so none can be created. It had been
reasoned from code and never checked against data. The counts question was
**decided as what the code already did**. What remained was one real problem —
nothing pushes — and `onSnapshot` appeared nowhere in the repo._

_The thing worth carrying: **subscribing fixes displaying a stale value and does
nothing about two writers**. The streak needed a transaction as well as a
listener, because two tabs both loading `reviewedToday: 0` and reviewing 10 and
1 times stored `1` — no second device required. And **mobile is the opposite
case, not the same one later**: its streak is already offline-first and
reconciled, and the transaction that fixes web *fails offline*, which is the bug
mobile's cache exists to prevent._

_Mobile then took **step (1) only** — a `users/{uid}` subscription for display,
merged into what the device holds and never written back from. The scope was set
before the code and held. Two things came out of it: the cache write is gated on
nothing being unsent, because `refreshReminders` reads that cached
`lastReviewDate` and would otherwise nag about work already done; and mobile
turned out to have web's local-counter bug after all, in a **single-device**
form — two quick ratings both computing from the same render-old state — fixed
with a ref rather than a transaction, since a transaction fails offline._

_Step (2) followed the same day, after the streak listener was watched working
on a phone. **The gate asked for a release and was opened by an Expo Go test** —
deliberately, and worth knowing which questions that left open. Two things the
collection listeners needed that the streak one did not: an **empty cached
snapshot is dropped**, because on a memory-only cache "nothing yet" and "no
cards" arrive identically and the streak sidesteps it by ignoring missing
documents; and the offline snapshot is **written on a debounce**, because every
rating echoes back as a snapshot and writing each would re-serialise the whole
collection per card. A listener also gives back no **deadline**, so review keeps
`withTimeout`'s 10s itself — offline on an unloaded language it would otherwise
spin forever. **What is left is verification on a device**, and
[backlog.md](backlog.md) lists the four things to watch._

_This pass **cut both tracking files down to what GitHub can't tell you.**
`status.md` lost its Shipped section entirely (~270 lines), plus the per-PR
enumerations in Now and Builds — all of it derivable from git. What stayed is
Decisions, the EAS/TestFlight state that only lives in a console, and the
unverified-on-binary caveats. `backlog.md` was pruned to items that say what to
work on next: the Google Tasks sync narration went, the writing-review follow-ups
went with the feature (recorded in the grammar-removal decision), and the
remaining items were cut to their actionable core. Two things were **added**
rather than removed, because nothing else tracked them: deleting the callerless
`writing.ts`/`grammar.ts` and their routes once no pre-removal build is in use,
and `/api/explain`'s missing `try`/`catch`, which outlived the writing item that
carried it._

_This pass **built the progress dashboard** — the first thing the app remembers
about a day beyond a streak chip. **It is a write-path change before it is a
screen**, and that ordering is the whole point: everything the app knew was four
fields on `users/{uid}`, so "which days did I review" was never written down
rather than merely unsurfaced. The two things to know before touching it are
both in [data-model.md](data-model.md). **The grain is one document per
user-day**, not one row per rating — which answers every question actually
asked at 1/50th the writes, but permanently discards anything not counted in
advance, so a field added later only collects from the day it ships. And **it is
a subcollection on purpose**: the Delete User Data extension is configured as
`users/{UID}` recursive, so a top-level `progress_daily` would have quietly
survived account deletion._

_Two traps worth reading before debugging it. **The security rule is console
state and its failure is silent** — writes are fire-and-forget, so a missing
rule looks like "the dashboard doesn't work" rather than an error; the rule is
in [tech-stack.md](tech-stack.md) and went live 08-20. And **progress increments
are not idempotent**, unlike the card-rating queue they sit beside: a
timed-out-but-committed write over-counts on retry, accepted deliberately
because the alternative wedges the flush chain and loses whole days.
`withTimeout` says so at the point of use._

_**History began 2026-08-20 and cannot be backfilled** — review history is
reconstructible from nothing. So the calendar is near-empty for weeks by
construction, and the streak shown is still `UserContext`'s stored counter
rather than `deriveStreak`, which is written and tested for the day the rows
outlive the longest live streak. Not before ~November 2026._

_This pass **removed grammar and writing from the app** on the user's call, and
then **reframed the two remaining starred backlog items**. The removal took
~5,000 lines: pattern practice, writing review, the Cards/Grammar toggle, the
Learn Word/Passage toggle, the patterns review collection, `core/diff.ts` and
both `TextDiff`s, and 88 i18n keys per language. **The one thing to know before
touching `packages/core`:** `grammar.ts` and `writing.ts` are still there with
**zero callers**, and that is deliberate — `/api/writing` and
`/api/grammar/exercise` stay deployed so TestFlight 1.3.0, which has the UI
compiled into its binary and no OTA, keeps working. Both files carry a
`DO NOT DELETE AS DEAD CODE` header; the condition for removing them is in
[status.md](status.md). `docs/grammar-research.md` stays too — it is the
argument, and it outlives the code._

_The backlog rework is the more interesting half. **"Review page discrepancy" was
never one page's bug**: every surface owns a private copy of the data and nothing
tells any of them when it changes, which is why the symptom moves — a stale
deadline, a divergent streak, a card saved and not shown. It is now **Data
loading and freshness**, with the real architecture written down (no cache layer;
`useState` + effect per screen; web never refetches on navigation; mobile
hand-rolls `reloadToken`; the streak is a *local counter* in `UserContext`, not a
read of the doc) and the actual question posed — invalidate (TanStack Query/SWR)
or subscribe (`onSnapshot`, already paid for since they are on Firestore). **The
one genuine query bug is called out separately** so it doesn't hide inside the
architecture question: `where('archived', '!=', true)` excludes missing fields and
was never backfilled, so old cards appear nowhere at all. **"Improve stats" is now
Progress dashboard**, and it is a *write-path* item — there is no per-review
record anywhere, so history begins the day the write ships, and it depends on the
loading item because a dashboard is a fourth surface to disagree with the other
three. **Word order practice was cancelled**, since it was a rung on a ladder
that no longer exists._

_This pass **synced `backlog.md` with Google Tasks** and scoped the four new
names against the code, which is most of the value — a one-line task title and a
grounded item are not the same artifact. **High is no longer empty:** three
starred items (review page discrepancy, improve stats, word order practice) plus
*Add Spanish* under Medium. Three findings came out of the scoping and are worth
knowing before picking any of them up. **The review discrepancy has a concrete
prime suspect**: `where('archived', '!=', true)` excludes documents where the
field is missing, `migrateExistingCards` never backfilled it, and review is the
only surface that filters `archived` at all — so the fix is a backfill plus a
decision about which count is honest, not a query rewrite. **"Improve stats" is a
data-model item**, because no per-review record is written anywhere and the two
fields that do exist are per-user rather than per-language and count directions
rather than cards. And **word order practice argues against a call already
made** — the bare transformation drill was dropped deliberately, and a token-
arranging drill is mechanical in exactly the sense `docs/grammar-research.md`
warns about, so it has to earn a rung under the cloze rather than beside it._

_Nothing was removed. Tasks lists six open items where `backlog.md` holds
eighteen; the untracked ones have no decision recorded against them, so they were
ranked below the Tasks names and left in place rather than deleted, per the
convention below. The stale `npm test` count in Housekeeping (200/200) was
corrected to a measured 313/313 in passing._

_This pass **shipped 1.3.0, build 11 — the first build approved for external
testing**. Every release before it reached internal testers only; 1.2.0 was
accepted but never cleared Beta App Review. That makes the six PRs it carries the
first work in this project that is shipped in the sense the no-OTA model means:
in someone's hands. They left [backlog.md](backlog.md) for the Shipped list on
this pass and not before, because a merged PR no binary carries is not shipped._

_Two things follow, both in `backlog.md`. **The oldest open items in the project
are now cheap to close**: the native paths no release has ever verified (audio,
export, sharing, offline, reminders, account deletion, and 1.3.0's new copy
button) plus three renders never seen on a device. 1.3.0's What to Test asks
testers for all of them by name, so reading what comes back beats testing by
hand. And **the next version bump queues for Beta App Review again** — the
external approval covers 1.3.0, so batching changes into a build is worth more
than cutting one per feature._

_`docs/testflight-beta-info.md` was rewritten for this build, then **cut for
length on the user's call** — the tester-facing copy had grown past what its own
author would read. The rule that survived: **each bullet names the one thing that
can go wrong**, since the rationale around it was what made it unreadable. Two
things in that file are deliberate and easy to undo by accident, so both carry
warnings in the file itself: the Apple review notes are **left long** (they
answer rejection reasons — 5.1.1(v) account deletion, notifications off by
default, third-party processing), and the code blocks are **one line per
paragraph** because TestFlight keeps every newline it is given and a hard wrap
fights the phone's own wrapping._

_The previous pass **cleared High**. Both items shipped as separate PRs — term archiving
during review (#86) and spellcheck on lookup (#87) — and each turned out to be
one shared function away from being right on both platforms, which is why they
closed together. Two things are worth reading before touching either area: the
`removeCardFromQueue` entry in [lessons.md](lessons.md), because the review queue
is per *direction* and both platforms had independently forgotten it; and the
spellcheck decision in [status.md](status.md), which records where the correction
comes from, why the override is a request rather than a filter, and the refusal
set to re-probe before editing the prompt. The backlog item's open question —
one round trip or two — closed on the reuse-the-endpoint rule. **`backlog.md`'s
High section is now empty**; the next thing to pick up is under Medium._

_The pass before that **closed grammar patterns**. The mobile smoke test in Expo Go against
the deployed API came back clean, so the last item left `backlog.md` and the
feature is done: `status.md` gained a Shipped line, a closing Decisions entry,
and an updated Now. **`backlog.md` now has no starred items at all** — all three
are closed. The one thing worth carrying was the `/api/writing` "+ card"
fallback, which is inert in current code and must not be deleted until no old
build is in the wild; it moved into the closing Decisions entry rather than
vanishing with the backlog item._

_The last pass on that branch **built the redesign and then fixed what testing
it found**. Shipped: the cloze rung, `PatternKind`, derived stage, the
Cards/Patterns management surface, manual add, the learner override, `easy` on a
clean cloze, and interleaving. Two corrections came from real use rather than
reasoning, and both are in [lessons.md](lessons.md) as one entry: a generated
exercise has to be **checkable, not just well-prompted** (a cloze rebuilt itself
into "Mon frère adore au football" and marked the learner wrong for writing
correct French), and the redundant field added to catch that then broke every
turn because it did not survive the client's second parse. A third correction
came from the trial before it: the writing review now offers a **card for a word
the learner reached for and did not have**, and a pattern offer no longer hides
it. Two opens remain (vocab-queue interleaving, unprompted tier-1 hint); the
override closed. **Not verified by anyone yet:** graduation to the production
rung, which needs about a week of real intervals to reach._

_A follow-on pass **redesigned grammar patterns off the research**, replacing
the same-day design below rather than sitting beside it. The move: the primary
axis is not the pattern's kind but the learner's **stage** with it — a cloze
until it sticks, then free production — because practice runs controlled → free
and the first cut opened at free, which is where the trial's ambiguity and
variance both came from. Stage is derived from `repetitions`, so a lapse demotes
for free. `kind` survives, demoted to deciding whether a pattern ever graduates.
The bare transformation drill is dropped outright. `vision.md` gained "production
is the last rung", `data-model.md`'s revision was rewritten, the `status.md`
entry was replaced with its trail kept, and `backlog.md` restaged (1a′) into five
pieces with an explicit **not doing** list._

_This pass **built grammar patterns, tried them, and redesigned off the trial**
— which is the order the previous pass's design could not have produced on its
own. (1a) shipped to a branch and three things did not survive contact: a
verdict cannot be derived from `/api/writing` alone (it grades prose without
knowing the target, so a clean sidestep scored `good`), the entry door is not
`kind === 'grammar'` (the best patterns arrive as `naturalness` findings), and
the budgeted composite index was never needed. Then the trial itself found the
deeper thing: **one exercise format was serving two kinds of grammar point**,
which is now argued in `vision.md`, typed in `data-model.md` and called in
`status.md`. `backlog.md` restaged the item as (1a′) in four ordered pieces and
downgraded (1b) — manual add covers most of what the 12-template Learn door was
for. Two user calls are recorded: patterns are managed from a Cards/Patterns
toggle, and can be added by hand. Previously 2026-08-08 @ `f722774` (PR #81)._

_That pass closed **two** of the three starred items. The military terms pack
grew from a 219-term draft into two registered packs of 474 pairs (#81), and the
local model spike closed on its own written answer: `docs/local-model.md` says
don't, so the item went rather than lingering. `backlog.md` lost both, gained
PR #81 in the build queue, and promoted the shared term cache out of Needs
clarification because the local-model doc names it the cheapest useful first
step. `status.md` gained a shipped line and two Decisions entries. Grammar
patterns is now the only starred item left. Previously 2026-08-03 @ `111da4e`
(PR #78)._

_That pass did three things. **Grammar was designed** before any code — argument
in `vision.md`, type in `data-model.md`, design calls in `status.md`, staging in
`backlog.md` — then re-checked against the files it cites, which corrected six
claims (12 `/api/explain` prompt templates not 6; `sm2.ts` unedited but its ease
curve becomes a one-way ratchet without `easy`; a patterns row is a signature
change to `buildReviewCollections`; `gloss` is optional both sides like
`PackBack`; a review is two model calls; grading can fail mid-session) and added
a hint tier. **`status.md` was compressed ~70%** — shipped history cut to one
line per item and moved below Decisions, since the blow-by-blow is in git and the
gotchas are in `lessons.md`. **`backlog.md` was reordered** to Queued → High →
Medium → Bigger bets, with Housekeeping moved down and the lost `## Medium`
heading restored. Previously 2026-08-02 @ `9a51a6e` (PR #71)._
