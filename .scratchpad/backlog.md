# Backlog

Ordered by priority. **Only open work lives here** — shipped, cancelled and
decided items move to [status.md](status.md), reasoning included, so a closed
call doesn't get reopened from this file. Source of truth is the user's Google
Tasks list; this is the scoped version. Last synced 2026-07-25.

**Focus (2026-07-25): ship the depth work to the phone.** The Japanese/Chinese
depth batch is merged but invisible until a build goes out, so the next build is
deliberately narrow — no new native modules, nothing that isn't already on `main`.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. See [tech-stack.md](tech-stack.md).

---

## Queued for the next build

_Last build: **1.0.2 / build 4**, 2026-07-24._

- [ ] **Japanese & Chinese depth batch** (PR #49) — pronunciation for four more
      languages, the kanji/hanzi breakdown, the kana packs, and the
      single-character TTS fix. No new native module; all of it is invisible on
      the phone until a build ships.

- [ ] **Decks page + drill** (PR #50, merged 2026-07-25) — replaces
      `PacksModal` on both platforms. Still no new native module, so the build
      stays narrow. The kana packs from the batch above land on a page rather
      than in a modal, which is the surface most of that work is actually seen
      through.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing) on the build itself → bump `version` in `app.json` → check
`docs/testflight-beta-info-ko.md` is still accurate.


---

## High — everything else user-facing

- [ ] **Review by collection** — scoped 2026-07-25, replacing the narrower "deck
      filter on Review" this started as. A filter chip turned out to be the
      wrong shape: it assumed one pool of cards that gets narrowed, when a pack
      and your own cards are different things learned for different reasons.
      Katakana arriving mid-way through Japanese vocabulary is worse review than
      either done alone, so the collections stay apart end to end.

      **The model.** Two card-management surfaces, peers of each other:
      `/cards` holds cards you made, `/decks/[packId]` holds one pack's cards.
      Review composes collections rather than filtering a pool — you pick which
      one you're sitting down to do.

      **Decisions (2026-07-25), so they don't get relitigated:**
      - **No `All` option.** Clearing everything means picking each collection
        in turn. That is the cost of the separation, and it is small at two or
        three collections. Rejected precisely because it reintroduces the
        interleaving the whole item exists to prevent.
      - **Pack cards leave `/cards` entirely** — not hidden behind a chip.
        "Only my cards" is what makes it a coherent surface; management for pack
        cards moves to the deck page.
      - **`packId` only, no text-match fallback.** The under-reporting caveat
        this item used to carry is void: no kana was saved before `packId`
        existed (confirmed with the user), so the legacy case is hypothetical
        and a backfill would be cost for nothing.
      - **Decks joins the nav** on both platforms, unconditionally. It is a peer
        of Cards now, so a conditional link on Learn (`page.tsx:409`) is the
        wrong altitude — and a *conditional* nav item would reflow the bar on
        every study-language switch, which is worse than a quiet empty state.
        Languages without packs get an empty state saying what decks are, not a
        "coming soon" promising a date nothing is committed to.

      **Plan — core (`packages/core/src`):**
      1. Lift `isDue` into core beside `sm2.ts`. Duplicated today with
         *different signatures* — `review/page.tsx:19` returns
         `{due, directions}`, `(tabs)/review.tsx:24` returns `Direction[]`. Both
         platforms need per-collection due counts, so one shared version becomes
         load-bearing rather than tidiness. Closes stale-test item 1 under
         Housekeeping below: `review.test.ts:92` can import it normally.
      2. New `collections.ts`: `getCollectionId(card)` → `card.packId ?? null`
         (`null` = your own cards), and `buildReviewCollections(cards,
         studyLanguage)` → `{ id, name, dueCount, nextReview }[]`, "My cards"
         first. A pack with nothing enrolled does not appear in Review — it is
         on `/decks`, which is where you would go to enrol it. Route every read
         through `getCollectionId` so user-made collections are additive later
         instead of a migration.

      **Plan — web:**
      3. `/cards` — scope to `!card.packId`. Counts, bulk select and edit all
         follow from the filtered list.
      4. `/decks/[packId]` — bring the row management over from `/cards` (edit
         back side, archive, delete) for entries that have a saved card, keeping
         the single-list rendering so `40 / 107` progress and the pronounce
         buttons survive. Add **Review this deck**: batched write enrolling every
         unsaved entry, then route to `/review?collection=kana-hiragana`.
      5. `/review` — landing becomes the collection picker, replacing the single
         "Review N Cards Due" button (`review/page.tsx:353`). Direction chips
         move inside the chosen collection; they are a separate axis and must
         not collapse into one chip row. `?collection=` preselects for the
         handoff above. If only "My cards" exists — every Korean-only session —
         skip the picker and render exactly today's UI, so nobody pays a tap for
         a choice they do not have.

      **Plan — mobile:** same three surfaces (`(tabs)/cards.tsx`,
      `decks/[packId]/index.tsx`, `(tabs)/review.tsx`), plus the nav change.
      That change reverses a deliberate call: `app/_layout.tsx:11` registers
      `decks` on the *root* stack so the tab bar gives way to the deck, with a
      comment saying packs are "a drill-down from Learn, not a fifth tab". Right
      to reverse under this model — a peer of Cards is not a drill-down — but
      reverse it knowingly and update that comment. Four steps:
      1. Move `app/decks/` → `app/(tabs)/decks/` and drop the root
         `<Stack.Screen name="decks" />`. `Tabs.Screen` only binds to routes
         inside the tab group, so the move is what makes the icon possible.
      2. Add `app/(tabs)/decks/_layout.tsx` — a `<Stack>`, ~10 lines. Without
         it expo-router flattens the three deck routes into the Tabs navigator,
         and `FloatingTabBar` maps over every `state.routes` entry
         (`FloatingTabBar.tsx:43`), so they surface as extra icons drawing the
         generic `apps` fallback.
      3. `<Tabs.Screen name="decks" />` in `(tabs)/_layout.tsx`. Five tabs fit —
         `s.tab` is `flex: 1`.
      4. `decks` in `ICONS` and `LABEL_KEYS` (`FloatingTabBar.tsx:14,22`) plus a
         `navDecks` i18n key.

      Leave `drill.tsx` on the root stack rather than moving it with the rest —
      it is the one screen that wants the full screen, and inside the tab group
      the bar would no longer give way to it.

      **Known consequence:** enrolling hiragana creates ~214 due items at once
      (107 characters × both directions, no daily cap). Contained to that
      collection now, which is much of why dropping `All` works.

- [ ] **Offline review on mobile** — promoted out of the old Offline Amgi
      bundle. Cards are already in Firestore's local cache; make the review loop
      work offline and sync ratings on reconnect. Web has a banner + cached
      review, mobile has nothing — and mobile is where people are on a subway.

- [ ] **Push notifications — WOTD and streaks** — for an SRS app "remind me
      before I forget" is the product promise, not a growth hack. Prerequisite
      met: PR #47 fixed WOTD repeats, so a notification can't push a word you
      already saw. Needs `expo-notifications`, scheduling, per-type opt-in.
      Streak nudges are the easiest place to break "no dark patterns".
      Deliberately **not** in the next build — it brings a native module, so it
      wants a build of its own rather than riding along with a JS-only release.

- [ ] **Privacy — finish the remaining pieces** — account/data deletion (export
      already exists) and a short "your data" blurb in settings or onboarding.
      Deletion is table stakes before any wider launch.

## Housekeeping — broken tooling that hides signal

`npm test` and `turbo lint` both fail on a clean checkout, so real regressions
are easy to miss. Cheap; do alongside feature work.

- [ ] **Two stale review tests fail on a clean checkout** — both predate the
      monorepo restructure (only commit `dcc87b2`); current behavior is correct.
      1. `review.test.ts:92` `require()`s `../review/page` for `isDue`, which is
         never exported (`review/page.tsx:19`) and unresolvable as `.tsx` under
         vitest. `isDue` is also duplicated web/mobile with different signatures
         (`review.tsx:24`). Lift one into `@amgi/core` beside `sm2.ts`, point
         both platforms at it, import it normally. **Folded into "Review by
         collection" above** — that work needs one shared `isDue` for
         per-collection due counts, so this closes as a side effect of step 1
         there rather than on its own.
      2. `review-response.test.ts:150` asserts `updateDoc` is called *without*
         `frontToBack.nextReview`; line 151 asserts it has exactly that. The
         code writes the field and should — delete line 150.

- [ ] **`npm run lint` is broken repo-wide** — `apps/web/package.json` runs
      `next lint`, removed in Next 16; it parses `lint` as a directory and exits
      1 before linting anything. Move to `eslint .` and confirm the flat config
      Next 16 expects. Do before adding a lint gate to CI.

## Medium

- [ ] **Vocabulary packs — iterate beyond v1** — v1 shipped in PR #34 (TOEIC,
      133 words). *Principles (2026-07-13):* audience is not beginners; packs
      unlock domains, never "starter" anything; curated from real sources, not
      AI-generated; word lists need user approval before shipping.
      *Next:* daily-draw UX; section themes as filters; more packs (TOEFL,
      TOPIK, and a JLPT pack pairs naturally with the Japanese work above);
      pre-authored content instead of per-word Gemini calls. Draft:
      `docs/packs/toeic-pack-draft.md`.

- [ ] **Drill for lookup packs** — lowered from High 2026-07-25: the payoff is
      thin. Drill currently reads the pack, so only `cards` packs (the kana) have
      a Drill button. A `LookupPack` holds words with no back side, so there is
      nothing to check an answer against. Making TOEIC drillable means drilling
      the user's *saved cards* for that pack instead, which needs `packId` —
      available via `getCollectionId` once "Review by collection" lands. Those
      cards are already in Review, and once that item ships they are reviewable
      *as their own collection*, which is the loop they were built for — so this
      duplicates an existing surface more thoroughly than it did before.

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

- [ ] **Writing review** — submit writing, get grammar feedback *plus* how a
      native would express what you were reaching for. The second half is what
      fits Amgi's premise. Open: input surface, whether corrections generate
      flashcards (that's the loop back into the product), length limits, and
      whether submissions are stored or ephemeral.

- [ ] **Conversation practice** — transcription + per-participant feedback; MVP
      is end-of-conversation feedback on a recording. Same "here's what you
      meant to say" model as Writing review — scope the two together.

## Research / exploratory

- [ ] **Offline definitions/translations** — the hard phase of Offline Amgi
      (on-device model or pre-cached content). Never allowed to block the two
      offline items above.
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
