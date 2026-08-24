# English Idioms Pack — Draft for Review

**✅ Word list approved 2026-08-24.** Kept as the record of what was authored
and why — read it before changing an entry, a Korean 관용구 match or a usage
hint. The pack lives in `packages/core/src/idioms.ts`.

**100 entries · 6 sections · Korean backs only · `layout: 'list'`**

---

## What the backlog said, and what I did about it

> "Idioms are the harder of the two: an idiom's back is a usage note, not a
> gloss, and that is exactly the case the two-gloss rule was written for."

It holds. An idiom glossed in one Korean word is either wrong or useless —
`cut corners` is not 자르다 anything, and 대충 하다 alone drops the part that
matters, that the steps skipped were there for a reason. So:

**The Korean back is the nearest Korean *expression* where one lands on the
same occasion** (설상가상, 전화위복, 진퇴양난, 허리띠를 졸라매다, 식은 죽
먹기 — Korean has its own idiom for a surprising number of these), and a short
natural phrase where it does not. Several entries take the second gloss the
card rule allows.

**Every entry also carries a `context` hint, and every hint starts with
`idiom —`.** That prefix matches the convention the TOPIK pack set for its
관용 표현 and 사자성어, so one grep finds every figurative entry in the app. The
hint does a different job from the back and both are needed:

- **For the model.** `context` becomes `briefDefinition` on the saved card, and
  `/api/explain/depth` and `/api/explain/examples` read it. Without it, depth on
  `spill the beans` returns a paragraph about legumes — the 발이 넓다 failure.
- **For you.** The back says what it means; the hint says *when you would say
  it*. `take it with a grain of salt` and `read between the lines` have
  neighbouring Korean backs and completely different occasions.

A test enforces both the prefix and a minimum length on the hint, because the
failure mode is a hint that quietly degenerates into the gloss again. It caught
four real ones on the first run (`once in a blue moon` had "very rarely", which
is the back, not an occasion).

**Register is checked, not assumed.** Everything here is current, neutral-to-
informal, and safe to say at work. Idioms that have aged out (`raining cats and
dogs`) or that would embarrass a learner are left out — that is why this is 100
and not 300.

**Korean backs only**, for the same reason as TOEIC: on an English pack the
study side is the `english` slot and an authored English back would be
overwritten at save time.

**Sources:** the idiom entries of the Oxford and Cambridge learner's
dictionaries, cross-read against COCA frequency for what is still actually said.
Korean equivalents from 국립국어원 표준국어대사전 관용구, **matched by occasion
rather than by image** — which is the judgement call worth checking below.

---

## Open questions for you

1. **The Korean idiom matches are the thing to review.** Where I used a Korean
   관용구 I matched the *occasion*, not the picture. The ones I am least sure of:
   - `a walk in the park` → 누워서 떡 먹기 (vs. 식은 죽 먹기, which I gave to
     `a piece of cake` — the two English idioms are near-identical and Korean
     has two near-identical ones, so the pairing is arbitrary but the split is
     necessary: two cards sharing a back make back-to-front review unanswerable)
   - `jump the gun` → 성급하게 굴다, 김칫국부터 마시다 — the Korean is about
     assuming an outcome, the English about acting too early. Related, not equal.
   - `back to square one` → 도로 아미타불 — right meaning, noticeably more
     old-fashioned in Korean than the English is.
   - `hit a nerve` → 정곡을 찌르다 carries approval in Korean (hitting the mark)
     where the English is about causing pain. Both glosses are there; check the
     order.
2. **Possessive forms.** I standardised on `your` over `someone's` where the
   idiom is usually said about the listener (`pull your weight`, `speak your
   mind`) and kept `someone's` where it is usually said about a third party
   (`have someone's back`). Inconsistent-looking on purpose; say if you would
   rather it were uniform.
3. **American spelling** (`play favorites`) — consistent with the existing packs
   (`enroll`, `authorize` in TOEIC), noted in case that was accidental there.

---

## The list

### Getting along with people — 사람과 지내기 (18)

_The ones that describe a relationship in four words._

