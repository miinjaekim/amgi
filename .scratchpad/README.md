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
- `docs/packs/toeic-backs-draft.md`, `docs/packs/topik-backs-draft.md` — the 293
  card backs, approved 2026-08-02. Kept as the record of what was authored and
  why; still the place to read before changing a gloss, since each leads with
  the near-synonym collisions that a bare source diff would not explain.
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

_Last reviewed against the codebase: 2026-08-03, `main` @ `111da4e` (PR #78).
`npm test` 175/175, measured not assumed._

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
