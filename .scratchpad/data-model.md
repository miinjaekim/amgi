# Data Model

## Flashcard type architecture

⚠️ **This replaced a discriminated union** (`KoreanFlashcard | SwedishFlashcard
| …`, one subtype per language, exhaustiveness-checked with `never`). That
scaled badly: every new language meant a new subtype, a new arm in every
switch, and a mapper that had to name each one. The registry below does the same
job — each language gets exactly the fields that make sense for it — without a
type per language. Don't reintroduce the union.

There is **one** card type (`packages/core/src/types.ts`), flat, with the
language side fields all optional. Which of them a given card actually uses is
looked up, not encoded in the type:

```ts
export type CardSideField =
  | 'korean' | 'swedish' | 'english' | 'french' | 'japanese' | 'traditionalChinese';

interface TermCore {
  term: string;
  termLanguage: StudyLanguage;
  korean?: string; swedish?: string; french?: string;
  japanese?: string; traditionalChinese?: string;
  english: string;
  formality?: string;   // Korean: Casual | Standard | Formal | Honorific | Slang
  gender?: string;      // grammatical gender: Swedish en/ett, French le/la
  furigana?: string;    // Japanese kana reading, when the term contains kanji
  pinyin?: string;      // Traditional Chinese, tone-marked
  briefDefinition?: string;
  translation?: string; // legacy only — cards pre-dating the korean/english fields
}

interface TermDepth { definition?: string; characterBreakdown?: string; notes?: string; hanja?: string /* deprecated */ }
interface TermExplanation extends TermCore, TermDepth { examples?: ExamplePair[] }

export interface Flashcard extends TermExplanation {
  id?: string;
  uid: string;
  createdAt: Date;
  archived?: boolean;
  studyLanguage?: StudyLanguage;   // undefined = legacy Korean
  packId?: string;                 // provenance only — see below
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
  // plus deprecated top-level nextReview/interval/ease/repetitions
}
```

**Which slot is the front** comes from `getStudyLanguageConfig(studyLanguage)
.studyField`; **which is the back** from `getBackSideConfig(studyLanguage,
nativeLanguage)`. Read them through `getStudyLangSide()` / `getBackSide()`
rather than indexing a field name yourself.

