# TOEIC Pack — Card Backs, Draft for Review

**What this is:** a Korean back for each of the 133 words in `TOEIC_PACK`
(`packages/core/src/packs.ts`). Authored by hand, submitted for approval before
it goes into the source — same gate the word list itself went through in
[toeic-pack-draft.md](toeic-pack-draft.md).

**Why now:** the pack is being converted from a `lookup` pack to a pre-authored
one. Without backs there is nothing to bulk-write, so these 133 glosses are the
blocker for section enrolment, drill, and review on this pack.

**Korean only, deliberately.** `buildPackCardDraft` writes `english` and
`korean` and then writes the study side last so it wins. On an English pack the
study side *is* the `english` slot, so an authored English back is overwritten
the moment it is saved — it could never be read. Only the Korean side survives,
so only the Korean side is authored.

**Gloss rule** (from the card-back convention): one gloss by default, a second
after a comma only where one would mislead. Never three. A parenthesised
qualifier is not a second gloss — `(비용을) 충당하다` is one gloss with its
argument named.

**Context-hinted words are glossed to the hinted sense only.** Where the pack
carries a `context`, that hint is the whole reason the word is in the list, and
a gloss of the everyday sense would make the card wrong. Those rows show the
hint so you can check the gloss against it.

---

## ⚠️ Review these first — collisions I resolved by hand

Six pairs would otherwise have landed on the same Korean back. That matters more
than it looks: review runs back-to-front as well as front-to-back, so two cards
sharing a back make that direction unanswerable — you are shown 연기하다 and
cannot know whether it wants `defer` or `postpone`. Each pair below is split on
a real distinction in the English, not padded to look different. **These are the
rows most worth disagreeing with.**

| pair | split I chose | the distinction being leaned on |
|---|---|---|
| defer / postpone | (결정·지급을) 미루다 / (일정을) 연기하다 | `defer` is usually a decision or a payment; `postpone` is an event on a calendar |
| comply / adhere | 준수하다, 따르다 / (규정·원칙을) 고수하다 | `adhere to` carries continued commitment, `comply with` a single act of obeying |
| feasible / viable | 실현 가능한 / (사업이) 성공 가능한 | `feasible` = can be done at all; `viable` = can survive once done |
| bill / invoice | 청구서 / 송장, 거래 명세서 | `bill` is what you are asked to pay; `invoice` is the itemised trade document |
| stock / inventory | 재고 / 재고 목록, 재고 조사 | `stock` is the goods; `inventory` is the count of them |
| estimate / quotation | 견적을 내다, 추산하다 / 견적서 | verb vs. the document; `estimate` also carries the non-commercial "추산" sense |

---

## 1. Core business verbs (45)

| word | hint | Korean back |
|---|---|---|
| comply | | 준수하다, 따르다 |
| accommodate | | 수용하다 |
| facilitate | | 촉진하다 |
| expedite | | 신속히 처리하다 |
| allocate | | 배정하다, 할당하다 |
| implement | | 시행하다 |
| reimburse | | 환급하다 |
| delegate | | 위임하다 |
| streamline | | 간소화하다 |
| consolidate | | 통합하다 |
| designate | | 지정하다 |
| waive | | 면제하다 |
| incur | | (비용·손실을) 초래하다 |
| adhere | | (규정·원칙을) 고수하다 |
| rectify | | 바로잡다 |
| compensate | | 보상하다 |
| authorize | | 승인하다, 권한을 주다 |
| anticipate | | 예상하다 |
| defer | to postpone to a later time | (결정·지급을) 미루다 |
| solicit | | (의견·후원을) 요청하다 |
| assess | | 평가하다 |
| conduct | to carry out, as in conduct a survey | (조사·업무를) 실시하다 |
| deduct | | 공제하다 |
| dismiss | | 해고하다, 기각하다 |
| enclose | | 동봉하다 |
| enroll | | 등록하다 |
| estimate | | 견적을 내다, 추산하다 |
| fulfill | | (조건·주문을) 이행하다 |
| itemize | | 항목별로 명세하다 |
| jeopardize | | 위태롭게 하다 |
| justify | | 정당화하다 |
| nominate | | 지명하다 |
| notify | | 통지하다 |
| postpone | | (일정을) 연기하다 |
| prohibit | | 금지하다 |
| pursue | | 추진하다, 추구하다 |
| renovate | | 개조하다, 보수하다 |
| restructure | | 구조조정하다 |
| retain | | 보유하다, 유지하다 |
| revise | | 수정하다 |
| submit | | 제출하다 |
| supervise | | 감독하다 |
| terminate | | (계약을) 종료하다 |
| verify | | 확인하다, 검증하다 |
| withdraw | | (돈을) 인출하다, 철회하다 |

