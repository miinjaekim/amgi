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
   _Added by the user 2026-08-08._

**⚠️ The shape below is superseded in one respect by the redesign of 2026-08-08**
(trial → [vision.md](vision.md) → design calls in [status.md](status.md)):
`GrammarPattern` gains a `kind`, and `PatternExercise` becomes a union of two
exercise shapes rather than one. The revision is at the end of this section; the
original shape is kept because everything else in it still stands and the
reasoning attached to each field is still the reasoning.


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
makes a document self-describing here — is simpler. ~~Cost, named so it isn't a
surprise: a composite index on `uid + studyLanguage`~~ — **no index was needed.**
Two equality filters with no `orderBy` are served by merging single-field
indexes, and `archived` and the sort are handled in JS because this is tens of
documents. The console step this collection *does* need is a security rule.

### Revision, 2026-08-08: stage picks the format, kind picks the ceiling

_This replaces an earlier same-day revision that had `kind` selecting between
two exercise formats. The research (`docs/grammar-research.md`) moved the
primary axis: the format follows the learner's **stage** with a pattern, and
`kind` only decides whether that pattern ever reaches the top rung. The earlier
version's bare transformation drill is gone entirely — mechanical drills are the
one practice type the literature is close to unanimous against._

Two exercise formats, not three, and the pattern carries one new field.

```ts
/**
 * Whether a pattern ever graduates from cloze to free production.
 *
 * - `choice` — a meaning maps to a form and the skill is picking it (`-다가`,
 *   `-는데`, passé composé). Free production has something to test, so these
 *   graduate.
 * - `form` — a rule that applies to something the learner was going to write
 *   anyway (`de` → `d'`, 을/를 by batchim). There is no meaning being chosen, so
 *   free production adds nothing and these stay at cloze permanently.
 *
 * Not a third `construction` kind, however tempting: `il faut que` + subjunctive
 * looks like one, but it graduates like any other choice pattern, and an axis
 * whose members behave identically is not an axis. The warning at the top of
 * this file about speculative subtypes applies to this type too.
 */
export type PatternKind = 'choice' | 'form';
```

`GrammarPattern` gains `kind: PatternKind`, and `source` gains `'manual'`.

**The kind describes the learner's error, not the pattern.** This is the part
most easily got wrong, and getting it wrong rebuilds the taxonomy the vision
rejects. 은/는 has both aspects: choosing topic over subject, and picking the
right allomorph by batchim. Asking "which kind of point is 은/는" has no answer.
Asking "which of the two did *this writer* just get wrong" always does, and the
writing finding already knows — a learner who wrote `de eau` failed the form
rule, and one who wrote something correct but unnatural failed the choice. So
the classifier reads the finding, not a grammar reference, and the same pattern
can legitimately be saved as `form` by one learner and `choice` by another.

#### Stage is derived, never stored

```ts
/** Reviews at cloze before a choice pattern is offered free production. */
export const CLOZE_REPETITIONS = 2;

export type ExerciseFormat = 'cloze' | 'production';

export function exerciseFormat(
  pattern: Pick<GrammarPattern, 'kind' | 'production'>,
): ExerciseFormat {
  if (pattern.kind === 'form') return 'cloze';
  return (pattern.production?.repetitions ?? 0) >= CLOZE_REPETITIONS
    ? 'production'
    : 'cloze';
}
```

Derived rather than stored, and it is worth being explicit about what that buys,
because it is more than tidiness:

- **No field, no migration, no way for stage and schedule to disagree.**
- **A lapse demotes you for free.** `getNextReviewData` resets `repetitions` to
  0 on `again` (`sm2.ts:68`), so failing a production turn drops the pattern
  back to cloze on its own — which is exactly what controlled → free prescribes
  and would otherwise have been a rule someone had to remember to write.
- **`CLOZE_REPETITIONS = 2` is not arbitrary.** Read at the top of a turn, a
  stored `repetitions` of 2 means the *next* success is the first that stops
  setting a fixed interval (1 day, then 6) and starts multiplying by ease
  (`sm2.ts:71-75`). So production begins exactly where the scheduler itself
  starts treating the item as known — two clean cloze passes, then the rung
  changes. Borrowing that boundary rather than inventing a second one keeps one
  definition of "learned" in the codebase.
- **Consequence, recorded not solved:** `hard` is quality 3, so it *increments*
  repetitions and does not demote. A shaky production turn keeps you at
  production. That reads right — `hard` means the skill is there and wobbling,
  not that controlled practice is needed again — but it is a reading, and if
  demotion turns out to want a wider trigger this is the line to change.

#### The two exercises

```ts
interface ClozeExercise {
  format: 'cloze';
  /** One sentence with a gap where the pattern goes. */
  sentence: string;
  /**
   * The whole sentence in the learner's native language — **always shown, not a
   * hint.**
   *
   * This is what makes the cloze *meaningful* practice rather than mechanical,
   * and that distinction is the one the literature is sharpest about: a gap
   * filled without understanding the sentence is the drill type nothing
   * supports. It also mirrors what a production turn already does — there the
   * meaning is handed over as a situation and the learner supplies the form.
   * A cloze gives the meaning *and* most of the sentence, which is precisely
   * what "one rung more scaffolded" means.
   *
   * So yes, it gives away the relation being expressed. That was never the part
   * being tested.
   */
  meaning: string;
  /**
   * The base form to put into the gap, when the gap needs one — `가다` for a
   * `-다가` cloze, `de` for an elision cloze. Absent where the slot is bare, as
   * for a particle choice, and there the sentence and the hint carry it alone.
   */
  input?: string;
  /** What the gap should become, plus anything else acceptable. */
  expected: string;
  alternates: string[];
}

