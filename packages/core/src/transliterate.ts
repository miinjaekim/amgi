/**
 * The term respelled in a script the learner already reads.
 *
 * This is the pronunciation aid in the sense a learner means it: 寿司 is
 * `sushi` to an English native and `스시` to a Korean one — not a notation to
 * be taught, but the word written the way they would sound it out. It is keyed
 * on **`nativeLanguage`**, unlike every other reading field, because the answer
 * depends on who is reading rather than on what the word is.
 *
 * All of it is a pure transform. No model call, no dictionary, no stored field
 * and so no backfill: it works on every card already saved the moment it ships.
 * That is a deliberate contrast with `pitchAccent`, which needs a table because
 * accent is a lexical fact you cannot read off the spelling. A transliteration
 * *is* readable off the spelling, so asking a model for one would add error for
 * nothing.
 */

/** Katakana to hiragana, so one table serves both scripts. */
function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

const ROMAJI: Record<string, string> = {
  あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',
  が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
  ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',
  だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',
  は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',
  ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',
  や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',
  わ:'wa',ゐ:'i',ゑ:'e',を:'o',ん:'n',ゔ:'vu',ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',
};

const ROMAJI_YOON: Record<string, string> = {
  きゃ:'kya',きゅ:'kyu',きょ:'kyo',しゃ:'sha',しゅ:'shu',しょ:'sho',
  ちゃ:'cha',ちゅ:'chu',ちょ:'cho',にゃ:'nya',にゅ:'nyu',にょ:'nyo',
  ひゃ:'hya',ひゅ:'hyu',ひょ:'hyo',みゃ:'mya',みゅ:'myu',みょ:'myo',
  りゃ:'rya',りゅ:'ryu',りょ:'ryo',ぎゃ:'gya',ぎゅ:'gyu',ぎょ:'gyo',
  じゃ:'ja',じゅ:'ju',じょ:'jo',びゃ:'bya',びゅ:'byu',びょ:'byo',
  ぴゃ:'pya',ぴゅ:'pyu',ぴょ:'pyo',ふぁ:'fa',ふぃ:'fi',ふぇ:'fe',ふぉ:'fo',
  てぃ:'ti',でぃ:'di',うぃ:'wi',うぇ:'we',うぉ:'wo',ゔぁ:'va',ゔぃ:'vi',ゔぇ:'ve',ゔぉ:'vo',
};

const MACRON: Record<string, string> = { a:'ā', i:'ī', u:'ū', e:'ē', o:'ō' };

/**
 * Kana to Hepburn romaji — `すし` → `sushi`, `とうきょう` → `tōkyō`.
 *
 * Hepburn rather than Kunrei because it is what an English reader will actually
 * sound out: `shi` and `chi` rather than `si` and `ti`.
 *
 * Three rules do the work beyond the table. `っ` doubles the consonant that
 * follows it (`さっぽろ` → `sapporo`). `ん` is written `m` before a labial,
 * which is the one place Hepburn departs from a letter-for-letter mapping
 * (`てんぷら` → `tempura`). And a long vowel takes a macron — including the
 * `ou`/`uu` sequences that are how Japanese actually spells one, which is why
 * `とうきょう` is `tōkyō` and not `toukyou`.
 */
export function kanaToRomaji(kana: string): string {
  const s = toHiragana(kana);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const pair = s.slice(i, i + 2);
    if (ROMAJI_YOON[pair]) { out += ROMAJI_YOON[pair]; i += 2; continue; }
    const ch = s[i];
    if (ch === 'っ') {
      const next = ROMAJI_YOON[s.slice(i + 1, i + 3)] || ROMAJI[s[i + 1]] || '';
      // `っち` is `tchi` in Hepburn, not `cchi`.
      if (next.startsWith('ch')) out += 't';
      else if (next) out += next[0];
      i++; continue;
    }
    if (ch === 'ー') { out = applyMacron(out); i++; continue; }
    if (ch === 'ん') {
      const next = ROMAJI_YOON[s.slice(i + 1, i + 3)] || ROMAJI[s[i + 1]] || '';
      out += next && 'bpm'.includes(next[0]) ? 'm' : 'n';
      i++; continue;
    }
    out += ROMAJI[ch] ?? ch;
    i++;
  }
  return collapseLongVowels(out);
}

