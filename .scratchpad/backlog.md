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

_All of High is **Munli**, the grammar mode, as of 2026-09-21. Two Decisions
entries of that date in [status.md](status.md) govern it: one makes grammar a
mode, the other sets what gets built inside it. Read both._

**The spine is one tool at a time, and the grouping is emergent.** Not a level
ladder, not a taxonomy of grammar concepts designed before anything exists —
individual tools for individual things (verb conjugation, prepositions and
postpositions, pronouns, articles), built one at a time, each standing on its
own. How they group is **read off the collection once there is one**, the way a
pattern is found rather than declared. Same instinct as adding one study language
at a time.

⚠️ **The failure mode this invites is premature abstraction.** The moment tool #2
is fitted into tool #1's shapes, the taxonomy has been built by accident and the
whole point is lost. **Build the second tool as if the first did not exist**, and
extract shared machinery only when a third one wants it. Two is a coincidence.

**The order: the switcher, then writing, then conjugation.**

- [ ] **Mode switching — the shell learns there is more than one mode.**
      Scoped 2026-09-21. This is the whole first build, and **no grammar content
      is part of it**: Munli can land as a home screen with nothing on it yet.
      What this item delivers is that a second mode exists, is reachable, and
      survives a cold open.

      ⚠️ **Don't design Munli's nav ahead of its tools.** The mode gets its own
      navigation — that is what "own tab set, shared shell" bought — but with two
      tools a five-tab bar is furniture for rooms nobody built. Day one is a
      **home listing the tools**, and the nav grows a tab when a tool earns one.
      The earlier Practice · Concepts · Ask sketch is dropped, and so is the
      "concept" abstraction under it.

      **The design call that makes it cheap: a mode is a *location*, not a
      setting.** Web has no other option — a mode not in the URL is not linkable
      — and taking the same shape on native means "which mode am I in" is always
      answered by the current route, never by state two surfaces could disagree
      about. Native: a second Expo Router group (`app/(munli)/_layout.tsx` beside
      `app/(tabs)/`). Web: a `/munli` route prefix with its own nav item list,
      since `nav-items.tsx` already centralises that list for both the sidebar
      and the mobile header.
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
      2. **The destination announces itself.** Munli looks nothing like Amgi, so
         nobody is ever unsure *which* mode they are in — the discoverability
         problem is only ever entering, never being lost.
      ⚠️ **Resist a first-run tour.** One feature does not earn a coach-mark
      system, and first run is already spoken for by language setup.

      **What is shared and what is not — settling this is the item's real
      content.** Shared: the account, the study language, the interface language,
      the theme, the streak, **and the card collection** (a Munli surface that
      offers a vocabulary card writes an ordinary Amgi card — cards belong to the
      account, not to a mode). Not shared: the review queue, the practice
      scheduling, the progress rollups.
      ⚠️ **"Grammar review is never pooled with vocabulary review" governs the
      queue, not the chrome.** Constraint #1 of 2026-09-14 is about
      `collections.ts` refusing an everything-collection. It is not an argument
      for two streaks or two accounts — splitting those gives the user two habits
      to break instead of one.
      **Open, worth deciding deliberately rather than by default: does Munli
      practice feed the Amgi streak?** Recommended yes — one app, one habit — but
      it means a day of conjugation keeps a streak alive with nothing reviewed,
      and whether that is a feature or a loophole is a judgement, not a
      derivation.

      **Munli appears unconditionally**, even for a study language it has no
      tools for — the rule the Packs tab already set ("a tab that appears and
      disappears would reflow the bar on every study-language switch"). An empty
      state is cheaper than a switcher whose contents move under you.

      ⚠️ **Naming.** Munli is a **mode inside Amgi**, not a second product: the
      store listing, the bundle id and the consent screen stay Amgi (see the
      consent-screen item under Housekeeping, which is about exactly that name).
      **The Korean rendering is open** — whether a Korean interface says Munli,
      문리, or something else is a copy decision, and Korean copy is held to
      sounding native rather than transliterated.

      **Scope:** one route group per platform, one storage key per platform, one
      `onLongPress`, one switcher sheet, one account-menu row, and the strings.
      No grammar.

- [ ] **Writing comes back — as Munli's first tool.** Scoped 2026-09-21, on the
      user's call, and it **un-gates** the version that sat in Medium: writing no
      longer waits behind a ladder, because there is no ladder to wait for.

      **It is a restore, not a rebuild.** The removal is one commit — `1ebdc9b`,
      2026-08-18 — so every deleted file is recoverable with
      `git show 1ebdc9b^:<path>`: `WritingReviewPanel.tsx` on both platforms,
      `TextDiff.tsx` on both, `packages/core/src/diff.ts`, and 88 i18n keys × 2
      languages. **The backend needs nothing** — `/api/writing`,
      `parseWritingReview` and `WRITING_MAX_CHARS` stayed deployed and unchanged
      the whole time.
      ⚠️ **`writing.ts`'s `DO NOT DELETE AS DEAD CODE` header becomes false the
      moment it has callers again.** Rewrite it in the same commit; a header that
      lies about why a module exists is worse than no header. Same for the
      Housekeeping item that pairs it with `grammar.ts` — only `grammar.ts` is
      still in that item.

      **What must not come back: the Learn Word/Passage toggle**, which is what
      was actually disliked. ⚠️ **And with writing in Munli, the entire placement
      sub-plan dies with it** — the auto-growing field, the wrapping threshold,
      the `keyboardReserve` growth direction, the Enter/Shift+Enter split, the
      three reworded strings. All of it existed only because writing had to share
      Learn's one box. It doesn't any more: Munli's writing surface *is* a
      writing surface, so there is nothing to disambiguate and **Amgi's Learn tab
      is untouched by this item.** Cancelled with its reasoning in Decisions.

      **What "improving it" means, cheapest first:**
      1. **`try`/`catch` on `/api/writing`** — it has exactly the exposure the
         `/api/explain` item in Medium describes, and this is the commit that
         should pay for it.
      2. **The gap card.** `WritingCardCandidate.gap` is implemented, the prompt
         already specifies it, and it never shipped — a word the learner reached
         for and did not have is the highest-confidence signal a passage
         produces. It is *vocabulary*, so it writes an ordinary Amgi card. First
         cross-mode action, and the shell makes it legal.
      3. **Findings you can return to.** They were ephemeral; a review you cannot
         re-read is a review you half-remember.
         ⚠️ **This is not the 2026-09-14 storage plan.** That one stored *concept
         ids and counts* to order a grammar collection by the learner's own
         errors — with no ladder there is nothing to order, so **the "emergent
         ordering" half of that entry dies with it.** What is storable now is
         `FindingKind` counts, four buckets, honest as history and far too coarse
         to be a syllabus. **The passage itself stays unstored** either way.
      4. **Routing, deferred and named so it is not invented early.** Once
         conjugation exists, a `grammar` finding about a verb form could open
         that verb's conjugation table. That is the first real instance of tools being
         grouped by something observed — but it needs both tools to exist and the
         classification to be reliable, so **not in v1**.

      ⚠️ **Say what is not being fixed.** Of the four reasons the feature was
      removed, this addresses *unfocused* (its own mode, no toggle), *unused*
      (untested — it is the same bet again) and *heavy* (one call at a moment the
      user chose, nothing in a daily loop). It does **not** address **"the
      practice itself was not good"** where that was about the *reviews* — the
      model call, prompt and parser are byte-for-byte what was removed. If the
      findings themselves were the disappointment, none of the four items above
      touch it, and that is a prompt-and-model question to take deliberately
      rather than to discover after the restore.

      **What stays dead, unchanged:** generated exercises, model-graded free
      production, and writing as a *practice* surface. Writing diagnoses.

- [ ] **Verb conjugation practice — the first built-from-scratch Munli tool.**
      Scoped 2026-09-21. Standalone by design: **no levels, no concepts, no
      shared grammar abstraction.** It is one tool for one thing.

      **Vocabulary first, so these notes are readable in six months.** A
      **table** is one verb in one tense — `prendre · présent` — and its six
      **boxes** are the forms, one per person (`je prends` … `ils prennent`).
      **One question** is one box: the app names the verb, the tense and the
      person, and the learner types the form. ~5 seconds, which is the point —
      `vision.md` already argues that the cost of an exercise sets the bar for
      what is worth practising.

      ⚠️ **But the thing that carries a schedule is the *table*, not the box**,
      and this is the call the rest of the design hangs off. **Miss `nous` and the
      whole `prendre · présent` table comes back sooner**, and when it does it may
      ask any of its six boxes — with a per-box miss counter inside the item so it
      *prefers* to ask the one that was missed. The alternative is a schedule per
      box, where missing `nous` resets `nous` and leaves `je` untouched.

      **The argument is not volume** — 120 tables (20 verbs × 6 tenses) against
      720 boxes, and both are ordinary deck sizes. It is **what counts as one
      fact.** For a regular verb all six forms follow one rule, so six schedules
      are six copies of one fact, and `parlez` gets asked on its own timer though
      knowing `parlons` already settled it. For an irregular verb the boxes are
      genuinely separate facts — `prenons` and `prennent` have different stems.
      So **per-table is right for regular verbs and per-box is right for irregular
      ones**, and the recommendation is per-table with the miss counter because it
      buys most of the precision for one scheduler.
      **The cost, stated plainly:** SM-2 then learns "your `prendre` présent is
      shaky", not "your *nous* is shaky".
      **A v2 worth naming rather than building:** key it to the verb — regular
      verbs scheduled as a table, irregular verbs per box. It is the most correct
      answer and it is two code paths, and deciding by content shape rather than
      by a flag is the house pattern (`isGridDeck` picks a pack's layout exactly
      that way).

      **Table-as-item is also what makes the other question shapes cheap later** —
      the user wants fill-the-whole-table and fill-the-blank-in-a-sentence offered
      as alternatives, to see which people prefer. If the item is the table, those
      are *views of the same item* rather than a second content model. Build one
      view, leave the seam.

      **The content is computed, not authored — and that is what makes
      conjugation unlike every content job this repo has done.** A conjugation
      set is a verb list plus conjugation rules plus an irregulars table: finite,
      closed, and checkable against a reference. There is no 급수-sized authoring
      job here, which is exactly why this is the right first tool.
      ⚠️ **`docs/packs/README.md` still governs: the model is not a source.**
      Generate regular forms by rule, take irregulars from a citable reference,
      and **check the licence before taking a dataset** — the sourcing gate moved,
      it did not disappear.

      **Grading is already built and already correct.** `typedAnswer.ts` is pure,
      local and needs no model, and its two folding decisions happen to be exactly
      what a conjugation drill needs: apostrophes *are* folded (so `j'ai` typed on
      an iOS keyboard matches), and **diacritics are deliberately not** — the
      module's own comment cites French `ou`/`où` and `sur`/`sûr`, and
      `préfère`/`prefere` is the same case one step further in. A grader that
      folded accents would teach that the accent is optional, which for a
      conjugation table is the whole content. **No new grader.**

      **Hints that cost, per `vision.md`:** stem → ending pattern → the form, with
      the best available verdict falling as each is taken, and the schedule told.
      ⚠️ **Take the design, not the module** — the hint tiers were `grammar.ts`'s,
      and that file is queued for deletion under Housekeeping.

      **The learner picks; the app does not level them.** Which tenses and which
      verbs are chosen from the outside, frequency-ordered. No placement, no level
      setting, nothing inferred.

      **Zero model calls, works offline**, like the rest of review.

      **Assumption, stated rather than asked: French first**, because it is the
      ask that opened this. The tool is language-generic and the dataset is
      per-language, so changing the answer is a dataset swap rather than a
      redesign. Korean conjugates heavily too, so the core Korean↔English pair is
      reachable from the same tool; English is the thin one.

      **The learner's native language does *not* enter this tool** — the user's
      call, and worth recording as scoping rather than as an exception. A
      conjugation table is a form you commit to memory, and `prenons` is hard for
      the same reason whoever you are. The native language matters where the
      **distance between the two languages is itself the difficulty**: Korean has
      no articles, so `a`/`the` for a Korean speaker means learning that a
      category exists, where a French speaker learning English already has the
      category and only the details differ. Same feature, genuinely different
      tool. That is an argument for **those** tools — articles, prepositions
      against postpositions — when they are built, not an axis this one carries.

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
      2026-09-14 — `writing.ts` is no longer part of this**, and as of 2026-09-21
      it is not even the same *kind* of case: the writing item in High gives it
      real callers again, at which point it is ordinary live code and its
      `DO NOT DELETE AS DEAD CODE` header has to go with the same commit. **Keep
      `writing.ts` and its route.** `grammar.ts` is the opposite case: `getPatternExercise` and
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
