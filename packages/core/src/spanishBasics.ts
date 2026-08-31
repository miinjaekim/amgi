import type { VocabPack } from './packs';

/**
 * Spanish Basics — the app's first genuinely elementary deck.
 *
 * ⚠️ **This pack sets aside the "audience is not beginners" rule, and does so
 * further than `dailyLife.ts` did.** That pack's learners had a decade of school
 * English behind them, so it could still filter *concrete over frequent*. A
 * Spanish learner starting at `hola` has nothing behind them and that filter has
 * nothing to bite on. Asked for this way on 2026-08-31 and recorded as a second
 * deliberate exception rather than a change of principle.
 *
 * What the exception is *not* is licence to be vague. A starter list fails by
 * filling with words that carry no information — `casa`, `grande`, `bueno` —
 * which feels comprehensive and teaches nothing you would not absorb in a week
 * anyway. So the filter here is **the word you are stuck without**: the thing you
 * cannot mime, the distinction that is invisible from English, and the
 * peninsular form a Latin American phrasebook would get wrong for you. `caña`,
 * `carta`, `todo recto`, `planta baja`, `ser`/`estar`, `pedir`/`preguntar`.
 *
 * **Both backs are authored**, unlike every list pack before it. On a Spanish
 * deck the study side is the `spanish` slot, so `getBackSideConfig` hands an
 * English-native reader the `english` back and a Korean-native reader the
 * `korean` one — neither slot is dead weight here.
 *
 * **European Spanish**, and these five topics are exactly where that shows —
 * see the registry comment on `Spanish` in `types.ts` for why the variety is a
 * deck rather than a setting. `caña`, `zumo`, `patata`, `tortilla` as the potato
 * omelette, `billete`, `todo recto`, `servicios`, `planta baja`.
 * **`coger` is deliberate**: the ordinary verb for catching a
 * bus in Spain and vulgar across much of Latin America. It is here because the
 * deck is European Spanish, and its `context` says so.
 *
 * **A gloss translates; a `context` explains.** `menú del día` is "the menu
 * of the day" and *not* "the set lunch" — the fixed price and the four courses
 * are an institution, and institutions belong in the hint, which survives onto
 * the card as `briefDefinition` and steers every later depth call. The same
 * correction was applied to `primer plato`, `segundo plato` and
 * `ración` on review. Entries whose Spanish has no compositional reading to
 * give keep a functional gloss: `caña`, `servicios`, `manzana`, `todo recto`,
 * `planta baja`.
 *
 * `tapas` is the one place a back **defines** rather than glossing, and it is
 * the principled exception rather than a lapse: English borrowed the word
 * unchanged and Korean transliterated it, so "tapas"/타파스 said the front back
 * to the learner. `pack-cards.test.ts` refuses a back equal to its front, which
 * is what caught it. Where no translation exists, a definition is the only
 * honest back.
 *
 * **`gender` is set on every noun, and the study side is the bare noun** — which
 * is what `PackEntry.gender` was added for; see `packs.ts`. The first draft of
 * this list had the article in *both* places, and that is the mistake to not
 * make again: `study: 'la carta'` beside `gender: 'la'` has `acceptedAnswers`
 * take `la la carta`, and leaves a pack card and a looked-up card holding two
 * different strings for one word. `/api/explain` returns the bare noun plus its
 * article, so this does too — the badge renders the same either way, and typed
 * review takes `carta` and `la carta` both.
 *
 * **Phrases are entries in three of the five sections**, under one rule: a
 * question is authored complete and with its punctuation (`¿dónde está el
 * baño?`), a frame the learner finishes is authored bare (`me llamo`). Never a
 * half-sentence — `foldText` folds away neither the `¿` nor the accents, so a
 * bare `cómo te llamas` would teach the learner to write Spanish wrong to save
 * them a tap on the rating row, and the pronounce button would read a fragment
 * aloud on a `pronounceable` pack.
 *
 * Draft review: docs/packs/spanish-basics-pack-draft.md
 */
