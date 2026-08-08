# Amgi Scratchpad

Working notes for the project, split by topic so a single file can be pulled
into context without loading everything. Read only what the task needs.

| File | What's in it | Read it when |
|---|---|---|
| [vision.md](vision.md) | Product aspiration, design principles, audience, long-term direction | Making product calls |
| [ui-ux.md](ui-ux.md) | Palette, themes, navigation, copy/i18n, open design questions | Styling or laying out a surface |
| [tech-stack.md](tech-stack.md) | Web + mobile stack, deployment, CI, shared package layout | Setting up, adding a dependency, touching build/deploy |
| [data-model.md](data-model.md) | Flashcard discriminated union, Firestore collections, `STUDY_LANGUAGE_CONFIGS`, API shapes | Adding a language, changing card fields, touching API routes |
| [status.md](status.md) | What's shipped, in progress, decided, known issues | Orienting at the start of a session |
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
  rename it there too or it silently stops being tracked.

**Convention:** `backlog.md` holds **only open work**. When something closes it
leaves that file:

- **Shipped** → the Shipped list in `status.md`, with PR number and merge date.
- **Decided or cancelled** → the Decisions section in `status.md`, *with the
  reasoning* — a closed call whose reasoning is lost gets reopened by whoever
  next notices the symptom.
- **Durable gotcha** → `lessons.md`, not the shipped bullet.

Backlog priority mirrors the user's Google Tasks list — `backlog.md` is the
scoped version of it.

_Last reviewed against the codebase: 2026-08-08, branch `grammar-patterns` @
`aa52147`. `npm test` 232/232, web and mobile both typecheck, measured not
assumed._

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
