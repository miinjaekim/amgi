# Backlog

Open work only, ordered by priority. Shipped, cancelled and decided items move to
[status.md](status.md) **with their reasoning**, so a closed call doesn't get
reopened from this file. Source of truth is the user's Google Tasks list; this is
the scoped version.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. Once one native module is in a
build, a second rides along free rather than costing a build of its own.

---

## Queued for the next build

**Two items queued, both JS-only** — no native module between them, so no
`expo config --type introspect` pass. 1.2.0 carries everything before them. See
Builds in [status.md](status.md) for its contents and for what remains unverified
on a real binary.

- **PR #80** (merged 2026-08-04) — `/cards` holds pack cards, the mobile filter
  sheet, the first skeletons.
- **PR #81** (merged 2026-08-08) — the two military packs reach mobile through
  the shared registry, and the packs list drops the per-pack description. ⚠️ The
  description change was **typechecked but never seen rendered** — the list went
  from one deck per language to three, and the row spacing under a title with no
  paragraph beneath it is unverified. Cheapest thing to check first in Expo Go.

_1.2.0 status: submitted and accepted, **internal testing live**, external
waiting on Beta App Review._

**Pre-flight, for next time:** smoke-test in Expo Go → verify the native-adjacent
things on the build itself (audio, files, sharing, offline review + reconnect,
account deletion, the review reminder firing *and then disappearing* once you
review) → bump `version` in `app.json` → check
`docs/testflight-beta-info.md` is still accurate → **`expo config --type
introspect` if any native module was added**, which is where an entitlement you
didn't ask for shows up before a cloud build finds it.

_The listing check earned its place on 2026-07-27: it still advertised five study
languages after Traditional Chinese made six, and said nothing about account
deletion — which Apple looks for under 5.1.1(v)._

## High

One starred item left. The military terms pack was another and shipped in #81;
the local model spike was the third and is **closed** — the written answer is
`docs/local-model.md`, the reasoning and the reopen condition are in
[status.md](status.md), and the two pieces of it worth doing are under Medium.

- [ ] **Grammar patterns — first cut tried, redesigned, rebuild pending.** ⭐
      _Designed 2026-08-03, web built 2026-08-08 on `grammar-patterns`, tried
      the same day, then redesigned off the research the trial prompted._ Read
      in this order: **`docs/grammar-research.md`**, which the design is derived
      from; the argument in [vision.md](vision.md), ending at "production is the
      last rung"; the two Decisions entries in [status.md](status.md) — "cloze
      first, production when it sticks" first, then the older design calls it
      scopes; the type and its 2026-08-08 revision in
      [data-model.md](data-model.md).

      A pattern is its own object with its own review verb, and **which verb
      depends on how well you already know it**: a cloze — one sentence with the
      pattern blanked, typed into, graded exactly and locally — until it sticks,
      then free production from a situation that never names it. `kind` decides
      only whether a pattern ever makes that second step.

      - **(1a) Web, first cut — built, tried, and superseded in part.**
        `packages/core/src/grammar.ts`, `/api/grammar/exercise`,
        `services/patterns.ts`, `PatternSession`, the patterns row via a `kind`
        field on `ReviewCollection` and a `collectionKey` identity, entry through
        `WritingFinding.pattern?`. The Firestore rule is in place. What it built
        survives as the **`choice`** half of the redesign; nothing here is thrown
        away.
      - **(1a′) The redesign — built 2026-08-08, awaiting a trial.** _Designed
        from `docs/grammar-research.md`; read that, then vision.md, then the
        Decisions entry._ All five pieces shipped to the branch, and everything
        (1a) built survives as the production rung:
        1. **Management surface** — Cards/Patterns mode toggle on `/cards`,
           `PatternsPanel` with active/archived, edit, archive, restore, delete.
        2. **Manual add** — pattern, optional gloss, kind picked from two
           labelled options. No endpoint, no model call.
        3. **`PatternKind` + derived stage** — `exerciseFormat()` off
           `repetitions`; a lapse demotes for free.
        4. **The cloze rung** — `ClozeExercise`, the second arm on
           `/api/grammar/exercise`, local exact grading, hints from the
           pattern's own gloss and citation form.
        5. **Classification** — `/api/writing` returns `kind`, verified live.
        Plus `buildPatternQueue` (interleaving), and the override and `easy`,
        folded in on the same pass.
        **Deliberately not done:** the bare transformation drill from the
        superseded design (mechanical drills are the one format the literature
        is near-unanimous against), and "situations state the meaning rather
        than a scene" — the cloze rung solves the ambiguity that fix was aimed
        at, and by the time a learner reaches production an under-specified
        situation is the *point*.
      - **(1b) Web, the expensive door.** The third `ExplainResult` arm on
        `/api/explain` — six language branches × the `if (context)` split =
        **12 prompt templates**. Manual add (2 above) covers most of what this
        was for at a fraction of the cost, so this is now weaker, not just
        later.
      - **(2) Mobile parity** — JS-only, rides a build rather than needing one.
        Its `buildReviewCollections` call already passes `[]`. Note that mobile
        still offers "+ card" on a pattern finding, because the writing route
        emits `card` alongside `pattern` precisely so the shipped build does not
        lose the take-away to a field it cannot read. That crutch comes out with
        parity. **Don't start this until (1a′) settles** — porting the format
        that just failed a trial is the expensive mistake available here.
      - **(3) Later, each independently useful:** produce-offline /
        evaluate-on-reconnect — note this gets *easier*, since a cloze turn
        needs no grading call and so works offline once generated; interleaving
        patterns into the vocab queue, which is more attractive now that most
        turns are ten seconds rather than forty; contrast turns (paired
        situations, both *produced* — not a picker, which vision.md rules out);
        a structured-input comprehension rung, which the research says is
        effective but which is forced-choice and sits awkwardly beside
        no-multiple-choice; the acquisition signal, which needs
        ephemeral-submissions reopened and which the research promotes — it is a
        better answer to "does any of this transfer" than anything in the
        literature.

      **Three things are open**, all in status.md. The learner override is now
      the sharpest by a distance: two trials *and* the research point at it, it
      is the home for the `easy` the ease ratchet otherwise removes, and cloze
      makes it cheap and obviously right — the expected answer is on screen, so
      the learner can see whether theirs was also correct. Then: folding into
      the vocab queue, and an unprompted tier-1 hint after an idle (production
      turns only now).
      **Spoken production is deliberately not here** — see conversation practice.

