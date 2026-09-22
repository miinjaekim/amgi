# Writing's Worked Example — Draft for Review

**One worked example, shown on the Writing tab while the passage box is empty**
— what a learner writes, what comes back, and the card it yields. Asked for
2026-09-22: *"for the writing page … we still have a lot of empty space that we
can take advantage of."*

**It is sourced, because it is a sentence in the study language.** A worked
example asserts "this is what a native would write", which is precisely the
claim [README.md](README.md) says the model may not be the source of. So the
sentence is **the dictionary's own example**, not one written here.

It lands as `WRITING_EXAMPLES` in `packages/core/src/writing.ts`.

---

## What it shows

| | English-speaking learner | Korean-speaking learner |
|---|---|---|
| **you write** | Je l'ai acheté au **market**. | Je l'ai acheté au **시장**. |
| **you get** | Je l'ai acheté au **marché**. | Je l'ai acheté au **marché**. |
| **card** | le marché — market | le marché — 시장 |

⚠️ **The learner's half is the native-language word dropped into the French**,
because that is the mark the route is built to catch — see the "WORDS THEY DID
NOT HAVE" section of the prompt in `apps/web/src/app/api/writing/route.ts`. The
example demonstrates the one thing the help sheet says in words.

## Sources

| claim | tier | source |
|---|---|---|
| *Je l'ai acheté au marché.* is how this is said | **A** | It is [Larousse's own example sentence](https://www.larousse.fr/dictionnaires/francais-anglais/march%C3%A9/49296) under `marché`, given as "je l'ai acheté au marché = I bought it at the market" — the sentence is quoted, not composed |
| `marché` = *market* | **A** | Larousse français-anglais, same entry: the primary gloss for the place sense |
| `marché` = *시장* | **B** | [Wiktionary](https://en.wiktionary.org/wiki/%EC%8B%9C%EC%9E%A5) glosses 시장 as "market"; 표준국어대사전 uses 시장 in that sense throughout (e.g. 시장 경제). **One rank-worthy source short of A**, and said here rather than smoothed over |

⚠️ **Quoting the dictionary's example is the point, not a shortcut.** A
composed sentence would have been the model asserting French in the one place on
the screen a learner has no way to check it. The quotation is six words and
attributed here; nothing else of the entry is taken.

## Scope, and what is missing

⚠️ **Writing works in every study language and this example is French only.**
The app ships ten `STUDY_LANGUAGE_CONFIGS` — Korean, Swedish, French, Spanish,
Kikuyu, Swahili, Japanese, Traditional Chinese, Hanja, English — and a worked
example needs a sourced sentence *per language*, in both native languages.

**So the example is optional per language and the panel renders nothing without
one.** That is deliberate and it is the honest default: a Japanese learner
seeing a French example would be worse than empty space, and one invented for
Japanese would be worse still. French is first because it is the language Munli
teaches grammar in today.

**Adding a language is this file plus one entry**, which is the shape the
irregular-verb dataset already set: a draft row with its citation, then the
data. Nothing in the component changes.
