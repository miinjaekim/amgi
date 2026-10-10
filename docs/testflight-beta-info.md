# TestFlight Beta Information · TestFlight 베타 정보

_한국어와 영어 문구가 모두 이 파일에 있습니다. Both languages live here._

_마지막 갱신: 2026-10-10, 2.3.0용._

App Store Connect → TestFlight → **Test Information**에 붙여넣는 문구 모음입니다.
Test Information은 로컬라이제이션을 지원하므로, 언어 목록에 **Korean (ko)** 과
**English (en)** 을 모두 추가한 뒤 아래 각 언어의 문구를 넣으면 기기 언어 설정에
따라 테스터에게 알맞은 언어로 표시됩니다.

⚠️ **코드 블록 안은 문단마다 한 줄입니다 — 줄바꿈을 다시 넣지 마세요.** 넣은
줄바꿈은 TestFlight에서 그대로 살아 있고, 화면 폭에 맞춰 알아서 접히는 것과
겹쳐서 폰에서 들쭉날쭉하게 보입니다. 이 파일을 편집할 때 에디터가 자동 줄바꿈을
하더라도 저장할 때 한 줄로 두세요. 줄이 나뉘는 곳은 문단 사이와 `·` 항목 사이뿐입니다.

---

## 1. Beta App Description (베타 앱 설명)

### 한국어

```
Amgi는 언어 학습용 플래시카드 앱입니다.

단어를 찾아보면 뜻과 뉘앙스, 격식, 예문이 나옵니다. 한자어는 한자 풀이도 함께요. 그대로 카드로 저장하면 간격 반복 일정에 맞춰 다시 나타납니다.

단어팩으로 한 분야의 어휘나 한 언어의 기초를 한번에 담을 수 있고, 필요한 단어팩은 직접 만들 수도 있습니다. 학습 기록에서는 어느 날 얼마나 복습했는지 언어별로 돌아볼 수 있습니다.

문법은 문리 모드에서 따로 연습합니다. 동사 변화를 시제 하나씩 연습하고, 직접 쓴 글을 첨삭받을 수 있습니다. 동사 변화는 지금은 프랑스어만 있습니다.

AI가 만든 설명이라 틀릴 수 있습니다. 어색하거나 잘못된 부분을 알려 주시는 것이 이번 베타에서 가장 도움이 됩니다.

학습 언어: 영어, 일본어, 중국어(번체), 광둥어, 아랍어, 스웨덴어, 프랑스어, 스페인어, 키쿠유어, 스와힐리어, 한국어, 한자
설명 언어: 학습 언어마다 따로 고릅니다 (한국어 / 영어)
화면 언어: 한국어 / 영어 (설정에서 변경)

베타 기간 무료. 광고·트래킹 없음.
```

### English

```
Amgi is a flashcard app for language learners.

Look up a word and you get its meaning, nuance, register and example sentences — plus a character breakdown for anything written in Chinese characters. Save that as a card and it comes back on a spaced-repetition schedule.

Vocabulary packs cover one domain — or one language's basics — a deck at a time, and you can make a pack of your own. The progress screen shows what you reviewed, by day and by language.

Grammar lives in a second mode, Munli: practise verb conjugation a tense at a time, and get writing you have written corrected. Conjugation covers French so far.

The explanations are AI-generated, so they can be wrong. Telling me when they are is the most useful thing you can do in this beta.

Study languages: English, Japanese, Traditional Chinese, Cantonese, Arabic, Swedish, French, Spanish, Kikuyu, Swahili, Korean, Hanja (the Chinese characters used in Korean)
Explanation language: chosen per study language (Korean or English)
Display language: Korean or English (change in Settings)

Free during the beta. No ads, no tracking.
```

## 2. Feedback Email (피드백 이메일)

동일한 주소를 모든 언어 로컬라이제이션에 사용합니다.

```
kenyamjkim@gmail.com
```

