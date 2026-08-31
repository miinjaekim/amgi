# Spanish Basics Pack — Draft for Review

**✅ Word list approved 2026-08-31**, with two changes made on review — see
*What review changed* below. Kept as the record of what was authored and why, and
still the place to read before changing an entry or a gloss, since the sections
lead with the calls a bare source diff would not explain. The pack lives in
`packages/core/src/spanishBasics.ts`.

**153 entries · one pack · 5 sections · English *and* Korean backs ·
`layout: 'list'` · `pronounceable: true`**

Would become `packages/core/src/spanishBasics.ts`, registered as
`VOCAB_PACKS.Spanish` — the **fourth** registry key, after English, Japanese and
Korean.

---

## The things to decide first

**1. One pack with five sections, not five packs.** You asked for "basic Spanish
packs", plural, and I have drafted it as one. `PackSection` exists for exactly
this — the header on `packs.ts` says "160 words is not one decision" — and
sections are already the enrolment unit, so nobody has to take all five at once.
Five separate packs would put five one-topic rows on the deck list where TOEIC,
at 133 words, gets one. **Say the word and it splits**; nothing else in the draft
changes if it does, since the sections are self-contained.

**2. This is a beginner deck, and that is a bigger exception than the last one.**
The Everyday English pack set the "audience is not beginners" rule aside on
2026-08-24, but its learners had a decade of school English behind them — the
pack could still be *concrete over frequent*. A Spanish learner starting at
`hola` has nothing behind them, so that filter has nothing to bite on. This is a
genuine starter deck, the app's first. Recorded as a deliberate exception, not a
change of principle — but it is the call worth arguing with, because it is the
one everything else follows from.

**What I did so it does not become a bad deck.** A starter list fails by filling
with words that carry no information — `casa`, `grande`, `bueno` — which feels
comprehensive and teaches nothing you would not absorb in a week anyway. So the
filter here is **the word you are stuck without**: the thing you cannot mime, the
distinction that is invisible from English, and the peninsular form a Latin
American phrasebook would get wrong for you. `caña`, `carta`, `todo recto`,
`planta baja`, `ser`/`estar`, `pedir`/`preguntar`.

**3. Both backs are authored.** Unlike every list pack so far. On a Spanish deck
the study side is the `spanish` slot, so `getBackSideConfig` hands an
English-native reader the `english` back and a Korean-native reader the `korean`
one — neither is dead weight and a missing side renders as a fallback rather than
as itself.

**4. European Spanish, and these five topics are exactly where it shows.**
Decided 2026-08-21 (`es-ES`, `es-ES-Chirp3-HD-Charon`). Ordering food and asking
directions are not neutral ground, so the draft commits rather than averaging:
`caña`, `zumo`, `patata`, `tortilla` as the potato omelette, `billete`,
`todo recto`, `servicios`, `planta baja`, `coger`,
and `vosotros` named in the greetings note. **`coger` is the one to look at
twice** — it is the ordinary verb for catching a bus in Spain and vulgar across
much of Latin America. It is in the deck because the deck is European Spanish and
a learner in Madrid needs it; it carries a context hint that says so.

**5. Phrases as entries, in three of the five sections.** `PackEntry.study` is a
string and nothing stops it holding `¿dónde está el baño?`, but it makes a phrase
card in a deck of word cards. I have kept them **short, fixed, and only where the
phrase is the unit you actually need** — `mucho gusto` is not assemblable from
`mucho` and `gusto`. Open question 1 has the rule they follow and what it costs
in typed review.

**Where it came from, and what has *not* been checked.** Assembled by hand
against the functional inventories an A1 syllabus is built on — greeting and
introducing, ordering, asking the way — with the verb section weighted by
frequency and the peninsular forms chosen deliberately rather than inherited.
**Both back columns are written, not verified.** The English and Korean glosses
are mine, and the Korean ones are the part of this draft most worth your eyes:
a gloss can be correct and still be the wrong register, which is not something
the list can show you by itself. Same for the context hints — they assert facts
about Spanish (`caña` is ~200 ml, `los servicios` is what the sign says,
`la manzana` is a city block) that are worth a second read, since a wrong hint
is carried onto the card as `briefDefinition` and steers every later depth call.

---

## What review changed (2026-08-31)

