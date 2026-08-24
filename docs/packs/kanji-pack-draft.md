# Kanji Pack (教育漢字 grades 1–2) — Draft for Review

**⚠️ Not shipped until you approve this list.** Wired into
`packages/core/src/kanji.ts` and the Japanese registry on the branch.

**240 characters · 11 sections · both backs authored · `layout: 'list'`**

---

## Why the school list and not JLPT

The backlog names JLPT as the obvious Japanese gap, and this is not that — on
purpose, and it is the first thing to push back on if you disagree.

N5's ~103 kanji is an *exam's* slice of the same material, and it stops
part-way through the set every Japanese child finishes by age eight. 学年別漢字
配当表 (文部科学省) is a real curriculum with an order someone thought about,
and it is the order every 漢字ドリル in Japan is built on. 240 characters also
reaches the point where kanji start compounding into each other — 電車, 教室,
何曜日 are all readable by the end of it — which 103 does not.

If you want the exam ladder instead, N5 is a subset of these 240 and the pack
can be re-sectioned into it without re-authoring a single back.

**Verified against the official lists in a test**, not by eye: grade 1 is
exactly the official 80, grade 2 exactly the official 160, no character in the
wrong grade and none missing. Across eleven themed sections that is not
checkable by reading.

## Why this pack breaks two rules the kana packs set

**1. The back carries readings.** Every other pack's back is a gloss, because
for a word the gloss *is* the answer. For a kanji it is not: 生 means "life" and
tells you nothing about saying 学生, 生きる or 生ビール. So the back is
`meaning — kun / ON`:

- **kun'yomi in hiragana**, okurigana in parentheses — み(る), た(べる). The
  parenthesis is what separates the character from the ending.
- **on'yomi in katakana**, `·` between two — ジン·ニン. Script alone says which
  kind of reading it is, so nothing needs a label. A test enforces this, because
  a kun written in katakana is not a cosmetic slip — it is the back saying the
  wrong thing.
- Readings are **pruned to what is taught at this level**. 生 has more than a
  dozen; four are what a second-grader is held to.
- A character with no everyday kun (百, 番, 茶, 王, 校) gets on'yomi only, rather
  than a reading that exists but is never met.

**2. It is a list, not a grid.** 「물 — みず / スイ」 does not fit the 4.5rem tile
that makes 71 kana scannable. **This has a real cost you should weigh:** grid
decks are hidden from the "All" chip on the card list, list decks are not — so
240 kanji cards will sit alongside your own words there. The alternative was a
grid whose tile shows a truncated reading, which makes the pack wrong on the one
page it exists to be read on. Your call; the fix if you want it is a per-pack
flag rather than the layout keying it does today.

**Not `pronounceable`.** A lone kanji has no single reading to speak — the TTS
call would have to pick one, and picking is the thing the learner is doing.

## Both backs are authored, and the readings must not drift

Japanese is the first study language where **both** back slots are readable —
neither is the front of the card — so English natives get the English back and
Korean natives the Korean one, and an entry missing a side goes blank for half
the readers. Readings are authored once per character and assembled into both
strings; a test asserts the half after the em dash is identical in the two.

**Korean meanings follow the 훈음 a Korean reader already carries** for the same
hanja where one exists (水 물 수 → 물), which is the whole advantage a Korean
native brings to kanji. Where the Japanese meaning has drifted, the Japanese
sense wins — 社 is 회사 first here, not 모일 사.

---

## Open questions for you

1. **The list-vs-grid trade above** is the one real design cost in this pack.
2. **Sections are grade-then-theme**, which is why there are eleven of them and
   why they run 13–39 rather than evenly. Grade order is the curriculum's;
   theme within a grade is mine, so a learner can hold "Grade 1 · Nature" in
   mind where "characters 21–40" is not holdable. Sections are the enrolment
   unit, so this is also how the 240 gets taken in sittings.
3. **Meanings are compressed to fit a card back.** 生 is "life, be born; raw"
   where a dictionary needs a paragraph; 直 is "fix, straighten; direct". The
   depth call fills the rest in per card — same seed-not-finished-card rule as
   the other packs — but if any of these read as *wrong* rather than *short*,
   that is what to flag.
4. **Which readings got cut** is the other judgement call worth spot-checking.
   下 keeps した·さ(げる)·くだ(る) / カ·ゲ and drops もと and お(りる); 生 keeps
   four of a dozen. I erred toward what a grade-2 drill book prints.

---

## The list

### Grade 1 · Numbers and money — 1학년 · 숫자와 돈 (13)

