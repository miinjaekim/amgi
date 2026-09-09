import type { PackEntry, PackSection, VocabPack } from './packs';
import { hunEum } from './types';

/**
 * 전국한자능력검정시험 배정한자, 8급 through 6급 — 300 characters over five
 * subpacks, in the order 한국어문회 assigns them.
 *
 * **A published curriculum, which is the only reason a level ladder is here at
 * all.** [vision.md](../../../.scratchpad/vision.md) refuses per-level content
 * that is structure for its own sake; it allows a ladder that comes from
 * somewhere real and that a learner can point at from outside. A 급수 is both —
 * it is the rung people actually sit an exam for — and it is the same argument
 * the kanji pack made for 학년별한자배당표 over a JLPT tier.
 *
 * **Levels are cumulative; sections are not.** 8급's characters are on the 7급
 * exam too, but a section here holds only what is *newly assigned* at that
 * level. That is what keeps a term in exactly one section of its pack, which is
 * the invariant `scripts/remap-pack-subpacks.ts` derives a card's subpack from
 * and `collections.test.ts` pins.
 *
 * **Stops at 6급 deliberately.** The ladder runs to 1급 and passes 1,000
 * characters by 4급; anything past 6급 needs its own case made, like any pack.
 *
 * ## Four authored parts, not two backs
 *
 * `PackBack` has two slots for two *languages*, and a hanja card needs 한자, 훈,
 * 음 and an English meaning — 훈음 being one language in two parts. So `hun` and
 * `eum` are their own fields on the entry and `back.Korean` is **derived** from
 * them by `hunEum()` in `toEntries` below, never typed twice.
 *
 * ## Sources
 *
 * 한국어문회's own 배정한자 XLS for the characters, their levels and their
 * 대표훈음; Unicode Unihan corroborating all 300 음 with no exceptions, and
 * supplying the English where this repo's kanji pack does not already carry a
 * reviewed one. Per-entry tiers, the 13 sense overrides, and the one row whose
 * English is still unsourced are all in the draft — read it before changing a
 * gloss, and hand *it* to a reviewer rather than this file.
 *
 * Draft review: docs/packs/hanja-geupsu-pack-draft.md
 */

/**
 * One character: the glyph, its 훈, its 음, its English meaning, and the other
 * 훈음 어문회 assigns it, if any.
 *
 * A tuple rather than an authored `PackEntry` for the reason the kanji pack
 * uses one: the parts that must not drift are authored once and assembled
 * here, in a single place.
 */
type HanjaRow = readonly [
  hanja: string,
  hun: string,
  eum: string,
  english: string,
  /** Secondary 훈음, for the eleven characters that carry more than one. */
  also?: string,
];

/**
 * The card teaches the 대표훈음 — the reading the exam prints — and any others
 * ride in `context`, which is carried onto the saved card as `briefDefinition`.
 *
 * Separate cards per reading was refused: two cards with 樂 on the front is the
 * same study side twice in one deck, which breaks the one-section invariant and
 * would make the deck's own progress count disagree with itself.
 */
function toEntries(rows: readonly HanjaRow[]): PackEntry[] {
  return rows.map(([hanja, hun, eum, english, also]) => ({
    study: hanja,
    hun,
    eum,
    // Korean is the 훈음 assembled from the two fields above — the one place
    // that join happens for a pack, matching what `hunEum()` writes onto a card.
    back: { English: english, Korean: hunEum({ hun, eum }) },
    ...(also ? { context: `${hun} ${eum} — 또한 ${also}` } : {}),
  }));
}


// --------------------------------------------------------------------------
// 8급 — 50 characters newly assigned
// --------------------------------------------------------------------------

