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

**One item queued: PR #80** (merged 2026-08-04) — `/cards` holds pack cards, the
mobile filter sheet, the first skeletons. JS-only, no native module, so no
`expo config --type introspect` pass. 1.2.0 carries everything before it. See
Builds in [status.md](status.md) for its contents and for what remains unverified
on a real binary.

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

The three starred items in Google Tasks, in that order.

- [ ] **Local model spike — can Amgi run a model on-device?** ⭐ _Absorbs the two
      research entries that used to sit at the bottom of this file: on-device
      definitions/translations, and the survey of existing language-learning
      models. They were the same question asked twice._
      Output is a written answer, not a feature: what open models can do
      definition + translation at Amgi's quality bar, whether they fit on a phone,
      what a first integration would actually replace, and whether fine-tuning
      beats prompting. **Name the cheapest useful first step** — pre-cached
      content for a pack may beat inference on-device and is a fraction of the
      work.
      Read [tech-stack.md](tech-stack.md) first for the constraint that decides
      most of this: **no OTA**, so anything shipping a model ships in a build, and
      a model file is not a small one.

- [ ] **Grammar patterns — start building.** ⭐ _Designed 2026-08-03; the design is
      done and this is now the build._ Read first: the argument in
      [vision.md](vision.md), the design calls in [status.md](status.md), the type
      in [data-model.md](data-model.md). What follows is only staging.

      Today a grammar pattern from a writing finding becomes an ordinary
      `Flashcard` and is reviewed like a noun. The replacement: a pattern is its
      own object and each review is a fresh **production** turn — a situation in
      your native language, you write the sentence, `/api/writing` grades it.

      - **(1a) Web, the cheap door.** `packages/core/src/grammar.ts` — types, a
        tolerant parser, and **two** shared fetches: generating the situation and
        grading are separate round trips (_n_ patterns = _2n_ calls). Grading is
        `/api/writing` unchanged. Entry via the `WritingFinding.pattern?` sibling
        to `card?`. Exercise screen: prompt never naming the pattern, free-text
        production, two-tier hint that clamps the verdict, rewrite shown on every
        verdict. Own row in the Review picker — a *signature change* to
        `buildReviewCollections` plus an identity outside the pack-id namespace,
        not a free call. `sm2.ts` unedited, but read the ease-ratchet warning
        before assuming that means unaffected. Grading failure must never lose the
        learner's typed sentence. One manual Firestore step (`uid + studyLanguage`).
      - **(1b) Web, the expensive door.** The third `ExplainResult` arm on
        `/api/explain` — the cold-start path, and the bulk of the work: six
        language branches × the `if (context)` split = **12 prompt templates**.
        Gates nothing in (1a), so do it second or defer it.
      - **(2) Mobile parity** — JS-only, rides a build rather than needing one.
      - **(3) Later, each independently useful:** produce-offline /
        evaluate-on-reconnect; interleaving patterns into the vocab queue;
        the acquisition signal, which needs ephemeral-submissions reopened.

      **Three things are open**, all listed as such in status.md: whether the
      learner may override a verdict (load-bearing — also the likeliest home for
      the `easy` the ease ratchet otherwise removes), whether patterns interleave
      into the vocab queue, and whether a tier-1 hint is ever offered unprompted.
      **Spoken production is deliberately not here** — see conversation practice.

- [ ] **Military terms pack.** ⭐ The next pack to author, ahead of the JLPT/TOEFL
      gaps listed under packs below. Same rules as every pack: **curated from real
      sources, not AI-generated**, the word list needs user approval before it
      ships, and **backs are drafted alongside the list** — no kind ships without
      them. Draft goes in `docs/packs/`, sourced like the TOEIC and TOPIK drafts.
      Study language is the first thing to settle — Korean is the obvious one
      given the source material, but say so rather than assume it. Section themes
      (rank, equipment, orders, …) are the natural `/cards` filter rung the deck
      axis already supports.

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
      katakana, TOPIK 고급 (160), all now one pre-authored kind.
      *Principles:* audience is not beginners; packs unlock domains, never
      "starter" anything; curated from real sources, not AI-generated; word lists
      need user approval before shipping.
      *Next:* the **military terms pack** is queued above this, under High. After
      it, **JLPT** is the obvious gap — Japanese has only the kana packs, so a
      learner past the scripts has nothing — then TOEFL. Swedish, French and
      Traditional Chinese have **no pack at all**. Section themes as `/cards`
      filters are now a third rung on the deck axis that shipped — a chip per
      section under the pack you picked — not a new control: a fourth group in
      mobile's filter sheet, a third chip row on web.
      **A new pack now needs backs drafted alongside its word list**, since no
      kind ships without them. Drafts live in `docs/packs/`.

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

`npm test` (175/175) and `npx eslint .` (0 errors) are green. What's left is what
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
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Defer until traffic justifies it. Overlaps with pre-authored packs.
