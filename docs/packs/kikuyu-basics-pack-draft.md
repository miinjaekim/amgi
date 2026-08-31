# Kikuyu Basics Pack — Draft for Review

**⏳ Not approved, and the gate here is harder than the Spanish pack's.** That
one needed your read. This one needs **a speaker's**, and the reason is on the
record rather than a precaution: this repo has measured the model wrong on
Kikuyu twice — noun class 3 of 8, tone self-consistent on 2 of 19 — and the
respelling table shipped wrong three times, each caught by someone who can hear
the language and none by review. **I am the same source that was wrong those
times.** So every row below carries a tier and a citation, per the standard in
[README.md](README.md), and the honest summary is this: of 59 entries, **15 are
corroborated by two sources, 33 rest on one, 8 are derived from a stem plus a
rule, and 3 have no source at all.** The three unsourced ones should be cut or
checked; they are marked C.

**59 entries · 4 sections · English *and* Korean backs · `layout: 'list'` ·
`pronounceable` off**

Would become `packages/core/src/kikuyuBasics.ts`, registered as
`VOCAB_PACKS.Kikuyu` — the fifth registry key.

---

## Two code blockers, found by rendering the list

Neither is a content question and neither can be fixed by editing this table.
Both were found by running the entries through `kikuyuToEnglish` and
`kikuyuToHangul` rather than by reading — which is now the standard in
[README.md](README.md).

**1. A consonant before `w` is stranded as its own syllable.** The syllabifier
has `m`, `k`, `g` and `w` as separate onsets and no `mw`/`kw`/`gw`, so `mwarĩ`
splits `m.wa.rĩ` and renders `m-wa-re`. In Hangul it is worse: the vowelless
onset falls through to `withOnset(jamo, '으')` and **invents a syllable** —
`므와레`, three syllables for a two-syllable word.

**This hits every section, including the words for "hello" and "one":**

| entry | renders as | syllables it should have |
|---|---|---|
| wĩmwega (hello) | `we-m-we-ga` · 웨므웨가 | 3, not 4 |
| ĩmwe (one) | `e-m-we` · 에므웨 | 2, not 3 |
| mwarĩ (daughter) | `m-wa-re` · 므와레 | 2, not 3 |
| mũgwanja (seven) | `mo-g-wa-nja` · 모그완자 | 3, not 4 |
| mũihwa (nephew) | `mo-ee-h-wa` · 모이흐와 | 3, not 4 |

11 of the 59 entries are affected. The module's own docstring says Kikuyu
syllables "are open (CV) apart from the prenasalized onsets", so a bare
consonant syllable violates the invariant the file states about itself — which
is why I am fairly confident this is a bug rather than a phonological claim.
**It is still a respelling change on a shipped feature**, and the lesson in
`.scratchpad/lessons.md` says those get a native check before merge, so I have
not made it. The fix is `mw`/`kw`/`gw`/`hw` in `KIKUYU_ONSETS` and
`KIKUYU_ONSET_HANGUL` with `glide: 'w'`, which the Hangul table already supports
for `y`.

**2. Three docstring examples in `transliterate.ts` are stale**, left behind by
the two corrections that shipped in #105:

| line | says | actually produces |
|---|---|---|
| 299 | `rũciũ` → `roo-chee-oo` | `ro-shee-o` |
| 315 | `mũgũnda` is 무군다 | 모곤다 |
| 373 | `rũciũ` → `루치우`, `mũgũnda` → `무군다` | 로시오, 모곤다 |

Every one shows the **pre-correction** mapping — `c` as *ch*, `ũ` as *oo*/우 —
so anyone reading the file to understand the table is handed the exact two
errors a speaker already corrected. Cosmetic in effect, but this file is the one
place the reasoning lives.

---

## What the sources actually settled

**Wikipedia independently confirms the respelling this repo already ships**,
which is worth recording because it was derived under pressure from one reported
word: `c` is [ʃ], `th` is [ð], `g` is [ɣ], `b` is [β], and `ĩ`/`ũ` are the
mid-high front and back vowels. Nothing to change; the table's phoneme
assignments are right, and it was only ever the *spelling for a reader* that
went wrong.

**Numbers 1–10 are tier A** — Omniglot and learn-kikuyu agree exactly, diacritics
included. This is the most solid section in the pack and the only one where I
would not insist on a speaker.

