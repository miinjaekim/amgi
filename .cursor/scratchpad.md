# Amgi AI Project Scratchpad

## 1. Vision & Goals

**Core Aspiration:**
Feel like "chatting with a brilliant native speaker who instantly turns each explanation into the perfect flash-card, then reminds you just before you forget."

### Why It Exists
Language learners bounce between two tools — an LLM for nuanced explanations and a flashcard app for spaced repetition. That context-switch kills flow and hurts retention. Amgi AI is ONE place to ask, understand, and remember.

### Success Criteria
- Users can capture new words and explanations in a single, uninterrupted flow
- Users can review saved words with spaced repetition
- Progress is visible at a glance (streaks, review counts)
- Users feel motivated to return daily
- Users can easily export their data
- Clear, honest privacy and data ownership

### Design Principles
- **Stay in flow** — UI never drags attention away from the word
- **Depth on demand** — enough detail by default; drill deeper only when curious
- **Progress is visible** — streaks and review counts are always one glance away
- **Start narrow, expand later** — Korean↔English first, architecture must welcome more languages
- **Own your learning** — honest data policies, no dark patterns, easy export

### Long-term Vision
- Multi-media prompts (image → card, audio → card)
- Social layer: share decks, community explanation presets, friendly challenges
- AI-driven pronunciation feedback
- Cross-language "bridge" explanations

---

## 2. Tech Stack & Data Model

### Stack
- **Frontend:** React with Next.js 16 (App Router)
- **Database:** Firebase Firestore
- **AI:** Google Gemini 2.5 Flash, proxied through a Next.js API route (key never exposed to browser)
- **Auth:** Firebase Authentication (Google sign-in)
- **Deployment:** Vercel

### Current Data Model

**Flashcard** (`cards` collection):
- `term`, `formality` (optional), `definition` (optional), `hanja` (optional), `examples` (optional), `notes` (optional)
- `termLanguage`: 'Korean' | 'English' — language of the input term
- `korean`: fixed Korean side of the card
- `english`: fixed English side of the card
- `uid`, `createdAt`, `archived` (boolean, optional — false = active, true = archived)
- `frontToBack`: { nextReview, interval, ease, repetitions } — Korean → English direction
- `backToFront`: { nextReview, interval, ease, repetitions } — English → Korean direction
- `translation` (optional, legacy): kept as read-only fallback for old cards missing `korean`/`english`

**API shape (term explanation):**
- Fast call (`/api/explain`): `term, termLanguage, korean, english, formality`
- Depth call (`/api/explain/depth`, user-triggered): `definition, hanja?, notes?`
- Examples call (`/api/explain/examples`, user-triggered): `{ examples: ExamplePair[] }`

**User preferences** (`users` collection):
- `nativeLanguage`: string ("English" | "Korean")

---

## 3. Project Status

### Completed
- **Core loop** — term lookup → Gemini explanation (translation, formality, definition, hanja, examples) → save as flashcard → bidirectional SM-2 spaced repetition review with direction filter and shuffled queue
- **Infrastructure** — Firebase Auth (Google sign-in), Firestore persistence + security rules, Gemini API proxied server-side, Next.js 16.2.7
- **Explanation quality** — adaptive fast call (translation/formality) + user-triggered depth and examples calls; term disambiguation with multiple-meaning selection and context regeneration; markdown rendering with Korean CJK delimiter fix
- **Design system** — AmgiLogo, Forest/Slate/Paper theme system, mono font, localized UI (English + Korean via `i18n.ts`), mobile bottom nav + compacted header, "Amgi · 암기" title
- **User readiness** — onboarding example chips, auth-wall only on save, error messages on all API failures, guest language/theme persistence via localStorage, review loop clarity (SRS subtitle, distinct empty states, review complete screen)
- **Card accuracy** — fixed `korean`/`english` fields on every card, Unicode `termLanguage` detection, edit/save field sync, consistent display order with inline toggle

### Up Next

**1. Card management** — highest priority
- [x] **Card detail view** — tapping a saved card opens a modal showing its full stored explanation (definition, hanja, cultural context, examples). Cards saved without depth show a prompt to load details before saving next time.
- [x] **Manage cards during review** — edit, archive, or delete a card from the review screen without leaving the session.
- [x] **Dedicated cards page (`/cards`)** — search, filter (active/archived/all), sort (newest/oldest/A→Z), card order toggle (KO/EN swap icon).
- [x] **Archive instead of delete** — soft-delete cards you're pausing. Archived cards skip the review queue but remain accessible and restorable.
- [x] **Bulk actions** — select multiple cards to archive or delete from the cards page.
- [x] **Learn page cleanup** — removed card list from learn page; cards managed exclusively on `/cards`.
- [x] **Save flashcard modal** — save/edit form now appears as a modal overlay instead of an inline section below the explanation.
- [x] **Animated loading states** — replaced static '...' / 'Loading...' text with a spinning indicator across all async buttons.

**2. Performance**
- [ ] **Speed up search/review** — LLM response latency is noticeable on the Learn screen; Firestore reads on review load can be slow. Investigate: streaming the Gemini response token-by-token so the UI starts rendering immediately, and caching/prefetching flashcards so the review queue is ready before the user navigates there.

