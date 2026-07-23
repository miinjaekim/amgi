# Project Status

_Reconciled against `main` @ `a85270d` on 2026-07-23._

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
  the `default` channel so CI-published updates actually reach installed builds

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

None currently tracked.

Reviewed and accepted:
- **Word-of-the-day reload variance** (2026-07-08) — the CDN `s-maxage=86400`
  cache keeps it stable on deployed Vercel, which is what matters; only local
  dev sees a new word per reload. Revisit only if prod behaves otherwise —
  candidate fixes were localStorage per device, a shared Firestore doc, or
  deterministic generation.
