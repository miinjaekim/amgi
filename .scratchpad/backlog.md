# Backlog

Ordered by priority. **Next up** is what we're building now. When something
ships, move it to the Shipped list in [status.md](status.md).

## Next up

- [ ] **Vocabulary packs — iterate beyond v1**
      v1 shipped in PR #34 (TOEIC Core Vocabulary, 133 words, browsable list,
      tap-to-learn) and is now on mobile too.
      *Design principles (2026-07-13):* the audience is NOT beginners — Koreans
      have years of school English; the value is words where a simple
      translation is insufficient. Packs are "unlocking new domains", usable at
      any stage — never "starter" anything; as big as they need to be; curated
      from real resources (Barron's 600, TOEIC word lists), **not**
      AI-generated, editorially controlled. Curated word lists need user
      approval before shipping.
      *Next iterations:* daily-draw UX ("show me N I haven't saved" / random
      chunk of ~20); surface section themes (verbs / familiar-words-new-meanings
      / adjectives / nouns) as filters; more packs (TOEFL academic;
      TOPIK/국립국어원-based Korean packs); pre-authored card content instead of
      per-word Gemini calls (ties into "shared term cache").
      Source draft: `docs/packs/toeic-pack-draft.md`.

- [ ] **Card generation (goal-based) implementation**
      The Learn page has a coming-soon placeholder. Build the real thing as its
      own lean surface: goal input → generated list with checkboxes → a single
      free-text refine field → save. `/api/vocab-list` already accepts
      `previousWords` + `feedback`; deliberately no too-basic/too-advanced chips.
      Fold in the two open questions below before building.

- [ ] **Japanese basics: kana onboarding**
      Complete beginners need hiragana/katakana before vocab. Likely a dedicated
      kana study/reference mode (chart + drill), separate from the SM-2 deck, or
      a pre-seeded starter deck. Scope: which kana set, romaji + audio (audio is
      unblocked, but Japanese still needs a Chirp 3: HD voice added to
      `STUDY_LANGUAGE_CONFIGS`). Stroke order out of scope for v1.

## High

- [ ] **Goal-based vocab lists: handle ambiguity + rethink placement**
      (1) Ambiguous terms are currently skipped ("ambiguous — skipped"); add a
      flow to pick a meaning (reuse the disambiguation picker) or auto-pick by
      passing the goal as context to `/api/explain`. (2) Move generation out of
      the Import button into its own home (Learn empty state, post-setup
      onboarding, or a dedicated surface). Decide placement before building.

- [ ] **Japanese kanji breakdown section**
      Japanese depth currently uses the generic (no-hanja) prompt; add a
      per-character kanji section like Korean's hanja breakdown. Needs a new
      stream marker + parser support. Pairs naturally with kana onboarding.

## Medium

- [ ] **Privacy & data transparency — finish the remaining pieces**
      *Done:* privacy policy pages at `/privacy` and `/privacy/ko`, written from
      an actual audit of what's collected; mobile settings links to the version
      matching the user's native language.
      *Remaining:* account/data deletion (export already exists via CSV/Anki),
      and a short "your data" blurb in settings or onboarding. Do before any
      wider launch — ties into the "Own your learning" principle.

- [ ] **Pronunciation audio beyond Korean**
      Pick a Chirp 3: HD voice per language and add it to
      `STUDY_LANGUAGE_CONFIGS`. Everything else (caching, the shared
      `getPronunciationUrl`, the button placements) is already generic — other
      languages currently return a clean "not available" error.

- [ ] **Mobile theme parity**
      Web has Forest/Sonokai/Paper/System; mobile has Forest/Slate/Paper. Decide
      whether to add System (follow OS) or keep mobile deliberately simpler.

## Research / exploratory

- [ ] **Explore training a language-learning model**
      Research spike: what already exists, whether fine-tuning/training is
      viable or even preferable to prompting, and what a practical first step
      would look like. Learning-oriented, not product-critical.

---

# Needs Clarification

Ideas worth keeping but not yet scoped — need more brainstorming before moving
into the backlog.

- [ ] **Rename the app** — "Amgi" (암기, rote memorization) may not fit as the
      app grows beyond Korean into a multi-language tool. Needs criteria
      (pronounceable across languages, domain availability, not
      memorization-negative) and a migration checklist if renamed (domain, app
      metadata, logo; Firebase project naming stays internal). Note the iOS
      bundle ID is already disposable, so a rename is cheaper before the real
      App Store launch than after.
- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`; include in the
      Gemini prompt.
- [ ] **Push notifications** — daily review reminders. Post-launch.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Reduces cost; defer until traffic justifies it. Overlaps with
      pre-authored pack content.
- [ ] **Conversation practice** — on hold. Transcription + per-participant
      feedback; MVP is end-of-conversation feedback on a recorded file.
