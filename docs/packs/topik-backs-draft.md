# TOPIK 고급 Pack — Card Backs, Draft for Review

**What this is:** an English back for each of the 160 words in
`TOPIK_ADVANCED_PACK` (`packages/core/src/topik.ts`). Authored by hand and
submitted for approval before it lands in source — the same gate the word list
went through in [topik-pack-draft.md](topik-pack-draft.md).

**English only, deliberately.** `buildPackCardDraft` writes the study side last
so it wins, and on a Korean pack the study side *is* the `korean` slot. An
authored Korean back would be overwritten the moment the card saved and could
never be read. Only the English side survives, so only the English side exists
here. (The TOEIC pack is the mirror image — Korean backs only. See
[toeic-backs-draft.md](toeic-backs-draft.md).)

**The tension worth naming up front.** This pack's own header argues these are
words where "a one-word English gloss is not enough" — 여건 and 취지 are named
as examples. Writing 160 one-line English backs is in obvious tension with that.
My resolution: **the back is a seed, not the finished card.** It exists so the
word can be bulk-saved and reviewed at all, and every card can be deepened on
demand from the deck, the card list, or mid-review — which is the half of this
redesign that makes a short gloss acceptable rather than a retreat. If you don't
buy that, the alternative is that this pack keeps needing a model call per word
before it can enter review, which is the status quo we are removing.

**Gloss rule:** one gloss by default, a second after a comma only where one
would mislead. Verbs are glossed with `to`, adjectives with `to be` — Korean
descriptive verbs are not English adjectives, and glossing 미미하다 as
"negligible" quietly teaches the wrong part of speech.

---

## ⚠️ Review these first — near-synonyms I had to split

Korean has denser synonym clusters at this register than the TOEIC list did, and
back-to-front review breaks when two cards share a back. Each split below leans
on a real distinction, but these are judgement calls and the ones most worth
overruling.

| cluster | splits I chose | the distinction being leaned on |
|---|---|---|
| 초래하다 / 야기하다 / 유발하다 | to bring about / to give rise to / to trigger, to induce | 초래 tends to a bad outcome, 야기 is neutral emergence, 유발 is a direct trigger |
| 추세 / 경향 / 성향 | trend / tendency / disposition, temperament | 추세 moves over time, 경향 is a general leaning, 성향 belongs to a person |
| 오히려 / 도리어 | rather, instead / contrary to expectation | genuinely close; 도리어 carries more reversal-of-expectation |
| 비로소 / 마침내 | only then / finally, in the end | 비로소 needs a prior enabling condition, 마침내 just needs an end |
| 무분별하다 / 무모하다 | to be indiscriminate / to be reckless, to be foolhardy | 무분별 is doing it without discrimination, 무모 is without regard for risk |
| 대책 / 방안 | countermeasure / proposed measure, plan | 대책 answers a problem, 방안 is a proposal |

**오히려 / 도리어 is the one I am least confident in.** They are close enough
that a native would use either in many sentences. If you would rather not carry
both, dropping 도리어 from the word list is cleaner than forcing a distinction
the language does not really make — but that is a word-list edit, which is yours.

---

## 1. 시사·사회 — current affairs & society (30)

| word | hint | English back |
|---|---|---|
| 격차 | | gap, disparity |
| 양극화 | | polarization |
| 고령화 | | population ageing |
| 저출산 | | low birth rate |
| 복지 | | welfare |
| 정책 | | policy |
| 규제 | | regulation |
| 여론 | | public opinion |
| 물가 | the general level of prices | consumer prices |
| 경기 | the state of the economy, not a sports match | economic conditions |
| 침체 | | slump, stagnation |
| 실업률 | | unemployment rate |
| 고용 | | employment |
| 소비 | | consumption |
| 유통 | | distribution |
| 수요 | | demand |
| 공급 | | supply |
| 부작용 | | side effect |
| 실태 | | the actual state of things |
| 추세 | | trend |
| 현황 | | current status |
| 대책 | | countermeasure |
| 방안 | | proposed measure, plan |
| 논란 | | controversy |
| 우려 | | concern |
| 갈등 | | conflict |
| 훼손 | damage to what should have been kept intact | damage, degradation |
| 자원 | natural or human resources, not volunteering | resources |
| 차별 | | discrimination |
| 소외 | | alienation, marginalization |

## 2. 추상 개념 — the nouns an argument is built from (30)

