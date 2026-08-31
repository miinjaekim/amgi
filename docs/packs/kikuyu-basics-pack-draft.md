# Kikuyu Basics Pack — Draft for Review

**✅ Approved for implementation 2026-08-31 — with a speaker's check still
outstanding, deliberately.** That is not the Spanish pack's gate and it is worth
being plain about: this repo has measured the model wrong on Kikuyu twice — noun
class 3 of 8, tone self-consistent on 2 of 19 — and the respelling table shipped
wrong three times, each caught by someone who can hear the language and none by
review. Every row carries a tier and a citation per the standard in
[README.md](README.md), so what is unverified is visible rather than blended in:
of 59 entries, **16 are corroborated by two sources, 36 rest on one, and 7 are
derived from a sourced stem plus a sourced rule.** The two entries that had no
source at all were **cut**, per that standard.

The pack lives in `packages/core/src/kikuyuBasics.ts`.

**59 entries · 4 sections · English *and* Korean backs · `layout: 'list'` ·
`pronounceable` off** — registered as `VOCAB_PACKS.Kikuyu`, the fifth registry
key.

---

## Two code bugs, found by rendering the list — both now fixed

Neither was a content question and neither could be fixed by editing the table.
Both surfaced from running the entries through `kikuyuToEnglish` and
`kikuyuToHangul`, which is now the standard in [README.md](README.md).

**1. A consonant before `w` was stranded as its own syllable.** `KIKUYU_ONSETS`
had `m`, `k`, `g` and `w` separately and no `mw`/`kw`/`gw`/`hw`, so `mwarĩ` split
`m.wa.rĩ` and rendered `m-wa-re`. The Hangul path was worse: a vowelless onset
fell through to `withOnset(jamo, '으')` and **invented a syllable** — 므와레,
three for a two-syllable word. It hit 11 of the 59 entries, including the words
for "hello" and "one".

| entry | was | now |
|---|---|---|
| wĩmwega (hello) | `we-m-we-ga` · 웨므웨가 | `we-mwe-ga` · 웨뭬가 |
| ĩmwe (one) | `e-m-we` · 에므웨 | `e-mwe` · 에뭬 |
| mwarĩ (daughter) | `m-wa-re` · 므와레 | `mwa-re` · 뫄레 |
| mũgwanja (seven) | `mo-g-wa-nja` · 모그완자 | `mo-gwa-nja` · 모관자 |
| mũihwa (nephew) | `mo-ee-h-wa` · 모이흐와 | `mo-ee-hwa` · 모이화 |

**The first read of this was that Hangul simply cannot hold a `Cw` in one
syllable, and that a transliteration is an imperfect reading aid anyway. That
read is wrong, and the check is one line:** Korean writes every one of these as a
single syllable — 뫄, 뭬, 콰, 퀘, 과, 화 — and 과 and 화 are among the commonest
syllables in the language. The `w`-series nuclei were already in
`KIKUYU_NUCLEUS`; nothing but the onset list was missing. **And the English path
had the identical bug**, where no Hangul constraint applies at all: `m-wa-re`
where English can obviously write `mwa-re`.

That distinction is worth keeping, because the principle it was confused with is
correct and this table depends on it. **A respelling is a reading aid and is
allowed to lose things** — `ĩ`/`e` and `ũ`/`o` merge onto one letter, stress is
unmarked, `th` cannot say *the* rather than *thin*. Those are real losses of
*information*. A syllable the word does not have is not a lossy approximation of
anything; it is a third syllable in a two-syllable word, in both scripts, and
both scripts can write it correctly.

**What makes the fix safe to derive** — where the lesson in
`.scratchpad/lessons.md` says not to derive respellings from reasoning — is that
it is not a phonological claim. **Kikuyu orthography already marks the
distinction**: the vowel is written when the nasal is its own syllable (`mũndũ`,
`mũrata`) and left out when `w` is a glide (`mwana`, `mwarĩ`). Reading `mw` as
one onset reads the spelling as written. It is also what the module's own
docstring means by syllables being open CV — a bare `m` with no vowel was never
a syllable the file claimed existed. An internal-consistency argument, not a
chart.

**2. Three docstring examples were stale**, left behind by the corrections that
shipped in #105 — `rũciũ` → `roo-chee-oo`/`루치우` and `mũgũnda` → 무군다, every
one showing the *pre-correction* mapping. Anyone reading the file to understand
the table was handed the two errors a speaker had already caught. Fixed to the
values the code actually produces.

## What the sources settled, and what they caught

**Wikipedia independently confirms the respelling this repo already ships**,
which is worth recording because it was derived under pressure from one reported
word: `c` is [ʃ], `th` is [ð], `g` is [ɣ], `b` is [β], and `ĩ`/`ũ` are the
mid-high front and back vowels. The phoneme assignments were always right; only
the spelling-for-a-reader went wrong, twice.

