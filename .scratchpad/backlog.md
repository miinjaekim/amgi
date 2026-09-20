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

_All of High is **Munli**, the grammar mode, as of 2026-09-21. It reverses the
"no mode" half of the 2026-09-14 decision — read that Decisions entry in
[status.md](status.md) **and** the 2026-09-21 entry that reverses it before
starting, because everything the older one argues about grammar *content* still
stands and only its placement changed._

**The three items are ordered, and the order is the risk control.** The shell
learns about modes → Munli's own shape is decided → one concept is authored end
to end. Writing-as-diagnostic stays fourth and stays in Medium; it is still
gated on the first three being used.

- [ ] **Mode switching — the shell learns there is more than one mode.**
      Scoped 2026-09-21. This is the whole first build, and **no grammar content
      is part of it**: Munli's tab set may land as empty screens. What this item
      delivers is that a second mode exists, is reachable, and survives a cold
      open.

      **The design call that makes it cheap: a mode is a *location*, not a
      setting.** Web has no other option — a mode not in the URL is not linkable
      — and taking the same shape on native means "which mode am I in" is always
      answered by the current route, never by state two surfaces could disagree
      about. Native: a second Expo Router group (`app/(munli)/_layout.tsx` beside
      `app/(tabs)/`), its own `Tabs`, its own
      `unstable_settings.initialRouteName`. Web: a `/munli` route prefix with its
      own nav item list, since `nav-items.tsx` already centralises that list for
      both the sidebar and the mobile header.
      ⚠️ **This is what spares web the flash.** The pre-paint inline script in
      `apps/web/src/app/layout.tsx` exists because theme and sidebar-collapse are
      stored client-side and would otherwise paint wrong for a frame. A *stored*
      mode would join them and paint the **wrong navigation**, which is far more
      visible than a wrong colour. A route prefix is known to the server, so
      there is nothing to pre-paint.

      **Storage then has exactly one job: which mode a cold open lands in.** One
      key per platform (`amgi_mode` in AsyncStorage, `amgi-mode` in
      localStorage), written on switch, read only at the root.
      ⚠️ **On web that means `/` and only `/`** — every other path already says
      which mode it is. Redirect `/` to the stored mode's home; never rewrite a
      path the user typed or followed.

      **The gesture.** `FloatingTabBar.tsx` maps `state.routes` to
      `TouchableOpacity`, which takes `onLongPress` directly — so the mobile half
      is one prop on the last tab plus the sheet it opens. Tap still goes to
      Progress; only the hold switches.
      ⚠️ **Haptics would be the natural confirmation, and `expo-haptics` is not a
      dependency.** It is bundled in Expo Go, so it would work while developing
      and then need the next production build to reach anyone — no OTA. Fine to
      add, **but the affordance must not depend on it**: the sheet appearing is
      the confirmation; the buzz is a bonus.

      **A hold is invisible, so it cannot be the only door** — the user's own
      note when choosing it. Two more, neither of them a coach mark:
      1. **A row in the account menu, on both platforms.** The sidebar item in
         Medium is already rebuilding that popover as a list of rows; a
         *Switch mode ›* row costs almost nothing if the two land together, and
         it is the door found by looking rather than by knowing.
      2. **The destination announces itself.** Munli's tab set is visibly not
         Amgi's, so nobody is ever unsure *which* mode they are in — the
         discoverability problem is only ever entering, never being lost.
      ⚠️ **Resist a first-run tour.** One feature does not earn a coach-mark
      system, and first run is already spoken for by language setup.

      **What is shared and what is not — settling this is the item's real
      content.** Shared: the account, the study language, the interface language,
      the theme, the streak. Not shared: the review queue, the collections, the
      progress rollups.
      ⚠️ **"Grammar review is never pooled with vocabulary review" governs the
      queue, not the chrome.** Constraint #1 of 2026-09-14 is about
      `collections.ts` refusing an everything-collection; it says nothing about
      identity. Two streaks would be two habits to break, which is the opposite
      of what a streak is for.
      **Open, and worth deciding deliberately rather than by default: does Munli
      practice feed the Amgi streak?** Recommended yes — one app, one habit — but
      it means a day of clozes keeps a streak alive with nothing reviewed, and
      whether that is a feature or a loophole is a judgement, not a derivation.

      **Munli appears unconditionally**, even for a study language with no
      grammar content — the rule the Packs tab already set ("a tab that appears
      and disappears would reflow the bar on every study-language switch"). An
      empty state is cheaper than a switcher whose contents move under you.

      ⚠️ **Naming.** Munli is a **mode inside Amgi**, not a second product: the
      store listing, the bundle id and the consent screen stay Amgi (see the
      consent-screen item under Housekeeping, which is about exactly that name).
      **The Korean rendering is open** — whether a Korean interface says Munli,
      문리, or something else is a copy decision, and Korean copy is held to
      sounding native rather than transliterated.

      **Scope:** one route group per platform, one storage key per platform, one
      `onLongPress`, one switcher sheet, one account-menu row, and the strings.
      No grammar.

- [ ] **What Munli actually is — decided before anything is authored.** Scoped
      2026-09-21, from a clean sheet on the user's ask.
      ⚠️ **Clean sheet means the *surface* is redrawn, not that the arguments are
      discarded.** `vision.md`'s grammar sections and `docs/grammar-research.md`
      are the inheritance and are not up for re-litigation: grammar is a function,
      not a lookup row; practice runs controlled → meaningful → free; cloze is
      cued recall and is **not** multiple choice; no multiple choice, ever; the
      way out of an empty box is a hint that costs; name a form rule, hide a
      choice pattern. What a mode changes is that none of this has to fit inside
      a pack browser any more.

      **The unit is a *concept*, and it owns three things** — which is the whole
      difference from a pack entry. An **explanation** (the function, in prose:
      what a grammar learner actually came for, and a pack entry has nowhere to
      put it). A set of **authored items** (clozes, single direction, graded
      locally by `typedAnswer.ts`, zero model calls). And a **rung** — cloze or
      free production — which SM-2 already derives from consecutive successes and
      demotes on a lapse for free, so it is computed, never stored.

      **A starting sketch, not a decision — four tabs: Practice · Concepts · Ask
      · Progress.**
      - **Practice first**, for the reason Review is first in Amgi: the first tab
        is the app's answer to "what is this for" on every cold open.
      - **Concepts** is the ladder — level → concept, enrollable, the thing you
        browse. The 급수 ladder is the shape that transfers.
      - **Ask** is the genuinely open one. A grammar question is the most natural
        thing to want in a grammar mode, and nothing answers it today.
        ⚠️ **If it ships, it calls `/api/explain`** — a new surface reuses the
        existing route rather than growing a parallel prompt. That route is
        word-shaped, so the honest options are "extend it" or "not yet", never "a
        second prompt doing the same job". **Not yet is a fine v1** and keeps the
        mode to three tabs.
      - **Progress** is per-concept mastery. Derived, not stored.

      **Open, carried forward unresolved from the item it replaces:** whether a
      Munli item is literally a `Flashcard` with only `frontToBack` populated in
      its own collection, or a second source `buildReviewCollections` has to
      learn about. Reuse is still the recommendation and still unproven — SM-2,
      the offline queue and the rollups all come free. A separate mode weakens
      the *presentational* reason to reuse and leaves the mechanical one
      untouched.

      ⚠️ **Do not oversell it, unchanged from 2026-09-14.** Authored cloze is
      Paulston's controlled rung, and controlled practice alone does not build
      form–meaning mapping; Bunpro is the shipped cautionary case. A mode does
      not fix that — it is the same ceiling with better navigation.

- [ ] **French A1 — one concept, end to end, inside Munli.** Scoped 2026-09-14,
      **folded into Munli 2026-09-21** on the user's call; it was Medium, and its
      structure survives the move intact. Read the 2026-09-14 Decisions entry in
      [status.md](status.md) for the scope line and the three constraints.
      **What changes:** a level is no longer a `VocabPack` and a concept is no
      longer a subpack — they are Munli's own nouns, browsed on Concepts.
      **What does not:** one level per rung, one concept per grammar point, each
      item an authored cloze, graded locally, zero model calls, never pooled with
      vocabulary review.
      ⚠️ **The nesting argument was the old shape's cheapness, not a truth about
      grammar.** "Packs are exactly one subpack deep and level → concept → item
      is exactly two" was why it fit inside the pack browser. In a mode nothing
      is constrained to two levels, so **don't grow a third just because it is
      now possible**.
      ⚠️ **Ship one concept before authoring a level.** ~30–60 concepts × ~6 items
      is 200–350 sourced entries — the largest content job this repo has done.
      One concept proves the shape for ~6.
      ⚠️ **Sourcing is still the gate, and CEFR does not publish a grammar
      syllabus** — it is a can-do scale. For French the candidate is the Council
      of Europe / Didier *niveau A1 pour le français* référentiel. **Verify it is
      citable before relying on it**; `docs/packs/README.md` governs this and its
      rule is that the model is not a source. A référentiel that turns out not to
      be citable changes the ladder, not just a footnote.
      **The user is explicitly not its user**, which is why it earns its slot by
      being cheap to be wrong about rather than by being wanted.

_**Other modes are a sidenote, not a plan.** Speaking is the obvious third —
Hwasul was the separate-app version of it — and the only thing that follows for
the work above is: **don't hard-code two.** The switcher is a list of modes, the
route group is one of several, and the storage key holds a mode id rather than a
boolean. No speaking work is scoped, and adding modes is not a goal; the bar for
a third is the bar that got Munli its second. See the modes note in
[vision.md](vision.md)._

## Medium

_One of the three Progress items scoped 2026-09-15 is left. The other two —
the per-language detail view and both charts — are built on
`feat/progress-language-detail`, which is what unblocks this one. The three
calls the user made on them, and the boundary finding that came out of building
them, are in the Decisions entry of that date in [status.md](status.md).
Moved High → Medium 2026-09-21, on the user's call, when Munli took High._

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

- [ ] **Writing returns as the diagnostic — last, after the ladder exists.**
      Scoped 2026-09-14; the reasoning, the revision it makes to an earlier call,
      and what stays dead are in the Decisions entry in [status.md](status.md).
      ⚠️ **Do not start this before the three Munli items in High.** A finding
      needs an authored concept to point at; without the ladder it has to invent
      one, which is exactly what failed. The ordering is also the **gate**:
      writing comes back only if the ladder gets used.
      ⚠️ **Its home reopened on 2026-09-21 and is not decided here.** Everything
      below places the input on Amgi's Learn tab, which was right when grammar was
      a pack in the same mode. With Munli it could equally be Munli's own surface
      — the argument for Learn is that writing happens where you already are and
      a diagnostic nobody visits diagnoses nothing; the argument against is that
      its *output* is entirely Munli's. **Decide it with Munli's shape**, not by
      inheriting the paragraphs below.
      **The job is routing, not practice** — a finding classifies into the closed
      set of authored concepts and enrols that concept. Most of it is already built
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
      **It gained a second reason on 2026-09-21.** The mode switcher in High
      wants a *Switch mode ›* row as its discoverable door, and a row menu is
      where that row goes — a hold on a tab is not something a user finds by
      looking. Neither item blocks the other, but landing them together is one
      menu built once instead of a menu and then a menu edit.

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
