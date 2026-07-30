import type { LookupPack } from './packs';

/**
 * TOPIK 고급 (5·6급) vocabulary — a `lookup` pack, because these are exactly
 * the words whose value is in the explanation: an abstract 한자어 like 여건 or
 * 취지 has no usable one-word English gloss, and most of them are Sino-Korean,
 * so the hanja breakdown the Learn flow already writes for Korean is doing real
 * work here rather than decorating a word you could have translated.
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
 *
 * `context` carries more weight than it did on TOEIC. Korean homographs are
 * one form with unrelated senses (경기, 미치다, 지나치다), and idioms are the
 * sharper case: 발이 넓다 explained literally is a sentence about feet. Every
 * multi-word entry here is idiomatic and says so.
 */
export const TOPIK_ADVANCED_PACK: LookupPack = {
  kind: 'lookup',
  id: 'topik-advanced',
  name: { English: 'TOPIK Advanced Vocabulary', Korean: 'TOPIK 고급 어휘' },
  description: {
    English:
      'The 5–6급 register TOPIK II actually tests — abstract 한자어, news and lecture verbs, and the idioms that decide a 고급 score, where a one-word English gloss is not enough.',
    Korean:
      'TOPIK II가 실제로 묻는 5·6급 어휘 — 추상 한자어와 시사·강연 동사, 그리고 고급 점수를 가르는 관용 표현.',
  },
  words: [
    // 시사·사회 — the standing subject matter of 읽기 and 듣기 above 4급, and
    // the vocabulary a 쓰기 53번 chart description is written in.
    { word: '격차' },
    { word: '양극화' },
    { word: '고령화' },
    { word: '저출산' },
    { word: '복지' },
    { word: '정책' },
    { word: '규제' },
    { word: '여론' },
    { word: '물가', context: 'the general level of prices, as in 물가가 오르다' },
    { word: '경기', context: 'the state of the economy, as in 경기 침체 — not a sports match' },
    { word: '침체' },
    { word: '실업률' },
    { word: '고용' },
    { word: '소비' },
    { word: '유통' },
    { word: '수요' },
    { word: '공급' },
    { word: '부작용' },
    { word: '실태' },
    { word: '추세' },
    { word: '현황' },
    { word: '대책' },
    { word: '방안' },
    { word: '논란' },
    { word: '우려' },
    { word: '갈등' },
    { word: '훼손', context: 'damage to something that should have been kept intact, as in 환경 훼손' },
    { word: '자원', context: 'natural or human resources, as in 자원 개발 — not volunteering' },
    { word: '차별' },
    { word: '소외' },
    // 추상 개념 — the nouns an argument is built out of. These are what makes a
    // 고급 읽기 passage hard: the sentence is grammatically plain and every
    // load-bearing word is one of these.
    { word: '인식' },
    { word: '관점' },
    { word: '편견' },
    { word: '근거' },
    { word: '요인' },
    { word: '여건' },
    { word: '취지' },
    { word: '성향' },
    { word: '경향' },
    { word: '역량' },
    { word: '자질' },
    { word: '잠재력' },
    { word: '효율' },
    { word: '배려' },
    { word: '성찰' },
    { word: '의의', context: 'the significance of something, as in 역사적 의의' },
    { word: '전제', context: 'a premise or precondition that something rests on' },
    { word: '맥락' },
    { word: '측면' },
    { word: '속성', context: 'an inherent property or attribute of something' },
    { word: '비중', context: 'the proportion or share something accounts for' },
    { word: '수단' },
    { word: '기준' },
    { word: '지표', context: 'an indicator or index, as in 경제 지표' },
    { word: '대안' },
    { word: '한계' },
    { word: '모순' },
    { word: '타당성' },
    { word: '균형' },
    { word: '정서', context: 'shared feeling or sentiment, as in 국민 정서' },
    // 고급 동사 — the verbs that carry a 신문 기사 or a 강연. Several are
    // everyday forms with a written-register sense that is the one TOPIK uses,
    // which is what the context hints are pinning.
    { word: '초래하다' },
    { word: '야기하다' },
    { word: '유발하다' },
    { word: '좌우하다' },
    { word: '도모하다' },
    { word: '모색하다' },
    { word: '시사하다' },
    { word: '감안하다' },
    { word: '부각되다' },
    { word: '대두되다' },
    { word: '급증하다' },
    { word: '완화하다' },
    { word: '촉진하다' },
    { word: '억제하다' },
    { word: '반영하다' },
    { word: '지속되다' },
    { word: '위축되다' },
    { word: '정착하다' },
    { word: '도입하다' },
    { word: '확산되다' },
    { word: '추진하다' },
    { word: '보완하다' },
    { word: '축소하다' },
    { word: '미치다', context: 'to reach or have an effect on, as in 영향을 미치다 — not the sense "to go crazy"' },
    { word: '차지하다', context: 'to occupy or account for a share, as in 절반을 차지하다' },
    { word: '밝히다', context: 'to state or reveal something officially' },
    { word: '살피다', context: 'to examine something carefully' },
    { word: '다루다', context: 'to handle or deal with a topic or an issue' },
    { word: '꼽히다', context: 'to be named or counted as, as in 대표적인 사례로 꼽히다' },
    { word: '치르다', context: 'to hold or go through an event, or to pay a price' },
    { word: '겪다' },
    { word: '이루어지다' },
    { word: '마련하다', context: 'to arrange or put something in place, as in 대책을 마련하다' },
    { word: '기여하다' },
    { word: '극복하다' },
    { word: '지적하다' },
    { word: '촉구하다' },
    { word: '뒷받침하다' },
    { word: '헤아리다' },
    { word: '아우르다' },
    // 형용사·묘사 — how a 고급 passage grades something. 미미하다 vs 막대하다
    // is often the whole answer to a 읽기 문제.
    { word: '뚜렷하다' },
    { word: '미미하다' },
    { word: '막대하다' },
    { word: '무분별하다' },
    { word: '사소하다' },
    { word: '원활하다' },
    { word: '저조하다' },
    { word: '활발하다' },
    { word: '두드러지다' },
    { word: '불가피하다' },
    { word: '바람직하다' },
    { word: '부당하다' },
    { word: '타당하다' },
    { word: '모호하다' },
    { word: '절실하다' },
    { word: '냉정하다' },
    { word: '까다롭다' },
    { word: '번거롭다' },
    { word: '무모하다' },
    { word: '지나치다', context: 'to be excessive — the same form also means "to pass by"' },
    // 부사·연결 표현 — the half of 쓰기 54번 that isn't vocabulary at all: what
    // makes an answer read as 고급 is that its sentences are joined the way a
    // written argument joins them. They are also the standard 빈칸 answers.
    { word: '오히려' },
    { word: '비로소', context: 'only then, after something else finally made it possible' },
    { word: '굳이' },
    { word: '어차피' },
    { word: '좀처럼', context: 'hardly ever — used with a negative ending' },
    { word: '자칫', context: 'at the slightest slip, usually followed by -(으)면' },
    { word: '하물며' },
    { word: '도리어' },
    { word: '이왕이면' },
    { word: '마침내' },
    { word: '새삼' },
    { word: '무려', context: 'as many as — marking a number as surprisingly large' },
    { word: '다만', context: 'however, adding one qualification to what was just said' },
    { word: '아울러' },
    { word: '나아가', context: 'furthermore, extending the point to something broader' },
    { word: '반면', context: 'on the other hand — the contrastive connective 반면(에)' },
    { word: '이에 따라', context: 'accordingly, as a consequence of what was just stated' },
    { word: '이른바' },
    { word: '이를테면' },
    { word: '심지어' },
    // 관용 표현·사자성어 — explicitly tested at 고급, and the entries most in
    // need of a context: read literally, every one of them is a sentence about
    // a body part.
    { word: '발이 넓다', context: 'idiom: to know a lot of people' },
    { word: '손을 떼다', context: 'idiom: to stop being involved in something' },
    { word: '눈치를 보다', context: "idiom: to read someone else's mood before acting" },
    { word: '어깨가 무겁다', context: 'idiom: to feel the weight of a responsibility' },
    { word: '입이 무겁다', context: 'idiom: to be good at keeping a secret' },
    { word: '발목을 잡다', context: 'idiom: to hold something back from progressing' },
    { word: '진땀을 흘리다', context: 'idiom: to sweat through a difficult situation' },
    { word: '한 술 더 뜨다', context: 'idiom: to go a step further than someone, usually for the worse' },
    { word: '눈코 뜰 새 없다', context: 'idiom: to be far too busy to spare a moment' },
    { word: '귀가 얇다', context: 'idiom: to be easily persuaded by what others say' },
    { word: '배가 아프다', context: "idiom: to be envious of someone else's good fortune" },
    { word: '코가 납작해지다', context: 'idiom: to be humbled after having been arrogant' },
    { word: '이심전심', context: 'four-character idiom: understanding each other without words' },
    { word: '설상가상', context: 'four-character idiom: one misfortune on top of another' },
    { word: '자업자득', context: 'four-character idiom: reaping the results of your own doing' },
    { word: '유유상종', context: 'four-character idiom: like gathers with like' },
    { word: '일석이조', context: 'four-character idiom: two birds with one stone' },
    { word: '반신반의', context: 'four-character idiom: half believing, half doubting' },
    { word: '우유부단', context: 'four-character idiom: chronically indecisive' },
    { word: '어부지리', context: 'four-character idiom: a third party profiting while two others fight' },
  ],
};
