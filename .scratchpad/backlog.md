# Backlog

Open work only, ordered by priority. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to Decisions in [status.md](status.md) **with its reasoning**, so a closed call
doesn't get reopened from here. Priority mirrors the user's Google Tasks list;
this is the scoped version of it.

**Mobile ships by build — no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release; once one native module is in a
build, a second rides along free. **Android auth work is the exception**: it
cannot run in Expo Go, so it needs a development build — and Android release
builds face no review, so a fix there costs ~20 minutes rather than an App
Review cycle. The procedure for cutting one is at the end of this file; what is
queued, released or unverified is under Builds in [status.md](status.md).

---

## High

_One of the three Progress items scoped 2026-09-15 is left. The other two — the
per-language detail view and both charts — are built on
`feat/progress-language-detail`, which is what unblocks this one. The three
calls the user made on them, and the boundary finding that came out of building
them, are in the Decisions entry of that date in [status.md](status.md)._

- [ ] **Share a chart as an asset.** The chart it depends on now exists:
      `buildCardsAddedSeries` and `buildLearnedSeries` are in core, per-language,
      and both platforms draw them. The
      shipped share pipeline answers most of this, and its two hard constraints
      decide the rest.
      **Two things changed under this item on 2026-09-15.** Cards added is no
      longer stacked but **filtered** by source, so a shared chart has to decide
      whether the filter travels — it is one more query parameter, and the
      backward-compatibility rule below covers it. And the charts now **follow
      the range, bucketed by week past 30 days** (`chartBucketDays`), so the
      asset's series is not necessarily one value per day: the route must be
      told the grain or be handed the buckets, not infer either.
      ⚠️ **It must be server-rendered by `/api/stats-image`.** Mobile cannot
      rasterize a view without `react-native-view-shot` — a native module that
      costs an EAS build *and* stops the feature working in Expo Go. That is why
      one route draws every variant and both platforms only ever fetch a URL.
      ⚠️ **The series travels in the query string**, because the route takes no
      uid and never touches Firestore — the privacy design, not an optimisation: a
      route that resolved a uid would let anyone render anyone's stats. `h` is the
      precedent (one character per day, 364 for a year) but it sends *levels* 0–4
      precisely so the route need not know the window's busiest day. A labelled
      axis needs real counts, so this wants its own parameter and the route
      calling `niceCeiling` itself — it is in core, so the asset gets the same
      scale the app drew.
      **A new variant is backward compatible by construction.** `ShareVariant` is
      `'window' | 'today'` and the parser reads anything unrecognised as
      `'window'`, so every URL an installed build produces keeps rendering what it
      always did. The rule that no parameter may ever become a parse failure
      applies to the new one too. `buildShareCards` then offers the card and
      `hasShareableHistory` gates it, per card.
      ⚠️ **Satori is flexbox-only, and the line mark may not survive it.** Bars are
      divs with heights; the line is SVG on both platforms, which `next/og` does
      not draw the way either of them does. **Check this before promising both
      marks** — bars-only on the shared asset is a fine answer, silently dropping
      the line is not.
      ⚠️ **A per-language chart re-opens a rule `shareStats.ts` closed.** It sends
      language *names only*, never a per-language split of the numbers, because
      `byLanguage.reviews` reaches back to the start while `cardsMatured` only
      reaches 2026-09-06 — so a per-language figure breaks the one-window rule
      over any window worth posting. A **cards-added** chart is exempt (full
      per-language history since 2026-08-20); a **learned** chart is not, and must
      be withheld over a window reaching past that date exactly as `cardsMatured`
      already is.

## Medium

- [ ] **French A1 grammar — one concept, end to end.** Scoped 2026-09-14. Read the
      Decisions entry in [status.md](status.md) first: it carries the scope line,
      the three constraints the user set, and everything this rules out.
      **Not High, deliberately** — nobody is blocked and the user is explicitly not
      its user, so it earns a slot by being cheap to be wrong about.
      **The structure, which is the whole insight: a grammar point is a *subpack*,
      and its practice items are the *entries*.** One pack per level
      (`French Grammar A1`), one subpack per concept (`le présent des verbes en
      -er`, `la négation ne…pas`), and each entry is one authored cloze. That maps
      onto shipped machinery end to end — enrol, collection, review picker,
      progress — with **no nesting change**, since packs are exactly one subpack
      deep and level → concept → item is exactly two. Its own row in the review
      picker; zero model calls, graded locally by `typedAnswer.ts`.
      ⚠️ **Two distinctions the Decisions entry turns on — don't lose them by
      paraphrase**: why this doesn't contradict "a grammar point is not a card",
      and why `ReviewCollection.kind` does not come back (a grammar pack carries a
      pack-shaped id, so `collectionKey = id ?? ''` still resolves).
      ⚠️ **Ship one concept before authoring a level.** ~30–60 concepts × ~6 items
      is 200–350 sourced entries — the size of the 급수 pack, i.e. the largest
      content job this repo has done. One subpack proves the shape for ~20.
      ⚠️ **Sourcing is the gate, and CEFR does not publish a grammar syllabus** —
      it is a can-do scale. What exists is per-language: for French, the Council of
      Europe / Didier *niveau A1 pour le français* référentiel. **Verify that
      before relying on it** — `docs/packs/README.md` governs this and its rule is
      that the model is not a source. A référentiel that turns out not to be
      citable changes the level ladder, not just a footnote.
      **Open, not decided:** whether a grammar item is literally a `Flashcard` in
      its own collection with only `frontToBack` populated (cheapest — reuses SM-2,
      the queue, offline review and the rollups untouched) or a second source
      `buildReviewCollections` has to learn about. The first is recommended and
      unproven.

