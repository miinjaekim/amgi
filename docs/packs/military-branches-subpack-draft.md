# 병과와 주특기 / Branches and specialties — Subpack Draft for Review

**Word list approved by the user 2026-09-09**, the gate every pack goes through.
The open items below are unchanged by that: the US branch names still rest on one
source family, the 군수과 conflict is still unsettled, and 인사과's hint still
says "until recently" where a date belongs. Approval was of the list, not of
those.

**What this is.** A new section inside the existing
[군사용어 — 부대·참모](military-unit-pack-draft.md) pack — `branches`, 24 pairs,
placed third, after 계급·호칭 and 부대·편제. Not a pack of its own: the branch a
soldier belongs to is the third question a US counterpart asks, after what unit
and what rank, and both of those already live in this pack. It runs in both
directions with the rest of the pack, and is a subpack a learner can enrol,
drill and review on its own.

**Section name.** **Branches and specialties** in an English UI, **병과와 주특기**
in a Korean one. Both sides are picked from a list without the pack description
in front of them, so both have to be true on their own.

**What it covers.** The branch system (병과 vs 주특기 and the words that
distinguish them), the branches an interpreter actually meets, and the two words
for the job the reader most likely holds — 어학병 and 통역병.

**Scope, deliberately.** This was first drafted as a whole 66-entry pack with
the full statutory inventory of all four services, the 병무청 specialty list and
a traps section. **That was too much for what this is**, and the cut is the
user's: a subpack of the most common terms rather than a fourth deck. What
survives is the material an interpreter meets in a working week; what was cut is
listed at the bottom, so a later expansion starts from the research rather than
from scratch.

---

## Three calls this draft is making

### 1. It covers **both** 병과 and 주특기, and says which is which

They are not the same thing:

- **병과** is the corps you are commissioned or assigned into and stay in — 보병과,
  정보통신과, 병참과. The statute fixes the inventory (「군인사법」 제5조).
- **주특기** is the specific job inside it, carried as a number.

US **"MOS" maps to 주특기, not to 병과** — the US Army keeps the same split under
different words, where an officer *branches* Infantry and then holds an MOS
inside that. So both are entries, adjacent, each with a hint pointing at the
other. Anyone who renders 병과 as "MOS" has said the wrong one of the two.

### 2. Branch entries use the statutory 「-과」 form: 보병과, not 보병

The statute names them that way — 「보병과, 기갑과, 포병과…」 — so the form is
sourced rather than invented, and it is unambiguous: 보병과 can only be the
branch, where 보병 is also just "the infantry" as an arm.

And the bare forms are **already cards in this same pack**: 보병/infantry and
방공/air defense in §8, 수송/transportation and 보급/supply in §7,
화생방/CBR in 안보·정세, 군사경찰/military police in §10. A section that repeated
them would put two cards with the same front, and two with the same answer, into
one review queue — which `military-packs.test.ts` refuses across both packs in
both directions, and rightly.

The English side follows the same rule: **Infantry Branch**, not *infantry*;
**Transportation Corps**, not *transportation*. Which is also how the US Army
writes its own branch names.

⚠️ **This is the call most worth a reviewer's disagreement.** 보병과 is the legal
register; a soldier asked their 병과 answers "보병".

### 3. The back is the **US counterpart branch**, and the hint carries the official English when they differ

법제처's English translation of 군인사법 is an official source and is not usable
as a card back on its own. It renders 병참과 as "logistics" — which in the ROK
Army is a different branch, 군수과 — and 부관과, the old name for 인사과, as
"aide-de-camp", which is a person rather than a branch. An interpreter who says
those has said something true of the statute and wrong in the room.

So the back is the name a US listener actually uses, and where the official
English differs the hint says so. **That is the whole reason this section is
worth having**; a bare bilingual list of branch names would be a chart someone
could already find.

---

## Sourcing

Per [README.md](README.md): **A** two independent sources agree, **B** one
source, **C** no source (cut), **D** derived from a sourced stem plus a sourced
rule. Of 24 entries: **7 A, 16 B, 1 D, no C.**

