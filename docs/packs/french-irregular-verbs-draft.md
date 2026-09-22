# French Irregular Verbs — Draft for Review

**Not a vocab pack.** It is a *conjugation* dataset, and it lands in
`FRENCH_IRREGULARS` in `packages/core/src/conjugation.ts` rather than in
`VOCAB_PACKS`. It is written here anyway because [README.md](README.md) governs
anything sourced — **the model is not a source** — and an irregular form is
recalled content, not a rule. That sentence is the whole reason
`FRENCH_IRREGULARS` shipped empty in PR #143 with the types already around it.

**Three verbs — `être`, `avoir`, `aller` — in the three tenses the spec has:
présent, imparfait, futur simple. 54 forms, every one tier A.**

---

## Why three, and why these three

The backlog item names them: *"a French conjugation tool without `être`, `avoir`
and `aller` is missing the verbs a learner reaches for first."* That is the
scope, and a fourth verb would need an argument this draft cannot make.

⚠️ **`faire` is not here, and leaving it out is the same discipline that keeps
the regular verb list described as *common* rather than frequency-ranked.**
"The next most useful irregular" is a frequency claim, and this repo has nothing
behind one. Adding verbs later is a data change; the item that wants a
*ranked* list is still open in the backlog and is a different job.

## Sources, and what rank they hold

Two independent **published references**, which is the top rank in
[README.md](README.md)'s ordering, plus a community wiki used only as a third
spelling check:

