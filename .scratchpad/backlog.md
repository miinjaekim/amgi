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

## Cutting a build

**Nothing is queued.** 1.5.0 (build 14) carries everything merged since build 13
and was **approved for external testing 2026-09-02**, so mobile merges are
unblocked and the next build is whatever the next batch turns out to be.

⚠️ **Checking a build is no longer tracked here** (2026-09-04). The ranked list
of what 1.5.0 had never been exercised on — the Slow speed, offline review,
typed responses under an IME, the badge at the narrowest phone width, the native
paths, the renders never seen on a device — came off this file: all of it is
reached by using the app, so it surfaces in use rather than in a sitting spent
working down a list. What is durable about it stayed elsewhere: the
never-verified-on-a-binary caveat under Builds in [status.md](status.md), and
the Slow speed's fallback in that file's Decisions entry, which is the one item
that had a decision hanging on it. Reasoning in Decisions there too.

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

⚠️ **What to Test is a skimmable list of what's new and nothing else** (set
2026-09-02, on the user's call). No "use it for a few days" opener, no roll-call
of what hasn't been verified, one short clause per bullet — the 1.4.0 form was
long enough that a tester would bounce off it. A caveat about *shipped content*
still earns its clause (the Kikuyu list has had no speaker check); a request to
go and test something does not.

⚠️ **Cut the build without `--non-interactive`.** It does not skip prompts, it
turns one into an error — 1.4.0 died on an unanswerable Apple Team ID question
and burned build 12. The flag is for CI.

_A version bump queues another Beta App Review; 1.5.0's external approval covers
1.5.0 only. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._

⚠️ **The next build is the first on Expo SDK 57** (upgraded from 54 on
2026-09-04, because Expo Go auto-updated and stopped opening the project).
Every native module moved with it, so `expo config --type introspect` is not
optional on this one, and the native-adjacent paths — audio, notifications,
sharing, file system, auth redirect — are worth exercising on the build rather
than trusting the Expo Go pass. Upgrade notes in [lessons.md](lessons.md)._

## High

Queued 2026-08-31, in the user's order. **Both pack items and the speed dial
have left this section** — Spanish and Kikuyu are built, and the pronunciation
speed dial shipped 2026-09-01 in build 14. The two pronunciation items that
used to sit here were **cancelled** — reasoning in the Decisions entry in
[status.md](status.md), and the Kikuyu one's durable half moved to
[lessons.md](lessons.md) rather than closing with the item.

### What is left of the mobile UI redesign — queued 2026-09-01

Four of the six items shipped 2026-09-04: the tab rearrange, the Progress tab,
the settings redesign and the quick study-language switcher. They moved pieces
of the same screen and were built together for that reason. **Two remain**, and
neither depends on the other or on anything above.

⚠️ **The per-language write-path decision was taken with them** and is not
reopenable cheaply — verdict counts now live inside `byLanguage`, so retention
per language is derivable from 2026-09-04 onward and from no earlier date.
Reasoning in the Decisions entry in [status.md](status.md); the shape is in
[data-model.md](data-model.md).

- [ ] **Per-context pronunciation speed.** One setting drives every play button
      today, and the comment at `app/settings.tsx:248` says why: term,
      translation and example all render the same `PronounceButton`, so a second
      setting had nothing to name. The ask names two things it could split on —
      **content** (term vs example sentence) and **surface** (browsing vs
      learn/review).
      ⚠️ **Pick one axis.** Both is a 2×2 — four controls for something a user
      sets once and forgets.
      Mechanically cheap: rate is applied at playback (`setPlaybackRate` native,
      `playbackRate` web), so **no re-synthesis and no cache churn**. The work is
      a `kind` prop at the call sites — example sentences are the `sides.study`
      ones (`index.tsx:763`, `review.tsx:1318`, `CardDetailModal.tsx:303`),
      everything else is the term — plus a second AsyncStorage key, with the
      existing `amgi_pronunciation_speed` read as the default for both so nobody's
      setting resets.
      Web has the same button and the same context, so this lands on both. And
      `settingsPronunciationSpeedDesc` ("applies to terms, translations, and
      example sentences", `i18n.ts:169`/`:531`) becomes false the moment it ships.

- [ ] **A shareable stats asset — and the stats behind it.** An image a user can
      post to their stories: cards reviewed, new cards added, cards learned. Two
      halves, and the second is the one with a clock on it.
      **The Progress tab now answers the presentation half** — per-language
      bars, retention, a labelled window — so what is left here is genuinely the
      numbers and the render, not the design.
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

- [ ] **A speaker has still not read the Kikuyu Basics list.** Shipped that way
      knowingly, with a source tier on every entry (16 corroborated twice, 36 on
      one source, 7 derived) — and unlike the build checks, this one does not
      happen by using the app. The verb section is where a check is worth the
      most, since seven of ten are Dahl's Law applied to sourced stems rather
      than attested infinitives. The `guka`/`wagui` conflict and whether kinship
      is inherently possessed are open in
      `docs/packs/kikuyu-basics-pack-draft.md`; the wider known-unchecked list is
      in [lessons.md](lessons.md).

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

`npm test` (407/407, measured 2026-09-04) and `npx eslint .` (0 errors) are
green. What's left is what those two now *show*.

- [ ] **The Google consent screen says "Amgi AI".** Rename it to **Amgi** in the
      Google Cloud OAuth consent screen → Branding → App name. Console-side, no
      build, no code — but it is shown to **every** user signing in, on iOS and
      web as much as Android.

- [ ] **Delete `packages/core/src/writing.ts`, `grammar.ts` and the two API
      routes that keep them alive.** **The gate is open**: it was "once no build
      predating the 2026-08-18 grammar removal is still in use". What is left is
      not a condition but a fact to check — that testers have actually updated,
      since an un-updated 1.3.0 device still has the UI compiled in and calls
      those routes. Two releases now sit between them and it, which makes this
      cheaper to believe than it was, but it is still console state rather than a
      repo fact. Both files carry a `DO NOT DELETE AS DEAD CODE` header; the
      reasoning is in [status.md](status.md). **`typedAnswer.ts` is not part of
      this** — `grammar.ts` imports its folding rules rather than owning them
      now, so the deletion takes the importer and leaves the module.

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