## 3. Privacy Policy URL (개인정보처리방침 URL)

언어별로 다른 URL을 넣습니다.

| Localization | URL |
| --- | --- |
| Korean (ko) | https://amgi-iota.vercel.app/privacy/ko |
| English (en) | https://amgi-iota.vercel.app/privacy |

두 페이지는 서로 링크되어 있고, 앱 안에서는 **설정 → 정보 → 개인정보처리방침**으로도
열 수 있습니다(모국어 설정에 따라 한국어/영어 페이지로 연결).

## 4. What to Test (테스트할 내용)

### 한국어

```
이번 빌드에 새로 들어간 것:

· 복습 카드가 제자리에서 뒤집힙니다. 카드나 '정답 보기'를 누르면 앞면 자리에 뒷면이 나와요.
· '답을 직접 입력하기'를 켜면 단어뿐 아니라 뜻도 입력해서 답합니다.
· 평가 버튼마다 그 카드가 언제 다시 나오는지 보입니다.
· 어려움, 보통, 쉬움이 다음 복습 날짜를 서로 다르게 잡습니다.
· 복습에서 답을 확인하면 읽는 법 옆에 품사와 성이 함께 나옵니다.
· 스웨덴어 단어를 찾으면 명사와 형용사의 변화형이, 프랑스어는 불규칙형이 함께 나옵니다. 새로 찾는 단어부터요.
· 문리의 글쓰기 칸이 크기가 고정되고 그 안에서 스크롤됩니다.
· 쓴 글을 첨삭과 함께 저장하고, 저장함에서 다시 볼 수 있습니다.
· 한자를 뺀 모든 학습 언어에 글쓰기 예시가 생겼습니다.
```

### English

```
New in this build:

· The review card flips in place: tap it, or Show Answer, and the back replaces the front.
· With "Type your answers" on, you type meanings too, not only words.
· Each rating button shows when the card would come back.
· Hard, Good and Easy now set different next reviews.
· The answer in review shows part of speech and gender beside the reading.
· Swedish lookups show a noun's or adjective's forms; French ones name an irregular form. New lookups only.
· Munli's Writing field stays one size and scrolls inside itself.
· Save a piece of writing with its feedback, and read it again under Saved.
· Writing has a worked example for every study language except Hanja.
```

---

## 5. Beta App Review Information (영어 — Apple 심사용)

이 항목은 테스터가 아니라 Apple 심사자가 읽는 항목이라 로컬라이제이션이 없고,
항상 영어로만 작성합니다.

⚠️ **여기는 짧게 줄이지 마세요.** 위의 테스터용 문구와 목적이 다릅니다. 심사자는
한 번 읽고 넘어가고, 여기 없는 내용은 리젝 사유가 되어 돌아옵니다 — 특히 계정
삭제 위치(5.1.1(v)), 알림이 기본 꺼짐이라는 사실, 제3자 데이터 처리. 각 문단은
심사에서 실제로 물어봤거나 물어볼 만한 것에 대한 답입니다.

⚠️ **그러면서 4000자를 넘으면 안 됩니다 — App Store Connect의 상한입니다.** 2.0.0
작업 때 4145자로 처음 부딪혔고, 줄여야 하는 것은 **문장이지 내용이 아닙니다**.
위 문단들은 각각 심사 질문 하나에 대한 답이라 통째로 빼면 그 질문이 리젝으로
돌아옵니다. 실제로 통한 방법은 같은 말을 두 번 하는 곳을 찾는 것이었습니다 —
"is not stored"와 "is not written to the account"는 한 문장이면 충분했고, 모드
문단은 주장을 하나도 버리지 않고 847자에서 657자가 되었습니다.

