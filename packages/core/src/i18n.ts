import { getStudyLanguageConfig, getBackSideConfig } from './types';
import type { StudyLanguage } from './types';
import type { ReviewDirection } from './sm2';

const translations = {
  English: {
    // Learn page
    inputPlaceholder: 'Enter a term...',
    learnButton: 'Learn',
    errorExplanation: 'Failed to get explanation. Please try again.',
    errorSaveFlashcard: 'Failed to save flashcard.',
    errorSaveChanges: 'Failed to save changes.',
    errorDeleteFlashcard: 'Failed to delete flashcard.',
    sectionTranslation: 'Translation',
    noTranslation: 'No translation available.',
    sectionDefinition: 'Definition',
    sectionContext: 'Cultural/Social Context',
    sectionHanja: 'Hanja Breakdown',
    sectionKanji: 'Kanji Breakdown',
    sectionHanzi: 'Character Breakdown',
    sectionExamples: 'Example Usage',
    loadDefinition: 'Dig deeper',
    loadExamples: 'Load Examples',
    saveAsFlashcard: 'Save as Flashcard',
    signInToSave: 'Sign in to save flashcards.',
    reviewEditFlashcard: 'Review & Edit Flashcard',
    labelKorean: 'Korean',
    labelEnglish: 'English',
    labelSwedish: 'Swedish',
    labelFrench: 'French',
    labelJapanese: 'Japanese',
    labelTraditionalChinese: 'Chinese (Traditional)',
    save: 'Save',
    flashcardSaved: 'Flashcard saved!',
    loadingFlashcards: 'Loading flashcards...',
    edit: 'Edit',
    archive: 'Archive',
    restore: 'Restore',
    delete: 'Delete',
    cancel: 'Cancel',
    confirmDelete: 'Are you sure you want to delete this flashcard?',
    confirmArchive: 'Archive this card? It will be paused from review but can be restored.',
    savedAt: 'Saved:',
    errorArchiveFlashcard: 'Failed to archive flashcard.',
    errorRestoreFlashcard: 'Failed to restore flashcard.',
    // Review page — card management
    reviewManageCard: 'Manage Card',
    reviewEditKorean: 'Korean',
    reviewEditEnglish: 'English',
    reviewCardSaved: 'Card updated.',
    reviewCardArchived: 'Card archived.',
    reviewCardDeleted: 'Card deleted.',
    // Review page
    reviewPageTitle: 'Review',
    forceSyncCards: 'Force Synchronize Cards',
    synchronizing: 'Synchronizing...',
    showAnswer: 'Show Answer',
    hideDetails: 'Hide Details',
    showDetails: 'Show Details',
    sectionNotes: 'Notes',
    reviewComplete: 'Review Complete!',
    exitReview: 'Exit Review',
    ratingAgain: 'Again',
    ratingHard: 'Hard',
    ratingGood: 'Good',
    ratingEasy: 'Easy',
    signInToReview: 'Sign in to review your flashcards.',
    // Review collections — your own cards and each pack are reviewed apart
    reviewCollectionMine: 'My cards',
    reviewPickCollection: 'What are you reviewing?',
    reviewCollectionDue: '{count} due',
    reviewCollectionCaughtUp: 'Caught up',
    reviewChangeCollection: 'Change collection',
    // Count in parentheses rather than "{count} cards": `t` has no plural
    // support, and this way the copy is right at 1 in both languages.
    reviewStartCount: 'Start review ({count})',
    reviewNothingInDirection: 'Nothing due this way right now.',
    // Offline review — mobile keeps its own card snapshot and rating queue
    offlineReviewBanner: 'Offline — reviewing the cards saved on this device.',
    offlinePendingReviews: '{count} to sync',
    offlineNoCachedCards: 'No {language} cards saved on this device yet. Reconnect to load them.',
    // Stopping early — deliberately not the same as finishing
    reviewStoppedTitle: 'Stopped here',
    reviewStoppedSummary: '{count} reviewed. Your progress is saved.',
    reviewStoppedNone: 'Nothing reviewed this time.',
    reviewStoppedRemaining: '{count} left in this session',
    reviewResume: 'Keep going',
    // Finished the session, but missed cards are still due
    reviewSessionFinished: 'Session finished',
    reviewMissedStillDue: '{count} you missed are still due.',
    reviewAgainMissed: 'Review those again',
    directionBoth: 'Both directions',
    promptMeaning: 'What does this mean in {language}?',
    promptProduce: 'How do you say this in {language}?',
    // Header
    navLearn: 'Learn',
    navReview: 'Review',
    navCards: 'Cards',
    navDecks: 'Packs',
    settingsStudyLanguage: 'Learning',
    settingsLanguage: 'Language',
    settingsTheme: 'Theme',
    signOut: 'Sign out',
    signIn: 'Sign in',
    navSettings: 'Settings',
    // Settings screen (mobile)
    settingsTitle: 'Settings',
    settingsAccount: 'Account',
    settingsNotSignedIn: 'Not signed in',
    settingsNativeLanguage: 'Native Language',
    settingsNativeLanguageDesc: 'Explanations and app text will use this language.',
    settingsStudyLanguageDesc: 'The language you\'re studying. Cards and reviews are grouped per language.',
    settingsSignInWithGoogle: 'Sign in with Google',
    settingsAbout: 'About',
    settingsPrivacyPolicy: 'Privacy Policy',
    // Reminders (mobile, local notifications)
    settingsReminders: 'Reminders',
    reminderWordOfTheDay: 'Word of the day',
    reminderWordOfTheDayDesc: 'Every morning at 09:00.',
    reminderReview: 'Review reminder',
    reminderReviewDesc: 'Only on days you have cards due and haven\'t reviewed yet.',
    reminderTime: 'Time',
    reminderBlocked: 'Notifications are turned off for Amgi. You can turn them back on in your device settings.',
    reminderWotdTitle: 'Today\'s word is ready',
    reminderWotdBody: 'A new word is waiting on Learn.',
    reminderReviewTitle: 'Time to review',
    reminderReviewBody: 'Your cards are ready when you are.',
    // Your data + account deletion
    settingsYourData: 'Your data',
    settingsYourDataBlurb: 'Amgi stores your saved cards, your review schedule, your streak, and your language settings. Nothing is sold, and there is no advertising or tracking.',
    deleteAccount: 'Delete account',
    deleteAccountBlurb: 'Permanently erase your account and everything in it.',
    deleteAccountConfirmTitle: 'Delete your account?',
    deleteAccountWarning: 'Your cards, review history, streak, and settings will be erased. This cannot be undone.',
    deleteAccountExportHint: 'Want a copy of your cards first? Export them from the Cards page before deleting.',
    deleteAccountTypeEmail: 'Type {email} to confirm.',
    deleteAccountAction: 'Delete my account',
    deleteAccountWorking: 'Deleting…',
    deleteAccountFailed: 'Could not delete your account. Nothing was removed — please try again.',
    deleteAccountSignedOut: 'Your account and data have been deleted.',
    themeForest: 'Forest',
    themeSonokai: 'Sonokai',
    themePaper: 'Paper',
    themeSystem: 'System',
    // Language setup modal
    welcomeTitle: 'Welcome to Amgi',
    welcomeSubtitle: 'What is your native language? Explanations will be written in this language.',
    setupStudyTitle: 'What are you learning?',
    setupStudySubtitle: 'Choose your study language',
    setupBack: '← Back',
    // First-run tour — one card, shown once, right after the two language
    // questions. Rows reuse `navLearn`/`navReview`/`navDecks` as their labels
    // so what the tour names is exactly what the nav is called; a tour that
    // invents its own vocabulary teaches you a map of a different app.
    tourTitle: 'What you can do here',
    tourLearnBody: 'Look up any word or phrase, then keep the explanation as a flashcard.',
    tourReviewBody: 'Cards come back just before you would forget them — in both directions.',
    tourDecksBody: 'Curated decks to draw from when no particular word is on your mind.',
    tourWritingLabel: 'Writing',
    tourWritingBody: 'Write a few sentences and see how a native would put it.',
    tourStart: 'Get started',
    // Per-page help, opened from the "?" in a page title. Deliberately answers
    // the question the page actually raises rather than restating its name —
    // a user who taps "?" on Packs already knows the word "packs".
    helpButtonLabel: 'What is this page for?',
    helpClose: 'Got it',
    helpPacksTitle: 'What packs are',
    helpPacksLead: 'Ready-made decks, each covering one subject.',
    // One fact per line. Each is something the screen cannot show you.
    helpPacksPoints:
      'Words you add become your own cards — edit or delete them like any other.\n' +
      // Not "never mixes into your vocabulary": the line above just said pack
      // words *become* your cards, so that read as a contradiction. What is
      // actually separate is the review session, not the ownership.
      'Each pack has its own review session, apart from your other cards.',
    helpLearnTitle: 'Word and Passage',
    helpLearnLead: 'Two sizes of the same question: is this right?',
    helpLearnPoints:
      'Word — look up a word or phrase and keep the explanation as a card.\n' +
      'Passage — write a few sentences and see how a native would put it.\n' +
      'Both turn what you learn into flashcards.',
    helpReviewTitle: 'How review works',
    helpReviewLead: 'Cards come back just before you would forget them.',
    helpReviewPoints:
      'Rate a card Again to see it soon, Easy to push it further out.\n' +
      'Each card is asked both ways — recognising a word and saying it are tracked separately.\n' +
      'Your cards and each pack are reviewed apart, so you pick one to start.',
    // Empty state / onboarding
    tagline: 'Look up any word or phrase.',
    taglineSubtitle: 'Get an instant AI-powered explanation, then save it as a flashcard to review with spaced repetition.',
    exampleTermsLabel: 'Try:',
    wordOfTheDay: 'Word of the day',
    // Writing review — the second mode on Learn. A word you met and a sentence
    // you wrote are the same question ("is this right?") asked at two sizes,
    // which is why they share a surface rather than splitting the nav.
    learnModeWord: 'Word',
    learnModePassage: 'Passage',
    writingPlaceholder: 'Write a few sentences in {language}, and see how a native would put it...',
    writingButton: 'Review',
    writingTagline: 'Write something. See how a native would say it.',
    writingTaglineSubtitle: 'Grammar where you need it, natural phrasing where you don\'t — pitched at whatever you wrote. Keep the phrases you were reaching for as flashcards.',
    writingRewriteHeading: 'How a native would put it',
    // The rewrite is the one text on screen the user didn't write, so it's the
    // one whose meaning they can't check. This is that check.
    writingRewriteMeaning: 'What that says',
    writingFindingsHeading: 'What to notice',
    // Shown when the model returns no findings. Deliberately not "no errors" —
    // an advanced writer gets an empty list because their prose is natural,
    // not because it was checked and passed.
    writingNoFindings: 'This reads naturally. Nothing worth flagging.',
    writingKindGrammar: 'grammar',
    writingKindNaturalness: 'naturalness',
    writingKindRegister: 'register',
    writingKindVocabulary: 'vocabulary',
    writingAddCard: '+ card',
    writingCardSaved: 'Saved',
    writingStartOver: 'Write something else',
    errorWritingReview: 'Could not review this. Please try again.',
    // Grammar patterns — the thing you exercise, not the card you flip. A
    // pattern review is a production turn: a situation in your own language,
    // one sentence from you, a verdict on what came back. Copy here never
    // says "card" for a pattern, and never names the pattern in a prompt.
    patternPractise: 'Practice this pattern',
    patternAdded: 'In practice',
    errorSavePattern: 'Could not add this pattern. Please try again.',
    reviewCollectionPatterns: 'Grammar patterns',
    patternCollectionCount: '{count} patterns',
    patternSessionProgress: 'Pattern {index} of {total}',
    patternGenerating: 'Writing you a situation...',
    patternSituationHeading: 'Say this',
    patternYourSentence: 'What you wrote',
    patternAnswerPlaceholder: 'Write it in {language}...',
    patternCheck: 'Check',
    patternChecking: 'Checking...',
    // One control, two tiers. Taking a hint costs — the ceiling drops to Hard
    // after the first and Again after the second — because retrieval has to
    // stay the learner's, and the scheduler has to be told the truth about how
    // much of the search space was handed over.
    patternHint: 'Hint',
    patternHintAgain: 'Still stuck',
    patternHintCostHard: 'Hint taken — this one counts as Hard at best.',
    patternHintCostAgain: 'Pattern shown — this one counts as Again.',
    // Shown when the sentence was fine but sidestepped the pattern entirely.
    // Knowing when to reach for it is the skill, so this is not a pass.
    patternNotReached: 'That works, but it goes around the pattern rather than using it.',
    patternVerdictGood: 'Got it',
    patternVerdictHard: 'Close — the form slipped',
    patternVerdictAgain: 'Not yet',
    patternNext: 'Next',
    patternFinish: 'Finish',
    patternSessionDone: 'Practice complete',
    patternSessionDoneCount: 'You practised {count} patterns.',
    patternSessionCaughtUp: 'Nothing to practise right now.',
    patternStart: 'Practice {count} patterns',
    // Says what the turn will be, because it is not what the Review page has
    // trained anyone to expect: a production turn between two three-second
    // flips is a change worth naming before it happens rather than after.
    patternSessionBlurb: 'You will be given a situation and write one sentence. No multiple choice — a hint is there if you get stuck.',
    // A 500 on turn 3 of 6 is not the offline case: 40 seconds of the
    // learner's writing is on screen and losing it is the one outcome ruled
    // out. The text stays, retry is offered, and a skip writes no verdict at
    // all — leaving the pattern due, which is the honest result.
    patternGradeFailed: 'Could not grade that — your sentence is still here.',
    patternExerciseFailed: 'Could not write an exercise for this one.',
    patternRetry: 'Try again',
    patternSkip: 'Skip this one',
    patternSkipped: 'Skipped — this pattern is still due.',
    patternOffline: 'Pattern practice needs a connection.',
    // Depth / examples errors
    errorLoadDepth: 'Failed to load definition. Please try again.',
    errorLoadExamples: 'Failed to load examples. Please try again.',
    // Disambiguation
    disambiguationPrompt: 'This term has multiple meanings. Which one do you mean?',
    notWhatYouMeant: 'Not what you meant?',
    addContextPlaceholder: 'Add context (e.g. "the fruit", "casual speech")',
    regenerate: 'Regenerate',
    // Card detail modal
    noCardDetails: 'No additional details saved. Load definition and examples on the Learn page before saving to capture them.',
    // Review page — clarity
    reviewPageDescription: 'Each card reappears right before you\'d forget it — less time studying, more time remembering.',
    noFlashcardsForReview: 'No flashcards saved yet.',
    goToLearnPage: 'Go to Learn to save your first card →',
    allCaughtUp: 'You\'re all caught up!',
    nextReviewOn: 'Next review:',
    reviewCompleteMessage: 'Good work. Head to Learn to keep building your vocabulary.',
    // Cards page
    cardsPageTitle: 'My Cards',
    cardsPageDescription: 'Search, filter, and manage every card you have — the ones you saved yourself and the ones a pack gave you.',
    cardsSearchPlaceholder: 'Search cards...',
    cardsSortNewest: 'Newest',
    cardsSortOldest: 'Oldest',
    cardsSortAZ: 'A → Z',
    cardsFilterActive: 'Active',
    cardsFilterArchived: 'Archived',
    // "Both", not "All". There are exactly two states, so "both" is the more
    // precise word anyway — and it keeps this chip from reading identically to
    // the deck row's "All", which means something else entirely. Two adjacent
    // chips with one label and two meanings is worse than a longer word.
    cardsFilterAll: 'Both',
    // Deck axis.
    cardsDeckAll: 'All',
    cardsDeckMine: 'My Cards',
    // Mobile filter sheet. Group headings, not control names: the chips under
    // each one say what they do, and a heading that repeated them would be
    // twice the words for the same fact.
    cardsFilterDeckGroup: 'Which cards',
    cardsFilterStatusGroup: 'Show',
    cardsFilterSortGroup: 'Sort',
    cardsFilterDone: 'Done',
    // The button that opens it reads out the current selection, so the label a
    // screen reader needs is the verb the text is missing.
    cardsFilterButtonLabel: 'Change filters',
    cardsEmpty: 'No cards found.',
    cardsSignInPrompt: 'Sign in to see your flashcards.',
    cardsGoLearn: 'Go to Learn →',
    // Bulk actions
    bulkSelect: 'Select',
    bulkCancel: 'Cancel',
    bulkSelectAll: 'Select all',
    bulkDeselectAll: 'Deselect all',
    bulkArchiveSelected: 'Archive selected',
    bulkDeleteSelected: 'Delete selected',
    bulkConfirmDelete: 'Delete selected cards? This cannot be undone.',
    bulkConfirmArchive: 'Archive selected cards?',
    // Import / export
    cardsImport: 'Import',
    cardsExport: 'Export',
    // No "(all cards)" qualifier on either: an export now carries exactly the
    // rows the filters leave on screen, so naming a scope here would be a lie.
    cardsExportCSV: 'CSV',
    cardsExportAnki: 'Anki (.txt)',
    importTitle: 'Import Words',
    importPastePrompt: 'Paste words below, one per line.',
    importWordCount: '{count} words',
    importWordCountOne: '1 word',
    importStart: 'Start Import',
    importProcessing: 'Processing {done}/{total}...',
    importDoneSummary: 'Done — {success} of {total} resolved. {selected} selected.',
    importStatusFailed: 'failed',
    importStatusAmbiguous: 'multiple meanings — skipped',
    importSaving: 'Saving...',
    importSaveCards: 'Save {count} cards',
    importSaveCardsOne: 'Save 1 card',
    importSavedToast: '{count} cards saved.',
    importSavedToastOne: '1 card saved.',
    // Learn page — word packs + generation
    packsLink: 'Browse word packs',
    packsSaved: '{added}/{total} saved',
    packAddedBadge: 'saved',
    packTapHint: 'Tap any entry to see it, save it, and go deeper.',
    packTapHintCards: 'Tap a character to open it, or the speaker to hear it.',
    generateLink: 'Generate words for a goal',
    generateComingSoon: 'Describe why you\'re learning and get a word list made for you — this feature is on its way.',
    comingSoon: 'Coming soon',
    // Decks page
    decksTitle: 'Word packs',
    decksBack: 'All packs',
    decksEmpty: 'No packs for this language yet.',
    decksEmptyBody: 'A pack is a ready-made word list you learn as its own set, kept apart from the cards you save yourself.',
    deckNotFound: 'That pack no longer exists.',
    deckEntryCount: '{count} entries',
    // Deck detail — enrolling and managing the cards a deck has produced
    deckReviewDeck: 'Review this deck',
    deckEnrolling: 'Adding the rest of the deck…',
    deckEnrollError: 'Could not add the rest of the deck. Try again.',
    deckCardsUnavailable: "Could not check which cards you already have. Reload before adding the deck, or it may be added twice.",
    // Section enrolment — 160 words is not one decision
    deckSaveSection: 'Save this section',
    deckSectionSaving: 'Saving…',
    deckSectionAllSaved: 'All saved',
    deckSaveAll: 'Save the whole deck',
    // Card detail — reading one entry, and deepening it on demand
    cardSaveEntry: 'Save as a card',
    cardSaving: 'Saving…',
    cardNotSavedYet: 'Not saved yet.',
    cardEnrichHint: 'Generating detail saves this card first.',
    cardEnriching: 'Writing…',
    cardEnrichError: 'Could not generate that. Try again.',
    // Deck drill
    drillLink: 'Drill',
    drillStart: 'Start drill',
    drillSizeAll: 'All {count}',
    drillSizeCards: '{count} cards',
    drillRemaining: '{count} left',
    drillKnew: 'Got it',
    drillMissed: 'Missed',
    drillEnd: 'End drill',
    drillDoneTitle: 'Drill complete',
    drillScore: '{correct} of {total} on the first try',
    drillScorePerfect: 'All {total} on the first try.',
    drillAgain: 'Drill again',
    drillMissedAgain: 'Drill the {count} you missed',
    drillBackToDeck: 'Back to deck',
    drillNoProgress: 'Drilling changes no review schedules.',
  },
  Korean: {
    // Learn page
    inputPlaceholder: '단어를 입력하세요...',
    learnButton: '학습',
    errorExplanation: '설명을 가져오지 못했습니다. 다시 시도해주세요.',
    errorSaveFlashcard: '플래시카드 저장에 실패했습니다.',
    errorSaveChanges: '변경사항 저장에 실패했습니다.',
    errorDeleteFlashcard: '플래시카드 삭제에 실패했습니다.',
    sectionTranslation: '번역',
    noTranslation: '번역이 없습니다.',
    sectionDefinition: '정의',
    sectionContext: '문화/사회적 맥락',
    // All three scripts are 한자 to a Korean speaker — the distinction the
    // English labels draw doesn't exist here, so they deliberately collapse.
    sectionHanja: '한자 분석',
    sectionKanji: '한자 분석',
    sectionHanzi: '한자 분석',
    sectionExamples: '예문',
    loadDefinition: '더 알아보기',
    loadExamples: '예문 불러오기',
    saveAsFlashcard: '플래시카드로 저장',
    signInToSave: '플래시카드를 저장하려면 로그인하세요.',
    reviewEditFlashcard: '플래시카드 검토 및 수정',
    labelKorean: '한국어',
    labelEnglish: '영어',
    labelSwedish: '스웨덴어',
    labelFrench: '프랑스어',
    labelJapanese: '일본어',
    labelTraditionalChinese: '중국어(번체)',
    save: '저장',
    flashcardSaved: '플래시카드가 저장되었습니다!',
    loadingFlashcards: '플래시카드 불러오는 중...',
    edit: '수정',
    archive: '보관',
    restore: '복원',
    delete: '삭제',
    cancel: '취소',
    confirmDelete: '이 플래시카드를 삭제하시겠습니까?',
    confirmArchive: '이 카드를 보관하시겠습니까? 복습에서 일시정지되지만 복원할 수 있습니다.',
    savedAt: '저장됨:',
    errorArchiveFlashcard: '플래시카드 보관에 실패했습니다.',
    errorRestoreFlashcard: '플래시카드 복원에 실패했습니다.',
    // Review page — card management
    reviewManageCard: '카드 관리',
    reviewEditKorean: '한국어',
    reviewEditEnglish: '영어',
    reviewCardSaved: '카드가 업데이트되었습니다.',
    reviewCardArchived: '카드가 보관되었습니다.',
    reviewCardDeleted: '카드가 삭제되었습니다.',
    // Review page
    reviewPageTitle: '복습',
    forceSyncCards: '카드 강제 동기화',
    synchronizing: '동기화 중...',
    showAnswer: '정답 보기',
    hideDetails: '상세 정보 숨기기',
    showDetails: '상세 정보 보기',
    sectionNotes: '메모',
    reviewComplete: '복습 완료!',
    exitReview: '복습 종료',
    ratingAgain: '다시',
    ratingHard: '어려움',
    ratingGood: '보통',
    ratingEasy: '쉬움',
    signInToReview: '플래시카드를 복습하려면 로그인하세요.',
    // Review collections — your own cards and each pack are reviewed apart
    reviewCollectionMine: '내 카드',
    reviewPickCollection: '무엇을 복습할까요?',
    reviewCollectionDue: '{count}개 복습할 차례',
    reviewCollectionCaughtUp: '지금은 없어요',
    reviewChangeCollection: '다른 묶음 고르기',
    reviewStartCount: '복습 시작 ({count}개)',
    reviewNothingInDirection: '이 방향은 지금 복습할 카드가 없어요.',
    // Offline review — mobile keeps its own card snapshot and rating queue
    offlineReviewBanner: '오프라인 상태예요. 받아둔 카드로 복습할 수 있어요.',
    offlinePendingReviews: '{count}개 저장 대기 중',
    offlineNoCachedCards: '{language} 카드를 아직 받아두지 않았어요. 연결하면 불러올게요.',
    // Stopping early — deliberately not the same as finishing
    reviewStoppedTitle: '여기까지 했어요',
    reviewStoppedSummary: '{count}개 복습했어요. 기록은 저장됐어요.',
    reviewStoppedNone: '이번엔 복습한 카드가 없어요.',
    reviewStoppedRemaining: '이번 세션에 {count}개 남았어요',
    reviewResume: '이어서 하기',
    // Finished the session, but missed cards are still due
    reviewSessionFinished: '이번 복습 끝!',
    reviewMissedStillDue: '틀린 {count}개가 아직 남아 있어요.',
    reviewAgainMissed: '틀린 카드 다시 보기',
    directionBoth: '양방향',
    // Every language name in the label table (영어, 한국어, 일본어, 프랑스어,
    // 스웨덴어, 중국어(번체)) ends in a vowel, so `로` is correct for all of
    // them and no `으로` branch is needed.
    promptMeaning: '이 단어는 {language}로 무슨 뜻인가요?',
    promptProduce: '이것을 {language}로 어떻게 말하나요?',
    // Header
    navLearn: '학습',
    navReview: '복습',
    settingsStudyLanguage: '학습 언어',
    settingsLanguage: '언어',
    settingsTheme: '테마',
    signOut: '로그아웃',
    signIn: '로그인',
    navSettings: '설정',
    // Settings screen (mobile)
    settingsTitle: '설정',
    settingsAccount: '계정',
    settingsNotSignedIn: '로그인하지 않았습니다',
    settingsNativeLanguage: '모국어',
    settingsNativeLanguageDesc: '설명과 앱 화면이 이 언어로 표시됩니다.',
    settingsStudyLanguageDesc: '배우고 있는 언어예요. 카드와 복습은 언어별로 따로 관리됩니다.',
    settingsSignInWithGoogle: 'Google로 로그인',
    settingsAbout: '정보',
    settingsPrivacyPolicy: '개인정보처리방침',
    // Reminders (mobile, local notifications)
    settingsReminders: '알림',
    reminderWordOfTheDay: '오늘의 단어',
    reminderWordOfTheDayDesc: '매일 아침 9시에 알려드려요.',
    reminderReview: '복습 알림',
    reminderReviewDesc: '복습할 카드가 있고 아직 복습하지 않은 날에만 알려드려요.',
    reminderTime: '시간',
    reminderBlocked: 'Amgi 알림이 꺼져 있어요. 기기 설정에서 다시 켤 수 있어요.',
    reminderWotdTitle: '오늘의 단어가 준비됐어요',
    reminderWotdBody: '학습 화면에서 새 단어를 확인해 보세요.',
    reminderReviewTitle: '복습할 시간이에요',
    reminderReviewBody: '복습할 카드가 기다리고 있어요.',
    // Your data + account deletion
    settingsYourData: '내 데이터',
    settingsYourDataBlurb: 'Amgi는 저장한 카드, 복습 일정, 연속 학습 기록, 언어 설정을 보관해요. 데이터를 판매하지 않고, 광고나 트래킹도 없어요.',
    deleteAccount: '계정 삭제',
    deleteAccountBlurb: '계정과 그 안의 모든 데이터를 완전히 지워요.',
    deleteAccountConfirmTitle: '계정을 삭제할까요?',
    deleteAccountWarning: '카드, 복습 기록, 연속 학습 기록, 설정이 모두 지워져요. 되돌릴 수 없어요.',
    deleteAccountExportHint: '카드를 먼저 저장해 두고 싶다면, 삭제하기 전에 카드 페이지에서 내보낼 수 있어요.',
    deleteAccountTypeEmail: '확인하려면 {email}을(를) 입력하세요.',
    deleteAccountAction: '계정 삭제하기',
    deleteAccountWorking: '삭제하는 중…',
    deleteAccountFailed: '계정을 삭제하지 못했어요. 아무것도 지워지지 않았으니 다시 시도해 주세요.',
    deleteAccountSignedOut: '계정과 데이터가 모두 삭제됐어요.',
    themeForest: '숲',
    themeSonokai: '소노카이',
    themePaper: '종이',
    themeSystem: '시스템',
    // Language setup modal
    welcomeTitle: 'Amgi에 오신 것을 환영합니다',
    welcomeSubtitle: '모국어가 무엇인가요? 설명은 이 언어로 작성됩니다.',
    setupStudyTitle: '어떤 언어를 배우고 싶나요?',
    setupStudySubtitle: '학습할 언어를 선택하세요',
    setupBack: '← 뒤로',
    // First-run tour
    tourTitle: '이런 걸 할 수 있어요',
    tourLearnBody: '모르는 단어나 표현을 찾아보고, 그 설명을 그대로 카드로 저장하세요.',
    tourReviewBody: '잊어버릴 때쯤 카드가 다시 나타나요. 양방향으로 복습합니다.',
    tourDecksBody: '딱히 찾을 단어가 없을 땐 정리된 단어팩에서 골라 담으세요.',
    tourWritingLabel: '글쓰기',
    tourWritingBody: '몇 문장 써 보면 원어민이라면 어떻게 쓸지 보여드려요.',
    tourStart: '시작하기',
    // Per-page help
    helpButtonLabel: '이 화면은 무엇을 하는 곳인가요?',
    helpClose: '알겠어요',
    helpPacksTitle: '단어팩이란',
    helpPacksLead: '주제별로 미리 정리해 둔 단어 모음이에요.',
    helpPacksPoints:
      '담은 단어는 그대로 내 카드가 돼요. 수정하거나 삭제할 수 있어요.\n' +
      // Was '팩마다 따로 복습해서 내 단어와 섞이지 않아요' — '내 단어' contradicted
      // '내 카드' one line up, and '~해서' is a loose causal join where a full
      // stop reads better.
      '복습은 팩별로 따로 해요. 다른 카드와 섞이지 않아요.',
    helpLearnTitle: '단어와 글',
    helpLearnLead: '궁금한 게 단어 하나든 직접 쓴 글이든, 여기서 물어보세요.',
    // '글' and '단어' rather than '문장'/'어휘' — they are what the toggle on
    // screen actually says, and help that renames the controls is worse than none.
    helpLearnPoints:
      '단어 — 모르는 단어나 표현을 찾아보고 설명을 카드로 저장해요.\n' +
      '글 — 몇 문장 써 보면 원어민이라면 어떻게 쓸지 알려드려요.\n' +
      '어느 쪽이든 배운 건 카드로 남길 수 있어요.',
    helpReviewTitle: '복습은 이렇게 진행돼요',
    helpReviewLead: '잊어버릴 때쯤 카드가 다시 나타나요.',
    helpReviewPoints:
      // 「」 is a Japanese convention and appeared nowhere else in this file;
      // Korean quotes with ''.
      '\'다시\'를 누르면 금방, \'쉬움\'을 누르면 한참 뒤에 다시 나와요.\n' +
      '같은 카드를 양쪽 방향으로 물어봐요. 알아보기와 말하기는 따로 기록돼요.\n' +
      '내 카드와 단어팩은 따로 복습해요. 시작할 때 하나를 골라 주세요.',
    // Empty state / onboarding
    tagline: '단어나 표현을 검색해보세요.',
    taglineSubtitle: 'AI로 즉각적인 설명을 받고, 플래시카드로 저장해 간격 반복 학습을 시작하세요.',
    exampleTermsLabel: '예시:',
    wordOfTheDay: '오늘의 단어',
    // Writing review. 첨삭 is what Koreans actually call written correction —
    // "글 검토" would be the literal render and reads like a document review.
    learnModeWord: '단어',
    learnModePassage: '글',
    writingPlaceholder: '{language}로 몇 문장 써보세요. 원어민이라면 어떻게 쓸지 보여드릴게요...',
    writingButton: '첨삭',
    writingTagline: '직접 써보세요. 원어민이라면 이렇게 씁니다.',
    writingTaglineSubtitle: '문법이 필요하면 문법을, 아니면 더 자연스러운 표현을 — 쓴 글에 맞춰 짚어드려요. 떠올리지 못했던 표현은 카드로 저장하세요.',
    writingRewriteHeading: '원어민이라면 이렇게',
    writingRewriteMeaning: '이런 뜻이에요',
    writingFindingsHeading: '눈여겨볼 점',
    writingNoFindings: '자연스럽게 읽혀요. 따로 짚을 부분이 없네요.',
    writingKindGrammar: '문법',
    writingKindNaturalness: '자연스러움',
    writingKindRegister: '말투',
    writingKindVocabulary: '어휘',
    writingAddCard: '+ 카드',
    writingCardSaved: '저장됨',
    writingStartOver: '다른 글 써보기',
    errorWritingReview: '첨삭에 실패했어요. 다시 시도해주세요.',
    // Grammar patterns. 패턴 rather than 문형 — 문형 is textbook vocabulary and
    // this is not a syllabus. Nothing here calls a pattern a 카드.
    patternPractise: '이 패턴 연습하기',
    patternAdded: '연습 중',
    errorSavePattern: '패턴을 추가하지 못했어요. 다시 시도해주세요.',
    reviewCollectionPatterns: '문법 패턴',
    patternCollectionCount: '패턴 {count}개',
    patternSessionProgress: '패턴 {index} / {total}',
    patternGenerating: '상황을 만드는 중...',
    patternSituationHeading: '이렇게 말해보세요',
    patternYourSentence: '내가 쓴 문장',
    patternAnswerPlaceholder: '{language}로 한 문장 써보세요...',
    patternCheck: '확인',
    patternChecking: '확인하는 중...',
    patternHint: '힌트',
    patternHintAgain: '아직 모르겠어요',
    patternHintCostHard: '힌트를 봤으니 잘해야 "어려움"으로 기록돼요.',
    patternHintCostAgain: '패턴을 봤으니 "다시"로 기록돼요.',
    patternNotReached: '문장은 괜찮지만, 이 패턴을 쓰지 않고 돌아갔어요.',
    patternVerdictGood: '맞혔어요',
    patternVerdictHard: '거의 다 왔어요 — 형태가 어긋났어요',
    patternVerdictAgain: '아직이에요',
    patternNext: '다음',
    patternFinish: '끝내기',
    patternSessionDone: '연습 완료',
    patternSessionDoneCount: '패턴 {count}개를 연습했어요.',
    patternSessionCaughtUp: '지금 연습할 패턴이 없어요.',
    patternStart: '패턴 {count}개 연습하기',
    patternSessionBlurb: '상황을 드리면 한 문장으로 표현해보세요. 객관식은 없고, 막히면 힌트를 볼 수 있어요.',
    patternGradeFailed: '채점하지 못했어요. 쓴 문장은 그대로 있어요.',
    patternExerciseFailed: '이 패턴으로 문제를 만들지 못했어요.',
    patternRetry: '다시 시도',
    patternSkip: '이건 건너뛰기',
    patternSkipped: '건너뛰었어요. 이 패턴은 그대로 남아 있어요.',
    patternOffline: '문법 패턴 연습은 인터넷 연결이 필요해요.',
    // Depth / examples errors
    errorLoadDepth: '정의를 불러오지 못했습니다. 다시 시도해주세요.',
    errorLoadExamples: '예문을 불러오지 못했습니다. 다시 시도해주세요.',
    // Disambiguation
    disambiguationPrompt: '이 단어는 여러 의미가 있습니다. 어떤 의미인가요?',
    notWhatYouMeant: '원하시는 내용이 아닌가요?',
    addContextPlaceholder: '맥락 추가 (예: "과일", "구어체")',
    regenerate: '다시 생성',
    // Card detail modal
    noCardDetails: '저장된 추가 정보가 없습니다. 학습 페이지에서 정의와 예문을 불러온 후 저장하면 여기에 표시됩니다.',
    // Review page — clarity
    reviewPageDescription: '각 카드는 잊어버리기 직전에 다시 나타납니다 — 적은 노력으로 더 많이 기억해요.',
    noFlashcardsForReview: '아직 저장된 플래시카드가 없습니다.',
    goToLearnPage: '학습 페이지에서 첫 카드를 저장해보세요 →',
    allCaughtUp: '모두 완료했습니다!',
    nextReviewOn: '다음 복습:',
    reviewCompleteMessage: '수고했습니다. 학습 페이지에서 어휘를 계속 늘려보세요.',
    // Cards page
    navCards: '카드',
    navDecks: '단어팩',
    cardsPageTitle: '내 카드',
    cardsPageDescription: '가지고 있는 카드를 모두 검색하고 관리하세요. 직접 저장한 카드도, 단어팩에서 담은 카드도요.',
    cardsSearchPlaceholder: '카드 검색...',
    cardsSortNewest: '최신순',
    cardsSortOldest: '오래된순',
    cardsSortAZ: '가나다순',
    cardsFilterActive: '활성',
    cardsFilterArchived: '보관됨',
    // '전체' → '둘 다': states the two-ness the English "Both" does, and leaves
    // '전체' free for the deck row, where "everything" is what is meant.
    cardsFilterAll: '둘 다',
    // '모든 카드' rather than a bare '전체' — it reads as "all cards", which is
    // exactly the scope this chip selects.
    cardsDeckAll: '모든 카드',
    cardsDeckMine: '내 카드',
    // '어떤 카드' over '단어팩': the chips under it include 모든 카드 and 내 카드,
    // which are not packs, so naming the group after packs would be wrong.
    cardsFilterDeckGroup: '어떤 카드',
    cardsFilterStatusGroup: '상태',
    cardsFilterSortGroup: '정렬',
    cardsFilterDone: '완료',
    cardsFilterButtonLabel: '필터 변경',
    cardsEmpty: '카드가 없습니다.',
    cardsSignInPrompt: '플래시카드를 보려면 로그인하세요.',
    cardsGoLearn: '학습 페이지로 →',
    // Bulk actions
    bulkSelect: '선택',
    bulkCancel: '취소',
    bulkSelectAll: '전체 선택',
    bulkDeselectAll: '선택 해제',
    bulkArchiveSelected: '선택 항목 보관',
    bulkDeleteSelected: '선택 항목 삭제',
    bulkConfirmDelete: '선택한 카드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    bulkConfirmArchive: '선택한 카드를 보관하시겠습니까?',
    // Import / export
    cardsImport: '가져오기',
    cardsExport: '내보내기',
    cardsExportCSV: 'CSV',
    cardsExportAnki: 'Anki (.txt)',
    importTitle: '단어 가져오기',
    importPastePrompt: '단어를 한 줄에 하나씩 입력하세요.',
    importWordCount: '단어 {count}개',
    importWordCountOne: '단어 1개',
    importStart: '가져오기 시작',
    importProcessing: '처리 중 {done}/{total}...',
    importDoneSummary: '완료 — {total}개 중 {success}개 확인됨, {selected}개 선택됨.',
    importStatusFailed: '실패',
    importStatusAmbiguous: '뜻이 여러 개예요 — 건너뜀',
    importSaving: '저장 중...',
    importSaveCards: '카드 {count}장 저장',
    importSaveCardsOne: '카드 1장 저장',
    importSavedToast: '카드 {count}장이 저장되었습니다.',
    importSavedToastOne: '카드 1장이 저장되었습니다.',
    // Learn page — word packs + generation
    packsLink: '단어팩 둘러보기',
    packsSaved: '{added}/{total} 저장됨',
    packAddedBadge: '저장됨',
    packTapHint: '단어를 누르면 뜻을 보고 저장하거나 더 자세히 볼 수 있어요.',
    packTapHintCards: '글자를 누르면 자세히 볼 수 있고, 스피커를 누르면 발음을 들을 수 있어요.',
    generateLink: '목표에 맞는 단어 만들기',
    generateComingSoon: '학습 목적을 알려주면 딱 맞는 단어 목록을 만들어주는 기능을 준비하고 있어요.',
    comingSoon: '준비 중',
    // Decks page
    decksTitle: '단어팩',
    decksBack: '단어팩 목록',
    decksEmpty: '이 언어에는 아직 단어팩이 없어요.',
    decksEmptyBody: '단어팩은 미리 만들어 둔 단어 묶음이에요. 직접 저장한 카드와 섞이지 않고 따로 복습해요.',
    deckNotFound: '더 이상 존재하지 않는 단어팩이에요.',
    deckEntryCount: '{count}개',
    // Deck detail — enrolling and managing the cards a deck has produced
    deckReviewDeck: '이 단어팩 복습하기',
    deckEnrolling: '남은 카드를 추가하는 중…',
    deckEnrollError: '남은 카드를 추가하지 못했어요. 다시 시도해 주세요.',
    deckCardsUnavailable: '이미 가지고 있는 카드를 확인할 수 없어요. 덱이 중복으로 추가될 수 있으니 새로고침한 뒤 다시 시도해 주세요.',
    // Section enrolment — 160 words is not one decision
    deckSaveSection: '이 묶음 저장하기',
    deckSectionSaving: '저장하는 중…',
    deckSectionAllSaved: '모두 저장됨',
    deckSaveAll: '전체 저장하기',
    // Card detail — reading one entry, and deepening it on demand
    cardSaveEntry: '카드로 저장',
    cardSaving: '저장하는 중…',
    cardNotSavedYet: '아직 저장하지 않았어요.',
    cardEnrichHint: '자세한 설명을 만들면 카드가 먼저 저장돼요.',
    cardEnriching: '작성하는 중…',
    cardEnrichError: '내용을 만들지 못했어요. 다시 시도해 주세요.',
    // Deck drill
    drillLink: '연습하기',
    drillStart: '연습 시작',
    drillSizeAll: '전체 {count}개',
    drillSizeCards: '{count}개',
    drillRemaining: '{count}개 남음',
    drillKnew: '알았어요',
    drillMissed: '몰랐어요',
    drillEnd: '연습 끝내기',
    drillDoneTitle: '연습 완료',
    drillScore: '{total}개 중 {correct}개를 한 번에 맞혔어요.',
    drillScorePerfect: '{total}개 모두 한 번에 맞혔어요.',
    drillAgain: '다시 연습하기',
    drillMissedAgain: '틀린 {count}개만 다시',
    drillBackToDeck: '단어팩으로 돌아가기',
    drillNoProgress: '연습은 복습 일정에 영향을 주지 않아요.',
  },
} as const;