- [ ] **Writing returns as the diagnostic — third, after the ladder exists.**
      Scoped 2026-09-14; the reasoning, the revision it makes to an earlier call,
      and what stays dead are in the Decisions entry in [status.md](status.md).
      ⚠️ **Do not start this before the item above.** A finding needs an authored
      concept to point at; without the ladder it has to invent one, which is
      exactly what failed. The ordering is also the **gate**: writing comes back
      only if the ladder gets used.
      **The job is routing, not practice** — a finding classifies into the closed
      set of authored concepts and enrols that subpack. Most of it is already built
      and deployed (`/api/writing`, `parseWritingReview`, the four `FindingKind`s,
      `WritingCardCandidate.gap`, `buildWritingCardDraft`); what is new is the
      classifier and the counts.
      **The gap card is the cheapest win** and can ship with this or ahead of it.

      **Placement — one input, no toggle.** The Word/Passage toggle is what was
      disliked, not Learn itself: it forced a mode choice up front on a surface
      whose job is one box. ⚠️ **An offer, not a route** — a phrase lookup is
      legitimate (the idioms pack), so the input must never be silently
      reinterpreted. Same shape as the spellcheck override, "a request, not a
      filter".

      **The input, designed 2026-09-14.** No value on its own — it ships with this
      item, not before it, or it is a button with nothing behind it. The offer
      appears **before** submission, not beside the explanation after it: a
      paragraph sent to `/api/explain` spends a model call and renders a nonsense
      result, and both are avoidable by asking first.

      **An auto-growing field, and the growth is also the signal.** Starts at
      exactly today's height, grows a line at a time as it wraps, caps ~8 lines
      then scrolls internally. **One line → only `Learn`, nothing about today
      changes. Two lines → the writing action appears.** The affordance arrives at
      the moment the box visibly becomes a writing surface, so it needs no
      explaining copy. The existing button never moves; the new action sits under
      the field.
      ⚠️ **Wrapping, never a character count.** Ten study languages with different
      density — 15 Korean characters is a sentence, 15 French characters is most of
      `anniversaire`. A threshold means a `writingThreshold` in
      `STUDY_LANGUAGE_CONFIGS`, i.e. the per-language conditional that registry
      exists to prevent. Wrapping is measured in rendered space and is
      script-neutral for free. **Bias it generous** — a spurious button is ignored,
      a missing one means nobody finds the feature.

      ⚠️ **Mobile: it must grow *downward*, and this is load-bearing.**
      `app/(tabs)/index.tsx:535` holds the keyboard's space open so the field never
      lifts on focus — "a search bar that jumps as you tap it is the thing being
      fixed here". Growth does not violate that (motion the user's own keystrokes
      caused is legible where an unearned jump is not), **but only downward**, into
      the `keyboardReserve` band, covering the word of the day the way the keyboard
      already does. Upward growth pushes the tagline and reinstates exactly the
      feeling that comment exists to prevent.
      **`searchRow` needs `alignItems: 'flex-end'`** — it sets none today, so it
      defaults to `stretch`, which is invisible at one line and a slab of highlight
      colour at eight. Bottom-pinned keeps the button under the thumb.
      **It lands twice**: the empty state (`:519`) and the results state (`:603`)
      render the row separately. They already share `s.searchInput` — extract the
      field rather than editing both.

      **Enter.** Free today on both platforms (native form on web,
      `returnKeyType="search"` + `onSubmitEditing` on mobile), and a multiline field
      takes that away. Web: Enter still submits, Shift+Enter newlines. Mobile: once
      multiline the return key newlines and submission moves to the button — same
      line-count signal. ⚠️ **Losing a passage to a stray Return is unrecoverable**;
      nobody retypes it.

      ⚠️ **Copy decides whether anyone finds this.** All three strings say *term* —
      `inputPlaceholder` ("Enter a term..." / "단어를 입력하세요..."), `tagline`
      ("Look up any word or phrase."). That actively says *not* to paste a sentence,
      so the feature stays invisible however good the box is. The placeholder must
      still be honest for the one-word case, which stays almost all use. Korean
      natural, not a literal render of the English.
      **Counter only near the 1000-char ceiling**, never on a one-word lookup.

      **Rejected: an "expand" icon opening a writing composer** — the Word/Passage
      toggle again with a smaller target, mode choice back up front.
      **Scope:** field type + a growth handler + one alignment prop + a conditional
      button + three strings. No redesign.

