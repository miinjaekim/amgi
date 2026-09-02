# TestFlight Beta Information · TestFlight 베타 정보

_한국어와 영어 문구가 모두 이 파일에 있습니다. Both languages live here._

_마지막 갱신: 2026-09-02, 1.5.0용._

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

단어팩으로 한 분야의 어휘나 한 언어의 기초를 한번에 담을 수 있고, 학습 기록에서 어느 날 복습했는지 돌아볼 수 있습니다.

AI가 만든 설명이라 틀릴 수 있습니다. 어색하거나 잘못된 부분을 알려 주시는 것이 이번 베타에서 가장 도움이 됩니다.

학습 언어: 영어, 일본어, 중국어(번체), 스웨덴어, 프랑스어, 스페인어, 키쿠유어, 스와힐리어, 한국어
화면 언어: 한국어 / 영어 (설정에서 변경)

베타 기간 무료. 광고·트래킹 없음.
```

### English

```
Amgi is a flashcard app for language learners.

Look up a word and you get its meaning, nuance, register and example sentences — plus a character breakdown for anything written in Chinese characters. Save that as a card and it comes back on a spaced-repetition schedule.

Vocabulary packs cover one domain — or one language's basics — a deck at a time, and the progress screen shows which days you actually reviewed.

The explanations are AI-generated, so they can be wrong. Telling me when they are is the most useful thing you can do in this beta.

Study languages: English, Japanese, Traditional Chinese, Swedish, French, Spanish, Kikuyu, Swahili, Korean
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

· 답 입력하기 — 복습에서 뜻을 보고 단어를 직접 입력할 수 있습니다.
· 발음 속도 — 느리게·보통·빠르게 중에 고를 수 있습니다.
· 복습 중 발음 듣기 — 복습 화면에도 발음 듣기 버튼이 생겼습니다.
· 되돌리기 — 평가를 잘못 눌렀으면 되돌리기 버튼으로 취소할 수 있습니다.
· 읽는 법 — 단어를 읽는 이의 문자로 다시 적어 줍니다. 일본어는 억양 표시도 함께요.
· 새 단어팩 — 스페인어 기초 153개, 키쿠유어 기초 59개. 키쿠유어는 원어민 확인 전이라 뜻이 틀릴 수 있습니다.

피드백은 TestFlight의 '피드백 보내기' 또는 kenyamjkim@gmail.com으로.
```

### English

```
New in this build:

· Type your answer — in review, type the word instead of grading yourself.
· Pronunciation speed — Slow, Normal or Fast.
· Audio in review — review cards have a speaker button now.
· Undo — takes back a rating you tapped by mistake.
· Reading aid — words respelled in your own script, with pitch marks on Japanese.
· New packs — Spanish Basics (153 words) and Kikuyu Basics (59). No native speaker has checked the Kikuyu list yet, so meanings may be wrong.

Send feedback via TestFlight's "Send Beta Feedback" or to kenyamjkim@gmail.com.
```

---

## 5. Beta App Review Information (영어 — Apple 심사용)

이 항목은 테스터가 아니라 Apple 심사자가 읽는 항목이라 로컬라이제이션이 없고,
항상 영어로만 작성합니다.

⚠️ **여기는 짧게 줄이지 마세요.** 위의 테스터용 문구와 목적이 다릅니다. 심사자는
한 번 읽고 넘어가고, 여기 없는 내용은 리젝 사유가 되어 돌아옵니다 — 특히 계정
삭제 위치(5.1.1(v)), 알림이 기본 꺼짐이라는 사실, 제3자 데이터 처리. 각 문단은
심사에서 실제로 물어봤거나 물어볼 만한 것에 대한 답입니다.

**Sign-in required:** Yes
**Demo account:** 심사용으로 만들어 둔 Google 계정을 App Store Connect의 Demo Account
필드에 그대로 유지하세요. 이전 빌드 심사에서 사용된 계정입니다.

**Review Notes:**

```
Amgi is a language-learning app that pairs AI-generated word explanations with spaced-repetition flashcards.

Sign-in: The app uses Google Sign-In (Firebase Authentication) only. Demo credentials are provided in the demo account fields above. Any Google account can sign in and immediately access all functionality.

How to test: On first launch the app asks for a native language and a study language before anything else, and cannot be used until both are answered. This is required because explanations are written in the native language, and a learner cannot study the language they already speak. Both can be changed later in Settings.

On the Learn tab, type any word or phrase and tap Learn to get an explanation, then save it as a flashcard. The Review tab runs the spaced-repetition session over saved cards. The Cards tab lists, edits, and exports saved cards. The Packs tab holds pre-made decks that can be saved as cards or drilled directly. Tapping the streak badge opens a progress screen showing which days were reviewed.

Account deletion: Settings → Delete account, at the bottom of the screen. This permanently deletes the account and all associated data from within the app, as required by guideline 5.1.1(v). It asks for confirmation and may re-prompt for Google sign-in, because deleting an account requires a recent authentication.

Notifications: The app can schedule local reminders for the word of the day and for due reviews. Both are off by default and are turned on individually in Settings; the permission prompt appears only when one is enabled. These are local notifications scheduled on the device — the app sends no remote push and stores no push tokens.

Third-party processing: Word explanations are generated with Google's Gemini API, and pronunciation audio with Google Cloud Text-to-Speech. Only the submitted text, optional context, and language settings are sent — never account identifiers. This is described in the privacy policy.

The app contains no ads, no analytics, and no tracking. It does not access location, contacts, camera, or photos.

Privacy policy: https://amgi-iota.vercel.app/privacy
```

**Contact:** Minjae Kim · kenyamjkim@gmail.com
