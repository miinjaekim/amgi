import type { PackEntry, PackSection, VocabPack } from './packs';

/**
 * 教育漢字 grades 1–2 — the first 240 characters of the Japanese school
 * sequence.
 *
 * The school list rather than a JLPT tier, deliberately. N5's ~103 kanji is an
 * exam's slice of the same material and stops mid-way through the set every
 * Japanese child finishes by age eight; 学年別漢字配当表 is a real curriculum
 * with an order someone thought about, published by 文部科学省, and it is the
 * order every 漢字ドリル in Japan is built on. It also reaches the point where
 * kanji start compounding into each other (電車, 教室, asked-for 何曜日), which
 * 103 characters does not.
 *
 * **This is the one pack that is deliberately foundational**, and it does not
 * break the not-for-beginners rule the way a starter word list would. A script
 * is not a level: someone who can already hold a conversation in Japanese and
 * has both kana packs behind them still cannot read 一人 — the same reason the
 * kana packs ship. Kanji is the third rung of that same ladder, not a beginner
 * vocabulary deck.
 *
 * ## The back carries readings, which no other pack's back does
 *
 * Every other pack's back is a gloss, because for a word the gloss *is* the
 * answer. A kanji's meaning alone is not: 生 means "life" and tells you nothing
 * about how to say 学生, 生きる or 生ビール. So the back is
 * `meaning — kun / ON`, in the notation Japanese materials print:
 *
 * - **kun'yomi in hiragana**, with okurigana in parentheses — み(る), た(べる).
 *   The parenthesis is what separates the character's part from the ending, and
 *   a learner who has done kana can read it directly.
 * - **on'yomi in katakana**, `·` between two of them — ジン·ニン. Script alone
 *   says which kind of reading it is, so nothing needs labelling.
 * - Readings are pruned to the ones actually taught at this level. 生 has more
 *   than a dozen; four of them are what a second-grader is held to.
 * - A character with no everyday kun reading (百, 番, 茶) gets on'yomi only,
 *   rather than a reading that exists but is never met.
 *
 * That is why this pack is `layout: 'list'` while the kana packs are grids,
 * even though both are single glyphs. 「물 — みず / スイ」 does not fit in the
 * 4.5rem tile that makes 71 kana scannable. The cost is real and accepted: a
 * list deck is *not* hidden from the "All" chip on the card list, so 240 kanji
 * cards will sit alongside the user's own words there. The alternative — a grid
 * whose tile shows a truncated reading — makes the pack wrong on the page it
 * exists to be read on.
 *
 * ## Both backs are authored
 *
 * Unlike the TOEIC and TOPIK packs, whose study side occupies one of the two
 * back slots, a Japanese pack's study side is `japanese` and both backs are
 * readable — English for an English native, Korean for a Korean one. The
 * readings repeat verbatim across the pair, which looks like duplication and is
 * not: they are two whole strings, each one complete for the reader who gets
 * it, and `PackBack` has no third slot for a language-neutral fragment.
 *
 * Korean meanings follow the 훈음 a Korean reader already carries for the same
 * hanja where one exists (水 물 수 → 물), which is the whole advantage a Korean
 * native has coming into kanji. Where the Japanese meaning has drifted from the
 * Korean one the Japanese sense wins — 社 is 회사 first here, not 모일 사.
 *
 * Draft review: docs/packs/kanji-pack-draft.md
 */

/**
 * One character: the glyph, its English meaning, its Korean meaning, and the
 * readings the two backs share.
 *
 * A tuple rather than two authored `PackBack`s because the readings are the
 * half most likely to be wrong and the half that must not drift between the two
 * languages' backs. Authored once, assembled twice.
 */
type KanjiRow = readonly [
  kanji: string,
  english: string,
  korean: string,
  readings: string,
];

/** `meaning — readings`, or the bare meaning where a character has none listed. */
function toEntries(rows: readonly KanjiRow[]): PackEntry[] {
  return rows.map(([kanji, english, korean, readings]) => ({
    study: kanji,
    back: {
      English: readings ? `${english} — ${readings}` : english,
      Korean: readings ? `${korean} — ${readings}` : korean,
    },
  }));
}