| word | hint | English back |
|---|---|---|
| 인식 | | perception, awareness |
| 관점 | | perspective, viewpoint |
| 편견 | | prejudice |
| 근거 | | grounds, basis |
| 요인 | | factor |
| 여건 | | conditions, circumstances |
| 취지 | | the intent behind something |
| 성향 | | disposition, temperament |
| 경향 | | tendency |
| 역량 | | capability, competence |
| 자질 | | qualities, aptitude |
| 잠재력 | | potential |
| 효율 | | efficiency |
| 배려 | | consideration for others |
| 성찰 | | self-reflection |
| 의의 | the significance of something, as in 역사적 의의 | significance |
| 전제 | a premise or precondition that something rests on | premise, precondition |
| 맥락 | | context |
| 측면 | | aspect |
| 속성 | an inherent property or attribute | inherent property |
| 비중 | the proportion or share something accounts for | proportion, weight |
| 수단 | | means, method |
| 기준 | | standard, criterion |
| 지표 | an indicator or index, as in 경제 지표 | indicator |
| 대안 | | alternative |
| 한계 | | limit |
| 모순 | | contradiction |
| 타당성 | | validity |
| 균형 | | balance |
| 정서 | shared feeling or sentiment, as in 국민 정서 | shared sentiment |

**여건 and 취지 are the two the pack header names** as words with no usable
one-word gloss, and I think the header is right about them. "conditions,
circumstances" does not distinguish 여건 from 상황, and "the intent behind
something" is a definition wearing a gloss's clothes. They are the clearest case
for the seed-not-finished-card framing above: both are worth deepening the first
time you meet them in review.

## 3. 고급 동사 (40)

| word | hint | English back |
|---|---|---|
| 초래하다 | | to bring about, to result in |
| 야기하다 | | to give rise to |
| 유발하다 | | to trigger, to induce |
| 좌우하다 | | to determine, to decide the outcome of |
| 도모하다 | | to seek to promote |
| 모색하다 | | to explore a way forward |
| 시사하다 | | to suggest, to imply |
| 감안하다 | | to take into account |
| 부각되다 | | to come to the fore |
| 대두되다 | | to emerge as an issue |
| 급증하다 | | to surge |
| 완화하다 | | to ease, to relax |
| 촉진하다 | | to promote, to accelerate |
| 억제하다 | | to curb, to suppress |
| 반영하다 | | to reflect |
| 지속되다 | | to continue, to persist |
| 위축되다 | | to shrink, to contract |
| 정착하다 | | to take root, to settle |
| 도입하다 | | to introduce, to adopt |
| 확산되다 | | to spread |
| 추진하다 | | to push forward |
| 보완하다 | | to supplement, to make up for |
| 축소하다 | | to reduce, to scale down |
| 미치다 | to reach or have an effect on — not "to go crazy" | to reach, to have an effect on |
| 차지하다 | to occupy or account for a share | to account for, to occupy |
| 밝히다 | to state or reveal something officially | to state officially, to reveal |
| 살피다 | to examine something carefully | to examine closely |
| 다루다 | to handle or deal with a topic or an issue | to deal with, to cover |
| 꼽히다 | to be named or counted as | to be named as, to be counted among |
| 치르다 | to hold or go through an event, or to pay a price | to hold an event, to pay a price |
| 겪다 | | to go through, to undergo |
| 이루어지다 | | to take place, to consist of |
| 마련하다 | to arrange or put something in place | to put in place, to arrange |
| 기여하다 | | to contribute |
| 극복하다 | | to overcome |
| 지적하다 | | to point out |
| 촉구하다 | | to urge, to call for |
| 뒷받침하다 | | to back up with evidence |
| 헤아리다 | | to fathom, to be considerate of |
| 아우르다 | | to encompass, to bring together |

`이루어지다` keeps two glosses because its two senses are unrelated and both are
high-frequency at this level — 행사가 이루어지다 and 세 부분으로 이루어지다.
Same reasoning as `치르다`, where the hint already names both.

## 4. 형용사·묘사 (20)

Glossed as "to be X" throughout. These are 형용사 in Korean grammar but they
conjugate as predicates, and a learner who files 미미하다 as the English
adjective "negligible" will write 미미한 것이 있다 and not know why it is wrong.

| word | hint | English back |
|---|---|---|
| 뚜렷하다 | | to be clear, to be distinct |
| 미미하다 | | to be negligible |
| 막대하다 | | to be enormous |
| 무분별하다 | | to be indiscriminate |
| 사소하다 | | to be trivial |
| 원활하다 | | to go smoothly |
| 저조하다 | | to be poor, to be sluggish |
| 활발하다 | | to be active, to be lively |
| 두드러지다 | | to stand out, to be marked |
| 불가피하다 | | to be unavoidable |
| 바람직하다 | | to be desirable |
| 부당하다 | | to be unjust |
| 타당하다 | | to be valid, to be reasonable |
| 모호하다 | | to be ambiguous |
| 절실하다 | | to be urgently needed |
| 냉정하다 | | to be cool-headed, to be cold |
| 까다롭다 | | to be picky, to be demanding |
| 번거롭다 | | to be troublesome |
| 무모하다 | | to be reckless, to be foolhardy |
| 지나치다 | to be excessive — the same form also means "to pass by" | to be excessive |

