import type { VocabPack } from './packs';

/**
 * Everyday English — the words daily life is conducted in.
 *
 * ⚠️ **This pack sets aside the "audience is not beginners" rule, on purpose
 * and on the record.** Every other pack takes a learner who can already hold a
 * conversation and opens a domain they have not met: TOEIC opens the exam
 * register, the military packs open a job, TOPIK 고급 opens the 5·6급 tier. This
 * one is genuinely elementary, and it was asked for that way (2026-08-24). If a
 * future pack wants to argue from precedent, the precedent is a deliberate
 * exception rather than a change of principle — the backlog entry says the same.
 *
 * What the exception is *not* is licence to be vague. A beginner deck fails in a
 * specific way: it fills up with the two hundred words a Korean learner already
 * met in middle school (`happy`, `wait`, `always`) and teaches nothing while
 * feeling comprehensive. So the filter here is **concrete over frequent**. The
 * words are elementary in register and specific in reference — `faucet`,
 * `drawer`, `leftovers`, `errand`, `deposit` — the things you have to name to
 * get through a day, which a Korean speaker with solid school English still
 * reaches for and misses. Bare high-frequency function words are left out; they
 * are learned by being used, not by being carded.
 *
 * **Korean backs only.** The study side is the `english` slot, so an authored
 * English back would be overwritten at save time and could never be read.
 *
 * `context` is here for two cases and not used decoratively. Phrasal verbs
 * (`put away`, `try on`) cannot be read compositionally — the particle is the
 * meaning. And a handful of the nouns are the everyday sense of a word whose
 * commonest sense is something else: `change` is coins, not alteration; `line`
 * is a queue; `dishes` is the washing-up. Those hints survive onto the saved
 * card, so the depth call made months later explains the sense the pack meant.
 *
 * Sources: the everyday-vocabulary strands of the Oxford 3000 and the New
 * General Service List, filtered against 국립국어원's 한국어–영어 생활 어휘
 * pairings for the words that have a Korean equivalent a learner would not
 * guess. Assembled by hand from those, not scraped.
 * Draft review: docs/packs/daily-life-pack-draft.md
 */
