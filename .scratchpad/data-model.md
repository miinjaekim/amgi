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
  partOfSpeech?: PartOfSpeech;  // a code from a closed list — see below
  formality?: string;   // Korean: Casual | Standard | Formal | Honorific | Slang
  gender?: string;      // grammatical gender: Swedish en/ett, French le/la
  furigana?: string;    // Japanese kana reading, when the term contains kanji
  pinyin?: string;      // Traditional Chinese, tone-marked
  hun?: string;         // Hanja 훈 — the native-Korean meaning (물)
  eum?: string;         // Hanja 음 — the Korean sound (수)
  briefDefinition?: string;
  translation?: string; // legacy only — cards pre-dating the korean/english fields
}

interface TermDepth { definition?: string; characterBreakdown?: string; notes?: string }
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

## `GrammarPattern` (removed)

The pattern-practice data model was removed from the app 2026-08-18. Its type,
derived stage, exercises and grading are kept as a record at the end of
[decisions/grammar-and-writing.md](decisions/grammar-and-writing.md). Munli does
not use it.

## Firestore collections

- `cards` — Korean deck (existing, untouched)
- `cards_swedish` — Swedish deck
- `cards_english` — English deck (native-Korean learners; english study side, korean back)
- `cards_french` — French deck
- `cards_japanese` — Japanese deck
- `cards_chinese_traditional` — Traditional Chinese (Mandarin) deck
- `cards_cantonese` — Cantonese deck (Hong Kong, Traditional characters)
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
i18n keys + a row in each app's `EXAMPLE_TERMS` + a line in the exhaustive table
in `back-side.test.ts` + the two manual Firestore steps above. The depth and
examples routes are already generic, and the language pickers derive from the
registry, so no UI list needs touching.

**Two of those five tell you they are missing; three do not.** `EXAMPLE_TERMS`
on mobile is a `Record<StudyLanguage, string[]>` and fails the typecheck, and
`back-side.test.ts` iterates `SUPPORTED_STUDY_LANGUAGES` against a hand-written
table so a language with no line fails the suite — both deliberate. **Web's
`EXAMPLE_TERMS` is `Record<string, string[]>` and says nothing**: it falls back
to the Korean row, so the new deck's search placeholder suggests 눈치 and 사랑
and looks deliberate. Copy the row to both.

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

## `partOfSpeech` — a code, not a label (2026-08-11)

**This reverses the call recorded in the backlog**, which had the badge reading
English on every card — `noun`, `verb` — on the grounds that `formality` already
renders `Standard` in English beside it. The user asked for the native language
instead, and the reversal is cheap in a way the original decision assumed it
wasn't: nothing has to be generated per reader.

`PART_OF_SPEECH_CODES` in `types.ts` is one closed, language-generic list of 15
codes. The card stores the code; `partOfSpeechLabel(nativeLanguage, card)` in
`i18n.ts` renders it — 명사 to a Korean native, "Noun" to an English one, off the
same stored value.

- **Why a code rather than a generated label.** The back-slot problem, met again
  and solved outright this time. Cards carry *both* backs so switching native
  language switches existing cards with you; a generated part-of-speech label
  would need the same trick, and a third language would need a third field. A
  code needs none — the switch is a render-time lookup.
- **It describes the study-language word, not `term`.** Same rule as
  `getDepthTarget`: typing "awkward" into a Korean deck saves 어색하다, and
  tagging that card `adjective` off the English would describe the word the
  learner came in already knowing. The prompts say so explicitly.
- **The codes are language-generic, and stay that way.** `particle` covers 조사
  and 助詞, `counter` covers 個/枚/마리. Japanese i- vs na-adjectives are a real
  distinction and deliberately absent: a code that is meaningful for one of six
  decks is the per-language subtype the warning at the top of this file is
  about. It belongs in the depth notes, where it can be explained.
- **Unknown values never reach a card.** Both generating routes run the model's
  answer through `normalizePartOfSpeech`, which accepts `Noun`, `noun
  (countable)` and `adjective/adverb`, and drops anything else. A card carrying
  `gerund` would render no badge at every site anyway; dropping it at the
  boundary keeps that from becoming a fact about the UI.
