# Backlog

Open work only, ordered by priority. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to Decisions in [status.md](status.md) **with its reasoning**, so a closed call
doesn't get reopened from here. Priority mirrors the user's Google Tasks list;
this is the scoped version of it.

**Mobile ships by build — no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. Once one native module is in a
build, a second rides along free rather than costing a build of its own.
**Android auth work is the exception**: it cannot run in Expo Go, so it needs a
development build — and Android release builds face no review, so a fix there
costs ~20 minutes rather than an App Review cycle.

---

## Queued for the next build

Nothing. 1.4.0 (build 13) is approved for external testing and carries
everything merged to date, on both platforms — the first time that has been true.

- **Delete `packages/core/src/writing.ts`, `grammar.ts` and the two API routes
  that keep them alive.** **The gate is open**: it was "once no build predating
  the 2026-08-18 grammar removal is still in use", and 1.4.0 is that build. What
  is left is not a condition but a fact to check — that testers have actually
  updated, since an un-updated 1.3.0 device still has the UI compiled in and
  calls those routes. Both files carry a `DO NOT DELETE AS DEAD CODE` header;
  the reasoning is in [status.md](status.md).

⚠️ **Read what testers report, rather than testing by hand.** These are the
oldest open items in the project — never checked on any release, only in Expo Go
— and 1.4.0's What to Test asks for them by name, with **offline review first**:

- Native paths: pronunciation audio, CSV/Anki export, sharing, offline review
  across a force-kill and reconnect, account deletion against the production
  `EXPO_PUBLIC_API_BASE_URL`, and the review reminder firing *and then
  disappearing* once you review.
- Three renders never seen on a device: the packs list without per-pack
  descriptions, the "showing results for…" row, the part-of-speech badge.
  Cosmetic risk only — spacing, fit, wrapping.
- **Korean date formatting** in the progress day tooltip — nothing else in the
  app formats a date with a locale and options, so Hermes' `Intl` is unproven
  there on a release build.
- All of the above is **separately unverified on Android**, where only sign-in
  has been exercised.

**Pre-flight:** smoke-test in Expo Go → verify the native-adjacent things on the
build itself → bump `version` in `app.json` **before** starting the build (EAS
auto-increments the *build* number and never the version, so nothing catches this
for you) → rewrite What to Test in `docs/testflight-beta-info.md` and re-check
the rest of it — **the description and the Apple review notes go stale too**, and
1.4.0 shipped with both still describing features removed in August → **`expo
config --type introspect` if any native module was added**, which is where an
unasked-for entitlement shows up before a cloud build finds it → submit
(`ascAppId` is in `eas.json`) → paste the listing copy into Test Information,
**both ko and en**.

⚠️ **Cut the build without `--non-interactive`.** It does not skip prompts, it
turns one into an error — 1.4.0 died on an unanswerable Apple Team ID question
and burned build 12. The flag is for CI.

_A version bump queues another Beta App Review; 1.4.0's external approval covers
1.4.0 only. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._

## High

- [ ] **Approve the three new pack word lists** (2026-08-24, branch
      `feat/vocab-packs-daily-idioms-kanji`). Everyday English (149), English
      Idioms (100) and Kanji 教育漢字 1–2 (240) are authored, registered, tested
      and drafted in `docs/packs/{daily-life,idioms,kanji}-pack-draft.md`.
      **Nothing ships until the lists are signed off** — that gate is the whole
      of what is left. Each draft leads with the calls that need a decision.
      What was settled while building them:
      - **The daily-life pack sets aside "audience is not beginners"** — asked
        for that way and recorded as a deliberate exception, not a change of
        principle. It stays inside the *spirit* of the rule by filtering
        **concrete over frequent**: `faucet`, `drawer`, `leftovers`, `errand`,
        not `happy`/`wait`/`always`. A future pack citing this as precedent is
        citing an exception.
      - **The idioms pack confirmed the backs prediction.** An idiom's back is a
        usage note, and the Korean back is the nearest Korean 관용구 where one
        lands on the same occasion (설상가상, 전화위복, 식은 죽 먹기). Every
        entry also carries an `idiom — …` context hint, which is the TOPIK
        convention; a test enforces the prefix *and* a minimum length, because
        the failure mode is the hint quietly decaying back into the gloss. It
        caught four on the first run.
      - **The kanji pack is the JLPT gap answered with the school list instead**
        — 教育漢字 grades 1–2, verified character-for-character against
        文部科学省's 学年別漢字配当表 in a test. N5 is a subset of it. Its back is
        `meaning — kun / ON`, the only pack whose back is not a gloss, which is
        also why it is the first single-glyph pack laid out as a *list*. That
        costs the grid decks' exemption from the "All" chip on the card list —
        240 kanji cards will sit alongside the user's own words there. Named in
        the draft as the one open design question.

- [ ] **Typed responses during review** — _needs design, together._ Today review
      is flip-and-rate; this makes the learner produce the word before seeing it.
      The obvious win is recall over recognition; the obvious problem is grading.
      To settle before any code:
      - **What counts as right.** Exact match is too harsh (accents, spacing,
        articles, 조사), model grading costs a call per card and can't run
        offline. A normalize-then-compare pass with a "close enough" tier is the
        cheap middle, and may be enough on its own.
      - **How it meets SM-2.** Does the typed result *become* the rating, or does
        the learner still rate themselves afterwards? This decides whether it is
        an `sm2.ts` change or purely a capture surface.
      - **Which direction, and whether it is a mode or a per-card thing.**
        Typing the target language is the useful half; typing the gloss is much
        weaker.
      - **Offline.** Whatever grades it has to work with no network, or typing
        silently degrades on exactly the commute where review happens.
      Related but distinct from the word-learning surface under Medium — that one
      is about meeting a word *before* it's due, this is about how it's tested
      once it is.