function applyMacron(out: string): string {
  const last = out.slice(-1);
  return MACRON[last] ? out.slice(0, -1) + MACRON[last] : out;
}

/**
 * `ou` and `uu` are how Japanese writes a long o and a long u, so they become
 * macrons. `ei` is deliberately left alone: `せんせい` is conventionally
 * `sensei`, not `sensē`, and romanising it otherwise would look wrong to
 * anyone who has seen the word written.
 */
function collapseLongVowels(romaji: string): string {
  return romaji
    .replace(/ou/g, 'ō')
    .replace(/oo/g, 'ō')
    .replace(/uu/g, 'ū')
    .replace(/aa/g, 'ā');
}

// 국립국어원 외래어 표기법: か and た rows are plain word-initially and
// aspirated inside a word — 京都 is 교토, not 쿄토.
const HANGUL_INITIAL: Record<string, string> = {
  か:'가',き:'기',く:'구',け:'게',こ:'고',た:'다',ち:'지',つ:'쓰',て:'데',と:'도',
};
const HANGUL_INITIAL_YOON: Record<string, string> = {
  きゃ:'갸',きゅ:'규',きょ:'교',ちゃ:'자',ちゅ:'주',ちょ:'조',
};

const HANGUL: Record<string, string> = {
  あ:'아',い:'이',う:'우',え:'에',お:'오',か:'카',き:'키',く:'쿠',け:'케',こ:'코',
  が:'가',ぎ:'기',ぐ:'구',げ:'게',ご:'고',さ:'사',し:'시',す:'스',せ:'세',そ:'소',
  ざ:'자',じ:'지',ず:'즈',ぜ:'제',ぞ:'조',た:'타',ち:'치',つ:'쓰',て:'테',と:'토',
  だ:'다',ぢ:'지',づ:'즈',で:'데',ど:'도',な:'나',に:'니',ぬ:'누',ね:'네',の:'노',
  は:'하',ひ:'히',ふ:'후',へ:'헤',ほ:'호',ば:'바',び:'비',ぶ:'부',べ:'베',ぼ:'보',
  ぱ:'파',ぴ:'피',ぷ:'푸',ぺ:'페',ぽ:'포',ま:'마',み:'미',む:'무',め:'메',も:'모',
  や:'야',ゆ:'유',よ:'요',ら:'라',り:'리',る:'루',れ:'레',ろ:'로',
  わ:'와',を:'오',ゔ:'부',
};
const HANGUL_YOON: Record<string, string> = {
  きゃ:'캬',きゅ:'큐',きょ:'쿄',しゃ:'샤',しゅ:'슈',しょ:'쇼',
  ちゃ:'차',ちゅ:'추',ちょ:'초',にゃ:'냐',にゅ:'뉴',にょ:'뇨',
  ひゃ:'햐',ひゅ:'휴',ひょ:'효',みゃ:'먀',みゅ:'뮤',みょ:'묘',
  りゃ:'랴',りゅ:'류',りょ:'료',ぎゃ:'갸',ぎゅ:'규',ぎょ:'교',
  じゃ:'자',じゅ:'주',じょ:'조',びゃ:'뱌',びゅ:'뷰',びょ:'뵤',
  ぴゃ:'퍄',ぴゅ:'퓨',ぴょ:'표',
};

/** Adds a 받침 to the previous syllable, which is how ん and っ are written. */
function addBatchim(out: string[], jamo: 'ㄴ' | 'ㅅ'): void {
  const fallback = jamo === 'ㄴ' ? 'ㄴ' : 'ㅅ';
  if (!out.length) { out.push(fallback); return; }
  const last = out[out.length - 1];
  const code = last.charCodeAt(0) - 0xac00;
  // Only a syllable that has no 받침 yet can take one.
  if (code < 0 || code >= 11172 || code % 28 !== 0) { out.push(fallback); return; }
  out[out.length - 1] = String.fromCharCode(last.charCodeAt(0) + (jamo === 'ㄴ' ? 4 : 19));
}