// ---------------------------------------------------------------------------
// Grade 1 — 80 characters
// ---------------------------------------------------------------------------

const G1_NUMBERS: readonly KanjiRow[] = [
  ['一', 'one', '하나, 일', 'ひと(つ) / イチ·イツ'],
  ['二', 'two', '둘, 이', 'ふた(つ) / ニ'],
  ['三', 'three', '셋, 삼', 'みっ(つ) / サン'],
  ['四', 'four', '넷, 사', 'よっ(つ)·よん / シ'],
  ['五', 'five', '다섯, 오', 'いつ(つ) / ゴ'],
  ['六', 'six', '여섯, 육', 'むっ(つ) / ロク'],
  ['七', 'seven', '일곱, 칠', 'なな(つ) / シチ'],
  ['八', 'eight', '여덟, 팔', 'やっ(つ) / ハチ'],
  ['九', 'nine', '아홉, 구', 'ここの(つ) / キュウ·ク'],
  ['十', 'ten', '열, 십', 'とお / ジュウ·ジッ'],
  ['百', 'hundred', '백', 'ヒャク'],
  ['千', 'thousand', '천', 'ち / セン'],
  ['円', 'yen; round', '엔; 둥글다', 'まる(い) / エン'],
];

const G1_NATURE: readonly KanjiRow[] = [
  ['日', 'sun, day', '해, 날', 'ひ·か / ニチ·ジツ'],
  ['月', 'moon, month', '달', 'つき / ゲツ·ガツ'],
  ['火', 'fire', '불', 'ひ / カ'],
  ['水', 'water', '물', 'みず / スイ'],
  ['木', 'tree, wood', '나무', 'き / モク·ボク'],
  ['金', 'gold, money', '금, 돈', 'かね / キン·コン'],
  ['土', 'earth, soil', '흙', 'つち / ド·ト'],
  ['山', 'mountain', '산', 'やま / サン'],
  ['川', 'river', '내, 강', 'かわ / セン'],
  ['田', 'rice paddy', '논', 'た / デン'],
  ['天', 'heaven, sky', '하늘', 'あま / テン'],
  ['空', 'sky; empty', '하늘; 비다', 'そら·あ(く)·から / クウ'],
  ['雨', 'rain', '비', 'あめ / ウ'],
  ['石', 'stone', '돌', 'いし / セキ'],
  ['林', 'grove, woods', '수풀', 'はやし / リン'],
  ['森', 'forest', '숲', 'もり / シン'],
  ['草', 'grass', '풀', 'くさ / ソウ'],
  ['花', 'flower', '꽃', 'はな / カ'],
  ['竹', 'bamboo', '대나무', 'たけ / チク'],
  ['犬', 'dog', '개', 'いぬ / ケン'],
  ['虫', 'insect', '벌레', 'むし / チュウ'],
  ['貝', 'shellfish', '조개', 'かい / バイ'],
  ['玉', 'ball, jewel', '구슬', 'たま / ギョク'],
  ['糸', 'thread', '실', 'いと / シ'],
  ['青', 'blue', '파랗다, 푸르다', 'あお(い) / セイ'],
  ['赤', 'red', '빨갛다', 'あか(い) / セキ'],
  ['白', 'white', '희다', 'しろ(い) / ハク·ビャク'],
];

const G1_PEOPLE: readonly KanjiRow[] = [
  ['人', 'person', '사람', 'ひと / ジン·ニン'],
  ['女', 'woman', '여자', 'おんな·め / ジョ·ニョ'],
  ['男', 'man', '남자', 'おとこ / ダン·ナン'],
  ['子', 'child', '아이', 'こ / シ·ス'],
  ['王', 'king', '임금', 'オウ'],
  ['口', 'mouth', '입', 'くち / コウ·ク'],
  ['耳', 'ear', '귀', 'みみ / ジ'],
  ['手', 'hand', '손', 'て / シュ'],
  ['足', 'foot; be enough', '발; 충분하다', 'あし·た(りる) / ソク'],
  ['目', 'eye', '눈', 'め / モク·ボク'],
  ['名', 'name', '이름', 'な / メイ·ミョウ'],
  ['力', 'power, strength', '힘', 'ちから / リョク·リキ'],
  ['気', 'spirit, mood, air', '기운, 기분', 'キ·ケ'],
  ['音', 'sound', '소리', 'おと·ね / オン'],
];