const GEUP8_ROWS: readonly HanjaRow[] = [
  ['校', '학교', '교', 'school'],
  ['敎', '가르칠', '교', 'teach'],
  ['九', '아홉', '구', 'nine'],
  ['國', '나라', '국', 'country'],
  ['軍', '군사', '군', 'army, military'],
  ['金', '쇠', '금', 'gold, money', '성(姓) 김'],
  ['南', '남녘', '남', 'south'],
  ['女', '계집', '녀', 'woman'],
  ['年', '해', '년', 'year; age'],
  ['大', '큰', '대', 'big'],
  ['東', '동녘', '동', 'east'],
  ['六', '여섯', '륙', 'six'],
  ['萬', '일만', '만', 'ten thousand'],
  ['母', '어미', '모', 'mother'],
  ['木', '나무', '목', 'tree, wood'],
  ['門', '문', '문', 'gate'],
  ['民', '백성', '민', 'people, subjects'],
  ['白', '흰', '백', 'white'],
  ['父', '아비', '부', 'father'],
  ['北', '북녘', '북', 'north', '달아날 배'],
  ['四', '넉', '사', 'four'],
  ['山', '메', '산', 'mountain'],
  ['三', '석', '삼', 'three'],
  ['生', '날', '생', 'life, be born; raw'],
  ['西', '서녘', '서', 'west'],
  ['先', '먼저', '선', 'ahead, previous'],
  ['小', '작을', '소', 'small'],
  ['水', '물', '수', 'water'],
  ['室', '집', '실', 'room'],
  ['十', '열', '십', 'ten'],
  ['五', '다섯', '오', 'five'],
  ['王', '임금', '왕', 'king'],
  ['外', '바깥', '외', 'outside; other'],
  ['月', '달', '월', 'moon, month'],
  ['二', '두', '이', 'two'],
  ['人', '사람', '인', 'person'],
  ['一', '한', '일', 'one'],
  ['日', '날', '일', 'sun, day'],
  ['長', '긴', '장', 'long; chief'],
  ['弟', '아우', '제', 'younger brother'],
  ['中', '가운데', '중', 'middle, inside'],
  ['靑', '푸를', '청', 'blue, green'],
  ['寸', '마디', '촌', 'inch'],
  ['七', '일곱', '칠', 'seven'],
  ['土', '흙', '토', 'earth, soil'],
  ['八', '여덟', '팔', 'eight'],
  ['學', '배울', '학', 'study, learning'],
  ['韓', '한국, 나라', '한', 'Korea'],
  ['兄', '형', '형', 'older brother'],
  ['火', '불', '화', 'fire'],
];

// --------------------------------------------------------------------------
// 7급Ⅱ — 50 characters newly assigned
// --------------------------------------------------------------------------

const GEUP7II_ROWS: readonly HanjaRow[] = [
  ['家', '집', '가', 'house, home; family'],
  ['間', '사이', '간', 'interval, between'],
  ['江', '강', '강', 'large river'],
  ['車', '수레', '거', 'vehicle, car', '수레 차'],
  ['工', '장인', '공', 'craft, construction'],
  ['空', '빌', '공', 'sky; empty'],
  ['氣', '기운', '기', 'air, gas'],
  ['記', '기록할', '기', 'write down, record'],
  ['男', '사내', '남', 'man'],
  ['內', '안', '내', 'inside'],
  ['農', '농사', '농', 'agriculture, farming'],
  ['答', '대답', '답', 'answer'],
  ['道', '길', '도', 'road, way'],
  ['動', '움직일', '동', 'move, happen'],
  ['力', '힘', '력', 'power, strength'],
  ['立', '설', '립', 'stand'],
  ['每', '매양', '매', 'every, each'],
  ['名', '이름', '명', 'name'],
  ['物', '물건', '물', 'thing, substance'],
  ['方', '모[棱]', '방', 'direction, side; way of doing'],
  ['不', '아닐', '불', 'no, not'],
  ['事', '일', '사', 'affair, matter'],
  ['上', '윗', '상', 'above, go up'],
  ['姓', '성', '성', 'one\'s family name'],
  ['世', '인간', '세', 'generation; world'],
  ['手', '손', '수', 'hand'],
  ['時', '때', '시', 'time; o’clock'],
  ['市', '저자', '시', 'city; market'],
  ['食', '밥, 먹을', '식', 'eat; food'],
  ['安', '편안', '안', 'peaceful, tranquil'],
  ['午', '낮', '오', 'noon'],
  ['右', '오를, 오른(쪽)', '우', 'right'],
  ['子', '아들', '자', 'child'],
  ['自', '스스로', '자', 'self'],
  ['場', '마당', '장', 'place, grounds'],
  ['電', '번개', '전', 'electricity'],
  ['前', '앞', '전', 'before, in front'],
  ['全', '온전', '전', 'maintain, keep whole or intact'],
  ['正', '바를', '정', 'correct'],
  ['足', '발', '족', 'foot; be enough'],
  ['左', '왼', '좌', 'left'],
  ['直', '곧을', '직', 'fix, straighten; direct'],
  ['平', '평평할', '평', 'flat, level'],
  ['下', '아래', '하', 'below, go down'],
  ['漢', '한수, 한나라', '한', 'the Chinese people, Chinese language'],
  ['海', '바다', '해', 'sea'],
  ['話', '말씀', '화', 'talk; story'],
  ['活', '살', '활', 'activity, living'],
  ['孝', '효도', '효', 'filial piety, obedience'],
  ['後', '뒤', '후', 'after, behind'],
];