/**
 * The vowel a kana ends on, read off the romaji table so the two never drift.
 * `きょ` is an `o` kana even though it is two characters.
 */
function kanaVowel(kana: string): string {
  const romaji = ROMAJI_YOON[kana] || ROMAJI[kana];
  return romaji ? romaji.slice(-1) : '';
}

/**
 * A long vowel in kana is written as a following `う` (or `お`), and 국립국어원
 * does not transcribe it: `とうきょう` is 도쿄. `えい` is **not** in this rule —
 * `せんせい` is 센세이, not 센세, which is why the check is on o/u only.
 */
function isLongVowelMark(previous: string, current: string): boolean {
  if (current === 'う') return previous === 'o' || previous === 'u';
  if (current === 'お') return previous === 'o';
  return false;
}

/**
 * Kana to Hangul — `すし` → `스시`, `とうきょう` → `도쿄`.
 *
 * Follows 국립국어원's 일본어 표기법 rather than transcribing letter by letter,
 * because that standard is what a Korean reader has already met in print. Three
 * of its rules are the whole difference:
 *
 * - **Long vowels are not written.** `とうきょう` is 도쿄, not 도우쿄우. This is
 *   the rule that a naive mapping misses most visibly.
 * - **か and た rows are plain word-initially, aspirated inside.** 京都 is 교토:
 *   plain ㄱ at the front, aspirated ㅌ in the middle, off the same kana.
 * - **ん is a ㄴ 받침 and っ is a ㅅ 받침**, so `さっぽろ` is 삿포로 — three
 *   syllables in Korean where the kana has four morae.
 */
export function kanaToHangul(kana: string): string {
  const s = toHiragana(kana);
  const out: string[] = [];
  let lastVowel = '';
  let i = 0;
  while (i < s.length) {
    const atStart = out.length === 0;
    const pair = s.slice(i, i + 2);
    if (HANGUL_YOON[pair] || HANGUL_INITIAL_YOON[pair]) {
      out.push((atStart && HANGUL_INITIAL_YOON[pair]) || HANGUL_YOON[pair]);
      lastVowel = kanaVowel(pair);
      i += 2;
      continue;
    }
    const ch = s[i];
    if (ch === 'ん') { addBatchim(out, 'ㄴ'); i++; continue; }
    if (ch === 'っ') { addBatchim(out, 'ㅅ'); i++; continue; }
    if (ch === 'ー') { i++; continue; }
    if (isLongVowelMark(lastVowel, ch)) { i++; continue; }
    out.push((atStart && HANGUL_INITIAL[ch]) || HANGUL[ch] || ch);
    lastVowel = kanaVowel(ch);
    i++;
  }
  return out.join('');
}

/**
 * Kikuyu spelling is phonemic but not transparent to an outside reader, which
 * is the whole reason this exists.
 *
 * **The two corrections that made it right** — it shipped wrong on 2026-08-30
 * and was fixed the next day off one reported word, `cũcũ` "grandmother", which
 * a reader said should sound like *shosho* and came out `choo-choo`. That one
 * word falsified two separate assumptions:
 *
 * 1. **`c` is [ʃ], not [tʃ]** — `sh`, never `ch` and never `k`.
 * 2. **`ĩ` and `ũ` are the close-mid vowels [e] and [o]**, not lax versions of
 *    `i` and `u`. This was the worse error: it put both tilde vowels a full
 *    step too high, so every `ũ` in the language came out `oo` when it wanted
 *    `o`. Kikuyu's seven vowels run i [i], ĩ [e], e [ɛ], a [a], o [ɔ], ũ [o],
 *    u [u] — the tilde marks height, not laxness.
 *
 * Fixing (2) also **removed the vowel collapse** the first version had to
 * apologise for: `ĩ` (`ay`) and `i` (`ee`) are now distinct, as are `ũ` (`o`)
 * and `u` (`oo`). The collapse was never a limit of English, it was a symptom
 * of the wrong table.
 *
 * **What is still approximate**, and would need a speaker to settle rather than
 * more reasoning:
 * - `th` is [ð], but written `th` an English reader may say *thin* for *the*.
 * - `g` is [ɣ] and `b` is [β] — fricatives respelled as the stops `g` and `b`,
 *   because English offers nothing closer that a reader will not misread.
 * - `o` [ɔ] and `ũ` [o] both respell as `o`. Unlike the old collapse this one
 *   is a real limit of English orthography, not a mistake.
 * - Stress is unmarked; the hyphens show syllables only.
 */