const G1_SCHOOL: readonly KanjiRow[] = [
  ['学', 'study, learning', '배우다, 학문', 'まな(ぶ) / ガク'],
  ['校', 'school', '학교', 'コウ'],
  ['字', 'character, letter', '글자', 'ジ'],
  ['文', 'writing, sentence', '글', 'ふみ / ブン·モン'],
  ['本', 'book; origin', '책; 근본', 'もと / ホン'],
  ['見', 'see', '보다', 'み(る) / ケン'],
  ['出', 'go out, take out', '나가다, 내다', 'で(る)·だ(す) / シュツ'],
  ['入', 'enter, put in', '들어가다, 넣다', 'はい(る)·い(れる) / ニュウ'],
  ['立', 'stand', '서다', 'た(つ) / リツ'],
  ['休', 'rest, take a day off', '쉬다', 'やす(む) / キュウ'],
  ['正', 'correct', '바르다', 'ただ(しい) / セイ·ショウ'],
  ['生', 'life, be born; raw', '살다, 나다; 날것', 'い(きる)·う(まれる)·なま / セイ·ショウ'],
  ['先', 'ahead, previous', '먼저, 앞', 'さき / セン'],
  ['早', 'early; fast', '이르다; 빠르다', 'はや(い) / ソウ'],
  ['夕', 'evening', '저녁', 'ゆう / セキ'],
  ['年', 'year; age', '해; 나이', 'とし / ネン'],
  ['上', 'above, go up', '위, 오르다', 'うえ·あ(がる)·のぼ(る) / ジョウ'],
  ['下', 'below, go down', '아래, 내리다', 'した·さ(げる)·くだ(る) / カ·ゲ'],
  ['左', 'left', '왼쪽', 'ひだり / サ'],
  ['右', 'right', '오른쪽', 'みぎ / ウ·ユウ'],
  ['中', 'middle, inside', '가운데, 안', 'なか / チュウ'],
  ['大', 'big', '크다', 'おお(きい) / ダイ·タイ'],
  ['小', 'small', '작다', 'ちい(さい)·こ·お / ショウ'],
  ['町', 'town', '동네, 마을', 'まち / チョウ'],
  ['村', 'village', '마을', 'むら / ソン'],
  ['車', 'vehicle, car', '차, 수레', 'くるま / シャ'],
];

// ---------------------------------------------------------------------------
// Grade 2 — 160 characters
// ---------------------------------------------------------------------------

const G2_TIME: readonly KanjiRow[] = [
  ['春', 'spring', '봄', 'はる / シュン'],
  ['夏', 'summer', '여름', 'なつ / カ·ゲ'],
  ['秋', 'autumn', '가을', 'あき / シュウ'],
  ['冬', 'winter', '겨울', 'ふゆ / トウ'],
  ['朝', 'morning', '아침', 'あさ / チョウ'],
  ['昼', 'daytime, noon', '낮', 'ひる / チュウ'],
  ['夜', 'night', '밤', 'よる·よ / ヤ'],
  ['時', 'time; o’clock', '때; 시', 'とき / ジ'],
  ['間', 'interval, between', '사이', 'あいだ·ま / カン·ケン'],
  ['分', 'divide; minute; understand', '나누다; 분; 알다', 'わ(ける)·わ(かる) / ブン·フン·ブ'],
  ['週', 'week', '주', 'シュウ'],
  ['曜', 'day of the week', '요일', 'ヨウ'],
  ['今', 'now', '지금', 'いま / コン·キン'],
  ['午', 'noon', '낮, 정오', 'ゴ'],
  ['前', 'before, in front', '앞, 전', 'まえ / ゼン'],
  ['後', 'after, behind', '뒤, 나중', 'のち·うし(ろ)·あと / ゴ·コウ'],
  ['毎', 'every', '매, 마다', 'マイ'],
];

