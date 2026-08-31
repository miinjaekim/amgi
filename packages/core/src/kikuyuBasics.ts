import type { VocabPack } from './packs';

/**
 * Kikuyu Basics — 59 entries, and the first pack built under the sourcing
 * standard in `docs/packs/README.md`.
 *
 * ⚠️ **A speaker has not read this list.** That is the difference between this
 * pack and every other one, and it is stated here rather than in a commit
 * message because it does not expire. The record: this repo has measured the
 * model wrong on Kikuyu twice — noun class 3 of 8 (`types.ts`), tone
 * self-consistent on 2 of 19 (`docs/pronunciation-research.md`) — and the
 * respelling table shipped wrong three times, each caught by someone who can
 * hear the language and **none by review**. So the draft cites a source per
 * entry, and the honest shape of it is 16 entries corroborated twice, 36 on a
 * single source, 7 derived from a sourced stem plus a sourced rule.
 *
 * **Where to be most careful:** the verb section. Kikuyu infinitives take `kũ-`,
 * which becomes `gũ-` before a stem starting `t`, `k`, `c` or `th` — Dahl's Law,
 * and the reason the language is *Gĩkũyũ* and not *Kĩkũyũ*. Three of the ten are
 * attested whole; the rest are that rule applied to stems a grammar lists, which
 * should hold and is still derivation rather than evidence.
 *
 * **Both backs are authored**, as on the Spanish pack: a Kikuyu deck puts
 * neither `english` nor `korean` in the study slot, so both are read by someone.
 *
 * **No audio, and that is finished rather than missing.** Kikuyu is the one
 * registry entry with no `ttsLanguageCode` — Google Cloud TTS has no Kikuyu
 * voice and Swahili is refused as a stand-in, because it has no `ĩ`/`ũ` and
 * those are the two vowels that distinguish Kikuyu words. So `pronounceable` is
 * off, and the respelling on the card is the *only* pronunciation aid this deck
 * has. That is why building it started by rendering every entry through
 * `kikuyuToEnglish` and `kikuyuToHangul` rather than by reading the list — which
 * is what found the `Cw` syllabification bug fixed alongside this pack.
 *
 * **The diacritics are load-bearing.** `ĩ`/`i` and `ũ`/`u` distinguish words,
 * `foldText` matches accents strictly on purpose, and the app's own
 * `pronunciationNoteKikuyu` tells the learner exactly that. A misauthored vowel
 * does not read oddly — it marks a correct answer wrong.
 *
 * **No `gender`.** `PackEntry.gender` exists for Spanish articles; Kikuyu marks
 * noun class, not gender, and the registry entry refuses to teach it for
 * measured reasons. The numerals here are the counting forms for that reason —
 * they agree with the class of what they count, and the class is not something
 * this app claims to know.
 *
 * Draft review: docs/packs/kikuyu-basics-pack-draft.md
 */
