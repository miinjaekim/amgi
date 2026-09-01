# Backlog

Open work only, ordered by priority. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to Decisions in [status.md](status.md) **with its reasoning**, so a closed call
doesn't get reopened from here. Priority mirrors the user's Google Tasks list;
this is the scoped version of it.

**Mobile ships by build — no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. Once one native module is in a
build, a second rides along free rather than costing a build of its own.
**Android auth work is the exception**: it cannot run in Expo Go, so it needs a
development build — and Android release builds face no review, so a fix there
costs ~20 minutes rather than an App Review cycle.

---

## Queued for the next build

**Typed responses during review** (2026-08-24). Web gets it at deploy, mobile at
the next build — no native module, so it rides whatever build comes next rather
than earning one. Two things to watch for on that build are listed below.

**Undo a rating** (2026-08-25). Same terms — JS only, so it rides the same build.
Worth checking on the binary: the ↺ in the progress row holds a 44pt slot even
when empty, so the `n / m` count should not shift sideways on the first rating of
a session. Reasoning in [status.md](status.md).

**Audio on mobile review** (2026-08-28). Same terms again — `expo-audio` is
already in the shipped build, so this is JS only. Worth checking on the binary:
the button **hides while offline**, so on a subway session the word should lose
its 🔊 and the progress line should be the thing that says why. Reasoning in
[status.md](status.md).

**Pronunciation speed dial** (2026-09-01). Same terms — the rate is applied at
playback with `expo-audio`'s `setPlaybackRate`, which is already in the shipped
build, so this is JS only. ⚠️ **The one thing to check on the binary is the ear
test the plan deferred**: Slow is a pitch-corrected 0.7× stretch of a clip
synthesized at 0.85, not a natively slow synthesis. If it sounds like an
artifact rather than a careful speaker, the fallback is server-side rates behind
the same three chips — no UI change. Reasoning in [status.md](status.md).

**Pronunciation aid: transliteration + Japanese pitch accent** (2026-08-30).
Same terms — JS only on mobile. The **transliteration half needs no backfill and
shows on every existing card at once**, since it derives from the term; the
pitch accent half only appears on cards saved after deploy. Worth checking on
the binary: the badge is now two things joined by `·` (`す＼し · sushi`), so it
is the longest that slot has ever held — watch it at the narrowest phone width,
and on a long word like とうきょう. Reasoning in [status.md](status.md).

**Japanese pitch accent + the pronunciation notes** (2026-08-30). Same terms —
JS only on mobile, since the 2.7 MB accent table stays on the server and the
phone only renders what the card already carries. **Web gets the badge at
deploy; existing Japanese cards do not** — `pitchAccent` is filled when a card
is saved, so a card saved before this shipped keeps showing bare furigana until
it is looked up again. That is the designed fallback, not a bug, but it means
the feature looks absent on an old deck. Worth checking on the binary: the
mark is a full-width ＼ inside the badge (は＼し), so the badge should not
wrap or clip at the narrowest phone width, and the Kikuyu/Japanese note under
the Try: row should not push the search field off-screen. Reasoning in
[status.md](status.md).

**Spanish Basics pack** (2026-08-31). Web gets it at deploy, mobile at the next
build — no native module, so it rides whatever build comes next. **Nothing
existing changes**: it is a new registry key, a new module and one optional field
on `PackEntry` that no other pack sets. Worth checking on the binary: this is the
first `layout: 'list'` pack where entries carry an **article badge**, and the
first whose rows can be a **whole question** (`¿cómo está usted?`), so the deck
row is the longest that layout has had to hold — watch it at the narrowest phone
width. Reasoning in [status.md](status.md).

**Kikuyu Basics pack, and the `Cw` respelling fix** (2026-08-31). Web at deploy,
mobile at the next build — JS only. **The respelling fix reaches every existing
Kikuyu card**, not just the pack: a consonant before `w` was stranded as its own
syllable, so `mwarĩ` rendered `m-wa-re` and 므와레 rather than `mwa-re` and 뫄레.
Worth checking on the binary: the Korean side now uses the `w`-series syllables
(뫄, 뭬, 콰, 과, 화), which no other language in the app produces, so it is the
first time those glyphs render in the badge at phone width.
⚠️ **A speaker has still not read the Kikuyu list** — shipped that way knowingly,
with a source tier on every entry (16 corroborated twice, 36 on one source, 7
derived). The verb section is where a check is worth the most: seven of ten are
Dahl's Law applied to sourced stems rather than attested infinitives. The
`guka`/`wagui` conflict and whether kinship is inherently possessed are both
still open in `docs/packs/kikuyu-basics-pack-draft.md`.

