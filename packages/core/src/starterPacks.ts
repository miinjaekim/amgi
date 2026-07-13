import type { StudyLanguage } from './types';
import type { TranslationKey } from './i18n';

/**
 * Curated starter word lists for brand-new learners. Each pack feeds the
 * bulk-import pipeline (one /api/explain call per word), so words are kept
 * unambiguous enough to resolve without a disambiguation step.
 */
export interface StarterPack {
  id: string;
  nameKey: TranslationKey;
  words: string[];
}

export const STARTER_PACKS: Record<StudyLanguage, StarterPack[]> = {
  Korean: [
    {
      id: 'greetings',
      nameKey: 'packGreetings',
      words: ['안녕하세요', '감사합니다', '죄송합니다', '네', '아니요', '만나서 반갑습니다', '안녕히 가세요', '괜찮아요', '저', '이름'],
    },
    {
      id: 'time',
      nameKey: 'packTime',
      words: ['오늘', '내일', '어제', '지금', '아침', '저녁', '주말', '시간', '요일', '매일'],
    },
    {
      id: 'food',
      nameKey: 'packFood',
      words: ['밥', '물', '먹다', '마시다', '맛있다', '식당', '메뉴', '주문하다', '계산', '커피'],
    },
    {
      id: 'verbs',
      nameKey: 'packVerbs',
      words: ['가다', '오다', '하다', '보다', '듣다', '말하다', '주다', '받다', '사다', '알다'],
    },
  ],
  Swedish: [
    {
      id: 'greetings',
      nameKey: 'packGreetings',
      words: ['hej', 'tack', 'förlåt', 'ja', 'nej', 'varsågod', 'hej då', 'trevligt att träffas', 'jag', 'namn'],
    },
    {
      id: 'time',
      nameKey: 'packTime',
      words: ['idag', 'imorgon', 'igår', 'nu', 'morgon', 'kväll', 'helg', 'tid', 'vecka', 'varje dag'],
    },
    {
      id: 'food',
      nameKey: 'packFood',
      words: ['mat', 'vatten', 'äta', 'dricka', 'gott', 'restaurang', 'meny', 'beställa', 'nota', 'kaffe'],
    },
    {
      id: 'verbs',
      nameKey: 'packVerbs',
      words: ['gå', 'komma', 'göra', 'se', 'höra', 'prata', 'ge', 'få', 'köpa', 'veta'],
    },
  ],
  French: [
    {
      id: 'greetings',
      nameKey: 'packGreetings',
      words: ['bonjour', 'merci', 'pardon', 'oui', 'non', "s'il vous plaît", 'au revoir', 'enchanté', 'je', 'nom'],
    },
    {
      id: 'time',
      nameKey: 'packTime',
      words: ["aujourd'hui", 'demain', 'hier', 'maintenant', 'matin', 'soir', 'week-end', 'temps', 'semaine', 'jour'],
    },
    {
      id: 'food',
      nameKey: 'packFood',
      words: ['manger', 'boire', 'eau', 'délicieux', 'restaurant', 'menu', 'commander', 'addition', 'café', 'pain'],
    },
    {
      id: 'verbs',
      nameKey: 'packVerbs',
      words: ['aller', 'venir', 'faire', 'voir', 'entendre', 'parler', 'donner', 'recevoir', 'acheter', 'savoir'],
    },
  ],
  Japanese: [
    {
      id: 'greetings',
      nameKey: 'packGreetings',
      words: ['こんにちは', 'ありがとう', 'すみません', 'はい', 'いいえ', 'おはよう', 'さようなら', 'はじめまして', '私', '名前'],
    },
    {
      id: 'time',
      nameKey: 'packTime',
      words: ['今日', '明日', '昨日', '今', '朝', '夜', '週末', '時間', '毎日', '曜日'],
    },
    {
      id: 'food',
      nameKey: 'packFood',
      words: ['ご飯', '水', '食べる', '飲む', '美味しい', 'レストラン', 'メニュー', '注文', '会計', 'コーヒー'],
    },
    {
      id: 'verbs',
      nameKey: 'packVerbs',
      words: ['行く', '来る', 'する', '見る', '聞く', '話す', 'あげる', 'もらう', '買う', '分かる'],
    },
  ],
  English: [
    {
      id: 'greetings',
      nameKey: 'packGreetings',
      words: ['hello', 'thank you', 'sorry', 'please', 'goodbye', 'nice to meet you', 'excuse me', 'welcome', 'okay', 'see you later'],
    },
    {
      id: 'time',
      nameKey: 'packTime',
      words: ['today', 'tomorrow', 'yesterday', 'now', 'morning', 'evening', 'weekend', 'week', 'daily', 'hour'],
    },
    {
      id: 'food',
      nameKey: 'packFood',
      words: ['eat', 'drink', 'water', 'delicious', 'restaurant', 'menu', 'order', 'bill', 'breakfast', 'coffee'],
    },
    {
      id: 'verbs',
      nameKey: 'packVerbs',
      words: ['go', 'come', 'do', 'see', 'hear', 'speak', 'give', 'receive', 'buy', 'know'],
    },
  ],
};