// --------------------------------------------------------------------------
// 7급 — 50 characters newly assigned
// --------------------------------------------------------------------------

const GEUP7_ROWS: readonly HanjaRow[] = [
  ['歌', '노래', '가', 'song, sing'],
  ['口', '입', '구', 'mouth'],
  ['旗', '기', '기', 'banner, flag'],
  ['同', '한가지', '동', 'same'],
  ['洞', '골', '동', 'cave, grotto', '밝을 통'],
  ['冬', '겨울', '동', 'winter'],
  ['登', '오를', '등', 'rise, mount'],
  ['來', '올', '래', 'come'],
  ['老', '늙을', '로', 'old, aged'],
  ['里', '마을', '리', 'village; ri (distance)'],
  ['林', '수풀', '림', 'grove, woods'],
  ['面', '낯', '면', 'face; surface'],
  ['命', '목숨', '명', 'life'],
  ['文', '글월', '문', 'writing, sentence'],
  ['問', '물을', '문', 'ask, inquire after'],
  ['百', '일백', '백', 'hundred'],
  ['夫', '지아비', '부', 'man, male adult'],
  ['算', '셈', '산', 'calculate, arithmetic'],
  ['色', '빛', '색', 'color'],
  ['夕', '저녁', '석', 'evening'],
  ['少', '적을', '소', 'few; a little'],
  ['所', '바', '소', 'place, location'],
  ['數', '셈', '수', 'number; count'],
  ['植', '심을', '식', 'plant, trees'],
  ['心', '마음', '심', 'heart, mind'],
  ['語', '말씀', '어', 'language; tell'],
  ['然', '그럴', '연', 'yes, certainly'],
  ['有', '있을', '유', 'have, own'],
  ['育', '기를', '육', 'produce, give birth to'],
  ['邑', '고을', '읍', 'area; district'],
  ['入', '들', '입', 'enter, put in'],
  ['字', '글자', '자', 'character, letter'],
  ['祖', '할아비', '조', 'ancestor, forefather'],
  ['住', '살', '주', 'reside, live at'],
  ['主', '임금, 주인', '주', 'master, chief owner'],
  ['重', '무거울', '중', 'heavy, weighty'],
  ['紙', '종이', '지', 'paper'],
  ['地', '따', '지', 'ground, land'],
  ['千', '일천', '천', 'thousand'],
  ['天', '하늘', '천', 'heaven, sky'],
  ['川', '내', '천', 'river'],
  ['草', '풀', '초', 'grass'],
  ['村', '마을', '촌', 'village'],
  ['秋', '가을', '추', 'autumn'],
  ['春', '봄', '춘', 'spring'],
  ['出', '날[生]', '출', 'go out, take out'],
  ['便', '편할', '편', 'convenience, ease', '똥오줌 변'],
  ['夏', '여름', '하', 'summer'],
  ['花', '꽃', '화', 'flower'],
  ['休', '쉴', '휴', 'rest, take a day off'],
];