- **No backfill.** Existing cards, pack cards and writing-review candidates carry
  no part of speech and get no badge, the way a pre-Swedish card carries no
  `gender`. The backlog item's note stands: if the ~600 pack terms are ever
  backfilled it should ride the precompute-depth script, not its own pass.
- **The word of the day lags by up to a day, and that is the storage working.**
  Its document is written once per `date_studyLanguage_nativeLanguage` and read
  by everyone after — so the doc for the day this shipped was generated without
  a part of speech and keeps no badge however many times it is tapped, while
  looking the same word up by hand shows one. Measured on 2026-08-11: 왔다갔다,
  Korean/English, `partOfSpeech` absent on both the document and its stored
  `core`. Every document generated from the next day on carries it. Nothing
  repairs a stored document on read — that would put a model call back on the
  cache-hit path, which is exactly what storing `core` removed.
- **`ReviewDetailsPanel` deliberately has no badge** even though it renders
  `formality`. The review card above it already shows the part of speech, and
  the panel opens on the same screen.

**Pronunciation readings** (Japanese `furigana`, Traditional Chinese `pinyin`)
are separate `TermCore` fields but one badge slot — `getReading(card)` in
`@amgi/core` resolves whichever the card carries, so the six Learn/review/detail
render sites across web and mobile don't grow a conditional per language.

## User preferences (`users` collection)

- `languages`: `{ study, native }[]` — the decks added, each with the language
  it is explained in (2026-09-12; see below)
- `interfaceLanguage`: string — what Amgi speaks to the user in
- `nativeLanguage`: string — **deprecated**, kept as the migration seed and
  still written alongside `interfaceLanguage` so an older build reading the same
  account still finds it. There is no OTA on mobile, so that is not hypothetical.
- `studyLanguage`: string — which deck is currently active
- `streak`, `longestStreak`, `lastReviewDate`, `reviewedToday` — SRS progress

### One native language per deck, and an interface language beside it (2026-09-12)

⚠️ **`nativeLanguage` was doing three jobs at once**, and the third one is the
reason this had to change. It chose the card's back slot
(`getBackSideConfig`), it was interpolated into every `/api/explain` prompt
("Write all explanations in ${nativeLanguage}"), *and* it was the language of
the app's own chrome. Those are not the same question, and with one field the
pair "Korean explanations, English interface" was unsayable.

So the field split in two:

- **`languages`** — one entry per study language, carrying the language that
  deck's **backs and explanations** are written in.
- **`interfaceLanguage`** — chrome only: nav, buttons, settings copy,
  reminders, collection and pack names, the shareable stats image.

**Explanations follow the deck, not the interface, and that is forced rather
than chosen.** `definition`, `notes`, `characterBreakdown` and
`briefDefinition` are *stored on the card* and never regenerated, so they
cannot track a setting that changes later — tying them to the interface would
leave a card whose back is Korean sitting beside a definition in English,
permanently. `getDepthTarget` already resolved its sense through
`getBackSideConfig`, so explanation and back were one decision before this and
still are.

**One entry per study language, forced by the collections.** Cards shard into
one collection per study language (`cards_japanese`), so there is nowhere to put
a second Japanese deck explained in a different language. `addLanguagePair`
replaces rather than appends for exactly that reason.

**The collision resolvers are deleted, not deprecated.**
`resolveStudyLanguage` and `resolveNativeLanguage` existed to repair one
situation *after* it happened — the learner studying the language Amgi was
speaking to them in — by moving the other setting out from under them. That was
the only repair available while one global native language served every deck.
Now `nativeOptionsFor` drops the study language from the options at the point of
choosing, so the pair cannot be built, and the interface language is independent
of every deck, so switching decks cannot move it. That also retires the
confirmation dialog those functions made necessary (and its three i18n keys).
Nothing reads a stored collision through them: `getBackSideConfig` has always
fallen to the other side when the back would land on the front, so an old
document saying "native Korean, studying Korean" still renders with no repair
pass.

