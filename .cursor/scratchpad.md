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
- [x] Core learn flow: enter term → Gemini explanation → save as flashcard
- [x] Explanation output: definition always visible, expandable context/hanja/examples/flashcard
- [x] Firebase Auth (Google sign-in) and Firestore persistence
- [x] Bidirectional spaced repetition review (SM-2 algorithm)
- [x] Dedicated `/review` page
- [x] Simplified card backs: translation shown first, details expandable
- [x] "Again" scheduling: failed cards queued for next session, not current
- [x] Design system: AmgiLogo, color palette, mono font, header with nav and profile avatar
- [x] Gemini API key proxied server-side
- [x] Firestore security rules (cards restricted to owner; users collection for preferences)
- [x] Next.js upgraded to 16.2.7 (security fix)
- [x] Native language setting: first-time modal, stored in Firestore, explanations written in user's language
- [x] Review prompts are language-aware (English and Korean)
- [x] Settings menu — dropdown from header avatar; native language selector and sign out
- [x] UI localization — all interface strings routed through `src/lib/i18n.ts`; English and Korean supported
- [x] Fixed card sides — `korean`/`english` fields on every card; API detects `termLanguage` via Unicode heuristic; Gemini always returns both sides in their respective languages; migration backfills existing cards; learn page shows opposite-language translation
- [x] Consistent card display order — inline toggle on learn page (Korean/English on top)
- [x] Randomized review + direction filter — pre-review selector for Both / Korean→English / English→Korean; queue shuffled each session
- [x] Adaptive term explanation — fast call returns translation + formality tag immediately; definition/hanja/cultural notes and examples are separate user-triggered calls; card backs store translation only, definition surfaces in review detail drawer; formality tag shown in review details for Korean cards
- [x] Term disambiguation — ambiguous terms (e.g. 배: boat / belly / pear) surface possible meanings for the user to choose before explanation is generated; "not what you meant?" path lets users supply context and regenerate
- [x] Markdown rendering — explanation content now renders markdown (bold, bullets, etc.) as styled HTML instead of raw text
- [x] Gemini rate limit errors handled gracefully across all API routes — users see a friendly message instead of a crash
- [x] Bold markdown rendering fixed for Korean text — custom remark plugin handles CommonMark delimiter edge cases with CJK characters

### Priority: Initial User Readiness
Focus for introducing Amgi to unfamiliar users. Ordered by impact.

**High — blockers for strangers**
- [ ] **Onboarding / empty state** — new users land with no context. Need a brief explainer, example term, or guided first search so strangers know what to do immediately.
- [ ] **Auth flow placement** — confirm sign-in wall appears *after* a user has seen value, not before. Strangers who hit a login gate too early will leave.
- [ ] **Error state visibility** — verify that API failures and edge cases surface a clear message at every point in the flow, not a broken/blank state.

**Medium — affects whether users return**
- [ ] **Mobile experience** — likely the primary device for a language tool; layout not yet verified or optimized.
- [ ] **Review loop clarity** — first-time users may not understand what "Review" means or why to come back. Copy and empty state on the review page should make the SRS value obvious.

**Engagement (post-launch)**
- [ ] **Streaks and progress visibility** — core to daily engagement; nothing built yet. Show streak count and cards reviewed in header or dashboard.

### On Hold — Conversation Practice
- [ ] **Live conversation transcription + feedback page** — a new page where users record a real conversation with another person. Amgi transcribes it live and gives per-participant feedback based on what each speaker said. Key open questions before scoping:
  - **Input model:** single device in a room (one mic, two voices) vs. two separate devices? Diarization (splitting audio by speaker) is the hard part — two devices is simpler.
  - **Transcription:** browser Web Speech API (free, limited) vs. a streaming service like Deepgram or AssemblyAI (better accuracy, paid).
  - **Feedback granularity:** real-time mid-sentence, or end-of-conversation summary? Real-time is much more complex.
  - **MVP definition:** likely end-of-conversation feedback on a recorded audio file is the right starting point before attempting live streaming.

### Future — Themes & Polish
- [x] **Theme system** — CSS custom property–based theming with three palettes: Forest (current), Slate (dark, indigo accent), Paper (light, deep green accent). Stored in localStorage. Switcher in settings dropdown.

### Future — Data & Infrastructure
- [ ] **Shared term cache** — second Firestore collection (`terms`) keyed by normalized term + native language. Check cache before calling LLM; write on miss. At scale, popular terms are served from cache and LLM calls drop significantly. Could evolve into a community-driven dictionary.
- [ ] **Export** — CSV/Anki export for data ownership
- [ ] **Card search/filter** — becomes important as card count grows
- [ ] **Adaptive explanation depth** — beginner vs. advanced setting

### Future — Multi-Language
- [ ] **Hanja-focus mode** — emphasize Chinese character breakdown for users studying 한자. Defer until demand.

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
