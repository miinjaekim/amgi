# Backlog

Ordered by priority. When something ships, move it to the Shipped list in
[status.md](status.md). Source of truth is the user's Google Tasks list; this is
the scoped version. Last synced 2026-07-24.

**Focus (2026-07-24): depth for Japanese and Chinese.** Six languages are wired
up, but only Korean has the per-language depth that makes a card worth keeping —
audio and a character breakdown. Generation features are parked behind it.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. See [tech-stack.md](tech-stack.md).

---

## Queued for the next build

_Last build: **1.0.2 / build 4**, 2026-07-24. Nothing merged since._

- [ ] **Japanese & Chinese depth batch** (`feat/ja-zh-depth`) — pronunciation
      for four more languages, the kanji/hanzi breakdown, and the kana packs.
      No new native module; all three are invisible until a build ships.
- [ ] **Push notifications** — needs `expo-notifications` + an `app.json` plugin.
- [ ] **App rename**, if it happens — changes `app.json` `name`/bundle id.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing) on the build itself → bump `version` in `app.json` → check
`docs/testflight-beta-info-ko.md` is still accurate.

---

## Now — Japanese & Chinese depth

✅ **All three shipped on `feat/ja-zh-depth` (2026-07-24)** — see the Shipped
list in [status.md](status.md). What's left is a judgement call and a follow-up:

- [ ] **Listen to `cmn-TW-Wavenet-A`** before the next build. Samples are in
      `audio-test/lang-voices/` (gitignored), paired against
      `cmn-CN-Chirp3-HD-Charon` on the same four phrases. Shipped on the
      accent-over-voice-quality argument; it's a one-line change to reverse.
- [ ] **Kana drill mode**, only if the packs get used. Working through 71 tiles
      and reviewing them is the whole loop today, which may be enough. Stroke
      order remains out of scope.

---

## High — everything else user-facing

- [ ] **Offline review on mobile** — promoted out of the old Offline Amgi
      bundle. Cards are already in Firestore's local cache; make the review loop
      work offline and sync ratings on reconnect. Web has a banner + cached
      review, mobile has nothing — and mobile is where people are on a subway.

- [ ] **Push notifications — WOTD and streaks** — for an SRS app "remind me
      before I forget" is the product promise, not a growth hack. Prerequisite
      met: PR #47 fixed WOTD repeats, so a notification can't push a word you
      already saw. Needs `expo-notifications`, scheduling, per-type opt-in.
      Streak nudges are the easiest place to break "no dark patterns".

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

- [ ] **Rename the app + buy the domain** — "Amgi" (암기) may not fit as the app
      grows past Korean. Needs criteria (pronounceable, domain free, not
      memorization-negative) and a checklist (domain, app metadata, logo).
      ⏳ Far cheaper now than after public launch — the bundle ID is already
      disposable and a real launch is a fresh relaunch. Don't buy a domain until
      the name is settled.

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