**Numbers 1–10 are tier A** — Omniglot and learn-kikuyu agree exactly, diacritics
included. The most solid section here.

**The sources caught five of this draft's own guesses.** That is the standard
paying for itself before it was finished being written:

| drafted | sources say |
|---|---|
| `mĩrongo ĩĩrĩ` (twenty) | `mĩrongo ĩrĩ` |
| `igana`, `ngiri` (100, 1000) | `igana rĩmwe`, `ngiri ĩmwe` — the numeral is part of the word |
| `mũrũ wa maitũ` (brother) | `mũrũ wa nyina` |
| `kũina` (to sing) | nothing found — **cut** |
| `kũũra` (to run) | nothing found, and one source gives `gwĩoka` instead — **cut** |

**Two entries were cut for having no source**, which is what tier C is for. A
third, `nyũmba`, was rescued when agikuyu attested it, and the same source
attested `kũrĩa` and `kũnyua` whole — better evidence than the derivation the
verb section otherwise rests on, so those went in.

**One conflict is left unresolved on purpose.** learn-kikuyu gives `guka` for
grandfather and the Swarthmore grammar gives `wagui`. `guka` is in the pack
because lughayangu corroborates it; the conflict is in the entry's context note
rather than decided quietly.

**The verb section is the weakest thing here and its tier says so.** Kikuyu
infinitives take `kũ-`, which becomes `gũ-` before a stem starting `t`, `k`, `c`
or `th` — Dahl's Law, and the reason the language is *Gĩkũyũ* rather than
*Kĩkũyũ*. Three entries are attested infinitives; the other seven are built from
**stems** the Swarthmore grammar lists plus **a rule** stated in the same
tradition. It should hold. It is still derivation rather than evidence, and it is
where a speaker's read is worth the most.

## The things to decide first

**1. This is the second beginner pack**, and the exception argued in
`spanishBasics.ts` covers it — but Kikuyu is different in kind. There is no
"domain for a fluent speaker" version of this deck available, because there is
no pool of Kikuyu learners further along to serve. Elementary is the only pack
this language can have for now.

**2. Four sections, and the numbers one has a problem the others do not.**
Kikuyu numerals **agree with the noun class of what they count** — the forms
above are the counting/citation forms, which is what you use to count aloud, and
not what you say inside a phrase. The app already refuses to teach noun class
(2026-08-22, because the model got 3 of 8 wrong), so this section teaches a form
the learner cannot yet compose with. I think that is fine and worth saying in
the section note — counting aloud is a real use — but it is a call, not an
oversight.

**3. Kinship may be inherently possessed.** `baba` is plausibly "my father"
rather than "father", and `ithe`/`nyina` are "his/her father/mother" — a
different word, not a different form. The Swarthmore grammar says kinship terms
sit in class 1 and take no singular or plural morpheme, which is consistent, but
**no source I found states the possession directly**, so the backs here say
"father" and "mother" plainly. If a speaker says otherwise, every gloss in that
section changes.

**4. No voice, and that is settled.** Kikuyu is the one registry entry with no
`ttsLanguageCode`, so `pronounceable` stays off — the deck page has no audio to
fall back on when a gloss reads thin, which is part of why the respelling column
matters more here than on any other pack.

**5. The diacritics are load-bearing.** `ĩ`/`i` and `ũ`/`u` distinguish words,
`foldText` matches accents strictly on purpose, and the app's own pronunciation
note tells the learner exactly this. A misauthored vowel does not read oddly —
it marks a correct answer wrong.

---

## Sources