_The counting kanji, which compound with almost everything else in the pack._

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 一 | one | 하나, 일 | ひと(つ) / イチ·イツ |
| 二 | two | 둘, 이 | ふた(つ) / ニ |
| 三 | three | 셋, 삼 | みっ(つ) / サン |
| 四 | four | 넷, 사 | よっ(つ)·よん / シ |
| 五 | five | 다섯, 오 | いつ(つ) / ゴ |
| 六 | six | 여섯, 육 | むっ(つ) / ロク |
| 七 | seven | 일곱, 칠 | なな(つ) / シチ |
| 八 | eight | 여덟, 팔 | やっ(つ) / ハチ |
| 九 | nine | 아홉, 구 | ここの(つ) / キュウ·ク |
| 十 | ten | 열, 십 | とお / ジュウ·ジッ |
| 百 | hundred | 백 | ヒャク |
| 千 | thousand | 천 | ち / セン |
| 円 | yen; round | 엔; 둥글다 | まる(い) / エン |

### Grade 1 · Nature and the world — 1학년 · 자연과 사물 (27)

_The pictographs — the characters that still look like the thing they mean._

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 日 | sun, day | 해, 날 | ひ·か / ニチ·ジツ |
| 月 | moon, month | 달 | つき / ゲツ·ガツ |
| 火 | fire | 불 | ひ / カ |
| 水 | water | 물 | みず / スイ |
| 木 | tree, wood | 나무 | き / モク·ボク |
| 金 | gold, money | 금, 돈 | かね / キン·コン |
| 土 | earth, soil | 흙 | つち / ド·ト |
| 山 | mountain | 산 | やま / サン |
| 川 | river | 내, 강 | かわ / セン |
| 田 | rice paddy | 논 | た / デン |
| 天 | heaven, sky | 하늘 | あま / テン |
| 空 | sky; empty | 하늘; 비다 | そら·あ(く)·から / クウ |
| 雨 | rain | 비 | あめ / ウ |
| 石 | stone | 돌 | いし / セキ |
| 林 | grove, woods | 수풀 | はやし / リン |
| 森 | forest | 숲 | もり / シン |
| 草 | grass | 풀 | くさ / ソウ |
| 花 | flower | 꽃 | はな / カ |
| 竹 | bamboo | 대나무 | たけ / チク |
| 犬 | dog | 개 | いぬ / ケン |
| 虫 | insect | 벌레 | むし / チュウ |
| 貝 | shellfish | 조개 | かい / バイ |
| 玉 | ball, jewel | 구슬 | たま / ギョク |
| 糸 | thread | 실 | いと / シ |
| 青 | blue | 파랗다, 푸르다 | あお(い) / セイ |
| 赤 | red | 빨갛다 | あか(い) / セキ |
| 白 | white | 희다 | しろ(い) / ハク·ビャク |

### Grade 1 · People and the body — 1학년 · 사람과 몸 (14)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 人 | person | 사람 | ひと / ジン·ニン |
| 女 | woman | 여자 | おんな·め / ジョ·ニョ |
| 男 | man | 남자 | おとこ / ダン·ナン |
| 子 | child | 아이 | こ / シ·ス |
| 王 | king | 임금 | オウ |
| 口 | mouth | 입 | くち / コウ·ク |
| 耳 | ear | 귀 | みみ / ジ |
| 手 | hand | 손 | て / シュ |
| 足 | foot; be enough | 발; 충분하다 | あし·た(りる) / ソク |
| 目 | eye | 눈 | め / モク·ボク |
| 名 | name | 이름 | な / メイ·ミョウ |
| 力 | power, strength | 힘 | ちから / リョク·リキ |
| 気 | spirit, mood, air | 기운, 기분 | キ·ケ |
| 音 | sound | 소리 | おと·ね / オン |