export const DAILY_LIFE_PACK: VocabPack = {
  id: 'daily-life',
  name: { English: 'Everyday English', Korean: '생활 영어' },
  description: {
    English:
      'The plain words daily life runs on — the things in your kitchen, the errands, the bus fare, the way you feel about it. Elementary register, specific words.',
    Korean:
      '하루를 살아가는 데 필요한 기본 단어 — 집 안의 물건, 볼일, 교통비, 그날의 기분까지. 쉬운 단어로, 그러나 두루뭉술하지 않게.',
  },
  layout: 'list',
  sections: [
    {
      id: 'house',
      name: { English: 'Around the house', Korean: '집 안에서' },
      note: {
        English: 'The things you point at when you cannot name them.',
        Korean: '이름이 떠오르지 않아 손가락으로 가리키게 되는 것들이에요.',
      },
      entries: [
        { study: 'kitchen', back: { Korean: '부엌' } },
        { study: 'bedroom', back: { Korean: '침실' } },
        { study: 'closet', back: { Korean: '옷장, 붙박이장' } },
        { study: 'drawer', back: { Korean: '서랍' } },
        { study: 'shelf', back: { Korean: '선반' } },
        { study: 'ceiling', back: { Korean: '천장' } },
        { study: 'stairs', back: { Korean: '계단' } },
        { study: 'hallway', back: { Korean: '복도' } },
        { study: 'basement', back: { Korean: '지하실' } },
        { study: 'faucet', back: { Korean: '수도꼭지' } },
        { study: 'sink', back: { Korean: '싱크대, 세면대' }, context: 'the basin in a kitchen or bathroom' },
        { study: 'mirror', back: { Korean: '거울' } },
        { study: 'pillow', back: { Korean: '베개' } },
        { study: 'blanket', back: { Korean: '담요, 이불' } },
        { study: 'towel', back: { Korean: '수건' } },
        { study: 'sheets', back: { Korean: '침대 시트' }, context: 'the cloth you put on a bed' },
        // Split from `trash`: the container, not what goes in it — the word you
        // actually need is the one for the bin.
        { study: 'trash can', back: { Korean: '쓰레기통' } },
        { study: 'laundry', back: { Korean: '빨래, 빨랫감' } },
        { study: 'dishes', back: { Korean: '설거짓거리, 그릇' }, context: 'plates and bowls, or the washing-up itself' },
        { study: 'broom', back: { Korean: '빗자루' } },
        { study: 'outlet', back: { Korean: '콘센트' }, context: 'the socket in a wall you plug something into' },
        { study: 'lightbulb', back: { Korean: '전구' } },
        // 월세 rather than 임대료: the everyday word for what a tenant pays.
        { study: 'rent', back: { Korean: '월세, 집세' } },
        { study: 'deposit', back: { Korean: '보증금' }, context: 'money left with a landlord and returned when you move out' },
      ],
    },
    {
      id: 'food',
      name: { English: 'Food and cooking', Korean: '먹고 요리하기' },
      entries: [
        { study: 'breakfast', back: { Korean: '아침 식사' } },
        { study: 'lunch', back: { Korean: '점심 식사' } },
        { study: 'dinner', back: { Korean: '저녁 식사' } },
        { study: 'snack', back: { Korean: '간식' } },
        { study: 'meal', back: { Korean: '끼니, 식사' } },
        { study: 'leftovers', back: { Korean: '먹다 남은 음식' } },
        { study: 'groceries', back: { Korean: '장 본 식료품' } },
        { study: 'recipe', back: { Korean: '조리법, 레시피' } },
        { study: 'ingredient', back: { Korean: '재료' } },
        { study: 'flour', back: { Korean: '밀가루' } },
        { study: 'beef', back: { Korean: '소고기' } },
        { study: 'pork', back: { Korean: '돼지고기' } },
        { study: 'vegetable', back: { Korean: '채소' } },
        { study: 'fruit', back: { Korean: '과일' } },
        { study: 'spicy', back: { Korean: '매운' } },
        { study: 'salty', back: { Korean: '짠' } },
        { study: 'sour', back: { Korean: '신, 시큼한' } },
        { study: 'bitter', back: { Korean: '쓴' } },
        { study: 'bland', back: { Korean: '싱거운, 밍밍한' } },
        { study: 'boil', back: { Korean: '끓이다, 삶다' } },
        { study: 'fry', back: { Korean: '부치다, 볶다, 튀기다' } },
        // Split from `fry`: the oven, not the pan — Korean 굽다 covers both, so
        // the hint is the entry.
        { study: 'bake', back: { Korean: '(오븐에) 굽다' }, context: 'to cook in an oven, as with bread or cake' },
        { study: 'stir', back: { Korean: '젓다' } },
        { study: 'peel', back: { Korean: '껍질을 벗기다' } },
      ],
    },
    {
      id: 'out',
      name: { English: 'Out and about', Korean: '밖에서' },
      note: {
        English: 'Getting somewhere, and paying for it.',
        Korean: '어딘가로 가는 길, 그리고 돈 내는 일이에요.',
      },
      entries: [
        { study: 'neighborhood', back: { Korean: '동네' } },
        { study: 'sidewalk', back: { Korean: '인도, 보도' } },
        { study: 'crosswalk', back: { Korean: '횡단보도' } },
        { study: 'intersection', back: { Korean: '교차로, 사거리' } },
        { study: 'subway', back: { Korean: '지하철' } },
        { study: 'platform', back: { Korean: '승강장' }, context: 'where you stand to wait for a train' },
        { study: 'transfer', back: { Korean: '갈아타다, 환승하다' }, context: 'to change from one train or bus to another' },
        { study: 'fare', back: { Korean: '교통 요금' } },
        { study: 'round trip', back: { Korean: '왕복' } },
        { study: 'traffic', back: { Korean: '차량 통행, 교통량' } },
        { study: 'parking lot', back: { Korean: '주차장' } },
        { study: 'gas station', back: { Korean: '주유소' } },
        { study: 'pharmacy', back: { Korean: '약국' } },
        { study: 'bakery', back: { Korean: '빵집' } },
        { study: 'post office', back: { Korean: '우체국' } },
        { study: 'receipt', back: { Korean: '영수증' } },
        { study: 'change', back: { Korean: '거스름돈, 잔돈' }, context: 'the money handed back to you after you pay' },
        { study: 'cash', back: { Korean: '현금' } },
        { study: 'line', back: { Korean: '줄' }, context: 'people waiting one behind another — wait in line' },
        { study: 'umbrella', back: { Korean: '우산' } },
        { study: 'delivery', back: { Korean: '배달' } },
      ],
    },
    {
      id: 'day',
      name: { English: 'The shape of a day', Korean: '하루 일과' },
      entries: [
        { study: 'wake up', back: { Korean: '잠에서 깨다' }, context: 'to stop sleeping — not the same as getting out of bed' },
        { study: 'get dressed', back: { Korean: '옷을 입다, 옷을 차려입다' }, context: 'to put your clothes on' },
        { study: 'brush', back: { Korean: '(이를) 닦다, (머리를) 빗다' }, context: 'to clean teeth or tidy hair with a brush' },
        { study: 'commute', back: { Korean: '통근하다, 통학하다' } },
        { study: 'errand', back: { Korean: '볼일, 심부름' } },
        { study: 'chore', back: { Korean: '집안일' } },
        { study: 'nap', back: { Korean: '낮잠' } },
        { study: 'bedtime', back: { Korean: '잘 시간' } },
        { study: 'weekday', back: { Korean: '평일' } },
        { study: 'weekend', back: { Korean: '주말' } },
        { study: 'holiday', back: { Korean: '휴일, 공휴일' } },
        { study: 'day off', back: { Korean: '쉬는 날' }, context: 'a day you are not working' },
        { study: 'appointment', back: { Korean: '(병원·관공서) 예약' }, context: 'a fixed time to see a doctor, dentist or official' },
        { study: 'routine', back: { Korean: '늘 하는 일과' } },
        { study: 'early', back: { Korean: '이른, 일찍' } },
        // Split from `early`: the pair is the point — one word each, learned together.
        { study: 'late', back: { Korean: '늦은, 늦게' } },
        { study: 'on time', back: { Korean: '제시간에' } },
        { study: 'in a hurry', back: { Korean: '급히, 서둘러' } },
        { study: 'hardly ever', back: { Korean: '거의 ~하지 않는' }, context: 'almost never — hardly ever goes out' },
        { study: 'usually', back: { Korean: '보통, 대개' } },
      ],
    },
    {
      id: 'people',
      name: { English: 'People and how they feel', Korean: '사람과 기분' },
      note: {
        English: 'The feeling words are where a beginner deck usually stops at happy and sad. These are the next twelve.',
        Korean: '보통 기초 단어장은 happy와 sad에서 멈춰요. 그다음에 필요한 열두 개예요.',
      },
      entries: [
        { study: 'neighbor', back: { Korean: '이웃' } },
        { study: 'relative', back: { Korean: '친척' } },
        { study: 'cousin', back: { Korean: '사촌' } },
        { study: 'nephew', back: { Korean: '조카 (남자)' } },
        { study: 'niece', back: { Korean: '조카 (여자)' } },
        { study: 'grandchild', back: { Korean: '손주' } },
        { study: 'lonely', back: { Korean: '외로운' } },
        { study: 'bored', back: { Korean: '지루한, 심심한' } },
        { study: 'nervous', back: { Korean: '긴장한, 초조한' } },
        { study: 'upset', back: { Korean: '속상한, 마음이 상한' } },
        { study: 'proud', back: { Korean: '자랑스러운' } },
        { study: 'grateful', back: { Korean: '고마워하는' } },
        { study: 'embarrassed', back: { Korean: '창피한, 민망한' } },
        { study: 'annoyed', back: { Korean: '짜증 난' } },
        { study: 'calm', back: { Korean: '차분한, 침착한' } },
        { study: 'shy', back: { Korean: '수줍은, 낯을 가리는' } },
        { study: 'polite', back: { Korean: '예의 바른' } },
        { study: 'rude', back: { Korean: '무례한, 버릇없는' } },
        { study: 'strict', back: { Korean: '엄격한' } },
        { study: 'generous', back: { Korean: '후한, 인심 좋은' } },
        { study: 'stubborn', back: { Korean: '고집 센' } },
        { study: 'picky', back: { Korean: '까다로운, 가리는 게 많은' } },
      ],
    },
    {
      id: 'health',
      name: { English: 'When you are not well', Korean: '몸이 안 좋을 때' },
      note: {
        English: 'The words a pharmacy visit needs, which are exactly the ones you cannot look up while you are ill.',
        Korean: '약국에서 필요한 말들 — 정작 아플 때는 찾아볼 겨를이 없는 단어들이에요.',
      },
      entries: [
        { study: 'fever', back: { Korean: '열' } },
        { study: 'cough', back: { Korean: '기침' } },
        { study: 'sore throat', back: { Korean: '목이 아픔, 인후통' } },
        { study: 'runny nose', back: { Korean: '콧물' } },
        { study: 'dizzy', back: { Korean: '어지러운' } },
        { study: 'itchy', back: { Korean: '가려운' } },
        { study: 'swollen', back: { Korean: '부은' } },
        { study: 'bruise', back: { Korean: '멍' } },
        { study: 'sprain', back: { Korean: '삐다, 접질리다' } },
        { study: 'rash', back: { Korean: '발진, 두드러기' } },
        { study: 'prescription', back: { Korean: '처방전' } },
        { study: 'pill', back: { Korean: '알약' } },
        { study: 'bandage', back: { Korean: '붕대, 반창고' } },
        { study: 'checkup', back: { Korean: '건강 검진' } },
      ],
    },
    {
      id: 'verbs',
      name: { English: 'Verbs you use every day', Korean: '매일 쓰는 동사' },
      note: {
        English: 'Half of these are two words, and the second word is where the meaning lives.',
        Korean: '절반은 두 단어짜리예요. 뜻을 결정하는 건 뒤에 붙는 그 한 단어고요.',
      },
      entries: [
        { study: 'borrow', back: { Korean: '빌리다' }, context: 'to take something and give it back later' },
        // Split from `borrow`: Korean 빌리다 covers both directions, English does not.
        { study: 'lend', back: { Korean: '빌려주다' }, context: 'to give something for someone else to use and return' },
        { study: 'return', back: { Korean: '돌려주다, 반납하다' }, context: 'to give something back' },
        { study: 'throw away', back: { Korean: '버리다' }, context: 'to put in the bin' },
        { study: 'put away', back: { Korean: '치우다, 제자리에 넣다' }, context: 'to return things to where they are kept — not to discard them' },
        { study: 'hang', back: { Korean: '걸다, 널다' } },
        { study: 'fold', back: { Korean: '개다, 접다' } },
        { study: 'wipe', back: { Korean: '닦다' } },
        { study: 'rinse', back: { Korean: '헹구다' } },
        { study: 'sweep', back: { Korean: '(비로) 쓸다' } },
        { study: 'plug in', back: { Korean: '(전원에) 꽂다' }, context: 'to connect to electricity' },
        { study: 'turn off', back: { Korean: '끄다, 잠그다' }, context: 'to stop a light, device or tap' },
        { study: 'try on', back: { Korean: '입어 보다, 신어 보다' }, context: 'to put clothes on in a shop to see if they fit' },
        { study: 'lock', back: { Korean: '잠그다' } },
        { study: 'knock', back: { Korean: '노크하다, 두드리다' } },
        { study: 'whisper', back: { Korean: '속삭이다' } },
        { study: 'shout', back: { Korean: '소리치다' } },
        { study: 'hurry', back: { Korean: '서두르다' } },
        { study: 'forget', back: { Korean: '잊다, 깜빡하다' } },
        { study: 'remember', back: { Korean: '기억하다, 기억나다' } },
        { study: 'choose', back: { Korean: '고르다' } },
        { study: 'carry', back: { Korean: '들고 가다, 나르다' } },
        { study: 'drop', back: { Korean: '떨어뜨리다' } },
        { study: 'share', back: { Korean: '나누다, 같이 쓰다' } },
      ],
    },
  ],
};
