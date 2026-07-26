# Project Status

_Reconciled against `main` @ `6e9f3e9` on 2026-07-24, plus the 1.0.2 release cut._

## Shipped

### Foundation
- **Core loop** — term lookup → Gemini explanation → save as flashcard →
  bidirectional SM-2 review (direction filter, shuffled queue)
- **Infrastructure** — Firebase Auth, Firestore + security rules, Gemini proxied
  server-side, Next.js 16.2.7, Vercel deployment
- **Explanation quality** — fast call (translation + briefDefinition) plus
  user-triggered depth and examples; term disambiguation with multiple-meaning
  selection; markdown rendering; NDJSON streaming
- **Cards page** — search, filter (active/archived/all), sort
  (newest/oldest/A→Z), card order toggle, detail modal, edit/archive/delete,
  bulk actions, CSV + Anki export, bulk import
- **Review loop** — manage cards mid-session (edit/archive/delete), offline
  banner + cached review, force-sync button
- **Streaks** — streak count + cards reviewed today in header, persisted to Firestore
- **Streaming + cache** — typewriter animation on depth/examples; Firestore
  IndexedDB persistent cache for instant repeat visits
- **First-time modal** — `LanguageSetupModal` shows for all visitors until
  native language is set; saves to localStorage + Firestore on sign-in

### Multi-language
- **Swedish support** (`feat/swedish`) — `studyLanguage` on card documents;
  two-step setup modal (native → study); study-language switcher; per-language
  collection routing; Swedish-appropriate Gemini prompts
- **Swedish noun gender + save fix** (`feat/swedish-gender`, 2026-07-04) —
  `gender?: string` on `TermCore`/`SwedishFlashcard`, badge on Learn / detail
  modal / review reveal; `saveFlashcardToFirestore` strips `undefined` before
  `addDoc`; `parseStreamedDepth` only includes keys with real values
