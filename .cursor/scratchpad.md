# Amgi Project Scratchpad

## 1. Vision

**Core aspiration:** Feel like "chatting with a brilliant native speaker who instantly turns each explanation into the perfect flashcard, then reminds you just before you forget."

Language learners bounce between two tools — an LLM for nuanced explanations and a flashcard app for spaced repetition. That context-switch kills flow and hurts retention. Amgi is ONE place to ask, understand, and remember.

**Design principles**
- **Stay in flow** — UI never drags attention away from the word
- **Depth on demand** — enough detail by default; drill deeper only when curious
- **Progress is visible** — streaks and review counts are always one glance away
- **Start narrow, expand later** — Korean↔English first, architecture must welcome more languages
- **Own your learning** — honest data policies, no dark patterns, easy export

**Long-term vision:** multi-media prompts (image/audio → card), social layer (shared decks, challenges), AI pronunciation feedback, cross-language bridge explanations.

---

## 2. Tech Stack

**Web**
- **Frontend:** React / Next.js 16 (App Router)
- **Database:** Firebase Firestore
- **AI:** Google Gemini 2.5 Flash, proxied through Next.js API routes (key never exposed to browser)
- **Auth:** Firebase Authentication (Google sign-in)
- **Deployment:** Vercel

**Mobile**
- **Framework:** Expo SDK 54 / React Native 0.81 with Expo Router (file-based navigation)
- **Auth:** Firebase Authentication via `expo-auth-session` + `expo-web-browser` (Google OAuth)
- **Storage:** Firebase Firestore + `@react-native-async-storage/async-storage`
- **Updates:** EAS (Expo Application Services) OTA updates via `expo-updates`
- **Shared code:** `@amgi/core` workspace package (types, SM-2 logic, Gemini client)

---

## 3. Data Model

### Flashcard type architecture

Cards use a **discriminated union** — a minimal shared base type plus language-specific subtypes. Each language (or topic) gets exactly the fields that make sense for it, nothing more.

```ts
// Only the structural skeleton — identity, ownership, and SRS data
interface BaseFlashcard {
  id?: string;
  uid: string;
  createdAt: Date;
  archived?: boolean;
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
}

// All content is language-specific
interface KoreanFlashcard extends BaseFlashcard {
  studyLanguage: 'Korean';
  term: string;
  termLanguage: 'Korean' | 'English';
  korean: string;
  english: string;
  formality?: string;   // Casual | Standard | Formal | Honorific | Slang
  hanja?: string;
  briefDefinition?: string;
  definition?: string;
  notes?: string;
  examples?: { korean: string; english: string }[];
  translation?: string; // legacy only — old cards pre-dating korean/english fields
}

interface SwedishFlashcard extends BaseFlashcard {
  studyLanguage: 'Swedish';
  term: string;
  termLanguage: 'Swedish' | 'English';
  swedish: string;
  english: string;
  briefDefinition?: string;
  examples?: { swedish: string; english: string }[];
  // no formality, no hanja
}

type AnyFlashcard = KoreanFlashcard | SwedishFlashcard;
```

**Why `studyLanguage` is stored on the Firestore document** (not just inferred from the collection name): the collection name controls routing — which documents get queried. `studyLanguage` on the document makes each document self-describing, enables a single shared mapper function, and protects against future migrations where collection context might not be available. It's a small redundancy with meaningful practical benefits. The mapper handles the Korean legacy case (old cards without the field) by defaulting:

```ts
function mapDocToFlashcard(doc): AnyFlashcard {
  const data = doc.data();
  if (data.studyLanguage === 'Swedish') return { ...data, id: doc.id } as SwedishFlashcard;
  return { ...data, studyLanguage: 'Korean', id: doc.id } as KoreanFlashcard;
}
```

**`termLanguage` detection differs by script.** Korean supports bidirectional lookup (user can type Korean or English) and detection is trivial — Hangul is visually distinct, so a Unicode regex identifies it instantly. Swedish also supports bidirectional lookup (type Swedish or English), but Swedish uses the Latin alphabet, indistinguishable from English by character set alone. For Latin-script languages, `termLanguage` is set by Gemini in the model response rather than detected client-side. This approach generalizes to any future Latin-script language and removes the fragile local detection entirely.

**Exhaustiveness checking** via TypeScript `never` ensures every card type is handled — if `JapaneseFlashcard` is added to the union and a switch/if-chain doesn't cover it, the compiler errors before it can silently fail at runtime.

**Future extensibility:** the same pattern works beyond languages. A `MedicalFlashcard` could carry `bodySystem` or `drugClass`; a `LegalFlashcard` could carry `jurisdiction` and `caseReference`. Further out: letting users configure which fields appear on their cards for a given deck (e.g. toggling off formality, adding a custom grammar note field). The type-per-domain architecture makes this tractable.

### Firestore collections

- `cards` — Korean deck (existing, untouched)
- `cards_swedish` — Swedish deck
- Future languages follow the same `cards_{language}` pattern

`getCardsCollection(studyLanguage)` routes to the correct collection. Firestore security rules must be added manually per collection (no wildcard support). Composite index on `archived + createdAt` required per collection — Firebase provides a direct creation link on the first query error.

### User preferences (`users` collection)
- `nativeLanguage`: string — the user's native language (e.g. "English")
- `studyLanguage`: string — which deck is currently active (e.g. "Korean", "Swedish")
- `streak`, `longestStreak`, `lastReviewDate`, `reviewedToday` — SRS progress