## Medium

- [ ] **Spellcheck on lookup — "showing results for…".** Type a misspelled term on
      Learn today and it goes straight to `/api/explain`, which will confidently
      explain a non-word; save it and the typo is now a card. Handle it the way
      Google does: search the corrected spelling, say **"showing results for X"**,
      and offer **"search for _what you typed_ instead"** so the user can override.
      The override matters more here than on a web search — a learner typing an
      unfamiliar word is exactly who a correction will overrule wrongly, and a
      real word Amgi doesn't recognise must stay reachable.
      Open: where the correction comes from. `/api/explain` returning a `corrected`
      field is one round trip and reuses the model already in the loop
      (see the reuse-the-endpoint rule); a separate check is a second call before
      the first. Decide that before building.

- [ ] **Word learning surface — meet a word before it's due.** A new card is
      immediately due in *both* directions (`isDue` returns both when neither is
      tracked, `sm2.ts:23`), so a word goes from saved to graded review with no
      first encounter in between. This is the surface for that first encounter:
      see it, hear it, use it once, *then* let SM-2 have it.
      Open before building: whether this writes scheduling at all or is purely a
      presentation step; if it writes, it is an `sm2.ts` change and the ease
      ratchet warning in the grammar item applies here too.

- [ ] **Term archiving covers both sides during review.** Archiving from the review
      manage panel writes the card-level `archived` flag, but
      `advanceAfterManage` (`apps/web/src/app/review/page.tsx:301`) drops only the
      *current index* from the in-session queue. The queue holds one entry per due
      **direction**, so in a `both` session the same card comes back the other way
      round after you archived it. **Delete has the identical bug** on the line
      below — worse, since that entry points at a document that no longer exists.
      Fix both: filter the queue by `card.id`, not by index.
      Mobile has the bug's mirror image — its review screen has **no** manage
      panel at all, so archiving mid-review isn't possible there. Parity work,
      cheap to do at the same time.