`dismiss` and `withdraw` each take two glosses because the two senses are both
squarely TOEIC — 해고/기각 and 인출/철회 — and picking one would leave the other
reading as a wrong answer in review.

## 2. Familiar words, second meanings (30)

Every row here is context-hinted, because the hint *is* the entry: the everyday
sense of these words is not what is being taught. **The gloss must match the
hint column, never the common meaning** — `fine` here is 벌금, not 좋은.

| word | hint | Korean back |
|---|---|---|
| address | to deal with a problem or issue | (문제를) 다루다, 해결하다 |
| outstanding | unpaid, as in an outstanding invoice | 미지급의 |
| issue | to officially give out, as in issue a refund | (공식적으로) 발급하다 |
| cover | to substitute for someone or pay for a cost | 대신하다, (비용을) 충당하다 |
| meet | to satisfy, as in meet a deadline or requirement | (기한·조건을) 충족하다 |
| run | to operate or manage, as in run a business | 운영하다 |
| fine | a penalty payment | 벌금 |
| book | to reserve, as in book a room | 예약하다 |
| field | to handle, as in field questions | (질문을) 처리하다 |
| party | a person or group in a contract | (계약) 당사자 |
| interest | money charged on a loan | 이자 |
| balance | the remaining amount of money in an account | 잔액 |
| figure | a number or amount | 수치 |
| term | a condition of a contract, or a period of time | (계약) 조건, 기간 |
| charge | to bill money for something | 청구하다 |
| file | to formally submit, as in file a complaint | (서류를) 제출하다, 접수하다 |
| draft | a preliminary version of a document | 초안 |
| board | a group of company directors | 이사회 |
| subject | subject to — affected by or dependent on | ~의 적용을 받는, ~을 조건으로 하는 |
| practice | a usual way of doing things | 관행 |
| bill | a request for payment | 청구서 |
| claim | to request something you are owed | (보험금을) 청구하다 |
| notice | a formal announcement, as in give two weeks' notice | (사전) 통보 |
| raise | an increase in pay | 임금 인상 |
| yield | to produce a result or profit | (수익을) 내다, 산출하다 |
| stock | goods kept on hand | 재고 |
| firm | a company | 회사 |
| branch | a local office of a company | 지점 |
| commission | money earned per sale | 수수료 |
| shift | a scheduled work period | 교대 근무 |

**One I am least sure of: `subject`.** It is the only entry in the pack that is
not a word but a construction — `subject to` — and `~의 적용을 받는` is a gloss
of the phrase, not of the headword. The three ways out are to reword the entry
as `subject to`, to accept the mismatch, or to drop it. I have left it as-is
pending your call; changing the study side is a word-list edit, which is yours.

**`claim` and `charge`** are glossed to the verb sense the hint names, so both
land on 청구하다 with different arguments. They do not collide the way the pairs
above do — 보험금을 청구하다 and 요금을 청구하다 are genuinely the same Korean
verb — but if you would rather they were separated, `claim` can go to
(보상을) 청구하다.

## 3. Nuanced adjectives (35)