export const SPANISH_BASICS_PACK: VocabPack = {
  id: 'spanish-basics',
  name: { English: 'Spanish Basics', Korean: '스페인어 기초' },
  description: {
    English:
      'The first Spanish you actually use — greeting someone, counting, ordering, finding your way, and the verbs the rest of it hangs on. European Spanish throughout.',
    Korean:
      '실제로 입에서 나오는 첫 스페인어 — 인사, 숫자, 주문, 길 찾기, 그리고 나머지를 지탱하는 동사들. 전부 스페인 본토 스페인어예요.',
  },
  layout: 'list',
  pronounceable: true,
  sections: [
    {
      id: 'greetings',
      name: { English: 'Greetings and introductions', Korean: '인사와 소개' },
      note: {
        English:
          'The first ten minutes of any conversation, in the order they happen. Spain keeps a pronoun the rest of the Spanish world dropped — vosotros, informal plural "you", where Latin America says ustedes to everybody.',
        Korean:
          '어떤 대화든 처음 십 분은 이 표현들로 흘러가요. 스페인에는 다른 스페인어권이 버린 대명사가 아직 남아 있어요 — 친한 사이에 쓰는 복수형 "너희"인 vosotros인데, 중남미에서는 누구에게나 ustedes를 씁니다.',
      },
      entries: [
        { study: 'hola', back: { English: 'hello', Korean: '안녕하세요' } },
        { study: 'buenos días', back: { English: 'good morning', Korean: '안녕하세요 (아침 인사)' }, context: 'used until about two in the afternoon, not just early' },
        { study: 'buenas tardes', back: { English: 'good afternoon', Korean: '안녕하세요 (오후 인사)' }, context: 'from lunch until it gets dark' },
        { study: 'buenas noches', back: { English: 'good evening, good night', Korean: '안녕하세요 (밤 인사), 안녕히 주무세요' }, context: 'both a greeting on arrival and a farewell' },
        { study: 'adiós', back: { English: 'goodbye', Korean: '안녕히 가세요' }, context: 'final-sounding — Spaniards say hasta luego far more often' },
        { study: 'hasta luego', back: { English: 'see you later', Korean: '나중에 봐요' }, context: 'the ordinary goodbye, even to someone you will not see again' },
        { study: 'hasta mañana', back: { English: 'see you tomorrow', Korean: '내일 봐요' } },
        { study: '¿qué tal?', back: { English: 'how\'s it going?', Korean: '잘 지내요?' }, context: 'the everyday greeting, lighter than ¿cómo estás?' },
        { study: '¿cómo estás?', back: { English: 'how are you?', Korean: '어떻게 지내요?' }, context: 'to one person you address as tú' },
        { study: '¿cómo está usted?', back: { English: 'how are you? (formal)', Korean: '어떻게 지내세요?' } },
        { study: 'bien, gracias', back: { English: 'fine, thanks', Korean: '잘 지내요, 고마워요' } },
        { study: 'me llamo', back: { English: 'my name is', Korean: '제 이름은' }, context: 'literally "I call myself" — the ordinary way to give your name' },
        { study: '¿cómo te llamas?', back: { English: 'what\'s your name?', Korean: '이름이 뭐예요?' } },
        { study: 'mucho gusto', back: { English: 'nice to meet you', Korean: '만나서 반갑습니다' } },
        { study: 'encantado', back: { English: 'delighted to meet you', Korean: '만나 뵙게 되어 기쁩니다' }, context: 'the speaker\'s own gender picks the ending — a woman says encantada' },
        { study: '¿de dónde eres?', back: { English: 'where are you from?', Korean: '어디에서 왔어요?' } },
        { study: 'soy de', back: { English: 'I\'m from', Korean: '저는 ~에서 왔어요' } },
        { study: '¿a qué te dedicas?', back: { English: 'what do you do?', Korean: '무슨 일 하세요?' }, context: 'asks about work; more natural in Spain than ¿cuál es tu trabajo?' },
        { study: 'usted', back: { English: 'you (formal)', Korean: '(존댓말의) 당신' }, context: 'for a stranger, someone older, anyone you would use 존댓말 with' },
        { study: 'por favor', back: { English: 'please', Korean: '부탁합니다' } },
        { study: 'gracias', back: { English: 'thank you', Korean: '고맙습니다' } },
        { study: 'de nada', back: { English: 'you\'re welcome', Korean: '천만에요' } },
        { study: 'perdón', back: { English: 'sorry, excuse me', Korean: '죄송합니다, 실례합니다' }, context: 'to apologise lightly, or to get past someone' },
        { study: 'lo siento', back: { English: 'I\'m sorry', Korean: '미안합니다' }, context: 'for something that actually went wrong — perdón is the lighter one' },
        { study: 'no entiendo', back: { English: 'I don\'t understand', Korean: '이해가 안 돼요' } },
        { study: '¿puedes hablar más despacio?', back: { English: 'can you speak more slowly?', Korean: '좀 천천히 말해 줄래요?' }, context: 'more useful than asking someone to repeat at the same speed' },
      ],
    },
    {
      id: 'numbers',
      name: { English: 'Numbers', Korean: '숫자' },
      note: {
        English:
          'Whole, because half a counting system is worse than none. Two things to watch: dieciséis through diecinueve, and veintidós, veintitrés, veintiséis, contract into one word and take a written accent; and Spain writes the decimal comma, so 1,50 € is one euro fifty.',
        Korean:
          '숫자는 반만 알면 모르느니만 못해서 전부 담았어요. 두 가지만 기억하세요. dieciséis부터 diecinueve까지, 그리고 veintidós·veintitrés·veintiséis는 한 단어로 붙으면서 강세 부호가 붙어요. 또 스페인은 소수점에 쉼표를 써서 1,50 €가 1유로 50센트입니다.',
      },
      entries: [
        { study: 'cero', back: { English: 'zero', Korean: '영, 공' } },
        { study: 'uno', back: { English: 'one', Korean: '하나, 일' }, context: 'becomes un before a masculine noun — un café' },
        { study: 'dos', back: { English: 'two', Korean: '둘, 이' } },
        { study: 'tres', back: { English: 'three', Korean: '셋, 삼' } },
        { study: 'cuatro', back: { English: 'four', Korean: '넷, 사' } },
        { study: 'cinco', back: { English: 'five', Korean: '다섯, 오' } },
        { study: 'seis', back: { English: 'six', Korean: '여섯, 육' } },
        { study: 'siete', back: { English: 'seven', Korean: '일곱, 칠' } },
        { study: 'ocho', back: { English: 'eight', Korean: '여덟, 팔' } },
        { study: 'nueve', back: { English: 'nine', Korean: '아홉, 구' } },
        { study: 'diez', back: { English: 'ten', Korean: '열, 십' } },
        { study: 'once', back: { English: 'eleven', Korean: '열하나, 십일' } },
        { study: 'doce', back: { English: 'twelve', Korean: '열둘, 십이' } },
        { study: 'trece', back: { English: 'thirteen', Korean: '열셋, 십삼' } },
        { study: 'catorce', back: { English: 'fourteen', Korean: '열넷, 십사' } },
        { study: 'quince', back: { English: 'fifteen', Korean: '열다섯, 십오' } },
        { study: 'dieciséis', back: { English: 'sixteen', Korean: '열여섯, 십육' }, context: 'the teens contract from here on — and this one takes an accent' },
        { study: 'diecisiete', back: { English: 'seventeen', Korean: '열일곱, 십칠' } },
        { study: 'dieciocho', back: { English: 'eighteen', Korean: '열여덟, 십팔' } },
        { study: 'diecinueve', back: { English: 'nineteen', Korean: '열아홉, 십구' } },
        { study: 'veinte', back: { English: 'twenty', Korean: '스물, 이십' } },
        { study: 'veintiuno', back: { English: 'twenty-one', Korean: '스물하나, 이십일' }, context: 'the twenties contract too — veintiuno, not veinte y uno' },
        { study: 'veintidós', back: { English: 'twenty-two', Korean: '스물둘, 이십이' }, context: 'accented, like veintitrés and veintiséis' },
        { study: 'veintitrés', back: { English: 'twenty-three', Korean: '스물셋, 이십삼' } },
        { study: 'treinta', back: { English: 'thirty', Korean: '서른, 삼십' }, context: 'from here the tens separate again — treinta y uno' },
        { study: 'cuarenta', back: { English: 'forty', Korean: '마흔, 사십' } },
        { study: 'cincuenta', back: { English: 'fifty', Korean: '쉰, 오십' } },
        { study: 'sesenta', back: { English: 'sixty', Korean: '예순, 육십' } },
        { study: 'setenta', back: { English: 'seventy', Korean: '일흔, 칠십' } },
        { study: 'ochenta', back: { English: 'eighty', Korean: '여든, 팔십' } },
        { study: 'noventa', back: { English: 'ninety', Korean: '아흔, 구십' } },
        { study: 'cien', back: { English: 'one hundred', Korean: '백' }, context: 'cien on its own and before a noun; ciento inside a number — ciento veinte' },
        { study: 'mil', back: { English: 'one thousand', Korean: '천' }, context: 'never un mil — mil euros' },
        { study: 'primero', back: { English: 'first', Korean: '첫 번째' }, context: 'shortens to primer before a masculine noun — el primer plato' },
        { study: 'segundo', back: { English: 'second', Korean: '두 번째' }, context: 'la segunda calle a la derecha — the second street on the right' },
        { study: 'tercero', back: { English: 'third', Korean: '세 번째' }, context: 'shortens the same way primero does — el tercer piso' },
      ],
    },
    {
      id: 'restaurant',
      name: { English: 'Ordering food', Korean: '음식 주문하기' },
      note: {
        English:
          'Spain lays a menu out differently: la carta is the list you order from, while el menú usually means the fixed-price lunch. Order with ¿me pone…? — the frame every bar in the country runs on.',
        Korean:
          '스페인의 메뉴판은 구성이 조금 달라요. 주문할 때 보는 목록은 la carta이고, el menú는 보통 값이 정해진 점심 코스를 뜻합니다. 주문은 ¿me pone…?로 하면 돼요 — 스페인의 모든 바가 이 표현으로 돌아갑니다.',
      },
      entries: [
        { study: 'carta', gender: 'la', back: { English: 'the menu', Korean: '메뉴판' }, context: 'the list you order from — not el menú, which is the set meal' },
        { study: 'menú del día', gender: 'el', back: { English: 'the menu of the day', Korean: '오늘의 메뉴' }, context: 'a fixed price for starter, main, drink and dessert — weekday lunches' },
        { study: 'camarero', gender: 'el', back: { English: 'the waiter', Korean: '종업원' }, context: 'la camarera for a woman' },
        { study: 'una mesa para dos', back: { English: 'a table for two', Korean: '두 명이요' } },
        { study: 'primer plato', gender: 'el', back: { English: 'the first course', Korean: '첫 번째 요리' }, context: 'the first of the two a Spanish lunch comes in — soup, salad, something light' },
        { study: 'segundo plato', gender: 'el', back: { English: 'the second course', Korean: '두 번째 요리' }, context: 'the second of the two, and the main one — meat or fish' },
        { study: 'postre', gender: 'el', back: { English: 'dessert', Korean: '후식' } },
        { study: 'bebida', gender: 'la', back: { English: 'the drink', Korean: '음료' } },
        { study: 'agua', gender: 'el', back: { English: 'water', Korean: '물' }, context: 'feminine, but takes el — el agua fría' },
        { study: 'caña', gender: 'la', back: { English: 'a small draught beer', Korean: '생맥주 한 잔' }, context: 'about 200 ml, and the default beer order in Spain' },
        { study: 'vino tinto', gender: 'el', back: { English: 'red wine', Korean: '레드 와인' }, context: 'tinto for wine, never rojo' },
        { study: 'zumo', gender: 'el', back: { English: 'juice', Korean: '주스' }, context: 'jugo across most of Latin America' },
        { study: 'café con leche', gender: 'el', back: { English: 'coffee with milk', Korean: '밀크 커피' }, context: 'the standard morning coffee' },
        { study: 'tapas', gender: 'las', back: { English: 'a small plate of food', Korean: '작은 안주 한 접시' }, context: 'ordered a few at a time alongside drinks — English borrowed the word unchanged' },
        { study: 'ración', gender: 'la', back: { English: 'a portion', Korean: '한 접시 분량' }, context: 'the same food as a tapa, plate-sized and meant for the table to share' },
        { study: 'pan', gender: 'el', back: { English: 'bread', Korean: '빵' } },
        { study: 'tortilla', gender: 'la', back: { English: 'Spanish omelette', Korean: '감자 오믈렛' }, context: 'potato and egg — not the Mexican flatbread' },
        { study: 'jamón', gender: 'el', back: { English: 'cured ham', Korean: '하몽' } },
        { study: 'patata', gender: 'la', back: { English: 'potato', Korean: '감자' }, context: 'papa across most of Latin America' },
        { study: 'pollo', gender: 'el', back: { English: 'chicken', Korean: '닭고기' } },
        { study: 'ternera', gender: 'la', back: { English: 'beef', Korean: '소고기' } },
        { study: 'pescado', gender: 'el', back: { English: 'fish', Korean: '생선' }, context: 'the fish you eat — el pez is the one still swimming' },
        { study: 'gambas', gender: 'las', back: { English: 'prawns', Korean: '새우' } },
        { study: 'ensalada', gender: 'la', back: { English: 'salad', Korean: '샐러드' } },
        { study: 'picante', back: { English: 'spicy', Korean: '매운' } },
        { study: 'sin', back: { English: 'without', Korean: '~ 빼고, ~ 없이' }, context: 'sin cebolla, sin gluten — the word an allergy depends on' },
        { study: 'soy alérgico a', back: { English: 'I\'m allergic to', Korean: '~ 알레르기가 있어요' }, context: 'alérgica if you are a woman' },
        { study: '¿me pone una caña?', back: { English: 'could I have a small beer?', Korean: '생맥주 한 잔 주세요' }, context: 'the frame every bar in Spain runs on — swap in anything' },
        { study: 'para mí', back: { English: 'for me', Korean: '저는 ~로 할게요' }, context: 'how you claim your dish when the waiter goes round the table' },
        { study: 'para llevar', back: { English: 'to take away', Korean: '포장이요' } },
        { study: 'cuenta', gender: 'la', back: { English: 'the bill', Korean: '계산서' }, context: 'la cuenta, por favor' },
      ],
    },
    {
      id: 'directions',
      name: { English: 'Asking for directions', Korean: '길 묻기' },
      note: {
        English:
          'Ask with ¿dónde está…? and you will be answered in these words. todo recto is Spain’s "straight on" — elsewhere it is derecho, which sounds like derecha at exactly the wrong moment.',
        Korean:
          '¿dónde está…?로 물으면 이 단어들로 답이 돌아와요. "쭉 직진"은 스페인에서 todo recto라고 하는데, 다른 지역에서 쓰는 derecho는 하필 "오른쪽"인 derecha와 헷갈리기 쉬워요.',
      },
      entries: [
        { study: '¿dónde está el baño?', back: { English: 'where is the toilet?', Korean: '화장실이 어디에 있어요?' }, context: 'learn it whole and swap the noun — ¿dónde está la estación?' },
        { study: '¿cómo llego al centro?', back: { English: 'how do I get to the centre?', Korean: '시내에 어떻게 가요?' }, context: 'al before a masculine noun, a la before a feminine one' },
        { study: '¿está lejos?', back: { English: 'is it far?', Korean: '멀어요?' } },
        { study: 'cerca', back: { English: 'near', Korean: '가까이' } },
        { study: 'lejos', back: { English: 'far', Korean: '멀리' } },
        { study: 'a la derecha', back: { English: 'on the right', Korean: '오른쪽에' } },
        { study: 'a la izquierda', back: { English: 'on the left', Korean: '왼쪽에' } },
        { study: 'todo recto', back: { English: 'straight ahead', Korean: '쭉 직진' }, context: 'Spain\'s form — derecho elsewhere, which sounds like derecha' },
        { study: 'calle', gender: 'la', back: { English: 'the street', Korean: '거리, 길' } },
        { study: 'plaza', gender: 'la', back: { English: 'the square', Korean: '광장' } },
        { study: 'esquina', gender: 'la', back: { English: 'the corner', Korean: '모퉁이' }, context: 'where two streets meet — en la esquina' },
        { study: 'manzana', gender: 'la', back: { English: 'the block', Korean: '한 블록' }, context: 'a block of buildings; the same word as apple' },
        { study: 'cruce', gender: 'el', back: { English: 'the crossroads', Korean: '교차로' } },
        { study: 'semáforo', gender: 'el', back: { English: 'the traffic light', Korean: '신호등' } },
        { study: 'paso de peatones', gender: 'el', back: { English: 'the pedestrian crossing', Korean: '횡단보도' } },
        { study: 'acera', gender: 'la', back: { English: 'the pavement', Korean: '인도, 보도' } },
        { study: 'parada', gender: 'la', back: { English: 'the stop', Korean: '정류장' }, context: 'where a bus or tram stops' },
        { study: 'estación', gender: 'la', back: { English: 'the station', Korean: '역' } },
        { study: 'metro', gender: 'el', back: { English: 'the underground', Korean: '지하철' } },
        { study: 'autobús', gender: 'el', back: { English: 'the bus', Korean: '버스' } },
        { study: 'coger', back: { English: 'to catch, to take', Korean: '(교통편을) 타다' }, context: 'coger el autobús — ordinary in Spain, vulgar in much of Latin America' },
        { study: 'billete', gender: 'el', back: { English: 'the ticket', Korean: '표, 승차권' }, context: 'boleto across most of Latin America' },
        { study: 'barrio', gender: 'el', back: { English: 'the neighbourhood', Korean: '동네' } },
        { study: 'ascensor', gender: 'el', back: { English: 'the lift', Korean: '엘리베이터' } },
        { study: 'planta baja', gender: 'la', back: { English: 'the ground floor', Korean: '1층' }, context: 'Spain\'s ground floor — la primera planta is Korea\'s 2층' },
        { study: 'servicios', gender: 'los', back: { English: 'the toilets', Korean: '화장실' }, context: 'what the sign in a bar says; el baño at home' },
        { study: 'seguir', back: { English: 'to carry on, to keep going', Korean: '계속 가다' }, context: 'siga todo recto — carry straight on' },
        { study: 'cruzar', back: { English: 'to cross', Korean: '건너다' }, context: 'cruzar la calle' },
      ],
    },
    {
      id: 'verbs',
      name: { English: 'Verbs you use every day', Korean: '매일 쓰는 동사' },
      note: {
        English:
          'Infinitives, and four pairs English merges into one word each: ser/estar, saber/conocer, pedir/preguntar, hablar/decir. Those eight are what this section is for; the rest is the frame they hang in.',
        Korean:
          '동사 원형이에요. 영어라면 한 단어로 뭉뚱그려지는 네 쌍 — ser/estar, saber/conocer, pedir/preguntar, hablar/decir — 이 여덟 개가 이 묶음의 핵심이고, 나머지는 그 여덟 개가 걸릴 틀이에요.',
      },
      entries: [
        { study: 'ser', back: { English: 'to be (what something is)', Korean: '~이다' }, context: 'what something *is* — identity, origin, profession: soy coreano' },
        { study: 'estar', back: { English: 'to be (where or how it is)', Korean: '~에 있다, (상태가) ~하다' }, context: 'where something is and how it is right now: estoy cansado' },
        { study: 'tener', back: { English: 'to have', Korean: '가지고 있다' }, context: 'also age and hunger — tengo treinta años, tengo hambre' },
        { study: 'hacer', back: { English: 'to do, to make', Korean: '하다, 만들다' } },
        { study: 'ir', back: { English: 'to go', Korean: '가다' } },
        { study: 'venir', back: { English: 'to come', Korean: '오다' } },
        { study: 'querer', back: { English: 'to want', Korean: '원하다' }, context: 'quiero un café is the plainest way to ask for anything' },
        { study: 'poder', back: { English: 'to be able to', Korean: '~할 수 있다' }, context: '¿puedo…? is how you ask permission' },
        { study: 'saber', back: { English: 'to know (a fact, a skill)', Korean: '(사실을) 알다' }, context: 'facts and skills — sé nadar, no sé' },
        { study: 'conocer', back: { English: 'to know (a person, a place)', Korean: '(사람·장소를) 알다' }, context: 'people and places you have met or been to — conozco Madrid' },
        { study: 'hablar', back: { English: 'to speak', Korean: '말하다, 이야기하다' }, context: 'the act of speaking — hablo español' },
        { study: 'decir', back: { English: 'to say, to tell', Korean: '(무엇을) 말하다' }, context: 'what you say, not that you speak — dice que sí' },
        { study: 'entender', back: { English: 'to understand', Korean: '이해하다' } },
        { study: 'necesitar', back: { English: 'to need', Korean: '필요하다' } },
        { study: 'comprar', back: { English: 'to buy', Korean: '사다' } },
        { study: 'pagar', back: { English: 'to pay', Korean: '지불하다, 계산하다' } },
        { study: 'costar', back: { English: 'to cost', Korean: '(값이) 나가다' }, context: '¿cuánto cuesta? — how much is it' },
        { study: 'comer', back: { English: 'to eat', Korean: '먹다' } },
        { study: 'beber', back: { English: 'to drink', Korean: '마시다' } },
        { study: 'vivir', back: { English: 'to live', Korean: '살다' } },
        { study: 'trabajar', back: { English: 'to work', Korean: '일하다' } },
        { study: 'estudiar', back: { English: 'to study', Korean: '공부하다' } },
        { study: 'aprender', back: { English: 'to learn', Korean: '배우다' } },
        { study: 'leer', back: { English: 'to read', Korean: '읽다' } },
        { study: 'escribir', back: { English: 'to write', Korean: '쓰다' } },
        { study: 'ver', back: { English: 'to see', Korean: '보다' } },
        { study: 'esperar', back: { English: 'to wait, to hope', Korean: '기다리다, 바라다' }, context: 'one verb for both — espero el autobús, espero que sí' },
        { study: 'llegar', back: { English: 'to arrive', Korean: '도착하다' } },
        { study: 'salir', back: { English: 'to leave, to go out', Korean: '나가다, 출발하다' } },
        { study: 'volver', back: { English: 'to come back', Korean: '돌아오다, 돌아가다' } },
        { study: 'pedir', back: { English: 'to ask for, to order', Korean: '주문하다, 부탁하다' }, context: 'you ask *for a thing* — pedir la cuenta' },
        { study: 'preguntar', back: { English: 'to ask', Korean: '묻다, 질문하다' }, context: 'you ask *a question* — preguntar la hora' },
      ],
    },
  ],
};