- **Delete `packages/core/src/writing.ts`, `grammar.ts` and the two API routes
  that keep them alive.** **The gate is open**: it was "once no build predating
  the 2026-08-18 grammar removal is still in use", and 1.4.0 is that build. What
  is left is not a condition but a fact to check — that testers have actually
  updated, since an un-updated 1.3.0 device still has the UI compiled in and
  calls those routes. Both files carry a `DO NOT DELETE AS DEAD CODE` header;
  the reasoning is in [status.md](status.md). **`typedAnswer.ts` is not part of
  this** — `grammar.ts` imports its folding rules rather than owning them now,
  so the deletion takes the importer and leaves the module.

⚠️ **Read what testers report, rather than testing by hand.** These are the
oldest open items in the project — never checked on any release, only in Expo Go
— and 1.4.0's What to Test asks for them by name, with **offline review first**:

- Native paths: pronunciation audio, CSV/Anki export, sharing, offline review
  across a force-kill and reconnect, account deletion against the production
  `EXPO_PUBLIC_API_BASE_URL`, and the review reminder firing *and then
  disappearing* once you review.
- Three renders never seen on a device: the packs list without per-pack
  descriptions, the "showing results for…" row, the part-of-speech badge.
  Cosmetic risk only — spacing, fit, wrapping.
- **Typed responses on a phone**: what a Korean or Japanese IME does with
  `autoCorrect={false}` / `autoCapitalize="none"` — an IME that autocorrects the
  word being recalled does the exercise for the learner. The keyboard covering
  the action row was found and fixed in Expo Go, so only this half is left.
- **Korean date formatting** in the progress day tooltip — nothing else in the
  app formats a date with a locale and options, so Hermes' `Intl` is unproven
  there on a release build.
- All of the above is **separately unverified on Android**, where only sign-in
  has been exercised.

**Pre-flight:** smoke-test in Expo Go → verify the native-adjacent things on the
build itself → bump `version` in `app.json` **before** starting the build (EAS
auto-increments the *build* number and never the version, so nothing catches this
for you) → rewrite What to Test in `docs/testflight-beta-info.md` and re-check
the rest of it — **the description and the Apple review notes go stale too**, and
1.4.0 shipped with both still describing features removed in August → **`expo
config --type introspect` if any native module was added**, which is where an
unasked-for entitlement shows up before a cloud build finds it → submit
(`ascAppId` is in `eas.json`) → paste the listing copy into Test Information,
**both ko and en**.

⚠️ **Cut the build without `--non-interactive`.** It does not skip prompts, it
turns one into an error — 1.4.0 died on an unanswerable Apple Team ID question
and burned build 12. The flag is for CI.

_A version bump queues another Beta App Review; 1.4.0's external approval covers
1.4.0 only. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._

## High

Queued 2026-08-31, in the user's order. **Both pack items and the speed dial
have left this section** — Spanish and Kikuyu are built, and the pronunciation
speed dial shipped 2026-09-01; see the build queue above. The two pronunciation
items that used to sit here were **cancelled** — reasoning in the Decisions entry in
[status.md](status.md), and the Kikuyu one's durable half moved to
[lessons.md](lessons.md) rather than closing with the item.

### Mobile UI redesign — queued 2026-09-01, ahead of the stats asset

Five items from one session's thinking, ordered so the shape is settled before
anything is styled. **All five are JS-only** — no native module, so the batch
rides whatever build comes next rather than earning one. Three of them (profile,
settings, switcher) move pieces of the same screen; build them together or the
second one rewrites the first.

**Web is already most of the way to the shape being asked for**, which is the
cheapest fact in this cluster. Web nav is Learn / Review / Cards / Packs /
**Progress** (`nav-items.tsx`) with settings in a popover; mobile's fifth tab is
Settings and `/progress` is reachable only from the streak badge. So most of
this is mobile catching up, not a new design — and [ui-ux.md](ui-ux.md) still
says nav is "Learn / Review / Cards / Packs on both platforms", which stopped
being true when web gained Progress. Fix that line with the change.

