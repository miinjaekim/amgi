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

- [ ] **Grammar patterns — mobile parity.** ⭐ _Built, trialled and scoped closed
      on web: PR #84, 2026-08-08 → 09._ Web is done and every design question is
      settled or recorded; only the port is left.

      Read before starting: **`docs/grammar-research.md`**, which the design is
      derived from, then the grammar Decisions entries in
      [status.md](status.md), newest first — including what was cancelled and
      why. A pattern is its own object with its own review verb: a cloze until
      it sticks, then free production. `kind` decides only whether it ever makes
      that second step.

      **JS-only, so it rides a build rather than needing one.**
      `buildReviewCollections` on mobile already passes `[]`. Two things to carry
      across that are easy to miss:

      - Mobile still offers "+ card" on a pattern finding, because
        `/api/writing` emits `card` alongside `pattern` precisely so the shipped
        build doesn't lose the take-away to a field it can't read. **That crutch
        comes out with parity**, replaced by the rule in web's
        `WritingReviewPanel`: a card shows beside a pattern only when it is a
        `gap` card.
      - Copy-to-clipboard on the writing rewrite is web-only. Mobile needs
        `expo-clipboard`, which is **native** and so a build — free if it rides
        one already queued, a build of its own otherwise.

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