| word | hint | Korean back |
|---|---|---|
| tentative | | 잠정적인 |
| feasible | | 실현 가능한 |
| adjacent | | 인접한 |
| adequate | | 적절한, 충분한 |
| ambiguous | | 모호한 |
| arbitrary | | 자의적인, 임의의 |
| coherent | | 일관성 있는 |
| comprehensive | | 종합적인, 포괄적인 |
| consistent | | 일관된 |
| crucial | | 결정적인, 매우 중요한 |
| deliberate | intentional, done on purpose | 의도적인 |
| eligible | | 자격이 있는 |
| explicit | | 명시적인 |
| inevitable | | 불가피한 |
| plausible | | 그럴듯한 |
| pragmatic | | 실용적인 |
| prevalent | | 만연한 |
| subtle | | 미묘한 |
| viable | | (사업이) 성공 가능한 |
| vulnerable | | 취약한 |
| mandatory | | 의무적인 |
| compatible | | 호환되는 |
| durable | | 내구성 있는 |
| defective | | 결함이 있는 |
| hazardous | | 위험한 |
| redundant | | 불필요한, 중복되는 |
| thorough | | 철저한 |
| pending | | 미결인, 계류 중인 |
| preliminary | | 예비의 |
| subsequent | | 그 이후의 |
| applicable | | 해당되는, 적용되는 |
| confidential | | 기밀의 |
| overdue | | 기한이 지난 |
| prompt | quick and on time | 신속한 |
| complimentary | free of charge | 무료의 |

`coherent` (일관성 있는) and `consistent` (일관된) sit closer than I would like.
They are not a review collision — the two Korean forms are distinguishable — but
if you want them further apart, `coherent` can go to 논리 정연한, which is the
sharper reading of the English anyway.

## 4. Workplace & procedure nouns (23)

| word | hint | Korean back |
|---|---|---|
| invoice | | 송장, 거래 명세서 |
| itinerary | | 여행 일정표 |
| inventory | | 재고 목록, 재고 조사 |
| warranty | | 품질 보증서 |
| grievance | | (직장 내) 고충, 불만 |
| incentive | | 장려금 |
| expenditure | | 지출 |
| liability | | 법적 책임, 부채 |
| dividend | | 배당금 |
| quotation | | 견적서 |
| remittance | | 송금 |
| subsidiary | | 자회사 |
| takeover | | 기업 인수 |
| vacancy | | 공석, 결원 |
| venue | | 행사 장소 |
| patent | | 특허 |
| lease | | 임대차 계약 |
| mortgage | | 주택 담보 대출 |
| surcharge | | 추가 요금 |
| backlog | | 밀린 일, 미처리 물량 |
| turnover | the rate of employees leaving, or total sales | 이직률, 총매출 |
| proceeds | money from a sale or event | 수익금 |
| premises | a company's building and land | (회사) 부지, 건물 |

`incentive` is glossed 장려금 rather than 인센티브. The loanword is what a Korean
office actually says, but it teaches nothing — a learner who reads 인센티브 has
been handed the English word back in Hangul. Say the word if you would rather
have the natural one.

`turnover` keeps both glosses because the hint names both senses and they are
unrelated (이직률 vs 총매출); dropping either would make half the TOEIC uses of
the word read as wrong.

---

## Counts

| section | words |
|---|---|
| 1. Core business verbs | 45 |
| 2. Familiar words, second meanings | 30 |
| 3. Nuanced adjectives | 35 |
| 4. Workplace & procedure nouns | 23 |
| **total** | **133** |

Matches `TOEIC_PACK.words.length`. These four sections already exist in the
source as comments; the conversion turns them into real data, which is what
makes per-section enrolment possible.

## What happens to these once approved

Each row becomes a `PackEntry` — `{ study, back, context? }` — and the `context`
column survives onto the saved card as `briefDefinition`. That last part is not
cosmetic: `/api/explain/depth` and `/api/explain/examples` take
`briefDefinition` to pin which sense they are explaining, so without it, asking
for depth on `fine` returns a paragraph about quality rather than penalties.
