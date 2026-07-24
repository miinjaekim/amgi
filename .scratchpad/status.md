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
