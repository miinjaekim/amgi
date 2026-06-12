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
- `term`, `translation`, `definition`, `hanja`, `examples`, `notes`
- `termLanguage`: 'Korean' | 'English' — language of the input term
- `korean`: fixed Korean side of the card
- `english`: fixed English side of the card
- `uid`, `createdAt`
- `frontToBack`: { nextReview, interval, ease, repetitions } — Korean → English direction
- `backToFront`: { nextReview, interval, ease, repetitions } — English → Korean direction

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

### Upcoming — Engagement & Polish
- [ ] **Streaks and progress visibility** — core to daily engagement; nothing built yet. Show streak count and cards reviewed in header or dashboard.
- [ ] **Onboarding** — new users land with no guidance. A brief first-use walkthrough or empty-state copy explaining what to do.
- [ ] **Responsiveness** — mobile layout not yet verified or optimized.

### Upcoming — Language-Specific Explanation Generation
- [ ] **Tailored explanation fields by term language** — English terms don't benefit from a hanja section; Korean terms do (when applicable) and may benefit from a formality/speech-level note (존댓말/반말). The API route already knows `termLanguage`, so the prompt can branch: English terms get etymology or Greek/Latin roots instead of hanja; Korean terms get hanja (when it applies) plus an optional formality note. The "only when applicable" behavior is already partially in place — Gemini returns an empty string for hanja when irrelevant. Extend that pattern to other fields. **To explore:** whether Tambo (a company the user mentioned) is relevant here — need more context on what they offer.

### Upcoming — Conversation Practice
- [ ] **Live conversation transcription + feedback page** — a new page where users record a real conversation with another person. Amgi transcribes it live and gives per-participant feedback based on what each speaker said. Key open questions before scoping:
  - **Input model:** single device in a room (one mic, two voices) vs. two separate devices? Diarization (splitting audio by speaker) is the hard part — two devices is simpler.
  - **Transcription:** browser Web Speech API (free, limited) vs. a streaming service like Deepgram or AssemblyAI (better accuracy, paid).
  - **Feedback granularity:** real-time mid-sentence, or end-of-conversation summary? Real-time is much more complex.
  - **MVP definition:** likely end-of-conversation feedback on a recorded audio file is the right starting point before attempting live streaming.

### Upcoming — Data & Features
- [ ] **Export** — CSV/Anki export for data ownership
- [ ] **Card search/filter** — becomes important as card count grows
- [ ] **Adaptive explanation depth** — beginner vs. advanced setting

### Upcoming — Multi-Language
- [ ] **Speech level / register tagging** — tag terms with formality level (존댓말/반말). Low effort (prompt update), high value.
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
- Always proxy third-party API keys through a server-side route — never use `NEXT_PUBLIC_` for secret keys
- Firestore security rules must be updated manually in the Firebase console — they are not part of the codebase. Remember to add rules for any new collection.
- Run `npm audit` if vulnerabilities appear in the terminal
- Always ask before using `git --force`
- Work on features in a separate branch, not directly on `main`
- In Next.js App Router, reading `localStorage` in a `useState` initializer causes a hydration mismatch (server has no `window`). Always read it in a `useEffect` instead.
- `nativeLanguage` uses `undefined` (not yet loaded) vs `null` (loaded, not set) vs `string` (set) — this distinction drives the language modal and avoids false positives.