const KIKUYU_ONSETS = [
  "ng'", 'mb', 'nd', 'ng', 'nj', 'ny', 'th', 'c', 'g', 'k', 'm', 'n',
  'r', 't', 'w', 'y', 'h', 'b', 'd', 'j',
];
const KIKUYU_CONSONANT_SOUND: Record<string, string> = {
  "ng'": 'ng', mb: 'mb', nd: 'nd', ng: 'ng', nj: 'nj', ny: 'ny', th: 'th',
  c: 'sh', g: 'g', k: 'k', m: 'm', n: 'n', r: 'r', t: 't', w: 'w', y: 'y',
  h: 'h', b: 'b', d: 'd', j: 'j',
};
// i [i], ĩ [e], e [ɛ], a [a], o [ɔ], ũ [o], u [u]. The tilde marks height.
const KIKUYU_VOWEL_SOUND: Record<string, string> = {
  a: 'a', e: 'eh', i: 'ee', ĩ: 'ay', o: 'o', u: 'oo', ũ: 'o',
};
type KikuyuSyllable = { onset: string; vowel: string };

/**
 * Splits a Kikuyu word into its syllables, which are open (CV) apart from the
 * prenasalized onsets. `mũgũnda` is mũ-gũ-nda, three syllables, not four —
 * `nd` is one onset. That grouping is also what makes the hyphens in the
 * respelling meaningful.
 */
export function splitKikuyuSyllables(word: string): KikuyuSyllable[] {
  const s = word.toLowerCase();
  const syllables: KikuyuSyllable[] = [];
  let i = 0;
  while (i < s.length) {
    let onset = '';
    for (const candidate of KIKUYU_ONSETS) {
      if (s.startsWith(candidate, i)) { onset = candidate; break; }
    }
    i += onset.length;
    const vowel = KIKUYU_VOWEL_SOUND[s[i]] ? s[i] : '';
    if (vowel) i += 1;
    if (!onset && !vowel) { i += 1; continue; } // skip spaces and punctuation
    syllables.push({ onset, vowel });
  }
  return syllables;
}

/** `rũciũ` → `roo-chee-oo`. Hyphens mark the syllables, which also carry stress. */
export function kikuyuToEnglish(word: string): string {
  return splitKikuyuSyllables(word)
    .map(({ onset, vowel }) =>
      (onset ? KIKUYU_CONSONANT_SOUND[onset] ?? onset : '') +
      (vowel ? KIKUYU_VOWEL_SOUND[vowel] ?? vowel : '')
    )
    .filter(Boolean)
    .join('-');
}

/**
 * Kikuyu onsets, split into what they do in Hangul.
 *
 * `nasal` is set for the prenasalized stops (mb, nd, ng, nj), which Hangul
 * cannot write as one onset — the nasal becomes a 받침 on the syllable before,
 * so `mũgũnda` is 무군다 rather than an invented cluster. `glide` picks the
 * y-/w-series vowel, without which `gĩkũyũ` loses its `y` entirely.
 */