## Medium

- [ ] **Word of the day returns synonym lists where cards refuse them.** Found
      while verifying Kikuyu, then cross-checked — it is not language-specific:
      `gũcoka` came back as "to return; to do again; to recover", `délai` as
      "deadline, time limit, period", `sedan` as "since, then, ago". `/api/explain`
      forbids exactly this ("Never list synonyms with semicolons or slashes") and
      the two-gloss rule allows a *second* gloss only where one would mislead;
      `word-of-the-day/route.ts:138` just asks for "the best English translation"
      with no such rule, so a saved word-of-the-day card gets a back the lookup
      path would never have produced. The fix is the missing rule, not a new one —
      but decide first whether the ceiling is one gloss or the two the card rule
      already allows.

- [ ] **Word learning surface — meet a word before it's due.** A new card is
      immediately due in *both* directions (`isDue` returns both when neither is
      tracked, `sm2.ts:23`), so a word goes from saved to graded review with no
      first encounter in between. This is the surface for that: see it, hear it,
      use it once, *then* let SM-2 have it.
      Open before building: whether it writes scheduling at all or is purely a
      presentation step. If it writes, it is an `sm2.ts` change.

- [ ] **Vocabulary packs — iterate beyond v1.** Shipped: TOEIC, kana, TOPIK 고급,
      two military packs, all one pre-authored kind. Authored and awaiting
      approval: Everyday English, English Idioms, Kanji 1–2 (see High).
      *Principles:* audience is not beginners — **one recorded exception, the
      daily-life pack, deliberate and not a precedent**; packs unlock domains,
      never "starter" anything; curated from real sources, not AI-generated; word
      lists need user approval before shipping.
      *Next:* **TOEFL**, now that the Japanese gap is answered by the kanji pack
      (教育漢字 1–2 rather than JLPT — N5 is a subset of it, so an exam-ladder
      pack is a re-sectioning, not a re-authoring). Swedish, French and
      Traditional Chinese still have **no pack at all**.
      A new pack needs backs drafted alongside its word list; drafts live in
      `docs/packs/`. Section themes as `/cards` filters are a third rung on the
      deck axis that already shipped, not a new control.

- [ ] **Shared term cache** — a `terms` collection keyed by normalized term +
      language, so a word looked up once is free for everyone after.
      `docs/local-model.md` §8 names it the cheapest useful first step, ahead of
      any model work: it buys instant lookups, an offline story and near-zero
      marginal cost with **no build, no native module and no quality risk**, and
      unlike on-device it works on web too. Copies `/api/pronounce`'s
      content-hash pattern **including its lesson that a bad generation becomes
      permanent** — decide the invalidation story before writing the first
      document.

- [ ] **Precompute depth and examples for the packs** — ~600 model calls, an
      afternoon, one throwaway script. Best done *after* the term cache, which is
      where the results would live.

- [ ] **`/api/explain` has no `try`/`catch`**, so an outage or a malformed
      response is a 500 rather than a handled error.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's blocked.

## Bigger bets

- [ ] **Should `/api/explain` allow two glosses?** It still says "single best
      translation" across six prompt branches (12 templates), while a card back is
      allowed up to two when one would mislead. Changing the core lookup loop has
      a bigger blast radius than a new surface, so decide deliberately — and if
      yes, all branches move together.

## Parked

- [ ] **Goal-based generation** — vocab lists and card generation from a goal.
      Deprioritized 2026-07-24: it generates word lists for a user who hasn't
      asked for a specific word, a different and unproven job from the core loop.
      `/api/vocab-list` exists and takes `previousWords` + `feedback`.

## Housekeeping — tooling that hides signal

`npm test` (252/252, measured 2026-08-22) and `npx eslint .` (0 errors) are
green. What's left is what those two now *show*.

- [ ] **The Google consent screen says "Amgi AI".** Rename it to **Amgi** in the
      Google Cloud OAuth consent screen → Branding → App name. Console-side, no
      build, no code — but it is shown to **every** user signing in, on iOS and
      web as much as Android.

- [ ] **Two callerless functions in `apps/web/src/services/firestore.ts`** —
      `countUserFlashcards` and `fetchArchivedFlashcards`, neither imported
      anywhere. Unlike `writing.ts`/`grammar.ts` these have **no build to keep
      alive**: they are web-only, so nothing pins them. Left in place while the
      subscribe change was landing to keep that diff to one subject.
- [ ] **20 lint warnings.** 13 React Compiler
      (`react-hooks/set-state-in-effect` ×11, `react-hooks/immutability` ×2) and
      they're real: a `useEffect` calling `setState` synchronously renders twice
      on mount. Most want `useSyncExternalStore`, so each is a small design call,
      not a mechanical edit. Set to `warn` so landing the lint fix didn't mean
      landing 13 rushed ones — clear them, then delete the override, and
      **don't silence them further**. The other five: two dead bindings in
      `decks/[packId]/{page,drill/page}.tsx`, two `<img>` that should be
      `next/image` (`Header`, `SideNav`), one missing dep in `cards/page.tsx`.
- [ ] **Lint covers `apps/web` only** — core and mobile have no `lint` script, so
      `turbo lint` runs one package and reports success. Honest today, misleading
      the moment it gates CI. Mobile needs `eslint-config-expo`, core a small flat
      config. Do it with the CI gate, not before.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.
