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

- [ ] **Mobile theme parity** (PR #44) — already merged, just not on the device.
- [ ] **Push notifications** — needs `expo-notifications` (native module) and an
      `app.json` plugin entry. See the Medium tier for scope.
- [ ] **App rename**, if it happens — changes `app.json` `name`/bundle id.
      Cheaper before public launch, so it may want to ride this same build.

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

The three starred items. All three surface during live demos, which is what
makes them urgent. The two WOTD items are mostly server-side, so they reach the
app via a Vercel deploy with no mobile release involved; the language-switch fix
is client-side and rides the next build.

- [ ] **Switching native language should switch study language too**
      When demoing to a native Korean speaker, switching native language
      English → Korean currently leaves study language on Korean, so the app is
      set to teach a Korean speaker Korean. It takes a second manual switch to
      become usable, in front of the person being shown.
      This follows directly from an already-recorded product decision: natives
      don't study their own language (which is why the native language is
      excluded from the study-language options in the setup modal). The setup
      modal enforces it; changing native language later in settings does not.
      *Scope:* when native language changes and the current study language now
      equals it, move study language to a sensible default. English↔Korean is
      the demo case and should be the pairing. Decide the rule for other
      combinations (fall back to a default? reuse the previous study language?
      prompt?) and whether this is silent or surfaced as a notice. Applies to
      both web `SettingsMenu` and mobile settings.

- [ ] **Word of the day repeats across days**
      Each date generates independently — `/api/word-of-the-day` writes one
      Firestore doc per `date_studyLanguage_nativeLanguage` and never reads any
      other date. The prompt says "Vary your choice — different dates should
      yield different words", but the model has no history to vary *against*,
      so common words recur.
      *Scope:* feed recent picks into the prompt as an exclusion list (query the
      last N days from the `wordOfTheDay` collection, which is already keyed by
      date, so the read is cheap) and/or keep a per-language "already used" set.
      Decide N and what happens once the pool is exhausted for a language.

- [ ] **Word of the day saving discrepancy**
      Tapping the WOTD card runs `resolveExplanation()`, a *fresh* `/api/explain`
      call. The stored WOTD doc and the explain response are two independent
      Gemini generations, so the card you save can show a different translation
      or definition than the panel you tapped.
      Note PR #37 already pins the *sense* (`briefDefinition` is passed as a
      context hint), so this is no longer a wrong-meaning bug — it's the
      wording drifting between what was displayed and what got saved.
      *Scope:* decide who wins. Either seed the explanation from the stored WOTD
      fields instead of regenerating, or persist the full explanation on the
      WOTD doc at generation time so the tap is a read. The second also cuts a
      Gemini call per tap and lines up with the "shared term cache" idea.

## High — confirmed mobile defects

Both are root-caused and reproducible; both hit during demos.

- [ ] **Learn page: tagline overlaps the streak badge when the WOTD tile loads**
      `apps/mobile/app/(tabs)/index.tsx`. In the empty state the hero is
      `flex: 1` with `minHeight: 80` (style at ~line 617), and the bottom bar
      sizes to its content. When the WOTD tile loads in asynchronously, the
      bottom bar grows, the hero is squeezed to its 80px floor, and the
      tagline + subtitle (which need more than 80px) overflow a
      `justifyContent: 'center'` box — so they spill *upward* over the streak
      badge as well as downward. React Native doesn't clip by default, so
      nothing hides it.
      *Scope:* the fix is layout, not content — let the hero shrink properly or
      reserve the WOTD tile's height before it loads so the layout doesn't jump.
      Reserving space also removes the visible reflow.

- [ ] **Learn page gets stuck showing only the search bar after saving a card**
      Same file. `isEmpty` is defined as
      `!loading && !core && !ambiguity && !error && !saveSuccess` (~line 277).
      After a save, `saveSuccess` is `true`, so the empty state is skipped —
      but the empty state is what hosts the word of the day, example chips, and
      the packs/generate buttons. You land in the results branch with nothing
      but a search field and a success banner, and `saveSuccess` only clears on
      the next lookup. So after saving there's no way back to packs or WOTD
      without running another search first.
      *Scope:* the success banner shouldn't suppress the empty state. Either
      render the banner *within* the empty state, or auto-clear `saveSuccess`
      on a timer, so saving returns you to a usable Learn screen.

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

- [ ] **Traditional Mandarin as a study language** — a registry entry in
      `STUDY_LANGUAGE_CONFIGS` + an `/api/explain` prompt branch + i18n keys +
      the two manual Firestore steps (rules, composite index). Traditional
      characters specifically, so decide up front how it relates to a possible
      future Simplified variant — separate study language, or one language with
      a script preference? That choice is hard to reverse once cards exist.
      Also worth a per-character breakdown section like Korean's hanja, which
      shares work with the Japanese kanji item below.

- [ ] **Japanese kanji breakdown section** — Japanese depth currently uses the
      generic (no-hanja) prompt; add a per-character kanji section like Korean's
      hanja breakdown. Needs a new stream marker + parser support.

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

- [ ] **Push notifications — WOTD and streaks** — daily review reminders, the
      word of the day, and streak-at-risk nudges. Depends on the WOTD items
      above being fixed first: notifying people about a repeated word would make
      the repeat problem far more visible. Needs `expo-notifications`, a
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