- [ ] **Vocabulary packs — iterate beyond v1.** Shipped: TOEIC (133), hiragana +
      katakana, TOPIK 고급 (160), and the two military packs (220 + 254, #81),
      all one pre-authored kind.
      *Principles:* audience is not beginners; packs unlock domains, never
      "starter" anything; curated from real sources, not AI-generated; word lists
      need user approval before shipping.
      *Next:* **JLPT** is the obvious gap — Japanese has only the kana packs, so a
      learner past the scripts has nothing — then TOEFL. Swedish, French and
      Traditional Chinese have **no pack at all**. Section themes as `/cards`
      filters are now a third rung on the deck axis that shipped — a chip per
      section under the pack you picked — not a new control: a fourth group in
      mobile's filter sheet, a third chip row on web.
      **A new pack now needs backs drafted alongside its word list**, since no
      kind ships without them. Drafts live in `docs/packs/`.

- [ ] **Shared term cache** — a `terms` collection keyed by normalized term +
      language, so a word looked up once is free for everyone after.
      _Promoted from Needs clarification 2026-08-08: `docs/local-model.md` §8
      names it the cheapest useful first step, ahead of any model work._ It buys
      most of what "local" was wanted for — instant lookups, an offline story,
      near-zero marginal cost — with **no build, no native module and no quality
      risk**, and unlike on-device it works on web too. Copies
      `/api/pronounce`'s content-hash pattern, **including its lesson that a bad
      generation becomes permanent**, so decide the invalidation story before
      writing the first document. Produces the corpus any later fine-tune would
      need as a byproduct.

- [ ] **Precompute depth and examples for the packs** — ~600 model calls, an
      afternoon, one throwaway script. The hypothesis the local-model item
      carried all along ("pre-cached content for a pack may beat inference
      on-device"), and `docs/local-model.md` §8 confirms it holds. Best done
      *after* the term cache, which is where the results would live.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's blocked.

## Bigger bets

- [ ] **Conversation practice** — _needs design._ Transcription + per-participant
      feedback; MVP is end-of-conversation feedback on a recording. Same "here's
      what you meant to say" model as writing review.
      **Reuse `packages/core/src/writing.ts`**: `WritingFinding` and
      `WritingCardCandidate` deliberately say nothing about writing, because
      per-utterance feedback is the same job on a different capture. A parallel
      copy is the drift that put `reviewQueue`/`drill`/`reminders` in core.
      Now carries a third job: **spoken** grammar-pattern practice waits on this,
      since the app has no ASR at all and solving capture twice is the same drift.
      Scope the three together.

- [ ] **Writing review: iterate past v1.** Nothing here blocks anyone.
      - A multi-sentence rewrite is handed to `PronounceButton` untested — far
        longer than that button has had, and Google TTS has length limits.
      - Card backs still occasionally arrive as two glosses where one would do.
        The rule permits two for necessity; the model reads it generously.
      - Findings aren't streamed — `/api/writing` is a single JSON call, so a long
        passage sits on a spinner. The upgrade is NDJSON-per-finding, exactly
        `examples-stream` + `parseStreamedExamples`.
      - `/api/writing` has no `try`/`catch`, so an outage or malformed response is
        a 500. `/api/explain` has the same exposure — fix together or not at all.

- [ ] **Should `/api/explain` allow two glosses too?** Surfaced 2026-07-31 by the
      writing-review rule. `/api/explain` still says "single best translation" in
      six prompt branches (12 templates). The reasoning that relaxed one applies,
      but changing the core lookup loop is a bigger blast radius than a new
      surface. Decide deliberately; if yes, all branches move together.

## Parked — generation features

Deprioritized 2026-07-24. Both generate word lists for a user who hasn't asked for
a specific word — a different, unproven job from the core loop.

- [ ] **Goal-based vocab lists: ambiguity + placement** — ambiguous terms are
      silently skipped (add a picker, or pass the goal to `/api/explain` as
      context); move generation out of the Import button. Decide placement first.
- [ ] **Card generation (goal-based)** — Learn has a coming-soon placeholder. Lean
      surface: goal input → checkboxes → one free-text refine field → save.
      `/api/vocab-list` already takes `previousWords` + `feedback`.

## Housekeeping — tooling that hides signal

`npm test` (200/200) and `npx eslint .` (0 errors) are green. What's left is what
those two now *show*.

- [ ] **13 React Compiler warnings, then turn the rules back up** —
      `react-hooks/set-state-in-effect` (11) and `react-hooks/immutability` (2),
      and they're real: a `useEffect` calling `setState` synchronously renders
      twice on mount. Set to `warn` so landing the lint fix didn't mean landing 13
      rushed ones. Most want `useSyncExternalStore`, so each is a small design
      call, not a mechanical edit. Clear them, then delete the override —
      **don't silence them further**, which is the failure mode the override exists
      to avoid.
- [ ] **Five more warnings accumulated since** (total 18) and are *not* covered
      above: two dead bindings in `decks/[packId]/{page,drill/page}.tsx`, two
      `<img>` that should be `next/image` (`Header`, `SideNav`), one missing dep
      in `cards/page.tsx`.
- [ ] **Lint covers `apps/web` only** — core and mobile have no `lint` script, so
      `turbo lint` runs one package and reports success. Honest today, misleading
      the moment it gates CI. Mobile needs `eslint-config-expo`, core a small flat
      config. Do it with the CI gate, not before.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.