export const KIKUYU_BASICS_PACK: VocabPack = {
  id: 'kikuyu-basics',
  name: { English: 'Kikuyu Basics', Korean: '키쿠유어 기초' },
  description: {
    English:
      'Greeting someone, counting, naming your family, and ten everyday verbs — the first Kikuyu, in a language with no synthesised voice, so the respelling on each card is the whole pronunciation aid.',
    Korean:
      '인사하기, 숫자 세기, 가족 부르기, 그리고 매일 쓰는 동사 열 개 — 첫 키쿠유어. 이 언어는 합성 음성이 없어서, 카드에 적힌 발음 표기가 유일한 발음 길잡이예요.',
  },
  layout: 'list',
  sections: [
    {
      id: 'greetings',
      name: { English: 'Greetings', Korean: '인사' },
      note: {
        English:
          'Every phrase here is attested at Omniglot and almost nowhere else, so this is the section a speaker should read first. `wĩmwega` is a greeting and a statement at once — literally "you are well".',
        Korean:
          '여기 있는 표현은 대부분 Omniglot 한 곳에서만 확인된 것이라, 원어민이 가장 먼저 봐야 할 묶음이에요. wĩmwega는 인사이면서 동시에 "당신은 잘 있군요"라는 서술이기도 합니다.',
      },
      entries: [
        { study: 'wĩmwega', back: { English: 'hello', Korean: '안녕하세요' }, context: 'literally "you are well" — a greeting and a statement at once' },
        { study: 'ũhana atĩa?', back: { English: 'how are you?', Korean: '어떻게 지내요?' } },
        { study: 'ndĩmwega', back: { English: 'I\'m well', Korean: '잘 지내요' }, context: 'the answer to ũhana atĩa?' },
        { study: 'ngeithi cia rũcinĩ', back: { English: 'good morning', Korean: '좋은 아침이에요' }, context: 'literally "greetings of the morning"' },
        { study: 'ngeithi cia hwainĩ', back: { English: 'good evening', Korean: '좋은 저녁이에요' } },
        { study: 'koma wega', back: { English: 'good night', Korean: '안녕히 주무세요' }, context: 'literally "sleep well"' },
        { study: 'tigoi na wega', back: { English: 'goodbye', Korean: '안녕히 계세요' }, context: 'literally "be left with goodness"' },
        { study: 'nĩ wega', back: { English: 'thank you', Korean: '고맙습니다' }, context: 'literally "it is good" — also the reply to thanks' },
        { study: 'ĩĩ', back: { English: 'yes', Korean: '네' } },
        { study: 'aca', back: { English: 'no', Korean: '아니요' } },
        { study: 'tareke', back: { English: 'excuse me', Korean: '실례합니다' } },
        { study: 'ndiũĩ', back: { English: 'I don\'t know', Korean: '몰라요' } },
        { study: 'wĩtago atĩa?', back: { English: 'what\'s your name?', Korean: '이름이 뭐예요?' } },
        { study: 'njĩtago', back: { English: 'my name is', Korean: '제 이름은' }, context: 'the frame you finish with your own name' },
        { study: 'ũhoro', back: { English: 'news, word', Korean: '소식, 말' }, context: 'what there is to tell' },
        { study: 'mũrata', back: { English: 'friend', Korean: '친구' } },
        { study: 'rũciũ', back: { English: 'tomorrow', Korean: '내일' } },
      ],
    },
    {
      id: 'numbers',
      name: { English: 'Numbers', Korean: '숫자' },
      note: {
        English:
          'The most solid section here: 1–10 are attested identically, diacritics included, by two independent sources. Kikuyu numerals agree with the noun class of what they count — these are the counting forms, which is what you use to count aloud rather than what you say inside a phrase.',
        Korean:
          '이 팩에서 가장 근거가 탄탄한 부분이에요. 1부터 10까지는 서로 독립된 두 자료가 강세 부호까지 똑같이 적고 있습니다. 키쿠유어의 수사는 세는 대상의 명사 부류에 따라 모양이 달라지는데, 여기 실린 것은 소리 내어 셀 때 쓰는 형태예요.',
      },
      entries: [
        { study: 'kĩbũgũ', back: { English: 'zero', Korean: '영' } },
        { study: 'ĩmwe', back: { English: 'one', Korean: '하나' } },
        { study: 'igĩrĩ', back: { English: 'two', Korean: '둘' } },
        { study: 'ithatũ', back: { English: 'three', Korean: '셋' } },
        { study: 'inya', back: { English: 'four', Korean: '넷' } },
        { study: 'ithano', back: { English: 'five', Korean: '다섯' } },
        { study: 'ithathatũ', back: { English: 'six', Korean: '여섯' } },
        { study: 'mũgwanja', back: { English: 'seven', Korean: '일곱' } },
        { study: 'inyanya', back: { English: 'eight', Korean: '여덟' } },
        { study: 'kenda', back: { English: 'nine', Korean: '아홉' } },
        { study: 'ikũmi', back: { English: 'ten', Korean: '열' } },
        { study: 'ikũmi na ĩmwe', back: { English: 'eleven', Korean: '열하나' }, context: 'ten and one — the teens are built, not learned' },
        { study: 'mĩrongo ĩrĩ', back: { English: 'twenty', Korean: '스물' }, context: 'literally "two tens"' },
        { study: 'mĩrongo ithatũ', back: { English: 'thirty', Korean: '서른' } },
        { study: 'mĩrongo ithano', back: { English: 'fifty', Korean: '쉰' } },
        { study: 'igana rĩmwe', back: { English: 'one hundred', Korean: '백' }, context: 'the numeral is part of the word — not bare igana' },
        { study: 'ngiri ĩmwe', back: { English: 'one thousand', Korean: '천' } },
      ],
    },
    {
      id: 'family',
      name: { English: 'Family', Korean: '가족' },
      note: {
        English:
          'Class 1 takes mũ- in the singular and a- in the plural, so mũndũ/andũ is a prefix change rather than an ending. Whether these terms are inherently possessed — whether baba is "my father" rather than "father" — is the open question a speaker should settle first.',
        Korean:
          '1부류 명사는 단수에 mũ-, 복수에 a-를 붙여요. 그래서 mũndũ와 andũ는 어미가 바뀐 게 아니라 접두사가 바뀐 겁니다. baba가 "아버지"인지 "우리 아버지"인지 — 즉 이 단어들이 애초에 소유 형태인지는 원어민이 먼저 확인해야 할 문제로 남아 있어요.',
      },
      entries: [
        { study: 'mũndũ', back: { English: 'person', Korean: '사람' } },
        { study: 'andũ', back: { English: 'people', Korean: '사람들' }, context: 'class 1 takes a- for the plural, not an ending' },
        { study: 'baba', back: { English: 'father', Korean: '아버지' } },
        { study: 'maitũ', back: { English: 'mother', Korean: '어머니' } },
        { study: 'nyina', back: { English: 'his mother, her mother', Korean: '그 사람의 어머니' }, context: 'the word inside mũrũ wa nyina' },
        { study: 'mũriũ', back: { English: 'son', Korean: '아들' } },
        { study: 'mwarĩ', back: { English: 'daughter', Korean: '딸' } },
        { study: 'mũrũ wa nyina', back: { English: 'brother', Korean: '형제' }, context: 'literally "son of his mother"' },
        { study: 'mwarĩ wa nyina', back: { English: 'sister', Korean: '자매' }, context: 'literally "daughter of his mother"' },
        { study: 'guka', back: { English: 'grandfather', Korean: '할아버지' }, context: 'L73 gives wagui instead — the conflict is unresolved' },
        { study: 'cũcũ', back: { English: 'grandmother', Korean: '할머니' }, context: 'the word the respelling was corrected from — shosho, not choo-choo' },
        { study: 'mama', back: { English: 'uncle', Korean: '삼촌' } },
        { study: 'tata', back: { English: 'aunt', Korean: '이모, 고모' } },
        { study: 'mũihwa', back: { English: 'nephew, niece', Korean: '조카' }, context: 'one word for both' },
        { study: 'nyũmba', back: { English: 'house', Korean: '집' } },
      ],
    },
    {
      id: 'actions',
      name: { English: 'Actions', Korean: '동작' },
      note: {
        English:
          'Kikuyu infinitives take kũ-, which becomes gũ- before a stem starting t, k, c or th — Dahl’s Law, and the reason the language is Gĩkũyũ rather than Kĩkũyũ. Four of these are attested whole; the rest are built from a sourced stem plus that rule, which is weaker.',
        Korean:
          '키쿠유어 동사원형은 kũ-로 시작하는데, 어간이 t, k, c, th로 시작하면 gũ-가 됩니다. 달 법칙(Dahl\'s Law)이라고 하고, 이 언어를 Kĩkũyũ가 아니라 Gĩkũyũ라고 부르는 이유이기도 해요. 네 개는 그대로 확인된 형태이고, 나머지는 어간에 이 규칙을 적용해 만든 것이라 근거가 약합니다.',
      },
      entries: [
        { study: 'kũrĩa', back: { English: 'to eat', Korean: '먹다' } },
        { study: 'kũnyua', back: { English: 'to drink', Korean: '마시다' } },
        { study: 'gũthoma', back: { English: 'to read, to study', Korean: '읽다, 공부하다' }, context: 'gũ- not kũ-, because th is voiceless' },
        { study: 'gũthiĩ', back: { English: 'to go', Korean: '가다' }, context: 'stem thi- plus Dahl’s Law' },
        { study: 'gũthamba', back: { English: 'to wash, to swim', Korean: '씻다, 헤엄치다' }, context: 'stem thamb-' },
        { study: 'kũrĩma', back: { English: 'to cultivate', Korean: '농사짓다' }, context: 'stem rĩm- — kũ- because r is not voiceless' },
        { study: 'kũhitha', back: { English: 'to hide', Korean: '숨다' }, context: 'stem hith-' },
        { study: 'kũhumba', back: { English: 'to cover', Korean: '덮다' }, context: 'stem humb-' },
        { study: 'kũrora', back: { English: 'to look at', Korean: '바라보다' }, context: 'stem ror-' },
        { study: 'kũhaica', back: { English: 'to climb', Korean: '오르다' }, context: 'stem haic-' },
      ],
    },
  ],
};
