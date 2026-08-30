import { getStudyLanguageConfig, getBackSideConfig } from './types';
import type { StudyLanguage, TermCore } from './types';
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
    labelSpanish: 'Spanish',
    labelKikuyu: 'Kikuyu',
    labelSwahili: 'Swahili',
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
    // Typed responses — produce the word before seeing it. The toggle sits by
    // the direction filter because it is the same kind of choice: how the
    // session asks, not what it asks about.
    typedReviewToggle: 'Type your answers',
    typedAnswerPlaceholder: 'Type it in {language}',
    typedAnswerCheck: 'Check',
    // The per-card escape hatch. Flipping asserts nothing, so it grades
    // nothing — the card falls straight through to the ordinary flow.
    typedAnswerReveal: 'Show answer instead',
    typedAnswerCorrect: 'Correct',
    typedAnswerMissed: 'Not quite',
    typedAnswerYours: 'You typed',
    // Offline review — mobile keeps its own card snapshot and rating queue
    offlineReviewBanner: 'Offline — reviewing the cards saved on this device.',
    offlinePendingReviews: '{count} to sync',
    // Session-sized versions of the two above. A running session has no row to
    // spare — the banner pushed the card down far enough to overlap the button
    // under it — so these ride the progress line instead.
    offlineShort: 'offline',
    offlinePendingShort: '{count} to sync',
    offlineNoCachedCards: 'No {language} cards saved on this device yet. Reconnect to load them.',
    // Stopping early — deliberately not the same as finishing
    reviewStoppedTitle: 'Stopped here',
    reviewStoppedSummary: '{count} reviewed. Your progress is saved.',
    reviewStoppedNone: 'Nothing reviewed this time.',
    reviewStoppedRemaining: '{count} left in this session',
    reviewResume: 'Keep going',
    // A misclicked rating is the one mistake a review session offers no way
    // out of, so it gets its own control rather than living under Manage.
    undoRating: 'Undo last rating',
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
    navProgress: 'Progress',
    // Progress dashboard
    progressTitle: 'Progress',
    progressDescription: 'Which days you studied, how much, and what you added.',
    progressSignedOut: 'Sign in to see your progress.',
    progressLoading: 'Loading your progress...',
    // Shown until the rollups have any history in them. It says the history
    // starts now rather than implying something is broken or missing.
    progressEmpty: 'Nothing recorded yet.',
    progressEmptyBody: 'Your history starts with your next review — this fills in as you study.',
    progressRangeMonth: '30 days',
    progressRangeQuarter: '90 days',
    progressRangeYear: 'Year',
    progressStatReviews: 'Reviews',
    progressStatActiveDays: 'Days studied',
    progressStatAverage: 'Average per day',
    progressStatNewCards: 'Cards added',
    progressStreak: 'Current streak',
    progressStreakDays: '{count} days',
    progressStreakDay: '1 day',
    progressCalendar: 'Calendar',
    progressLessMore: 'Less',
    progressMore: 'More',
    progressByLanguage: 'By language',
    progressLanguageReviews: '{count} reviews',
    progressCardsFromPacks: '{count} from packs',
    progressTooltipReviews: '{count} reviews',
    progressTooltipOneReview: '1 review',
    progressTooltipNoReviews: 'No reviews',
    progressTooltipCards: '{count} cards added',
    progressTooltipOneCard: '1 card added',
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
    helpLearnTitle: 'What Learn is for',
    helpLearnLead: 'Look up anything you are unsure of, then keep it.',
    helpLearnPoints:
      'Look up a word or phrase and get an explanation pitched at what you asked.\n' +
      'Save it as a card — the examples and the breakdown are saved with it.\n' +
      'Word of the day is there for when nothing particular is on your mind.',
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
    // Pronunciation notes — a rule stated once, for languages where the aid is
    // a fact about the whole language rather than data on each card.
    pronunciationNoteKikuyu:
      'ĩ and ũ are separate vowels, not i and u with a mark on them — swapping them changes the word. Gĩkũyũ has seven vowels.',
    pronunciationNoteJapanese:
      'Readings carry pitch accent: は＼し drops after は (箸), はし＼ drops after し (橋), はし stays level (端).',
    wordOfTheDay: 'Word of the day',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    // Depth / examples errors
    errorLoadDepth: 'Failed to load definition. Please try again.',
    errorLoadExamples: 'Failed to load examples. Please try again.',
    // Disambiguation
    disambiguationPrompt: 'This term has multiple meanings. Which one do you mean?',
    notWhatYouMeant: 'Not what you meant?',
    addContextPlaceholder: 'Add context (e.g. "the fruit", "casual speech")',
    regenerate: 'Regenerate',
    // Spellcheck on lookup
    showingResultsFor: 'Showing results for {term}',
    searchInsteadFor: 'Search instead for {term}',
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
    // Parts of speech — read through `partOfSpeechLabel`, never `t` directly
    posNoun: 'Noun',
    posVerb: 'Verb',
    posAdjective: 'Adjective',
    posAdverb: 'Adverb',
    posPronoun: 'Pronoun',
    posDeterminer: 'Determiner',
    posNumeral: 'Numeral',
    posPreposition: 'Preposition',
    posConjunction: 'Conjunction',
    posInterjection: 'Interjection',
    posParticle: 'Particle',
    posCounter: 'Counter',
    posAffix: 'Affix',
    posPhrase: 'Phrase',
    posIdiom: 'Idiom',
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
    labelSpanish: '스페인어',
    labelKikuyu: '키쿠유어',
    labelSwahili: '스와힐리어',
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
    // Typed responses
    typedReviewToggle: '답을 직접 입력하기',
    typedAnswerPlaceholder: '{language}로 입력해 보세요',
    typedAnswerCheck: '확인',
    typedAnswerReveal: '그냥 정답 보기',
    typedAnswerCorrect: '맞았어요',
    typedAnswerMissed: '아쉬워요',
    typedAnswerYours: '입력한 답',
    // Offline review — mobile keeps its own card snapshot and rating queue
    offlineReviewBanner: '오프라인 상태예요. 받아둔 카드로 복습할 수 있어요.',
    offlinePendingReviews: '{count}개 저장 대기 중',
    offlineShort: '오프라인',
    offlinePendingShort: '{count}개 대기',
    offlineNoCachedCards: '{language} 카드를 아직 받아두지 않았어요. 연결하면 불러올게요.',
    // Stopping early — deliberately not the same as finishing
    reviewStoppedTitle: '여기까지 했어요',
    reviewStoppedSummary: '{count}개 복습했어요. 기록은 저장됐어요.',
    reviewStoppedNone: '이번엔 복습한 카드가 없어요.',
    reviewStoppedRemaining: '이번 세션에 {count}개 남았어요',
    reviewResume: '이어서 하기',
    undoRating: '방금 평가 되돌리기',
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
    helpLearnTitle: '단어 찾아보기',
    helpLearnLead: '궁금한 단어나 표현을 찾아보고, 그대로 카드로 남겨요.',
    helpLearnPoints:
      '단어나 표현을 검색하면 뜻과 쓰임을 설명해드려요.\n' +
      '설명을 카드로 저장하면 예문과 풀이도 같이 저장돼요.\n' +
      '딱히 찾을 게 없을 땐 오늘의 단어부터 시작해보세요.',
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
    pronunciationNoteKikuyu:
      'ĩ와 ũ는 i, u에 기호를 붙인 변형이 아니라 별개의 모음입니다. 바꿔 쓰면 다른 단어가 됩니다. 기쿠유어의 모음은 일곱 개입니다.',
    pronunciationNoteJapanese:
      '발음 표기에 고저 악센트가 함께 표시됩니다. は＼し는 は 뒤에서 내려가고(箸), はし＼는 し 뒤에서 내려가며(橋), はし는 평판형입니다(端).',
    wordOfTheDay: '오늘의 단어',
    copy: '복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    // Depth / examples errors
    errorLoadDepth: '정의를 불러오지 못했습니다. 다시 시도해주세요.',
    errorLoadExamples: '예문을 불러오지 못했습니다. 다시 시도해주세요.',
    // Disambiguation
    disambiguationPrompt: '이 단어는 여러 의미가 있습니다. 어떤 의미인가요?',
    notWhatYouMeant: '원하시는 내용이 아닌가요?',
    addContextPlaceholder: '맥락 추가 (예: "과일", "구어체")',
    regenerate: '다시 생성',
    // Spellcheck on lookup — particle-free on purpose: {term} can be Hangul or
    // Latin script, and 을/를 would be wrong half the time.
    showingResultsFor: '{term} 검색 결과입니다',
    searchInsteadFor: '대신 {term} 검색하기',
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
    navProgress: '기록',
    // Progress dashboard
    progressTitle: '학습 기록',
    progressDescription: '어떤 날에 얼마나 공부했는지, 무엇을 새로 담았는지 한눈에 보세요.',
    progressSignedOut: '로그인하면 학습 기록을 볼 수 있습니다.',
    progressLoading: '기록을 불러오는 중...',
    progressEmpty: '아직 기록이 없습니다.',
    progressEmptyBody: '다음 복습부터 기록이 쌓입니다.',
    progressRangeMonth: '30일',
    progressRangeQuarter: '90일',
    progressRangeYear: '1년',
    progressStatReviews: '복습',
    progressStatActiveDays: '공부한 날',
    progressStatAverage: '하루 평균',
    progressStatNewCards: '담은 카드',
    progressStreak: '연속 학습',
    progressStreakDays: '{count}일',
    progressStreakDay: '1일',
    progressCalendar: '달력',
    progressLessMore: '적음',
    progressMore: '많음',
    progressByLanguage: '언어별',
    progressLanguageReviews: '{count}개 복습',
    progressCardsFromPacks: '단어팩에서 {count}개',
    progressTooltipReviews: '{count}개 복습',
    progressTooltipOneReview: '1개 복습',
    progressTooltipNoReviews: '복습 없음',
    progressTooltipCards: '카드 {count}개 추가',
    progressTooltipOneCard: '카드 1개 추가',
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
    // 품사 — 학교 문법에서 쓰는 이름 그대로. 배지에 한 단어로 들어가므로
    // '단위를 세는 명사' 같은 설명형은 피했다.
    posNoun: '명사',
    posVerb: '동사',
    posAdjective: '형용사',
    posAdverb: '부사',
    posPronoun: '대명사',
    posDeterminer: '한정사',
    posNumeral: '수사',
    posPreposition: '전치사',
    posConjunction: '접속사',
    posInterjection: '감탄사',
    posParticle: '조사',
    posCounter: '단위 명사',
    posAffix: '접사',
    posPhrase: '표현',
    posIdiom: '관용구',
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
 * A pronunciation rule worth stating once for the whole language, or
 * `undefined` where there is none.
 *
 * This is the third of the three ways a language can get a pronunciation aid,
 * beside a stored field (Japanese pitch accent, Traditional Chinese pinyin) and
 * a render-time transform. It exists because for some languages the useful
 * thing is not per-card data at all:
 *
 * - **Kikuyu** gets a respelling on the card (`kikuyuToEnglish`), but no
 *   *tone* — Gemini's tone marking was self-consistent on 2 of 19 words and
 *   respelled ũ/ĩ as ú/í, and no tone-marked machine-readable dictionary exists
 *   to replace it. The note carries the vowel rule instead, and it earns its
 *   place twice over now that the card shows a respelling: that respelling
 *   deliberately maps both `i` and `ĩ` to `ee`, so **this note is the only
 *   place the seven-vowel distinction is stated at all**. Weakening it would
 *   leave the collapse unexplained.
 * - **Japanese** has per-card data, and the note is how a learner learns to
 *   read ＼ at all. A notation nobody explains is not an aid. The romaji or
 *   Hangul beside it needs no note, which is the point of a transliteration.
 */