**1. Terms carry their gender, and the study column lost its articles.**
`PackEntry` gains an optional `gender`, written through by
`buildPackCardDraft`, so a pack noun saves with `el`/`la` the same way a
looked-up one does. This was open question 2; it is now decided.

**The article then had to come *out* of the study text**, which the first version
of this table had it in — `la carta` with `gender: 'la'` beside it makes the
grader accept `la la carta`, and it makes a pack card and a looked-up card two
different strings for the same word, which is the exact problem the field was
added to prevent. `/api/explain` returns the bare noun plus its article, so the
pack now does too: 41 entries were rewritten from `la carta` to `carta` + `la`.
Nothing changes on screen — the badge renders the article either way — and
typed review now takes `carta` and `la carta` both. Caught by the test, not by
reading.

**2. `el menú del día` was glossed "the set lunch", which interprets instead of
translating.** You caught it, and it was not the only one — the same defect ran
through three more entries in the same section, so the class is fixed rather than
the instance:

| entry | was | now |
|---|---|---|
| menú del día | the set lunch | the menu of the day |
| primer plato | the starter | the first course |
| segundo plato | the main course | the second course |
| ración | a full sharing plate | a portion |

**3. `tapas` was glossed "tapas", which is not a card.** English borrowed the
word unchanged and Korean transliterated it, so both backs said the front back to
the learner — and `pack-cards.test.ts` already had the guard that catches it,
which is how it was found rather than by reading. Where the target language has
no *other* word, the back has to define rather than translate: now "a small plate
of food" / 작은 안주 한 접시, with the borrowing noted in the hint. This is the one
principled exception to the rule in (2) — a definition stands in only when a
translation does not exist.

The rule they now follow: **where the Spanish has a plain English reading that is
also correct, the back uses it and the context hint carries the institution.**
That is what `context` is for — it survives onto the card as `briefDefinition`,
so "a fixed price for starter, main, drink and dessert" is not lost, it has just
moved to where a hint belongs rather than standing in for the words.

Entries that keep a functional gloss, because the Spanish is a lexical item with
no compositional reading to give: `caña`, `servicios`, `manzana`, `todo recto`,
`planta baja`.

**Worth noting for the next pack:** the Korean column had already got this right
— `el primer plato` was 첫 번째 요리 while the English said "the starter". The two
back columns were written independently and drifted, and the English one drifted
toward explaining. A pack with two backs can disagree with itself, and nothing in
the code would ever catch it.

---

## Open questions for you

1. **Typed review will miss on the phrase entries and on half the numbers.**
   `foldText` in `typedAnswer.ts` deliberately strips neither punctuation nor
   diacritics — Kikuyu `ĩ`/`ũ` and French `ou`/`où` are the reason it refuses.
   So `¿cómo te llamas?` has to be typed with both marks, and `dieciséis`,
   `veintidós`, `veintitrés` with their accents. It is a *false* miss and one tap
   on the rating row corrects it, which is the design — but this pack would be
   the first to hit it at volume.
   **I considered authoring the phrases bare (`cómo te llamas`) to dodge it and
   decided against**, because a card that shows `cómo te llamas` teaches the
   learner to write Spanish wrong: the inverted `¿` is orthography, and refusing
   to fold away orthography is the same argument `foldText` already won. So the
   rule the list follows is:
   **a question is authored as a complete question with its punctuation; a frame
   the learner finishes with their own word is authored bare.** `¿dónde está el
   baño?` is a card, `me llamo` and `soy alérgico a` are cards, `¿dónde está` is
   not — a half-sentence also makes the pronounce button read a fragment aloud,
   which on a `pronounceable: true` pack is its own bug.
   Overrule me and every `¿…?` comes off in one pass.
2. **✅ Decided: `PackEntry` gains a `gender` field.** _Your call, 2026-08-31._
   The three-line fix below was taken, so pack nouns save with their article and
   typed review accepts both `baño` and `el baño`. Question kept for the
   reasoning.
   Pack cards carried no gender, and looked-up cards did. `/api/explain` returns
   `el`/`la` for Spanish nouns and the app renders it as a badge on lookup,
   review and the card detail — but `buildPackCardDraft` writes no `gender`
   field, so **every noun in this pack would show without its article** while the
   same word looked up by hand shows with it. That is not a Spanish problem, it
   is a gap the registry never had a Latin-script pack to expose. **The fix is
   about three lines** — an optional `gender` on `PackEntry`, written through by
   `buildPackCardDraft` — and it pays twice, because `acceptedAnswers` then takes
   both `baño` and `el baño` in typed review. I have authored the gender column
   below on the assumption you want it. **If you would rather not touch
   `packs.ts`**, the alternative is folding the article into the study text
   (`el baño`), which loses nothing on screen but makes a pack card and a
   looked-up card two different strings for the same word.