| entry | Korean back | when it means (context hint) |
|---|---|---|
| break the ice | 어색한 분위기를 깨다 | to say or do something that eases the awkwardness when people first meet |
| hit it off | 처음부터 죽이 잘 맞다 | to like each other immediately on first meeting |
| see eye to eye | 의견이 일치하다 | to agree, usually said about whether two people generally do |
| on the same page | 같은 생각이다, 얘기가 통하다 | to share the same understanding of a plan or situation |
| rub someone the wrong way | 괜히 거슬리게 하다 | to irritate someone without necessarily meaning to |
| give someone the cold shoulder | 쌀쌀맞게 대하다, 본체만체하다 | to deliberately ignore someone you know |
| bury the hatchet | 화해하다, 앙금을 풀다 | to agree to end a long quarrel and stop bringing it up |
| clear the air | 오해를 풀다 | to talk openly so a tension or misunderstanding stops hanging over you |
| go out of your way | 일부러 애써 ~해 주다 | to make a special effort for someone beyond what was needed |
| have someone's back | 뒤를 봐주다, 편이 되어 주다 | to be ready to support and defend someone |
| put yourself in someone's shoes | 입장을 바꿔 생각하다, 역지사지하다 | to imagine how a situation looks from the other person’s side |
| take someone for granted | 소중함을 모르고 당연하게 여기다 | to stop appreciating someone because you assume they will always be there |
| keep in touch | 연락하고 지내다 | to stay in contact after you stop seeing each other regularly |
| drift apart | 사이가 소원해지다 | for a friendship to fade gradually with no falling-out |
| hit a nerve | 아픈 데를 건드리다, 정곡을 찌르다 | to say something that upsets someone because it is close to the truth |
| walk on eggshells | 눈치를 보며 조심조심하다 | to be extremely careful around someone who is easily upset |
| play favorites | 편애하다 | to treat one person better than the others, unfairly |
| grow on someone | 갈수록 마음에 들다, 정이 들다 | for something you did not like at first to become likeable over time |

### Work and money — 일과 돈 (18)

_Safe to use in an office. Several are what a manager will actually say to you._

| entry | Korean back | when it means (context hint) |
|---|---|---|
| call it a day | 오늘은 여기까지 하다 | to decide to stop working for the day |
| burn the midnight oil | 밤늦게까지 일하다 | to work late into the night, usually to meet a deadline |
| cut corners | 대충 하다, 절차를 건너뛰다 | to save time or money by skipping steps that were there for a reason |
| go the extra mile | 한 걸음 더 애쓰다 | to do more than what was asked or expected |
| pull your weight | 제 몫을 하다 | to do your fair share of work others are relying on |
| drop the ball | (맡은 일을) 그르치다 | to fail at something you were responsible for, through carelessness |
| get the ball rolling | 일을 시작하다, 첫발을 떼다 | to start something that will keep going once begun |
| touch base | 간단히 상황을 공유하다 | to make brief contact to check where things stand |
| in the loop | 상황을 공유받는 | kept informed about something as it develops — keep me in the loop |
| back to square one | 원점으로 돌아가다, 도로 아미타불 | to be forced to start over after progress is lost |
| raise the bar | 기준을 높이다 | to set a standard higher than the one everyone was meeting |
| learn the ropes | 일을 익히다, 요령을 배우다 | to learn how a job or place works when you are new |
| red tape | 번거로운 행정 절차, 탁상행정 | official rules and paperwork that slow everything down |
| make ends meet | 근근이 먹고살다 | to earn just enough to cover what you have to pay |
| break even | 본전치기하다 | to end up with neither profit nor loss |
| on a shoestring | 아주 적은 돈으로 | done on a very small budget, and visibly so |
| cost an arm and a leg | 엄청나게 비싸다 | to be far more expensive than it should be, said with a wince |
| tighten your belt | 허리띠를 졸라매다 | to cut back on spending because money is short |

### Time and urgency — 시간과 촉박함 (13)

| entry | Korean back | when it means (context hint) |
|---|---|---|
| in the nick of time | 아슬아슬하게 제때 | just barely early enough, at the last possible moment |
| at the eleventh hour | 막판에, 마지막 순간에 | at the very last stage, when it is almost too late |
| around the clock | 밤낮없이 | continuously, day and night, said of work or of a service |
| against the clock | 시간에 쫓기며 | working fast because a deadline is close |
| beat the clock | 마감 전에 끝내다 | to get something finished just before time runs out |
| buy time | 시간을 벌다 | to delay something in order to gain time to prepare |
| kill time | 시간을 때우다 | to do something unimportant while waiting |
| drag your feet | 꾸물거리다, 일부러 늑장 부리다 | to be deliberately slow about something you do not want to do |
| jump the gun | 성급하게 굴다, 김칫국부터 마시다 | to act before the right moment, too early |
| in the long run | 길게 보면, 결국에는 | over an extended period, as opposed to right now |
| sooner or later | 조만간, 언젠가는 | at some unknown point, but certainly, whether you like it or not |
| once in a blue moon | 아주 가끔, 어쩌다 한 번 | very rarely, said of something that does happen but almost never |
| the crack of dawn | 동틀 무렵, 새벽같이 | at first light, said of getting up far earlier than usual |

### Trouble and luck — 곤경과 운 (18)

_Korean has its own idiom for most of these, and the back gives it where it lands on the same occasion._