**The back belongs to the *pair* of languages, not to either one alone** (PR
#67). It was a field on `StudyLanguageConfig`, which meant every non-English
study language was hardcoded to `english` — a Korean native studying Japanese
got English backs everywhere. It's a separate function and not a second registry
because there is no table keyed on native language and there could not be one:
the rule is just "your own language", with one escape hatch for studying the
language you already speak, where the back falls to the other side.

Cards carry **both** back slots, so switching native language switches existing
cards with you and **no Firestore migration was needed** — `getBackSide` falls
back to `english` for anything written earlier.

**`packId` is provenance only.** It's absent on every card saved by looking a
word up and on every card saved before the field existed, so it must never
decide whether a term is already saved — deck progress matches on the study
side instead, which also credits a word you looked up on your own. It *is* read
for grouping, through `getCollectionId()` (`packages/core/src/collections.ts`),
which is the single place that happens.

**Why `studyLanguage` is stored on the Firestore document** (not just inferred
from the collection name): the collection name controls routing — which
documents get queried. `studyLanguage` on the document makes each document
self-describing, enables a single shared mapper (`mapDocToFlashcard` in
`apps/web/src/services/firestore.ts`), and protects against future migrations
where collection context might not be available. Cards written before the field
existed are legacy Korean, which is why it's optional rather than required.

**`termLanguage` detection differs by script.** Korean supports bidirectional
lookup (user can type Korean or English) and detection is trivial — Hangul is
visually distinct, so a Unicode regex identifies it instantly. Swedish also
supports bidirectional lookup, but Swedish uses the Latin alphabet,
indistinguishable from English by character set alone. For Latin-script
languages `termLanguage` is set by Gemini in the model response rather than
detected client-side. This generalizes to any future Latin-script language and
removes the fragile local detection entirely.

**Future extensibility:** the same pattern works beyond languages. A medical or
legal deck would add its fields to the card and a registry entry describing
which ones it uses. Further out: letting users configure which fields appear on
their cards for a given deck (e.g. toggling off formality, adding a custom
grammar note field).

## `GrammarPattern` — designed 2026-08-03, web built 2026-08-08

_Built as designed, in `packages/core/src/grammar.ts`, with three changes worth
knowing before reading the shape below as authoritative. All three are recorded
in the Decisions entry in [status.md](status.md); the third is a live blocker._

1. **`PatternExercise` gained `targetForms`** — the surface fragments that count
   as having reached for the pattern. Without it a learner who sidesteps the
   pattern and writes correct prose scores `good`, which schedules out the exact
   thing they avoided. Generation supplies them; grading stays `/api/writing`
   unchanged and the check stays local.
2. **The writing-finding door is not gated on `kind === 'grammar'`** — measured,
   the most valuable patterns come back as `naturalness` findings.
3. **The `patterns` collection needs a Firestore security rule** before any of
   this works. There is no rules file in the repo, so this is a console step.



A grammar pattern is **not a card**, and the reasoning is in
[vision.md](vision.md): a card is a lookup-table row, and a grammar point is a
function from stem + context + intended meaning to a form. It is a separate type
with a separate review verb — you produce a sentence, you do not flip it.

**This does not reintroduce the discriminated union**, and the distinction
matters enough to state beside the warning above. That union was *one card
subtype per language* — it scaled with the language axis, which is exactly the
axis the registry replaced. A pattern is not a language variant of a card; it is
a different kind of object, the way `PackEntry` and `WritingFinding` already
are, and it is language-generic in the same way everything else here is. The
warning stands unchanged: don't add `KoreanGrammarPattern` either.

Proposed shape, for a new `packages/core/src/grammar.ts` (introduced the way
`writing.ts` was — pure types, a tolerant parser, and the shared fetches both
apps call; **two of them, not one**, for the reason under "A review is two model
calls" below):

```ts
export interface GrammarPattern {
  id?: string;
  uid: string;
  studyLanguage: StudyLanguage;
  /** Citation form — `-다가`, `passé composé`. In the study language. */
  pattern: string;
  /**
   * What it does, in a few words. Same rule as `PackBack` — which means
   * *optional on both sides*, because that type is partial on purpose. Its
   * reason carries over unchanged: a pattern's gloss is generated at capture
   * time in the learner's native language, so requiring both would mean
   * generating a Korean gloss for an English native that no reader could ever
   * see. Don't tighten these to required.
   */
  gloss: { English?: string; Korean?: string };
  /** One or two sentences on when to reach for it, in the native language. */
  note?: string;
  /** Provenance only, never identity — mirrors `packId`'s rule. */
  source?: 'writing' | 'lookup';
  createdAt: Date;
  archived?: boolean;
  /** One tracking, not two — see below. */
  production?: ReviewTracking;
}
```

**One `ReviewTracking`, not two.** A card carries `frontToBack` and
`backToFront` because both are real skills. A pattern has one direction that
matters — meaning → form. Recognising `-다가` in running text is comprehension
of the *sentence*, and it comes free from reading; there is no second rung to
schedule. Don't build a `backToFront` for patterns.

**Exercises are not stored; patterns are.** The sentence you were asked to write
is generated per review, the way depth and examples are generated on demand.
Same rule as writing review's "submissions are ephemeral" — the pattern is the
durable artifact. The generated exercise is a transient object, not a document:
the situation in the native language, plus the two hint tiers, which ride along
in the same response so asking for a hint costs no round trip and reveals
nothing until asked.

**A review is two model calls, not one**, and that is a correction to the line
above about `writing.ts`'s single shared fetch. Generating the situation and
grading the answer are separate round trips, and they cannot be collapsed: the
exercise has to exist before the learner can respond to it. Grading reuses
`/api/writing` unchanged; only generation is new. Consequences to design for
rather than discover:

- **A session of _n_ patterns is 2 _n_ model calls**, where a vocab session of
  any length is zero. That is the running cost of this feature and it should be
  stated in the same breath as the design, not found on a bill.
- **Generation can be batched, grading cannot.** One call can produce the
  situations for the whole due set up front, which is the obvious optimisation
  if per-turn latency disappoints. Not v1 — it trades a slower session start
  for faster turns, and which one the learner feels is a question for real
  sessions, not for this document.
- **Grading failing mid-session is the case with no obvious answer.** Offline is
  handled (the row is disabled), but a 500 on turn 3 of 6 is not offline. The
  learner has already spent 40 seconds producing a sentence, so losing it is the
  one outcome to rule out. v1: keep the text on screen, offer retry, and let the
  turn be skipped without a verdict — a skipped turn writes no `ReviewTracking`
  at all, leaving the pattern due, which is the honest result. Never write a
  verdict the model did not produce.

**One `patterns` collection, not one per language.** Cards shard per language
because there are hundreds of them and the collection name routes the query.
Patterns will number in the tens, so six near-empty collections buy nothing. One
collection carrying `studyLanguage` on the document — which is already what
makes a document self-describing here — is simpler. Cost, named so it isn't a
surprise: a composite index on `uid + studyLanguage`, i.e. one of the two manual
console steps below rather than both. Reversible if it turns out wrong.

## Firestore collections

- `cards` — Korean deck (existing, untouched)
- `cards_swedish` — Swedish deck
- `cards_english` — English deck (native-Korean learners; english study side, korean back)
- `cards_french` — French deck
- `cards_japanese` — Japanese deck
- `cards_chinese_traditional` — Traditional Chinese (Mandarin) deck
- Future languages follow the same `cards_{language}` pattern

**Traditional vs Simplified Chinese are separate study languages**, not one
language with a script preference. The alternative — one `Chinese` deck rendered
in either script — would need a conversion pass at every render site and leaves
the stored text script-ambiguous. Keeping them apart costs nothing (the registry
already supports it) and matches the reality that Taiwan and Mainland usage
differs in vocabulary, not just glyphs. A Simplified deck would be its own
registry entry with its own `cards_chinese_simplified` collection.

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

**Prompts must use `config.label`, not the registry code.** Codes are
identifiers: interpolating `${studyLanguage}` produced "a learner of
TraditionalChinese" in the depth, vocab-list, and word-of-the-day prompts, which
also said nothing about which script to write in. Those three now interpolate
`getStudyLanguageConfig(x).label`; the Chinese entries add an explicit
Traditional-not-Simplified line on top.

Measured, not assumed: the pre-fix prompts were re-run against Gemini and
returned Traditional characters anyway (vocab-list 3/3, word of the day 4/4
across separate dates) — it reads "TraditionalChinese" and infers correctly. So
this is readability and robustness, not a bug that was shipping. Don't cite it
as a defect; do keep using `label`, because the next code that isn't an English
word won't necessarily be as guessable.

**Pronunciation readings** (Japanese `furigana`, Traditional Chinese `pinyin`)
are separate `TermCore` fields but one badge slot — `getReading(card)` in
`@amgi/core` resolves whichever the card carries, so the six Learn/review/detail
render sites across web and mobile don't grow a conditional per language.

## User preferences (`users` collection)

- `nativeLanguage`: string — the user's native language (e.g. "English")
- `studyLanguage`: string — which deck is currently active
- `streak`, `longestStreak`, `lastReviewDate`, `reviewedToday` — SRS progress

**Reminder preferences are deliberately *not* here.** They live on the device
(`AsyncStorage`, via `apps/mobile/src/services/reminders.ts`) because a
notification setting belongs to the phone that would do the notifying — the same
account on a second device shouldn't inherit the first one's schedule. The
review direction chosen on Review is per-session and not persisted anywhere, for
the same class of reason: a `reviewDirection` on the user doc would have been a
schema change plus offline-write handling for a one-second choice (PR #65).

## API shape (term explanation)

- **Fast call** (`/api/explain`) — `term, termLanguage, korean/swedish, english,
  formality (Korean), gender (Swedish), furigana (Japanese), pinyin
  (Traditional Chinese), briefDefinition`
- **Depth** (`/api/explain/depth`, user-triggered) — `definition,
  characterBreakdown? (Han-script languages only), notes?`
- **Examples** (`/api/explain/examples`, user-triggered) — `{ examples: ExamplePair[] }`
- Stream variants exist for both: `/depth-stream`, `/examples-stream` (NDJSON)
- The depth prompt emits a `CHARACTERS:` section only for languages carrying
  `characterSectionKey` (Korean, Japanese, Traditional Chinese); the parser
  keys off `text.includes('CHARACTERS:\n')`, never off the language. The
  per-language wording lives in `apps/web/src/lib/characterBreakdown.ts` so the
  streaming and JSON routes can't drift. Legacy Korean cards still carry
  `hanja` and are read through `getCharacterBreakdown()` — no migration.
## Packs

`packages/core/src/packs.ts`. **One kind, since 2026-08-02** — the `lookup` /
`cards` split and the `PackWord` / `PackCard` types no longer exist.

```ts
PackBack   = { English?: string; Korean?: string }   // partial, deliberately
PackEntry  = { study: string; back: PackBack; context?: string }
PackSection = { id, name: {English,Korean}, note?, entries: PackEntry[] }
VocabPack  = { id, name, description, sections: PackSection[],
               layout: 'grid' | 'list', pronounceable?: boolean }
```

- **`back` is partial because one side is usually unstorable.**
  `buildPackCardDraft` writes `english`, `korean`, then the study side *last* so
  it wins. On an English pack the study side **is** the `english` slot, so an
  authored English back is overwritten at save time and could never be read.
  TOEIC therefore authors Korean only, TOPIK English only; kana authors both,
  because romaji and 아 answer the same question in different scripts.
- **Read a back with `resolvePackBack(back, studyLanguage, nativeLanguage)`,
  not `getPackText`.** `getPackText` keys on native language, which is right for
  a pack's name and description (UI copy) and wrong for a back, which must match
  the slot it will be stored in. The two disagree in exactly one case — someone
  studying the language they already speak — where the back falls to the other
  side.
- **`context` outlives the save.** `buildPackCardDraft` carries it onto the card
  as `briefDefinition`, which `getDepthTarget` then feeds to the depth and
  examples routes. Dropping it is how 경기 gets explained as a sports match
  months later.
- **Sections are the enrolment unit** and are semantic, not even: TOEIC 45/30/35/23,
  TOPIK 30/30/40/20/20/20, kana 46/20/5. `getPackEntries(pack)` flattens them in
  order; `unsavedEntries(entries, savedTerms)` takes entries rather than a pack
  so one function serves both a section and the whole deck.
- **`unsavedEntries` returns `null` when the saved set is unknown**, and callers
  must not read that as "none saved" — that bug enrolled all 71 katakana cards
  twice on one account.
- **`layout` drives the deck page**, not the pack identity: `grid` for walls of
  single glyphs, `list` for words.

A test asserts every registered pack authors a back its own study language can
store, and that no back merely repeats the front — that is what stops a future
pack authoring the overwritten side and shipping cards with no readable back.

- **Sense pinning:** `getDepthTarget()` returns the resolved sense (back-side
  translation + `briefDefinition`) and all four depth/examples routes inject a
  "use only this sense" clause. Web spreads it automatically; mobile wrappers
  pass it explicitly. This is what makes pack context hints and the
  disambiguation picker actually stick.
- `POST /api/vocab-list` — goal-based word lists; accepts `previousWords` +
  `feedback` for refinement
- `GET /api/word-of-the-day` — Firestore-backed. One doc per
  `date_studyLanguage_nativeLanguage` in the `wordOfTheDay` collection; the
  first request for a pair generates and `create()`s it (which also resolves
  the concurrent-first-request race), everyone else reads it back. The
  `s-maxage=86400` CDN header is only a fast path — a cache miss re-reads
  Firestore and serves the same word. It reads the **last 60 days** of picks for
  the pair *by document ID* (so no composite index, and no manual Firestore
  step) and feeds them to the prompt as an exclusion list, retrying once on a
  collision — this is what stopped words repeating across days (PR #47). The
  explanation is generated and stored *with* the word, so tapping it is a read.
- `POST /api/pronounce` — returns a cached-or-generated audio URL
- `POST /api/writing` — writing review. Takes `{ text, nativeLanguage,
  studyLanguage }`, returns `{ rewrite, rewriteNative?, findings[] }`. Nothing
  is stored: submissions are ephemeral and only saved cards persist, so **there
  is no collection here and neither manual Firestore step applies**. `text` is
  capped at `WRITING_MAX_CHARS` on both the client and the route — the cap is
  about the cost and readability of the *response*, which is not something a
  client gets to decide. Card candidates carry **both** backs, same as pack
  cards and for the same reason, and a candidate missing one is dropped rather
  than saved half-blank.