// --------------------------------------------------------------------------
// 6급Ⅱ — 75 characters newly assigned
// --------------------------------------------------------------------------

const GEUP6II_ROWS: readonly HanjaRow[] = [
  ['各', '각각', '각', 'each, individually'],
  ['角', '뿔', '각', 'corner; horn'],
  ['界', '지경', '계', 'boundary, limit'],
  ['計', '셀', '계', 'measure, count; plan'],
  ['高', '높을', '고', 'high; expensive'],
  ['公', '공평할', '공', 'public, official'],
  ['共', '한가지', '공', 'together with, all'],
  ['功', '공[勳]', '공', 'achievement, merit'],
  ['果', '실과', '과', 'fruit; result'],
  ['科', '과목', '과', 'department; school subject'],
  ['光', '빛', '광', 'light, shine'],
  ['球', '공', '구', 'ball, sphere'],
  ['今', '이제', '금', 'now'],
  ['急', '급할', '급', 'quick, quickly'],
  ['短', '짧을', '단', 'short; brief'],
  ['堂', '집', '당', 'hall; government office'],
  ['代', '대신할', '대', 'replace'],
  ['對', '대할', '대', 'facing, opposed'],
  ['圖', '그림', '도', 'diagram'],
  ['讀', '읽을', '독', 'read, study', '구절 두'],
  ['童', '아이', '동', 'child, boy'],
  ['等', '무리', '등', 'rank, grade'],
  ['樂', '즐길', '락', 'happy, glad', '노래 악, 좋아할 요'],
  ['利', '이할', '리', 'gains, advantage'],
  ['理', '다스릴', '리', 'reason, principle'],
  ['明', '밝을', '명', 'bright; clear'],
  ['聞', '들을', '문', 'hear, listen; ask'],
  ['半', '반(半)', '반', 'half'],
  ['反', '돌이킬, 돌아올', '반', 'reverse, opposite'],
  ['班', '나눌', '반', 'class, group'],
  ['發', '필', '발', 'issue, dispatch'],
  ['放', '놓을', '방', 'put, release'],
  ['部', '떼', '부', 'part, division'],
  ['分', '나눌', '분', 'divide; minute; understand'],
  ['社', '모일', '사', 'company; shrine'],
  ['書', '글', '서', 'write'],
  ['線', '줄', '선', 'line'],
  ['雪', '눈', '설', 'snow'],
  ['成', '이룰', '성', 'completed, finished'],
  ['省', '살필', '성', 'province', '덜 생'],
  ['消', '사라질', '소', 'vanish, die out'],
  ['術', '재주', '술', 'art, skill'],
  ['始', '비로소', '시', 'begin, start'],
  ['身', '몸', '신', 'body'],
  ['神', '귀신', '신', 'spirit, god'],
  ['信', '믿을', '신', 'trust, believe'],
  ['新', '새', '신', 'new'],
  ['弱', '약할', '약', 'weak'],
  ['藥', '약', '약', 'drugs, pharmaceuticals'],
  ['業', '업', '업', 'profession, business'],
  ['勇', '날랠', '용', 'brave, courageous'],
  ['用', '쓸', '용', 'use; business to attend to'],
  ['運', '옮길', '운', 'luck, fortune'],
  ['音', '소리', '음', 'sound'],
  ['飮', '마실', '음', 'drink; swallow'],
  ['意', '뜻', '의', 'thought, idea'],
  ['作', '지을', '작', 'make'],
  ['昨', '어제', '작', 'yesterday'],
  ['才', '재주', '재', 'talent; years of age'],
  ['戰', '싸움', '전', 'war, fighting'],
  ['庭', '뜰', '정', 'courtyard'],
  ['第', '차례', '제', 'sequence, number'],
  ['題', '제목', '제', 'title, headline'],
  ['注', '부을', '주', 'concentrate, focus'],
  ['集', '모을', '집', 'assemble, collect together'],
  ['窓', '창', '창', 'window'],
  ['淸', '맑을', '청', 'clear'],
  ['體', '몸', '체', 'body'],
  ['表', '겉', '표', 'show, express'],
  ['風', '바람', '풍', 'wind'],
  ['幸', '다행', '행', 'luck, favor'],
  ['現', '나타날', '현', 'appear, manifest'],
  ['形', '모양', '형', 'shape, form'],
  ['和', '화할', '화', 'harmony, peace'],
  ['會', '모일', '회', 'meet; meeting'],
];