길이 재는 법은 [backlog.md](../.scratchpad/backlog.md)의 "Cutting a build"에
있습니다(줄바꿈도 글자 수에 포함). ⚠️ **이 파일에 코드 블록을 새로 추가하지
마세요.** 이 파일의 ``` 블록은 "App Store Connect에 붙여넣는 문구"라는 뜻이고,
길이 측정과 문자셋 대조 둘 다 그 규칙에 기대고 있습니다 — 붙여넣지 않을 것이
블록 안에 들어가면 두 검사가 같이 틀립니다.

**Sign-in required:** Yes
**Demo account:** 심사용으로 만들어 둔 Google 계정을 App Store Connect의 Demo Account
필드에 그대로 유지하세요. 이전 빌드 심사에서 사용된 계정입니다.

**Review Notes:**

```
Amgi is a language-learning app that pairs AI-generated word explanations with spaced-repetition flashcards. A second mode, Munli, is for grammar practice.

Sign-in: The app uses Google Sign-In (Firebase Authentication) only. Demo credentials are provided in the demo account fields above. Any Google account can sign in and immediately access all functionality.

How to test: On first launch the app asks three questions, and cannot be used until all are answered: what language the app itself should be in, what language to study, and what language that deck is explained in. The third is asked because explanations are stored on the card and never regenerated; it is prefilled from the first, so it takes one tap. The language a learner already speaks cannot be picked as the one studied. A walkthrough follows: one word looked up, made a card and rated once, then that language's packs, then sign-in, where the demo account works. "Skip for now" and "Not now" pass those steps; sign-in is also under Settings → Account. The app's own language is changed later in Settings → Languages; a deck's explanation language is chosen when that language is added.

Amgi mode has five tabs, icon-only, left to right: Review, Cards, Learn, Packs, Progress. Review, where the app opens, runs spaced repetition over saved cards. Cards lists and edits them; exporting every card is under Settings → Your data. Learn, in the middle, is where you type any word or phrase and tap Learn for an explanation, then save it as a flashcard. Packs holds pre-made decks to save as cards or drill directly; Make a pack builds one from a goal the user describes, signed in only. Progress shows which days were reviewed, a row per language opening its charts.

Modes: a fresh install opens in Amgi, and nothing need be done with modes to review the app. The second mode, Munli, is reached by holding the last tab, by the mode button beside the gear on Progress, or by Settings → Switch mode; the same returns to Amgi. A Korean interface names the two 암기 and 문리. Munli's own five tabs are Practice, Saved, Writing, Topics, Progress: Practice drills verb conjugation, Topics browses the tables and adds verbs, Saved lists what is scheduled, Writing submits a passage for correction. Conjugation covers French only, and under any other study language those tabs say so on screen rather than appearing broken. To populate it, add French in Settings → Languages.

Settings: the gear icon at the top right of the Progress tab, in either mode. There is no Settings tab — that gear is the only route in, signed in or not. It opens a short list of rows, each opening its own screen.

Account deletion: Progress tab → the gear icon at its top right → Account, the last row → Delete account. This permanently deletes the account and all associated data from within the app, as required by guideline 5.1.1(v). It asks for confirmation and may re-prompt for Google sign-in, because deletion requires a recent authentication.

Notifications: The app can schedule local reminders for the word of the day and for due reviews. Both are off by default, turned on individually in Settings → Reminders; the permission prompt appears only when one is enabled. They are scheduled on the device — the app sends no remote push and stores no push tokens.

Third-party processing: Word explanations, writing corrections, user-made packs and user-added verb tables are generated with Google's Gemini API, and pronunciation audio with Google Cloud Text-to-Speech. Only the submitted text, optional context, and language settings are sent — never account identifiers. A passage submitted to Munli's Writing tab and its correction are written to the account only if the user taps Save or saves a phrase as a flashcard. All of this is described in the privacy policy.

The app contains no ads, no analytics, and no tracking. It does not access location, contacts, camera, or photos.

Privacy policy: https://amgi-iota.vercel.app/privacy
```

**Contact:** Minjae Kim · kenyamjkim@gmail.com
