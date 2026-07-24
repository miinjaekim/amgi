# Backlog

Ordered by priority. **Next up** is what we're building now. When something
ships, move it to the Shipped list in [status.md](status.md).

Source of truth for priority is the user's Google Tasks list; this file is the
scoped version of it. Last synced 2026-07-23.

**Mobile shipping model (decided 2026-07-23): no OTA.** Iterate in Expo Go
(`npx expo start`), cut a production build when a batch is worth a release.
Everything mobile therefore reaches users via a build — so batch freely, and
verify on the phone in Expo Go as you go. Details in
[tech-stack.md](tech-stack.md).

---

## Queued for the next build

_Last build cut: **1.0.2 / build 4**, 2026-07-24 — see [status.md](status.md).
Nothing merged since._

- [ ] **Push notifications** — needs `expo-notifications` (native module) and an
      `app.json` plugin entry. See the Medium tier for scope.
- [ ] **App rename**, if it happens — changes `app.json` `name`/bundle id.
      Cheaper before public launch, so it may want to ride a build.

Since nothing ships between builds, this list is just "everything merged since
the last release" — the entries below are the ones with extra prerequisites.

**Pre-flight checklist when cutting the build:**
- [ ] Smoke-test the batch in Expo Go first (`npx expo start`)
- [ ] Verify anything native-adjacent on the build itself, not just Expo Go —
      audio, file system, sharing
- [ ] Bump `version` in `app.json`
- [ ] TestFlight Test Information / beta copy still accurate
      (`docs/testflight-beta-info-ko.md`)

---

## Next up

_The three starred demo-blocking items and both confirmed mobile defects are
done — see the Shipped list in [status.md](status.md). The feature work below
is what's next._

## High — feature work

- [ ] **Goal-based vocab lists: handle ambiguity + rethink placement**
      (1) Ambiguous terms are currently skipped ("ambiguous — skipped"); add a
      flow to pick a meaning (reuse the disambiguation picker) or auto-pick by
      passing the goal as context to `/api/explain`. (2) Move generation out of
      the Import button into its own home (Learn empty state, post-setup
      onboarding, or a dedicated surface). Decide placement before building.

- [ ] **Card generation (goal-based) implementation**
      The Learn page has a coming-soon placeholder. Build it as its own lean
      surface: goal input → generated list with checkboxes → a single free-text
      refine field → save. `/api/vocab-list` already accepts `previousWords` +
      `feedback`; deliberately no too-basic/too-advanced chips. Fold in the
      ambiguity/placement decisions above before building.

## Housekeeping — broken tooling that hides signal

Not user-facing, but every `npm test` / `turbo lint` run currently reports
failures that have nothing to do with the change being tested, so real
regressions are easy to miss.

- [ ] **Two stale review tests fail on a clean checkout**
      Both predate the monorepo restructure (their only commit is `dcc87b2`)
      and neither reflects a product bug — current behavior is correct.
      1. `review.test.ts:92` does `require('../review/page')` to reach `isDue`.
         That fails twice over: `isDue` is declared but never exported
         (`apps/web/src/app/review/page.tsx:19`), and `require()` can't resolve
         the `.tsx` component module under vitest anyway.
         *Scope:* `isDue` is duplicated across web (`page.tsx:19`, returns
         `{ due, directions }`) and mobile (`app/(tabs)/review.tsx:24`, returns
         `Direction[]`) with different signatures. Lift one version into
         `@amgi/core` beside `sm2.ts`, point both platforms at it, and have the
         test import it normally. Fixes the test by removing the duplication
         that made it unfixable.
      2. `review-response.test.ts:150` asserts `updateDoc` is called *without*
         `frontToBack.nextReview`, then asserts on line 151 that it has exactly
         that property. The two lines contradict each other; the code writes
         the field and should. Delete the stale line 150.

- [ ] **`npm run lint` is broken repo-wide**
      `apps/web/package.json` still runs `next lint`, removed in Next 16 — it
      now parses `lint` as a directory and exits 1, so `turbo lint` fails
      before it lints anything. Migrate to running `eslint` directly
      (`next lint` → `eslint .`) and confirm the flat-config setup Next 16
      expects. Worth doing before adding any lint gate to CI, since the
      existing `mobile-typecheck.yml` gate implies lint would be next.

## Medium

- [ ] **Offline Amgi — phase it**
      Today only the review page has an offline banner + cached review, and it's
      web-side. Explicitly *not* gated on offline AI:
      1. **Offline review on mobile** — cards are already in Firestore's local
         cache; make the review loop work without a connection and sync ratings
         when it returns. Tractable now, and the highest-value piece.
      2. **Offline term capture** — let users jot down terms they want looked up
         later, queued locally and resolved on reconnect. No model needed, just
         a queue and a flush.
      3. **Offline definitions/translations** — the genuinely hard one (on-device
         model or pre-cached content). Long-term; don't let it block 1 and 2.

