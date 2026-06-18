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
- `term`, `translation`, `formality` (optional), `definition` (optional), `hanja` (optional), `examples` (optional), `notes` (optional)
- `termLanguage`: 'Korean' | 'English' — language of the input term
- `korean`: fixed Korean side of the card
- `english`: fixed English side of the card
- `uid`, `createdAt`
- `frontToBack`: { nextReview, interval, ease, repetitions } — Korean → English direction
- `backToFront`: { nextReview, interval, ease, repetitions } — English → Korean direction

**API shape (term explanation):**
- Fast call (`/api/explain`): `term, termLanguage, korean, english, translation, formality`
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
- [ ] **Card detail view** — tapping a saved card shows the full explanation (definition, cultural context, hanja, examples) generated at save time. Data is already on the card; needs a drawer or `/cards/[id]` page to surface it.
- [ ] **Manage cards during review** — edit, archive, or delete a card from the review screen without leaving the session. Useful for fixing typos or retiring mastered cards.
- [ ] **Dedicated cards page (`/cards`)** — the scrolling list on Learn doesn't scale past ~20 cards. A separate page with search, filter, and sort; natural home for bulk actions. Supersedes the standalone "Card search/filter" item.
- [ ] **Archive instead of delete** — soft-delete cards you're pausing. Archived cards skip the review queue but remain accessible and restorable.
- [ ] **Bulk actions** — select multiple cards to delete or archive. Depends on the dedicated cards page.

**2. Engagement**
- [ ] **Streaks and progress visibility** — streak count and cards reviewed today, shown in the header or a dashboard. Core to daily habit formation; nothing built yet.

**3. Infrastructure**
- [ ] **Export** — CSV/Anki export for data ownership and portability.
- [ ] **Shared term cache** — Firestore `terms` collection keyed by normalized term + language. Check before calling LLM; write on miss. Could evolve into a community dictionary.
- [ ] **Adaptive explanation depth** — beginner vs. advanced setting that adjusts how much detail Gemini returns.

**4. Future / speculative**
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