export function pronunciationNote(
  nativeLanguage: string | null | undefined,
  studyLanguage: StudyLanguage | undefined
): string | undefined {
  if (studyLanguage === 'Kikuyu') return t(nativeLanguage, 'pronunciationNoteKikuyu');
  if (studyLanguage === 'Japanese') return t(nativeLanguage, 'pronunciationNoteJapanese');
  return undefined;
}

/**
 * Attribution for the pitch accent table, required by its CC BY-SA 4.0 licence
 * and therefore **not optional chrome** — it renders wherever the Japanese note
 * does. Kept out of `translations` because a licence credit is the same in
 * every language and must not drift between them.
 */
export const PITCH_ACCENT_CREDIT = {
  text: 'kanjium (CC BY-SA 4.0)',
  href: 'https://github.com/mifunetoshiro/kanjium',
} as const;

/** True when this language's note carries the pitch accent attribution. */
export function pronunciationNoteNeedsCredit(studyLanguage: StudyLanguage | undefined): boolean {
  return studyLanguage === 'Japanese';
}

/**
 * The part-of-speech badge text, in the reader's own language — 명사 for a
 * Korean native, "Noun" for an English one, off the same stored code.
 *
 * Takes the card rather than the code so the six render sites read the same as
 * `getReading(card)` beside them, and returns `undefined` — not a fallback
 * string — for a card that has no part of speech or carries a code this build
 * doesn't know. Every site already hides a badge whose value is empty, and an
 * English code leaking onto a Korean card is worse than no badge at all.
 */
export function partOfSpeechLabel(
  nativeLanguage: string | null | undefined,
  card: Pick<TermCore, 'partOfSpeech'>
): string | undefined {
  const pos = card.partOfSpeech;
  if (!pos) return undefined;
  const key = `pos${pos.charAt(0).toUpperCase()}${pos.slice(1)}` as TranslationKey;
  return key in translations.English ? t(nativeLanguage, key) : undefined;
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

/**
 * Placeholder for the typed-answer input: "type it in Japanese".
 *
 * Always the study language, because typing only ever runs `backToFront` —
 * see `promptsForTyping`. Named the same way `directionPrompt` names it, so
 * the input and the question above it cannot disagree about what to call the
 * language.
 */
export function typedAnswerPlaceholder(
  nativeLanguage: string | null | undefined,
  studyLanguage: StudyLanguage | string | undefined
): string {
  const { studyLabelKey } = getStudyLanguageConfig(studyLanguage);
  return t(nativeLanguage, 'typedAnswerPlaceholder', {
    language: t(nativeLanguage, studyLabelKey),
  });
}