### Grade 1 · School, place and direction — 1학년 · 학교·위치·방향 (26)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 学 | study, learning | 배우다, 학문 | まな(ぶ) / ガク |
| 校 | school | 학교 | コウ |
| 字 | character, letter | 글자 | ジ |
| 文 | writing, sentence | 글 | ふみ / ブン·モン |
| 本 | book; origin | 책; 근본 | もと / ホン |
| 見 | see | 보다 | み(る) / ケン |
| 出 | go out, take out | 나가다, 내다 | で(る)·だ(す) / シュツ |
| 入 | enter, put in | 들어가다, 넣다 | はい(る)·い(れる) / ニュウ |
| 立 | stand | 서다 | た(つ) / リツ |
| 休 | rest, take a day off | 쉬다 | やす(む) / キュウ |
| 正 | correct | 바르다 | ただ(しい) / セイ·ショウ |
| 生 | life, be born; raw | 살다, 나다; 날것 | い(きる)·う(まれる)·なま / セイ·ショウ |
| 先 | ahead, previous | 먼저, 앞 | さき / セン |
| 早 | early; fast | 이르다; 빠르다 | はや(い) / ソウ |
| 夕 | evening | 저녁 | ゆう / セキ |
| 年 | year; age | 해; 나이 | とし / ネン |
| 上 | above, go up | 위, 오르다 | うえ·あ(がる)·のぼ(る) / ジョウ |
| 下 | below, go down | 아래, 내리다 | した·さ(げる)·くだ(る) / カ·ゲ |
| 左 | left | 왼쪽 | ひだり / サ |
| 右 | right | 오른쪽 | みぎ / ウ·ユウ |
| 中 | middle, inside | 가운데, 안 | なか / チュウ |
| 大 | big | 크다 | おお(きい) / ダイ·タイ |
| 小 | small | 작다 | ちい(さい)·こ·お / ショウ |
| 町 | town | 동네, 마을 | まち / チョウ |
| 村 | village | 마을 | むら / ソン |
| 車 | vehicle, car | 차, 수레 | くるま / シャ |

### Grade 2 · Time and the calendar — 2학년 · 시간과 달력 (17)

_Where the compounds start: 何曜日, 午前, 時間 are all built from this section._

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 春 | spring | 봄 | はる / シュン |
| 夏 | summer | 여름 | なつ / カ·ゲ |
| 秋 | autumn | 가을 | あき / シュウ |
| 冬 | winter | 겨울 | ふゆ / トウ |
| 朝 | morning | 아침 | あさ / チョウ |
| 昼 | daytime, noon | 낮 | ひる / チュウ |
| 夜 | night | 밤 | よる·よ / ヤ |
| 時 | time; o’clock | 때; 시 | とき / ジ |
| 間 | interval, between | 사이 | あいだ·ま / カン·ケン |
| 分 | divide; minute; understand | 나누다; 분; 알다 | わ(ける)·わ(かる) / ブン·フン·ブ |
| 週 | week | 주 | シュウ |
| 曜 | day of the week | 요일 | ヨウ |
| 今 | now | 지금 | いま / コン·キン |
| 午 | noon | 낮, 정오 | ゴ |
| 前 | before, in front | 앞, 전 | まえ / ゼン |
| 後 | after, behind | 뒤, 나중 | のち·うし(ろ)·あと / ゴ·コウ |
| 毎 | every | 매, 마다 | マイ |

### Grade 2 · Weather, land and animals — 2학년 · 날씨·땅·동물 (21)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 雲 | cloud | 구름 | くも / ウン |
| 風 | wind | 바람 | かぜ / フウ |
| 雪 | snow | 눈 | ゆき / セツ |
| 晴 | clear up (weather) | 개다, 맑다 | は(れる) / セイ |
| 星 | star | 별 | ほし / セイ |
| 光 | light, shine | 빛, 빛나다 | ひかり·ひか(る) / コウ |
| 海 | sea | 바다 | うみ / カイ |
| 岩 | rock | 바위 | いわ / ガン |
| 谷 | valley | 골짜기 | たに / コク |
| 池 | pond | 연못 | いけ / チ |
| 原 | plain, field; origin | 들판; 근원 | はら / ゲン |
| 野 | field; wild | 들; 야생 | の / ヤ |
| 里 | village; ri (distance) | 마을; 리 | さと / リ |
| 地 | ground, land | 땅 | チ·ジ |
| 魚 | fish | 물고기 | さかな·うお / ギョ |
| 鳥 | bird | 새 | とり / チョウ |
| 牛 | cow, cattle | 소 | うし / ギュウ |
| 馬 | horse | 말 | うま / バ |
| 羽 | feather, wing | 깃, 날개 | は·はね / ウ |
| 角 | corner; horn | 모서리; 뿔 | かど·つの / カク |
| 毛 | hair, fur | 털 | け / モウ |

### Grade 2 · Family and the body — 2학년 · 가족과 몸 (15)

