# Project Status

_Reconciled against `main` @ `da5f081` on 2026-07-30 (PR #68, the TOPIK pack)._

## Shipped

### Foundation
- **Core loop** — term lookup → Gemini explanation → save as flashcard →
  bidirectional SM-2 review (direction filter, shuffled queue)
- **Infrastructure** — Firebase Auth, Firestore + security rules, Gemini proxied
  server-side, Next.js 16.2.7, Vercel deployment
- **Explanation quality** — fast call (translation + briefDefinition) plus
  user-triggered depth and examples; term disambiguation with multiple-meaning
  selection; markdown rendering; NDJSON streaming
- **Cards page** — search, filter (active/archived/all), sort
  (newest/oldest/A→Z), card order toggle, detail modal, edit/archive/delete,
  bulk actions, CSV + Anki export, bulk import
- **Review loop** — manage cards mid-session (edit/archive/delete), offline
  banner + cached review, force-sync button. _Web; mobile got its own offline
  story in PR #53, built differently — see below._
- **Streaks** — streak count + cards reviewed today in header, persisted to Firestore
- **Streaming + cache** — typewriter animation on depth/examples; Firestore
  IndexedDB persistent cache for instant repeat visits
- **First-time modal** — `LanguageSetupModal` shows for all visitors until
  native language is set; saves to localStorage + Firestore on sign-in

### Multi-language
- **Swedish support** (`feat/swedish`) — `studyLanguage` on card documents;
  two-step setup modal (native → study); study-language switcher; per-language
  collection routing; Swedish-appropriate Gemini prompts
- **Swedish noun gender + save fix** (`feat/swedish-gender`, 2026-07-04) —
  `gender?: string` on `TermCore`/`SwedishFlashcard`, badge on Learn / detail
  modal / review reveal; `saveFlashcardToFirestore` strips `undefined` before
  `addDoc`; `parseStreamedDepth` only includes keys with real values
- **Known-issue fixes + backlog batch** (PR #31, 2026-07-06) — localized
  disambiguation; `getDepthTarget()` targets the study-language word; hanja 훈음
  readings; word of the day; goal-based vocab lists; English (native-Korean
  learners), French, and Japanese via the new `STUDY_LANGUAGE_CONFIGS` registry.
  Security rules + composite indexes for the three new collections added
  manually 2026-07-08.
- **Examples fix for French/Japanese** (PR #32, 2026-07-08) —
  `parseStreamedExamples` moved into `@amgi/core` and made config-driven; it was
  gated on korean/swedish keys and silently dropped French/Japanese pairs. Tests
  cover all five languages.
- **Review language-switch fix** (2026-07-08) — the review page load effect now
  depends on `studyLanguage`, so switching no longer shows the previous deck.
- **Traditional Chinese** (`feat/traditional-chinese`, 2026-07-24) — sixth study
  language: `cards_chinese_traditional`, `traditionalChinese` study field, and a
  `pinyin` reading badge alongside Japanese's `furigana` via the shared
  `getReading()` helper. `/api/explain` detects Han script server-side and the
  prompt converts Simplified input to Traditional. Simplified is deliberately
  left as a possible future registry entry, not a script toggle — see
  `data-model.md`. Security rules + the `archived + createdAt` composite index
  for `cards_chinese_traditional` were added in the Firebase console and
  confirmed by saving Chinese cards (2026-07-24).

- **Japanese & Chinese depth** (PR #49, 2026-07-25) — the three "Now" items in
  one branch, plus a pronunciation bug they uncovered:
  - *Pronunciation for four more languages* — `ja-JP-Chirp3-HD-Charon`,
    `fr-FR-Chirp3-HD-Charon`, `sv-SE-Chirp3-HD-Charon`, and
    **`cmn-TW-Wavenet-A`** for Traditional Chinese. `cmn-TW` has no Chirp 3: HD
    voice at all, so that one traded voice quality for a Taiwanese rather than
    Mainland accent — **listened to and accepted 2026-07-25**, so the trade is
    settled and not a pending review. Japanese also speaks `furigana` when the card
    has one, via `getSpokenText()`; it takes furigana and not `getReading()`
    because pinyin is Latin text a Mandarin voice would spell out.
  - *Character breakdown* — the depth prompt's Han-script section is now
    per-language (Korean 훈음, Japanese on'yomi/kun'yomi, Mandarin pinyin),
    written once in `apps/web/src/lib/characterBreakdown.ts` because `/depth`
    and `/depth-stream` ask for it in two envelopes. `TermDepth.hanja` →
    `characterBreakdown`, read through `getCharacterBreakdown()`, which falls
    back to `hanja` so **no migration was needed**. Which languages get a
    section is `characterSectionKey` on the registry. Verified against Gemini:
    図書館/電腦 break down, ありがとう returns "none", Swedish/French omit it,
    갈등 unchanged.
  - *Kana packs* — `VocabPack` is now a discriminated union. A `cards` pack is
    pre-authored and saves straight to Firestore with no model call, and the
    modal stays open so 71 tiles are tappable in one sitting. Hiragana and
    katakana are generated from one table in `packages/core/src/kana.ts`.
    Deliberately widens the audience — see the amendment in
    [vision.md](vision.md).
  - *Single-character TTS returned silence* — found while testing the packs and
    **already broken for Korean**: Chirp 3: HD intermittently emits a near-silent
    clip for a lone character (11/70 kana, 9/21 Korean syllables, a different
    set each run; two-character text was clean). Cached audio never expires, so
    one bad generation was served forever. `ttsShortVoiceName` now routes single
    characters to a Neural2 voice and the route refuses to cache implausibly
    small audio. No purge needed — the voice name is in the cache path. See
    [lessons.md](lessons.md). The side effect — a single kana tile speaks in a
    different voice than a sentence in the same deck — was **reviewed and
    accepted 2026-07-25**. It's a decision, not an outstanding defect.

- **Card backs follow native language** (PR #67, 2026-07-28) — which slot held
  the back was decided per *study* language, so every non-English study language
  was hardcoded to `english` and a Korean native studying Japanese got English
  backs everywhere. The back-side fields came off `StudyLanguageConfig` onto
  `getBackSideConfig(studyLanguage, nativeLanguage)`, which is what made a
  31-file change tractable: the call sites that only want a collection name or a
  TTS voice kept compiling, and the 42 `backField` reads all became compiler
  errors. Cards now carry **both** back slots, so switching native language
  switches existing cards with you and no Firestore migration was needed —
  `getBackSide` falls back to `english` for anything written earlier. The 20
  `directionJapaneseToEnglish`-style i18n keys are composed from the six
  language labels instead, which deleted 40 strings rather than adding 32. Kana
  packs gained hangul backs from the 어중·어말 column of 외래어 표기법 (the
  word-initial column collapses か/が to 가); つ is 츠 (쓰) and ん is 응 by
  decision, not by the standard.
  - Two one-off scripts in `apps/web/scripts/`, both applied 2026-07-28:
    `backfill-pack-backs` filled hangul on 355 already-saved pack cards, and
    `dedupe-pack-cards` removed 71 duplicates. Kept as the record of what was
    written to production and why.
  - The duplicates were a **separate bug found on the way** and fixed in the
    same session: `savedTerms` is null both while the card fetch is in flight
    and after it fails, and the enrol path read that as "nothing is saved", so
    a tap before the load landed re-enrolled the whole deck. `unsavedPackCards`
    now returns `null` rather than an empty list when the saved set is unknown,
    which makes the caller answer for it — a comment asking them to check first
    is precisely what had failed.

### Decks, packs & collections
- **Packs unified into one pre-authored kind** (2026-08-02) — `lookup` and
  `cards` are gone, along with `LookupPack`, `CardPack`, `PackWord` and
  `PackCard`. Every pack is now `PackEntry {study, back, context?}` grouped into
  named `PackSection`s, with `layout: 'grid' | 'list'` and `pronounceable` as
  the only remaining differences. See the decision below for why.
  - **Section enrolment.** Sections are the unit: TOEIC is 4, TOPIK 6, kana 3
    (gojūon/dakuten/handakuten). Each has its own save button and saved count;
    the whole-deck button is deliberately secondary below them — still right on
    71 kana, wrong on 160 TOPIK words.
  - **293 card backs authored** — 133 Korean for TOEIC, 160 English for TOPIK.
    One side per pack, not both: `buildPackCardDraft` writes the study side last
    so it wins, so an authored back in that same slot could never be read.
    ⚠️ **Pending approval** — see the High backlog item.
  - **`CardDetailModal` is now the one card surface**, reached identically from
    the deck, `/cards` and review. Tapping any deck entry opens it, saved or
    not; it carries save, edit, archive, delete, and on-demand depth/examples.
    The deck's own management panel and the deck→Learn round trip are both gone.
  - **On-demand enrichment.** `/api/explain/depth` and `/api/explain/examples`
    already existed; what was missing was anywhere to call them from after a
    card was saved. Now callable from the deck, the card list and mid-review,
    persisting onto the card. Enrichment auto-saves an unsaved pack entry first.
  - **`context` survives onto the card** as `briefDefinition`, which is what
    `getDepthTarget` reads to pin the sense — without it, depth on `fine`
    returns a paragraph about quality.
  - **Drill works on every pack** now, TOEIC and TOPIK included. This closes the
    old "Drill for lookup packs" backlog item without building what it
    described: it proposed drilling the user's *saved cards* for a pack, and
    unification made the pack itself drillable instead.
- **Decks page** (PR #50, 2026-07-25) — `PacksModal` is retired on
  both platforms. `/decks` lists the packs for the current study language and
  `/decks/[packId]` is the deck itself, so the 71 kana tiles no longer fight an
  80vh modal for room. Entered from Learn, where the modal used to open; **not
  a nav tab**, per the decision below. Mobile mirrors the routes as a stack
  screen pushed above the tabs.
  - **`packId` on saved cards** — provenance only. Progress still matches on
    the study side, so a word looked up on your own counts and cards saved
    before the field existed aren't orphaned; the comment on the field says so,
    because using it for saved-marking is the obvious wrong turn.
  - `buildPackCardDraft`, `collectSavedTerms` and `getVocabPack` moved into
    `@amgi/core` — web and mobile were building the draft identically.
  - A looked-up word now reaches Learn as a route param instead of a callback.
    Both platforms wait for preferences before resolving it: `studyLanguage`
    reads 'Korean' until they load, so firing on mount looked the word up in
    the wrong language pair. Mobile passes a `nonce` so tapping the same word
    twice re-fires.
  - **Drill** (added 2026-07-25, same branch) — the gate on it ("only if the
    packs get used") was met by the user wanting it to learn kana. Enter from a
    deck: shuffled prompt → reveal → knew/missed, with missed cards requeued
    `DRILL_REQUEUE_GAP` (4) cards later so a session ends only once everything
    in it has been answered right at least once. Start screen mirrors Review's
    — direction pills reusing the registry's `directionFrontToBackKey`, plus a
    10/25/all session length, since 71 kana in one sitting is a lot. Pronounce
    button on the reveal for `pronounceable` packs.
    - The queue is pure and lives in `packages/core/src/drill.ts`, so it's the
      same on both platforms and it's the part under test (13 tests).
    - **Shuffle before cutting to size** — cutting first would drill the same
      opening kana every session and never reach the dakuten rows.
    - **Only `cards` packs are drillable.** A `LookupPack` has words with no
      back side, so there's nothing to check an answer against.
      ⚠️ **Superseded 2026-08-02** by the pack unification: every pack is
      drillable now, and the kind check this describes was deleted. Kept for
      the reasoning — it is a good record of *why* the split was a problem.
    - The score counts cards actually *answered*, not the session's starting
      size — ending a 71-card drill after five would otherwise have reported
      all 71 correct.
  - **Verified in Expo Go 2026-07-25**, both pack kinds: drill on a `cards` pack
    (kana), and tapping a word in a `lookup` pack (TOEIC) — the deck → Learn
    round trip, which had no web equivalent to prove it since it has to pop a
    stack screen above the tabs and have Learn pick the param up.
    ⚠️ **The deck → Learn round trip no longer exists** (2026-08-02): tapping a
    deck entry opens the card detail instead. Nothing on a deck navigates to
    Learn, so this particular mobile-only path is gone rather than changed.

- **Review by collection** (PR #51, 2026-07-26) — your own cards and each pack
  are separate collections now, reviewed apart end to end. Replaces the "deck
  filter on Review" this was scoped as: a filter chip assumed one pool that gets
  narrowed, when a pack and your own words are learned for different reasons.
  - **`getCollectionId(card)`** (`packages/core/src/collections.ts`) is the one
    place `packId` is read for grouping, so collections a user defines
    themselves are an added branch later rather than a migration.
    `buildReviewCollections` returns your own cards first, then packs in
    registry order, omitting any collection holding no cards — an unenrolled
    pack belongs on Decks, which is where you'd go to enrol in it.
  - **`isDue` moved into `@amgi/core`** beside sm2 with one signature. The two
    copies disagreed (web `{due, directions}`, mobile `Direction[]`), and web's
    never marked a card due backwards when it had `frontToBack` tracking but no
    `backToFront`. Shared rule: an untracked direction has never been studied,
    so it's due; only a card with *neither* tracked falls back to the legacy
    top-level `nextReview`. Closed the stale-test housekeeping item with it.
  - **Review's landing is the collection picker.** Direction chips moved inside
    the chosen collection — a separate axis, and collapsing the two into one
    chip row would multiply out. A single collection (every Korean-only
    session) skips the picker entirely. `?collection=` preselects for the
    handoff from a deck and is consumed once, or "change collection" would be
    dragged straight back to it.
  - **Pack cards left `/cards` entirely** — not hidden behind a chip. "Only my
    cards" is what makes that surface coherent. Management moved to the deck
    page, inline above the grid so `40 / 107` progress and the pronounce
    buttons survive. Only the back side is editable: rewriting あ would unmatch
    the entry from the deck it came from.
  - **Review this deck** enrols every unsaved entry in one batched write
    (`saveFlashcardsBatch`, chunked at 400) and routes into that collection.
    Enrolling hiragana creates ~214 due items at once, uncapped — contained to
    the one collection, which is much of why dropping "All" works.
  - **Decks became a nav item on both platforms**, and the conditional link on
    Learn went with it. On mobile that meant moving `app/decks/` into the tab
    group with its own `Stack` — without that layout expo-router flattens the
    deck routes into the Tabs navigator and `FloatingTabBar` maps over every
    route, so each surfaces as an extra icon drawing the generic fallback.
    Drill stayed on the root stack, where the tab bar still gives way to it.
    Route tree checked by running expo-router's own `getRoutes` over `app/`.
  - Two knock-ons worth knowing: `/cards` **export now covers only your own
    cards**, since it reads the same scoped list; and **"Review this deck" is
    `cards`-packs only**, because `packId` is written solely by
    `buildPackCardDraft` — a TOEIC word saved via Learn carries none and stays
    in My Cards.
  - **Crash on picking a collection** (PR #52, 2026-07-26) — found by the first
    Expo Go pass. `collectionId` was set in a handler and the queue for it built
    in an effect, leaving one render where the new collection was paired with
    the previous one's queue, `index` and `done`. Broke *every* path into a
    mobile session, not just the picker. `queueFor` now records what the queue
    was built for and the render waits for the two to agree. See
    [lessons.md](lessons.md) — the general shape is worth not repeating.
  - **Verified in Expo Go 2026-07-26:** picking a collection and reviewing a
    pack (katakana). ⚠️ **Still unverified on device:** the five-tab bar, the
    deck → `/review` handoff (`router.navigate` across tab groups), drill still
    opening full-screen above the tabs, and the deck page's manage panel.

### Review loop & reminders
- **Web review session parity** (PR #54, 2026-07-26) — the session controls from
  PR #53 brought over, plus a stale-state bug found on the way.
  - **Ratings never fed back into `userFlashcards`**, which `dueCards` derives
    from, so the due count was frozen at page load and starting a second review
    re-served the whole deck instead of the missed cards. Only a reload or Force
    Synchronize collapsed it. Mirroring each rating locally is safe mid-session
    because `activeQueue` is its own state, not derived from the cards.
  - **Render branch order became load-bearing** once that landed: `dueCards
    .length === 0` was checked before `reviewMode`, so the last answer of a
    clean session would have replaced the completion screen with the caught-up
    landing before it was seen. A session in progress outranks the due count.
  - **Same two surfaces as mobile** — a ✕ that stops a session, and a
    completion screen that names what is still due and offers it back. No new
    i18n keys; both platforms read the copy added in PR #53.

- **Offline review on mobile** (PR #53, 2026-07-26) — the review loop works
  without a connection, and ratings sync when one returns. Mobile keeps its own
  durable state because it has to: Firestore's persistent cache is IndexedDB
  and therefore web-only, so `getFirestore` on RN is memory-only. See the
  Firestore section of [lessons.md](lessons.md) — the two "offline doesn't
  fail, it lies" gotchas are the load-bearing part.
  - **Card snapshots per user and study language**, in AsyncStorage. Review
    loads cache-first, which also removed the spinner online. Languages this
    device has loaded are refreshed in the background, so switching study
    language offline works; one never loaded says so rather than showing the
    empty-deck state.
  - **A durable queue of unsent ratings.** Committed to disk *before* the
    network is attempted and replayed over the snapshot on load, so an offline
    session survives the app being killed instead of re-serving cards already
    answered. Conflicts are last-flush-wins — entries carry `reviewedAt` so a
    future "newer wins" has its half, but that rule also needs a timestamp *on
    the card*, written by web too, or every web review looks infinitely old and
    always loses. Decided against paying for that until it bites.
  - **Two bugs beyond review**, both from the offline-reads gotcha: an offline
    launch wiped the cached native language and reset the streak to zero,
    because "couldn't reach the server" and "no preferences" were the same
    value.
  - **`getNextReviewData` scheduled a lapse a day out**, so rating a card
    "again" removed it from today's queue. Web patched this at its call site
    and mobile never did — the same card lapsed differently per platform. Rule
    moved into the scheduler, web's override deleted. Three tests asserted the
    old behaviour; two had comments saying the card should be due "today
    (immediately)" directly above an assertion for tomorrow.
  - **A session can be stopped early** (✕ on the progress row) and is allowed
    to *finish*: a missed card stays due but does not reappear mid-session, and
    the completion screen offers another pass over exactly what was missed
    instead of claiming "all caught up". Rejected the alternative — reinserting
    missed cards a few positions later, as drill does — because it makes
    session length unpredictable and takes the choice of when to stop away from
    the user.
  - **Needs a production build**: adds `expo-network`, so it cannot ride a
    JS-only release.

- **Direction choice on mobile Review** (PR #65, 2026-07-28) — mobile served
  both directions with no way to pick; web has had chips since the collection
  picker landed. Mobile gained a start screen after the collection pick, rather
  than pills on the picker itself: the picker is skipped for single-collection
  users and for the deck handoff, so pills there would be invisible to exactly
  the people studying one deck. Worth one tap. Per-session and reset to `both`
  with the collection — a `reviewDirection` on the user doc was rejected as a
  schema change plus offline-write handling for a one-second choice. The queue
  moved to `packages/core/src/reviewQueue.ts` beside the drill queue (12 tests)
  because it existed twice after this and the copies would have drifted the way
  `isDue` did.

- **Word-of-the-day and review reminders** (PR #61, 2026-07-27) — local
  scheduled notifications, not remote push. Everything the decision needs (which
  cards are due, when the user last reviewed) is already on the device from the
  offline review work, so a server would recompute what the phone knows — and it
  avoids an APNs key on a borrowed developer account. Both reminders are
  independently opt-in and **off by default**.
  - **Word of the day fires at a fixed 09:00.** It's the same word all day, so
    choosing when to hear about it is a setting with no decision behind it.
  - **The review reminder is a one-shot, re-planned whenever its inputs move** —
    after each rating, on returning to the app, on a preference change. It is
    scheduled only when cards are actually due *and* today has had no review: a
    reminder to do something already done is what makes people switch
    notifications off for good. A repeating trigger would have kept firing long
    after the reason for it was gone.
  - A separate **"streak at risk" reminder was considered and dropped** —
    reviewing is what keeps a streak, so the review reminder already protects
    it. What a dedicated one adds is the loss-aversion framing, which is the
    part worth not building.
  - The scheduling decision is pure and lives in `packages/core/src/reminders.ts`
    under test (15 tests). Notifications are the surface nobody watches being
    built — one that fires wrongly is switched off forever, one that never fires
    isn't noticed at all — so that logic isn't left to a device.
  - **Permission is requested when the first reminder is switched on**, never on
    launch: iOS shows that dialog once ever, so it's spent where the reason is
    self-evident. A denied prompt shows as blocked with a link to system
    settings, rather than a toggle that silently does nothing.
  - **Needs a production build**: adds `expo-notifications`. It rode along with
    offline review's build rather than costing one of its own.

### Privacy & account
- **Account deletion + "your data"** (PR #59, 2026-07-27) — self-service account
  deletion on both platforms, closing the privacy backlog item.
  - **App Store Guideline 5.1.1(v) makes this a submission blocker**, not
    hygiene: an app offering account creation must offer in-app deletion.
  - **Client `deleteUser()` plus the Delete User Data extension** — the
    documented Firebase pattern. The client removes the account; the extension
    triggers on that and sweeps Firestore server-side, so cleanup finishes even
    if the app is closed mid-way. No API route, no `firebase-admin`.
  - **This is the second attempt.** PR #55 did it server-side with the Admin
    SDK, and adding `firebase-admin/auth` to `lib/firebaseAdmin` took
    `/api/pronounce` and `/api/word-of-the-day` down with it — every route
    importing that module returned 500 before its handler ran. PR #56 guessed at
    a bundling fix and did not help; PR #57 reverted both. **The root cause was
    never found.** A standalone build using Vercel's own dependency tracer
    serves all three routes correctly, so the bundling theory is unproven. What
    changed is that the current design does not need that module at all.
  - **Requires a console step.** The extension is installed and configured by
    hand — see [tech-stack.md](tech-stack.md). Without it the account is deleted
    but the cards remain, so the two have to land together.
  - **Expect a reauthentication prompt.** Deletion is security-sensitive and
    Firebase requires a sign-in from the last few minutes; both platforms catch
    `auth/requires-recent-login`, send the user back through Google, and retry.
  - **Pronunciation audio is deliberately kept.** Keyed by a hash of the text
    rather than by user, and shared — deleting it would break playback on other
    people's cards. Storage paths are left empty in the extension config for
    exactly this reason.
  - **Verified end to end on web, 2026-07-27**, against the real extension with
    a throwaway account: the account was deleted, the reauthentication prompt
    fired, and the cards disappeared from Firestore. That second half is the one
    worth checking — the extension can install cleanly and still match nothing
    if auto discovery is misconfigured, and it fails silently when it does.
  - **Verified on mobile too, 2026-07-27**, in Expo Go. Reauthentication there
    re-runs the Expo Google flow rather than a popup, and that response is
    marked consumed so the sign-in effect skips it — without that guard,
    deleting an account would immediately sign the user back in as a brand new
    one from the same Google identity, looking exactly like a failed deletion.

### Design & polish
- **Design system** — Forest/Sonokai/Paper/System themes, Source Code Pro,
  localized UI (EN + KO)
- **Desktop side navigation** (`feat/side-nav`, 2026-07-08) — fixed `SideNav`,
  collapsible icon rail, shared `SettingsMenu`
- **Theme rework + review/nav polish** (`feat/theme-rework`, 2026-07-09) —
  pre-paint inline script kills the theme and sidebar flashes; System theme;
  Sonokai replaces indigo Slate; review buttons no longer jump on reveal

### Content & audio
- **Pronunciation audio** (`feat/pronunciation-audio`, 2026-07-11) — Korean
  only. Google Cloud TTS Chirp 3: HD (`ko-KR-Chirp3-HD-Charon`) at
  `speakingRate: 0.85`. Lazy-generated on first play, cached in Firebase Storage
  keyed by text+language+voice+rate. Other languages return a clean "not
  available" until a voice is added to `STUDY_LANGUAGE_CONFIGS`.
- **Korean-user UX + TOEIC vocab pack** (PR #34, 2026-07-13) — setup modal step
  2 localized to the chosen native language; cards import/export fully localized
  EN+KO with `{token}` interpolation; **TOEIC Core Vocabulary pack v1** —
  `packages/core/src/packs.ts`, 133 curated words, `PacksModal` with
  saved-marking + progress, tap-a-word → normal Learn flow, polysemes carry
  context hints. ImportModal is paste-only; goal-based generation is still a
  coming-soon placeholder.
- **Depth/examples sense fix** (PR #35, 2026-07-14) — depth and examples prompts
  pinned to the disambiguated sense across all four routes. Fixes pack context
  hints, the disambiguation picker, and "not what you meant" in one go.
- **Word of the day fixes** (PR #37, `fix/wotd-disambiguation`) — four commits:
  pronunciation buttons on example sentences; WOTD sense pinned when opening its
  explanation (`briefDefinition` passed as a context hint); **WOTD persisted in
  Firestore** — one doc per `date_studyLanguage_nativeLanguage` in the
  `wordOfTheDay` collection, with `create()` resolving the first-request race,
  so the CDN header is now only a fast path and consistency no longer depends on
  cache behavior; prompt steered toward practical, date-relevant picks.

- **TOPIK 고급 pack** (PR #68, 2026-07-30) — the first Korean pack, 160 words
  for TOPIK II 5–6급 in `packages/core/src/topik.ts`. Korean had no pack at
  all until now, so `/decks` was the empty state on the app's own original
  study language. A `lookup` pack by design: most entries are Sino-Korean, so
  the hanja breakdown the Korean Learn flow already writes is the value, and
  여건/취지 have no one-word English gloss worth pre-authoring. Six sections
  (시사·사회 30, 추상 개념 30, 고급 동사 40, 형용사 20, 부사·연결 표현 20,
  관용 표현·사자성어 20), sourced from 국립국어원's 고급 learner lists,
  released TOPIK II papers and the university 5–6급 series — draft and open
  questions kept in `docs/packs/topik-pack-draft.md`.
  - **48 context hints**, carrying more weight than they did on TOEIC: Korean
    homographs are one form with unrelated senses (경기, 미치다, 지나치다),
    several everyday verbs are tested in their written sense (밝히다, 꼽히다),
    and every idiom needs one — 발이 넓다 read literally is a sentence about
    feet. First pack with **multi-word entries** (관용구, 이에 따라); the
    format always allowed them and no pack had exercised it.
  - The word list was **approved 2026-07-30** after use on mobile, which is
    the approval step the pack principles ask for.
  - Fixed on the way: `.gitignore` said `docs/`, and git never descends into
    an excluded directory, so the `!docs/packs/**` re-include beneath it had
    never worked — the TOEIC draft was tracked only because it was
    force-added. Now `docs/*`.

### iOS launch & mobile parity
- **iOS TestFlight prep** (PR #38, 2026-07-19) — bundle ID `com.tegi.amgi`,
  icon, env vars; production build submitted to App Store Connect; privacy
  policy page (`apps/web/src/app/privacy/page.tsx`) written from an actual audit
  of what the app collects
- **EAS OTA automation** (PRs #39–#41, 2026-07-21) — `mobile-ota-update.yml`
  publishes on pushes to `main` touching `apps/mobile/**` or `packages/core/**`;
  `mobile-typecheck.yml` gates PRs; `runtimeVersion` pinned to `appVersion`,
  `appVersionSource: remote`, iOS build auto-increment
- **Mobile ↔ web parity** (4 phases, 2026-07-21) — closes the old "mobile is
  Korean-only" gap:
  - *Phase 1* — study-language support across Learn/Cards/Review/Settings,
    `UserContext`, firestore + gemini services
  - *Phase 2* — Learn-screen features: `PacksModal`, `PronounceButton`
    (`expo-audio`), word of the day
  - *Phase 3* — Cards import/export, `CardDetailModal`, bulk actions
  - *Phase 4* — streaming depth/examples with typewriter cursor, shared
    `Markdown` renderer
- **Korean TestFlight beta info** (PR #42, 2026-07-21) — Korean privacy policy
  at `/privacy/ko` (mobile settings picks the version matching native language),
  localized mobile settings screen and tab accessibility labels, Korean beta
  listing copy in `docs/testflight-beta-info-ko.md`
- **EAS update channel fix** (PR #43, 2026-07-21) — production builds bound to
  the `default` channel so CI-published updates actually reach installed builds.
  ⚠️ Only affects builds cut *after* it — it can't retrofit a binary already in
  TestFlight.
- **Mobile theme parity** (PR #44, 2026-07-22) — mobile theme options matched to
  web; `THEMES` now carries its own `labelKey` instead of a separate lookup map.
  Held back from the previous build as a deliberate OTA test, which never
  arrived; **reaches the device in 1.0.2** (below).
- **Push entitlement dropped** (PR #63, 2026-07-27) — the 1.1.0 build failed
  with *"Provisioning profile doesn't support the Push Notifications
  capability"*, which reads like a credentials problem and is really an
  entitlement the app has no use for. `expo-notifications` sets `aps-environment`
  unconditionally — its iOS plugin has no option for it — because it can't tell
  local notifications from remote push. Amgi only schedules locally, so
  `apps/mobile/plugins/withoutPushEntitlement.js` deletes the key again.
  **Registration order is the subtle part**: Expo composes entitlement mods so
  the most recently registered runs *first*, meaning the plugin must be listed
  **first** in `plugins` to have the last word — listed after
  `expo-notifications`, the intuitive reading, it edits the key before that
  plugin writes it and silently does nothing. See [lessons.md](lessons.md).

### Learn screen fixes
- **Learn keyboard + generate link** (PR #60, 2026-07-27) — tapping the mobile
  search field raised the keyboard over it, and with the tappable spacer
  collapsed there was nothing left to tap to dismiss it. The old
  `KeyboardAvoidingView` subtracted the resting height (40% of screen) from the
  padding, so on any phone whose keyboard is shorter than that the padding
  clamped to zero and the bar never moved. **Lifting was the wrong idea
  regardless** — a field that jumps as you tap it is its own annoyance. The bar
  now sits above a band held open permanently at **46% of screen height**, so
  the field is in the same place before and after focus. 46% is *tuned, not
  measured*: measuring means reacting, and reacting means movement on first
  focus; current iOS keyboards with the predictive bar sit near 39–40%, and if
  one ever exceeds 46% the number is the fix. Word of the day moved into that
  band, and the whole screen now dismisses the keyboard on tap.
  - Also **removed the "generate words for a goal" link**, which only opened a
    coming-soon modal — from web too, since a placeholder on one platform and
    not the other is drift worth avoiding. The strings stay for when it lands.
    It belongs on Decks, beside the packs it would produce.
- **A second Learn tab tap clears the search** (PR #66, 2026-07-28) — the Learn
  screen had no way back: searching swapped the empty state (example chips, word
  of the day) for results, and the only exits were saving a card or restarting
  the app. Re-tapping the tab you're already on is where people reach for "start
  over", so that's what clears it. Arriving at Learn from *another* tab is left
  alone — a lookup you walked away from should still be there — and a tap with
  nothing to clear does nothing, so a half-typed term is never eaten.
  - **Clearing exposed a race the screen already had**: nothing cancelled an
    in-flight request, so a lookup could land after the user moved on and
    repopulate the screen, and a depth or examples stream could keep writing
    into whatever term came next. A `runId` ref now marks the lookup on screen —
    bumped by every new lookup, clear and save — and the async writers check it
    before touching state.

### Writing review
- **Writing review, web + mobile** (PR #69, merged 2026-08-01) — a **Passage**
  mode alongside **Word** on Learn. Submit a passage, get the rewrite a native
  would have written, that rewrite rendered in your own language as a check on
  whether a correction changed your meaning, and an ordered list of findings —
  each offering a flashcard when it holds something worth remembering.
  The first surface above word level on the **production** side of the four-skills
  ladder in [vision.md](vision.md); `backToFront` review was already the rung
  below it.
  - **Level adaptivity is emergent, not configured.** The passage is the level
    signal, so one prompt line replaces a placement test, a level field on
    `users/{uid}`, and per-level content. Measured, not assumed: a beginner
    passage returned grammar + register findings and a grammar-pattern card, an
    advanced one a single naturalness finding and no grammar at all. The four
    design calls behind this are in Decisions below — the ordered-list shape is
    the mechanism and is easy to undo by accident.
  - `packages/core/src/writing.ts` holds the types, the tolerant parser,
    `buildWritingCardDraft` and the one `getWritingReview` fetch both apps call.
    It deliberately says nothing about writing, because conversation practice is
    the same job on a different capture.
  - ⚠️ **Mobile has never been run on a device** — verified by `tsc` and a clean
    `expo export` only. It ships in the next production build; see the
    "Queued for the next build" list in [backlog.md](backlog.md).
  - The mobile panel uses `automaticallyAdjustKeyboardInsets` rather than a
    `KeyboardAvoidingView`. KAV with `padding` only shrinks the container and
    never scrolls the caret into view, so a passage past a few lines was typed
    underneath the keyboard — the same class of bug as PR #60 above, and the
    reason the input is now bounded at both ends rather than only a `minHeight`.

### Demo-blocking fixes
- **Native/study language collision + WOTD repeats + WOTD save drift**
  (PR #47, 2026-07-24) — the three "Next up" items in one batch.
  `resolveStudyLanguage()` in `@amgi/core` moves the study language to the
  previous native language when changing native language would leave you
  studying your own; silent, applied in both `UserContext`s. `/api/word-of-the-day`
  now reads the last 60 days of picks for the language pair **by document ID**
  (no composite index, so no manual Firestore step) and feeds them to the prompt
  as an exclusion list, retrying once on a collision. The card's explanation is
  generated and stored *with* the word, so tapping it is a read — halving the
  Gemini calls per word and ending the wording drift between the card and the
  saved flashcard; `wordOfTheDayCore()` reconstructs it for older documents.
  Also fixed a stale study-language cache guard that restored only Korean and
  Swedish, dropping French/Japanese/English learners back to the Korean deck.
- **Mobile Learn empty state + WOTD loading skeleton**
  (`fix/mobile-learn-empty-state`, merged straight to `main` 2026-07-24 — no
  PR) — the two confirmed mobile defects plus the WOTD loading
  item they shared a fix with. Saving a card no longer suppresses the empty
  state that hosts the word of the day, example chips and the packs/generate
  links: `isEmpty` dropped `!saveSuccess` and the banner renders inside the
  empty state, matching web. A successful save also clears a stale error from a
  failed depth load, which suppressed the empty state the same way. The mobile
  tagline was **cut entirely** — the screen read as crowded — so the empty
  state is now blank above the search bar; the resting padding that holds the
  search ~40% up the screen became a shrinkable spacer, so a short screen gives
  that space back instead of squeezing content into an overlap. Both platforms
  show a skeleton at the WOTD tile's real height while it loads, which removes
  the reflow that caused the overlap in the first place.

### Tooling
- **The web suite is green again** (2026-07-26) — 73/73. The two stale review
  tests that predated the monorepo restructure are both gone: `isDue` moved into
  `@amgi/core` with PR #51, and `review-response.test.ts` is fixed. The second
  one was scoped in the backlog as "delete line 150", which was wrong — that
  line (`not.toHaveProperty('frontToBack.nextReview')`, contradicted by the next
  line) was masking a **date bug in the same test**: it asserted the written
  review date by comparing `getDate()` against today's, so it failed on the last
  six days of every month and would have started failing on its own on 25 July
  regardless. Now measured as elapsed days. Worth remembering that a test failing
  for the stated reason doesn't mean that is the only reason it fails.

- **`npm run lint` works again** (2026-07-26) — `next lint` was removed in Next
  16 and parsed its own name as a directory, so the script exited 1 before
  linting anything. Now `eslint .`, which turned up more than a script change:
  - `eslint-config-next@16` **is** a flat config, so the `FlatCompat` wrapper
    `create-next-app` generated for the eslintrc era fails on it with
    "Converting circular structure to JSON". Imported directly now
    (`core-web-vitals` + `typescript` — the latter is what turns on
    `no-explicit-any`, and dropping it would have weakened the lint while
    looking like a fix). The package was also pinned at 15.3.1 against Next
    16.2.7; `@eslint/eslintrc` is gone with the wrapper.
  - `next lint` ignored build output implicitly. Running eslint directly does
    not, and `.next/` buried 90 real findings under **25,000** generated ones —
    the ignores are load-bearing, not tidiness.
  - The 24 real errors underneath are fixed: six `<a href="/">` became `<Link>`
    (a full page reload on every logo and "go to Learn" click), unescaped
    quotes, two unused bindings, and two `Record<string, any>` update objects.
    `no-explicit-any` is off for test files only, and the one survivor in
    `mapDocToFlashcard` carries a disable comment explaining that the Firestore
    timestamp boundary is genuinely dynamic.
  - ⚠️ Two React Compiler rules new in v16 find 13 pre-existing spots and are
    set to `warn` — see [backlog.md](backlog.md). Warnings, not disabled.
  - Lint still covers `apps/web` only; core and mobile have no `lint` script,
    so `turbo lint` reports success for one package. Backlogged with the CI gate.

- **Current state, measured 2026-07-30** (the two entries above are snapshots
  from the day they landed, kept for their reasoning): `npm test` is **148/148
  across 16 files**, and `npx eslint .` in `apps/web` is **0 errors, 18
  warnings**. The 13 React Compiler warnings the backlog tracks are still
  exactly 13 (11 `set-state-in-effect`, 2 `immutability`) — the other five
  accumulated since and are *not* covered by that item: 2
  `@typescript-eslint/no-unused-vars` (`decks/[packId]/page.tsx`,
  `decks/[packId]/drill/page.tsx`), 2 `@next/next/no-img-element` (`Header`,
  `SideNav`), 1 `react-hooks/exhaustive-deps` (`cards/page.tsx`).

## Builds

Under the no-OTA model every mobile change reaches users through one of these,
so this is the record of what actually landed on the phone and when.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 1.1.0 | 6 | 2026-07-27 | `8359adf` — on `fix/drop-push-entitlement`, before it merged as PR #63 |
| 1.0.2 | 4 | 2026-07-24 | `0288136` — version bump on `release/mobile-1.0.2` |
| 1.0.1 | 3 | 2026-07-21 | `a85270d` — merge of PR #43 (EAS channel fix) |
| 1.0.1 | 2 | 2026-07-21 | `4d217f3` — runtimeVersion pin, pre-channel-fix |
| 1.0.0 | 1 | 2026-07-17/18 | `db8a6ea` — merge of PR #37; two builds off the same commit |

Build 3 is the binary that was in TestFlight before this release, so **1.0.2 is
the first build carrying anything merged after 2026-07-21** — mobile theme
parity (PR #44), the Learn empty state + WOTD loading skeleton fixes, and the
language-collision / WOTD batch (PR #47).

**1.0.2** — EAS build `39eb6ad6`, submitted to App Store Connect and accepted
for processing. ⚠️ What's *not* knowable from the repo: whether Apple finished
processing, and whether the build was actually distributed to testers. Confirm
in the console before assuming testers have it.

Not yet verified on the build itself (the checklist item that can only be done
on a real binary, not Expo Go): pronunciation audio, CSV/Anki export, sharing.

**1.1.0** — six merged items: the Japanese/Chinese depth batch (PR #49), Decks +
drill (#50), offline review (#53), account deletion (#59), the Learn keyboard fix
(#60) and reminders (#61). Two native modules, `expo-network` and
`expo-notifications`, sharing one build rather than costing two. Submitted and
put up for review for external testing on 2026-07-27.

⚠️ **Cut from a branch, not `main`.** Build 6 was made from `8359adf` on
`fix/drop-push-entitlement` while that PR was still open, because `main` at the
time could not produce a working binary. The branch merged immediately after, so
`main` and the build agree now — but the table records the commit that was
actually built, not the merge.

Build 5 does not exist: it was consumed by a failed attempt. With
`appVersionSource: "remote"` the number is reserved when the job is created, not
awarded on success, so gaps are normal.

Still unverified on this binary, and each one only provable there: the review
reminder firing *and disappearing once you review*, offline review across a
force-kill and reconnect, and account deletion against the production
`EXPO_PUBLIC_API_BASE_URL` — the logic is verified, that env binding is not.

## In Progress

- **iOS TestFlight external testing** — the code and infrastructure side is
  done and merged; what remains is App Store Connect console work: Beta App
  Review submission, external group + public link. Context worth keeping:
  - Tegi's account is enrolled as **Individual**, which blocks any
    non-account-holder from generating certs — worked around with an App Store
    Connect API Key.
  - Bundle ID `com.tegi.amgi` is **disposable**. A real public launch under the
    user's own account will be a fresh relaunch, not a migration — Apple's App
    Transfer doesn't cover TestFlight-only apps.
  - ⚠️ Current console state (approved? link live?) isn't knowable from the
    repo — confirm before assuming.

## Decisions

Calls that are **closed**. They live here rather than in
[backlog.md](backlog.md) so the backlog stays a list of open work — but the
reasoning is kept, because a decision with its reasoning lost gets reopened by
the next person to notice the symptom.

- **Packs: one kind, not two** (2026-08-02). The `lookup`/`cards` split was
  introduced as a cheap way to ship a word list without authoring backs for it.
  It was cheap in exactly the wrong place: a `lookup` pack could not be
  bulk-saved, drilled, or reviewed as a deck, because there was no card to
  write — so the packs with the most words were the ones with the least
  machinery. Rejected alternatives and why:
  - *Keep `lookup` and batch-generate backs at enrol time.* One Gemini call per
    chunk. Cheaper to build, but it puts a long spinner on the enrol tap and it
    generates the curated half of the content, which contradicts the
    curated-not-generated principle in [vision.md](vision.md).
  - *Keep `lookup` and migrate pack by pack.* Would have left two code paths
    live indefinitely — the half-migrated deck page the backlog kept warning
    about.

  **The tension worth remembering:** both packs' own headers argue these are
  words where a one-word gloss is *not enough* (여건, 취지, `outstanding`). That
  is still true. The resolution is that **the back is a seed, not a finished
  card** — it exists to make the word savable and reviewable at all, and depth
  is generated on demand per card afterwards. Before, that generation was
  mandatory and came *before* the card existed; now it is optional and comes
  after. If a future change makes on-demand depth hard to reach, this
  justification goes with it and the gloss-only cards become a real regression.

  Sections are **semantic, not uniform slices** — "Familiar words, second
  meanings" is a theme a learner can hold, "words 31–60" is not. That costs
  evenness: sections run 20 to 45. Accepted deliberately.

  `layout` replaced `kind` for the deck page's grid-vs-list choice, keyed on the
  shape of the content rather than on the pack, so a future single-character
  pack inherits the grid without anyone remembering to ask for it.

- **Writing review: four design calls** (2026-07-31). The backlog item was
  blocked on "needs design first"; these are the answers, with reasoning.
  - **It lives as a Word/Passage toggle on Learn, not a fifth nav tab.** The
    considered alternatives were a `/write` route entered from Learn (the
    `/decks` precedent) and a fifth tab. The toggle won on the vision statement
    itself — "Amgi is ONE place to ask, understand, and remember" — since a
    passage you're unsure about is the same question as a word you're unsure
    about, asked at a different size. It also **defers the nav question until
    conversation practice lands and there are two output surfaces to place
    together**, which is what the backlog already said to do. Cost accepted:
    discoverability rests entirely on the toggle, so it's a visible segmented
    control rather than a subtle affordance. Promote to a route or tab later if
    it earns one.
  - **Findings are one ordered list, not fixed sections.** This is the whole
    level-adaptivity mechanism and is easy to undo by accident. The model orders
    by what *this* writer most needs; a beginner's list leads with grammar, an
    advanced writer's with register and naturalness. Split it back into fixed
    sections and a beginner gets an empty register heading while an advanced
    writer gets an empty grammar one — and the adaptivity has to be rebuilt as
    configuration. Verified against real passages, both directions.
  - **Any teachable unit becomes a card, including grammar patterns.** The
    first draft of this reasoned that only vocabulary items should — wrong, and
    wrong for the reason the audience amendment in [vision.md](vision.md)
    fixes: `-다가` with a back of "after doing, then…" is a good card, and for a
    beginner it is the *most* valuable one on the page. One-off typos still get
    no card, because they teach nothing.
  - **The rewrite is shown in the native language too** (2026-08-01,
    `rewriteNative`). Not a convenience — a correctness check. The rewrite is
    the one text on screen the user did *not* write, so it is the one text whose
    meaning they cannot verify, and a correction that quietly changed what they
    were trying to say is worse than no correction because they will go on to
    learn the changed version. Rendered subordinate to the rewrite but **not**
    behind a tap, despite "depth on demand": a check nobody opens is a check
    nobody runs. The prompt is told to translate faithfully *including* where
    the rewrite departs from what they wrote — smoothing that over would defeat
    the whole point. Optional in the type, so a malformed one costs this line
    rather than the review.
  - **A card back may carry up to two glosses, never more** (2026-07-31). The
    first build forced exactly one, copied from `/api/explain`'s "single best
    translation — never list synonyms with semicolons or slashes". Too strict:
    words are sometimes genuinely interchangeable, and sometimes no single word
    in the other language covers the term, so forcing one gloss makes the card
    wrong rather than clean. Two is the ceiling and it is for necessity only —
    not a licence to pad, and never a third. ⚠️ **`/api/explain` still enforces
    strictly one** and was deliberately left alone here, since relaxing the core
    lookup loop's prompt does not belong in a writing-review change. That
    inconsistency is now the open question, not the rule itself.
  - **Submissions are ephemeral; only saved cards persist.** No new Firestore
    collection, so neither of the two manual console steps applies. The cards
    are the durable artifact. Reopen this if a progress-over-time surface is
    ever wanted — storing writing is the only way to show a level actually
    moving — but it's purely additive, so it isn't owed now.
- **Decks page: drilling lives there, not in Review** (2026-07-25). The
  alternative considered was letting Review pick a deck and leaving Decks as a
  passive display. Rejected because it makes Review mean two things: if a
  deck-scoped Review still respects due dates you get 4 of 71 kana and can't
  drill, and if it ignores them there are now two loops behind one tab with no
  way for the user to tell which one they'll get. Drill is a closed set,
  repeatable, not due-gated; Review is "what the scheduler says". Decks is the
  library, drill is entered from a deck.
  - **Amended 2026-07-26 (PR #51):** the "and Review keeps its whole-collection
    default, gaining a *filter* later" half is superseded. Review composes
    collections instead of filtering a pool. The load-bearing part stands
    unchanged and is why: a deck-scoped Review is still due-gated and still
    isn't drill, so the two loops remain distinct. What changed is only that
    "which cards" is now a choice you make before starting rather than a
    narrowing of one queue.
- **Drill writes no SM-2 state** (2026-07-25). Practice and scheduling stay
  separate, so grinding the kana chart five times in an afternoon can't wreck
  intervals. Cards saved from a pack still surface in Review on their own
  schedule. If drill later feels like it "doesn't count", the fix is showing
  progress in the deck, not writing to the scheduler.
- **No "All cards" row on the decks page** (2026-07-25). Proposed to make the
  Decks/Cards naming read the Anki way round, then dropped — it's a nav entry
  pointing at a nav entry, and a naming fix isn't worth a fake row. The one
  thing it would genuinely have bought is *drill my whole collection ignoring
  due dates*, which neither Cards nor Review offers; nobody has asked for it,
  and if it's ever wanted it's a button on Cards, not a deck.
- **~~`/decks` is a route, not a nav tab — for now~~ → reversed 2026-07-26**
  (PR #51). Decks is a nav item on both platforms now, unconditionally. The
  trigger below was pack *coverage*; what actually justified it was the
  **model** changing — a pack became a collection you review, a peer of Cards,
  and a peer doesn't live behind a link on Learn. The empty-for-four-languages
  objection was answered rather than outgrown: a *conditional* nav item would
  reflow the bar on every study-language switch, which is worse than a quiet
  empty state, so the empty state says what a pack is instead of promising one.
  The deferred Decks-vs-Cards naming collision comes due with this — the nav now
  reads Learn / Review / Cards / Packs, using "Packs" rather than "Decks" so the
  two nav entries don't ask to be compared as Anki-style decks. The original
  reasoning, kept because it explains what the trigger was watching for:
- **`/decks` is a route, not a nav tab — for now** (2026-07-25). `VOCAB_PACKS`
  (`packages/core/src/packs.ts:212`) covers English and Japanese only, so
  `getVocabPacks()` returns `[]` for Korean, Swedish, French and Traditional
  Chinese. A tab would be empty for four of six study languages and would change
  contents on study-language switch, which no other nav item does — that teaches
  people the page is worthless, which is worse than the modal it replaces.
  Entered from Learn instead, so a Japanese learner sees it and a Swedish
  learner doesn't. **Promote it to a tab when pack coverage justifies it** — the
  trigger is coverage, tied to the packs item in [backlog.md](backlog.md), not
  the kana work. The Decks-vs-Cards naming collision is deferred with it: a
  route reached from Learn doesn't sit next to Cards asking to be compared, so
  no rename is owed until it becomes a tab.
- **The app keeps the name "Amgi"** (2026-07-25). The open question was whether
  암기 would still fit as the app grew past Korean; it was weighed and the
  answer is yes. The name is settled, the rename backlog item is gone, and the
  "cheaper to rename before public launch" urgency goes with it. A domain can be
  bought against the current name whenever it's wanted. Don't re-raise this as
  growth advice — it was considered and declined.
- **`cmn-TW-Wavenet-A` stays** for Traditional Chinese (2026-07-25). Samples in
  `audio-test/lang-voices/` were listened to against `cmn-CN-Chirp3-HD-Charon`
  and accepted. `cmn-TW` has no Chirp 3: HD voice at all, so this trades voice
  quality for a Taiwanese rather than Mainland accent — the accent won.
- **A single kana may sound different from the rest of its deck** (2026-07-25).
  Single characters route to a Neural2 voice while everything longer uses
  Chirp 3: HD, so the speaker audibly changes between a kana tile and a
  sentence. Accepted: correctness beat consistency, and moving Japanese and
  Korean wholesale to Neural2 would cost quality on longer text. **Not a
  consistency bug** — if this resurfaces as a complaint, it's a re-decision, not
  a fix.
- **No OTA** (2026-07-23) — see Known Issues below and
  [tech-stack.md](tech-stack.md).

## Known Issues

Root-caused and queued in [backlog.md](backlog.md) — see there for scope.

_(The two mobile Learn defects that sat here are fixed and shipped in
1.0.2 — see Builds.)_

Parked, not fixed:
- **OTA updates never reached the device** — CI published PR #44 successfully
  (run `29892869152`) but the theme change never appeared. Repeated debugging
  attempts dead-ended, so **OTA was abandoned on 2026-07-23** rather than
  diagnosed. The shipping model is now Expo Go for development and production
  builds for release; see [tech-stack.md](tech-stack.md). Not a blocker under
  that model — reopen only if there's a specific reason to want OTA back.

Resolved:
- **Word-of-the-day reload variance** — was previously logged as "reviewed and
  accepted" on the reasoning that the CDN `s-maxage=86400` cache kept it stable
  in prod. Actually **fixed** in PR #37 (`d0e07ac`): Firestore is now the source
  of truth, so the word is stable regardless of cache behavior or environment.