- [ ] **Rearrange the tabs; make the fifth one Profile rather than Settings.**
      Two orders on the table: **Review · Packs · Learn · Cards · Profile**, or
      the same with **Cards second and Packs left where it is** (Review · Cards ·
      Learn · Packs · Profile). Order lives in `(tabs)/_layout.tsx`.
      ⚠️ **The real decision is not the order, it is what the app opens on.** The
      first tab is the initial route, so "Review leftmost" makes Amgi a
      review-first app on launch rather than a lookup-first one. Worth choosing
      on purpose, since it is the answer to "what is this app for" that every
      cold open gives.
      `FloatingTabBar` is **icon-only**, so position and glyph are the only
      affordances a reorder has — nothing labels the change for a tester who
      already has muscle memory. Settings leaving the bar means the route moves
      out of `(tabs)`; nothing deep-links to it.
      Decide whether web reorders too. It shares the concept, not the file
      (`nav-items.tsx`), and a vertical sidebar has no leftmost — "first" reads
      as less of a claim there.

- [ ] **Profile screen — the progress data, actually visualized.**
      What exists: `/progress` on both platforms (`app/progress.tsx`,
      `app/progress/page.tsx`) with a heatmap, 30/90/364 range chips,
      `summarizeProgress` totals, and a **per-language breakdown that already
      ships** (`summary.byLanguage`, sorted by reviews). So "which languages am I
      learning and how far along" is a **presentation upgrade, not a data
      change** — `DailyProgress.byLanguage` has been written since rollups began.
      Reachability is the other half of the win: the streak badge is the only way
      in and it renders only when `streak > 0` (`(tabs)/index.tsx:477`), so
      breaking a streak hides the screen that would tell you. A tab fixes that by
      construction.
      ⚠️ **Two limits to design inside rather than around.** Verdict counts
      (again/hard/good/easy) are **whole-day, not per language**
      (`progress.ts:65`), so accuracy-per-language is not derivable from history —
      it needs a write-path change **decided now**, because a field added later
      collects only from the day it ships. And **history began 2026-08-20 and
      cannot be backfilled**, so every "total" is a total since then: label the
      window or scope the design to one.
      "Cards learned" still does not exist anywhere — the shareable stats asset
      below needs the same definition, so settle it once, in whichever ships first.

- [ ] **Settings redesign — collapse the language lists.**
      Nine study languages (`STUDY_LANGUAGE_CONFIGS`) render as a flat wrapping
      chip row, and so do native languages, themes and speeds: four chip rows down
      one scroll, growing with every language added. **Web already solved this** —
      `SettingsMenu.tsx:56` shows the current study language as a single row that
      discloses the list on tap. Port that rather than inventing a mobile pattern.
      Includes where settings lives once it is not a tab: a button on the Profile
      header (top right, per the proposal) opening the same screen.

