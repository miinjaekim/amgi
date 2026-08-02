import type { VocabPack } from './packs';

/**
 * TOPIK 고급 (5·6급) vocabulary.
 *
 * Selection follows the pack principles: not for beginners. A 6급 score is not
 * gated on more everyday nouns — it is gated on the register that TOPIK II
 * actually tests. So the filter is the same one the TOEIC pack used, pointed
 * the other way: words a learner who can already hold a conversation still
 * meets cold in a 신문 기사, a 강연, or their own 쓰기 54번 answer.
 *
 * Sources: the 고급 tier of 국립국어원's published learner word lists
 * (「한국어 학습용 어휘 목록」, and the later 「한국어 교육 어휘 내용 개발」
 * 4단계 고급 list), cross-read against released TOPIK II 읽기·듣기 papers from
 * 국립국제교육원 and the 고급 vocabulary of the standard university series
 * (연세·서강·서울대 5–6급). Assembled by hand from those, not scraped — so it
 * is a draft until reviewed. Draft review: docs/packs/topik-pack-draft.md
 * Backs: docs/packs/topik-backs-draft.md
 *
 * **English backs only.** The study side is the `korean` slot, so an authored
 * Korean back would be overwritten at save time and could never be read.
 *
 * These backs are seeds. Much of this list is exactly the vocabulary whose
 * value does not fit on one line — 여건 and 취지 are the clearest cases — so the
 * gloss exists to make the word savable and reviewable, and the definition,
 * hanja breakdown and examples are generated on demand per card. Before, that
 * generation was mandatory and came before the card existed; now it is optional
 * and comes after.
 *
 * `context` carries more weight here than it did on TOEIC. Korean homographs are
 * one form with unrelated senses (경기, 미치다, 지나치다), and idioms are the
 * sharper case: 발이 넓다 explained literally is a sentence about feet. Every
 * multi-word entry here is idiomatic and says so. The hint survives onto the
 * saved card, so the depth call made months later still explains the right one.
 */
