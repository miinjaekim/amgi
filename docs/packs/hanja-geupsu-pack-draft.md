# Hanja 급수 pack — 8급 through 6급

The 전국한자능력검정시험 배정한자, five subpacks, **300 characters**. Scope set by
the user 2026-09-09: the ladder runs to 1급 and there is no plan to climb it —
anything past 6급 needs its own case made, like any pack.

Three-sided cards, so each entry authors **four parts**: the 한자, its 훈, its 음,
and an English meaning. `PackBack` could not hold that (two slots, two
*languages*, and 훈음 is one language in two parts), which is why `PackEntry`
gained `hun`/`eum` and `back.Korean` is derived from them by `hunEum()`.

---

## Calls that need yours

**1. 10 English glosses run past the two-gloss ceiling.** All of them are the kanji
pack's own reviewed text, carried over verbatim so the same character reads the
same in both decks. `GLOSS_RULE` caps a field at two; these are three. Keep them
(cross-deck consistency) or trim them (house rule)?

  - 生 — `life, be born; raw`
  - 家 — `house, home; family`
  - 方 — `direction, side; way of doing`
  - 直 — `fix, straighten; direct`
  - 計 — `measure, count; plan`
  - 聞 — `hear, listen; ask`
  - 分 — `divide; minute; understand`
  - 交 — `mix, associate, exchange`
  - 合 — `fit, match, join`
  - 行 — `go; carry out; line`

**2. 136 English glosses are tier D** — cut from Unihan's definition, listed in
full in each table's *source* column so the cut is visible. That is the weakest
tier here and the rows most worth skimming.

Unihan is a Chinese-first dictionary and the 훈 is Korean, so its leading sense
is sometimes not what the character means here. **12 rows take a different
sense group of the same entry** — every one still Unihan's own wording, chosen
because the 훈 says which sense the card means. The rule cannot make that call
itself; it reads no Korean. They are listed in `OVERRIDES` in
[the ingest script](hanja-geupsu-ingest.py), and marked ◆ below:

  - 韓 한국, 나라 한 — `Korea`, from _fence; surname; Korea_
  - 江 강 강 — `large river`, from _large river; the Yangzi; surname_
  - 住 살 주 — `reside, live at`, from _reside, live at, dwell, lodge; stop_
  - 代 대신할 대 — `replace`, from _replace, replacement (of person or generation); era, generation_
  - 對 대할 대 — `facing, opposed`, from _correct, right; facing, opposed_
  - 庭 뜰 정 — `courtyard`, from _courtyard; spacious hall or yard_
  - 題 제목 제 — `title, headline`, from _forehead; title, headline; theme_
  - 待 기다릴 대 — `wait`, from _treat, entertain, receive; wait_
  - 綠 푸를 록 — `green`, from _green; chlorine_
  - 李 오얏, 성(姓) 리 — `plum`, from _plum; judge; surname_
  - 使 하여금, 부릴 사 — `cause, order`, from _cause, send on a mission, order; envoy, messenger, ambassador_
  - 習 익힐 습 — `practice`, from _practice; flapping wings_