- [ ] **Grid view for cards** — an alternative to the current list on the Cards
      page. Denser scanning of a large deck.

- [ ] **Kanji / hanzi breakdown section** — Japanese and Traditional Chinese
      depth both use the generic (no-hanja) prompt; add a per-character section
      like Korean's hanja breakdown. Needs a new stream marker + parser support.
      One piece of work covering both: they share the character set, and
      Chinese wants pronunciation-per-character where Japanese wants readings.

- [ ] **Japanese basics: kana onboarding** — complete beginners need
      hiragana/katakana before vocab. Likely a dedicated kana study/reference
      mode (chart + drill), separate from the SM-2 deck. Audio is unblocked, but
      Japanese still needs a Chirp 3: HD voice added to
      `STUDY_LANGUAGE_CONFIGS`. Stroke order out of scope for v1.

- [ ] **Vocabulary packs — iterate beyond v1**
      v1 shipped in PR #34 (TOEIC Core Vocabulary, 133 words) and is on mobile.
      *Design principles (2026-07-13):* the audience is NOT beginners — Koreans
      have years of school English; the value is words where a simple
      translation is insufficient. Packs are "unlocking new domains", usable at
      any stage — never "starter" anything; as big as they need to be; curated
      from real resources, **not** AI-generated, editorially controlled. Curated
      word lists need user approval before shipping.
      *Next iterations:* daily-draw UX ("show me N I haven't saved"); surface
      section themes as filters; more packs (TOEFL academic; TOPIK/국립국어원
      Korean packs); pre-authored card content instead of per-word Gemini calls.
      Source draft: `docs/packs/toeic-pack-draft.md`.

- [ ] **Privacy & data transparency — finish the remaining pieces**
      *Done:* policy pages at `/privacy` and `/privacy/ko`, written from an
      actual audit; mobile settings links to the matching version.
      *Remaining:* account/data deletion (export already exists via CSV/Anki)
      and a short "your data" blurb in settings or onboarding. Do before any
      wider launch.

- [ ] **Pronunciation audio beyond Korean** — `expo-audio` is already installed, so this is voices + config only. — pick a Chirp 3: HD voice per
      language and add it to `STUDY_LANGUAGE_CONFIGS`. Everything else is
      already generic; other languages return a clean "not available" today.
      Traditional Chinese is the strongest candidate — tones make audio worth
      more there than the pinyin badge alone conveys; `cmn-TW` is the voice
      locale to pick, not `cmn-CN`.

- [ ] **Push notifications — WOTD and streaks** — daily review reminders, the
      word of the day, and streak-at-risk nudges. Its prerequisite is met — the
      WOTD repeat problem was fixed in PR #47, so notifications can't push a
      word you already saw. Needs `expo-notifications`, a
      scheduling story, and per-type opt-in. Respect "no dark patterns" —
      streak nudges are the easiest place to violate it.

_(Mobile theme parity shipped in PR #44 — see [status.md](status.md). Merged
and verifiable in Expo Go; it reaches users with the next build.)_

## Bigger bets — need design before they're buildable

- [ ] **Writing review** — users submit writing they're practicing and get
      feedback on grammar plus how a native would actually express what they
      were reaching for. That second half is the interesting part and the part
      that fits Amgi's premise: not "here are your errors" but "here's what you
      were trying to say." Open questions: what's the input surface (paste a
      paragraph? a dedicated tab?), does feedback generate flashcards from the
      corrections (that's the loop back into the core product), how long can
      submissions be, and does it store submissions or stay ephemeral (privacy
      implications either way).

- [ ] **Conversation practice** — previously on hold. Transcription +
      per-participant feedback; MVP is end-of-conversation feedback on a
      recorded file. Shares a lot with Writing review — same "here's what you
      meant to say" feedback model, different input mode. Worth scoping the two
      together rather than separately.

- [ ] **Rename the app + buy the domain** — "Amgi" (암기, rote memorization) may
      not fit as the app grows beyond Korean into a multi-language tool. Needs
      criteria (pronounceable across languages, domain available, not
      memorization-negative) and a migration checklist (domain, app metadata,
      logo; Firebase project naming stays internal).
      ⏳ **Timing matters:** the iOS bundle ID is already disposable and a real
      App Store launch will be a fresh relaunch anyway, so a rename is far
      cheaper now than after public launch. Buying the domain is the
      forcing function — don't buy one until the name is settled.

## Research / exploratory

- [ ] **Explore training a language-learning model / survey existing ones** —
      research spike: what already exists, whether fine-tuning or training is
      viable or even preferable to prompting, and what a practical first step
      looks like. Learning-oriented, not product-critical. Would also inform
      offline definitions (phase 3 of Offline Amgi).

## Needs clarification

Ideas worth keeping but not yet scoped.

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`; include in the
      Gemini prompt.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Reduces cost; defer until traffic justifies it. Overlaps with
      pre-authored pack content and with the WOTD saving fix above.