const G2_NATURE: readonly KanjiRow[] = [
  ['雲', 'cloud', '구름', 'くも / ウン'],
  ['風', 'wind', '바람', 'かぜ / フウ'],
  ['雪', 'snow', '눈', 'ゆき / セツ'],
  ['晴', 'clear up (weather)', '개다, 맑다', 'は(れる) / セイ'],
  ['星', 'star', '별', 'ほし / セイ'],
  ['光', 'light, shine', '빛, 빛나다', 'ひかり·ひか(る) / コウ'],
  ['海', 'sea', '바다', 'うみ / カイ'],
  ['岩', 'rock', '바위', 'いわ / ガン'],
  ['谷', 'valley', '골짜기', 'たに / コク'],
  ['池', 'pond', '연못', 'いけ / チ'],
  ['原', 'plain, field; origin', '들판; 근원', 'はら / ゲン'],
  ['野', 'field; wild', '들; 야생', 'の / ヤ'],
  ['里', 'village; ri (distance)', '마을; 리', 'さと / リ'],
  ['地', 'ground, land', '땅', 'チ·ジ'],
  ['魚', 'fish', '물고기', 'さかな·うお / ギョ'],
  ['鳥', 'bird', '새', 'とり / チョウ'],
  ['牛', 'cow, cattle', '소', 'うし / ギュウ'],
  ['馬', 'horse', '말', 'うま / バ'],
  ['羽', 'feather, wing', '깃, 날개', 'は·はね / ウ'],
  ['角', 'corner; horn', '모서리; 뿔', 'かど·つの / カク'],
  ['毛', 'hair, fur', '털', 'け / モウ'],
];

const G2_PEOPLE: readonly KanjiRow[] = [
  ['父', 'father', '아버지', 'ちち / フ'],
  ['母', 'mother', '어머니', 'はは / ボ'],
  ['兄', 'older brother', '형, 오빠', 'あに / ケイ·キョウ'],
  ['姉', 'older sister', '누나, 언니', 'あね / シ'],
  ['弟', 'younger brother', '남동생', 'おとうと / テイ·ダイ'],
  ['妹', 'younger sister', '여동생', 'いもうと / マイ'],
  ['親', 'parent; close', '부모; 친하다', 'おや·した(しい) / シン'],
  ['友', 'friend', '친구', 'とも / ユウ'],
  ['自', 'self', '스스로', 'みずか(ら) / ジ·シ'],
  ['体', 'body', '몸', 'からだ / タイ·テイ'],
  ['顔', 'face', '얼굴', 'かお / ガン'],
  ['首', 'neck; head, chief', '목; 우두머리', 'くび / シュ'],
  ['頭', 'head', '머리', 'あたま / トウ·ズ'],
  ['心', 'heart, mind', '마음', 'こころ / シン'],
  ['声', 'voice', '목소리', 'こえ / セイ'],
];