| tag | source | what it gives | rank |
|---|---|---|---|
| `법령` | 「군인사법」 제5조·「군인사법 시행령」 제2조의2, quoted in full by 법제처 [찾기쉬운 생활법령정보](https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=843&ccfNo=1&cciNo=1&cnpClsNo=2) | the current branch inventory | statute via a government publication — top |
| `영문법령` | 법제처 Korea Law Translation Center, [*Military Personnel Management Act*](https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=24047), Act No. 11390 (21 Mar 2012), Art. 5 | the **official** English for each branch | official translation, but **fourteen years old** and pre-dating four renames |
| `위키(한)` | ko.wikipedia [「대한민국의 병과」](https://ko.wikipedia.org/wiki/대한민국의_병과) | the inventory again, grouped 전투/기술/행정 | community wiki — corroboration only |
| `USArmy` | en.wikipedia [「United States Army branch insignia」](https://en.wikipedia.org/wiki/United_States_Army_branch_insignia), cross-read with [Category:Branches of the United States Army](https://en.wikipedia.org/wiki/Category:Branches_of_the_United_States_Army) | the US branch names as written | community wiki — see the warning below |
| `병무청` | [병무청 모집안내](https://www.mma.go.kr/contents.do?mc=mma0000522) — 육군 어학병 | the 어학병/통역병 naming | government — **but see below** |
| `특기번호` | ko.wikipedia [「주특기번호」](https://ko.wikipedia.org/wiki/주특기번호) | 주특기 as a numbered job | community wiki |

⚠️ **`USArmy` is one source, not two.** Two Wikipedia pages that agree are one
source family agreeing with itself — the self-consistency trap the standard
names. Every US branch name below is therefore **B**, never A, unless the
official Korean translation independently gives the same head noun. **A reviewer
with DA PAM 600-3 can lift most of this table to A**, and that is the single
highest-value thing anyone can do to this file.

⚠️ **`병무청` did not load.** mma.go.kr refused a direct fetch; its content was
read out of search results quoting the page.

**Conflict recorded, not resolved.** On 군수과: 「군인사법 시행령」 as quoted by
easylaw lists 병기과, 병참과, 수송과 **and** 군수과 as four separate branches,
while secondary accounts describe 병기·병참·수송 as having been *merged into*
군수 in 2014. The entry's hint takes the statute's side — 군수과 sits over
branches that still exist — because the statute is the better source. **A
reviewer should settle it.**

**Currency.** 군사경찰과 was 헌병과 until 2020; 인사과 was 부관과; 재정과 was
경리과; 정훈과 was 공보정훈과 between 2019 and 2024. Older glossaries — and the
official English translation above — carry the old names.

---

## The list

| 한국어 | English | tier | source | context hint |
|---|---|---|---|---|
| 병과 | branch | A | 법령 / 영문법령 "branch" · USArmy | the corps you belong to for a career — not the job you do today |
| 주특기 | primary military occupational specialty (MOS) | B | 특기번호 | the specific job inside a branch — US "MOS" maps to this, never to 병과 |
| 기본병과 | basic branch | A | 법령 / 영문법령 "basic branches" | the ones anyone can be assigned to |
| 특수병과 | special branch | A | 법령 / 영문법령 "special branches" | medicine, law and the chaplaincy — entered with a civilian qualification |
| 전과 | branch transfer | D | 법령 (병과) + 전(轉) | moving to another branch — approved, not chosen |
| 보병과 | Infantry Branch | A | 법령 · 위키(한) / 영문법령 "Infantry" · USArmy | the branch — 보병 on its own is the arm |
| 기갑과 | Armor Branch | A | 법령 · 위키(한) / 영문법령 "armor" · USArmy | |
| 포병과 | Field Artillery Branch | B | 법령 · 위키(한) / USArmy | the US splits artillery in two and this is the field half — say "field", or a US listener hears air defense as well |
| 방공과 | Air Defense Artillery Branch | B | 법령 · 위키(한) / USArmy | the other half of that split, and a branch of its own on both sides |
| 정보과 | Military Intelligence Corps | B | 법령 · 위키(한) / USArmy | the branch; 정보 alone is the information itself |
| 공병과 | Corps of Engineers | B | 법령 · 위키(한) / 영문법령 "engineering" · USArmy | an officer branches "Engineer"; the organization is the Corps of Engineers |
| 정보통신과 | Signal Corps | B | 법령 · 위키(한) / USArmy | the official English is the literal "information and communications" — the counterpart branch is the Signal Corps |
| 항공과 | Aviation Branch | B | 법령 · 위키(한) / USArmy | Army aviation, which is helicopters — not the Air Force |
| 화생방과 | Chemical Corps | B | 법령 · 위키(한) / USArmy | the branch; the hazard set itself is 화생방, and the US adds nuclear and says CBRN |
| 병참과 | Quartermaster Corps | B | 법령 · 위키(한) / USArmy | supply and field services — the official English says "logistics", which in the ROK Army is a different branch |
| 군수과 | Logistics Branch | B | 법령 · 위키(한) / USArmy | sits over 병기·병참·수송, which are still branches of their own |
| 수송과 | Transportation Corps | A | 법령 · 위키(한) / 영문법령 "transportation" · USArmy | the branch; 수송 on its own is the activity |
| 인사과 | Adjutant General's Corps | B | 법령 · 위키(한) / USArmy | personnel; it was 부관과 until recently, and the old official English rendered that "aide-de-camp" — a person, not a branch |
| 군사경찰과 | Military Police Corps | A | 법령 · 위키(한) / USArmy | the branch; renamed from 헌병과 in 2020 |
| 군의과 | Medical Corps | B | 법령 · 위키(한) / USArmy | physicians in uniform — one of them is a 군의관 |
| 법무과 | Judge Advocate General's Corps (JAG) | B | 법령 · 위키(한) / 영문법령 "legal affairs" · USArmy | say "JAG" — it is what gets said on both sides |
| 군종과 | Chaplain Corps | B | 법령 · 위키(한) / 영문법령 "chaplains" · USArmy | clergy commissioned as officers |
| 어학병 | language soldier | B | 병무청 | recruited by language exam for interpretation and translation — the official term since the Army and Air Force stopped saying 통역병 |
| 통역병 | interpreter soldier | B | 병무청 | the former name for 어학병, and still what everyone says |

---

## What rendering caught

Per [README.md](README.md), the list was run through the app's own builders —
`packEntriesByCollection` → `buildPackCardDraft` for all 24 entries in **both**
directions — and the output read as cards rather than as a table.

**군사특기 was cut.** It had been an entry beside 주특기. On the Korean deck the
two are clean cards; on the *English* deck they render as `primary military
occupational specialty (MOS)` and `military occupational specialty` — two fronts
differing by one word, for one concept, in one subpack. Nothing in the
uniqueness test objects, because the strings differ. It is not in the section.

**155mm자주포병 never made it in.** The 병무청 inventory publishes calibres inside
specialty names, and the pack is `pronounceable: true` in both directions, so
such a card has a play button that reads a number out of a job title. That is
one reason the enlisted specialty list stayed out of this section entirely.

Also confirmed by rendering: no entry collides with the rest of 부대·참모 or with
안보·정세 in either direction (the reason for the 「-과」 form — see call 2), every
hint survives onto the saved card as `briefDefinition`, and the two directions
mirror pair for pair. `npm test` on web is 553/553.

## Cut from this section, and why

Kept here so a later expansion starts from the research rather than from scratch.

| cut | why |
|---|---|
| 병기과, 재정과, 정훈과, 의무과, 치의과, 수의과, 의정과, 간호과 | Sourced and correct, but not what "most common" means for an interpreter. 정훈과 is the most interesting of them: morale, values instruction and public affairs in one branch, with no US branch equivalent and an official English of "troop information and education". |
| The Navy, Marine and Air Force inventories (함정과, 조종과, 항공통제과, 미사일방어과, 기상과, 조함과, 보급과, 인사교육과) | A 통역장교 can be assigned to any service, so this is the most defensible expansion. It is also where the official English misleads worst — 조종과, the ROKAF pilot branch, is officially "Operations". |
| 함정과 | Would have been cut regardless: the Korean is solid, but **no English rendering is published anywhere reachable** — the official translation predates the 2012 merger that created it. A tier C assertion about the branch a naval interpreter meets first. |
| The 병무청 enlisted specialty inventory (수송운용, 견인포병, 야전공병, 구난차량운전, 교량전차조종 …) | Published, so sourceable, but granular in a way that reads as a recruiting form rather than a glossary — and the spoken words for those jobs (운전병, 취사병, 정비병) are barracks usage no source states. |
| 병과학교, 병과장, 특기분류, 부특기, 원래 병과, 보직 변경, 특기 교육, 자대 배치, 병과 마크 | The administrative layer around the system. Real terms, low frequency in the room. |
| 후반기교육 | No source states its equivalence to the US "advanced individual training", and that equivalence was the whole content of the entry. |

## What review should change

1. **Lift the branch names from B to A** with DA PAM 600-3 or the ROK Army's own
   English material. Every US branch name here rests on one source family.
2. **Settle the 군수과 conflict** recorded above: four branches, or three merged
   into one?
3. **Check 인사과's hint.** "Until recently" is doing work a date should do — the
   부관과 → 인사과 rename year is not sourced here.
4. **Say whether the 「-과」 form reads right.** It is the call this file is least
   sure of, and the one a reviewer who has served can settle in a sentence.