| tag | source | what it gave | rank |
|---|---|---|---|
| **OG** | [Omniglot — Kikuyu phrases](https://www.omniglot.com/language/phrases/kikuyu.htm), [numbers](https://www.omniglot.com/language/numbers/kikuyu.htm) | greetings, numbers 1–20 and up | curated phrase site |
| **LK** | [learn-kikuyu](https://learn-kikuyu.netlify.app/) — numbers, family | numbers 0–10, kinship | curated site |
| **L73** | [Swarthmore LING073 Kikuyu grammar](https://wikis.swarthmore.edu/ling073/Kikuyu/Grammar) | noun classes, verb stems, kinship in class 1 | linguistics grammar |
| **WP** | [Wikipedia — Kikuyu language](https://en.wikipedia.org/wiki/Kikuyu_language), [Dahl's law](https://en.wikipedia.org/wiki/Dahl%27s_law) | phonology, orthography, the gũ-/kũ- rule | encyclopedia |
| **AG** | [agikuyu](https://agikuyu.web.app/vocabulary/) | nyũmba, kũrĩa, kũnyua, gũthoma | curated site — pages render client-side, so these came from its indexed text rather than a page read |
| **LY** | [lughayangu](https://lughayangu.com/gikuyu) | corroboration only | community wiki — **drops diacritics and returned `Nakupenda`, which is Swahili** |
| **repo** | `EXAMPLE_TERMS`, `transliterate.ts`, the noun-class comment in `types.ts` | ũhoro, mũrata, rũciũ, cũcũ, mũndũ | already shipped |

**Not consulted, and it should be:** Benson's *Kikuyu-English Dictionary*
(Oxford, 1964) is the standard reference and is on the Internet Archive as a
borrow-only scan, so it could not be read from here. It is the one source that
would move most of this table from B to A, and it is what a reviewer with
library access should check against.

---

## The list

The **respelled → reader** column is what the app renders, run through
`kikuyuToEnglish` and `kikuyuToHangul` — not a prediction. Tiers are defined in
[README.md](README.md): **A** two sources agree including spelling, **B** one
source, **D** derived from a sourced stem plus a sourced rule.

### Ngeithi — greetings (17)

_Every phrase here is attested at Omniglot and almost nowhere else, so this is the section a speaker should read first. `wĩmwega` is a greeting and a statement at once — literally "you are well"._

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| wĩmwega | hello | 안녕하세요 | `we-mwe-ga` · `웨뭬가` | B OG | literally "you are well" — a greeting and a statement at once |
| ũhana atĩa? | how are you? | 어떻게 지내요? | `o-ha-na-a-te-a` · `오하나아테아` | B OG |  |
| ndĩmwega | I'm well | 잘 지내요 | `nde-mwe-ga` · `은데뭬가` | B OG | the answer to ũhana atĩa? |
| ngeithi cia rũcinĩ | good morning | 좋은 아침이에요 | `nge-ee-thee-shee-a-ro-shee-ne` · `응게이디시아로시네` | B OG | literally "greetings of the morning" |
| ngeithi cia hwainĩ | good evening | 좋은 저녁이에요 | `nge-ee-thee-shee-a-hwa-ee-ne` · `응게이디시아화이네` | B OG |  |
| koma wega | good night | 안녕히 주무세요 | `ko-ma-we-ga` · `코마웨가` | B OG | literally "sleep well" |
| tigoi na wega | goodbye | 안녕히 계세요 | `tee-go-ee-na-we-ga` · `티고이나웨가` | B OG | literally "be left with goodness" |
| nĩ wega | thank you | 고맙습니다 | `ne-we-ga` · `네웨가` | B OG | literally "it is good" — also the reply to thanks |
| ĩĩ | yes | 네 | `e-e` · `에에` | B OG |  |
| aca | no | 아니요 | `a-sha` · `아샤` | B OG |  |
| tareke | excuse me | 실례합니다 | `ta-re-ke` · `타레케` | B OG |  |
| ndiũĩ | I don't know | 몰라요 | `ndee-o-e` · `은디오에` | B OG |  |
| wĩtago atĩa? | what's your name? | 이름이 뭐예요? | `we-ta-go-a-te-a` · `웨타고아테아` | B OG |  |
| njĩtago | my name is | 제 이름은 | `nje-ta-go` · `은제타고` | B OG | the frame you finish with your own name |
| ũhoro | news, word | 소식, 말 | `o-ho-ro` · `오호로` | A repo·LY | what there is to tell |
| mũrata | friend | 친구 | `mo-ra-ta` · `모라타` | B repo |  |
| rũciũ | tomorrow | 내일 | `ro-shee-o` · `로시오` | B repo |  |

### Namba — numbers (17)

_The most solid section here: 1–10 are attested identically, diacritics included, by two independent sources. Kikuyu numerals agree with the noun class of what they count — these are the counting forms, which is what you use to count aloud rather than what you say inside a phrase._

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| kĩbũgũ | zero | 영 | `ke-bo-go` · `케보고` | B LK |  |
| ĩmwe | one | 하나 | `e-mwe` · `에뭬` | A OG·LK |  |
| igĩrĩ | two | 둘 | `ee-ge-re` · `이게레` | A OG·LK |  |
| ithatũ | three | 셋 | `ee-tha-to` · `이다토` | A OG·LK |  |
| inya | four | 넷 | `ee-nya` · `이냐` | A OG·LK |  |
| ithano | five | 다섯 | `ee-tha-no` · `이다노` | A OG·LK |  |
| ithathatũ | six | 여섯 | `ee-tha-tha-to` · `이다다토` | A OG·LK |  |
| mũgwanja | seven | 일곱 | `mo-gwa-nja` · `모관자` | A OG·LK |  |
| inyanya | eight | 여덟 | `ee-nya-nya` · `이냐냐` | A OG·LK |  |
| kenda | nine | 아홉 | `ke-nda` · `켄다` | A OG·LK |  |
| ikũmi | ten | 열 | `ee-ko-mee` · `이코미` | A OG·LK |  |
| ikũmi na ĩmwe | eleven | 열하나 | `ee-ko-mee-na-e-mwe` · `이코미나에뭬` | B OG | ten and one — the teens are built, not learned |
| mĩrongo ĩrĩ | twenty | 스물 | `me-ro-ngo-e-re` · `메롱고에레` | B OG | literally "two tens" |
| mĩrongo ithatũ | thirty | 서른 | `me-ro-ngo-ee-tha-to` · `메롱고이다토` | B OG |  |
| mĩrongo ithano | fifty | 쉰 | `me-ro-ngo-ee-tha-no` · `메롱고이다노` | B OG |  |
| igana rĩmwe | one hundred | 백 | `ee-ga-na-re-mwe` · `이가나레뭬` | B OG | the numeral is part of the word — not bare igana |
| ngiri ĩmwe | one thousand | 천 | `ngee-ree-e-mwe` · `응기리에뭬` | B OG |  |

### Andũ a nyũmba — family (15)

_Class 1 takes mũ- in the singular and a- in the plural, so mũndũ/andũ is a prefix change rather than an ending. Whether these terms are inherently possessed — whether baba is "my father" rather than "father" — is the open question a speaker should settle first._

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| mũndũ | person | 사람 | `mo-ndo` · `몬도` | A L73·repo |  |
| andũ | people | 사람들 | `a-ndo` · `안도` | A L73·repo | class 1 takes a- for the plural, not an ending |
| baba | father | 아버지 | `ba-ba` · `바바` | B LK |  |
| maitũ | mother | 어머니 | `ma-ee-to` · `마이토` | B LK |  |
| nyina | his mother, her mother | 그 사람의 어머니 | `nyee-na` · `니나` | B LK | the word inside mũrũ wa nyina |
| mũriũ | son | 아들 | `mo-ree-o` · `모리오` | B LK |  |
| mwarĩ | daughter | 딸 | `mwa-re` · `뫄레` | B LK |  |
| mũrũ wa nyina | brother | 형제 | `mo-ro-wa-nyee-na` · `모로와니나` | B LK | literally "son of his mother" |
| mwarĩ wa nyina | sister | 자매 | `mwa-re-wa-nyee-na` · `뫄레와니나` | B LK | literally "daughter of his mother" |
| guka | grandfather | 할아버지 | `goo-ka` · `구카` | A LK·LY | L73 gives wagui instead — the conflict is unresolved |
| cũcũ | grandmother | 할머니 | `sho-sho` · `쇼쇼` | A LK·repo | the word the respelling was corrected from — shosho, not choo-choo |
| mama | uncle | 삼촌 | `ma-ma` · `마마` | B LK |  |
| tata | aunt | 이모, 고모 | `ta-ta` · `타타` | B LK |  |
| mũihwa | nephew, niece | 조카 | `mo-ee-hwa` · `모이화` | B LK | one word for both |
| nyũmba | house | 집 | `nyo-mba` · `뇸바` | B AG |  |

### Ciĩko — actions (10)

_Kikuyu infinitives take kũ-, which becomes gũ- before a stem starting t, k, c or th — Dahl’s Law, and the reason the language is Gĩkũyũ rather than Kĩkũyũ. Four of these are attested whole; the rest are built from a sourced stem plus that rule, which is weaker._

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| kũrĩa | to eat | 먹다 | `ko-re-a` · `코레아` | B AG |  |
| kũnyua | to drink | 마시다 | `ko-nyoo-a` · `코뉴아` | B AG |  |
| gũthoma | to read, to study | 읽다, 공부하다 | `go-tho-ma` · `고도마` | A AG·L73 | gũ- not kũ-, because th is voiceless |
| gũthiĩ | to go | 가다 | `go-thee-e` · `고디에` | D L73+WP | stem thi- plus Dahl’s Law |
| gũthamba | to wash, to swim | 씻다, 헤엄치다 | `go-tha-mba` · `고담바` | D L73+WP | stem thamb- |
| kũrĩma | to cultivate | 농사짓다 | `ko-re-ma` · `코레마` | D L73+WP | stem rĩm- — kũ- because r is not voiceless |
| kũhitha | to hide | 숨다 | `ko-hee-tha` · `코히다` | D L73+WP | stem hith- |
| kũhumba | to cover | 덮다 | `ko-hoo-mba` · `코훔바` | D L73+WP | stem humb- |
| kũrora | to look at | 바라보다 | `ko-ro-ra` · `코로라` | D L73+WP | stem ror- |
| kũhaica | to climb | 오르다 | `ko-ha-ee-sha` · `코하이샤` | D L73+WP | stem haic- |
