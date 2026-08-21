# Backlog

Open work only, ordered by priority. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to Decisions in [status.md](status.md) **with its reasoning**, so a closed call
doesn't get reopened from here. Priority mirrors the user's Google Tasks list;
this is the scoped version of it.

**Mobile ships by build — no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. Once one native module is in a
build, a second rides along free rather than costing a build of its own.

---

## Queued for the next build

Merged, but in nobody's hands until a binary carries it.

- **Progress dashboard, mobile half** — the screen, the streak badge as a link to
  it, an AsyncStorage queue for offline increments, tap/long-press day details.
  JS-only, so no `expo config --type introspect` pass is owed. Smoke-tested in
  Expo Go 2026-08-20 and clean. Two things that pass in Expo Go and still deserve
  a look on the binary: **offline increments across a force-kill and reconnect**
  (that queue is the point of the code, and Expo Go's networking is not the
  phone's), and **Korean date formatting** in the day tooltip — nothing else in
  the app formats a date with a locale and options, so Hermes' `Intl` there is
  unproven on a release build.
- **Delete `packages/core/src/writing.ts`, `grammar.ts` and the two API routes
  that keep them alive** — once no build predating the 2026-08-18 grammar removal
  is still in use, i.e. after the next build ships and testers update. Both files
  carry a `DO NOT DELETE AS DEAD CODE` header; the condition and the reasoning
  are in [status.md](status.md).

⚠️ **Verify on the binary before the next build goes out.** These are the oldest
open items in the project — never checked on any release, only in Expo Go — and
1.3.0 is the first build in enough hands to close them from what testers report:

- Native paths: pronunciation audio, CSV/Anki export, sharing, offline review
  across a force-kill and reconnect, account deletion against the production
  `EXPO_PUBLIC_API_BASE_URL`, and the review reminder firing *and then
  disappearing* once you review.
- Three renders never seen on a device: the packs list without per-pack
  descriptions, the "showing results for…" row, the part-of-speech badge.
  Cosmetic risk only — spacing, fit, wrapping.

**Pre-flight:** smoke-test in Expo Go → verify the native-adjacent things on the
build itself → bump `version` in `app.json` **before** starting the build (EAS
auto-increments the *build* number and never the version, so nothing catches this
for you) → rewrite What to Test in `docs/testflight-beta-info.md` and re-check
the rest of it, including the study-language count → **`expo config --type
introspect` if any native module was added**, which is where an unasked-for
entitlement shows up before a cloud build finds it → submit (`ascAppId` is in
`eas.json`) → paste the listing copy into Test Information, **both ko and en**.

_A version bump queues another Beta App Review; 1.3.0's external approval covers
1.3.0 only. Batch changes into a build rather than cutting one per feature._

## High

- [ ] **Data loading and freshness** — reframed 2026-08-18. This came in as
      "review page discrepancy", a bug on one page. It is not: **every surface
      owns a private copy of the data and nothing tells any of them when it
      changes.** The discrepancies are the symptom, which is why they show up
      somewhere new each time — a stale review deadline, a streak that disagrees
      with itself, a card saved and not shown.
      *Understand this before building anything; no implementation yet.*

      **What the code does today.** No cache layer, no query layer — every screen
      is `useState` + a `fetch…()` in an effect:
      - Web: `cards/page.tsx:73`, `decks/page.tsx:21`, `review/page.tsx:144`
        fetch independently, and **never refetch on navigation**.
      - Mobile: `useFocusEffect` + a hand-rolled `reloadToken`
        (`review.tsx:153`, `cards.tsx:85`) — refetch-on-focus, per screen.
      - Streak is *divergent*, not merely stale: `UserContext` reads
        `streak`/`reviewedToday`/`lastReviewDate` once at auth
        (`UserContext.tsx:85`), then `recordReview()` increments the local copy
        and writes the doc (`:152`). A second device or a mid-session reload
        disagrees with the document.
      - Mobile has **three** sources for one list — server, offline cache, and
        the `applyPendingReviews` overlay — where web mirrors a rating inline
        (`review/page.tsx:273`).

      **The question to answer first: invalidate or subscribe.** *Invalidate* is
      the mainstream answer (TanStack Query / SWR): one entry per `(uid,
      studyLanguage, view)`, writes invalidate keys, refetch-on-focus and
      optimistic rollback come free, replacing both the per-screen effects and
      `reloadToken`. *Subscribe* is **already paid for** — they are on Firestore,
      so `onSnapshot` deletes the invalidation problem instead of managing it;
      costs are read billing on long-lived listeners and friction with mobile's
      offline cache + pending queue, and should be measured rather than assumed.
      Likely both: subscribe for the small hot documents (the user doc, so the
      streak stops being a local counter), cache + invalidate for card lists.
      **Decide the counts question too** — which number is true when two surfaces
      legitimately count differently.

      **Separately, and don't let it hide in here: one real query bug.**
      `fetchUserFlashcards` filters `where('archived', '!=', true)` +
      `orderBy('archived')` (`apps/web/src/services/firestore.ts:122`, mirrored
      at `apps/mobile/src/services/firestore.ts:110`), and **`!=` excludes
      documents where the field is missing**. `migrateExistingCards` never
      backfilled it, so a card older than the field is invisible in review *and*
      in the archived list. **The fix is a backfill, not a query rewrite**, and it
      is independent of everything above. Review is also the only surface that
      filters `archived` at all, so deck counts include archived cards where the
      review row for the same deck excludes them.

- [ ] **Progress dashboard — recaps, plus two deferred corrections.** The write
      path and the first screen shipped 2026-08-20; the shape and the four calls
      behind it are in [status.md](status.md) and [data-model.md](data-model.md).
      - **Recaps** are the only genuinely unbuilt piece and the cheapest next step
        here. A weekly or monthly "here's how it went" needs **no new write** —
        the rollups already carry everything it would say.
      - **Swap the streak to the derived one.** `deriveStreak` is written and
        tested; the dashboard shows the stored counter because the rows started
        empty. Safe once the history outlives the longest live streak — **not
        before roughly November 2026** — and it is what finally stops the streak
        being a local counter two devices can disagree about.
      - **`reviewedToday` counts directions, not cards** — roughly double what a
        learner thinks they did. The rollup deliberately matches it rather than
        quietly disagreeing. Fixing it is a user-visible call that changes both
        counters at once, or neither.
      - Per-language streaks stay unbuilt on purpose: the habit is "studied
        today". Per-language detail lives inside each day and already renders.

## Medium

- [ ] **Add Spanish** — a seventh study language. Latin script, so it follows the
      Swedish/French path: `/api/explain` needs the two-template branch that has
      Gemini set `termLanguage` itself, because script detection can't do it
      client-side (`api/explain/route.ts:100` Swedish, `:166` French). `gender`
      already exists as a per-language string, so `el`/`la` needs no new field.
      The rest is the known checklist, ~32 non-test references to `Swedish` as
      the map: a `STUDY_LANGUAGE_CONFIGS` entry with `collection:
      'cards_spanish'` and an `es-ES` Chirp3 voice (`types.ts:92`),
      `labelSpanish` in both i18n locales, `EXAMPLE_TERMS` on web and mobile
      home, and the `word-of-the-day` branch.
      **Two steps are outside the codebase and nothing in CI catches either:**
      Firestore security rules are per-collection with no wildcards, and the
      `archived + createdAt` composite index has to exist for `cards_spanish` or
      every review query on it fails. Both are in [lessons.md](lessons.md).

- [ ] **Word learning surface — meet a word before it's due.** A new card is
      immediately due in *both* directions (`isDue` returns both when neither is
      tracked, `sm2.ts:23`), so a word goes from saved to graded review with no
      first encounter in between. This is the surface for that: see it, hear it,
      use it once, *then* let SM-2 have it.
      Open before building: whether it writes scheduling at all or is purely a
      presentation step. If it writes, it is an `sm2.ts` change.

- [ ] **Vocabulary packs — iterate beyond v1.** Shipped: TOEIC, kana, TOPIK 고급,
      two military packs, all one pre-authored kind.
      *Principles:* audience is not beginners; packs unlock domains, never
      "starter" anything; curated from real sources, not AI-generated; word lists
      need user approval before shipping.
      *Next:* **JLPT** is the obvious gap — Japanese has only the kana packs —
      then TOEFL. Swedish, French and Traditional Chinese have **no pack at all**.
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

- [ ] **Conversation practice** — _needs design._ Transcription + per-participant
      feedback; MVP is end-of-conversation feedback on a recording. Same "here's
      what you meant to say" model as writing review was.
      The app has **no ASR at all** — TTS out, nothing in. Web has Web Speech;
      mobile needs a native module, so a build of its own.
      `WritingFinding`/`WritingCardCandidate` in `packages/core` say nothing about
      writing on purpose, because per-utterance feedback is the same job on a
      different capture — reuse them rather than writing a parallel copy, which is
      the drift that put `reviewQueue`/`drill`/`reminders` in core. ⚠️ Those types
      are currently callerless and scheduled for deletion (see the queued item
      above); if this lands after that, they come back from git.

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

`npm test` (246/246, measured 2026-08-21) and `npx eslint .` (0 errors) are
green. What's left is what those two now *show*.

- [ ] **18 lint warnings.** 13 React Compiler
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
