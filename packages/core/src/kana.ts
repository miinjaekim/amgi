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
 */
const KANA: readonly (readonly [hiragana: string, katakana: string, romaji: string])[] = [
  // gojūon
  ['あ', 'ア', 'a'],   ['い', 'イ', 'i'],   ['う', 'ウ', 'u'],   ['え', 'エ', 'e'],   ['お', 'オ', 'o'],
  ['か', 'カ', 'ka'],  ['き', 'キ', 'ki'],  ['く', 'ク', 'ku'],  ['け', 'ケ', 'ke'],  ['こ', 'コ', 'ko'],
  ['さ', 'サ', 'sa'],  ['し', 'シ', 'shi'], ['す', 'ス', 'su'],  ['せ', 'セ', 'se'],  ['そ', 'ソ', 'so'],
  ['た', 'タ', 'ta'],  ['ち', 'チ', 'chi'], ['つ', 'ツ', 'tsu'], ['て', 'テ', 'te'],  ['と', 'ト', 'to'],
  ['な', 'ナ', 'na'],  ['に', 'ニ', 'ni'],  ['ぬ', 'ヌ', 'nu'],  ['ね', 'ネ', 'ne'],  ['の', 'ノ', 'no'],
  ['は', 'ハ', 'ha'],  ['ひ', 'ヒ', 'hi'],  ['ふ', 'フ', 'fu'],  ['へ', 'ヘ', 'he'],  ['ほ', 'ホ', 'ho'],
  ['ま', 'マ', 'ma'],  ['み', 'ミ', 'mi'],  ['む', 'ム', 'mu'],  ['め', 'メ', 'me'],  ['も', 'モ', 'mo'],
  ['や', 'ヤ', 'ya'],                       ['ゆ', 'ユ', 'yu'],                       ['よ', 'ヨ', 'yo'],
  ['ら', 'ラ', 'ra'],  ['り', 'リ', 'ri'],  ['る', 'ル', 'ru'],  ['れ', 'レ', 're'],  ['ろ', 'ロ', 'ro'],
  ['わ', 'ワ', 'wa'],                                                                 ['を', 'ヲ', 'o (wo)'],
  ['ん', 'ン', 'n'],
  // dakuten
  ['が', 'ガ', 'ga'],  ['ぎ', 'ギ', 'gi'],  ['ぐ', 'グ', 'gu'],  ['げ', 'ゲ', 'ge'],  ['ご', 'ゴ', 'go'],
  ['ざ', 'ザ', 'za'],  ['じ', 'ジ', 'ji'],  ['ず', 'ズ', 'zu'],  ['ぜ', 'ゼ', 'ze'],  ['ぞ', 'ゾ', 'zo'],
  ['だ', 'ダ', 'da'],  ['ぢ', 'ヂ', 'ji (di)'], ['づ', 'ヅ', 'zu (du)'], ['で', 'デ', 'de'], ['ど', 'ド', 'do'],
  ['ば', 'バ', 'ba'],  ['び', 'ビ', 'bi'],  ['ぶ', 'ブ', 'bu'],  ['べ', 'ベ', 'be'],  ['ぼ', 'ボ', 'bo'],
  // handakuten
  ['ぱ', 'パ', 'pa'],  ['ぴ', 'ピ', 'pi'],  ['ぷ', 'プ', 'pu'],  ['ぺ', 'ペ', 'pe'],  ['ぽ', 'ポ', 'po'],
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
  cards: KANA.map(([hiragana, , romaji]) => ({ study: hiragana, back: romaji })),
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
  cards: KANA.map(([, katakana, romaji]) => ({ study: katakana, back: romaji })),
};