- [ ] **Per-context pronunciation speed.** One setting drives every play button
      today, and the comment at `(tabs)/settings.tsx:225` says why: term,
      translation and example all render the same `PronounceButton`, so a second
      setting had nothing to name. The ask names two things it could split on —
      **content** (term vs example sentence) and **surface** (browsing vs
      learn/review).
      ⚠️ **Pick one axis.** Both is a 2×2 — four controls for something a user
      sets once and forgets.
      Mechanically cheap: rate is applied at playback (`setPlaybackRate` native,
      `playbackRate` web), so **no re-synthesis and no cache churn**. The work is
      a `kind` prop at the call sites — example sentences are the `sides.study`
      ones (`index.tsx:760`, `review.tsx:1317`, `CardDetailModal.tsx:303`),
      everything else is the term — plus a second AsyncStorage key, with the
      existing `amgi_pronunciation_speed` read as the default for both so nobody's
      setting resets.
      Web has the same button and the same context, so this lands on both. And
      `settingsPronunciationSpeedDesc` ("applies to terms, translations, and
      example sentences", `i18n.ts:158`/`:518`) becomes false the moment it ships.

- [ ] **Quick study-language switcher, off the settings screen.** Web has one —
      the sidebar's language chip opens `StudyLanguageList` (`SideNav.tsx:205`) —
      and mobile has nothing, so changing language is a trip to a tab. The
      argument is not just relocation: study language changes often and native
      language rarely, so the two controls do not belong at the same weight.
      ⚠️ **A fast switch is not a small write.** `setStudyLanguage` runs
      `resolveNativeLanguage`: choosing the language you are native in moves your
      **native** language, which changes the UI language. Defensible behind a
      settings screen, alarming from a one-tap chip — either drop the native
      language from the quick list or confirm before that particular switch.
      Placement open: a header chip on Learn and Review, or on the Profile header
      beside the settings button.

- [ ] **A shareable stats asset — and the stats behind it.** An image a user can
      post to their stories: cards reviewed, new cards added, cards learned. Two
      halves, and the second is the one with a clock on it.
      **What exists already:** `summarizeProgress` gives `totalReviews`,
      `totalNewCards`, `totalPackCards`, `activeDays` and `averagePerActiveDay`
      over a window; `deriveStreak` gives the streak; `buildHeatmap` gives the
      calendar. Two of the three numbers asked for are already there.
      **"Cards learned" does not exist anywhere.** `sm2.ts` stores
      `repetitions`, `interval` and `ease`; nothing derives maturity from them.
      It needs a definition (the Anki convention is `interval >= 21` days) and —
      unlike everything else on the dashboard — it reads from the **card
      documents**, not the daily rollups. Which is the good news: it is
      **retroactive**, needing no write-path change and no waiting.
      ⚠️ **`reviews` counts directions, not cards**, and always has, matching
      `reviewedToday`. A dashboard tile is read in context; an image posted
      publicly saying "1,204 cards reviewed" is simply wrong for a two-direction
      learner. Settle the wording or the arithmetic before the asset is designed.
      ⚠️ **Decide any new counter now, inside this item.** Daily rollups discard
      what they didn't count in advance, and a field added later collects only
      from the day it ships — so anything the asset should be able to show in
      six months has to start being written before the asset is built, not after.
      ⚠️ **History began 2026-08-20 and cannot be backfilled**, so a "total" is
      a total since then, not since the user joined. Label the window, or scope
      the asset to one (last 30 days, this year).
      Also decide whether the asset counts `newCards` alone or `+ packCards` —
      they are counted apart deliberately, and one 474-card pack import dwarfs
      every real study day.
      **Render it server-side.** Mobile cannot rasterize a view without
      `react-native-view-shot`, a native module, which would cost a build. A
      Next route returning a PNG (Next 16 ships `next/og` — no new dependency)
      is one implementation for both platforms: web links it, mobile downloads
      it with `expo-file-system` and hands it to `expo-sharing`, **both already
      in the shipped build** and `expo-sharing` already carrying the CSV export.
      So this stays JS-only on mobile too. Story format is 1080×1920.
      **Privacy, because the output is meant to be posted publicly:** no email,
      no uid, no card content on the image — numbers and the app name. And the
      route must not let anyone render anyone else's stats from a uid in a URL;
      authenticate it, or pass the numbers in rather than looking them up.

## Medium

- [ ] **Backfill `pitchAccent` onto existing Japanese cards, or decide not to.**
      New cards get it on save; the ~existing `cards_japanese` deck keeps
      showing bare furigana until each card is looked up again. Unusually cheap
      to fix — the lookup is a local table, so a backfill is **zero model calls
      and zero cost**, unlike every other enrichment this app has considered.
      Decide first whether it is worth touching production data at all: the
      fallback is silent and correct, and the deck is small. If yes it is a
      one-off script over the collection, matching on `(japanese, furigana)`
      and writing only where the table has an unambiguous answer.

- [ ] **Word of the day returns synonym lists where cards refuse them.** Found
      while verifying Kikuyu, then cross-checked — it is not language-specific:
      `gũcoka` came back as "to return; to do again; to recover", `délai` as
      "deadline, time limit, period", `sedan` as "since, then, ago". `/api/explain`
      forbids exactly this ("Never list synonyms with semicolons or slashes") and
      the two-gloss rule allows a *second* gloss only where one would mislead;
      `word-of-the-day/route.ts:138` just asks for "the best English translation"
      with no such rule, so a saved word-of-the-day card gets a back the lookup
      path would never have produced. The fix is the missing rule, not a new one —
      but decide first whether the ceiling is one gloss or the two the card rule
      already allows.

- [ ] **Word learning surface — meet a word before it's due.** A new card is
      immediately due in *both* directions (`isDue` returns both when neither is
      tracked, `sm2.ts:23`), so a word goes from saved to graded review with no
      first encounter in between. This is the surface for that: see it, hear it,
      use it once, *then* let SM-2 have it.
      Open before building: whether it writes scheduling at all or is purely a
      presentation step. If it writes, it is an `sm2.ts` change.

- [ ] **Watch the kanji deck on the "All" chip.** The kanji pack is the first
      single-glyph pack laid out as a `list`, because its back carries readings
      that do not fit a tile — and `isGridDeck` exempts only *grid* decks from
      the "All" chip on the card list. So an account that enrols the whole deck
      puts 240 kanji cards next to its own words there, which is the swamping the
      exemption exists to prevent. Shipped that way deliberately: the alternative
      was a tile showing a truncated reading, which breaks the pack on the page
      it exists to be read on. **The fix, if it does turn out wrong, is a per-pack
      flag — not a layout change**, since layout is keyed on content shape so a
      future single-character pack inherits the grid without being asked. Needs a
      real account with the deck enrolled before deciding.

- [ ] **Vocabulary packs — iterate beyond v1.** Shipped: TOEIC, kana, TOPIK 고급,
      two military packs, all one pre-authored kind. Authored and awaiting
      approval: Everyday English, English Idioms, Kanji 1–2 (see High).
      *Principles:* audience is not beginners — **one recorded exception, the
      daily-life pack, deliberate and not a precedent**; packs unlock domains,
      never "starter" anything; curated from real sources, not AI-generated; word
      lists need user approval before shipping.
      *Next:* **TOEFL**, now that the Japanese gap is answered by the kanji pack
      (教育漢字 1–2 rather than JLPT — N5 is a subset of it, so an exam-ladder
      pack is a re-sectioning, not a re-authoring). Swedish, French and
      Traditional Chinese still have **no pack at all**.
      A new pack needs backs drafted alongside its word list; drafts live in
      `docs/packs/`. Section themes as `/cards` filters are a third rung on the
      deck axis that already shipped, not a new control.

- [ ] **Shared term cache** — a `terms` collection keyed by normalized term +
      language, so a word looked up once is free for everyone after.
      `docs/local-model.md` §8 names it the cheapest useful first step, ahead of
      any model work: it buys instant lookups, an offline story and near-zero
      marginal cost with **no build, no native module and no quality risk**, and
      unlike on-device it works on web too. Copies `/api/pronounce`'s
      content-hash pattern **including its lesson that a bad generation becomes
      permanent** — decide the invalidation story before writing the first
      document.

- [ ] **Precompute depth and examples for the packs** — ~600 model calls, an
      afternoon, one throwaway script. Best done *after* the term cache, which is
      where the results would live.

- [ ] **`/api/explain` has no `try`/`catch`**, so an outage or a malformed
      response is a 500 rather than a handled error.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's blocked.

## Bigger bets

- [ ] **Should `/api/explain` allow two glosses?** It still says "single best
      translation" across six prompt branches (12 templates), while a card back is
      allowed up to two when one would mislead. Changing the core lookup loop has
      a bigger blast radius than a new surface, so decide deliberately — and if
      yes, all branches move together.

## Parked

- [ ] **Goal-based generation** — vocab lists and card generation from a goal.
      Deprioritized 2026-07-24: it generates word lists for a user who hasn't
      asked for a specific word, a different and unproven job from the core loop.
      `/api/vocab-list` exists and takes `previousWords` + `feedback`.

## Housekeeping — tooling that hides signal

`npm test` (252/252, measured 2026-08-22) and `npx eslint .` (0 errors) are
green. What's left is what those two now *show*.

- [ ] **The Google consent screen says "Amgi AI".** Rename it to **Amgi** in the
      Google Cloud OAuth consent screen → Branding → App name. Console-side, no
      build, no code — but it is shown to **every** user signing in, on iOS and
      web as much as Android.

- [ ] **Two callerless functions in `apps/web/src/services/firestore.ts`** —
      `countUserFlashcards` and `fetchArchivedFlashcards`, neither imported
      anywhere. Unlike `writing.ts`/`grammar.ts` these have **no build to keep
      alive**: they are web-only, so nothing pins them. Left in place while the
      subscribe change was landing to keep that diff to one subject.
- [ ] **20 lint warnings.** 13 React Compiler
      (`react-hooks/set-state-in-effect` ×11, `react-hooks/immutability` ×2) and
      they're real: a `useEffect` calling `setState` synchronously renders twice
      on mount. Most want `useSyncExternalStore`, so each is a small design call,
      not a mechanical edit. Set to `warn` so landing the lint fix didn't mean
      landing 13 rushed ones — clear them, then delete the override, and
      **don't silence them further**. The other five: two dead bindings in
      `decks/[packId]/{page,drill/page}.tsx`, two `<img>` that should be
      `next/image` (`Header`, `SideNav`), one missing dep in `cards/page.tsx`.
- [ ] **Lint covers `apps/web` only** — core and mobile have no `lint` script, so
      `turbo lint` runs one package and reports success. Honest today, misleading
      the moment it gates CI. Mobile needs `eslint-config-expo`, core a small flat
      config. Do it with the CI gate, not before.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.
