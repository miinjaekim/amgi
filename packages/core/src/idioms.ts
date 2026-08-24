import type { VocabPack } from './packs';

/**
 * English idioms — the figurative layer, where the words are all easy and the
 * meaning is somewhere else.
 *
 * This is the pack the not-for-beginners rule was written for. Every entry here
 * is made of words a learner already knows; `break the ice` has no word in it
 * harder than `ice`. What makes it a domain rather than a level is that knowing
 * every word in an idiom gets you nothing — and a learner who can read a
 * contract still stops dead at `back to square one`.
 *
 * ## The back is a usage note, not a gloss
 *
 * Named in the backlog before this pack existed, and it holds: an idiom glossed
 * in one Korean word is either wrong or useless. `cut corners` is not 자르다
 * anything, and 대충 하다 alone loses the part that matters — that it means
 * skipping the steps that were supposed to protect quality. So the Korean back
 * is the nearest Korean *expression* where one exists (설상가상, 전화위복,
 * 허리띠를 졸라매다 — Korean has its own idiom for a surprising number of
 * these), and a short natural phrase where it does not. This is exactly the
 * case the two-gloss rule was written for, and several entries take both.
 *
 * ## Every entry carries a context hint, and every hint starts with `idiom —`
 *
 * Not decoration, and not the same job as the back. Two things depend on it:
 *
 * 1. **The model.** `context` is carried onto the saved card as
 *    `briefDefinition`, and `/api/explain/depth` and `/api/explain/examples`
 *    read it. Without the hint, depth on `spill the beans` returns a paragraph
 *    about legumes — the same failure 발이 넓다 has in the TOPIK pack, which is
 *    where the convention comes from.
 * 2. **The learner.** The Korean back says what it means; the hint says *when
 *    you would say it*, which for an idiom is half the word. `take it with a
 *    grain of salt` and `read between the lines` have neighbouring Korean backs
 *    and completely different occasions.
 *
 * **Korean backs only.** The study side is the `english` slot, so an authored
 * English back would be overwritten at save time and could never be read.
 *
 * Register is checked, not assumed: everything here is current, neutral-to-
 * informal, and safe to say at work. Idioms that have aged out (`raining cats
 * and dogs`) or that a learner would embarrass themselves with are left out,
 * which is why the list is 100 and not 300.
 *
 * Sources: the idiom entries of the Oxford and Cambridge learner's dictionaries,
 * cross-read against COCA frequency for what is still actually said. Korean
 * equivalents from 국립국어원 표준국어대사전 관용구, matched by occasion rather
 * than by image. Assembled by hand.
 * Draft review: docs/packs/idioms-pack-draft.md
 */