// --------------------------------------------------------------------------
// 6급 — 75 characters newly assigned
// --------------------------------------------------------------------------

const GEUP6_ROWS: readonly HanjaRow[] = [
  ['感', '느낄', '감', 'feel, perceive'],
  ['強', '강할', '강', 'strong'],
  ['開', '열', '개', 'open'],
  ['京', '서울', '경', 'capital city'],
  ['古', '예', '고', 'old (of things)'],
  ['苦', '쓸[味覺]', '고', 'bitter'],
  ['交', '사귈', '교', 'mix, associate, exchange'],
  ['區', '구분할, 지경', '구', 'area, district'],
  ['郡', '고을', '군', 'administrative division'],
  ['根', '뿌리', '근', 'root, base'],
  ['近', '가까울', '근', 'near'],
  ['級', '등급', '급', 'level, rank'],
  ['多', '많을', '다', 'many, much'],
  ['待', '기다릴', '대', 'wait'],
  ['度', '법도', '도', 'degree, system', '헤아릴 탁'],
  ['頭', '머리', '두', 'head'],
  ['例', '법식', '례', 'precedent, example'],
  ['禮', '예도', '례', 'social custom; manners'],
  ['路', '길', '로', 'road, path'],
  ['綠', '푸를', '록', 'green'],
  ['李', '오얏, 성(姓)', '리', 'plum'],
  ['目', '눈', '목', 'eye'],
  ['美', '아름다울', '미', 'beautiful, pretty'],
  ['米', '쌀', '미', 'rice; America'],
  ['朴', '성(姓)', '박', 'simple, unadorned'],
  ['番', '차례', '번', 'number in a series; turn'],
  ['別', '다를, 나눌', '별', 'separate, other'],
  ['病', '병', '병', 'illness, sickness'],
  ['服', '옷', '복', 'clothes'],
  ['本', '근본', '본', 'book; origin'],
  ['使', '하여금, 부릴', '사', 'cause, order'],
  ['死', '죽을', '사', 'die; dead'],
  ['席', '자리', '석', 'seat; mat'],
  ['石', '돌', '석', 'stone'],
  ['速', '빠를', '속', 'quick, prompt'],
  ['孫', '손자', '손', 'grandchild, descendent'],
  ['樹', '나무', '수', 'tree; plant'],
  ['習', '익힐', '습', 'practice'],
  ['勝', '이길', '승', 'victory'],
  ['式', '법', '식', 'style, system'],
  ['失', '잃을', '실', 'lose'],
  ['愛', '사랑', '애', 'love, be fond of'],
  ['夜', '밤', '야', 'night'],
  ['野', '들[坪]', '야', 'field; wild'],
  ['陽', '볕', '양', 'light; sun'],
  ['洋', '큰바다', '양', 'ocean, sea'],
  ['言', '말씀', '언', 'say; word'],
  ['英', '꽃부리', '영', 'petal, flower'],
  ['永', '길', '영', 'long, perpetual'],
  ['溫', '따뜻할', '온', 'lukewarm, warm'],
  ['園', '동산', '원', 'garden, park'],
  ['遠', '멀', '원', 'far'],
  ['由', '말미암을', '유', 'cause, reason'],
  ['油', '기름', '유', 'oil, fat'],
  ['銀', '은', '은', 'silver'],
  ['醫', '의원', '의', 'medicine'],
  ['衣', '옷', '의', 'clothes, clothing'],
  ['者', '놈', '자', 'that which; he who'],
  ['章', '글', '장', 'composition'],
  ['在', '있을', '재', 'be at, in'],
  ['定', '정할', '정', 'decide, settle'],
  ['朝', '아침', '조', 'morning'],
  ['族', '겨레', '족', 'a family clan, ethnic group'],
  ['晝', '낮', '주', 'daytime, noon'],
  ['親', '친할', '친', 'parent; close'],
  ['太', '클', '태', 'thick, fat'],
  ['通', '통할', '통', 'pass through; commute'],
  ['特', '특별할', '특', 'special, unique'],
  ['合', '합할', '합', 'fit, match, join'],
  ['行', '다닐', '행', 'go; carry out; line', '항렬 항'],
  ['向', '향할', '향', 'toward, direction'],
  ['號', '이름', '호', 'mark, sign'],
  ['畫', '그림', '화', 'picture; stroke of a kanji', '그을 획(劃)'],
  ['黃', '누를', '황', 'yellow'],
  ['訓', '가르칠', '훈', 'teach, instruct'],
];