const G2_PLACES: readonly KanjiRow[] = [
  ['家', 'house, home; family', '집; 가족', 'いえ·や / カ·ケ'],
  ['室', 'room', '방, 실', 'むろ / シツ'],
  ['戸', 'door', '문, 지게문', 'と / コ'],
  ['門', 'gate', '문', 'かど / モン'],
  ['台', 'stand, platform; counter for machines', '대, 받침; ~대', 'ダイ·タイ'],
  ['店', 'shop', '가게', 'みせ / テン'],
  ['市', 'city; market', '시; 시장', 'いち / シ'],
  ['場', 'place, grounds', '장소', 'ば / ジョウ'],
  ['社', 'company; shrine', '회사; 신사', 'やしろ / シャ'],
  ['寺', 'temple', '절', 'てら / ジ'],
  ['京', 'capital city', '수도, 서울', 'キョウ·ケイ'],
  ['国', 'country', '나라', 'くに / コク'],
  ['園', 'garden, park', '동산, 정원', 'その / エン'],
  ['道', 'road, way', '길', 'みち / ドウ'],
  ['内', 'inside', '안', 'うち / ナイ·ダイ'],
  ['工', 'craft, construction', '장인, 공사', 'コウ·ク'],
  ['公', 'public, official', '공적인', 'おおやけ / コウ'],
  ['線', 'line', '선', 'セン'],
  ['点', 'point, dot, mark', '점', 'テン'],
  ['紙', 'paper', '종이', 'かみ / シ'],
  ['図', 'diagram, chart', '그림, 도표', 'はか(る) / ズ·ト'],
  ['画', 'picture; stroke of a kanji', '그림; 획', 'ガ·カク'],
  ['絵', 'drawing, painting', '그림', 'カイ·エ'],
  ['汽', 'steam', '증기', 'キ'],
  ['電', 'electricity', '전기', 'デン'],
  ['船', 'ship, boat', '배', 'ふね / セン'],
  ['刀', 'sword, blade', '칼', 'かたな / トウ'],
  ['弓', 'bow (archery)', '활', 'ゆみ / キュウ'],
  ['矢', 'arrow', '화살', 'や / シ'],
  ['米', 'rice; America', '쌀; 미국', 'こめ / ベイ·マイ'],
  ['麦', 'wheat, barley', '보리, 밀', 'むぎ / バク'],
  ['肉', 'meat', '고기', 'ニク'],
  ['茶', 'tea', '차', 'チャ·サ'],
];

const G2_VERBS: readonly KanjiRow[] = [
  ['引', 'pull', '끌다, 당기다', 'ひ(く) / イン'],
  ['歌', 'song, sing', '노래, 노래하다', 'うた·うた(う) / カ'],
  ['回', 'turn; a time, an occasion', '돌다; 회, 번', 'まわ(る) / カイ'],
  ['会', 'meet; meeting', '만나다; 모임', 'あ(う) / カイ·エ'],
  ['活', 'activity, living', '활동, 살다', 'カツ'],
  ['記', 'write down, record', '적다, 기록하다', 'しる(す) / キ'],
  ['帰', 'return, go home', '돌아가다', 'かえ(る) / キ'],
  ['教', 'teach', '가르치다', 'おし(える) / キョウ'],
  ['計', 'measure, count; plan', '재다, 헤아리다; 계획', 'はか(る) / ケイ'],
  ['言', 'say; word', '말하다; 말', 'い(う)·こと / ゲン·ゴン'],
  ['語', 'language; tell', '말, 언어; 이야기하다', 'かた(る) / ゴ'],
  ['交', 'mix, associate, exchange', '사귀다, 주고받다', 'まじ(わる)·か(わす) / コウ'],
  ['考', 'think over, consider', '생각하다', 'かんが(える) / コウ'],
  ['行', 'go; carry out; line', '가다; 행하다; 줄', 'い(く)·おこな(う) / コウ·ギョウ'],
  ['合', 'fit, match, join', '맞다, 합치다', 'あ(う)·あ(わせる) / ゴウ'],
  ['作', 'make', '만들다', 'つく(る) / サク·サ'],
  ['止', 'stop', '멈추다, 그만두다', 'と(まる)·や(める) / シ'],
  ['思', 'think, feel', '생각하다', 'おも(う) / シ'],
  ['知', 'know', '알다', 'し(る) / チ'],
  ['書', 'write', '쓰다', 'か(く) / ショ'],
  ['食', 'eat; food', '먹다; 음식', 'た(べる)·く(う) / ショク'],
  ['走', 'run', '달리다', 'はし(る) / ソウ'],
  ['通', 'pass through; commute', '통하다; 다니다', 'とお(る)·かよ(う) / ツウ'],
  ['当', 'hit the mark; be assigned', '맞다, 해당하다', 'あ(たる) / トウ'],
  ['答', 'answer', '답하다, 대답', 'こた(える) / トウ'],
  ['読', 'read', '읽다', 'よ(む) / ドク·トウ'],
  ['聞', 'hear, listen; ask', '듣다; 묻다', 'き(く) / ブン·モン'],
  ['買', 'buy', '사다', 'か(う) / バイ'],
  ['売', 'sell', '팔다', 'う(る) / バイ'],
  ['歩', 'walk', '걷다', 'ある(く) / ホ·ブ'],
  ['用', 'use; business to attend to', '쓰다; 용무', 'もち(いる) / ヨウ'],
  ['来', 'come', '오다', 'く(る) / ライ'],
  ['話', 'talk; story', '이야기하다; 이야기', 'はな(す)·はなし / ワ'],
  ['鳴', 'cry (of an animal), ring', '울다, 울리다', 'な(く)·な(る) / メイ'],
  ['直', 'fix, straighten; direct', '고치다, 곧다', 'なお(す)·ただ(ちに) / チョク·ジキ'],
  ['組', 'assemble; group, class', '짜다; 조, 반', 'く(む)·くみ / ソ'],
  ['切', 'cut; earnest', '자르다; 간절하다', 'き(る) / セツ'],
  ['数', 'number; count', '수; 세다', 'かず·かぞ(える) / スウ'],
  ['算', 'calculate, arithmetic', '계산, 셈', 'サン'],
];