| entry | Korean back | when it means (context hint) |
|---|---|---|
| in hot water | 곤경에 처한 | in trouble, usually with someone in authority |
| in a bind | 이러지도 저러지도 못하는 | stuck in a difficult situation with no easy way out |
| between a rock and a hard place | 진퇴양난인 | forced to choose between two equally bad options |
| bite off more than you can chew | 감당 못 할 일을 벌이다 | to take on more than you are able to handle |
| in over your head | 감당하기 벅찬 상태인 | involved in something too difficult for you |
| a blessing in disguise | 전화위복 | something that seemed bad at the time but turned out good |
| the last straw | 인내의 한계를 넘긴 마지막 일 | the small final thing that makes a person finally react after a long build-up |
| add insult to injury | 설상가상으로 만들다 | to make a bad situation worse, often by being tactless about it |
| face the music | 결과를 감수하다 | to accept the unpleasant consequences of what you did |
| bite the bullet | 이를 악물고 하다 | to force yourself to do something unpleasant you have been avoiding |
| ride it out | 견뎌 내다, 버텨 내다 | to endure a bad period until it passes |
| turn a blind eye | 못 본 척하다, 눈감아 주다 | to deliberately ignore something wrong that you have noticed |
| sweep it under the rug | 덮어 두다, 쉬쉬하다 | to hide a problem rather than deal with it |
| dodge a bullet | 큰일을 가까스로 피하다 | to narrowly avoid something that would have been bad |
| out of the woods | 고비를 넘긴 | past the dangerous part, though usually said as not out of the woods yet |
| get off on the wrong foot | 첫 단추를 잘못 끼우다 | to make a bad start, especially with a person |
| a close call | 아슬아슬했던 상황 | an incident where something bad almost happened |
| back against the wall | 벼랑 끝에 몰린 | in a position where you have no choice left but to fight |

### Saying it and hearing it — 말하기와 알아듣기 (15)

| entry | Korean back | when it means (context hint) |
|---|---|---|
| beat around the bush | 빙빙 돌려 말하다 | to avoid saying the thing you actually mean |
| get to the point | 요점을 말하다, 본론으로 들어가다 | to say the main thing without preamble |
| long story short | 간단히 말해서 | said to skip the details and give the outcome |
| spill the beans | 비밀을 털어놓다 | to reveal a secret, usually carelessly rather than maliciously |
| let the cat out of the bag | 무심코 비밀을 밝히다 | to reveal a secret by accident, typically ruining a surprise |
| keep it under wraps | 비밀에 부치다 | to keep something secret until the right time |
| read between the lines | 행간을 읽다, 속뜻을 짐작하다 | to work out what someone means but has not said outright |
| take it with a grain of salt | 걸러 듣다 | to not believe something completely, given where it came from |
| put words in my mouth | 하지도 않은 말을 했다고 하다 | to claim someone said something they did not |
| speak your mind | 생각을 솔직히 말하다 | to say what you honestly think, even if it is unwelcome |
| get it off your chest | 속에 담아 둔 말을 털어놓다 | to finally say something that has been weighing on you |
| hear it through the grapevine | 소문으로 듣다, 건너건너 듣다 | to learn something through informal talk rather than officially |
| talk shop | 일 얘기만 하다 | to talk about work in a setting where it is out of place |
| sugarcoat | 좋게 포장해서 말하다 | to make bad news sound gentler than it is |
| call a spade a spade | 있는 그대로 말하다 | to speak plainly about something unpleasant, without softening it |

### Effort, ability and mood — 노력·실력·기분 (18)

| entry | Korean back | when it means (context hint) |
|---|---|---|
| get the hang of it | 요령을 터득하다 | to learn how to do something after some practice |
| second nature | 몸에 밴 일 | so familiar you do it without thinking |
| a piece of cake | 식은 죽 먹기 | easy, said of a task you were expected to find hard |
| a walk in the park | 누워서 떡 먹기 | easy and pleasant to do, often said in the negative — it was no walk in the park |
| up in the air | 아직 미정인 | still undecided, waiting on something before it can be settled |
| play it by ear | 상황 봐서 하다 | to decide as you go rather than plan in advance |
| wing it | 즉흥으로 해내다 | to get through something with no preparation at all |
| on the fence | 결정을 못 내리고 있는 | undecided between two options and reluctant to commit to either |
| have a lot on your plate | 할 일이 산더미인 | to have more to deal with than is comfortable |
| under the weather | 몸이 좀 안 좋은 | mildly unwell — the polite way to say you are not coming in |
| feel blue | 울적하다 | to feel low for a while, milder and vaguer than being upset |
| on cloud nine | 날아갈 듯 기쁜 | extremely happy about something that just happened |
| lose your touch | 실력이 녹슬다 | to no longer be as good at something as you were |
| pull yourself together | 마음을 다잡다, 정신 차리다 | to regain composure after being upset |
| hang in there | 버텨라, 조금만 더 힘내라 | said to encourage someone going through a hard time |
| call it quits | 그만두다, 손을 떼다 | to stop for good, said of a job, a project or a relationship |
| take a rain check | 다음 기회로 미루다 | to decline an invitation now while accepting it for another time |
| go with the flow | 흐름에 맡기다 | to accept how things are going instead of resisting |