⚠️ **The migration seeds from the decks that hold cards, not from
`studyLanguage` alone.** The switcher now shows only added languages, so an
account seeded from the current deck would hide every other deck it has been
using behind an Add flow the user has no reason to open — the cards would still
be there, but a deck you cannot reach is indistinguishable from one you have
lost. `seedLanguagePairs` therefore takes the study languages holding at least
one card (ten `getCountFromServer` aggregations, once per account, written
straight back) plus the current one, and gives them all the old global
`nativeLanguage` — which is the honest reading, since that is the language every
one of those decks has in fact been explained in until now.

**Mobile only migrates on a launch that reached the server.**
`getCountFromServer` has no offline answer, so an underground launch would seed
from the current deck alone and then write that narrow list down as if it were
the truth. Offline it keeps what the device holds and tries again next launch.

**No new collection and no new index**, so neither manual Firestore step
applies: `languages` is a field on a `users/{uid}` document that already has a
security rule.

`directionLabel` and `directionPrompt` take **both** languages now. They read
"Japanese → Korean", and those are two separate decisions: the words are chrome,
while *which* language is named on the back comes from the deck.

### `users/{uid}/progress/{YYYY-MM-DD}` — daily rollups (2026-08-19)

The write path behind the progress dashboard. The four fields above answer "am
I on a streak" and nothing else; "which days did I review", "how much" and "how
many new cards" were **never written down**, so they could not be surfaced.

```
users/{uid}/progress/2026-08-19
  date        'YYYY-MM-DD', local time, also the document id
  reviews     ratings submitted — counts *directions*, like `reviewedToday`
  newCards    cards added one at a time (lookup, import, enrichment)
  packCards   cards added by enrolling in a pack
  again/hard/good/easy   verdict counts
  byLanguage  { [StudyLanguage]: { reviews, newCards, packCards,
                                   again, hard, good, easy } }
```

⚠️ **The verdicts moved inside `byLanguage` on 2026-09-04** and were whole-day
before that, so **retention per language is honest only from that date on** —
days written earlier carry the whole-day counts and zeroes in every slice, and
there is nothing to backfill from. `retentionRate` returns `null` rather than
`0` or `100%` for a slice with no verdicts, which is what keeps an old day
reading as "not recorded" instead of "perfect". A day and a language slice now
count exactly the same seven things, which is why `DailyProgress` extends
`LanguageProgress` rather than redeclaring them, and why `COUNTER_KEYS` is the
one list every merge/negate/apply/parse/`increment()` path walks.

Four calls, all deliberate:

- **Grain is one document per day**, not one per rating. Every question being
  asked is a per-day question, and a year is 365 documents rather than ~20,000.
  The cost is that a rollup discards anything it didn't count in advance —
  time-of-day and per-card history are unrecoverable once a day is summed. That
  is why the field list is wider than the first screen renders: a field added
  later only collects from the day it ships. **The per-language verdicts are
  what that warning looks like when it comes true** — they were added before
  the screen that wanted them, because the alternative was starting the clock
  later, not filling in the past.
- **The day is per user; the language detail lives inside it.** The habit is
  "studied today", not "studied Korean today", so reviewing Japanese keeps the
  streak — but a day can still be broken down.
- **A subcollection, not a top-level collection**, specifically because the
  *Delete User Data* extension is configured as `users/{UID}` with recursive
  mode. A `progress_daily` at top level would survive account deletion until
  someone remembered to add the path.
- **`reviews` counts directions**, matching `reviewedToday`, so the two cannot
  disagree about what a number means. It reads roughly double what a learner
  pictures; correcting that is a separate, user-visible call and is still open.

Writes are `increment()` on a `merge: true` `setDoc`, so two devices on one day
add up and there is no create-vs-update branch. Reads range on `documentId()` —
the id *is* the date and dates sort lexically — which keeps them single-field
queries on the document key and therefore **needing no composite index**, unlike
every card query. Worth preserving.

⚠️ **The security rule is manual**, like every other collection — see
[tech-stack.md](tech-stack.md). Until it exists, every write fails
`permission-denied`.

