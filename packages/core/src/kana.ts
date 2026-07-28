import type { CardPack } from './packs';

/**
 * Every single-character sound in modern Japanese: the gojūon, then the voiced
 * (dakuten) and semi-voiced (handakuten) rows. One row per sound carrying both
 * scripts, so the hiragana and katakana packs are generated from the same
 * source and cannot drift apart.
 *
 * Yōon (きゃ, しゅ, …) are deliberately absent — they are combinations of
 * characters already in this table, not new characters to memorize. So are the
 * obsolete ゐ and ゑ.
 *
 * Romaji is Hepburn, the romanization learners actually meet. Where the modern
 * sound differs from the historical spelling (を, ぢ, づ) the spelling follows
 * in parentheses: it's the same sound as お/じ/ず, and the difference is the
 * thing worth knowing.
 *
 * Hangul is what a Korean-native learner gets instead of romaji — not a
 * translation of it, an answer to the same question in the script they read.
 * It follows the 어중·어말 column of 국립국어원 외래어 표기법. That table is
 * position-dependent (か is 가 word-initially, 카 word-medially) and a kana
 * chart has no word position, so a column has to be picked; the word-initial
 * one is unusable here because it collapses 청음 with 탁음 — か and が would
 * both be 가, た and だ both 다, erasing the distinction these packs exist to
 * teach.
 *
 * Two rows depart from the standard on purpose. つ is 츠 (쓰): the rule says
 * 쓰, but 츠 is what Korean learning materials print, and they note it is
 * 편의상 rather than exact — so both, in the same parenthetical form used for
 * を. ん is 응 rather than the standard ㄴ, because ん is its own mora and 응
 * carries that where a 받침 does not: 미깡 vs 미까응.
 */
const KANA: readonly (readonly [
  hiragana: string,
  katakana: string,
  romaji: string,
  hangul: string,
])[] = [
  // gojūon
  ['あ', 'ア', 'a', '아'],   ['い', 'イ', 'i', '이'],   ['う', 'ウ', 'u', '우'],   ['え', 'エ', 'e', '에'],   ['お', 'オ', 'o', '오'],
  ['か', 'カ', 'ka', '카'],  ['き', 'キ', 'ki', '키'],  ['く', 'ク', 'ku', '쿠'],  ['け', 'ケ', 'ke', '케'],  ['こ', 'コ', 'ko', '코'],
  ['さ', 'サ', 'sa', '사'],  ['し', 'シ', 'shi', '시'], ['す', 'ス', 'su', '스'],  ['せ', 'セ', 'se', '세'],  ['そ', 'ソ', 'so', '소'],
  ['た', 'タ', 'ta', '타'],  ['ち', 'チ', 'chi', '치'], ['つ', 'ツ', 'tsu', '츠 (쓰)'], ['て', 'テ', 'te', '테'],  ['と', 'ト', 'to', '토'],
  ['な', 'ナ', 'na', '나'],  ['に', 'ニ', 'ni', '니'],  ['ぬ', 'ヌ', 'nu', '누'],  ['ね', 'ネ', 'ne', '네'],  ['の', 'ノ', 'no', '노'],
  ['は', 'ハ', 'ha', '하'],  ['ひ', 'ヒ', 'hi', '히'],  ['ふ', 'フ', 'fu', '후'],  ['へ', 'ヘ', 'he', '헤'],  ['ほ', 'ホ', 'ho', '호'],
  ['ま', 'マ', 'ma', '마'],  ['み', 'ミ', 'mi', '미'],  ['む', 'ム', 'mu', '무'],  ['め', 'メ', 'me', '메'],  ['も', 'モ', 'mo', '모'],
  ['や', 'ヤ', 'ya', '야'],                            ['ゆ', 'ユ', 'yu', '유'],                            ['よ', 'ヨ', 'yo', '요'],
  ['ら', 'ラ', 'ra', '라'],  ['り', 'リ', 'ri', '리'],  ['る', 'ル', 'ru', '루'],  ['れ', 'レ', 're', '레'],  ['ろ', 'ロ', 'ro', '로'],
  ['わ', 'ワ', 'wa', '와'],                                                                                 ['を', 'ヲ', 'o (wo)', '오 (워)'],
  ['ん', 'ン', 'n', '응'],
  // dakuten
  ['が', 'ガ', 'ga', '가'],  ['ぎ', 'ギ', 'gi', '기'],  ['ぐ', 'グ', 'gu', '구'],  ['げ', 'ゲ', 'ge', '게'],  ['ご', 'ゴ', 'go', '고'],
  ['ざ', 'ザ', 'za', '자'],  ['じ', 'ジ', 'ji', '지'],  ['ず', 'ズ', 'zu', '즈'],  ['ぜ', 'ゼ', 'ze', '제'],  ['ぞ', 'ゾ', 'zo', '조'],
  ['だ', 'ダ', 'da', '다'],  ['ぢ', 'ヂ', 'ji (di)', '지 (디)'], ['づ', 'ヅ', 'zu (du)', '즈 (두)'], ['で', 'デ', 'de', '데'], ['ど', 'ド', 'do', '도'],
  ['ば', 'バ', 'ba', '바'],  ['び', 'ビ', 'bi', '비'],  ['ぶ', 'ブ', 'bu', '부'],  ['べ', 'ベ', 'be', '베'],  ['ぼ', 'ボ', 'bo', '보'],
  // handakuten
  ['ぱ', 'パ', 'pa', '파'],  ['ぴ', 'ピ', 'pi', '피'],  ['ぷ', 'プ', 'pu', '푸'],  ['ぺ', 'ペ', 'pe', '페'],  ['ぽ', 'ポ', 'po', '포'],
];

export const HIRAGANA_PACK: CardPack = {
  kind: 'cards',
  id: 'kana-hiragana',
  name: { English: 'Hiragana', Korean: '히라가나' },
  description: {
    English: 'Every hiragana character and the sound it makes — the gojūon plus the voiced rows. Tap the speaker to hear one.',
    Korean: '히라가나 전체와 각 글자의 소리 — 오십음도에 탁음·반탁음까지. 스피커를 누르면 발음을 들을 수 있어요.',
  },
  pronounceable: true,
  cards: KANA.map(([hiragana, , romaji, hangul]) => ({
    study: hiragana,
    back: { English: romaji, Korean: hangul },
  })),
};

export const KATAKANA_PACK: CardPack = {
  kind: 'cards',
  id: 'kana-katakana',
  name: { English: 'Katakana', Korean: '가타카나' },
  description: {
    English: 'Every katakana character — the same sounds as hiragana, in the script used for loanwords, names and emphasis.',
    Korean: '가타카나 전체 — 히라가나와 같은 소리이지만, 외래어와 이름, 강조에 쓰는 문자예요.',
  },
  pronounceable: true,
  cards: KANA.map(([, katakana, romaji, hangul]) => ({
    study: katakana,
    back: { English: romaji, Korean: hangul },
  })),
};