### API shape (term explanation)
- Fast call (`/api/explain`): returns `term, termLanguage, korean/swedish, english, formality, briefDefinition`
- Depth call (`/api/explain/depth`, user-triggered): returns `definition, hanja?, notes?`
- Examples call (`/api/explain/examples`, user-triggered): returns `{ examples: ExamplePair[] }`
- Stream variants exist for depth and examples (`/depth-stream`, `/examples-stream`)

---

## 4. Project Status

### Shipped
- **Core loop** — term lookup → Gemini explanation → save as flashcard → bidirectional SM-2 spaced repetition review (direction filter, shuffled queue)
- **Infrastructure** — Firebase Auth, Firestore + security rules, Gemini proxied server-side, Next.js 16.2.7, Vercel deployment
- **Explanation quality** — fast call (translation + briefDefinition) + user-triggered depth and examples; term disambiguation with multiple-meaning selection; markdown rendering; NDJSON streaming for examples
- **Design system** — Forest/Slate/Paper theme, Source Code Pro mono font, localized UI (English + Korean via `i18n.ts`), mobile bottom nav, compacted header
- **Cards page** — search, filter (active/archived/all), sort (newest/oldest/A→Z), card order toggle, card detail modal, edit/archive/delete, bulk actions, CSV + Anki export, bulk import
- **Review loop** — manage cards mid-session (edit/archive/delete), offline banner + cached review, force-sync button
- **Streaks** — streak count + cards reviewed today in header; persisted to Firestore
- **Streaming + cache** — depth and examples stream with typewriter animation; Firestore IndexedDB persistent cache for instant repeat visits
- **First-time modal** — `LanguageSetupModal` shows for all visitors until native language is set; saves to localStorage + Firestore on sign-in

### In Progress

**Swedish support** — Branch: `feat/swedish` ✅ shipped

- `studyLanguage` stored on card documents (self-describing)
- Two-step language setup modal (native language → study language)
- Study language switcher in the header settings dropdown
- `getCardsCollection` helper routes Korean → `cards`, Swedish → `cards_swedish`
- All CRUD functions accept `studyLanguage`; cards carry `swedish` field instead of `korean`
- All API routes accept `studyLanguage` and generate Swedish-appropriate Gemini prompts
- `studyLanguage` in `UserContext` + `UserPreferences`, persisted to Firestore + localStorage
- Learn, Cards, Review pages all pass `studyLanguage` and render Swedish cards correctly
- Firestore security rule for `cards_swedish` ✅ added (Firebase console)
- Composite index for `cards_swedish` on `archived + createdAt` — will be auto-prompted on first filtered query

### Backlog

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology, cultural context, example-heavy). Store in `users/{uid}`; include in Gemini prompt.
- [ ] **Word of the day** — daily featured term on Learn screen. Curated list vs. Gemini-generated? Pairs naturally with shared term cache.
- [ ] **Goal-based vocab lists** — ask why user is learning, generate a starter deck. Feeds into bulk import.
- [ ] **Push notifications** — daily review reminders. Post-launch.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term + language. Reduces cost; defer until traffic justifies it.
- [ ] **Conversation practice** — on hold. Transcription + per-participant feedback. MVP is end-of-conversation feedback on a recorded file.

---

## 5. UI/UX

**Design system**
- Background: `#173F35` · Muted: `#418E7B` · Text: `#E9E0D2` · Highlight: `#EAA09C`
- Font: Source Code Pro (mono)
- Style: minimal, focused — inspired by Monkeytype

**Open design questions**
- Theme (Forest/Slate/Paper) on mobile: keep as-is or design a simpler native dark/light toggle?
- What does the onboarding flow look like beyond the language modal — tooltip hints or a guided first search?

---

## 6. Lessons Learned

- Always use Git — new branch per feature, commit as work completes.
- Always proxy third-party API keys server-side — never `NEXT_PUBLIC_` for secrets.
- Firestore security rules are manual (Firebase console) — not in the codebase. Add rules for every new collection.
- Firestore composite indexes: required for multi-field filter+sort queries. Firebase gives a direct creation link on the first error.
- When adding a new boolean field to existing Firestore documents, backfill old records — `!=` and `==` exclude documents where the field is missing entirely.
- `nativeLanguage` uses `undefined` (not yet loaded) vs `null` (loaded, not set) vs `string` (set) — this distinction drives the language modal.
- In Next.js App Router, reading `localStorage` in a `useState` initializer causes a hydration mismatch. Always read it in a `useEffect`.
- To push an OTA update to the mobile app: run `npx eas-cli update --branch main --message "..."` from `apps/mobile`.
- **Mobile OAuth redirect:** `makeRedirectUri()` always returns `exp://...` which Google rejects. Fix: explicitly pass the reversed iOS client ID scheme as `redirectUri`.
- **Expo monorepo Hermes error:** caused by root-level `babel-preset-expo@56`. Fix: pin `babel-preset-expo@~54.0.11` in `apps/mobile/`.
- **React version conflict in monorepo:** use `config.resolver.resolveRequest` in `metro.config.js` to force all `react` imports to the local version.
- **`initializeAuth` already-initialized on fast refresh:** wrap in try/catch and fall back to `getAuth(app)`.
- **`EXPO_PUBLIC_*` env vars** are baked at bundle time — restart Metro with `--clear` after changing `.env.local`.
