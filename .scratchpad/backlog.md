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

_Last build: **1.0.2 / build 4**, 2026-07-24. Nothing merged since._

- [ ] **Japanese & Chinese depth batch** (PR #49) — pronunciation for four more
      languages, the kanji/hanzi breakdown, the kana packs, and the
      single-character TTS fix. No new native module; all of it is invisible on
      the phone until a build ships.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing) on the build itself → bump `version` in `app.json` → check
`docs/testflight-beta-info-ko.md` is still accurate.

---

## High — everything else user-facing

- [ ] **Decks page** — a home for the packs, replacing `PacksModal`. Shape
      settled 2026-07-25; the closed calls and their reasoning are in the
      Decisions section of [status.md](status.md) — read those before
      reopening any of it. What's left is build work:

      1. **`packId?: string` on `Flashcard`** (`packages/core/src/types.ts:314`),
         written at save time. Do this first. Pack progress is currently a
         lowercase text join (`PacksModal.tsx:48`) — fine for a checkmark, but
         it can't support a deck filter and it breaks when a card's study side
         is edited. Optional field, so no migration; older cards simply have no
         pack.
      2. **`/decks` route**, entered from Learn where `PacksModal` opens today.
         Lists `getVocabPacks(studyLanguage)`. **Not a nav tab** — see the
         decision.
      3. **Deck detail** — tiles + progress, i.e. what `PacksModal` renders now,
         with room to breathe for 71 kana.
      4. **Drill**, entered from a deck. Closed set, repeatable, not due-gated,
         and it **writes no SM-2 state**.
      5. Retire `PacksModal` on both platforms; mobile mirrors the same route.

      Still true from when this was a design question: kana drill is worth
      building **only if the packs get used** — working through 71 tiles and
      reviewing them may already be the whole loop. Stroke order stays out of
      scope. Steps 1–3 stand on their own if drill never earns its place.

- [ ] **Deck filter on Review** — follow-on to the decks page, not part of it.
      Same shape as the existing `directionFilter` (`review/page.tsx`), scoping
      the queue to one pack. Needs `packId` first. Review's default stays
      whole-collection and due-gated — the filter narrows that loop, it does not
      add a second one.

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
         both platforms at it, import it normally.
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