3. **153 is large for a starter deck, and the numbers section is why.** It is 36
   entries and about four decisions — one entry per number inflates the count
   without adding much difficulty once the pattern lands. It stays whole because
   a half-counting system is worse than none, but `dieciséis`–`diecinueve` and
   the tens are where I would cut first, and the deck drops to ~140 for it.
   For scale: TOEIC is 133, Everyday English 149, TOPIK 160 — and sections are
   the enrolment unit, so nobody takes 153 at once.
4. **`ser` / `estar` is one card each and cannot be.** The distinction is the
   entry, not either verb, and a one-line gloss on each is the thinnest thing in
   the deck. Both carry context hints that state the split, which is the most a
   card can do — the real teaching is the depth call. Same shape for
   `saber`/`conocer`, `pedir`/`preguntar` and `hablar`/`decir`, which are the
   four pairs this section exists for.
   **Two of those four collided on the back and I have separated them**: `ser`
   and `estar` both glossed "to be", `saber` and `conocer` both "to know", which
   is unreviewable in the English→Spanish direction — the learner sees "to be"
   and cannot know which card is asking. Both now carry a disambiguating
   parenthetical on the English side, the way the Korean side already
   distinguished them. `mucho gusto` and `encantado` collided the same way in
   Korean and are now 만나서 반갑습니다 / 만나 뵙게 되어 기쁩니다. Flag if the
   nudge reads as a distinction Spanish does not actually make — that is the
   risk of the fix, and the alternative is dropping one card of each pair.
5. **`usted` is in and `tú` is not.** A Korean speaker maps 존댓말/반말 onto
   Spanish immediately and gets it wrong, so the formal pronoun earns a card;
   `tú` and `vosotros` are named in the section note instead, since bare pronouns
   are learned by being used. Flag if you want all three carded or none.
6. **No overlap between sections, enforced by test.** `cruzar`, `seguir` and
   `girar` are directional and live in *Cómo llegar*, so they are deliberately
   absent from the verb section — saved-marking is keyed on the study text, so a
   word in two sections of one pack is one card filed under whichever the learner
   enrolled in first.

---

## The list

### Saludos y presentaciones — 인사와 소개 (26)

_The first ten minutes of any conversation, in the order they happen. `tú` is the
"you" for a friend, `usted` for anyone you would use 존댓말 with, and Spain keeps
a fourth pronoun the rest of the Spanish world dropped: `vosotros`, "you" plural
and informal, where Latin America says `ustedes` to everybody._