export const TOPIK_ADVANCED_PACK: VocabPack = {
  id: 'topik-advanced',
  name: { English: 'TOPIK Advanced Vocabulary', Korean: 'TOPIK 고급 어휘' },
  description: {
    English:
      'The 5–6급 register TOPIK II actually tests — abstract 한자어, news and lecture verbs, and the idioms that decide a 고급 score, where a one-word English gloss is not enough.',
    Korean:
      'TOPIK II가 실제로 묻는 5·6급 어휘 — 추상 한자어와 시사·강연 동사, 그리고 고급 점수를 가르는 관용 표현.',
  },
  layout: 'list',
  sections: [
    {
      id: 'current-affairs',
      name: { English: 'Current affairs & society', Korean: '시사·사회' },
      note: {
        English: 'The standing subject matter of 읽기 and 듣기 above 4급, and what a 쓰기 53번 chart description is written in.',
        Korean: '4급 이상 읽기·듣기의 단골 주제이자, 쓰기 53번 도표 설명을 쓰는 데 필요한 어휘예요.',
      },
      entries: [
        { study: '격차', back: { English: 'gap, disparity' } },
        { study: '양극화', back: { English: 'polarization' } },
        { study: '고령화', back: { English: 'population ageing' } },
        { study: '저출산', back: { English: 'low birth rate' } },
        { study: '복지', back: { English: 'welfare' } },
        { study: '정책', back: { English: 'policy' } },
        { study: '규제', back: { English: 'regulation' } },
        { study: '여론', back: { English: 'public opinion' } },
        { study: '물가', back: { English: 'consumer prices' }, context: 'the general level of prices, as in 물가가 오르다' },
        { study: '경기', back: { English: 'economic conditions' }, context: 'the state of the economy, as in 경기 침체 — not a sports match' },
        { study: '침체', back: { English: 'slump, stagnation' } },
        { study: '실업률', back: { English: 'unemployment rate' } },
        { study: '고용', back: { English: 'employment' } },
        { study: '소비', back: { English: 'consumption' } },
        { study: '유통', back: { English: 'distribution' } },
        { study: '수요', back: { English: 'demand' } },
        { study: '공급', back: { English: 'supply' } },
        { study: '부작용', back: { English: 'side effect' } },
        { study: '실태', back: { English: 'the actual state of things' } },
        { study: '추세', back: { English: 'trend' } },
        { study: '현황', back: { English: 'current status' } },
        { study: '대책', back: { English: 'countermeasure' } },
        // Split from 대책: one answers a problem, the other is a proposal.
        { study: '방안', back: { English: 'proposed measure, plan' } },
        { study: '논란', back: { English: 'controversy' } },
        { study: '우려', back: { English: 'concern' } },
        { study: '갈등', back: { English: 'conflict' } },
        { study: '훼손', back: { English: 'damage, degradation' }, context: 'damage to something that should have been kept intact, as in 환경 훼손' },
        { study: '자원', back: { English: 'resources' }, context: 'natural or human resources, as in 자원 개발 — not volunteering' },
        { study: '차별', back: { English: 'discrimination' } },
        { study: '소외', back: { English: 'alienation, marginalization' } },
      ],
    },
    {
      id: 'abstract-nouns',
      name: { English: 'The nouns an argument is built from', Korean: '추상 개념' },
      note: {
        English: 'What makes a 고급 읽기 passage hard: the grammar is plain and every load-bearing word is one of these.',
        Korean: '고급 읽기가 어려운 이유 — 문법은 평이한데 문장을 지탱하는 단어가 전부 이런 말이에요.',
      },
      entries: [
        { study: '인식', back: { English: 'perception, awareness' } },
        { study: '관점', back: { English: 'perspective, viewpoint' } },
        { study: '편견', back: { English: 'prejudice' } },
        { study: '근거', back: { English: 'grounds, basis' } },
        { study: '요인', back: { English: 'factor' } },
        { study: '여건', back: { English: 'conditions, circumstances' } },
        { study: '취지', back: { English: 'the intent behind something' } },
        { study: '성향', back: { English: 'disposition, temperament' } },
        // Split from 성향 and 추세: a general leaning, not a person's nature
        // and not movement over time.
        { study: '경향', back: { English: 'tendency' } },
        { study: '역량', back: { English: 'capability, competence' } },
        { study: '자질', back: { English: 'qualities, aptitude' } },
        { study: '잠재력', back: { English: 'potential' } },
        { study: '효율', back: { English: 'efficiency' } },
        { study: '배려', back: { English: 'consideration for others' } },
        { study: '성찰', back: { English: 'self-reflection' } },
        { study: '의의', back: { English: 'significance' }, context: 'the significance of something, as in 역사적 의의' },
        { study: '전제', back: { English: 'premise, precondition' }, context: 'a premise or precondition that something rests on' },
        { study: '맥락', back: { English: 'context' } },
        { study: '측면', back: { English: 'aspect' } },
        { study: '속성', back: { English: 'inherent property' }, context: 'an inherent property or attribute of something' },
        { study: '비중', back: { English: 'proportion, weight' }, context: 'the proportion or share something accounts for' },
        { study: '수단', back: { English: 'means, method' } },
        { study: '기준', back: { English: 'standard, criterion' } },
        { study: '지표', back: { English: 'indicator' }, context: 'an indicator or index, as in 경제 지표' },
        { study: '대안', back: { English: 'alternative' } },
        { study: '한계', back: { English: 'limit' } },
        { study: '모순', back: { English: 'contradiction' } },
        { study: '타당성', back: { English: 'validity' } },
        { study: '균형', back: { English: 'balance' } },
        { study: '정서', back: { English: 'shared sentiment' }, context: 'shared feeling or sentiment, as in 국민 정서' },
      ],
    },
    {
      id: 'verbs',
      name: { English: 'Advanced verbs', Korean: '고급 동사' },
      note: {
        English: 'The verbs that carry a 신문 기사 or a 강연. Several are everyday forms whose written-register sense is the tested one — that is what the hints pin.',
        Korean: '신문 기사와 강연을 이끄는 동사들. 일상적인 형태지만 문어에서 쓰는 뜻이 시험에 나오는 경우가 많아 힌트를 달았어요.',
      },
      entries: [
        // 초래/야기/유발 are three near-synonyms split by nuance: a bad outcome,
        // neutral emergence, a direct trigger.
        { study: '초래하다', back: { English: 'to bring about, to result in' } },
        { study: '야기하다', back: { English: 'to give rise to' } },
        { study: '유발하다', back: { English: 'to trigger, to induce' } },
        { study: '좌우하다', back: { English: 'to determine, to decide the outcome of' } },
        { study: '도모하다', back: { English: 'to seek to promote' } },
        { study: '모색하다', back: { English: 'to explore a way forward' } },
        { study: '시사하다', back: { English: 'to suggest, to imply' } },
        { study: '감안하다', back: { English: 'to take into account' } },
        { study: '부각되다', back: { English: 'to come to the fore' } },
        { study: '대두되다', back: { English: 'to emerge as an issue' } },
        { study: '급증하다', back: { English: 'to surge' } },
        { study: '완화하다', back: { English: 'to ease, to relax' } },
        { study: '촉진하다', back: { English: 'to promote, to accelerate' } },
        { study: '억제하다', back: { English: 'to curb, to suppress' } },
        { study: '반영하다', back: { English: 'to reflect' } },
        { study: '지속되다', back: { English: 'to continue, to persist' } },
        { study: '위축되다', back: { English: 'to shrink, to contract' } },
        { study: '정착하다', back: { English: 'to take root, to settle' } },
        { study: '도입하다', back: { English: 'to introduce, to adopt' } },
        { study: '확산되다', back: { English: 'to spread' } },
        { study: '추진하다', back: { English: 'to push forward' } },
        { study: '보완하다', back: { English: 'to supplement, to make up for' } },
        { study: '축소하다', back: { English: 'to reduce, to scale down' } },
        { study: '미치다', back: { English: 'to reach, to have an effect on' }, context: 'to reach or have an effect on, as in 영향을 미치다 — not the sense "to go crazy"' },
        { study: '차지하다', back: { English: 'to account for, to occupy' }, context: 'to occupy or account for a share, as in 절반을 차지하다' },
        { study: '밝히다', back: { English: 'to state officially, to reveal' }, context: 'to state or reveal something officially' },
        { study: '살피다', back: { English: 'to examine closely' }, context: 'to examine something carefully' },
        { study: '다루다', back: { English: 'to deal with, to cover' }, context: 'to handle or deal with a topic or an issue' },
        { study: '꼽히다', back: { English: 'to be named as, to be counted among' }, context: 'to be named or counted as, as in 대표적인 사례로 꼽히다' },
        { study: '치르다', back: { English: 'to hold an event, to pay a price' }, context: 'to hold or go through an event, or to pay a price' },
        { study: '겪다', back: { English: 'to go through, to undergo' } },
        { study: '이루어지다', back: { English: 'to take place, to consist of' } },
        { study: '마련하다', back: { English: 'to put in place, to arrange' }, context: 'to arrange or put something in place, as in 대책을 마련하다' },
        { study: '기여하다', back: { English: 'to contribute' } },
        { study: '극복하다', back: { English: 'to overcome' } },
        { study: '지적하다', back: { English: 'to point out' } },
        { study: '촉구하다', back: { English: 'to urge, to call for' } },
        { study: '뒷받침하다', back: { English: 'to back up with evidence' } },
        { study: '헤아리다', back: { English: 'to fathom, to be considerate of' } },
        { study: '아우르다', back: { English: 'to encompass, to bring together' } },
      ],
    },
    {
      id: 'descriptives',
      name: { English: 'Describing & grading', Korean: '형용사·묘사' },
      note: {
        English: 'How a 고급 passage grades something. 미미하다 vs 막대하다 is often the whole answer to a 읽기 문제.',
        Korean: '고급 지문이 정도를 나타내는 방식 — 미미하다와 막대하다의 차이가 곧 읽기 문제의 답인 경우가 많아요.',
      },
      entries: [
        // Glossed "to be X" throughout: these are 형용사 in Korean but conjugate
        // as predicates, and filing 미미하다 as the English adjective
        // "negligible" produces 미미한 것이 있다 with no idea why it is wrong.
        { study: '뚜렷하다', back: { English: 'to be clear, to be distinct' } },
        { study: '미미하다', back: { English: 'to be negligible' } },
        { study: '막대하다', back: { English: 'to be enormous' } },
        { study: '무분별하다', back: { English: 'to be indiscriminate' } },
        { study: '사소하다', back: { English: 'to be trivial' } },
        { study: '원활하다', back: { English: 'to go smoothly' } },
        { study: '저조하다', back: { English: 'to be poor, to be sluggish' } },
        { study: '활발하다', back: { English: 'to be active, to be lively' } },
        { study: '두드러지다', back: { English: 'to stand out, to be marked' } },
        { study: '불가피하다', back: { English: 'to be unavoidable' } },
        { study: '바람직하다', back: { English: 'to be desirable' } },
        { study: '부당하다', back: { English: 'to be unjust' } },
        { study: '타당하다', back: { English: 'to be valid, to be reasonable' } },
        { study: '모호하다', back: { English: 'to be ambiguous' } },
        { study: '절실하다', back: { English: 'to be urgently needed' } },
        { study: '냉정하다', back: { English: 'to be cool-headed, to be cold' } },
        { study: '까다롭다', back: { English: 'to be picky, to be demanding' } },
        { study: '번거롭다', back: { English: 'to be troublesome' } },
        // Split from 무분별하다: without regard for risk, not without discrimination.
        { study: '무모하다', back: { English: 'to be reckless, to be foolhardy' } },
        { study: '지나치다', back: { English: 'to be excessive' }, context: 'to be excessive — the same form also means "to pass by"' },
      ],
    },
    {
      id: 'connectives',
      name: { English: 'Adverbs & connectives', Korean: '부사·연결 표현' },
      note: {
        English: 'The half of 쓰기 54번 that is not vocabulary at all — what makes an answer read as 고급 is how its sentences are joined. Also the standard 빈칸 answers.',
        Korean: '쓰기 54번에서 어휘가 아닌 나머지 절반 — 문장을 잇는 방식이 고급인지 아닌지를 가릅니다. 빈칸 문제의 단골 답이기도 해요.',
      },
      entries: [
        // Most of these do not translate to a word but to a position in an
        // argument, so several backs are short phrases. That is the honest form.
        { study: '오히려', back: { English: 'rather, instead' } },
        { study: '비로소', back: { English: 'only then' }, context: 'only then, after something else finally made it possible' },
        { study: '굳이', back: { English: "going out of one's way to" } },
        { study: '어차피', back: { English: 'in any case, either way' } },
        { study: '좀처럼', back: { English: 'hardly ever' }, context: 'hardly ever — used with a negative ending' },
        { study: '자칫', back: { English: 'one slip and, all too easily' }, context: 'at the slightest slip, usually followed by -(으)면' },
        { study: '하물며', back: { English: 'let alone, much less' } },
        // Split from 오히려, which is the closest call in the pack: 도리어
        // carries more reversal of expectation.
        { study: '도리어', back: { English: 'contrary to expectation' } },
        { study: '이왕이면', back: { English: "if you're going to do it at all" } },
        { study: '마침내', back: { English: 'finally, in the end' } },
        { study: '새삼', back: { English: 'anew, all over again' } },
        { study: '무려', back: { English: 'as many as, no less than' }, context: 'as many as — marking a number as surprisingly large' },
        { study: '다만', back: { English: 'however, with one qualification' }, context: 'however, adding one qualification to what was just said' },
        { study: '아울러', back: { English: 'in addition, together with' } },
        { study: '나아가', back: { English: 'furthermore, going further' }, context: 'furthermore, extending the point to something broader' },
        { study: '반면', back: { English: 'on the other hand, whereas' }, context: 'on the other hand — the contrastive connective 반면(에)' },
        { study: '이에 따라', back: { English: 'accordingly, as a result' }, context: 'accordingly, as a consequence of what was just stated' },
        { study: '이른바', back: { English: 'so-called' } },
        { study: '이를테면', back: { English: 'for instance, so to speak' } },
        { study: '심지어', back: { English: 'even, going so far as' } },
      ],
    },
    {
      id: 'idioms',
      name: { English: 'Idioms & 사자성어', Korean: '관용 표현·사자성어' },
      note: {
        English: 'Explicitly tested at 고급, and the entries most in need of a hint: read literally, every one is a sentence about a body part.',
        Korean: '고급에서 직접 출제되는 표현들. 글자 그대로 읽으면 전부 신체 부위 이야기라 힌트가 꼭 필요해요.',
      },
      entries: [
        // The hint and the back say much the same thing here, because an idiom's
        // hint always *was* its meaning — it exists to stop the depth call
        // explaining 발이 넓다 as a remark about feet. Kept on both sides: the
        // duplication costs nothing at save time and the hint still does its job
        // on the enrichment call.
        { study: '발이 넓다', back: { English: 'to know a lot of people' }, context: 'idiom: to know a lot of people' },
        { study: '손을 떼다', back: { English: "to wash one's hands of something" }, context: 'idiom: to stop being involved in something' },
        { study: '눈치를 보다', back: { English: 'to read the room before acting' }, context: "idiom: to read someone else's mood before acting" },
        { study: '어깨가 무겁다', back: { English: 'to feel the weight of responsibility' }, context: 'idiom: to feel the weight of a responsibility' },
        { study: '입이 무겁다', back: { English: 'to be good at keeping secrets' }, context: 'idiom: to be good at keeping a secret' },
        { study: '발목을 잡다', back: { English: 'to hold something back' }, context: 'idiom: to hold something back from progressing' },
        { study: '진땀을 흘리다', back: { English: 'to sweat through a difficult situation' }, context: 'idiom: to sweat through a difficult situation' },
        { study: '한 술 더 뜨다', back: { English: 'to go one step further, for the worse' }, context: 'idiom: to go a step further than someone, usually for the worse' },
        { study: '눈코 뜰 새 없다', back: { English: 'to be far too busy to spare a moment' }, context: 'idiom: to be far too busy to spare a moment' },
        { study: '귀가 얇다', back: { English: 'to be easily swayed' }, context: 'idiom: to be easily persuaded by what others say' },
        { study: '배가 아프다', back: { English: "to be envious of someone's good fortune" }, context: "idiom: to be envious of someone else's good fortune" },
        { study: '코가 납작해지다', back: { English: 'to be taken down a peg' }, context: 'idiom: to be humbled after having been arrogant' },
        { study: '이심전심', back: { English: 'understanding without words' }, context: 'four-character idiom: understanding each other without words' },
        { study: '설상가상', back: { English: 'one misfortune on top of another' }, context: 'four-character idiom: one misfortune on top of another' },
        { study: '자업자득', back: { English: 'reaping what you sow' }, context: 'four-character idiom: reaping the results of your own doing' },
        { study: '유유상종', back: { English: 'birds of a feather flock together' }, context: 'four-character idiom: like gathers with like' },
        { study: '일석이조', back: { English: 'two birds with one stone' }, context: 'four-character idiom: two birds with one stone' },
        { study: '반신반의', back: { English: 'half believing, half doubting' }, context: 'four-character idiom: half believing, half doubting' },
        { study: '우유부단', back: { English: 'chronically indecisive' }, context: 'four-character idiom: chronically indecisive' },
        { study: '어부지리', back: { English: 'profiting while two others fight' }, context: 'four-character idiom: a third party profiting while two others fight' },
      ],
    },
  ],
};
