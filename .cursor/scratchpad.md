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
  gender?: string;   // 'en' | 'ett' | null — only for nouns
  briefDefinition?: string;
  definition?: string;
  notes?: string;
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
- `cards_english` — English deck (native-Korean learners; english study side, korean back)
- `cards_french` — French deck
- `cards_japanese` — Japanese deck
- Future languages follow the same `cards_{language}` pattern

**`STUDY_LANGUAGE_CONFIGS` registry** (`packages/core/src/types.ts`): per-language config — collection name, study/back field names, back language, and i18n keys for side labels, review-direction chips, and question prompts. UI and services look everything up through `getStudyLanguageConfig()`; adding a language = one registry entry + an `/api/explain` prompt branch + i18n keys (depth/examples routes are already generic).

`getCardsCollection(studyLanguage)` routes to the correct collection. Firestore security rules must be added manually per collection (no wildcard support). Composite index on `archived + createdAt` required per collection — Firebase provides a direct creation link on the first query error.

### User preferences (`users` collection)
- `nativeLanguage`: string — the user's native language (e.g. "English")
- `studyLanguage`: string — which deck is currently active (e.g. "Korean", "Swedish")
- `streak`, `longestStreak`, `lastReviewDate`, `reviewedToday` — SRS progress

### API shape (term explanation)
- Fast call (`/api/explain`): returns `term, termLanguage, korean/swedish, english, formality (Korean), gender (Swedish), briefDefinition`
- Depth call (`/api/explain/depth`, user-triggered): returns `definition, hanja? (Korean only), notes?`
- Examples call (`/api/explain/examples`, user-triggered): returns `{ examples: ExamplePair[] }`
- Stream variants exist for depth and examples (`/depth-stream`, `/examples-stream`)
- Swedish depth prompt omits the `HANJA:` section entirely; parser handles both formats via `text.includes('HANJA:\n')`

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
- **Swedish support** (`feat/swedish`, merged) — `studyLanguage` stored on card documents; two-step language setup modal (native → study language); study language switcher in header settings; `getCardsCollection` routes Korean → `cards`, Swedish → `cards_swedish`; all CRUD + API routes accept `studyLanguage` and generate Swedish-appropriate Gemini prompts; Firestore security rule for `cards_swedish` added
- **Swedish noun gender + save fix** (`feat/swedish-gender`, merged 2026-07-04) — `gender?: string` (`'en'` | `'ett'` | absent) added to `TermCore`/`SwedishFlashcard`; gender badge on Learn page, `CardDetailModal`, and review reveal; `saveFlashcardToFirestore` strips `undefined` values before `addDoc` (Firebase v9 throws on explicit `undefined`); `parseStreamedDepth` only includes keys with real values
- **Known-issue fixes + backlog batch** (PR #31, merged 2026-07-06) — stacked 10-commit chain: localized disambiguation options; "dig deeper" targets the study-language word (`getDepthTarget()`); hanja 훈음 readings; word of the day (CDN-cached `GET /api/word-of-the-day`); goal-based vocab lists (`POST /api/vocab-list` feeding bulk import); English (native-Korean learners), French, and Japanese study languages via the new `STUDY_LANGUAGE_CONFIGS` registry in `@amgi/core`; themed study-language dropdown in header settings. **Manual Firebase steps still pending:** security rules for `cards_english`, `cards_french`, `cards_japanese` + their `archived + createdAt` composite indexes.

### In Progress

Nothing currently — PR #31 merged, `main` is clean.

### Known Issues

- [ ] **Load Examples broken for French and Japanese** (possibly others). Likely root cause: `parseStreamedExamples` in `apps/web/src/app/page.tsx` only accepts lines where `(parsed.korean || parsed.swedish) && parsed.english` — French pairs are `{french, english}` and Japanese are `{japanese, english}`, so every line is filtered out. English study passes only because its pairs contain `korean`. Fix: accept any pair whose study-side field (per `STUDY_LANGUAGE_CONFIGS`) is present, e.g. via `getExampleSides`. Audit `isExamplePairArray` in review page / `CardDetailModal` for the same assumption while at it.

### Backlog

- [ ] **Goal-based vocab lists: handle ambiguity + rethink placement** — two problems: (1) terms that resolve as ambiguous are currently just skipped ("ambiguous — skipped"); need a flow to pick a meaning (reuse the disambiguation picker) or auto-pick the goal-relevant meaning by passing the goal as context to `/api/explain`. (2) Generation shouldn't live inside the Import button — reusing the import pipeline is right, but the entry point deserves its own home (e.g. Learn empty state, onboarding after language setup, or a dedicated "Starter deck" surface). Decide placement before building.
- [ ] **Side navigation bar** — move the top nav to a left sidebar like Claude/Instagram/ChatGPT web apps. Rework `Header`/`BottomNav` layout; decide what happens on mobile web (keep bottom nav?) and where streak/settings live in the new layout.
- [ ] **Privacy & data transparency** — reassure users about how their data is used/protected. Candidate work: privacy policy page (what's stored: cards, prefs, streaks in Firestore; terms sent to Gemini for explanation only), audit Firestore security rules per collection, data export already exists (CSV/Anki) — add account/data deletion, and a short "your data" blurb in settings or onboarding. Ties into the "Own your learning" design principle.
- [ ] **Japanese kanji breakdown section** — depth for Japanese currently uses the generic (no-hanja) prompt; a per-character kanji section like Korean's hanja breakdown would need a new stream marker + parser support.
- [ ] **Mobile parity** — mobile app is still Korean-only: no study-language switcher, word of the day, or goal-based lists.

### Needs Clarification

Ideas worth keeping but not yet scoped — needs more brainstorming/clarification before moving to Backlog.

- [ ] **Rename the app** — "Amgi" (암기, rote memorization) may not be the right name anymore, especially as the app grows beyond Korean into a multi-language learning tool. Needs brainstorming: criteria (pronounceable across languages, domain availability, not memorization-negative connotation), and a migration checklist if renamed (domain, app metadata, logo, Firebase project naming stays internal).
- [ ] **Personalised explanation preferences** — emphasis knobs (etymology, cultural context, example-heavy). Store in `users/{uid}`; include in Gemini prompt.
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
- **Firebase v9 rejects `undefined` field values:** `addDoc`/`setDoc` throw "Unsupported field value: undefined" if any key has an explicit `undefined` value (e.g. from spreading an object literal). Strip with `Object.fromEntries(Object.entries(data).filter(([,v]) => v !== undefined))` before writing. Also avoid object literals that always declare all keys — only include keys with real values.
- **`EXPO_PUBLIC_*` env vars** are baked at bundle time — restart Metro with `--clear` after changing `.env.local`.