**Three of my own guesses were wrong and the sources caught them**, which is the
argument for the standard in one line:

| I had | sources say |
|---|---|
| `mĩrongo ĩĩrĩ` (twenty) | `mĩrongo ĩrĩ` |
| `igana`, `ngiri` (100, 1000) | `igana rĩmwe`, `ngiri ĩmwe` — the numeral is part of the word |
| `mũrũ wa maitũ` (brother) | `mũrũ wa nyina` |

**One conflict is left unresolved on purpose**, per the standard: learn-kikuyu
gives `guka` for grandfather and the Swarthmore grammar gives `wagui`. I have
kept `guka` because lughayangu corroborates it, and flagged it here rather than
deciding quietly.

**The verb section is tier D and it is the weakest thing here.** Kikuyu
infinitives take `kũ-`, which becomes `gũ-` before a stem starting `t`, `k`, `c`
or `th` — Dahl's Law, and the reason the language is called *Gĩkũyũ* rather than
*Kĩkũyũ*. So the section is built from **stems** the Swarthmore grammar lists
plus **a rule** stated in the same tradition, not from attested infinitives. It
should hold, and it is still derivation rather than evidence. Two entries
(`kũina`, `kũũra`) have vowel-initial stems where the prefix shape is a further
question the sources did not answer, and are marked C.