const SECTIONS: PackSection[] = [
  {
    id: 'geup8',
    name: { English: '8급', Korean: '8급' },
    note: { English: 'The 50 characters a 급수 ladder starts on — numbers, days, directions, family.', Korean: '급수 사다리의 첫 50자. 숫자와 요일, 방위, 가족처럼 가장 먼저 만나는 글자들이에요.' },
    entries: toEntries(GEUP8_ROWS),
  },
  {
    id: 'geup7ii',
    name: { English: '7급 II', Korean: '7급 II' },
    note: { English: '50 more: the body, the house, and the verbs that go with them.', Korean: '다음 50자. 몸과 집, 그리고 거기 붙는 동사들이에요.' },
    entries: toEntries(GEUP7II_ROWS),
  },
  {
    id: 'geup7',
    name: { English: '7급', Korean: '7급' },
    note: { English: '50 more: nature, time, and the first characters that compound freely.', Korean: '또 다른 50자. 자연과 시간, 그리고 본격적으로 조합되기 시작하는 글자들이에요.' },
    entries: toEntries(GEUP7_ROWS),
  },
  {
    id: 'geup6ii',
    name: { English: '6급 II', Korean: '6급 II' },
    note: { English: '75 characters, where school subjects and the first abstract ideas arrive.', Korean: '75자. 학교 과목과 첫 추상어가 등장하는 구간이에요.' },
    entries: toEntries(GEUP6II_ROWS),
  },
  {
    id: 'geup6',
    name: { English: '6급', Korean: '6급' },
    note: { English: 'The last 75 before the ladder leaves everyday vocabulary behind.', Korean: '마지막 75자. 여기까지가 일상어의 범위예요.' },
    entries: toEntries(GEUP6_ROWS),
  },
];

export const HANJA_GEUPSU_PACK: VocabPack = {
  id: 'hanja-geupsu',
  name: { English: 'Hanja 급수 8–6', Korean: '한자 급수 8급–6급' },
  description: {
    English:
      'The 300 characters 한국어문회 assigns for 8급 through 6급, in the order the exam introduces them. Each card carries the 대표훈음 — 水 is 물 수 — and you choose which part leads.',
    Korean:
      '한국어문회가 8급부터 6급까지 배정한 300자를, 시험이 소개하는 순서 그대로. 카드마다 대표훈음이 붙고(水는 물 수), 어느 쪽을 먼저 볼지는 직접 고릅니다.',
  },
  sections: SECTIONS,
  // `list`, not `grid`, for the reason the kanji pack is a list: the back
  // carries a reading, and 물 수 does not fit the 4.5rem tile that makes 71
  // kana scannable. The "All" chip consequence is the same question the kanji
  // deck already raises, tracked once under Medium in the backlog.
  layout: 'list',
  // No `pronounceable`: the registry gives Hanja no TTS voice, because the
  // thing worth hearing is the 음 rather than the glyph. Both apps hide the
  // button on their own; this just declines to ask for one.
};