| entry | gender | English back | Korean back | when it means (context hint) |
|---|---|---|---|---|
| hola |  | hello | 안녕하세요 |  |
| buenos días |  | good morning | 안녕하세요 (아침 인사) | used until about two in the afternoon, not just early |
| buenas tardes |  | good afternoon | 안녕하세요 (오후 인사) | from lunch until it gets dark |
| buenas noches |  | good evening, good night | 안녕하세요 (밤 인사), 안녕히 주무세요 | both a greeting on arrival and a farewell |
| adiós |  | goodbye | 안녕히 가세요 | final-sounding — Spaniards say hasta luego far more often |
| hasta luego |  | see you later | 나중에 봐요 | the ordinary goodbye, even to someone you will not see again |
| hasta mañana |  | see you tomorrow | 내일 봐요 |  |
| ¿qué tal? |  | how's it going? | 잘 지내요? | the everyday greeting, lighter than ¿cómo estás? |
| ¿cómo estás? |  | how are you? | 어떻게 지내요? | to one person you address as tú |
| ¿cómo está usted? |  | how are you? (formal) | 어떻게 지내세요? |  |
| bien, gracias |  | fine, thanks | 잘 지내요, 고마워요 |  |
| me llamo |  | my name is | 제 이름은 | literally "I call myself" — the ordinary way to give your name |
| ¿cómo te llamas? |  | what's your name? | 이름이 뭐예요? |  |
| mucho gusto |  | nice to meet you | 만나서 반갑습니다 |  |
| encantado |  | delighted to meet you | 만나 뵙게 되어 기쁩니다 | the speaker's own gender picks the ending — a woman says encantada |
| ¿de dónde eres? |  | where are you from? | 어디에서 왔어요? |  |
| soy de |  | I'm from | 저는 ~에서 왔어요 |  |
| ¿a qué te dedicas? |  | what do you do? | 무슨 일 하세요? | asks about work; more natural in Spain than ¿cuál es tu trabajo? |
| usted |  | you (formal) | (존댓말의) 당신 | for a stranger, someone older, anyone you would use 존댓말 with |
| por favor |  | please | 부탁합니다 |  |
| gracias |  | thank you | 고맙습니다 |  |
| de nada |  | you're welcome | 천만에요 |  |
| perdón |  | sorry, excuse me | 죄송합니다, 실례합니다 | to apologise lightly, or to get past someone |
| lo siento |  | I'm sorry | 미안합니다 | for something that actually went wrong — perdón is the lighter one |
| no entiendo |  | I don't understand | 이해가 안 돼요 |  |
| ¿puedes hablar más despacio? |  | can you speak more slowly? | 좀 천천히 말해 줄래요? | more useful than asking someone to repeat at the same speed |

### Números — 숫자 (36)

_Whole, because a half-counting system is worse than none. Two things to watch:
`dieciséis` through `diecinueve` and `veintidós`, `veintitrés`, `veintiséis`
contract into one word **and take a written accent**, which is where typed review
will bite; and Spain writes the decimal comma, so `1,50 €` is one euro fifty. The
three ordinals at the end are here rather than in their own section because both
of the places you need them — floors and "the second street on the right" — are
in the two sections that follow._

| entry | gender | English back | Korean back | when it means (context hint) |
|---|---|---|---|---|
| cero |  | zero | 영, 공 |  |
| uno |  | one | 하나, 일 | becomes un before a masculine noun — un café |
| dos |  | two | 둘, 이 |  |
| tres |  | three | 셋, 삼 |  |
| cuatro |  | four | 넷, 사 |  |
| cinco |  | five | 다섯, 오 |  |
| seis |  | six | 여섯, 육 |  |
| siete |  | seven | 일곱, 칠 |  |
| ocho |  | eight | 여덟, 팔 |  |
| nueve |  | nine | 아홉, 구 |  |
| diez |  | ten | 열, 십 |  |
| once |  | eleven | 열하나, 십일 |  |
| doce |  | twelve | 열둘, 십이 |  |
| trece |  | thirteen | 열셋, 십삼 |  |
| catorce |  | fourteen | 열넷, 십사 |  |
| quince |  | fifteen | 열다섯, 십오 |  |
| dieciséis |  | sixteen | 열여섯, 십육 | the teens contract from here on — and this one takes an accent |
| diecisiete |  | seventeen | 열일곱, 십칠 |  |
| dieciocho |  | eighteen | 열여덟, 십팔 |  |
| diecinueve |  | nineteen | 열아홉, 십구 |  |
| veinte |  | twenty | 스물, 이십 |  |
| veintiuno |  | twenty-one | 스물하나, 이십일 | the twenties contract too — veintiuno, not veinte y uno |
| veintidós |  | twenty-two | 스물둘, 이십이 | accented, like veintitrés and veintiséis |
| veintitrés |  | twenty-three | 스물셋, 이십삼 |  |
| treinta |  | thirty | 서른, 삼십 | from here the tens separate again — treinta y uno |
| cuarenta |  | forty | 마흔, 사십 |  |
| cincuenta |  | fifty | 쉰, 오십 |  |
| sesenta |  | sixty | 예순, 육십 |  |
| setenta |  | seventy | 일흔, 칠십 |  |
| ochenta |  | eighty | 여든, 팔십 |  |
| noventa |  | ninety | 아흔, 구십 |  |
| cien |  | one hundred | 백 | cien on its own and before a noun; ciento inside a number — ciento veinte |
| mil |  | one thousand | 천 | never un mil — mil euros |
| primero |  | first | 첫 번째 | shortens to primer before a masculine noun — el primer plato |
| segundo |  | second | 두 번째 | la segunda calle a la derecha — the second street on the right |
| tercero |  | third | 세 번째 | shortens the same way primero does — el tercer piso |

