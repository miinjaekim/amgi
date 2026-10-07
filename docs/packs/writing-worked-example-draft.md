# Writing's Worked Example — Draft for Review

**One worked example, shown on the Writing tab while the passage box is empty**
— what a learner writes, what comes back, and the card it yields. Asked for
2026-09-22: *"for the writing page … we still have a lot of empty space that we
can take advantage of."*

**It is sourced, because it is a sentence in the study language.** A worked
example asserts "this is what a native would write", which is precisely the
claim [README.md](README.md) says the model may not be the source of. So the
sentence is **the dictionary's own example**, not one written here. French and
Traditional Chinese hold to that strictly; the nine added 2026-10-07 were let
in under a looser rule, and their section says which source each one has.

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

## The other nine languages

_Added 2026-10-07. The user's scope: every study language but Hanja, in one
pass, with the sourcing rule relaxed for this item — "i don't think these
examples are high stakes at all". A dictionary's own sentence is still the
first choice; a weaker source is acceptable; a sentence written here is the
last resort and would be marked. **None of the nine had to be written here.**_

**How each sentence was come by**, which is the column to read first:

| language | sentence | how | source |
|---|---|---|---|
| Korean | 지수는 주말에도 학교 도서관에서 공부를 한다. | **quoted from a dictionary** | 국립국어원 [한국어기초사전, 도서관](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=40295&nation=eng&nationCode=6) |
| Swedish | De ska sälja lägenheten och köpa hus. | **quoted from a dictionary**, capital and full stop added | [Lexin, hus](https://lexin.nada.kth.se/lexin/service?searchinfo=to,swe_swe,hus), which prints `de ska sälja lägenheten och köpa hus` |
| English | I left my umbrella on the bus yesterday. | **quoted from a dictionary** | [Cambridge Dictionary, umbrella](https://dictionary.cambridge.org/dictionary/english/umbrella) |
| Japanese | 雨の日は、電車内に傘の忘れ物が多い。 | **quoted from a dictionary**, at one remove | [Jisho, 傘](https://jisho.org/search/%E5%82%98%20%23sentences), which shows it as a Jreibun sentence. Jisho is the dictionary; the sentence is the Jreibun project's, not Jisho's own |
| Cantonese | 好頸渴呀，雪櫃有冇嘢飲呀？ | **quoted from a dictionary** | [words.hk 粵典, 雪櫃](https://words.hk/zidin/%E9%9B%AA%E6%AB%83) |
| Arabic | يَجِبُ عَلَيْكَ أَنْ تَذْهَبَ إِلَى ٱلْمَدْرَسَةِ. | **weaker source** | [Wiktionary, مدرسة](https://en.wiktionary.org/wiki/%D9%85%D8%AF%D8%B1%D8%B3%D8%A9), a usage example a contributor wrote, marked there as said to a man |
| Spanish | Me llevaré un paraguas por si llueve. | **quoted from a dictionary** | [SpanishDict, paraguas](https://www.spanishdict.com/translate/paraguas) |
| Kikuyu | He maaĩ. | **weaker source**, full stop added | [Wikipedia, Kikuyu language](https://en.wikipedia.org/wiki/Kikuyu_language), sample phrases table: "Give me water" |
| Swahili | Nahitaji daktari. | **weaker source** | [Wikivoyage, Swahili phrasebook](https://en.wikivoyage.org/wiki/Swahili_phrasebook): "I need a doctor." |

Each was read off the page's own text or wikitext on 2026-10-07, not taken from
a summary of it.

**What the learner sees**, with the word that goes missing:

| language | you write (English speaker / Korean speaker) | card |
|---|---|---|
| Korean | 지수는 주말에도 학교 **library**에서 공부를 한다. / — | 도서관 — library |
| Swedish | De ska sälja lägenheten och köpa **house**. / … **집**. | ett hus — house / 집 |
| English | — / I left my **우산** on the bus yesterday. | umbrella — 우산 |
| Japanese | 雨の日は、電車内に **umbrella** の忘れ物が多い。 / … **우산** … | 傘 — umbrella / 우산 |
| Cantonese | 好頸渴呀，**fridge** 有冇嘢飲呀？ / … **냉장고** … | 雪櫃 — fridge / 냉장고 |
| Arabic | يَجِبُ عَلَيْكَ أَنْ تَذْهَبَ إِلَى **school**. / … **학교**. | مَدْرَسَة — school / 학교 |
| Spanish | Me llevaré un **umbrella** por si llueve. / … **우산** … | el paraguas — umbrella / 우산 |
| Kikuyu | He **water**. / He **물**. | maaĩ — water / 물 |
| Swahili | Nahitaji **doctor**. / Nahitaji **의사**. | daktari — doctor / 의사 |

**The glosses are less sourced than the sentences.** The English gap word is
the source's own translation for Korean, Japanese, Cantonese, Arabic, Spanish,
Kikuyu and Swahili. `house` for Swedish is not, because Lexin's entry is
Swedish-only. **Every Korean gap word was supplied here**, with no citation;
우산 alone happens to be confirmed, by 한국어기초사전 glossing 우산 as
"umbrella; parasol". They are six everyday nouns (집, 우산, 냉장고, 학교, 물,
의사) and the user reads Korean.

Calls made here that the first two entries did not need:

- **Korean and English each have one column, not two.** A deck is never
  explained in its own study language (`nativeOptionsFor` filters it out), so a
  Korean deck has no Korean-speaking learner to show a gap word to. The `gap`
  fields became optional and the unreachable one is left out; both panels
  already render nothing without a gap word.
- **Arabic needed the line's direction set on web.** In a left-to-right
  paragraph the sentence came out with the dropped-in word and the full stop on
  the wrong side. The two example lines now carry `dir="auto"`, as the card
  fields elsewhere on web do. Mobile is unchanged: React Native takes a line's
  direction from its first letter by default, and that has **not been seen on a
  device**.
- **The Arabic keeps the vowel marks its source prints**, and no more. The card
  front is Wiktionary's headword form, مَدْرَسَة, where the sentence has it with
  the article and case ending, ٱلْمَدْرَسَةِ. That is the same step as French
  `au marché` to `le marché`.
- **Kikuyu `maaĩ` is spelled as Wikipedia spells it, and Wiktionary heads the
  entry [maĩ](https://en.wiktionary.org/wiki/ma%C4%A9).** Both spellings are
  attested and this draft does not settle it. No speaker has checked the
  sentence, which [README.md](README.md) makes a merge gate for Kikuyu packs;
  the relaxed rule for this item is what lets it through, so it is the entry
  most worth a second look.
- **Swedish `hus` is bare in the sentence** (köpa hus, "buy a house" as a kind
  of purchase), and the card gives it its article, `ett hus`, as the French
  card does.
- **Japanese and Cantonese set the learner's word off with spaces**, as the
  Chinese entry does; the rewrite is the source's sentence exactly. The Korean
  one does not, because the particle attaches to the word (library에서).
- **Three of the eleven examples are an umbrella** (English, Japanese,
  Spanish). A learner sees one language at a time, so nothing was traded away
  to vary them.

## Scope, and what is missing

**Every study language has an example except Hanja**, which the user set aside
on 2026-10-07. The example stays optional per language and the panel renders
nothing without one, so Hanja shows the empty space it showed before.

**Adding a language is this file plus one entry**, which is the shape the
irregular-verb dataset already set: a draft row with its citation, then the
data. Nothing in the component changes.