const KIKUYU_ONSET_HANGUL: Record<string, { nasal?: string; jamo: string; glide?: 'y' | 'w' }> = {
  "ng'": { jamo: 'ㅇ' },
  mb: { nasal: 'ㅁ', jamo: 'ㅂ' },
  nd: { nasal: 'ㄴ', jamo: 'ㄷ' },
  ng: { nasal: 'ㅇ', jamo: 'ㄱ' },
  nj: { nasal: 'ㄴ', jamo: 'ㅈ' },
  ny: { jamo: 'ㄴ', glide: 'y' },
  th: { jamo: 'ㄷ' },
  // [ʃ] takes the y-series in Korean, so cũcũ is 쇼쇼 rather than 추추.
  c: { jamo: 'ㅅ', glide: 'y' }, g: { jamo: 'ㄱ' }, k: { jamo: 'ㅋ' }, m: { jamo: 'ㅁ' },
  n: { jamo: 'ㄴ' }, r: { jamo: 'ㄹ' }, t: { jamo: 'ㅌ' }, h: { jamo: 'ㅎ' },
  b: { jamo: 'ㅂ' }, d: { jamo: 'ㄷ' }, j: { jamo: 'ㅈ' },
  w: { jamo: 'ㅇ', glide: 'w' }, y: { jamo: 'ㅇ', glide: 'y' },
};

// Korean has no [e]/[ɛ] or [o]/[ɔ] contrast to spend, so ĩ/e both land on 에 and
// ũ/o both on 오. That merge is Korean's — unlike the English one it replaced,
// which was the table being wrong.
const KIKUYU_NUCLEUS: Record<'plain' | 'y' | 'w', Record<string, string>> = {
  plain: { a: '아', e: '에', i: '이', 'ĩ': '에', o: '오', u: '우', 'ũ': '오' },
  y:     { a: '야', e: '예', i: '이', 'ĩ': '예', o: '요', u: '유', 'ũ': '요' },
  w:     { a: '와', e: '웨', i: '위', 'ĩ': '웨', o: '워', u: '우', 'ũ': '워' },
};

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JONG_FOR: Record<string, number> = { 'ㄴ': 4, 'ㅁ': 16, 'ㅇ': 21 };

/** Puts `jamo` on the front of an already-formed vowel syllable. */
function withOnset(jamo: string, nucleus: string): string {
  const index = CHO.indexOf(jamo);
  if (index < 0) return nucleus;
  const base = nucleus.charCodeAt(0) - 0xac00;
  if (base < 0 || base >= 11172) return nucleus;
  return String.fromCharCode(0xac00 + index * 588 + (base % 588));
}

/** Hangs a nasal 받침 on the previous syllable, or opens one if there is none. */
function attachNasal(out: string[], nasal: string): void {
  const jong = JONG_FOR[nasal];
  if (out.length) {
    const last = out[out.length - 1];
    const code = last.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172 && code % 28 === 0) {
      out[out.length - 1] = String.fromCharCode(last.charCodeAt(0) + jong);
      return;
    }
  }
  // Word-initial prenasalization has nothing to lean on, so it opens a bare
  // 으 and hangs the nasal off that — `ndoto` is 은도토, the way Korean writes a
  // syllabic nasal. Putting the nasal in the onset instead would give 느도토,
  // which reads as a consonant the word does not have.
  out.push(String.fromCharCode('으'.charCodeAt(0) + jong));
}

/** `rũciũ` → `루치우`, `mũgũnda` → `무군다`. */
export function kikuyuToHangul(word: string): string {
  const out: string[] = [];
  for (const { onset, vowel } of splitKikuyuSyllables(word)) {
    const spec = onset ? KIKUYU_ONSET_HANGUL[onset] : undefined;
    if (spec?.nasal) attachNasal(out, spec.nasal);
    if (!vowel) {
      if (spec && !spec.nasal) out.push(withOnset(spec.jamo, '으'));
      continue;
    }
    const nucleus = KIKUYU_NUCLEUS[spec?.glide ?? 'plain'][vowel] ?? KIKUYU_NUCLEUS.plain[vowel];
    out.push(spec ? withOnset(spec.jamo, nucleus) : nucleus);
  }
  return out.join('');
}