### En el restaurante — 식당에서 (31)

_Spain's meals run late and its menus are laid out differently: `la carta` is the
list you order from, `el menú` usually means the fixed-price set lunch. The one
ordering frame in here, `¿me pone una caña?`, deliberately reuses a word the
section already taught — the frame is the new thing, and pairing it with a known
noun is what makes it copyable._

| entry | gender | English back | Korean back | when it means (context hint) |
|---|---|---|---|---|
| carta | la | the menu | 메뉴판 | the list you order from — not el menú, which is the set meal |
| menú del día | el | the menu of the day | 오늘의 메뉴 | a fixed price for starter, main, drink and dessert — weekday lunches |
| camarero | el | the waiter | 종업원 | la camarera for a woman |
| una mesa para dos |  | a table for two | 두 명이요 |  |
| primer plato | el | the first course | 첫 번째 요리 | the first of the two a Spanish lunch comes in — soup, salad, something light |
| segundo plato | el | the second course | 두 번째 요리 | the second of the two, and the main one — meat or fish |
| postre | el | dessert | 후식 |  |
| bebida | la | the drink | 음료 |  |
| agua | el | water | 물 | feminine, but takes el — el agua fría |
| caña | la | a small draught beer | 생맥주 한 잔 | about 200 ml, and the default beer order in Spain |
| vino tinto | el | red wine | 레드 와인 | tinto for wine, never rojo |
| zumo | el | juice | 주스 | jugo across most of Latin America |
| café con leche | el | coffee with milk | 밀크 커피 | the standard morning coffee |
| tapas | las | a small plate of food | 작은 안주 한 접시 | ordered a few at a time alongside drinks — English borrowed the word unchanged |
| ración | la | a portion | 한 접시 분량 | the same food as a tapa, plate-sized and meant for the table to share |
| pan | el | bread | 빵 |  |
| tortilla | la | Spanish omelette | 감자 오믈렛 | potato and egg — not the Mexican flatbread |
| jamón | el | cured ham | 하몽 |  |
| patata | la | potato | 감자 | papa across most of Latin America |
| pollo | el | chicken | 닭고기 |  |
| ternera | la | beef | 소고기 |  |
| pescado | el | fish | 생선 | the fish you eat — el pez is the one still swimming |
| gambas | las | prawns | 새우 |  |
| ensalada | la | salad | 샐러드 |  |
| picante |  | spicy | 매운 |  |
| sin |  | without | ~ 빼고, ~ 없이 | sin cebolla, sin gluten — the word an allergy depends on |
| soy alérgico a |  | I'm allergic to | ~ 알레르기가 있어요 | alérgica if you are a woman |
| ¿me pone una caña? |  | could I have a small beer? | 생맥주 한 잔 주세요 | the frame every bar in Spain runs on — swap in anything |
| para mí |  | for me | 저는 ~로 할게요 | how you claim your dish when the waiter goes round the table |
| para llevar |  | to take away | 포장이요 |  |
| cuenta | la | the bill | 계산서 | la cuenta, por favor |

### Cómo llegar — 길 찾기 (28)

_Ask with `¿dónde está…?` and you will be answered in these words. `todo recto`
is Spain's "straight on"; elsewhere it is `derecho`, which collides with
`derecha` at exactly the wrong moment._

