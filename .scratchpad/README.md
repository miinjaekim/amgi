# Amgi Scratchpad

Working notes for the project, split by topic so a single file can be pulled
into context without loading everything. Read only what the task needs.

| File | What's in it | Read it when |
|---|---|---|
| [vision.md](vision.md) | Product aspiration, design principles, audience, long-term direction | Making product calls |
| [ui-ux.md](ui-ux.md) | Palette, themes, navigation, copy/i18n, open design questions | Styling or laying out a surface |
| [tech-stack.md](tech-stack.md) | Web + mobile stack, deployment, CI, shared package layout | Setting up, adding a dependency, touching build/deploy |
| [data-model.md](data-model.md) | Flashcard discriminated union, Firestore collections, `STUDY_LANGUAGE_CONFIGS`, API shapes | Adding a language, changing card fields, touching API routes |
| [status.md](status.md) | What's live, what's unverified, build and console state, and the index of decisions | Orienting at the start of a session |
| [decisions/](decisions/) | Closed calls with their reasoning, one file per area | Before changing something a decision covers. Find it through the index in `status.md` |
| [backlog.md](backlog.md) | Open work only, prioritized, plus how to cut a build | Picking the next thing to build |
| [lessons.md](lessons.md) | Gotchas already paid for: Firestore, Expo monorepo, EAS, Next.js | Debugging something that smells familiar |

## Conventions

`backlog.md` holds **only open work**. When something closes it leaves that
file:

- **Shipped** → nowhere. Git and GitHub already track what shipped and when.
  Delete the bullet. The one exception is "Queued for the next build", which
  holds merged mobile work until a build carries it.
- **Decided or cancelled** → a new entry at the top of the matching file in
  `decisions/`, *with the reasoning*, and a line in the index in `status.md`.
- **Durable gotcha** → `lessons.md`.

The test these files have to pass: **would GitHub tell me this?** If yes, it
doesn't belong here. What does belong is reasoning, console and binary state
that lives outside the repo, and what is currently unverified. That rules out a
running log of what each session did, which this file used to carry.

Backlog priority mirrors the user's Google Tasks list, and `backlog.md` is the
scoped version of it. Open items are the user's: a follow-up noticed while
building is a note inside an existing item, not a new entry. Keep entries at the
size that says what to do next; the argument behind a call goes in `decisions/`.

Update these notes **before** a PR merges, as part of the PR.

## Parallel agents

The main checkout is for scoping and planning into `backlog.md`. Building
happens in long-lived lanes (`../amgi-ai-2-worktrees/lane-<n>`, made once with
`scripts/new-lane.sh <n>`), one agent and one task at a time.

Each task starts in a fresh chat, and **the agent runs
`scripts/next-task.sh <branch>` itself** before touching code, not a bare
`git checkout -b`. The script branches from `origin/main` (so a plan has to be
pushed first), deletes the previous branch once merged, copies the `.env` files
from the main checkout, and reinstalls if the lockfile changed. Lane n uses
Metro 8081+n and Next 3000+n. `scripts/new-worktree.sh <branch>` is still there
for a one-off worktree.

Changes confined to `.scratchpad/` and `docs/` may be committed straight to main
(pull first). Code always goes through a branch and a PR.

If you are an agent in a worktree:

- **Your backlog item is yours to edit.** Rescope it in your PR as the work
  changes. When it merges, remove it per the convention above, or move it to
  "Queued for the next build" if it's mobile. The planning session leaves a
  handed-off item alone until your PR merges.
- **Bring your branch up to date with main before the PR merges**
  (`git pull --rebase origin main`). "Queued for the next build" is where two
  PRs usually collide, so keep both sides.

## Related docs outside this folder

`docs/` is gitignored except `docs/packs/` and the four files below, each of
which has an explicit `!` re-include in `.gitignore`. Rename one and it silently
stops being tracked unless the re-include is renamed too.

| File | What it is |
|---|---|
| `docs/grammar-research.md` | What SLA research says about how grammar is learned. Read before touching grammar design |
| `docs/pronunciation-research.md` | The measurements behind the pronunciation aid, per language, plus two working rule engines. Read before picking up any of the five languages still open |
| `docs/local-model.md` | Why there is no on-device model. The item is closed, and so is its reopen condition (the term cache was cancelled 2026-09-08) |
| `docs/testflight-beta-info.md` | TestFlight listing copy, Korean and English. The code blocks are one line per paragraph on purpose, because it is pasted text: don't reflow them |

**`docs/packs/README.md` is how a pack gets built. Read it before authoring
one.** Its rule is that the model is not a source: every entry carries a tier
and a citation, and the list is rendered through the app's own transforms before
anyone believes it. When a pack needs review, hand the reviewer the draft, not
the TypeScript.

| Draft in `docs/packs/` | State |
|---|---|
| `toeic-pack-draft.md`, `topik-pack-draft.md` | Word lists for the TOEIC and TOPIK 고급 packs |
| `toeic-backs-draft.md`, `topik-backs-draft.md` | The 293 card backs, approved 2026-08-02. Each leads with the near-synonym collisions, so read before changing a gloss |
| `military-unit-pack-draft.md`, `military-affairs-pack-draft.md` | The two military packs, as bilingual pair lists. They still carry open questions |
| `military-branches-subpack-draft.md` | 병과와 주특기, 24 pairs, approved 2026-09-09. First military content with a tier and citation per row |
| `daily-life-pack-draft.md`, `idioms-pack-draft.md`, `kanji-pack-draft.md` | Approved 2026-08-24. List and backs in one file, each leading with the calls that needed a decision |
| `spanish-basics-pack-draft.md` | 153 entries, approved 2026-08-31. Read its "What review changed" section |
| `kikuyu-basics-pack-draft.md` | 59 entries, read by a speaker 2026-09-08 and unchanged. The respelling table beyond these entries is still unchecked (see `lessons.md`) |
| `hanja-geupsu-pack-draft.md` + `hanja-geupsu-ingest.py` | The 급수 pack, 300 characters. Rows are generated by the script from the 어문회 list and Unihan, not typed |
| `french-irregular-verbs-draft.md` | Munli's sourced irregular verbs. A conjugation dataset, not a vocab pack |
| `french-tense-notes-draft.md` | The three tense notes shown on Munli's Saved tab |
| `writing-worked-example-draft.md` | The worked example on Munli's Writing tab |
| `english-articles-draft.md` | Munli's article practice: 8 rules, 54 sentences. Parked, with six calls at its top waiting on the user |
| `english-articles-generation-research.md` | The 2026-10-02 measurement of a model checker for generated article sentences |
| `user-pack-eval.md` | Eval of user-made packs against the hand-made ones. Generated by `npm run eval:user-packs`, so re-run it, don't edit it |