interface ProductionExercise {
  format: 'production';
  /** The meaning to express, in the native language. Never names the pattern. */
  situation: string;
  hintShape: string;
  hintName: string;
  targetForms: string[];
}

export type PatternExercise = ClozeExercise | ProductionExercise;
```

Four consequences to design for rather than discover:

- **The cloze hints cost nothing to generate, because they are already stored.**
  Tier 1 is the pattern's `gloss` — the meaning of the point being asked for,
  which is exactly what Bunpro's first hint tier is — and tier 2 is
  `pattern.pattern`, the citation form. Neither comes from the model, so
  `ClozeExercise` carries no hint fields. The gloss being optional on both sides
  is handled the way it already is: tier 1 falls back to tier 2.
- **A cloze turn is one model call; a production turn is two.** Generation
  supplies `expected` and `alternates`, so cloze grading is a local comparison
  with no `/api/writing` round trip and no grading variance at all. Session cost
  drops from a flat *2n* to `n_cloze + 2·n_production`, weighted toward the
  cheap end because every pattern starts at cloze.
- **The pattern is still never named during a production turn** — that rule is
  unchanged and is the reason `ProductionExercise` keeps its two generated hint
  tiers. During a *cloze* the pattern is not named either; the sentence is what
  disambiguates, with the gloss one keypress away.
- **The false-negative risk shrinks but does not vanish.** `alternates` plays
  the role `targetForms` plays for production: an acceptable answer the
  generator failed to list is scored wrong. A gap with a supplied base form has
  far fewer plausible fillers than a free sentence, so the exposure is much
  smaller — but the honest mitigation is still the learner override, and cloze
  makes that override cheap and obviously correct to offer, because the expected
  answer is on screen and the learner can see whether theirs was also right.

#### Grading, verdicts, and the override — decided 2026-08-08

Cloze grades locally: an exact match against `expected` or one of `alternates`,
then the hint clamp. Production grading is unchanged from (1a): `/api/writing`,
`targetForms` for the reach check, findings for the form check.

**The learner may override a wrong verdict.** This was the last of the three
open questions and it closes here. On any verdict below `good`, one control —
"my answer was right too" — re-grades as if the answer had been correct.

Why it closes now rather than staying open: cloze makes it *cheap and obviously
correct*. The expected answer is on screen next to what the learner typed, so
they are not appealing a judgement, they are reading two strings and telling us
the generator's `alternates` list was short. That is a question they can answer
better than the model can, which is exactly when an override is legitimate.

- **The override changes the correctness judgement, not the effort judgement.**
  It re-grades to `good` and then applies the same hint clamp, so at tier 1 it
  yields `hard` and at tier 2 it yields `again` — i.e. it does nothing at tier
  2, where the answer had already been shown. That is the honest result, not a
  gap.
- **It never writes anything the learner did not assert.** A skipped turn and a
  failed grading still write no `ReviewTracking` at all.

**`easy` is emitted, and the ease ratchet closes.** A cloze answered correctly
with **no hints taken** grades `easy`, not `good`. The reasoning is specific to
cloze and does not extend to production: an exact string match is not a
judgement that could be wrong, so a clean hit is precisely the signal `easy`
exists for. Production stays capped at `good`, because there the verdict is
derived from a model's reading and a false `easy` inflates the interval on the
strength of a guess.

That makes `easy` reachable on exactly one path, and it is enough to un-stick
the ratchet: ease can now climb for a pattern the learner reliably knows, where
before it could only fall. The trivial-rule case this most helps is the one that
prompted the redesign — `de` → `d'` climbs out to long intervals fast, which is
the scheduler answering "does this really need practising" on its own.

`PatternVerdict` therefore becomes `'again' | 'hard' | 'good' | 'easy'`, which
is `getNextReviewData`'s existing signature — no scheduler change, and `sm2.ts`
stays untouched in fact as well as in file.

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