| entry | gender | English back | Korean back | when it means (context hint) |
|---|---|---|---|---|
| ¿dónde está el baño? |  | where is the toilet? | 화장실이 어디에 있어요? | learn it whole and swap the noun — ¿dónde está la estación? |
| ¿cómo llego al centro? |  | how do I get to the centre? | 시내에 어떻게 가요? | al before a masculine noun, a la before a feminine one |
| ¿está lejos? |  | is it far? | 멀어요? |  |
| cerca |  | near | 가까이 |  |
| lejos |  | far | 멀리 |  |
| a la derecha |  | on the right | 오른쪽에 |  |
| a la izquierda |  | on the left | 왼쪽에 |  |
| todo recto |  | straight ahead | 쭉 직진 | Spain's form — derecho elsewhere, which sounds like derecha |
| calle | la | the street | 거리, 길 |  |
| plaza | la | the square | 광장 |  |
| esquina | la | the corner | 모퉁이 | where two streets meet — en la esquina |
| manzana | la | the block | 한 블록 | a block of buildings; the same word as apple |
| cruce | el | the crossroads | 교차로 |  |
| semáforo | el | the traffic light | 신호등 |  |
| paso de peatones | el | the pedestrian crossing | 횡단보도 |  |
| acera | la | the pavement | 인도, 보도 |  |
| parada | la | the stop | 정류장 | where a bus or tram stops |
| estación | la | the station | 역 |  |
| metro | el | the underground | 지하철 |  |
| autobús | el | the bus | 버스 |  |
| coger |  | to catch, to take | (교통편을) 타다 | coger el autobús — ordinary in Spain, vulgar in much of Latin America |
| billete | el | the ticket | 표, 승차권 | boleto across most of Latin America |
| barrio | el | the neighbourhood | 동네 |  |
| ascensor | el | the lift | 엘리베이터 |  |
| planta baja | la | the ground floor | 1층 | Spain's ground floor — la primera planta is Korea's 2층 |
| servicios | los | the toilets | 화장실 | what the sign in a bar says; el baño at home |
| seguir |  | to carry on, to keep going | 계속 가다 | siga todo recto — carry straight on |
| cruzar |  | to cross | 건너다 | cruzar la calle |

### Verbos que usarás cada día — 매일 쓰는 동사 (32)

_Infinitives, and four pairs that English merges into one word each: `ser`/`estar`,
`saber`/`conocer`, `pedir`/`preguntar`, `hablar`/`decir`. Those eight are what
this section is really for — the other twenty-four are the frame they hang in.
`girar`, `seguir` and `cruzar` are in the directions section instead._

| entry | gender | English back | Korean back | when it means (context hint) |
|---|---|---|---|---|
| ser |  | to be (what something is) | ~이다 | what something *is* — identity, origin, profession: soy coreano |
| estar |  | to be (where or how it is) | ~에 있다, (상태가) ~하다 | where something is and how it is right now: estoy cansado |
| tener |  | to have | 가지고 있다 | also age and hunger — tengo treinta años, tengo hambre |
| hacer |  | to do, to make | 하다, 만들다 |  |
| ir |  | to go | 가다 |  |
| venir |  | to come | 오다 |  |
| querer |  | to want | 원하다 | quiero un café is the plainest way to ask for anything |
| poder |  | to be able to | ~할 수 있다 | ¿puedo…? is how you ask permission |
| saber |  | to know (a fact, a skill) | (사실을) 알다 | facts and skills — sé nadar, no sé |
| conocer |  | to know (a person, a place) | (사람·장소를) 알다 | people and places you have met or been to — conozco Madrid |
| hablar |  | to speak | 말하다, 이야기하다 | the act of speaking — hablo español |
| decir |  | to say, to tell | (무엇을) 말하다 | what you say, not that you speak — dice que sí |
| entender |  | to understand | 이해하다 |  |
| necesitar |  | to need | 필요하다 |  |
| comprar |  | to buy | 사다 |  |
| pagar |  | to pay | 지불하다, 계산하다 |  |
| costar |  | to cost | (값이) 나가다 | ¿cuánto cuesta? — how much is it |
| comer |  | to eat | 먹다 |  |
| beber |  | to drink | 마시다 |  |
| vivir |  | to live | 살다 |  |
| trabajar |  | to work | 일하다 |  |
| estudiar |  | to study | 공부하다 |  |
| aprender |  | to learn | 배우다 |  |
| leer |  | to read | 읽다 |  |
| escribir |  | to write | 쓰다 |  |
| ver |  | to see | 보다 |  |
| esperar |  | to wait, to hope | 기다리다, 바라다 | one verb for both — espero el autobús, espero que sí |
| llegar |  | to arrive | 도착하다 |  |
| salir |  | to leave, to go out | 나가다, 출발하다 |  |
| volver |  | to come back | 돌아오다, 돌아가다 |  |
| pedir |  | to ask for, to order | 주문하다, 부탁하다 | you ask *for a thing* — pedir la cuenta |
| preguntar |  | to ask | 묻다, 질문하다 | you ask *a question* — preguntar la hora |