- **Known-issue fixes + backlog batch** (PR #31, 2026-07-06) — localized
  disambiguation; `getDepthTarget()` targets the study-language word; hanja 훈음
  readings; word of the day; goal-based vocab lists; English (native-Korean
  learners), French, and Japanese via the new `STUDY_LANGUAGE_CONFIGS` registry.
  Security rules + composite indexes for the three new collections added
  manually 2026-07-08.
- **Examples fix for French/Japanese** (PR #32, 2026-07-08) —
  `parseStreamedExamples` moved into `@amgi/core` and made config-driven; it was
  gated on korean/swedish keys and silently dropped French/Japanese pairs. Tests
  cover all five languages.
- **Review language-switch fix** (2026-07-08) — the review page load effect now
  depends on `studyLanguage`, so switching no longer shows the previous deck.
- **Traditional Chinese** (`feat/traditional-chinese`, 2026-07-24) — sixth study
  language: `cards_chinese_traditional`, `traditionalChinese` study field, and a
  `pinyin` reading badge alongside Japanese's `furigana` via the shared
  `getReading()` helper. `/api/explain` detects Han script server-side and the
  prompt converts Simplified input to Traditional. Simplified is deliberately
  left as a possible future registry entry, not a script toggle — see
  `data-model.md`. Security rules + the `archived + createdAt` composite index
  for `cards_chinese_traditional` were added in the Firebase console and
  confirmed by saving Chinese cards (2026-07-24).

- **Japanese & Chinese depth** (PR #49, 2026-07-25) — the three "Now" items in
  one branch, plus a pronunciation bug they uncovered:
  - *Pronunciation for four more languages* — `ja-JP-Chirp3-HD-Charon`,
    `fr-FR-Chirp3-HD-Charon`, `sv-SE-Chirp3-HD-Charon`, and
    **`cmn-TW-Wavenet-A`** for Traditional Chinese. `cmn-TW` has no Chirp 3: HD
    voice at all, so that one traded voice quality for a Taiwanese rather than
    Mainland accent — **listened to and accepted 2026-07-25**, so the trade is
    settled and not a pending review. Japanese also speaks `furigana` when the card
    has one, via `getSpokenText()`; it takes furigana and not `getReading()`
    because pinyin is Latin text a Mandarin voice would spell out.
  - *Character breakdown* — the depth prompt's Han-script section is now
    per-language (Korean 훈음, Japanese on'yomi/kun'yomi, Mandarin pinyin),
    written once in `apps/web/src/lib/characterBreakdown.ts` because `/depth`
    and `/depth-stream` ask for it in two envelopes. `TermDepth.hanja` →
    `characterBreakdown`, read through `getCharacterBreakdown()`, which falls
    back to `hanja` so **no migration was needed**. Which languages get a
    section is `characterSectionKey` on the registry. Verified against Gemini:
    図書館/電腦 break down, ありがとう returns "none", Swedish/French omit it,
    갈등 unchanged.
  - *Kana packs* — `VocabPack` is now a discriminated union. A `cards` pack is
    pre-authored and saves straight to Firestore with no model call, and the
    modal stays open so 71 tiles are tappable in one sitting. Hiragana and
    katakana are generated from one table in `packages/core/src/kana.ts`.
    Deliberately widens the audience — see the amendment in
    [vision.md](vision.md).
  - *Single-character TTS returned silence* — found while testing the packs and
    **already broken for Korean**: Chirp 3: HD intermittently emits a near-silent
    clip for a lone character (11/70 kana, 9/21 Korean syllables, a different
    set each run; two-character text was clean). Cached audio never expires, so
    one bad generation was served forever. `ttsShortVoiceName` now routes single
    characters to a Neural2 voice and the route refuses to cache implausibly
    small audio. No purge needed — the voice name is in the cache path. See
    [lessons.md](lessons.md). The side effect — a single kana tile speaks in a
    different voice than a sentence in the same deck — was **reviewed and
    accepted 2026-07-25**. It's a decision, not an outstanding defect.

- **Decks page** (PR #50, 2026-07-25) — `PacksModal` is retired on
  both platforms. `/decks` lists the packs for the current study language and
  `/decks/[packId]` is the deck itself, so the 71 kana tiles no longer fight an
  80vh modal for room. Entered from Learn, where the modal used to open; **not
  a nav tab**, per the decision below. Mobile mirrors the routes as a stack
  screen pushed above the tabs.
  - **`packId` on saved cards** — provenance only. Progress still matches on
    the study side, so a word looked up on your own counts and cards saved
    before the field existed aren't orphaned; the comment on the field says so,
    because using it for saved-marking is the obvious wrong turn.
  - `buildPackCardDraft`, `collectSavedTerms` and `getVocabPack` moved into
    `@amgi/core` — web and mobile were building the draft identically.
  - A looked-up word now reaches Learn as a route param instead of a callback.
    Both platforms wait for preferences before resolving it: `studyLanguage`
    reads 'Korean' until they load, so firing on mount looked the word up in
    the wrong language pair. Mobile passes a `nonce` so tapping the same word
    twice re-fires.
  - **Drill** (added 2026-07-25, same branch) — the gate on it ("only if the
    packs get used") was met by the user wanting it to learn kana. Enter from a
    deck: shuffled prompt → reveal → knew/missed, with missed cards requeued
    `DRILL_REQUEUE_GAP` (4) cards later so a session ends only once everything
    in it has been answered right at least once. Start screen mirrors Review's
    — direction pills reusing the registry's `directionFrontToBackKey`, plus a
    10/25/all session length, since 71 kana in one sitting is a lot. Pronounce
    button on the reveal for `pronounceable` packs.
    - The queue is pure and lives in `packages/core/src/drill.ts`, so it's the
      same on both platforms and it's the part under test (13 tests).
    - **Shuffle before cutting to size** — cutting first would drill the same
      opening kana every session and never reach the dakuten rows.
    - **Only `cards` packs are drillable.** A `LookupPack` has words with no
      back side, so there's nothing to check an answer against. See the backlog
      for what making TOEIC drillable would take.
    - The score counts cards actually *answered*, not the session's starting
      size — ending a 71-card drill after five would otherwise have reported
      all 71 correct.
  - **Verified in Expo Go 2026-07-25**, both pack kinds: drill on a `cards` pack
    (kana), and tapping a word in a `lookup` pack (TOEIC) — the deck → Learn
    round trip, which had no web equivalent to prove it since it has to pop a
    stack screen above the tabs and have Learn pick the param up.

- **Review by collection** (PR #51, 2026-07-26) — your own cards and each pack
  are separate collections now, reviewed apart end to end. Replaces the "deck
  filter on Review" this was scoped as: a filter chip assumed one pool that gets
  narrowed, when a pack and your own words are learned for different reasons.
  - **`getCollectionId(card)`** (`packages/core/src/collections.ts`) is the one
    place `packId` is read for grouping, so collections a user defines
    themselves are an added branch later rather than a migration.
    `buildReviewCollections` returns your own cards first, then packs in
    registry order, omitting any collection holding no cards — an unenrolled
    pack belongs on Decks, which is where you'd go to enrol in it.
  - **`isDue` moved into `@amgi/core`** beside sm2 with one signature. The two
    copies disagreed (web `{due, directions}`, mobile `Direction[]`), and web's
    never marked a card due backwards when it had `frontToBack` tracking but no
    `backToFront`. Shared rule: an untracked direction has never been studied,
    so it's due; only a card with *neither* tracked falls back to the legacy
    top-level `nextReview`. Closed the stale-test housekeeping item with it.
  - **Review's landing is the collection picker.** Direction chips moved inside
    the chosen collection — a separate axis, and collapsing the two into one
    chip row would multiply out. A single collection (every Korean-only
    session) skips the picker entirely. `?collection=` preselects for the
    handoff from a deck and is consumed once, or "change collection" would be
    dragged straight back to it.
  - **Pack cards left `/cards` entirely** — not hidden behind a chip. "Only my
    cards" is what makes that surface coherent. Management moved to the deck
    page, inline above the grid so `40 / 107` progress and the pronounce
    buttons survive. Only the back side is editable: rewriting あ would unmatch
    the entry from the deck it came from.
  - **Review this deck** enrols every unsaved entry in one batched write
    (`saveFlashcardsBatch`, chunked at 400) and routes into that collection.
    Enrolling hiragana creates ~214 due items at once, uncapped — contained to
    the one collection, which is much of why dropping "All" works.
  - **Decks became a nav item on both platforms**, and the conditional link on
    Learn went with it. On mobile that meant moving `app/decks/` into the tab
    group with its own `Stack` — without that layout expo-router flattens the
    deck routes into the Tabs navigator and `FloatingTabBar` maps over every
    route, so each surfaces as an extra icon drawing the generic fallback.
    Drill stayed on the root stack, where the tab bar still gives way to it.
    Route tree checked by running expo-router's own `getRoutes` over `app/`.
  - Two knock-ons worth knowing: `/cards` **export now covers only your own
    cards**, since it reads the same scoped list; and **"Review this deck" is
    `cards`-packs only**, because `packId` is written solely by
    `buildPackCardDraft` — a TOEIC word saved via Learn carries none and stays
    in My Cards.
  - **Crash on picking a collection** (PR #52, 2026-07-26) — found by the first
    Expo Go pass. `collectionId` was set in a handler and the queue for it built
    in an effect, leaving one render where the new collection was paired with
    the previous one's queue, `index` and `done`. Broke *every* path into a
    mobile session, not just the picker. `queueFor` now records what the queue
    was built for and the render waits for the two to agree. See
    [lessons.md](lessons.md) — the general shape is worth not repeating.
  - **Verified in Expo Go 2026-07-26:** picking a collection and reviewing a
    pack (katakana). ⚠️ **Still unverified on device:** the five-tab bar, the
    deck → `/review` handoff (`router.navigate` across tab groups), drill still
    opening full-screen above the tabs, and the deck page's manage panel.

### Design & polish
- **Design system** — Forest/Sonokai/Paper/System themes, Source Code Pro,
  localized UI (EN + KO)
- **Desktop side navigation** (`feat/side-nav`, 2026-07-08) — fixed `SideNav`,
  collapsible icon rail, shared `SettingsMenu`
- **Theme rework + review/nav polish** (`feat/theme-rework`, 2026-07-09) —
  pre-paint inline script kills the theme and sidebar flashes; System theme;
  Sonokai replaces indigo Slate; review buttons no longer jump on reveal

### Content & audio
- **Pronunciation audio** (`feat/pronunciation-audio`, 2026-07-11) — Korean
  only. Google Cloud TTS Chirp 3: HD (`ko-KR-Chirp3-HD-Charon`) at
  `speakingRate: 0.85`. Lazy-generated on first play, cached in Firebase Storage
  keyed by text+language+voice+rate. Other languages return a clean "not
  available" until a voice is added to `STUDY_LANGUAGE_CONFIGS`.
- **Korean-user UX + TOEIC vocab pack** (PR #34, 2026-07-13) — setup modal step
  2 localized to the chosen native language; cards import/export fully localized
  EN+KO with `{token}` interpolation; **TOEIC Core Vocabulary pack v1** —
  `packages/core/src/packs.ts`, 133 curated words, `PacksModal` with
  saved-marking + progress, tap-a-word → normal Learn flow, polysemes carry
  context hints. ImportModal is paste-only; goal-based generation is still a
  coming-soon placeholder.
- **Depth/examples sense fix** (PR #35, 2026-07-14) — depth and examples prompts
  pinned to the disambiguated sense across all four routes. Fixes pack context
  hints, the disambiguation picker, and "not what you meant" in one go.
- **Word of the day fixes** (PR #37, `fix/wotd-disambiguation`) — four commits:
  pronunciation buttons on example sentences; WOTD sense pinned when opening its
  explanation (`briefDefinition` passed as a context hint); **WOTD persisted in
  Firestore** — one doc per `date_studyLanguage_nativeLanguage` in the
  `wordOfTheDay` collection, with `create()` resolving the first-request race,
  so the CDN header is now only a fast path and consistency no longer depends on
  cache behavior; prompt steered toward practical, date-relevant picks.

### iOS launch & mobile parity
- **iOS TestFlight prep** (PR #38, 2026-07-19) — bundle ID `com.tegi.amgi`,
  icon, env vars; production build submitted to App Store Connect; privacy
  policy page (`apps/web/src/app/privacy/page.tsx`) written from an actual audit
  of what the app collects
- **EAS OTA automation** (PRs #39–#41, 2026-07-21) — `mobile-ota-update.yml`
  publishes on pushes to `main` touching `apps/mobile/**` or `packages/core/**`;
  `mobile-typecheck.yml` gates PRs; `runtimeVersion` pinned to `appVersion`,
  `appVersionSource: remote`, iOS build auto-increment
- **Mobile ↔ web parity** (4 phases, 2026-07-21) — closes the old "mobile is
  Korean-only" gap:
  - *Phase 1* — study-language support across Learn/Cards/Review/Settings,
    `UserContext`, firestore + gemini services
  - *Phase 2* — Learn-screen features: `PacksModal`, `PronounceButton`
    (`expo-audio`), word of the day
  - *Phase 3* — Cards import/export, `CardDetailModal`, bulk actions
  - *Phase 4* — streaming depth/examples with typewriter cursor, shared
    `Markdown` renderer
- **Korean TestFlight beta info** (PR #42, 2026-07-21) — Korean privacy policy
  at `/privacy/ko` (mobile settings picks the version matching native language),
  localized mobile settings screen and tab accessibility labels, Korean beta
  listing copy in `docs/testflight-beta-info-ko.md`
- **EAS update channel fix** (PR #43, 2026-07-21) — production builds bound to
  the `default` channel so CI-published updates actually reach installed builds.
  ⚠️ Only affects builds cut *after* it — it can't retrofit a binary already in
  TestFlight.
- **Mobile theme parity** (PR #44, 2026-07-22) — mobile theme options matched to
  web; `THEMES` now carries its own `labelKey` instead of a separate lookup map.
  Held back from the previous build as a deliberate OTA test, which never
  arrived; **reaches the device in 1.0.2** (below).

### Demo-blocking fixes
- **Native/study language collision + WOTD repeats + WOTD save drift**
  (PR #47, 2026-07-24) — the three "Next up" items in one batch.
  `resolveStudyLanguage()` in `@amgi/core` moves the study language to the
  previous native language when changing native language would leave you
  studying your own; silent, applied in both `UserContext`s. `/api/word-of-the-day`
  now reads the last 60 days of picks for the language pair **by document ID**
  (no composite index, so no manual Firestore step) and feeds them to the prompt
  as an exclusion list, retrying once on a collision. The card's explanation is
  generated and stored *with* the word, so tapping it is a read — halving the
  Gemini calls per word and ending the wording drift between the card and the
  saved flashcard; `wordOfTheDayCore()` reconstructs it for older documents.
  Also fixed a stale study-language cache guard that restored only Korean and
  Swedish, dropping French/Japanese/English learners back to the Korean deck.
- **Mobile Learn empty state + WOTD loading skeleton**
  (`fix/mobile-learn-empty-state`, merged straight to `main` 2026-07-24 — no
  PR) — the two confirmed mobile defects plus the WOTD loading
  item they shared a fix with. Saving a card no longer suppresses the empty
  state that hosts the word of the day, example chips and the packs/generate
  links: `isEmpty` dropped `!saveSuccess` and the banner renders inside the
  empty state, matching web. A successful save also clears a stale error from a
  failed depth load, which suppressed the empty state the same way. The mobile
  tagline was **cut entirely** — the screen read as crowded — so the empty
  state is now blank above the search bar; the resting padding that holds the
  search ~40% up the screen became a shrinkable spacer, so a short screen gives
  that space back instead of squeezing content into an overlap. Both platforms
  show a skeleton at the WOTD tile's real height while it loads, which removes
  the reflow that caused the overlap in the first place.

## Builds

Under the no-OTA model every mobile change reaches users through one of these,
so this is the record of what actually landed on the phone and when.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 1.0.2 | 4 | 2026-07-24 | `0288136` — version bump on `release/mobile-1.0.2` |
| 1.0.1 | 3 | 2026-07-21 | `a85270d` — merge of PR #43 (EAS channel fix) |
| 1.0.1 | 2 | 2026-07-21 | `4d217f3` — runtimeVersion pin, pre-channel-fix |
| 1.0.0 | 1 | 2026-07-17/18 | `db8a6ea` — merge of PR #37; two builds off the same commit |

Build 3 is the binary that was in TestFlight before this release, so **1.0.2 is
the first build carrying anything merged after 2026-07-21** — mobile theme
parity (PR #44), the Learn empty state + WOTD loading skeleton fixes, and the
language-collision / WOTD batch (PR #47).

**1.0.2** — EAS build `39eb6ad6`, submitted to App Store Connect and accepted
for processing. ⚠️ What's *not* knowable from the repo: whether Apple finished
processing, and whether the build was actually distributed to testers. Confirm
in the console before assuming testers have it.

Not yet verified on the build itself (the checklist item that can only be done
on a real binary, not Expo Go): pronunciation audio, CSV/Anki export, sharing.

## In Progress

- **iOS TestFlight external testing** — the code and infrastructure side is
  done and merged; what remains is App Store Connect console work: Beta App
  Review submission, external group + public link. Context worth keeping:
  - Tegi's account is enrolled as **Individual**, which blocks any
    non-account-holder from generating certs — worked around with an App Store
    Connect API Key.
  - Bundle ID `com.tegi.amgi` is **disposable**. A real public launch under the
    user's own account will be a fresh relaunch, not a migration — Apple's App
    Transfer doesn't cover TestFlight-only apps.
  - ⚠️ Current console state (approved? link live?) isn't knowable from the
    repo — confirm before assuming.

## Decisions

Calls that are **closed**. They live here rather than in
[backlog.md](backlog.md) so the backlog stays a list of open work — but the
reasoning is kept, because a decision with its reasoning lost gets reopened by
the next person to notice the symptom.

- **Decks page: drilling lives there, not in Review** (2026-07-25). The
  alternative considered was letting Review pick a deck and leaving Decks as a
  passive display. Rejected because it makes Review mean two things: if a
  deck-scoped Review still respects due dates you get 4 of 71 kana and can't
  drill, and if it ignores them there are now two loops behind one tab with no
  way for the user to tell which one they'll get. Drill is a closed set,
  repeatable, not due-gated; Review is "what the scheduler says". Decks is the
  library, drill is entered from a deck.
  - **Amended 2026-07-26 (PR #51):** the "and Review keeps its whole-collection
    default, gaining a *filter* later" half is superseded. Review composes
    collections instead of filtering a pool. The load-bearing part stands
    unchanged and is why: a deck-scoped Review is still due-gated and still
    isn't drill, so the two loops remain distinct. What changed is only that
    "which cards" is now a choice you make before starting rather than a
    narrowing of one queue.
- **Drill writes no SM-2 state** (2026-07-25). Practice and scheduling stay
  separate, so grinding the kana chart five times in an afternoon can't wreck
  intervals. Cards saved from a pack still surface in Review on their own
  schedule. If drill later feels like it "doesn't count", the fix is showing
  progress in the deck, not writing to the scheduler.
- **No "All cards" row on the decks page** (2026-07-25). Proposed to make the
  Decks/Cards naming read the Anki way round, then dropped — it's a nav entry
  pointing at a nav entry, and a naming fix isn't worth a fake row. The one
  thing it would genuinely have bought is *drill my whole collection ignoring
  due dates*, which neither Cards nor Review offers; nobody has asked for it,
  and if it's ever wanted it's a button on Cards, not a deck.
- **~~`/decks` is a route, not a nav tab — for now~~ → reversed 2026-07-26**
  (PR #51). Decks is a nav item on both platforms now, unconditionally. The
  trigger below was pack *coverage*; what actually justified it was the
  **model** changing — a pack became a collection you review, a peer of Cards,
  and a peer doesn't live behind a link on Learn. The empty-for-four-languages
  objection was answered rather than outgrown: a *conditional* nav item would
  reflow the bar on every study-language switch, which is worse than a quiet
  empty state, so the empty state says what a pack is instead of promising one.
  The deferred Decks-vs-Cards naming collision comes due with this — the nav now
  reads Learn / Review / Cards / Packs, using "Packs" rather than "Decks" so the
  two nav entries don't ask to be compared as Anki-style decks. The original
  reasoning, kept because it explains what the trigger was watching for:
- **`/decks` is a route, not a nav tab — for now** (2026-07-25). `VOCAB_PACKS`
  (`packages/core/src/packs.ts:212`) covers English and Japanese only, so
  `getVocabPacks()` returns `[]` for Korean, Swedish, French and Traditional
  Chinese. A tab would be empty for four of six study languages and would change
  contents on study-language switch, which no other nav item does — that teaches
  people the page is worthless, which is worse than the modal it replaces.
  Entered from Learn instead, so a Japanese learner sees it and a Swedish
  learner doesn't. **Promote it to a tab when pack coverage justifies it** — the
  trigger is coverage, tied to the packs item in [backlog.md](backlog.md), not
  the kana work. The Decks-vs-Cards naming collision is deferred with it: a
  route reached from Learn doesn't sit next to Cards asking to be compared, so
  no rename is owed until it becomes a tab.
- **The app keeps the name "Amgi"** (2026-07-25). The open question was whether
  암기 would still fit as the app grew past Korean; it was weighed and the
  answer is yes. The name is settled, the rename backlog item is gone, and the
  "cheaper to rename before public launch" urgency goes with it. A domain can be
  bought against the current name whenever it's wanted. Don't re-raise this as
  growth advice — it was considered and declined.
- **`cmn-TW-Wavenet-A` stays** for Traditional Chinese (2026-07-25). Samples in
  `audio-test/lang-voices/` were listened to against `cmn-CN-Chirp3-HD-Charon`
  and accepted. `cmn-TW` has no Chirp 3: HD voice at all, so this trades voice
  quality for a Taiwanese rather than Mainland accent — the accent won.
- **A single kana may sound different from the rest of its deck** (2026-07-25).
  Single characters route to a Neural2 voice while everything longer uses
  Chirp 3: HD, so the speaker audibly changes between a kana tile and a
  sentence. Accepted: correctness beat consistency, and moving Japanese and
  Korean wholesale to Neural2 would cost quality on longer text. **Not a
  consistency bug** — if this resurfaces as a complaint, it's a re-decision, not
  a fix.
- **No OTA** (2026-07-23) — see Known Issues below and
  [tech-stack.md](tech-stack.md).

## Known Issues

Root-caused and queued in [backlog.md](backlog.md) — see there for scope.

_(The two mobile Learn defects that sat here are fixed and shipped in
1.0.2 — see Builds.)_

Parked, not fixed:
- **OTA updates never reached the device** — CI published PR #44 successfully
  (run `29892869152`) but the theme change never appeared. Repeated debugging
  attempts dead-ended, so **OTA was abandoned on 2026-07-23** rather than
  diagnosed. The shipping model is now Expo Go for development and production
  builds for release; see [tech-stack.md](tech-stack.md). Not a blocker under
  that model — reopen only if there's a specific reason to want OTA back.

Resolved:
- **Word-of-the-day reload variance** — was previously logged as "reviewed and
  accepted" on the reasoning that the CDN `s-maxage=86400` cache kept it stable
  in prod. Actually **fixed** in PR #37 (`d0e07ac`): Firestore is now the source
  of truth, so the word is stable regardless of cache behavior or environment.