export type TranslationKey = keyof typeof translations.English;

export function t(
  lang: string | null | undefined,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const language = lang === 'Korean' ? 'Korean' : 'English';
  let text: string = translations[language][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/**
 * Direction chip text — "Japanese → English", localized.
 *
 * Composed from the six language labels rather than stored as its own key per
 * pair. Once the back side follows native language, the pairs multiply: keys
 * for every study language against both back languages would be 16 more
 * strings in two locales, all of them the same arrow between two names that
 * are already translated.
 */
export function directionLabel(
  nativeLanguage: string | null | undefined,
  studyLanguage: StudyLanguage | string | undefined,
  direction: ReviewDirection
): string {
  const study = t(nativeLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);
  const back = t(nativeLanguage, getBackSideConfig(studyLanguage, nativeLanguage).backLabelKey);
  return direction === 'frontToBack' ? `${study} → ${back}` : `${back} → ${study}`;
}

/** The question a review card asks, in the direction being tested. */
export function directionPrompt(
  nativeLanguage: string | null | undefined,
  studyLanguage: StudyLanguage | string | undefined,
  direction: ReviewDirection
): string {
  const key = direction === 'frontToBack' ? 'promptMeaning' : 'promptProduce';
  const labelKey =
    direction === 'frontToBack'
      ? getBackSideConfig(studyLanguage, nativeLanguage).backLabelKey
      : getStudyLanguageConfig(studyLanguage).studyLabelKey;
  return t(nativeLanguage, key, { language: t(nativeLanguage, labelKey) });
}