export const IDIOMS_PACK: VocabPack = {
  id: 'english-idioms',
  name: { English: 'English Idioms', Korean: '영어 관용 표현' },
  description: {
    English:
      'A hundred idioms you will actually hear — every word in them easy, the meaning nowhere in the words. Each one comes with when to say it, not just what it means.',
    Korean:
      '실제로 자주 쓰이는 관용 표현 100개 — 단어는 다 아는 것들인데 뜻은 단어 안에 없어요. 뜻만이 아니라 어떤 상황에서 쓰는지까지 함께.',
  },
  layout: 'list',
  sections: [
    {
      id: 'people',
      name: { English: 'Getting along with people', Korean: '사람과 지내기' },
      note: {
        English: 'The ones that describe a relationship in four words.',
        Korean: '관계를 네 단어로 설명해 버리는 표현들이에요.',
      },
      entries: [
        { study: 'break the ice', back: { Korean: '어색한 분위기를 깨다' }, context: 'idiom — to say or do something that eases the awkwardness when people first meet' },
        { study: 'hit it off', back: { Korean: '처음부터 죽이 잘 맞다' }, context: 'idiom — to like each other immediately on first meeting' },
        { study: 'see eye to eye', back: { Korean: '의견이 일치하다' }, context: 'idiom — to agree, usually said about whether two people generally do' },
        { study: 'on the same page', back: { Korean: '같은 생각이다, 얘기가 통하다' }, context: 'idiom — to share the same understanding of a plan or situation' },
        { study: 'rub someone the wrong way', back: { Korean: '괜히 거슬리게 하다' }, context: 'idiom — to irritate someone without necessarily meaning to' },
        { study: 'give someone the cold shoulder', back: { Korean: '쌀쌀맞게 대하다, 본체만체하다' }, context: 'idiom — to deliberately ignore someone you know' },
        { study: 'bury the hatchet', back: { Korean: '화해하다, 앙금을 풀다' }, context: 'idiom — to agree to end a long quarrel and stop bringing it up' },
        { study: 'clear the air', back: { Korean: '오해를 풀다' }, context: 'idiom — to talk openly so a tension or misunderstanding stops hanging over you' },
        { study: 'go out of your way', back: { Korean: '일부러 애써 ~해 주다' }, context: 'idiom — to make a special effort for someone beyond what was needed' },
        { study: "have someone's back", back: { Korean: '뒤를 봐주다, 편이 되어 주다' }, context: 'idiom — to be ready to support and defend someone' },
        { study: "put yourself in someone's shoes", back: { Korean: '입장을 바꿔 생각하다, 역지사지하다' }, context: 'idiom — to imagine how a situation looks from the other person’s side' },
        { study: 'take someone for granted', back: { Korean: '소중함을 모르고 당연하게 여기다' }, context: 'idiom — to stop appreciating someone because you assume they will always be there' },
        { study: 'keep in touch', back: { Korean: '연락하고 지내다' }, context: 'idiom — to stay in contact after you stop seeing each other regularly' },
        { study: 'drift apart', back: { Korean: '사이가 소원해지다' }, context: 'idiom — for a friendship to fade gradually with no falling-out' },
        { study: 'hit a nerve', back: { Korean: '아픈 데를 건드리다, 정곡을 찌르다' }, context: 'idiom — to say something that upsets someone because it is close to the truth' },
        { study: 'walk on eggshells', back: { Korean: '눈치를 보며 조심조심하다' }, context: 'idiom — to be extremely careful around someone who is easily upset' },
        { study: 'play favorites', back: { Korean: '편애하다' }, context: 'idiom — to treat one person better than the others, unfairly' },
        { study: 'grow on someone', back: { Korean: '갈수록 마음에 들다, 정이 들다' }, context: 'idiom — for something you did not like at first to become likeable over time' },
      ],
    },
    {
      id: 'work',
      name: { English: 'Work and money', Korean: '일과 돈' },
      note: {
        English: 'Safe to use in an office. Several are what a manager will actually say to you.',
        Korean: '직장에서 써도 되는 표현들 — 몇 개는 상사가 실제로 하는 말이에요.',
      },
      entries: [
        { study: 'call it a day', back: { Korean: '오늘은 여기까지 하다' }, context: 'idiom — to decide to stop working for the day' },
        { study: 'burn the midnight oil', back: { Korean: '밤늦게까지 일하다' }, context: 'idiom — to work late into the night, usually to meet a deadline' },
        { study: 'cut corners', back: { Korean: '대충 하다, 절차를 건너뛰다' }, context: 'idiom — to save time or money by skipping steps that were there for a reason' },
        { study: 'go the extra mile', back: { Korean: '한 걸음 더 애쓰다' }, context: 'idiom — to do more than what was asked or expected' },
        { study: 'pull your weight', back: { Korean: '제 몫을 하다' }, context: 'idiom — to do your fair share of work others are relying on' },
        { study: 'drop the ball', back: { Korean: '(맡은 일을) 그르치다' }, context: 'idiom — to fail at something you were responsible for, through carelessness' },
        { study: 'get the ball rolling', back: { Korean: '일을 시작하다, 첫발을 떼다' }, context: 'idiom — to start something that will keep going once begun' },
        { study: 'touch base', back: { Korean: '간단히 상황을 공유하다' }, context: 'idiom — to make brief contact to check where things stand' },
        { study: 'in the loop', back: { Korean: '상황을 공유받는' }, context: 'idiom — kept informed about something as it develops — keep me in the loop' },
        { study: 'back to square one', back: { Korean: '원점으로 돌아가다, 도로 아미타불' }, context: 'idiom — to be forced to start over after progress is lost' },
        { study: 'raise the bar', back: { Korean: '기준을 높이다' }, context: 'idiom — to set a standard higher than the one everyone was meeting' },
        { study: 'learn the ropes', back: { Korean: '일을 익히다, 요령을 배우다' }, context: 'idiom — to learn how a job or place works when you are new' },
        { study: 'red tape', back: { Korean: '번거로운 행정 절차, 탁상행정' }, context: 'idiom — official rules and paperwork that slow everything down' },
        { study: 'make ends meet', back: { Korean: '근근이 먹고살다' }, context: 'idiom — to earn just enough to cover what you have to pay' },
        { study: 'break even', back: { Korean: '본전치기하다' }, context: 'idiom — to end up with neither profit nor loss' },
        { study: 'on a shoestring', back: { Korean: '아주 적은 돈으로' }, context: 'idiom — done on a very small budget, and visibly so' },
        { study: 'cost an arm and a leg', back: { Korean: '엄청나게 비싸다' }, context: 'idiom — to be far more expensive than it should be, said with a wince' },
        { study: 'tighten your belt', back: { Korean: '허리띠를 졸라매다' }, context: 'idiom — to cut back on spending because money is short' },
      ],
    },
    {
      id: 'time',
      name: { English: 'Time and urgency', Korean: '시간과 촉박함' },
      entries: [
        { study: 'in the nick of time', back: { Korean: '아슬아슬하게 제때' }, context: 'idiom — just barely early enough, at the last possible moment' },
        { study: 'at the eleventh hour', back: { Korean: '막판에, 마지막 순간에' }, context: 'idiom — at the very last stage, when it is almost too late' },
        { study: 'around the clock', back: { Korean: '밤낮없이' }, context: 'idiom — continuously, day and night, said of work or of a service' },
        { study: 'against the clock', back: { Korean: '시간에 쫓기며' }, context: 'idiom — working fast because a deadline is close' },
        { study: 'beat the clock', back: { Korean: '마감 전에 끝내다' }, context: 'idiom — to get something finished just before time runs out' },
        { study: 'buy time', back: { Korean: '시간을 벌다' }, context: 'idiom — to delay something in order to gain time to prepare' },
        { study: 'kill time', back: { Korean: '시간을 때우다' }, context: 'idiom — to do something unimportant while waiting' },
        { study: 'drag your feet', back: { Korean: '꾸물거리다, 일부러 늑장 부리다' }, context: 'idiom — to be deliberately slow about something you do not want to do' },
        { study: 'jump the gun', back: { Korean: '성급하게 굴다, 김칫국부터 마시다' }, context: 'idiom — to act before the right moment, too early' },
        { study: 'in the long run', back: { Korean: '길게 보면, 결국에는' }, context: 'idiom — over an extended period, as opposed to right now' },
        { study: 'sooner or later', back: { Korean: '조만간, 언젠가는' }, context: 'idiom — at some unknown point, but certainly, whether you like it or not' },
        { study: 'once in a blue moon', back: { Korean: '아주 가끔, 어쩌다 한 번' }, context: 'idiom — very rarely, said of something that does happen but almost never' },
        { study: 'the crack of dawn', back: { Korean: '동틀 무렵, 새벽같이' }, context: 'idiom — at first light, said of getting up far earlier than usual' },
      ],
    },
    {
      id: 'trouble',
      name: { English: 'Trouble and luck', Korean: '곤경과 운' },
      note: {
        English: 'Korean has its own idiom for most of these, and the back gives it where it lands on the same occasion.',
        Korean: '대부분 한국어에도 같은 뜻의 관용구가 있어요. 상황이 맞아떨어지는 경우에는 그 표현을 뒷면에 실었어요.',
      },
      entries: [
        { study: 'in hot water', back: { Korean: '곤경에 처한' }, context: 'idiom — in trouble, usually with someone in authority' },
        { study: 'in a bind', back: { Korean: '이러지도 저러지도 못하는' }, context: 'idiom — stuck in a difficult situation with no easy way out' },
        { study: 'between a rock and a hard place', back: { Korean: '진퇴양난인' }, context: 'idiom — forced to choose between two equally bad options' },
        { study: 'bite off more than you can chew', back: { Korean: '감당 못 할 일을 벌이다' }, context: 'idiom — to take on more than you are able to handle' },
        { study: 'in over your head', back: { Korean: '감당하기 벅찬 상태인' }, context: 'idiom — involved in something too difficult for you' },
        { study: 'a blessing in disguise', back: { Korean: '전화위복' }, context: 'idiom — something that seemed bad at the time but turned out good' },
        { study: 'the last straw', back: { Korean: '인내의 한계를 넘긴 마지막 일' }, context: 'idiom — the small final thing that makes a person finally react after a long build-up' },
        { study: 'add insult to injury', back: { Korean: '설상가상으로 만들다' }, context: 'idiom — to make a bad situation worse, often by being tactless about it' },
        { study: 'face the music', back: { Korean: '결과를 감수하다' }, context: 'idiom — to accept the unpleasant consequences of what you did' },
        { study: 'bite the bullet', back: { Korean: '이를 악물고 하다' }, context: 'idiom — to force yourself to do something unpleasant you have been avoiding' },
        { study: 'ride it out', back: { Korean: '견뎌 내다, 버텨 내다' }, context: 'idiom — to endure a bad period until it passes' },
        { study: 'turn a blind eye', back: { Korean: '못 본 척하다, 눈감아 주다' }, context: 'idiom — to deliberately ignore something wrong that you have noticed' },
        { study: 'sweep it under the rug', back: { Korean: '덮어 두다, 쉬쉬하다' }, context: 'idiom — to hide a problem rather than deal with it' },
        { study: 'dodge a bullet', back: { Korean: '큰일을 가까스로 피하다' }, context: 'idiom — to narrowly avoid something that would have been bad' },
        { study: 'out of the woods', back: { Korean: '고비를 넘긴' }, context: 'idiom — past the dangerous part, though usually said as not out of the woods yet' },
        { study: 'get off on the wrong foot', back: { Korean: '첫 단추를 잘못 끼우다' }, context: 'idiom — to make a bad start, especially with a person' },
        { study: 'a close call', back: { Korean: '아슬아슬했던 상황' }, context: 'idiom — an incident where something bad almost happened' },
        { study: 'back against the wall', back: { Korean: '벼랑 끝에 몰린' }, context: 'idiom — in a position where you have no choice left but to fight' },
      ],
    },
    {
      id: 'speaking',
      name: { English: 'Saying it and hearing it', Korean: '말하기와 알아듣기' },
      entries: [
        { study: 'beat around the bush', back: { Korean: '빙빙 돌려 말하다' }, context: 'idiom — to avoid saying the thing you actually mean' },
        { study: 'get to the point', back: { Korean: '요점을 말하다, 본론으로 들어가다' }, context: 'idiom — to say the main thing without preamble' },
        { study: 'long story short', back: { Korean: '간단히 말해서' }, context: 'idiom — said to skip the details and give the outcome' },
        { study: 'spill the beans', back: { Korean: '비밀을 털어놓다' }, context: 'idiom — to reveal a secret, usually carelessly rather than maliciously' },
        { study: 'let the cat out of the bag', back: { Korean: '무심코 비밀을 밝히다' }, context: 'idiom — to reveal a secret by accident, typically ruining a surprise' },
        { study: 'keep it under wraps', back: { Korean: '비밀에 부치다' }, context: 'idiom — to keep something secret until the right time' },
        { study: 'read between the lines', back: { Korean: '행간을 읽다, 속뜻을 짐작하다' }, context: 'idiom — to work out what someone means but has not said outright' },
        { study: 'take it with a grain of salt', back: { Korean: '걸러 듣다' }, context: 'idiom — to not believe something completely, given where it came from' },
        { study: 'put words in my mouth', back: { Korean: '하지도 않은 말을 했다고 하다' }, context: 'idiom — to claim someone said something they did not' },
        { study: 'speak your mind', back: { Korean: '생각을 솔직히 말하다' }, context: 'idiom — to say what you honestly think, even if it is unwelcome' },
        { study: 'get it off your chest', back: { Korean: '속에 담아 둔 말을 털어놓다' }, context: 'idiom — to finally say something that has been weighing on you' },
        { study: 'hear it through the grapevine', back: { Korean: '소문으로 듣다, 건너건너 듣다' }, context: 'idiom — to learn something through informal talk rather than officially' },
        { study: 'talk shop', back: { Korean: '일 얘기만 하다' }, context: 'idiom — to talk about work in a setting where it is out of place' },
        { study: 'sugarcoat', back: { Korean: '좋게 포장해서 말하다' }, context: 'idiom — to make bad news sound gentler than it is' },
        { study: 'call a spade a spade', back: { Korean: '있는 그대로 말하다' }, context: 'idiom — to speak plainly about something unpleasant, without softening it' },
      ],
    },
    {
      id: 'effort',
      name: { English: 'Effort, ability and mood', Korean: '노력·실력·기분' },
      entries: [
        { study: 'get the hang of it', back: { Korean: '요령을 터득하다' }, context: 'idiom — to learn how to do something after some practice' },
        { study: 'second nature', back: { Korean: '몸에 밴 일' }, context: 'idiom — so familiar you do it without thinking' },
        { study: 'a piece of cake', back: { Korean: '식은 죽 먹기' }, context: 'idiom — easy, said of a task you were expected to find hard' },
        { study: 'a walk in the park', back: { Korean: '누워서 떡 먹기' }, context: 'idiom — easy and pleasant to do, often said in the negative — it was no walk in the park' },
        { study: 'up in the air', back: { Korean: '아직 미정인' }, context: 'idiom — still undecided, waiting on something before it can be settled' },
        { study: 'play it by ear', back: { Korean: '상황 봐서 하다' }, context: 'idiom — to decide as you go rather than plan in advance' },
        { study: 'wing it', back: { Korean: '즉흥으로 해내다' }, context: 'idiom — to get through something with no preparation at all' },
        { study: 'on the fence', back: { Korean: '결정을 못 내리고 있는' }, context: 'idiom — undecided between two options and reluctant to commit to either' },
        { study: 'have a lot on your plate', back: { Korean: '할 일이 산더미인' }, context: 'idiom — to have more to deal with than is comfortable' },
        { study: 'under the weather', back: { Korean: '몸이 좀 안 좋은' }, context: 'idiom — mildly unwell — the polite way to say you are not coming in' },
        { study: 'feel blue', back: { Korean: '울적하다' }, context: 'idiom — to feel low for a while, milder and vaguer than being upset' },
        { study: 'on cloud nine', back: { Korean: '날아갈 듯 기쁜' }, context: 'idiom — extremely happy about something that just happened' },
        { study: 'lose your touch', back: { Korean: '실력이 녹슬다' }, context: 'idiom — to no longer be as good at something as you were' },
        { study: 'pull yourself together', back: { Korean: '마음을 다잡다, 정신 차리다' }, context: 'idiom — to regain composure after being upset' },
        { study: 'hang in there', back: { Korean: '버텨라, 조금만 더 힘내라' }, context: 'idiom — said to encourage someone going through a hard time' },
        { study: 'call it quits', back: { Korean: '그만두다, 손을 떼다' }, context: 'idiom — to stop for good, said of a job, a project or a relationship' },
        { study: 'take a rain check', back: { Korean: '다음 기회로 미루다' }, context: 'idiom — to decline an invitation now while accepting it for another time' },
        { study: 'go with the flow', back: { Korean: '흐름에 맡기다' }, context: 'idiom — to accept how things are going instead of resisting' },
      ],
    },
  ],
};