const G2_DESCRIBING: readonly KanjiRow[] = [
  ['遠', 'far', '멀다', 'とお(い) / エン'],
  ['近', 'near', '가깝다', 'ちか(い) / キン'],
  ['強', 'strong', '강하다', 'つよ(い) / キョウ·ゴウ'],
  ['弱', 'weak', '약하다', 'よわ(い) / ジャク'],
  ['広', 'wide, spacious', '넓다', 'ひろ(い) / コウ'],
  ['高', 'high; expensive', '높다; 비싸다', 'たか(い) / コウ'],
  ['古', 'old (of things)', '오래되다, 낡다', 'ふる(い) / コ'],
  ['新', 'new', '새롭다', 'あたら(しい) / シン'],
  ['多', 'many, much', '많다', 'おお(い) / タ'],
  ['少', 'few; a little', '적다; 조금', 'すく(ない)·すこ(し) / ショウ'],
  ['太', 'thick, fat', '굵다, 살찌다', 'ふと(い) / タイ·タ'],
  ['細', 'thin; fine, detailed', '가늘다; 자세하다', 'ほそ(い)·こま(かい) / サイ'],
  ['長', 'long; chief', '길다; 우두머리', 'なが(い) / チョウ'],
  ['明', 'bright; clear', '밝다; 분명하다', 'あか(るい)·あ(ける) / メイ·ミョウ'],
  ['同', 'same', '같다', 'おな(じ) / ドウ'],
  ['楽', 'enjoyable; music', '즐겁다; 음악', 'たの(しい) / ガク·ラク'],
  ['丸', 'round; circle', '둥글다; 동그라미', 'まる(い) / ガン'],
  ['形', 'shape, form', '모양', 'かたち / ケイ·ギョウ'],
  ['色', 'color', '색', 'いろ / ショク·シキ'],
  ['黄', 'yellow', '노랗다', 'き / オウ·コウ'],
  ['黒', 'black', '검다', 'くろ(い) / コク'],
];

const G2_REST: readonly KanjiRow[] = [
  ['東', 'east', '동쪽', 'ひがし / トウ'],
  ['西', 'west', '서쪽', 'にし / セイ·サイ'],
  ['南', 'south', '남쪽', 'みなみ / ナン'],
  ['北', 'north', '북쪽', 'きた / ホク'],
  ['外', 'outside; other', '바깥; 그 밖', 'そと·ほか·はず(れる) / ガイ·ゲ'],
  ['方', 'direction, side; way of doing', '쪽, 방향; ~하는 법', 'かた / ホウ'],
  ['半', 'half', '반', 'なか(ば) / ハン'],
  ['番', 'number in a series; turn', '번, 차례', 'バン'],
  ['万', 'ten thousand', '만', 'マン·バン'],
  ['才', 'talent; years of age', '재능; ~살', 'サイ'],
  ['何', 'what, how many', '무엇, 몇', 'なに·なん / カ'],
  ['科', 'department; school subject', '과, 과목', 'カ'],
  ['元', 'origin; former', '근원; 원래의', 'もと / ゲン·ガン'],
  ['理', 'reason, principle', '이치, 도리', 'リ'],
];