- [ ] **Per-context pronunciation speed** — the last of the mobile UI redesign
      queued 2026-09-01, moved here 2026-09-12 on the user's call. Nothing about
      it was decided; it is the axis question below that keeps it unscoped.
      One setting drives every play button today, and the comment above the
      speed selector in `app/settings.tsx` says why: term, translation and
      example all render the same `PronounceButton`, so a second setting had
      nothing to name. The ask names two things it could split on — **content**
      (term vs example sentence) and **surface** (browsing vs learn/review).
      ⚠️ **Pick one axis.** Both is a 2×2 — four controls for something a user
      sets once and forgets.
      Mechanically cheap: rate is applied at playback (`setPlaybackRate` native,
      `playbackRate` web), so **no re-synthesis and no cache churn**. The work is
      a `kind` prop at the call sites — example sentences are the ones passing
      `sides.study` (grep it: `index.tsx`, `review.tsx`, `CardDetailModal.tsx`),
      everything else is the term — plus a second AsyncStorage key, with the
      existing `amgi_pronunciation_speed` read as the default for both so nobody's
      setting resets.
      Web has the same button and the same context, so this lands on both. And
      `settingsPronunciationSpeedDesc` ("applies to terms, translations, and
      example sentences", both locales) becomes false the moment it ships.

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

- [ ] **`/api/explain` has no `try`/`catch`**, so an outage or a malformed
      response is a 500 rather than a handled error.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's blocked.

- [ ] **The sidebar's bottom button should open a menu, not the whole settings
      panel** — queued 2026-09-09.
      Today it toggles `SettingsMenu` inline in a 16rem popover, and that
      component *is* the settings screen: study language, native language,
      theme, pronunciation speed, the hanja partition, sign out and delete
      account, all stacked in one column. The wanted shape is Claude's account
      menu — the button opens a short list of **rows** (Settings · Language ·
      Sign out, with the account email at the top), and Settings opens a real
      settings surface from there.
      ⚠️ **This is not only a menu; web has no settings *page*.** Mobile does
      (`apps/mobile/app/settings.tsx`), and web's settings exist only inside
      that popover — so the Settings row needs somewhere to go. Deciding
      between a `/settings` route and a modal is the real content of this item:
      a route is the same surface mobile already has and is linkable, a modal
      keeps the user where they were. Don't pick it here.
      **It supersedes a stopgap.** Both popovers were given a viewport max
      height and scroll on 2026-09-09, after the hanja partition section pushed
      the panel off screen — the sidebar one grows *upward* from `bottom-4`, so
      it ran off the top. A four-row menu cannot overflow by construction, and
      the scroll bound stops being load-bearing.
      **Two entry points, one treatment.** `Header.tsx` renders the same
      `SettingsMenu` in a dropdown on narrow screens. `StudyLanguageList` is
      already extracted from it for exactly this kind of reuse; follow that
      rather than forking the panel per entry point.
      Convention to follow, from the user 2026-09-09: an image of Claude's
      account menu — rows with leading icons, thin separators grouping them,
      the destructive action last and alone.

## Bigger bets

_Empty as of 2026-09-08 — the gloss ceiling was the only item here, and it
closed (Decisions in [status.md](status.md))._

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

- [ ] **Delete `packages/core/src/grammar.ts` and its API route.** ⚠️ **Split
      2026-09-14 — `writing.ts` is no longer part of this.** The grammar plan above
      brings writing back as the diagnostic, and it wants `parseWritingReview`, the
      finding types, `WritingCardCandidate.gap` and `buildWritingCardDraft` — all
      still correct, plus `/api/writing` itself, unchanged. **Keep `writing.ts` and
      its route.** `grammar.ts` is the opposite case: `getPatternExercise` and
      `gradeFromReview` are the generation and model-grading the new design
      explicitly rejects, so nothing will want them back.
      **The gate is open**: it was "once no build predating the 2026-08-18 grammar
      removal is still in use". What is left is not a condition but a fact to
      check — that testers have actually updated, since an un-updated 1.3.0 device
      still has the UI compiled in and calls the route. Two releases now sit
      between them and it, which makes this cheaper to believe than it was, but it
      is still console state rather than a repo fact. The file carries a
      `DO NOT DELETE AS DEAD CODE` header; the reasoning is in
      [status.md](status.md). **`typedAnswer.ts` is not part of this** —
      `grammar.ts` imports its folding rules rather than owning them, so the
      deletion takes the importer and leaves the module.

- [ ] **Two callerless functions in `apps/web/src/services/firestore.ts`** —
      `countUserFlashcards` and `fetchArchivedFlashcards`, neither imported
      anywhere. Unlike `grammar.ts` these have **no build to keep alive**: they are
      web-only, so nothing pins them. Left in place while the subscribe change was
      landing to keep that diff to one subject.

- [ ] **The mobile screen gutter is 20, hardcoded in four stylesheets.** Cards
      sat at 16 until 2026-09-04, so tabbing to it shifted every left edge by
      four pixels; that is fixed, but by editing six numbers rather than by
      sharing one. ⚠️ **A shared constant needs a decision first**, which is why
      it wasn't taken then: `review.tsx` is **not uniformly 20** — `ratingRow`
      is 16 where `reviewScroll` is 20, so the rating buttons sit four pixels
      wider than the card above them. Either that is deliberate (a wider tap
      target on the row you hit most) or it is the same bug Cards had. Settle
      that, then a constant can cover all four screens; skipping review would
      leave the thing a constant exists to prevent.

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
      _Concrete cost, found by hand 2026-09-04:_ `app/settings.tsx` imports
      `cancelAllReminders` and never calls it. `tsc` doesn't flag an unused
      import and nothing else looks, so mobile accumulates exactly the class of
      dead code web's lint catches on the next commit.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.

---

## Cutting a build

Reference, not open work — what you need at the moment you cut one. Scope set
2026-09-04 (Decisions in [status.md](status.md)): the pre-flight order, the What
to Test rule, and the `--non-interactive` warning. What a build *carries* is
derivable from its commit; what is queued, released or never verified on a
binary is under Builds in [status.md](status.md).

**Pre-flight**, in order. Steps 2–6 were all exercised cutting 1.6.0 and again
cutting 1.7.0; step 1 was half done for the first time on 1.7.0:

1. Smoke-test in Expo Go, then verify the native-adjacent paths on the build
   itself — Expo Go runs the SDK's own bundled native modules, so a clean pass
   there says nothing about audio, notifications, sharing, the file system or
   the auth redirect. **The Expo Go half happened for the first time on 1.7.0**
   (2026-09-19, by the user, before the builds were started). ⚠️ **The half that
   matters more has still never happened on any build**: nothing in that list has
   been exercised on a binary. The list of what it covers, and why working down
   it is not tracked as a task, is in the never-verified ⚠️ under Builds in
   [status.md](status.md).
2. Bump `version` in `app.json` **before** starting the build. EAS
   auto-increments the *build* number and never the version, so nothing catches
   this for you.
3. `expo config --type introspect` if any native module or `app.json` native
   config changed — this is where an unasked-for entitlement shows up before a
   cloud build finds it. 1.6.0's came back `entitlements: {}`, which is what
   `withoutPushEntitlement` is there to produce, and 1.7.0's — the
   `react-native-svg` build — came back the same (Builds in
   [status.md](status.md)).
4. Rewrite What to Test in `docs/testflight-beta-info.md` and **re-check the
   rest of the file** — the description and the Apple review notes go stale too.
   1.4.0 shipped with both describing features removed in August; 1.6.0 caught
   review notes that still routed the reviewer to a Settings tab the redesign
   had removed, which is a 5.1.1(v) problem because account deletion lives
   behind it.
5. **Diff the listing copy's character set against the version Apple last
   accepted** before pasting — not read it, diff it. That is what catches a
   non-BMP character, and blank error bullets are all App Store Connect will
   tell you. See [lessons.md](lessons.md).
6. Submit (`ascAppId` is in `eas.json`), then paste the copy into Test
   Information in **both ko and en**.

⚠️ **What to Test is a skimmable list of what's new and nothing else** (set
2026-09-02, on the user's call). No "use it for a few days" opener, no roll-call
of what hasn't been verified, one short clause per bullet — the 1.4.0 form was
long enough that a tester would bounce off it. A caveat about *shipped content*
still earns its clause; a request to go and test something does not.

⚠️ **Cut the build without `--non-interactive`.** It does not skip prompts, it
turns one into an error — 1.4.0 died on an unanswerable Apple Team ID question
and burned build 12. The flag is for CI.

_A version bump queues another Beta App Review; an external approval covers the
version it was granted for and nothing later. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._
