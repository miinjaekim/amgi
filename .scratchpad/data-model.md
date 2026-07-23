# Data Model

## Flashcard type architecture

Cards use a **discriminated union** — a minimal shared base type plus
language-specific subtypes. Each language (or topic) gets exactly the fields that
make sense for it, nothing more.

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
  gender?: string;   // 'en' | 'ett' | absent — only for nouns
  briefDefinition?: string;
  definition?: string;
  notes?: string;
  examples?: { swedish: string; english: string }[];
  // no formality, no hanja
}

type AnyFlashcard = KoreanFlashcard | SwedishFlashcard;
```

**Why `studyLanguage` is stored on the Firestore document** (not just inferred
from the collection name): the collection name controls routing — which
documents get queried. `studyLanguage` on the document makes each document
self-describing, enables a single shared mapper function, and protects against
future migrations where collection context might not be available. It's a small
redundancy with meaningful practical benefits. The mapper handles the Korean
legacy case (old cards without the field) by defaulting:

```ts
function mapDocToFlashcard(doc): AnyFlashcard {
  const data = doc.data();
  if (data.studyLanguage === 'Swedish') return { ...data, id: doc.id } as SwedishFlashcard;
  return { ...data, studyLanguage: 'Korean', id: doc.id } as KoreanFlashcard;
}
```

**`termLanguage` detection differs by script.** Korean supports bidirectional
lookup (user can type Korean or English) and detection is trivial — Hangul is
visually distinct, so a Unicode regex identifies it instantly. Swedish also
supports bidirectional lookup, but Swedish uses the Latin alphabet,
indistinguishable from English by character set alone. For Latin-script
languages `termLanguage` is set by Gemini in the model response rather than
detected client-side. This generalizes to any future Latin-script language and
removes the fragile local detection entirely.

**Exhaustiveness checking** via TypeScript `never` ensures every card type is
handled — if `JapaneseFlashcard` is added to the union and a switch/if-chain
doesn't cover it, the compiler errors before it can silently fail at runtime.

**Future extensibility:** the same pattern works beyond languages. A
`MedicalFlashcard` could carry `bodySystem` or `drugClass`; a `LegalFlashcard`
could carry `jurisdiction` and `caseReference`. Further out: letting users
configure which fields appear on their cards for a given deck (e.g. toggling off
formality, adding a custom grammar note field).

## Firestore collections

- `cards` — Korean deck (existing, untouched)
- `cards_swedish` — Swedish deck
- `cards_english` — English deck (native-Korean learners; english study side, korean back)
- `cards_french` — French deck
- `cards_japanese` — Japanese deck
- Future languages follow the same `cards_{language}` pattern

`getCardsCollection(studyLanguage)` routes to the correct collection.

⚠️ **Two manual steps per new collection** (neither lives in the codebase):
1. Firestore security rules — no wildcard support, add them in the Firebase console.
2. Composite index on `archived + createdAt` — Firebase surfaces a direct
   creation link on the first failing query.

## `STUDY_LANGUAGE_CONFIGS` registry

In `packages/core/src/types.ts`. Per-language config: collection name,
study/back field names, back language, and i18n keys for side labels,
review-direction chips, and question prompts. UI and services look everything up
through `getStudyLanguageConfig()`.

**Adding a language** = one registry entry + an `/api/explain` prompt branch +
i18n keys + the two manual Firestore steps above. The depth and examples routes
are already generic.

## User preferences (`users` collection)

- `nativeLanguage`: string — the user's native language (e.g. "English")
- `studyLanguage`: string — which deck is currently active
- `streak`, `longestStreak`, `lastReviewDate`, `reviewedToday` — SRS progress

## API shape (term explanation)

- **Fast call** (`/api/explain`) — `term, termLanguage, korean/swedish, english,
  formality (Korean), gender (Swedish), briefDefinition`
- **Depth** (`/api/explain/depth`, user-triggered) — `definition, hanja? (Korean
  only), notes?`
- **Examples** (`/api/explain/examples`, user-triggered) — `{ examples: ExamplePair[] }`
- Stream variants exist for both: `/depth-stream`, `/examples-stream` (NDJSON)
- Swedish depth prompt omits the `HANJA:` section entirely; the parser handles
  both formats via `text.includes('HANJA:\n')`
- **Sense pinning:** `getDepthTarget()` returns the resolved sense (back-side
  translation + `briefDefinition`) and all four depth/examples routes inject a
  "use only this sense" clause. Web spreads it automatically; mobile wrappers
  pass it explicitly. This is what makes pack context hints and the
  disambiguation picker actually stick.
- `POST /api/vocab-list` — goal-based word lists; accepts `previousWords` +
  `feedback` for refinement
- `GET /api/word-of-the-day` — CDN-cached (`s-maxage=86400`)
- `POST /api/pronounce` — returns a cached-or-generated audio URL