_Japanese splits siblings by age the way Korean does, and these are the four characters that do it._

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 父 | father | 아버지 | ちち / フ |
| 母 | mother | 어머니 | はは / ボ |
| 兄 | older brother | 형, 오빠 | あに / ケイ·キョウ |
| 姉 | older sister | 누나, 언니 | あね / シ |
| 弟 | younger brother | 남동생 | おとうと / テイ·ダイ |
| 妹 | younger sister | 여동생 | いもうと / マイ |
| 親 | parent; close | 부모; 친하다 | おや·した(しい) / シン |
| 友 | friend | 친구 | とも / ユウ |
| 自 | self | 스스로 | みずか(ら) / ジ·シ |
| 体 | body | 몸 | からだ / タイ·テイ |
| 顔 | face | 얼굴 | かお / ガン |
| 首 | neck; head, chief | 목; 우두머리 | くび / シュ |
| 頭 | head | 머리 | あたま / トウ·ズ |
| 心 | heart, mind | 마음 | こころ / シン |
| 声 | voice | 목소리 | こえ / セイ |

### Grade 2 · Town, home and things — 2학년 · 마을·집·사물 (33)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 家 | house, home; family | 집; 가족 | いえ·や / カ·ケ |
| 室 | room | 방, 실 | むろ / シツ |
| 戸 | door | 문, 지게문 | と / コ |
| 門 | gate | 문 | かど / モン |
| 台 | stand, platform; counter for machines | 대, 받침; ~대 | ダイ·タイ |
| 店 | shop | 가게 | みせ / テン |
| 市 | city; market | 시; 시장 | いち / シ |
| 場 | place, grounds | 장소 | ば / ジョウ |
| 社 | company; shrine | 회사; 신사 | やしろ / シャ |
| 寺 | temple | 절 | てら / ジ |
| 京 | capital city | 수도, 서울 | キョウ·ケイ |
| 国 | country | 나라 | くに / コク |
| 園 | garden, park | 동산, 정원 | その / エン |
| 道 | road, way | 길 | みち / ドウ |
| 内 | inside | 안 | うち / ナイ·ダイ |
| 工 | craft, construction | 장인, 공사 | コウ·ク |
| 公 | public, official | 공적인 | おおやけ / コウ |
| 線 | line | 선 | セン |
| 点 | point, dot, mark | 점 | テン |
| 紙 | paper | 종이 | かみ / シ |
| 図 | diagram, chart | 그림, 도표 | はか(る) / ズ·ト |
| 画 | picture; stroke of a kanji | 그림; 획 | ガ·カク |
| 絵 | drawing, painting | 그림 | カイ·エ |
| 汽 | steam | 증기 | キ |
| 電 | electricity | 전기 | デン |
| 船 | ship, boat | 배 | ふね / セン |
| 刀 | sword, blade | 칼 | かたな / トウ |
| 弓 | bow (archery) | 활 | ゆみ / キュウ |
| 矢 | arrow | 화살 | や / シ |
| 米 | rice; America | 쌀; 미국 | こめ / ベイ·マイ |
| 麦 | wheat, barley | 보리, 밀 | むぎ / バク |
| 肉 | meat | 고기 | ニク |
| 茶 | tea | 차 | チャ·サ |

### Grade 2 · Verbs of daily life — 2학년 · 일상 동사 (39)

_Each of these is the kanji inside a verb you already say — 食べる, 行く, 話す._

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 引 | pull | 끌다, 당기다 | ひ(く) / イン |
| 歌 | song, sing | 노래, 노래하다 | うた·うた(う) / カ |
| 回 | turn; a time, an occasion | 돌다; 회, 번 | まわ(る) / カイ |
| 会 | meet; meeting | 만나다; 모임 | あ(う) / カイ·エ |
| 活 | activity, living | 활동, 살다 | カツ |
| 記 | write down, record | 적다, 기록하다 | しる(す) / キ |
| 帰 | return, go home | 돌아가다 | かえ(る) / キ |
| 教 | teach | 가르치다 | おし(える) / キョウ |
| 計 | measure, count; plan | 재다, 헤아리다; 계획 | はか(る) / ケイ |
| 言 | say; word | 말하다; 말 | い(う)·こと / ゲン·ゴン |
| 語 | language; tell | 말, 언어; 이야기하다 | かた(る) / ゴ |
| 交 | mix, associate, exchange | 사귀다, 주고받다 | まじ(わる)·か(わす) / コウ |
| 考 | think over, consider | 생각하다 | かんが(える) / コウ |
| 行 | go; carry out; line | 가다; 행하다; 줄 | い(く)·おこな(う) / コウ·ギョウ |
| 合 | fit, match, join | 맞다, 합치다 | あ(う)·あ(わせる) / ゴウ |
| 作 | make | 만들다 | つく(る) / サク·サ |
| 止 | stop | 멈추다, 그만두다 | と(まる)·や(める) / シ |
| 思 | think, feel | 생각하다 | おも(う) / シ |
| 知 | know | 알다 | し(る) / チ |
| 書 | write | 쓰다 | か(く) / ショ |
| 食 | eat; food | 먹다; 음식 | た(べる)·く(う) / ショク |
| 走 | run | 달리다 | はし(る) / ソウ |
| 通 | pass through; commute | 통하다; 다니다 | とお(る)·かよ(う) / ツウ |
| 当 | hit the mark; be assigned | 맞다, 해당하다 | あ(たる) / トウ |
| 答 | answer | 답하다, 대답 | こた(える) / トウ |
| 読 | read | 읽다 | よ(む) / ドク·トウ |
| 聞 | hear, listen; ask | 듣다; 묻다 | き(く) / ブン·モン |
| 買 | buy | 사다 | か(う) / バイ |
| 売 | sell | 팔다 | う(る) / バイ |
| 歩 | walk | 걷다 | ある(く) / ホ·ブ |
| 用 | use; business to attend to | 쓰다; 용무 | もち(いる) / ヨウ |
| 来 | come | 오다 | く(る) / ライ |
| 話 | talk; story | 이야기하다; 이야기 | はな(す)·はなし / ワ |
| 鳴 | cry (of an animal), ring | 울다, 울리다 | な(く)·な(る) / メイ |
| 直 | fix, straighten; direct | 고치다, 곧다 | なお(す)·ただ(ちに) / チョク·ジキ |
| 組 | assemble; group, class | 짜다; 조, 반 | く(む)·くみ / ソ |
| 切 | cut; earnest | 자르다; 간절하다 | き(る) / セツ |
| 数 | number; count | 수; 세다 | かず·かぞ(える) / スウ |
| 算 | calculate, arithmetic | 계산, 셈 | サン |