const SECTIONS: PackSection[] = [
  {
    id: 'g1-numbers',
    name: { English: 'Grade 1 · Numbers and money', Korean: '1학년 · 숫자와 돈' },
    note: {
      English: 'The counting kanji, which compound with almost everything else in the pack.',
      Korean: '숫자 한자 — 이 팩의 거의 모든 글자와 결합하는 기초예요.',
    },
    entries: toEntries(G1_NUMBERS),
  },
  {
    id: 'g1-nature',
    name: { English: 'Grade 1 · Nature and the world', Korean: '1학년 · 자연과 사물' },
    note: {
      English: 'The pictographs — the characters that still look like the thing they mean.',
      Korean: '상형문자 — 뜻하는 사물의 모양이 아직 그대로 남아 있는 글자들이에요.',
    },
    entries: toEntries(G1_NATURE),
  },
  {
    id: 'g1-people',
    name: { English: 'Grade 1 · People and the body', Korean: '1학년 · 사람과 몸' },
    entries: toEntries(G1_PEOPLE),
  },
  {
    id: 'g1-school',
    name: { English: 'Grade 1 · School, place and direction', Korean: '1학년 · 학교·위치·방향' },
    entries: toEntries(G1_SCHOOL),
  },
  {
    id: 'g2-time',
    name: { English: 'Grade 2 · Time and the calendar', Korean: '2학년 · 시간과 달력' },
    note: {
      English: 'Where the compounds start: 何曜日, 午前, 時間 are all built from this section.',
      Korean: '숙어가 시작되는 곳 — 何曜日·午前·時間이 모두 이 단원의 글자로 만들어져요.',
    },
    entries: toEntries(G2_TIME),
  },
  {
    id: 'g2-nature',
    name: { English: 'Grade 2 · Weather, land and animals', Korean: '2학년 · 날씨·땅·동물' },
    entries: toEntries(G2_NATURE),
  },
  {
    id: 'g2-people',
    name: { English: 'Grade 2 · Family and the body', Korean: '2학년 · 가족과 몸' },
    note: {
      English: 'Japanese splits siblings by age the way Korean does, and these are the four characters that do it.',
      Korean: '일본어도 한국어처럼 손위·손아래 형제를 구분해요. 그 네 글자가 여기 있어요.',
    },
    entries: toEntries(G2_PEOPLE),
  },
  {
    id: 'g2-places',
    name: { English: 'Grade 2 · Town, home and things', Korean: '2학년 · 마을·집·사물' },
    entries: toEntries(G2_PLACES),
  },
  {
    id: 'g2-verbs',
    name: { English: 'Grade 2 · Verbs of daily life', Korean: '2학년 · 일상 동사' },
    note: {
      English: 'Each of these is the kanji inside a verb you already say — 食べる, 行く, 話す.',
      Korean: '이미 쓰고 있는 동사 안의 한자예요 — 食べる, 行く, 話す.',
    },
    entries: toEntries(G2_VERBS),
  },
  {
    id: 'g2-describing',
    name: { English: 'Grade 2 · Describing words and colours', Korean: '2학년 · 형용사와 색' },
    entries: toEntries(G2_DESCRIBING),
  },
  {
    id: 'g2-rest',
    name: { English: 'Grade 2 · Direction, counting and the rest', Korean: '2학년 · 방향·수량·그 밖' },
    entries: toEntries(G2_REST),
  },
];

export const KANJI_GRADE_1_2_PACK: VocabPack = {
  id: 'kanji-grade-1-2',
  name: { English: 'Kanji · School Grades 1–2', Korean: '한자 · 초등 1·2학년' },
  description: {
    English:
      'The first 240 kanji of the Japanese school sequence (教育漢字, grades 1–2), each with its meaning and the kun and on readings taught with it.',
    Korean:
      '일본 초등학교에서 배우는 순서 그대로, 1·2학년 교육한자 240자 — 뜻과 함께 훈독·음독까지.',
  },
  // A list, not the kana grid: 「물 — みず / スイ」 does not fit a 4.5rem tile.
  // See the header comment for what that costs on the card list.
  layout: 'list',
  sections: SECTIONS,
};
