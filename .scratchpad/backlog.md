# Backlog

Open work only, ordered by priority. Shipped, cancelled and decided items move to
[status.md](status.md) **with their reasoning**, so a closed call doesn't get
reopened from this file. Source of truth is the user's Google Tasks list; this is
the scoped version.

**Progress dashboard shipped to web 2026-08-20 (#90)** — the write path and the
first screen are merged and the security rule is live; the item below is now
only recaps plus two corrections deliberately deferred. Mobile has it too, but
mobile ships by build, so it sits in Queued below.
**Synced with Google Tasks 2026-08-12; High reworked 2026-08-18.** Tasks listed
six open items. Of the three starred, two survive under High in reworked form —
*Review page discrepancy* is now **Data loading and freshness** (it was never one
page's bug) and *improve stats* is now **Progress dashboard** — and *Word order
practice* is **cancelled**, since grammar was removed from the app entirely
(2026-08-18); its reasoning is in [status.md](status.md). Unstarred are
*Add Spanish* (under Medium), *Word learning surface* and *grid view for cards*
(both already here). Everything else
below — packs, the term cache, precompute, offline capture, the Bigger bets, the
parked generation features and all of Housekeeping — **is not in Tasks**. That is
not the same as closed, so none of it was removed: nothing here has a decision
recorded against it, and the convention is that a closed item leaves with its
reasoning. Treat the untracked items as ranked below the four Tasks names, and
if any of them is genuinely dead, close it properly into
[status.md](status.md) rather than deleting the bullet.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. Once one native module is in a
build, a second rides along free rather than costing a build of its own.

---

## Queued for the next build

- **Progress dashboard** (#90, merged 2026-08-20) — daily rollups plus a screen
  on both platforms. Mobile changes: the new screen, the streak badge becoming a
  link to it, an AsyncStorage queue for offline increments, and tap/long-press
  day details on the calendar. JS-only, no new native module, so no
  `expo config --type introspect` pass is owed.
  Smoke-tested in Expo Go 2026-08-20 and clean. Two things that pass in Expo Go
  and still deserve a look on the binary: **offline increments across a
  force-kill and reconnect** (the queue is the point of that code, and Expo Go's
  networking is not the phone's), and **Korean date formatting** in the day
  tooltip — nothing else in the app formats a date with a locale and options, so
  Hermes' `Intl` behaviour there is unproven on a release build.

1.3.0 (build 11) went out 2026-08-11 and was approved for external testing on
08-12 — the six PRs it carried are shipped and have left this file for the
Shipped list in [status.md](status.md).

⚠️ **Verify on the binary before the next build goes out.** These are the oldest
open items in the project — never checked on any release, only in Expo Go — and
1.3.0 is the first build in enough hands to close them cheaply, from what testers
report rather than by hand:

- The native paths: pronunciation audio, CSV/Anki export, sharing, offline review
  across a force-kill and reconnect, account deletion against the production
  `EXPO_PUBLIC_API_BASE_URL`, the review reminder firing *and then disappearing*
  once you review, and the writing-rewrite copy button (`expo-clipboard`, new in
  1.3.0).
- The three renders never seen on a device: #81's packs list without per-pack
  descriptions, #87's "showing results for…" row, #88's part-of-speech badge.
  Cosmetic risk only — spacing, fit, wrapping.

**Pre-flight, for next time:** smoke-test in Expo Go → verify the native-adjacent
things on the build itself → bump `version` in `app.json` **before** starting the
build, not after → rewrite What to Test in `docs/testflight-beta-info.md` and
re-check the rest of it → **`expo config --type introspect` if any native module
was added**, which is where an entitlement you didn't ask for shows up before a
cloud build finds it → submit (`ascAppId` is in `eas.json`) → paste the listing
copy into Test Information, **both ko and en localizations**.

_The version-bump ordering earned its place on 2026-08-11: the 1.3.0 build was
started against an `app.json` still reading 1.2.0, and had to be restarted. EAS
auto-increments the **build** number but never the version, so nothing catches
this for you._

_A version change means another Beta App Review. 1.3.0's external approval covers
1.3.0 — new external testers can be invited under it freely, but the next version
bump queues for review again, so it is worth batching rather than cutting builds
one feature at a time._

_The listing check earned its place on 2026-07-27: it still advertised five study
languages after Traditional Chinese made six, and said nothing about account
deletion — which Apple looks for under 5.1.1(v)._

## High

Three new starred items, synced from Google Tasks 2026-08-12. Listed in the
order Tasks shows them, which is recency and not a ranking — pick by what the
notes below say, not by position. The previous High pair (spellcheck #87, term
archiving #86) shipped 2026-08-10 and is in [status.md](status.md).

- [ ] **Data loading and freshness** — reframed 2026-08-18, on the user's read.
      This came in as "review page discrepancy", a bug on one page. It is not:
      **every surface owns a private copy of the data and nothing tells any of
      them when it changes.** The discrepancies are the symptom of that, which is
      why they show up somewhere new each time — a stale review deadline, a
      streak that disagrees with itself, a card saved and not shown.
      *Understand this before building anything; no implementation yet.*

      **What the code actually does today.** There is no cache layer and no query
      layer — every screen is `useState` + a `fetch…()` in an effect:
      - Web: `cards/page.tsx:73`, `decks/page.tsx:21`, `review/page.tsx:144` each
        fetch independently. **Web never refetches on navigation** — a surface
        shows whatever it loaded when it mounted.
      - Mobile: `useFocusEffect` + a hand-rolled `reloadToken`
        (`review.tsx:153`, `cards.tsx:85`) — refetch-on-focus, reimplemented per
        screen.
      - Streak is worse than stale, it is *divergent*: `UserContext` holds
        `streak`/`reviewedToday`/`lastReviewDate` as local state read once at
        auth (`UserContext.tsx:85`), then `recordReview()` increments the local
        copy and writes the doc (`:152`). The chip is a local counter, so a
        second device or a mid-session reload disagrees with the document.
      - Mobile has **three** sources for one list — server, the offline cache,
        and the `applyPendingReviews` overlay — where web mirrors a rating
        inline (`review/page.tsx:273`). Two implementations of one job, already
        caught by the `removeCardFromQueue` entry in [lessons.md](lessons.md).

      **The question to answer first: invalidate or subscribe.**
      - *Invalidate* — the mainstream answer is a server-state cache with query
        keys and explicit invalidation (TanStack Query, SWR): one cache entry per
        `(uid, studyLanguage, view)`, a write invalidates its keys, refetch on
        focus/reconnect is built in rather than hand-rolled, and optimistic
        updates get rollback for free. Replaces both the per-screen effects and
        `reloadToken`.
      - *Subscribe* — **worth weighing seriously because it is already paid
        for**: they are on Firestore, so `onSnapshot` deletes the invalidation
        problem instead of managing it. Every surface converges without anyone
        remembering to invalidate. Costs are real and should be measured, not
        assumed: read billing on long-lived listeners, and it argues with
        mobile's offline cache + pending queue, which exists for a reason.
      The honest answer is likely both — subscribe for the small hot documents
      (the user doc, so the streak stops being a local counter) and cache +
      invalidate for the card lists. **Decide the counts question too:** which
      number is the true one when two surfaces legitimately count differently.

      **Separately, and don't let it hide in here: one real query bug.**
      `fetchUserFlashcards` filters `where('archived', '!=', true)` +
      `orderBy('archived')` (`apps/web/src/services/firestore.ts:122`, mirrored
      at `apps/mobile/src/services/firestore.ts:110`), and **`!=` excludes
      documents where the field is missing.** `migrateExistingCards` never
      backfilled it, so a card older than the field is invisible in review *and*
      in the archived list — it exists and appears nowhere. This is
      [lessons.md](lessons.md)'s own "backfill new boolean fields" gotcha,
      unbackfilled. **The fix is a backfill, not a query rewrite**, and it is
      independent of everything above. Review is also the only surface that
      filters `archived` at all — every other reader calls
      `fetchAllUserFlashcards`, so deck counts include archived cards where the
      review row for the same deck excludes them.

- [ ] **Progress dashboard — recaps, and two deferred corrections.** The write
      path and the first screen shipped in #90 (2026-08-20); the shape and the
      four calls behind it are in [status.md](status.md) and
      [data-model.md](data-model.md). The security rule is live. What is left:

      - **Recaps** were part of the original ask and are the only genuinely
        unbuilt piece. A weekly or monthly "here's how it went" needs **no new
        write** — the rollups already carry everything it would say — so this is
        a screen-and-copy item, not a data one. Cheapest next step here.
      - **Swap the streak to the derived one.** The dashboard shows the stored
        counter today, because the rows started empty on 2026-08-20 and deriving
        it would have shown `1` to someone on a long streak. `deriveStreak` is
        written and tested in core for that day. The swap is safe once the
        history outlives the longest live streak — **so not before roughly
        November 2026**, and it is what finally stops the streak being a local
        counter two devices can disagree about.
      - **`reviewedToday` still counts directions, not cards** — roughly double
        what a learner thinks they did. The rollup deliberately matches it rather
        than quietly disagreeing. Fixing it is a user-visible call that should
        change both counters at once, or neither.
      - **Per-language streaks stay unbuilt on purpose**, not by omission: the
        habit is "studied today". The per-language detail lives inside each day
        and the dashboard already renders it.

      ⚠️ **History began 2026-08-20.** The dashboard is near-empty by
      construction for weeks, and no amount of backfill fixes it — new cards per
      day could be reconstructed from `createdAt`, review history cannot be
      reconstructed from anything. Don't read the sparse calendar as a bug.

## Medium

- [ ] **Add Spanish** — a seventh study language, and the first added since
      Traditional Chinese. Spanish is **Latin script**, so it follows the
      Swedish/French path and not the Korean/Japanese one: `/api/explain` needs
      the two-template branch that has Gemini set `termLanguage` itself, because
      script detection can't do it client-side
      (`api/explain/route.ts:100` is the Swedish original, `:166` the French
      copy). `gender` already exists as a per-language string — `en`/`ett` for
      Swedish, `le`/`la` for French — so `el`/`la` needs no new field.
      The rest is the known checklist, ~32 non-test references to `Swedish` as
      the map: a `STUDY_LANGUAGE_CONFIGS` entry with `collection:
      'cards_spanish'` and an `es-ES` Chirp3 voice (`types.ts:92`),
      `labelSpanish` in both i18n locales, `EXAMPLE_TERMS` on web and mobile
      home, and the `word-of-the-day` branch.
      **Two steps are outside the codebase and nothing in CI catches either:**
      Firestore security rules are per-collection with no wildcards, and the
      `archived + createdAt` composite index has to exist for `cards_spanish`
      or every review query on it fails. Both are in [lessons.md](lessons.md).
      Note there is **no pack** for Spanish, as with Swedish and French — see
      the packs item below.

- [ ] **Word learning surface — meet a word before it's due.** A new card is
      immediately due in *both* directions (`isDue` returns both when neither is
      tracked, `sm2.ts:23`), so a word goes from saved to graded review with no
      first encounter in between. This is the surface for that first encounter:
      see it, hear it, use it once, *then* let SM-2 have it.
      Open before building: whether this writes scheduling at all or is purely a
      presentation step; if it writes, it is an `sm2.ts` change and the ease
      ratchet warning in the grammar item applies here too.

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

`npm test` (313/313, measured 2026-08-12) and `npx eslint .` (0 errors) are
green. What's left is what those two now *show*.

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