### Grade 2 · Describing words and colours — 2학년 · 형용사와 색 (21)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 遠 | far | 멀다 | とお(い) / エン |
| 近 | near | 가깝다 | ちか(い) / キン |
| 強 | strong | 강하다 | つよ(い) / キョウ·ゴウ |
| 弱 | weak | 약하다 | よわ(い) / ジャク |
| 広 | wide, spacious | 넓다 | ひろ(い) / コウ |
| 高 | high; expensive | 높다; 비싸다 | たか(い) / コウ |
| 古 | old (of things) | 오래되다, 낡다 | ふる(い) / コ |
| 新 | new | 새롭다 | あたら(しい) / シン |
| 多 | many, much | 많다 | おお(い) / タ |
| 少 | few; a little | 적다; 조금 | すく(ない)·すこ(し) / ショウ |
| 太 | thick, fat | 굵다, 살찌다 | ふと(い) / タイ·タ |
| 細 | thin; fine, detailed | 가늘다; 자세하다 | ほそ(い)·こま(かい) / サイ |
| 長 | long; chief | 길다; 우두머리 | なが(い) / チョウ |
| 明 | bright; clear | 밝다; 분명하다 | あか(るい)·あ(ける) / メイ·ミョウ |
| 同 | same | 같다 | おな(じ) / ドウ |
| 楽 | enjoyable; music | 즐겁다; 음악 | たの(しい) / ガク·ラク |
| 丸 | round; circle | 둥글다; 동그라미 | まる(い) / ガン |
| 形 | shape, form | 모양 | かたち / ケイ·ギョウ |
| 色 | color | 색 | いろ / ショク·シキ |
| 黄 | yellow | 노랗다 | き / オウ·コウ |
| 黒 | black | 검다 | くろ(い) / コク |

### Grade 2 · Direction, counting and the rest — 2학년 · 방향·수량·그 밖 (14)

| kanji | English meaning | Korean meaning | kun / ON |
|---|---|---|---|
| 東 | east | 동쪽 | ひがし / トウ |
| 西 | west | 서쪽 | にし / セイ·サイ |
| 南 | south | 남쪽 | みなみ / ナン |
| 北 | north | 북쪽 | きた / ホク |
| 外 | outside; other | 바깥; 그 밖 | そと·ほか·はず(れる) / ガイ·ゲ |
| 方 | direction, side; way of doing | 쪽, 방향; ~하는 법 | かた / ホウ |
| 半 | half | 반 | なか(ば) / ハン |
| 番 | number in a series; turn | 번, 차례 | バン |
| 万 | ten thousand | 만 | マン·バン |
| 才 | talent; years of age | 재능; ~살 | サイ |
| 何 | what, how many | 무엇, 몇 | なに·なん / カ |
| 科 | department; school subject | 과, 과목 | カ |
| 元 | origin; former | 근원; 원래의 | もと / ゲン·ガン |
| 理 | reason, principle | 이치, 도리 | リ |