| # | source | what it is | rank |
|---|---|---|---|
| L | [Larousse, *Conjugaison*](https://www.larousse.fr/conjugaison) — [être](https://www.larousse.fr/conjugaison/francais/%C3%AAtre/4440), [avoir](https://www.larousse.fr/conjugaison/francais/avoir/749), [aller](https://www.larousse.fr/conjugaison/francais/aller/314) | the conjugator of a published French dictionary house | published reference |
| B | [Bescherelle, *Conjugaison*](https://conjugaison.bescherelle.com/) — [être](https://conjugaison.bescherelle.com/verbes/etre), [avoir](https://conjugaison.bescherelle.com/verbes/avoir), [aller](https://conjugaison.bescherelle.com/verbes/aller) | *the* French conjugation reference, in print since 1842 | published reference |
| W | [Wiktionnaire, *Conjugaison:français/aller*](https://fr.wiktionary.org/wiki/Conjugaison:fran%C3%A7ais/aller) | community wiki | bottom rank — **spelling cross-check only** |

**L and B are independent of each other** — two competing publishers, not one
database behind two skins — which is what makes agreement worth something.

**Every form below is tier A: L and B agree, character for character, accents
included.** Consulted 2026-09-22. ⚠️ **No conflicts were found**, so there is
nothing recorded here under [README.md](README.md)'s "record conflicts, do not
resolve them silently" — which is worth stating rather than leaving as silence,
since a reader cannot tell "no conflicts" from "did not look".

⚠️ **Where L and B differ is only in how they *print a row*, never in a form.**
Larousse prints `il, elle est` and Bescherelle prints `il (elle) est`; the form
is `est` in both, and the pronoun is furniture this dataset does not store.

### Licence

**The forms are not licensed from anybody, because there is nothing here to
license.** The dataset is 54 verb forms of the French language — facts about the
language, carrying no authorship. What a conjugation publisher can hold rights
in is their prose, their layout, and the selection and arrangement of a 9,000-verb
compilation; none of that is taken. Nothing was copied from either source but
the spellings themselves, which are the same spellings in every French book ever
printed.

⚠️ **Wiktionnaire's text is CC BY-SA**, which is exactly why it is a *check*
and not the source: taking a table from it would attach a share-alike obligation
to this repo for a set of facts that carries no obligation at all. It was read
to confirm spelling and nothing was taken from it.

---

## The dataset

Person ids are the spec's: `s1 s2 s3 p1 p2 p3` = je · tu · il/elle · nous ·
vous · ils/elles. The stored form is the **bare form**, never the pronoun —
`subjectFor` supplies `je`/`j'` at grading time, and storing it here would
double it.

### être — `verb:etre`

| | présent | imparfait | futur simple | tier |
|---|---|---|---|---|
| s1 | suis | étais | serai | A (L+B) |
| s2 | es | étais | seras | A (L+B) |
| s3 | est | était | sera | A (L+B) |
| p1 | sommes | étions | serons | A (L+B) |
| p2 | êtes | étiez | serez | A (L+B) |
| p3 | sont | étaient | seront | A (L+B) |

### avoir — `verb:avoir`

| | présent | imparfait | futur simple | tier |
|---|---|---|---|---|
| s1 | ai | avais | aurai | A (L+B) |
| s2 | as | avais | auras | A (L+B) |
| s3 | a | avait | aura | A (L+B) |
| p1 | avons | avions | aurons | A (L+B) |
| p2 | avez | aviez | aurez | A (L+B) |
| p3 | ont | avaient | auront | A (L+B) |

### aller — `verb:aller`

| | présent | imparfait | futur simple | tier |
|---|---|---|---|---|
| s1 | vais | allais | irai | A (L+B+W) |
| s2 | vas | allais | iras | A (L+B+W) |
| s3 | va | allait | ira | A (L+B+W) |
| p1 | allons | allions | irons | A (L+B+W) |
| p2 | allez | alliez | irez | A (L+B+W) |
| p3 | vont | allaient | iront | A (L+B+W) |

---

## Rendering the dataset before believing it

[README.md](README.md)'s second standard: run the entries through the transforms
the app applies and put the **actual output** here. For a conjugation dataset the
transforms are `acceptedForms` — what a typed answer is checked against — and
`buildParadigm`, which is what Topics and Saved draw.

**`acceptedForms` is where this dataset meets a rule that was written for
regular verbs**, and it is the only thing in it that could have gone wrong. The
bare form is always accepted; the second accepted spelling is the form behind
its subject pronoun, and for `je` that means `subjectFor` has to decide between
`je` and `j'`. It elides before a vowel or `h`:

| box | bare | with pronoun | right? |
|---|---|---|---|
| être · s1 · présent | suis | `je suis` | ✅ consonant |
| être · s1 · imparfait | étais | `j'étais` | ✅ `é` is in `FRENCH_VOWELS` |
| être · s1 · futur | serai | `je serai` | ✅ |
| avoir · s1 · présent | ai | `j'ai` | ✅ |
| avoir · s1 · imparfait | avais | `j'avais` | ✅ |
| avoir · s1 · futur | aurai | `j'aurai` | ✅ |
| aller · s1 · présent | vais | `je vais` | ✅ |
| aller · s1 · imparfait | allais | `j'allais` | ✅ |
| aller · s1 · futur | irai | `j'irai` | ✅ |

**All nine are right, and three of them are the ones that would not have been**
if `FRENCH_VOWELS` lacked `é`: `j'étais`, and both `j'irai` and `j'ai` depend on
the plain-vowel branch. A test pins all nine.

⚠️ **Diacritics are not folded, deliberately** — `typedAnswer.ts` folds
apostrophes so `j'ai` typed on an iOS keyboard matches, and leaves accents
alone because for a conjugation table the accent is the content. That makes
`étais`, `étions`, `étiez`, `étaient` and `êtes` **five boxes where a missing
accent is a miss**, which is correct and worth knowing before somebody reports
it as a bug.

⚠️ **`vous êtes` is the one box where the circumflex is the whole difference**
between the form and a plausible wrong answer (`etes`), and it is also the only
form in the dataset whose first letter is accented. It renders as `vous êtes`
through `acceptedForms`, checked above.

---

## What this does not add

- **No new tense.** The spec has présent, imparfait and futur simple, and every
  verb here has all three. A tense these verbs have and the groups do not would
  be a spec change, not a dataset.
- **No change to the default practice set.** `defaultEnrolment` still enrols the
  five regular groups in the présent, so these three appear on **Topics →
  Irregular verbs** and are practised once saved. Putting `être` and `avoir` in
  the default is defensible and is a product call nobody has made.
- **No frequency claim.** See the top of this file.