**3. Deployment**
- [ ] **Fix GitHub deployment errors** — CI/CD pipeline has unresolved build or deploy failures. Investigate error logs and ensure main branch deploys cleanly to Vercel.

**4. Engagement**
- [ ] **Streaks and progress visibility** — streak count and cards reviewed today, shown in the header or a dashboard. Core to daily habit formation; nothing built yet.

**5. Infrastructure**
- [ ] **Export** — CSV/Anki export for data ownership and portability.
- [ ] **Shared term cache** — Firestore `terms` collection keyed by normalized term + language. Check before calling LLM; write on miss. Could evolve into a community dictionary.
- [ ] **Adaptive explanation depth** — beginner vs. advanced setting that adjusts how much detail Gemini returns.

**4. Future / speculative**
- [ ] **Personalised explanation preferences** — users set preferences for depth, formality, emphasis (etymology, cultural context, example-heavy) stored in `users/{uid}`. Gemini prompt includes a preferences block so explanations feel tailored over time. Start with 2–3 simple knobs in Settings, expand based on what users actually adjust.
- [ ] **Offline flashcard review** — cache the due queue locally (AsyncStorage or SQLite), sync on reconnect. Useful for subway/no-signal situations.
- [ ] **Push notifications** — daily review reminders. Open question: Day 1 feature or post-launch?
- [ ] **Offline mode via on-device model** — Gemma via WebGPU or Ollama for desktop. Open questions: model quality, WebGPU browser support, bundle size. Desktop companion app may be more viable short-term.
- [ ] **Hanja-focus mode** — emphasize Chinese character breakdown for 한자 learners. Defer until there's clear demand.

### On Hold — Conversation Practice
- [ ] **Live conversation transcription + feedback** — record a real conversation; Amgi transcribes and gives per-participant feedback. Key open questions:
  - **Input model:** single device + diarization vs. two separate devices?
  - **Transcription:** Web Speech API (free, limited) vs. Deepgram/AssemblyAI (accurate, paid)?
  - **Feedback granularity:** real-time mid-sentence or end-of-conversation summary? Real-time is much more complex.
  - **MVP:** end-of-conversation feedback on a recorded audio file is the right starting point before attempting live streaming.

---

## 4. UI/UX Guidelines

### Design System
- **Background:** #173F35
- **Muted/secondary:** #418E7B
- **Text:** #E9E0D2
- **Highlight:** #EAA09C
- **Font:** Source Code Pro (mono)
- **Style:** Minimal, focused — inspired by Monkeytype

### Open Design Questions
- How are streaks and XP visually represented? (in header? dedicated progress page?)
- What does the onboarding flow look like — tooltip hints or a guided first search?
- What export formats are supported (CSV, Anki, JSON)?
- Should saved cards sync instantly or batch-sync to Firestore?
- Theme (Forest/Slate/Paper) on mobile: keep as-is or design a simpler native dark/light toggle?

---

## 5. Lessons Learned
- Always use Git to manage progress — new branch for every feature, commit changes as work completes. This keeps the project organized and ensures there's always a working version to return to if something breaks.
- Always proxy third-party API keys through a server-side route — never use `NEXT_PUBLIC_` for secret keys
- Firestore security rules must be updated manually in the Firebase console — they are not part of the codebase. Remember to add rules for any new collection.
- Run `npm audit` if vulnerabilities appear in the terminal
- Always ask before using `git --force`
- Work on features in a separate branch, not directly on `main`
- In Next.js App Router, reading `localStorage` in a `useState` initializer causes a hydration mismatch (server has no `window`). Always read it in a `useEffect` instead.
- `nativeLanguage` uses `undefined` (not yet loaded) vs `null` (loaded, not set) vs `string` (set) — this distinction drives the language modal and avoids false positives.
- Firestore requires a composite index for any query that filters on multiple fields or filters + sorts. The error message includes a direct link to create it in the console. For new features with compound queries, create and commit the index in `firestore.indexes.json` before deploying.
- When adding a new boolean field to existing Firestore documents, backfill old records — Firestore's `!=` and `==` operators exclude documents where the field is missing entirely.
- **Mobile (Expo Go) OAuth redirect:** `makeRedirectUri()` always returns `exp://...` which Google rejects. Fix: explicitly pass the reversed iOS client ID scheme (`com.googleusercontent.apps.xxx:/oauthredirect`) as `redirectUri`. `ASWebAuthenticationSession` intercepts it natively without needing it in Info.plist.
- **Expo monorepo Hermes error ("private properties not supported"):** caused by root-level `babel-preset-expo@56` using `hermes-v1`. Fix: pin `babel-preset-expo@~54.0.11` as a devDependency in `apps/mobile/`.
- **React version conflict in monorepo:** web app's `react@19.2` at root conflicts with `react-native-renderer@19.1`. `extraNodeModules` is only a fallback. Fix: use `config.resolver.resolveRequest` in `metro.config.js` to intercept all `react` imports and force them to the local version.
- **`initializeAuth` already-initialized on fast refresh:** wrap in try/catch and fall back to `getAuth(app)`.
- **`EXPO_PUBLIC_*` env vars** are baked at bundle time — always restart Metro with `--clear` after changing `.env.local`.
