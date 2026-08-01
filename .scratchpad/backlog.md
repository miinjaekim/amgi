# Backlog

Ordered by priority. **Only open work lives here** — shipped, cancelled and
decided items move to [status.md](status.md), reasoning included, so a closed
call doesn't get reopened from this file. Source of truth is the user's Google
Tasks list; this is the scoped version. Last synced 2026-07-30.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. See [tech-stack.md](tech-stack.md).

_The 2026-07-25 focus ("ship the depth work to the phone", with its
no-new-native-modules constraint) is spent — that batch went out in 1.1.0 / build
6 along with `expo-network` and `expo-notifications`. The reasoning it produced
is worth keeping though: once one native module is in a build, a second rides
along for free rather than costing a build of its own._

---

## Queued for the next build

_Last build: **1.1.0 / build 6**, 2026-07-27 — submitted and under review for
external testing._

Merged since, waiting on the next build. All four are JS-only, so no native
module was added and `expo config --type introspect` is not needed this time:

- **Direction choice on mobile Review** (PR #65)
- **A second Learn tab tap clears the search** (PR #66)
- **Writing review, both platforms** (PR #69) — new passage mode on Learn.
  JS-only. Worth testing deliberately on the build: the Word/Passage toggle
  renders in all three of the Learn screen's render paths, and the rewrite's
  `PronounceButton` hands TTS a multi-sentence string, which is longer than
  anything that button has been given before.
- **Card backs follow native language** (PR #67) — the one worth testing
  deliberately; see the What to Test block in
  `docs/testflight-beta-info-ko.md`, which was rewritten for this build.
  Production data was already backfilled and de-duplicated, so a Korean-native
  tester's existing kana cards should read hangul the moment the build lands.
- **TOPIK 고급 pack** (PR #68) — Korean's first pack, so `/decks` is no longer
  the empty state on the app's original study language. Worth a look on the
  build specifically because it's a `lookup` pack: tapping a word has to hand
  off to Learn, which is the deck → Learn round trip that only exists on mobile
  as a stack screen above the tabs.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing, **offline review + reconnect sync**, **account deletion**,
**the review reminder actually firing and then disappearing once you review**)
on the build itself → bump `version` in `app.json` → check
`docs/testflight-beta-info-ko.md` is still accurate → **`expo config --type
introspect` if any native module was added**, which is where an entitlement you
did not ask for shows up before a cloud build finds it.

_The listing check earned its place in this list on 2026-07-27: it still
advertised five study languages after Traditional Chinese made six, and said
nothing about account deletion — which Apple looks for under 5.1.1(v)._


---

## Housekeeping — tooling that hides signal

`npm test` (148/148) and `npx eslint .` (0 errors) are both green on a clean
checkout as of 2026-07-30 — see the Tooling entries in [status.md](status.md).
What is left here is what those two now *show*.

- [ ] **13 React Compiler warnings, then turn the rules back up** — `eslint-config-next@16`
      brought `react-hooks/set-state-in-effect` (11) and `react-hooks/immutability`
      (2), and they are real: a `useEffect` that calls `setState` synchronously
      renders twice on mount. Set to `warn` in `apps/web/eslint.config.mjs` so
      landing the lint fix didn't mean landing 13 rushed ones. Most want
      `useSyncExternalStore` — `useOnlineStatus` reading `navigator.onLine`,
      `review/page.tsx` setting `clientNow` to dodge a hydration mismatch — so
      each is a small design call, not a mechanical edit. Clear them, then
      delete the override; **don't silence them further**, which is the failure
      mode the override exists to avoid.
      _Still exactly 13 as of 2026-07-30 — the override is holding._

- [ ] **Five other warnings have accumulated since** (2026-07-30, total 18) and
      are *not* covered by the item above, so clearing that one won't clear the
      lint. Two are dead bindings in `decks/[packId]/page.tsx` and
      `decks/[packId]/drill/page.tsx` (`@typescript-eslint/no-unused-vars`), two
      are `<img>` that should be `next/image` in `Header` and `SideNav`, one is a
      missing dep in `cards/page.tsx`. Small, but this is exactly the drift the
      section is named for — warnings nobody reads become warnings nobody can
      read.

- [ ] **Lint covers `apps/web` only** — `@amgi/core` and `@amgi/mobile` have no
      `lint` script, so `turbo lint` runs one package and reports success.
      Honest today, misleading the moment it gates CI. Mobile needs
      `eslint-config-expo` (`npx expo lint` installs it and writes the config);
      core needs a small flat config of its own. Do it with the CI gate, not
      before — a lint nobody runs is the thing this section is about.

## High

_Added 2026-08-01. The first two are product work; the last three are defects
found in use, and #3–#5 were each checked against the code before being written
down — file references below are what was actually read, not guesses._

- [ ] **Bulk save and review for packs** — a `cards` pack already has this:
      "Review this deck" calls `unsavedPackCards` + `saveFlashcardsBatch` in one
      batched write, so 107 kana enrol on one tap. A `lookup` pack (TOEIC 133,
      TOPIK 고급 160) has neither button, and the only way in is tapping one word
      at a time through Learn. **The blocker is `PackWord`, which is
      `{ word, context? }` with no back side** — there is nothing to batch-write.
      Two ways out:
      - *Pre-author the backs into the pack source* (an optional `back` on
        `PackWord`, keyed by native language the way `PackCard.back` already is).
        Then every existing mechanism — `unsavedPackCards`, `saveFlashcardsBatch`,
        "Review this deck", Drill — starts working for lookup packs with no new
        machinery. This is the same "pre-authored content instead of per-word
        Gemini calls" already listed under the Medium pack item, which makes it
        the load-bearing piece rather than a nice-to-have. **Recommended.**
      - *Batch-generate on enrol* — one Gemini call per chunk at save time.
        Cheaper to build, but it puts a long spinner on the enrol tap and it
        contradicts the curated-not-generated principle in
        [vision.md](vision.md). Only worth it if authoring 293 backs by hand is
        judged too slow.

      Beyond the save itself, the open question is what actually makes a
      160-word pack learnable. Candidates, roughly in order of payoff — **pick
      deliberately, don't build all four**:
      1. **Chunked enrolment, not all-or-nothing.** 160 words is not one
         decision. Sections/themes as filters (already noted in the Medium item)
         plus "save this section" turns the pack into ~8 sittings. This is
         probably the single highest-value change.
      2. **Select-mode on the deck page.** `/cards` already has exactly this
         (`selectMode` / `selectedIds` / `bulkWorking` in
         `apps/mobile/app/(tabs)/cards.tsx`), so it is a port rather than a
         design. Gives the user the middle ground between one word and all 160.
      3. **Daily draw** — carried over from the Medium item. Pairs naturally
         with (1): the pack feeds review a fixed number of new words a day
         instead of dumping them into one queue.
      4. **Save without leaving the deck.** On a lookup pack every word is a
         deck → Learn → back round trip, which on mobile crosses a stack screen
         above the tabs. If backs are pre-authored, a word can be saved inline
         and the round trip becomes optional rather than mandatory.

      **Stamping `packId` on words saved through Learn folds in here** (moved
      up from Medium 2026-08-01 — it is the same surface, and leaving it a tier
      down is how the deck page ends up half-migrated). It is *not* a
      prerequisite, though: `buildPackCardDraft` already stamps `packId`
      (`packages/core/src/packs.ts:292`), so bulk save gives lookup packs a
      review collection on its own. The two halves ship independently, and they
      carry different risk:
      - *Bulk save from the deck* — pure addition. Those cards are born with a
        `packId` exactly as kana are, so nothing that exists today changes
        behaviour. Do this first.
      - *Stamping in the Learn flow* — this is where the one subtraction lives.
        `/cards` filters to `getCollectionId(card) === null` on both platforms
        (`apps/web/src/app/cards/page.tsx:72`,
        `apps/mobile/app/(tabs)/cards.tsx:57`), so stamping does not add a deck
        membership — it **moves** the card out of `/cards`. A TOEIC word you
        chose to look up, thought about and saved would disappear from your own
        card list. Without it, though, the same word saved two ways lands in two
        different places, which is its own incoherence.
        _Still undecided, and it is the whole question:_ either accept the move,
        or let a card belong to a pack *and* to `/cards` by loosening that
        filter to something other than "has no collection". The second is the
        larger change and the one that makes the Export item below moot.

- [ ] **Onboarding for new users** — there is nothing today except web's
      `LanguageSetupModal`, which asks two questions and vanishes; mobile has no
      first-run experience at all (see the language-defaults item below, which
      is the same gap seen as a bug). A new user lands on Learn with an empty
      search box and no indication that packs, review, drill or writing review
      exist. Scope it as two separate things — they have different lifetimes and
      conflating them is how onboarding becomes a tutorial nobody finishes:
      - *First run*: the language setup mobile is missing, then the shortest
        possible pass over what the app does. Lean and single-purpose per
        [vision.md](vision.md) — resist a multi-screen carousel.
      - *Contextual tips later on*: surfaced when a feature first becomes
        reachable rather than up front. Needs somewhere to record "this user has
        seen tip X" — `users/{uid}` is the obvious home, alongside the language
        preferences.

      Decide before building: does first run block the app, or is it
      dismissible? The web modal blocks, and it is the reason the study/native
      collision can't happen there — so a dismissible version needs the defaults
      fixed independently.

- [ ] **Skeletons instead of spinners** — mobile has 23 `ActivityIndicator`
      uses and one skeleton; the very first thing a cold launch shows is a
      full-screen spinner (`apps/mobile/app/(tabs)/index.tsx:370`, gated on
      `authLoading`), which is the worst placement of the 23 because it is the
      first impression and it replaces the whole screen with nothing. Web is
      further along — `page.tsx` already skeletons the word-of-the-day card with
      `animate-pulse` — so the pattern exists to copy.
      Priority order: (1) the `authLoading` full-screen spinner, (2) the card
      and review lists, which have a known row shape and so skeleton cleanly,
      (3) leave in-button spinners alone — a spinner inside a button the user
      just pressed is the right control and does not want a skeleton.

- [ ] **Saved cards don't appear until the app is restarted** — confirmed, and
      the cause is structural rather than a stale variable. Nothing in
      `apps/mobile` uses `useFocusEffect`, `useIsFocused` or `onSnapshot`. Both
      `apps/mobile/app/(tabs)/cards.tsx:53` and
      `apps/mobile/app/(tabs)/review.tsx:92` load inside a `useEffect` keyed on
      `[user, studyLanguage]`, and Expo Router keeps tab screens mounted once
      visited — so the effect never re-runs and only killing the process
      reloads. Review is worse than Cards: it also writes a disk cache
      (`fetchAndCacheReviewCards`), so the stale list survives the restart until
      the fetch lands.
      Three options, increasing cost:
      1. `useFocusEffect` to refetch on tab focus. Smallest change, fixes the
         reported symptom, costs a redundant read every tab switch.
      2. A mutation counter in context that save/archive/delete bump and the
         lists depend on. Refetches only when something actually changed; needs
         every write path to remember to bump it.
      3. `onSnapshot` for live queries. Correct by construction, but it
         interacts with the offline cache and the pending-review queue, which is
         the part of this app most expensive to get wrong.
      **(2) is the recommendation** — (1) is a papering-over that will read as
      slow on a large deck, and (3) is a bigger change than the bug justifies.
      Whichever is chosen, the disk cache in review has to be invalidated too,
      or the fix works only on the surface that doesn't cache.

- [ ] **New users can end up native Korean + study Korean** — real, and
      mobile-only. Web can't reach the state: `LanguageSetupModal` filters the
      chosen native language out of the study options, and it blocks the app
      until both are answered. Mobile has no equivalent, so it falls back to two
      hardcoded defaults that were chosen independently —
      `apps/mobile/src/context/UserContext.tsx:60` starts `studyLanguage` at
      `'Korean'`, and line 166 defaults `nativeLanguage` to `'Korean'` when
      signed out. That is exactly the collision `resolveStudyLanguage` and
      `resolveNativeLanguage` exist to prevent. It then self-corrects on the
      first touch of either setting, which matches the reported symptom, because
      those resolvers only run on a *change*.
      Two further wrinkles worth fixing in the same pass:
      - `resolveStudyLanguage` returns early when the previous native is `null`
        (`packages/core/src/types.ts:518`), deliberately leaving first-run to
        the setup modal. That comment is true on web and false on mobile.
      - A brand-new signed-in account has no `users/{uid}` fields at all, so
        `nativeLanguage` is `null` while mobile's settings screen highlights
        English (`settings.tsx:156`) — the app shows a preference that was never
        stored. Signing in also clears the `'Korean'` the signed-out path had
        just cached.
      The durable fix is mobile's missing first-run setup, which is why this
      wants doing alongside the onboarding item rather than as a patch to the
      defaults.

## Medium

- [ ] **Vocabulary packs — iterate beyond v1** — shipped so far: TOEIC (PR #34,
      133 words, `lookup`), hiragana + katakana (PR #49, `cards`), TOPIK 고급
      (PR #68, 160 words, `lookup`). *Principles (2026-07-13):* audience is not
      beginners; packs unlock domains, never "starter" anything; curated from
      real sources, not AI-generated; word lists need user approval before
      shipping — with the scripts exception amended into
      [vision.md](vision.md) 2026-07-24.
      *Next:* daily-draw UX; section themes as filters; pre-authored content
      instead of per-word Gemini calls — **all three were promoted into "Bulk
      save and review for packs" under High on 2026-08-01**, where pre-authored
      backs turn out to be the prerequisite rather than one option among
      several; more packs — **JLPT** is the obvious gap
      now (Japanese has only the kana packs, so a Japanese learner past the
      scripts has nothing), then TOEFL. Swedish, French and Traditional Chinese
      still have **no pack at all**.
      Drafts live in `docs/packs/` (`toeic-pack-draft.md`,
      `topik-pack-draft.md`) and are referenced from the pack source files.

- [ ] **Drill for lookup packs** — lowered from High 2026-07-25: the payoff is
      thin. Drill currently reads the pack, so only `cards` packs (the kana) have
      a Drill button. A `LookupPack` holds words with no back side, so there is
      nothing to check an answer against. Making TOEIC drillable means drilling
      the user's *saved cards* for that pack instead, which needs `packId` —
      read via `getCollectionId` since PR #51. But `packId` is written only by
      `buildPackCardDraft`, so a TOEIC word saved through Learn still carries
      none. Both halves of that — bulk save stamping at creation, and the Learn
      flow stamping on the way through — now live under **Bulk save and review
      for packs** in High, which is the real prerequisite and the more valuable
      work either way: drill would still duplicate a loop those cards already
      have. Revisit once a lookup pack has a populated collection to drill.

- [ ] **Export covers only your own cards** — noticed in PR #51, not decided.
      `/cards` export reads the now-scoped list, so a CSV/Anki dump omits every
      pack card. Consistent with what that surface means, but a *backup* that
      silently drops 107 kana is a different thing from a scoped view. Either an
      export on the deck page, or an "include pack cards" option — small either
      way, but pick one deliberately.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's
      blocked on it.

## Parked — generation features

Deprioritized 2026-07-24. Both generate word lists for a user who hasn't asked
for a specific word — a different, unproven job from the core "I met a word,
explain and remember it" loop. Revisit after the language-depth work.

- [ ] **Goal-based vocab lists: ambiguity + placement** — (1) ambiguous terms
      are silently skipped; add a picker or pass the goal to `/api/explain` as
      context. (2) Move generation out of the Import button into its own home.
      Decide placement before building.

- [ ] **Card generation (goal-based)** — the Learn page has a coming-soon
      placeholder. Lean surface: goal input → list with checkboxes → one
      free-text refine field → save. `/api/vocab-list` already takes
      `previousWords` + `feedback`; deliberately no too-basic/too-advanced chips.

## Bigger bets — need design first

_Writing review shipped in PR #69 (2026-08-01) and has left this section — see
Shipped in [status.md](status.md), and the four design calls in Decisions there.
What remains of it is open work in its own right and is listed below._

- [ ] **Writing review: iterate past v1.** Nothing here blocks anyone; the loop
      works end to end on web.
      - **A multi-sentence rewrite is handed to `PronounceButton` untested.**
        That's far longer than anything that button has been given before, and
        Google TTS has length limits — check before assuming it degrades kindly.
      - **Card backs still occasionally arrive as two glosses where one would
        do.** The rule permits two for necessity; the model reads that
        generously. Prompt-level, small.
      - Findings are not streamed. `/api/writing` is a single JSON call, so a
        long passage sits on a spinner. The upgrade is NDJSON-per-finding, which
        is exactly `examples-stream` + `parseStreamedExamples`.
      - `/api/writing` has no `try`/`catch`, so a Gemini outage or a malformed
        model response is a 500. The client shows the right error either way,
        and `/api/explain` has the same exposure — fix them together or not at
        all.

- [ ] **Should `/api/explain` allow two glosses too?** Surfaced 2026-07-31 by
      the writing-review card-back rule (see Decisions in
      [status.md](status.md)). Writing review now permits up to two glosses when
      one would genuinely mislead; `/api/explain` still says "single best
      translation — never list synonyms with semicolons or slashes", in six
      prompt branches. The reasoning that relaxed one applies to the other, but
      changing the core lookup loop's output is a bigger blast radius than a new
      surface and wasn't done blind. Decide deliberately; if yes, all six
      branches move together.

- [ ] **Conversation practice** — transcription + per-participant feedback; MVP
      is end-of-conversation feedback on a recording. Same "here's what you
      meant to say" model as Writing review — scope the two together.
      **Reuse `packages/core/src/writing.ts`**: `WritingFinding` and
      `WritingCardCandidate` deliberately say nothing about writing, because
      per-utterance feedback is the same job on a different capture. Growing a
      parallel copy is the drift that put `reviewQueue`/`drill`/`reminders` in
      core in the first place.

## Research / exploratory

- [ ] **Offline definitions/translations** — the hard phase of Offline Amgi
      (on-device model or pre-cached content). It was never allowed to block the
      cheap offline work, and that held: offline review shipped in PR #53 and
      offline term capture is still queued above, both without it.
- [ ] **Training a language-learning model / survey existing ones** — spike:
      what exists, whether fine-tuning beats prompting, what a first step looks
      like. Would inform offline definitions.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in the
      prompt.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Defer until traffic justifies it. Overlaps with pre-authored
      pack content.
