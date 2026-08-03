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

**Nothing queued.** 1.2.0 carries every merged mobile change; `main` has only
docs since. See Builds in [status.md](status.md) for its contents and for what
remains unverified on a real binary.

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

- [ ] **Loosen the `/cards` filter** — decided 2026-08-01, not built; the last
      structural piece of the pack work. Today a card belongs to a pack *or* to
      your list; it should belong to both.
      - `/cards` stops filtering at load and holds every card for the language.
      - **Default view hides grid-layout packs only** — kana today. Keyed on
        `pack.layout === 'grid'`, not on pack ids, so a future single-character
        pack inherits the rule. A word you can look up is vocabulary; a
        107-character drill set would swamp the list.
      - A deck dimension reaches everything: `All / Mine / <each enrolled deck>`.
        A **second axis**, orthogonal to `FilterKey` (`active | archived | all`) —
        not another chip in that row. Conflating them is the easy mistake.
      - **Export follows the visible filter**, which deliberately leaves the
        Export item under Medium open.
      - **Review must not change.** Verified 2026-08-01: the coupling is one
        `.filter()` per platform at load and nothing else.
      - Both platforms carry a comment asserting the *old* rule
        (`cards/page.tsx:48-52`, `cards.tsx:48-52`). It encodes the reasoning
        being reversed — rewrite it, don't delete it.

- [ ] **Onboarding: contextual tips** — the other half of the item whose *first
      run* shipped. **Largely answered by PR #74**: the "?" on Learn, Packs and
      Review is pull help and needs **no record of who has seen what**, which was
      the blocker. Still unexplained: **drill, export, archive, and the Cards
      page's two filter axes** — reach for another "?" before reaching for stored
      state. Only a genuinely *pushed* tip brings the original problem back
      (somewhere to record "seen tip X", plus a per-tip trigger that can't fire
      before its feature exists for that user).

- [ ] **Skeletons instead of spinners** — mobile has 23 `ActivityIndicator` uses
      and one skeleton. Worst placement is the full-screen spinner a cold launch
      opens on (`apps/mobile/app/(tabs)/index.tsx:370`, gated on `authLoading`):
      first impression, whole screen, nothing on it. Web already skeletons the
      WOTD card with `animate-pulse`, so the pattern exists to copy.
      Order: (1) the `authLoading` spinner, (2) card and review lists, which have
      a known row shape, (3) leave in-button spinners alone — the right control
      for a button you just pressed.

## Medium

- [ ] **Vocabulary packs — iterate beyond v1.** Shipped: TOEIC (133), hiragana +
      katakana, TOPIK 고급 (160), all now one pre-authored kind.
      *Principles:* audience is not beginners; packs unlock domains, never
      "starter" anything; curated from real sources, not AI-generated; word lists
      need user approval before shipping.
      *Next:* **JLPT** is the obvious gap — Japanese has only the kana packs, so a
      learner past the scripts has nothing — then TOEFL. Swedish, French and
      Traditional Chinese have **no pack at all**. Section themes as `/cards`
      filters fold into the loosening item above.
      **A new pack now needs backs drafted alongside its word list**, since no
      kind ships without them. Drafts live in `docs/packs/`.

- [ ] **Export covers only your own cards** — noticed in PR #51, not decided. A
      CSV/Anki dump omits every pack card. Consistent with what `/cards` means,
      but a *backup* that silently drops 107 kana is a different thing. Either an
      export on the deck page or an "include pack cards" option — pick one
      deliberately. Kept separate from the `/cards` loosening on purpose:
      widening the load would resolve it as a silent side effect, and "the same
      tap now yields 107 more cards" isn't a change to make by accident. Once the
      filter is loosened it's no longer a new mechanism, just a choice of axis.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's blocked.

## Bigger bets

- [ ] **Grammar patterns — exercise, don't flashcard.** _Designed 2026-08-03;
      ready to build._ Read first: the argument in [vision.md](vision.md), the
      design calls in [status.md](status.md), the type in
      [data-model.md](data-model.md). What follows is only staging.

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

## Research / exploratory

- [ ] **Offline definitions/translations** — the hard phase of Offline Amgi
      (on-device model or pre-cached content). Never allowed to block the cheap
      offline work, and that held.
- [ ] **Training a language-learning model / survey existing ones** — spike: what
      exists, whether fine-tuning beats prompting, what a first step looks like.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Defer until traffic justifies it. Overlaps with pre-authored packs.