## 5. 부사·연결 표현 (20)

The hardest section to gloss, because most of these do not translate to a word
— they translate to a position in an argument. Several backs below are short
phrases rather than single words, which is the honest form.

| word | hint | English back |
|---|---|---|
| 오히려 | | rather, instead |
| 비로소 | only then, after something finally made it possible | only then |
| 굳이 | | going out of one's way to |
| 어차피 | | in any case, either way |
| 좀처럼 | hardly ever — used with a negative ending | hardly ever |
| 자칫 | at the slightest slip, usually followed by -(으)면 | one slip and, all too easily |
| 하물며 | | let alone, much less |
| 도리어 | | contrary to expectation |
| 이왕이면 | | if you're going to do it at all |
| 마침내 | | finally, in the end |
| 새삼 | | anew, all over again |
| 무려 | as many as — marking a number as surprisingly large | as many as, no less than |
| 다만 | however, adding one qualification | however, with one qualification |
| 아울러 | | in addition, together with |
| 나아가 | furthermore, extending the point to something broader | furthermore, going further |
| 반면 | on the other hand — the connective 반면(에) | on the other hand, whereas |
| 이에 따라 | accordingly, as a consequence of what was just stated | accordingly, as a result |
| 이른바 | | so-called |
| 이를테면 | | for instance, so to speak |
| 심지어 | | even, going so far as |

**`좀처럼` needs its hint to survive onto the card.** The gloss "hardly ever"
hides that it is ungrammatical without a negative ending — 좀처럼 간다 is wrong.
This is the clearest case in the pack for carrying `context` through to the saved
card rather than dropping it at save time.

## 6. 관용 표현·사자성어 (20)

| word | hint | English back |
|---|---|---|
| 발이 넓다 | idiom: to know a lot of people | to know a lot of people |
| 손을 떼다 | idiom: to stop being involved in something | to wash one's hands of something |
| 눈치를 보다 | idiom: to read someone else's mood before acting | to read the room before acting |
| 어깨가 무겁다 | idiom: to feel the weight of a responsibility | to feel the weight of responsibility |
| 입이 무겁다 | idiom: to be good at keeping a secret | to be good at keeping secrets |
| 발목을 잡다 | idiom: to hold something back from progressing | to hold something back |
| 진땀을 흘리다 | idiom: to sweat through a difficult situation | to sweat through a difficult situation |
| 한 술 더 뜨다 | idiom: to go a step further, usually for the worse | to go one step further, for the worse |
| 눈코 뜰 새 없다 | idiom: to be far too busy to spare a moment | to be far too busy to spare a moment |
| 귀가 얇다 | idiom: to be easily persuaded by what others say | to be easily swayed |
| 배가 아프다 | idiom: to be envious of someone else's good fortune | to be envious of someone's good fortune |
| 코가 납작해지다 | idiom: to be humbled after having been arrogant | to be taken down a peg |
| 이심전심 | 사자성어: understanding each other without words | understanding without words |
| 설상가상 | 사자성어: one misfortune on top of another | one misfortune on top of another |
| 자업자득 | 사자성어: reaping the results of your own doing | reaping what you sow |
| 유유상종 | 사자성어: like gathers with like | birds of a feather flock together |
| 일석이조 | 사자성어: two birds with one stone | two birds with one stone |
| 반신반의 | 사자성어: half believing, half doubting | half believing, half doubting |
| 우유부단 | 사자성어: chronically indecisive | chronically indecisive |
| 어부지리 | 사자성어: a third party profiting while two others fight | profiting while two others fight |

**A question this section raises.** For eight of these the back and the hint are
now the same sentence, because an idiom's context hint always *was* its meaning
— the hint existed to stop Gemini explaining 발이 넓다 as a remark about feet.
Three options: drop the hint on entries where the back says the same thing; keep
both and accept the duplication; or shorten these backs to an English idiom
(손을 떼다 → "to wash one's hands of") and let the hint carry the plain reading.
**I have kept both**, on the grounds that the duplication costs nothing at save
time and the hint still does real work on the enrichment call. Say if you'd
rather it were deduplicated.

---

## Counts

| section | words |
|---|---|
| 1. 시사·사회 | 30 |
| 2. 추상 개념 | 30 |
| 3. 고급 동사 | 40 |
| 4. 형용사·묘사 | 20 |
| 5. 부사·연결 표현 | 20 |
| 6. 관용 표현·사자성어 | 20 |
| **total** | **160** |

Matches `TOPIK_ADVANCED_PACK.words.length`. The six sections already exist in the
source as comments; the conversion turns them into real data, which is what makes
per-section enrolment possible — 160 words become six sittings of 20–40.