**3. 省 now reads `examine, inspect`, off a source that is not Unihan.**
_Resolved 2026-09-09 — the call was made, and then sourced rather than asserted._
省 is 살필 성 — examine, as in 반성 and 성찰 — and Unihan's `kDefinition` is
"province; save, economize", neither of which is that sense. It is not that
Unihan disagrees: its own `kJapaneseKun` for 省 is `KAERIMIRU` — 省みる, *to
reflect on* — so the sense is in the character and simply missing from the
definition field. The gloss is [Wiktionary's](https://en.wiktionary.org/wiki/省)
own wording for the xǐng reading, _to examine; to inspect_, minus the "to" the
rest of the pack drops too.

⚠️ **Tier B, and worth knowing why it is not A.** The one source is a community
wiki, the bottom rank in [README](README.md). CC-CEDICT corroborates the sense —
省 [xing3] _to scrutinize; to reflect (on one's conduct)_ — but not word for
word, and A wants two sources agreeing spelling included. A published
Korean-English hanja dictionary would settle it; 네이버 한자사전 refuses
automated fetches and 다음's is JS-only, both checked 2026-09-09. **It is the
one row in the pack whose English comes from outside Unihan, and it has its own
table (`OFF_UNIHAN`) in the ingest script so it cannot be mistaken for one.**

**4. Section names are user-facing copy now.** They are the level names — 8급,
7급Ⅱ — which `docs/packs/README.md` allows only because a 급수 is a real rung a
learner can ask for, not a "Group 3".

---

## Sources

| what | source | tier |
|---|---|---|
| the character, its level, its 훈음 | 한국어문회 배정한자, the official XLS from their learning-materials section, transcribed to CSV in [rycont/hanja-grade-dataset](https://github.com/rycont/hanja-grade-dataset) | B |
| the 음, independently | Unicode Unihan `kHangul` — **300/300 agree, no exceptions** | → A |
| per-level counts | [ko.wikipedia 한자능력검정시험](https://ko.wikipedia.org/wiki/한자능력검정시험) gives 8급 50, 7급 150, 6급 300 cumulative, matching three of the five rungs | → A |
| English, 163 of them | `docs/packs/kanji-pack-draft.md` — already authored and reviewed in this repo | A / B |
| English, another 136 | Unicode Unihan `kDefinition`, trimmed | D |
| English, 省 alone | [Wiktionary 省](https://en.wiktionary.org/wiki/省) (xǐng) — the only row Unihan cannot supply | B |

**The official 어문회 site refuses connections from here**, and namu.wiki 403s to
automated fetches — both checked 2026-09-09. The dataset above is the official
XLS at one remove, which is why it is B on its own and only reaches A where a
second source agrees.

**Fetched as bytes, not as prose.** `raw.githubusercontent.com` is blocked from
this sandbox, so the CSVs came through the GitHub *contents* API and were
base64-decoded locally. That detail matters: the other route was WebFetch, which
puts a summarising model between the source and the file — and a model
transcribing 300 hanja is the exact thing "the model is not a source" forbids.

⚠️ **Four rows arrived as CJK Compatibility Ideographs** — 金 車 不 樂, U+F90A
rather than U+91D1 and so on. They are visually identical and they are not the
same character. They are also exactly the four with two Korean readings, which
is what that Unicode block exists to encode. Left in, a card front would fail to
match typed input, the kanji pack, and the pack's own saved-marking. **Ingest
NFC-normalises**, and the check that nothing else slipped through is in the
script.

## Tiers

| tier | count | means |
|---|---|---|
| A | 151 | two independent sources agree |
| B | 13 | one source — the kanji pack's English where Unihan words it differently enough not to corroborate literally (12), and 省 off Wiktionary (1) |
| D | 136 | Unihan's definition, cut down by a stated rule |

⚠️ The trimming rule is `GLOSS_RULE`, **this repo's own** — so "cite both" is
only half satisfied on the D rows. The stem is sourced; the rule is ours.

## Rendered through the app

Not the word list — what `hanjaFaces()` actually returns, for each partition.
Run before believing the table below it.

| 한자 | `korean` (derived) | character | 훈 | 음 |
|---|---|---|---|---|
| 水 | 물 수 | 水 → 물 수 | 물 → 水 수 | 수 → 水 물 |
| 樂 | 즐길 락 | 樂 → 즐길 락 | 즐길 → 樂 락 | 락 → 樂 즐길 |
| 敎 | 가르칠 교 | 敎 → 가르칠 교 | 가르칠 → 敎 교 | 교 → 敎 가르칠 |
| 金 | 쇠 금 | 金 → 쇠 금 | 쇠 → 金 금 | 금 → 金 쇠 |
| 學 | 배울 학 | 學 → 배울 학 | 배울 → 學 학 | 학 → 學 배울 |
| 洞 | 골 동 | 洞 → 골 동 | 골 → 洞 동 | 동 → 洞 골 |

## The 11 characters with more than one 훈음

The card teaches the 대표훈음 — the first, the one the exam prints — and the rest
ride in `context`, which carries onto the card as `briefDefinition`. Separate
cards per reading was refused: it would put the same study side in the deck
twice and break the one-section invariant `remap-pack-subpacks.ts` depends on.

| 한자 | level | 대표훈음 (on the card) | also (into `context`) |
|---|---|---|---|
| 金 | 8급 | 쇠 금 | 성(姓) 김 |
| 北 | 8급 | 북녘 북 | 달아날 배 |
| 車 | 7급Ⅱ | 수레 거 | 수레 차 |
| 洞 | 7급 | 골 동 | 밝을 통 |
| 便 | 7급 | 편할 편 | 똥오줌 변 |
| 讀 | 6급Ⅱ | 읽을 독 | 구절 두 |
| 樂 | 6급Ⅱ | 즐길 락 | 노래 악, 좋아할 요 |
| 省 | 6급Ⅱ | 살필 성 | 덜 생 |
| 度 | 6급 | 법도 도 | 헤아릴 탁 |
| 行 | 6급 | 다닐 행 | 항렬 항 |
| 畫 | 6급 | 그림 화 | 그을 획(劃) |

---

## The list

`tier` D rows carry Unihan's full definition so the cut is visible. A ⚠ marks a
gloss over the two-gloss ceiling.


### 8급 — 50 characters newly assigned

| 한자 | 훈 | 음 | English | tier | source |
|---|---|---|---|---|---|
| 校 | 학교 | 교 | school | A | kanji pack + Unihan |
| 敎 | 가르칠 | 교 | teach | A | kanji pack + Unihan (as 教) |
| 九 | 아홉 | 구 | nine | A | kanji pack + Unihan |
| 國 | 나라 | 국 | country | A | kanji pack + Unihan (as 国) |
| 軍 | 군사 | 군 | army, military | D | Unihan: _army, military; soldiers, troops_ |
| 金 | 쇠 | 금 | gold, money | A | kanji pack + Unihan |
| 南 | 남녘 | 남 | south | A | kanji pack + Unihan |
| 女 | 계집 | 녀 | woman | A | kanji pack + Unihan |
| 年 | 해 | 년 | year; age | A | kanji pack + Unihan |
| 大 | 큰 | 대 | big | A | kanji pack + Unihan |
| 東 | 동녘 | 동 | east | A | kanji pack + Unihan |
| 六 | 여섯 | 륙 | six | A | kanji pack + Unihan |
| 萬 | 일만 | 만 | ten thousand | A | kanji pack + Unihan (as 万) |
| 母 | 어미 | 모 | mother | A | kanji pack + Unihan |
| 木 | 나무 | 목 | tree, wood | A | kanji pack + Unihan |
| 門 | 문 | 문 | gate | A | kanji pack + Unihan |
| 民 | 백성 | 민 | people, subjects | D | Unihan: _people, subjects, citizens_ |
| 白 | 흰 | 백 | white | A | kanji pack + Unihan |
| 父 | 아비 | 부 | father | A | kanji pack + Unihan |
| 北 | 북녘 | 북 | north | A | kanji pack + Unihan |
| 四 | 넉 | 사 | four | A | kanji pack + Unihan |
| 山 | 메 | 산 | mountain | A | kanji pack + Unihan |
| 三 | 석 | 삼 | three | A | kanji pack + Unihan |
| 生 | 날 | 생 | life, be born; raw ⚠ | A | kanji pack + Unihan |
| 西 | 서녘 | 서 | west | A | kanji pack + Unihan |
| 先 | 먼저 | 선 | ahead, previous | A | kanji pack + Unihan |
| 小 | 작을 | 소 | small | A | kanji pack + Unihan |
| 水 | 물 | 수 | water | A | kanji pack + Unihan |
| 室 | 집 | 실 | room | A | kanji pack + Unihan |
| 十 | 열 | 십 | ten | A | kanji pack + Unihan |
| 五 | 다섯 | 오 | five | A | kanji pack + Unihan |
| 王 | 임금 | 왕 | king | A | kanji pack + Unihan |
| 外 | 바깥 | 외 | outside; other | A | kanji pack + Unihan |
| 月 | 달 | 월 | moon, month | A | kanji pack + Unihan |
| 二 | 두 | 이 | two | A | kanji pack + Unihan |
| 人 | 사람 | 인 | person | B | kanji pack; Unihan says _man; people; mankind; someone else_ |
| 一 | 한 | 일 | one | A | kanji pack + Unihan |
| 日 | 날 | 일 | sun, day | A | kanji pack + Unihan |
| 長 | 긴 | 장 | long; chief | A | kanji pack + Unihan |
| 弟 | 아우 | 제 | younger brother | A | kanji pack + Unihan |
| 中 | 가운데 | 중 | middle, inside | A | kanji pack + Unihan |
| 靑 | 푸를 | 청 | blue, green | D | Unihan: _blue, green; young; Kangxi radical 174_ |
| 寸 | 마디 | 촌 | inch | D | Unihan: _inch; small, tiny; Kangxi radical 41_ |
| 七 | 일곱 | 칠 | seven | A | kanji pack + Unihan |
| 土 | 흙 | 토 | earth, soil | A | kanji pack + Unihan |
| 八 | 여덟 | 팔 | eight | A | kanji pack + Unihan |
| 學 | 배울 | 학 | study, learning | A | kanji pack + Unihan (as 学) |
| 韓 | 한국, 나라 | 한 | Korea ◆ | D | Unihan: _fence; surname; Korea_ |
| 兄 | 형 | 형 | older brother | A | kanji pack + Unihan |
| 火 | 불 | 화 | fire | A | kanji pack + Unihan |

### 7급Ⅱ — 50 characters newly assigned

| 한자 | 훈 | 음 | English | tier | source |
|---|---|---|---|---|---|
| 家 | 집 | 가 | house, home; family ⚠ | A | kanji pack + Unihan |
| 間 | 사이 | 간 | interval, between | A | kanji pack + Unihan |
| 江 | 강 | 강 | large river ◆ | D | Unihan: _large river; the Yangzi; surname_ |
| 車 | 수레 | 거 | vehicle, car | A | kanji pack + Unihan |
| 工 | 장인 | 공 | craft, construction | B | kanji pack; Unihan says _labor, work; worker, laborer_ |
| 空 | 빌 | 공 | sky; empty | A | kanji pack + Unihan |
| 氣 | 기운 | 기 | air, gas | D | Unihan: _air, gas, steam, vapor; spirit_ |
| 記 | 기록할 | 기 | write down, record | A | kanji pack + Unihan |
| 男 | 사내 | 남 | man | A | kanji pack + Unihan |
| 內 | 안 | 내 | inside | A | kanji pack + Unihan (as 内) |
| 農 | 농사 | 농 | agriculture, farming | D | Unihan: _agriculture, farming; farmer_ |
| 答 | 대답 | 답 | answer | A | kanji pack + Unihan |
| 道 | 길 | 도 | road, way | A | kanji pack + Unihan |
| 動 | 움직일 | 동 | move, happen | D | Unihan: _move, happen; movement, action_ |
| 力 | 힘 | 력 | power, strength | A | kanji pack + Unihan |
| 立 | 설 | 립 | stand | A | kanji pack + Unihan |
| 每 | 매양 | 매 | every, each | D | Unihan: _every, each_ |
| 名 | 이름 | 명 | name | A | kanji pack + Unihan |
| 物 | 물건 | 물 | thing, substance | D | Unihan: _thing, substance, creature_ |
| 方 | 모[棱] | 방 | direction, side; way of doing ⚠ | B | kanji pack; Unihan says _a square, rectangle; a region; local_ |
| 不 | 아닐 | 불 | no, not | D | Unihan: _no, not; un-; negative prefix_ |
| 事 | 일 | 사 | affair, matter | D | Unihan: _affair, matter, business; to serve; accident, incident_ |
| 上 | 윗 | 상 | above, go up | B | kanji pack; Unihan says _top; superior, highest; go up, send up_ |
| 姓 | 성 | 성 | one's family name | D | Unihan: _one's family name; clan, people_ |
| 世 | 인간 | 세 | generation; world | D | Unihan: _generation; world; era_ |
| 手 | 손 | 수 | hand | A | kanji pack + Unihan |
| 時 | 때 | 시 | time; o’clock | A | kanji pack + Unihan |
| 市 | 저자 | 시 | city; market | A | kanji pack + Unihan |
| 食 | 밥, 먹을 | 식 | eat; food | A | kanji pack + Unihan |
| 安 | 편안 | 안 | peaceful, tranquil | D | Unihan: _peaceful, tranquil, quiet_ |
| 午 | 낮 | 오 | noon | B | kanji pack; Unihan says _seventh earthly branch_ |
| 右 | 오를, 오른(쪽) | 우 | right | A | kanji pack + Unihan |
| 子 | 아들 | 자 | child | A | kanji pack + Unihan |
| 自 | 스스로 | 자 | self | A | kanji pack + Unihan |
| 場 | 마당 | 장 | place, grounds | B | kanji pack; Unihan says _open space, field, market_ |
| 電 | 번개 | 전 | electricity | A | kanji pack + Unihan |
| 前 | 앞 | 전 | before, in front | A | kanji pack + Unihan |
| 全 | 온전 | 전 | maintain, keep whole or intact | D | Unihan: _maintain, keep whole or intact_ |
| 正 | 바를 | 정 | correct | A | kanji pack + Unihan |
| 足 | 발 | 족 | foot; be enough | A | kanji pack + Unihan |
| 左 | 왼 | 좌 | left | A | kanji pack + Unihan |
| 直 | 곧을 | 직 | fix, straighten; direct ⚠ | B | kanji pack; Unihan says _straight, erect, vertical_ |
| 平 | 평평할 | 평 | flat, level | D | Unihan: _flat, level, even; peaceful_ |
| 下 | 아래 | 하 | below, go down | A | kanji pack + Unihan |
| 漢 | 한수, 한나라 | 한 | the Chinese people, Chinese language | D | Unihan: _the Chinese people, Chinese language_ |
| 海 | 바다 | 해 | sea | A | kanji pack + Unihan |
| 話 | 말씀 | 화 | talk; story | A | kanji pack + Unihan |
| 活 | 살 | 활 | activity, living | B | kanji pack; Unihan says _live, exist, survive; lively_ |
| 孝 | 효도 | 효 | filial piety, obedience | D | Unihan: _filial piety, obedience; mourning_ |
| 後 | 뒤 | 후 | after, behind | A | kanji pack + Unihan |

### 7급 — 50 characters newly assigned

| 한자 | 훈 | 음 | English | tier | source |
|---|---|---|---|---|---|
| 歌 | 노래 | 가 | song, sing | A | kanji pack + Unihan |
| 口 | 입 | 구 | mouth | A | kanji pack + Unihan |
| 旗 | 기 | 기 | banner, flag | D | Unihan: _banner, flag, streamer_ |
| 同 | 한가지 | 동 | same | A | kanji pack + Unihan |
| 洞 | 골 | 동 | cave, grotto | D | Unihan: _cave, grotto; ravine; hole_ |
| 冬 | 겨울 | 동 | winter | A | kanji pack + Unihan |
| 登 | 오를 | 등 | rise, mount | D | Unihan: _rise, mount, board, climb_ |
| 來 | 올 | 래 | come | A | kanji pack + Unihan (as 来) |
| 老 | 늙을 | 로 | old, aged | D | Unihan: _old, aged; experienced; Kangxi radical 125_ |
| 里 | 마을 | 리 | village; ri (distance) | A | kanji pack + Unihan |
| 林 | 수풀 | 림 | grove, woods | A | kanji pack + Unihan |
| 面 | 낯 | 면 | face; surface | D | Unihan: _face; surface; plane; side, dimension; Kangxi radical 176_ |
| 命 | 목숨 | 명 | life | D | Unihan: _life; destiny, fate, luck; an order, instruction_ |
| 文 | 글월 | 문 | writing, sentence | A | kanji pack + Unihan |
| 問 | 물을 | 문 | ask, inquire after | D | Unihan: _ask (about), inquire after_ |
| 百 | 일백 | 백 | hundred | A | kanji pack + Unihan |
| 夫 | 지아비 | 부 | man, male adult | D | Unihan: _man, male adult, husband; those_ |
| 算 | 셈 | 산 | calculate, arithmetic | A | kanji pack + Unihan |
| 色 | 빛 | 색 | color | A | kanji pack + Unihan |
| 夕 | 저녁 | 석 | evening | A | kanji pack + Unihan |
| 少 | 적을 | 소 | few; a little | A | kanji pack + Unihan |
| 所 | 바 | 소 | place, location | D | Unihan: _place, location; numerary adjunct_ |
| 數 | 셈 | 수 | number; count | A | kanji pack + Unihan (as 数) |
| 植 | 심을 | 식 | plant, trees | D | Unihan: _plant, trees, plants; grow_ |
| 心 | 마음 | 심 | heart, mind | A | kanji pack + Unihan |
| 語 | 말씀 | 어 | language; tell | A | kanji pack + Unihan |
| 然 | 그럴 | 연 | yes, certainly | D | Unihan: _yes, certainly; pledge, promise_ |
| 有 | 있을 | 유 | have, own | D | Unihan: _have, own, possess; exist_ |
| 育 | 기를 | 육 | produce, give birth to | D | Unihan: _produce, give birth to; educate_ |
| 邑 | 고을 | 읍 | area; district | D | Unihan: _area; district; city; state; Kangxi radical 163_ |
| 入 | 들 | 입 | enter, put in | A | kanji pack + Unihan |
| 字 | 글자 | 자 | character, letter | A | kanji pack + Unihan |
| 祖 | 할아비 | 조 | ancestor, forefather | D | Unihan: _ancestor, forefather; grandfather_ |
| 住 | 살 | 주 | reside, live at ◆ | D | Unihan: _reside, live at, dwell, lodge; stop_ |
| 主 | 임금, 주인 | 주 | master, chief owner | D | Unihan: _master, chief owner; host; lord_ |
| 重 | 무거울 | 중 | heavy, weighty | D | Unihan: _heavy, weighty; double_ |
| 紙 | 종이 | 지 | paper | A | kanji pack + Unihan |
| 地 | 따 | 지 | ground, land | A | kanji pack + Unihan |
| 千 | 일천 | 천 | thousand | A | kanji pack + Unihan |
| 天 | 하늘 | 천 | heaven, sky | A | kanji pack + Unihan |
| 川 | 내 | 천 | river | A | kanji pack + Unihan |
| 草 | 풀 | 초 | grass | A | kanji pack + Unihan |
| 村 | 마을 | 촌 | village | A | kanji pack + Unihan |
| 秋 | 가을 | 추 | autumn | A | kanji pack + Unihan |
| 春 | 봄 | 춘 | spring | A | kanji pack + Unihan |
| 出 | 날[生] | 출 | go out, take out | A | kanji pack + Unihan |
| 便 | 편할 | 편 | convenience, ease | D | Unihan: _convenience, ease; expedient_ |
| 夏 | 여름 | 하 | summer | A | kanji pack + Unihan |
| 花 | 꽃 | 화 | flower | A | kanji pack + Unihan |
| 休 | 쉴 | 휴 | rest, take a day off | A | kanji pack + Unihan |

### 6급Ⅱ — 75 characters newly assigned

| 한자 | 훈 | 음 | English | tier | source |
|---|---|---|---|---|---|
| 各 | 각각 | 각 | each, individually | D | Unihan: _each, individually, every, all_ |
| 角 | 뿔 | 각 | corner; horn | A | kanji pack + Unihan |
| 界 | 지경 | 계 | boundary, limit | D | Unihan: _boundary, limit; domain; society; the world_ |
| 計 | 셀 | 계 | measure, count; plan ⚠ | A | kanji pack + Unihan |
| 高 | 높을 | 고 | high; expensive | A | kanji pack + Unihan |
| 公 | 공평할 | 공 | public, official | A | kanji pack + Unihan |
| 共 | 한가지 | 공 | together with, all | D | Unihan: _together with, all, total; to share_ |
| 功 | 공[勳] | 공 | achievement, merit | D | Unihan: _achievement, merit, good result_ |
| 果 | 실과 | 과 | fruit; result | D | Unihan: _fruit; result_ |
| 科 | 과목 | 과 | department; school subject | A | kanji pack + Unihan |
| 光 | 빛 | 광 | light, shine | A | kanji pack + Unihan |
| 球 | 공 | 구 | ball, sphere | D | Unihan: _ball, sphere, globe; round_ |
| 今 | 이제 | 금 | now | A | kanji pack + Unihan |
| 急 | 급할 | 급 | quick, quickly | D | Unihan: _quick, quickly; urgent, pressing_ |
| 短 | 짧을 | 단 | short; brief | D | Unihan: _short; brief; deficient, lacking_ |
| 堂 | 집 | 당 | hall; government office | D | Unihan: _hall; government office_ |
| 代 | 대신할 | 대 | replace ◆ | D | Unihan: _replace, replacement (of person or generation); era, generation_ |
| 對 | 대할 | 대 | facing, opposed ◆ | D | Unihan: _correct, right; facing, opposed_ |
| 圖 | 그림 | 도 | diagram | D | Unihan: _diagram; chart, map, picture_ |
| 讀 | 읽을 | 독 | read, study | D | Unihan: _read, study; pronounce_ |
| 童 | 아이 | 동 | child, boy | D | Unihan: _child, boy, servant boy; virgin_ |
| 等 | 무리 | 등 | rank, grade | D | Unihan: _rank, grade; to wait; equal, “and so forth”_ |
| 樂 | 즐길 | 락 | happy, glad | D | Unihan: _happy, glad; enjoyable; music_ |
| 利 | 이할 | 리 | gains, advantage | D | Unihan: _gains, advantage, profit, merit_ |
| 理 | 다스릴 | 리 | reason, principle | A | kanji pack + Unihan |
| 明 | 밝을 | 명 | bright; clear | A | kanji pack + Unihan |
| 聞 | 들을 | 문 | hear, listen; ask ⚠ | A | kanji pack + Unihan |
| 半 | 반(半) | 반 | half | A | kanji pack + Unihan |
| 反 | 돌이킬, 돌아올 | 반 | reverse, opposite | D | Unihan: _reverse, opposite, contrary, anti_ |
| 班 | 나눌 | 반 | class, group | D | Unihan: _class, group, grade; squad; job_ |
| 發 | 필 | 발 | issue, dispatch | D | Unihan: _issue, dispatch, send out, emit_ |
| 放 | 놓을 | 방 | put, release | D | Unihan: _put, release, free, liberate_ |
| 部 | 떼 | 부 | part, division | D | Unihan: _part, division, section_ |
| 分 | 나눌 | 분 | divide; minute; understand ⚠ | A | kanji pack + Unihan |
| 社 | 모일 | 사 | company; shrine | A | kanji pack + Unihan |
| 書 | 글 | 서 | write | B | kanji pack; Unihan says _book, letter, document; writings_ |
| 線 | 줄 | 선 | line | A | kanji pack + Unihan |
| 雪 | 눈 | 설 | snow | A | kanji pack + Unihan |
| 成 | 이룰 | 성 | completed, finished | D | Unihan: _completed, finished, fixed_ |
| 省 | 살필 | 성 | examine, inspect | B | Wiktionary 省 (xǐng): _to examine; to inspect_ — Unihan has none of this sense, only _province; save, economize_ |
| 消 | 사라질 | 소 | vanish, die out | D | Unihan: _vanish, die out; melt away_ |
| 術 | 재주 | 술 | art, skill | D | Unihan: _art, skill, special feat; method, technique_ |
| 始 | 비로소 | 시 | begin, start | D | Unihan: _begin, start; then, only then_ |
| 身 | 몸 | 신 | body | D | Unihan: _body; trunk, hull; Kangxi radical 158_ |
| 神 | 귀신 | 신 | spirit, god | D | Unihan: _spirit, god, supernatural being_ |
| 信 | 믿을 | 신 | trust, believe | D | Unihan: _trust, believe; letter_ |
| 新 | 새 | 신 | new | A | kanji pack + Unihan |
| 弱 | 약할 | 약 | weak | A | kanji pack + Unihan |
| 藥 | 약 | 약 | drugs, pharmaceuticals | D | Unihan: _drugs, pharmaceuticals, medicine_ |
| 業 | 업 | 업 | profession, business | D | Unihan: _profession, business, trade_ |
| 勇 | 날랠 | 용 | brave, courageous | D | Unihan: _brave, courageous, fierce_ |
| 用 | 쓸 | 용 | use; business to attend to | A | kanji pack + Unihan |
| 運 | 옮길 | 운 | luck, fortune | D | Unihan: _luck, fortune; ship, transport_ |
| 音 | 소리 | 음 | sound | A | kanji pack + Unihan |
| 飮 | 마실 | 음 | drink; swallow | D | Unihan: _drink; swallow; kind of drink_ |
| 意 | 뜻 | 의 | thought, idea | D | Unihan: _thought, idea, opinion; think_ |
| 作 | 지을 | 작 | make | A | kanji pack + Unihan |
| 昨 | 어제 | 작 | yesterday | D | Unihan: _yesterday; in former times, past_ |
| 才 | 재주 | 재 | talent; years of age | A | kanji pack + Unihan |
| 戰 | 싸움 | 전 | war, fighting | D | Unihan: _war, fighting, battle_ |
| 庭 | 뜰 | 정 | courtyard ◆ | D | Unihan: _courtyard; spacious hall or yard_ |
| 第 | 차례 | 제 | sequence, number | D | Unihan: _sequence, number; grade, degree_ |
| 題 | 제목 | 제 | title, headline ◆ | D | Unihan: _forehead; title, headline; theme_ |
| 注 | 부을 | 주 | concentrate, focus | D | Unihan: _concentrate, focus, direct_ |
| 集 | 모을 | 집 | assemble, collect together | D | Unihan: _assemble, collect together_ |
| 窓 | 창 | 창 | window | D | Unihan: _window_ |
| 淸 | 맑을 | 청 | clear | D | Unihan: _clear_ |
| 體 | 몸 | 체 | body | A | kanji pack + Unihan (as 体) |
| 表 | 겉 | 표 | show, express | D | Unihan: _show, express, manifest, display_ |
| 風 | 바람 | 풍 | wind | A | kanji pack + Unihan |
| 幸 | 다행 | 행 | luck, favor | D | Unihan: _luck(ily), favor, fortunately_ |
| 現 | 나타날 | 현 | appear, manifest | D | Unihan: _appear, manifest, become visible_ |
| 形 | 모양 | 형 | shape, form | A | kanji pack + Unihan |
| 和 | 화할 | 화 | harmony, peace | D | Unihan: _harmony, peace; peaceful, calm_ |
| 會 | 모일 | 회 | meet; meeting | A | kanji pack + Unihan (as 会) |

### 6급 — 75 characters newly assigned

| 한자 | 훈 | 음 | English | tier | source |
|---|---|---|---|---|---|
| 感 | 느낄 | 감 | feel, perceive | D | Unihan: _feel, perceive, emotion_ |
| 強 | 강할 | 강 | strong | A | kanji pack + Unihan |
| 開 | 열 | 개 | open | D | Unihan: _open; initiate, begin, start_ |
| 京 | 서울 | 경 | capital city | A | kanji pack + Unihan |
| 古 | 예 | 고 | old (of things) | A | kanji pack + Unihan |
| 苦 | 쓸[味覺] | 고 | bitter | D | Unihan: _bitter; hardship, suffering_ |
| 交 | 사귈 | 교 | mix, associate, exchange ⚠ | A | kanji pack + Unihan |
| 區 | 구분할, 지경 | 구 | area, district | D | Unihan: _area, district, region, ward; surname_ |
| 郡 | 고을 | 군 | administrative division | D | Unihan: _administrative division_ |
| 根 | 뿌리 | 근 | root, base | D | Unihan: _root, base(d on); foundation_ |
| 近 | 가까울 | 근 | near | A | kanji pack + Unihan |
| 級 | 등급 | 급 | level, rank | D | Unihan: _level, rank, class; grade_ |
| 多 | 많을 | 다 | many, much | A | kanji pack + Unihan |
| 待 | 기다릴 | 대 | wait ◆ | D | Unihan: _treat, entertain, receive; wait_ |
| 度 | 법도 | 도 | degree, system | D | Unihan: _degree, system; manner; to consider_ |
| 頭 | 머리 | 두 | head | A | kanji pack + Unihan |
| 例 | 법식 | 례 | precedent, example | D | Unihan: _precedent, example; regulation_ |
| 禮 | 예도 | 례 | social custom; manners | D | Unihan: _social custom; manners; courtesy; rites_ |
| 路 | 길 | 로 | road, path | D | Unihan: _road, path, street; journey_ |
| 綠 | 푸를 | 록 | green ◆ | D | Unihan: _green; chlorine_ |
| 李 | 오얏, 성(姓) | 리 | plum ◆ | D | Unihan: _plum; judge; surname_ |
| 目 | 눈 | 목 | eye | A | kanji pack + Unihan |
| 美 | 아름다울 | 미 | beautiful, pretty | D | Unihan: _beautiful, pretty; pleasing_ |
| 米 | 쌀 | 미 | rice; America | A | kanji pack + Unihan |
| 朴 | 성(姓) | 박 | simple, unadorned | D | Unihan: _simple, unadorned; sincere; surname; a tree_ |
| 番 | 차례 | 번 | number in a series; turn | A | kanji pack + Unihan |
| 別 | 다를, 나눌 | 별 | separate, other | D | Unihan: _separate, other; do not_ |
| 病 | 병 | 병 | illness, sickness | D | Unihan: _illness, sickness, disease_ |
| 服 | 옷 | 복 | clothes | D | Unihan: _clothes; wear, dress_ |
| 本 | 근본 | 본 | book; origin | A | kanji pack + Unihan |
| 使 | 하여금, 부릴 | 사 | cause, order ◆ | D | Unihan: _cause, send on a mission, order; envoy, messenger, ambassador_ |
| 死 | 죽을 | 사 | die; dead | D | Unihan: _die; dead; death_ |
| 席 | 자리 | 석 | seat; mat | D | Unihan: _seat; mat; take seat; banquet_ |
| 石 | 돌 | 석 | stone | A | kanji pack + Unihan |
| 速 | 빠를 | 속 | quick, prompt | D | Unihan: _quick, prompt, speedy_ |
| 孫 | 손자 | 손 | grandchild, descendent | D | Unihan: _grandchild, descendent; surname_ |
| 樹 | 나무 | 수 | tree; plant | D | Unihan: _tree; plant; set up, establish_ |
| 習 | 익힐 | 습 | practice ◆ | D | Unihan: _practice; flapping wings_ |
| 勝 | 이길 | 승 | victory | D | Unihan: _victory; excel, be better than_ |
| 式 | 법 | 식 | style, system | D | Unihan: _style, system, formula, rule_ |
| 失 | 잃을 | 실 | lose | D | Unihan: _lose; make mistake, neglect_ |
| 愛 | 사랑 | 애 | love, be fond of | D | Unihan: _love, be fond of, like_ |
| 夜 | 밤 | 야 | night | A | kanji pack + Unihan |
| 野 | 들[坪] | 야 | field; wild | A | kanji pack + Unihan |
| 陽 | 볕 | 양 | light; sun | D | Unihan: _the active, male principle in Chinese philosophy (yang); light; sun_ |
| 洋 | 큰바다 | 양 | ocean, sea | D | Unihan: _ocean, sea; foreign; western_ |
| 言 | 말씀 | 언 | say; word | A | kanji pack + Unihan |
| 英 | 꽃부리 | 영 | petal, flower | D | Unihan: _petal, flower, leaf; brave, a hero; England, English_ |
| 永 | 길 | 영 | long, perpetual | D | Unihan: _long, perpetual, eternal, forever_ |
| 溫 | 따뜻할 | 온 | lukewarm, warm | D | Unihan: _lukewarm, warm; tepid, mild_ |
| 園 | 동산 | 원 | garden, park | A | kanji pack + Unihan |
| 遠 | 멀 | 원 | far | A | kanji pack + Unihan |
| 由 | 말미암을 | 유 | cause, reason | D | Unihan: _cause, reason; from_ |
| 油 | 기름 | 유 | oil, fat | D | Unihan: _oil, fat, grease, lard; paints_ |
| 銀 | 은 | 은 | silver | D | Unihan: _silver (element 47, Ag); cash, money, wealth_ |
| 醫 | 의원 | 의 | medicine | D | Unihan: _medicine; to cure, heal; physician_ |
| 衣 | 옷 | 의 | clothes, clothing | D | Unihan: _clothes, clothing; cover, skin; Kangxi radical 145_ |
| 者 | 놈 | 자 | that which; he who | D | Unihan: _that which; he who; those who_ |
| 章 | 글 | 장 | composition | D | Unihan: _composition; chapter, section_ |
| 在 | 있을 | 재 | be at, in | D | Unihan: _be at, in, on; consist in, rest_ |
| 定 | 정할 | 정 | decide, settle | D | Unihan: _decide, settle, fix_ |
| 朝 | 아침 | 조 | morning | A | kanji pack + Unihan |
| 族 | 겨레 | 족 | a family clan, ethnic group | D | Unihan: _a family clan, ethnic group, tribe_ |
| 晝 | 낮 | 주 | daytime, noon | A | kanji pack + Unihan (as 昼) |
| 親 | 친할 | 친 | parent; close | B | kanji pack; Unihan says _relatives, parents; intimate_ |
| 太 | 클 | 태 | thick, fat | B | kanji pack; Unihan says _very, too, much; big; extreme_ |
| 通 | 통할 | 통 | pass through; commute | A | kanji pack + Unihan |
| 特 | 특별할 | 특 | special, unique | D | Unihan: _special, unique, distinguished_ |
| 合 | 합할 | 합 | fit, match, join ⚠ | A | kanji pack + Unihan |
| 行 | 다닐 | 행 | go; carry out; line ⚠ | B | kanji pack; Unihan says _go; walk; move, travel; circulate; Kangxi radical 144_ |
| 向 | 향할 | 향 | toward, direction | D | Unihan: _toward, direction, trend_ |
| 號 | 이름 | 호 | mark, sign | D | Unihan: _mark, sign; symbol; number_ |
| 畫 | 그림 | 화 | picture; stroke of a kanji | A | kanji pack + Unihan (as 画) |
| 黃 | 누를 | 황 | yellow | A | kanji pack + Unihan (as 黄) |
| 訓 | 가르칠 | 훈 | teach, instruct | D | Unihan: _teach, instruct; exegesis_ |

---

## What review changed

- **省 no longer says "province."** The draft shipped it wrong on purpose and
  asked for the call; the call was *examine*, and the row was then sourced
  rather than asserted — Wiktionary's own wording for the xǐng reading, with
  CC-CEDICT and Unihan's `kJapaneseKun` かえりみる agreeing on the sense. It
  moved from D to B and out of Unihan's reach entirely, into `OFF_UNIHAN` in
  the ingest script. Tier counts: A 151, B 13, D 136.

