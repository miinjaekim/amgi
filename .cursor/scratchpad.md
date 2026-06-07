# Amgi AI Project Scratchpad

## 1. Project Vision & Goals

### Background & Motivation
Language learners bounce between two tools:  
• an LLM for nuanced explanations  
• a flash-card app for spaced repetition  
That context-switch kills flow and hurts retention. Amgi AI should be ONE place where learners can ask, understand, and remember new words without juggling tools.

**Core Aspiration:**  
Feel like "chatting with a brilliant native speaker who instantly turns each explanation into the perfect flash-card, then reminds you just before you forget."

### Success Criteria
- Users can capture new words and explanations in a single, uninterrupted flow
- Users can review saved words with spaced repetition
- The app adapts explanation depth to user level (beginner/advanced)
- Progress is visible at a glance (streaks, review counts)
- Users can easily export their data
- Clear, honest privacy and data ownership policies
- Users feel motivated to return daily (gentle encouragement, XP, streaks)
- Early users request support for additional languages

### Design Principles
• Stay in flow – UI never drags attention away from the word  
• Depth on demand – Enough detail by default; drill deeper only when curious  
• Progress is visible – Streaks and review counts are always one glance away  
• Start narrow, expand later – Korean first, but architecture must welcome future languages/media  
• Own your learning – Honest data policies, no dark patterns, easy export

### Long-term Vision
• Multi-media prompts (image → card, audio → card)  
• Social layer: share decks, community explanation presets, friendly challenges  
• AI-driven pronunciation feedback  
• Cross-language "bridge" explanations (e.g., show kanji if the user knows Chinese)

## 2. Technical Architecture

### Technology Stack
- **Frontend:** React with Next.js 16 (App Router)
- **Database:** Firebase Firestore
- **AI Integration:** Google Gemini 2.5 Flash (proxied through Next.js API route)
- **Authentication:** Firebase Authentication (Google provider)
- **Deployment:** Vercel

### Data Model
- **Flashcard:** term, translation, definition, hanja, examples, notes, uid, createdAt
  - `frontToBack`: { nextReview, interval, ease, repetitions }
  - `backToFront`: { nextReview, interval, ease, repetitions }
- **User:** Firebase Auth user (no separate Firestore user doc yet)
- **Progress/Streaks:** not yet implemented

## 3. Project Status

### Completed
- [x] Core learn flow: enter term → Gemini explanation → save as flashcard
- [x] Explanation output: definition always visible, expandable context/hanja/examples/flashcard
- [x] Firebase Auth (Google sign-in) and Firestore persistence
- [x] Bidirectional spaced repetition review (SM-2 algorithm)
- [x] Review on dedicated `/review` page (Korean→English and English→Korean)
- [x] Simplified card backs: translation shown first, details expandable
- [x] "Again" scheduling: failed cards queued for next session, not current
- [x] AmgiLogo component and design system (color palette, mono font)
- [x] Header with nav, logo, profile picture with fallback avatar
- [x] Gemini API key proxied server-side (not exposed in browser bundle)
- [x] Firestore security rules restrict reads/writes to card owner
- [x] Next.js upgraded to 16.2.7 (security fix)
- [x] Review page styled to match design system palette

### Upcoming
- [ ] **Streaks and progress visibility** — core to daily engagement; nothing built yet
- [ ] **Onboarding** — new users land with no guidance on what the app does
- [ ] **Export** — CSV/Anki export for data ownership
- [ ] **Adaptive explanation depth** — beginner vs. advanced explanations
- [ ] **Responsiveness** — mobile layout not yet verified
- [ ] **Card search/filter** — becomes important as card count grows

## 4. UI/UX Guidelines

### Design System
- **Color Palette:**
  - Background: #173F35
  - Muted/secondary: #418E7B
  - Text: #E9E0D2
  - Highlight: #EAA09C
- **Typography:** Source Code Pro (mono)
- **Layout:** Minimal, focused — inspired by Monkeytype

### Open Design Questions
1. How does the user set or change their explanation-depth preference?
2. What does the onboarding flow look like for a new user?
3. How are streaks and XP visually represented? (header? dedicated page?)
4. What export formats are supported (CSV, Anki)?

## 5. Lessons Learned
- Git pushes and scratchpad updates happen in parallel with code changes
- Always proxy third-party API keys through a server-side route — never use NEXT_PUBLIC_ for secret keys
- Run `npm audit` if vulnerabilities appear in the terminal
- Always ask before using `git --force`
- Firestore rules must be updated manually in the Firebase console — they are not part of the codebase
