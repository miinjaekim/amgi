# Project Status

_Reconciled against `main` @ `f90e7d1` on 2026-07-23._

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
  Merged but **not yet visible on the device** — it was held back from the last
  build as a deliberate OTA test, and the update didn't arrive. See Known Issues.

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

- **WOTD repeats across days** — each date generates with no knowledge of prior
  picks, so common words recur. *(Next up)*
- **WOTD saving discrepancy** — tapping the card makes a fresh `/api/explain`
  call, so the saved card's wording can drift from the panel that was tapped.
  The *sense* is already pinned (PR #37); this is wording, not meaning. *(Next up)*
- **Native language switch strands the study language** — switching native
  language to Korean leaves study language on Korean, i.e. teaching a Korean
  speaker Korean. Hit during live demos. *(Next up)*
- **Mobile Learn: tagline overlaps the streak badge** when the WOTD tile loads
  in — hero is `flex: 1` with a `minHeight: 80` floor, so squeezed content
  overflows a centered box upward. *(High)*
- **Mobile Learn: stuck on the search bar after saving** — `isEmpty` includes
  `!saveSuccess`, so a successful save suppresses the empty state that hosts
  WOTD, example chips, and the packs button. *(High)*
- **OTA updates don't reach the device** — CI published PR #44 successfully
  (run `29892869152`) but the theme change never appeared. Undiagnosed; gates
  the whole continuous-shipping model, so every mobile fix currently waits on
  an App Store review. Needs its own branch. *(High — infrastructure)*

Resolved:
- **Word-of-the-day reload variance** — was previously logged as "reviewed and
  accepted" on the reasoning that the CDN `s-maxage=86400` cache kept it stable
  in prod. Actually **fixed** in PR #37 (`d0e07ac`): Firestore is now the source
  of truth, so the word is stable regardless of cache behavior or environment.