Logic is in `packages/core/src/progress.ts` (pure, tested); the Firestore layer
is `apps/{web,mobile}/src/services/progress.ts`. Mobile adds an AsyncStorage
queue, because a Firestore write neither resolves nor rejects offline and an
uncounted day cannot be rebuilt from server state the way a card rating can.

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
  streaming and JSON routes can't drift. **Hanja carries no `characterSectionKey`
  despite being the most Han-script deck there is** — a card whose front is one
  character has nothing to break into characters.
  Legacy Korean cards used to carry the breakdown as `hanja` and were read
  through `getCharacterBreakdown()` with no migration. That ended 2026-09-09,
  when `hanja` became the *front* of a Hanja card: `migrate:legacy-hanja` moved
  them onto `characterBreakdown` and the deprecated field is gone.
## The hanja partition

`HanjaPartition = 'character' | 'hun' | 'eum'` in `types.ts` — which part of a
hanja card is on the front. Stored on `UserPreferences.hanjaPartition`, absent
meaning `DEFAULT_HANJA_PARTITION` (`'character'`, the question the 급수 exam
asks). One setting, not one per deck: there is one Hanja deck.

**It is a display setting, not a scheduling axis.** Three partitions × the two
existing `ReviewDirection`s covers all six front/back configurations, so nothing
under `sm2.ts` / `reviewQueue.ts` / `offlineReview.ts` changed:

| partition | frontToBack | backToFront |
|---|---|---|
| `character` | 水 → 물 수 | 물 수 → 水 |
| `hun` | 물 → 水 수 | 水 수 → 물 |
| `eum` | 수 → 水 물 | 水 물 → 수 |

`hanjaFaces(card, partition)` is **the only place the three parts are joined**,
and the back keeps 한자 · 훈 · 음 order whichever part came out of it. It falls
back to the character partition on a card with no `hun`/`eum` to split.

`hunEum(card)` assembles the same string for `korean`, which `buildFlashcardDoc`
writes on save so the card list, detail modal and export stay partition-blind.
**Derived, never authored** — one line per platform, at the one point a card is
written.

⚠️ **The control belongs in settings and nowhere else.** In the review session
it becomes a per-session toggle, and switching inherits intervals earned
answering a different question.

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
- **User-made packs** (`packages/core/src/userPacks.ts`,
  `apps/web/src/lib/userPackSourcing.ts`, `userPackJobs.ts`). One Firestore
  doc per pack in **`userPacks`**: `ownerUid`, `visibility: 'private'`,
  `studyLanguage`, `brief`, title, and `subtopics[]`, each with a `status`
  (`pending | sourcing | ready | failed`) and its `entries` (a `PackEntry`
  plus `tier` and `sources`). **Only the server writes** (admin SDK, after
  checking the caller's ID token); the client subscribes to its own. Ready
  subtopics become sections through `userPackToVocabPack`, and
  `setUserVocabPacks` adds them to `getVocabPacks`, so the deck page, drill,
  review picker and subpack names treat a user pack like a curated one. Its
  id is `user-<docId>`.
  - `POST /api/user-packs/subtopics` — the set questions → a title and
    subtopics. One JSON call, no search, thinking off (30s → 4s).
  - `POST /api/user-packs` — creates the doc from the chosen subtopics.
  - `POST /api/user-packs/{id}/source` — one subtopic, in `after()`, because
    a whole pack took 10 minutes in the eval, past a function's 300s. It runs
    a search-grounded call, fetches **every** page returned, and keeps a word
    only if a page contains it (tier A = two domains, B = one). Google's
    per-line `groundingSupports` is not used: in the eval it attributed words
    to pages without them. Backs come from `/api/explain` over HTTP (the reuse
    rule), with the sense as `context`. A term already in another subtopic is
    dropped on write. Also the retry: a subtopic stuck in `sourcing` past
    `SOURCING_STALE_MS` can be restarted.
  - `DELETE /api/user-packs/{id}` — cards already saved from it stay.
  - The subtopics step also states a **level** (`PackLevel`: a CEFR band, a
    one-line summary, too-easy examples), stored on the pack and handed to
    every sourcing call. The search step can end a line with `| vulgar`,
    which sets `PackEntry.vulgar` and leads the entry's `context` with
    `vulgar — `, so the warning reaches the saved card.
  - Mobile mirrors web file for file: `src/services/userPacks.ts`,
    `src/context/UserPacksContext.tsx`, `app/(tabs)/decks/new.tsx`.
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
