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

## Traditional Chinese

_Added 2026-09-24. "Munli for Mandarin" means this entry for now, as scoped
with the user; other grammar practice for Chinese needs its own planning.
Traditional because that is the Chinese study language the app has._

| | English-speaking learner | Korean-speaking learner |
|---|---|---|
| **you write** | 他騎著 **bicycle** 走了。 | 他騎著 **자전거** 走了。 |
| **you get** | 他騎著**腳踏車**走了。 | 他騎著**腳踏車**走了。 |
| **card** | 腳踏車 — bicycle | 腳踏車 — 자전거 |

| claim | tier | source |
|---|---|---|
| *他騎著腳踏車走了。* is how this is said | **A** | It is the Ministry of Education's own example sentence under `腳踏車` in the [重編國語辭典修訂本](https://dict.revised.moe.edu.tw/dictView.jsp?ID=91528&q=1&word=%E8%85%B3%E8%B8%8F%E8%BB%8A), given as 如：「他騎著腳踏車走了。」. Quoted, not composed, and checked against the official page as well as the [moedict.tw](https://www.moedict.tw/腳踏車) mirror |
| `腳踏車` (jiǎotàchē) = *bicycle* | **A** | MOE 修訂本, same entry: 一種利用雙腳踩踏板前進的輪車; [CC-CEDICT via MDBG](https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=1&wdqb=%E8%85%B3%E8%B8%8F%E8%BB%8A): "(Tw) bicycle; bike" |
| `腳踏車` = *자전거* | **B** | [Wiktionary](https://en.wiktionary.org/wiki/%EC%9E%90%EC%A0%84%EA%B1%B0) glosses 자전거 as "bicycle" and gives its hanja as 自轉車, which the MOE entry lists among 腳踏車's synonyms. That is two routes to the same answer, but both go through Wiktionary for the Korean side, so it counts as **one source**, the same rank the French entry's 시장 has |

Three calls made here that the French entry did not need:

- **腳踏車, not 自行車.** The entry is the Taiwan-standard word, and the MOE
  dictionary is Taiwan's. That fits a Traditional deck; 自行車 is the mainland
  standard and would have to be sourced from a different dictionary.
- **The learner's word sits between spaces** (他騎著 bicycle 走了。) and the
  rewrite has none. Chinese has no word spacing, but a learner dropping a
  foreign word in almost always sets it off, and the highlight reads better that
  way. The rewrite is the dictionary's sentence exactly.
- **No pinyin on the example.** `WritingExample` has no reading field and the
  French entry needs none. The card front is the characters alone, as a looked-up
  card's front is. Adding a reading would mean changing the component, which this
  item doesn't do.

## Scope, and what is missing

⚠️ **Writing works in every study language and only French and Traditional
Chinese have an example.**
The app ships ten `STUDY_LANGUAGE_CONFIGS` — Korean, Swedish, French, Spanish,
Kikuyu, Swahili, Japanese, Traditional Chinese, Hanja, English — and a worked
example needs a sourced sentence *per language*, in both native languages.

**So the example is optional per language and the panel renders nothing without
one.** That is deliberate and it is the honest default: a Japanese learner
seeing a French example would be worse than empty space, and one invented for
Japanese would be worse still. French is first because it is the language Munli
teaches grammar in today; Traditional Chinese is second, added 2026-09-24.

**Adding a language is this file plus one entry**, which is the shape the
irregular-verb dataset already set: a draft row with its citation, then the
data. Nothing in the component changes.