---

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
| **LY** | [lughayangu](https://lughayangu.com/gikuyu) | corroboration only | community wiki — **drops diacritics and returned `Nakupenda`, which is Swahili** |
| **repo** | `EXAMPLE_TERMS`, `transliterate.ts`, the noun-class comment in `types.ts` | ũhoro, mũrata, rũciũ, cũcũ, mũndũ | already shipped |

**Not consulted, and it should be:** Benson's *Kikuyu-English Dictionary*
(Oxford, 1964) is the standard reference and is on the Internet Archive as a
borrow-only scan, so it could not be read from here. It is the one source that
would move most of this table from B to A, and it is what a reviewer with
library access should check against.

---

## The list

The **respelled → reader** column is what the app actually renders today, run
through `kikuyuToEnglish` and `kikuyuToHangul` — not a prediction. Rows showing
a stranded consonant are blocker 1 above.

### Ngeithi — greetings (17)

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| wĩmwega | hello | 안녕하세요 | `we-m-we-ga` · `웨므웨가` | B OG | literally "you are well" — a greeting and a statement at once |
| ũhana atĩa? | how are you? | 어떻게 지내요? | `o-ha-na-a-te-a` · `오하나아테아` | B OG |  |
| ndĩmwega | I'm well | 잘 지내요 | `nde-m-we-ga` · `은데므웨가` | B OG | the answer to ũhana atĩa? |
| ngeithi cia rũcinĩ | good morning | 좋은 아침이에요 | `nge-ee-thee-shee-a-ro-shee-ne` · `응게이디시아로시네` | B OG | literally "greetings of the morning" |
| ngeithi cia hwainĩ | good evening | 좋은 저녁이에요 | `nge-ee-thee-shee-a-h-wa-ee-ne` · `응게이디시아흐와이네` | B OG |  |
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

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| kĩbũgũ | zero | 영 | `ke-bo-go` · `케보고` | B LK |  |
| ĩmwe | one | 하나 | `e-m-we` · `에므웨` | A OG·LK |  |
| igĩrĩ | two | 둘 | `ee-ge-re` · `이게레` | A OG·LK |  |
| ithatũ | three | 셋 | `ee-tha-to` · `이다토` | A OG·LK |  |
| inya | four | 넷 | `ee-nya` · `이냐` | A OG·LK |  |
| ithano | five | 다섯 | `ee-tha-no` · `이다노` | A OG·LK |  |
| ithathatũ | six | 여섯 | `ee-tha-tha-to` · `이다다토` | A OG·LK |  |
| mũgwanja | seven | 일곱 | `mo-g-wa-nja` · `모그완자` | A OG·LK |  |
| inyanya | eight | 여덟 | `ee-nya-nya` · `이냐냐` | A OG·LK |  |
| kenda | nine | 아홉 | `ke-nda` · `켄다` | A OG·LK |  |
| ikũmi | ten | 열 | `ee-ko-mee` · `이코미` | A OG·LK |  |
| ikũmi na ĩmwe | eleven | 열하나 | `ee-ko-mee-na-e-m-we` · `이코미나에므웨` | B OG | ten and one — the teens are built, not learned |
| mĩrongo ĩrĩ | twenty | 스물 | `me-ro-ngo-e-re` · `메롱고에레` | B OG | literally "two tens" |
| mĩrongo ithatũ | thirty | 서른 | `me-ro-ngo-ee-tha-to` · `메롱고이다토` | B OG |  |
| mĩrongo ithano | fifty | 쉰 | `me-ro-ngo-ee-tha-no` · `메롱고이다노` | B OG |  |
| igana rĩmwe | one hundred | 백 | `ee-ga-na-re-m-we` · `이가나레므웨` | B OG |  |
| ngiri ĩmwe | one thousand | 천 | `ngee-ree-e-m-we` · `응기리에므웨` | B OG |  |

### Andũ a nyũmba — family (15)

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| mũndũ | person | 사람 | `mo-ndo` · `몬도` | A L73·repo |  |
| andũ | people | 사람들 | `a-ndo` · `안도` | A L73·repo | class 1 takes a- for the plural, not an ending |
| baba | father | 아버지 | `ba-ba` · `바바` | B LK |  |
| maitũ | mother | 어머니 | `ma-ee-to` · `마이토` | B LK |  |
| nyina | his mother, her mother | 그 사람의 어머니 | `nyee-na` · `니나` | B LK | the word inside mũrũ wa nyina |
| mũriũ | son | 아들 | `mo-ree-o` · `모리오` | B LK |  |
| mwarĩ | daughter | 딸 | `m-wa-re` · `므와레` | B LK |  |
| mũrũ wa nyina | brother | 형제 | `mo-ro-wa-nyee-na` · `모로와니나` | B LK | literally "son of his mother" |
| mwarĩ wa nyina | sister | 자매 | `m-wa-re-wa-nyee-na` · `므와레와니나` | B LK | literally "daughter of his mother" |
| guka | grandfather | 할아버지 | `goo-ka` · `구카` | A LK·LY |  |
| cũcũ | grandmother | 할머니 | `sho-sho` · `쇼쇼` | A LK·repo | the word the respelling was corrected from — shosho, not choo-choo |
| mama | uncle | 삼촌 | `ma-ma` · `마마` | B LK |  |
| tata | aunt | 이모, 고모 | `ta-ta` · `타타` | B LK |  |
| mũihwa | nephew, niece | 조카 | `mo-ee-h-wa` · `모이흐와` | B LK | one word for both |
| nyũmba | house | 집 | `nyo-mba` · `뇸바` | C — |  |

### Ciĩko — actions (10)

| entry | English | Korean | respelled → reader | source | context |
|---|---|---|---|---|---|
| gũthiĩ | to go | 가다 | `go-thee-e` · `고디에` | D L73+WP | stem thi- — gũ- because th is voiceless |
| gũthoma | to read, to study | 읽다, 공부하다 | `go-tho-ma` · `고도마` | D L73+WP | stem thom- |
| gũthamba | to wash, to swim | 씻다, 헤엄치다 | `go-tha-mba` · `고담바` | D L73+WP | stem thamb- |
| kũrĩma | to cultivate | 농사짓다 | `ko-re-ma` · `코레마` | D L73+WP | stem rĩm- — kũ- because r is not voiceless |
| kũhitha | to hide | 숨다 | `ko-hee-tha` · `코히다` | D L73+WP | stem hith- |
| kũhumba | to cover | 덮다 | `ko-hoo-mba` · `코훔바` | D L73+WP | stem humb- |
| kũrora | to look at | 바라보다 | `ko-ro-ra` · `코로라` | D L73+WP | stem ror- |
| kũhaica | to climb | 오르다 | `ko-ha-ee-sha` · `코하이샤` | D L73+WP | stem haic- |
| kũina | to sing | 노래하다 | `ko-ee-na` · `코이나` | C L73 | stem in- — vowel-initial, so the prefix shape needs checking |
| kũũra | to run | 달리다 | `ko-o-ra` · `코오라` | C L73 | stem ũr- — vowel-initial, same question |
