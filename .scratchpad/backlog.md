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

**All three shipped on 2026-09-21** — the switcher in PR #135, writing in #136,
conjugation in #137 (see Now in [status.md](status.md)). **None has reached a
device**, and none has been used by a human on either platform; they are under
Queued for the next build below. What is left in High is the work those three
turned up.

⚠️ **The next tool is where the plan gets tested, not this one.** "One tool at a
time, group later" only means something once there are two to group, and the
rule that goes with it is that the second is built **as if the first did not
exist**. Conjugation's shapes — a table, a box, a miss tally — are a verb
paradigm's shapes, and prepositions have none of them.

- [ ] **Writing findings you can return to.** Split out of the writing item when
      it shipped (PR #136) — a review you cannot re-read is a review you half
      remember, and today the findings vanish when the screen does.
      ⚠️ **Not the 2026-09-14 storage plan**, which stored *concept ids* to order
      a grammar collection by the learner's own errors. There is no concept
      ladder, so there is nothing to order. What is storable is `FindingKind`
      counts — four buckets — which is honest as history and far too coarse to
      be a syllabus. **The passage itself stays unstored** either way; that was
      never in question.
      ⚠️ **The reason it was not done with the restore: it needs a Firestore
      collection and a security rule**, and rules are console state the repo
      cannot verify. That makes it a deliberate piece of work rather than a
      finishing touch on someone else's PR.
      **Open, and it decides the shape:** whether this is per-review history (a
      list you scroll) or per-kind counts (a number that accumulates). The first
      is what "return to" literally asks for; the second is the only one that
      could ever feed routing.

- [ ] **Route a writing finding into a practice tool.** Named in the plan,
      deliberately not built: a `grammar` finding about a verb form could open
      that verb's conjugation table. It needs conjugation to exist, and it needs
      the classification to be reliable enough that a wrong route is rare —
      neither is established. **The first real instance of tools being grouped
      by something observed rather than declared**, which is why it is worth
      doing properly rather than early.

- [ ] **Irregular French verbs.** Conjugation ships with regular groups only, and
      a French conjugation tool without `être`, `avoir` and `aller` is missing the
      verbs a learner reaches for first. **The model already holds them**:
      `ConjugationIrregularVerb` stores forms per tense, `FRENCH_IRREGULARS` is
      `[]`, and the Verbs tab already has a section that says so. **This item is
      now a data file and a licence check, nothing else.** ⚠️ **This is the
      sourcing job, and it is the whole reason they were left out**: an irregular
      form is recalled content, not a rule, and `docs/packs/README.md` governs —
      the model is not a source. So this is a citable reference, a licence check,
      and a dataset; it is not a prompt.
      **The engine is already shaped for it**: `ConjugationVerb.group` dispatches
      rules and deliberately has no `irregular` member, because an irregular verb
      is stored forms rather than a rule class. Adding them means a table of
      forms beside the generator, not a fourth branch inside it.
      **The verb list wants the same treatment.** What shipped is described as
      *common*, not frequency-ranked, because ranking it is a sourcing claim with
      nothing behind it. Same job.

- [ ] **A second tense set, and whether tense choice belongs in settings.**
      Conjugation ships with présent, imparfait and futur simple, chosen with
      chips that default to présent alone. Passé composé is the obvious gap and
      it is **not** a fourth entry in the ending tables — it is auxiliary +
      participle, so it is the first tense that needs a different *shape*. Worth
      doing only once someone has used the three that exist.

## Queued for the next build

_Merged, not yet in anyone's hands — mobile ships by build, no OTA._

- [ ] **Munli's five tabs, and the Tables inventory** (PR #142). ⚠️ **Unseen on a
      device.** Worth checking that five icons still read on a narrow bar, and
      whether "Tables" is the right name for the Cards slot — it is right for
      conjugation and wrong the moment a second topic's items are not tables.

- [ ] **The Topics tab and the conjugation reference** (PR #141). The practice
      set became a list of topics, and the verbs screen now shows the tables. ⚠️
      **Unseen on a device**, including whether a six-row table reads at phone
      width — it scrolls horizontally, which is the part most likely to be wrong.

- [ ] **Conjugation by verb group, the Verbs tab, and the real subscription fix**
      (PR #140). ⚠️ **None of it has been seen on a device**, and the thing most
      worth checking first is the cross-device claim: practise on web, and the
      phone should update without a relaunch.

- [ ] **The Practice tab: picker, setup, and a session that ends** (PR #139).
      Also the shared conjugation progress that fixes the Progress tab needing
      an app restart. ⚠️ **The picker and the done state have not been seen on a
      device**; the session loop itself is a rework of what was tried.

- [ ] **Munli's shell, tabs and Progress tab** (PR #138). Web is live on merge;
      **native is not**. The tab-bar half was tried in Expo Go — that is what
      prompted it — but **the Munli Progress tab, the mode button on the header
      and the conjugation screen behind a tab have not been**.

- [ ] **Verb conjugation practice** (PR #137). Web is live on merge; **native is
      not**. ⚠️ **Nobody has answered a question on either platform** — the engine
      has 27 tests pinning every form it produces, and the screen has none. **The
      Firestore write path has never run**, which is the line worth checking
      first: progress is a field on `users/{uid}` rather than a new collection
      precisely so that no console rule is needed, and that reasoning is only as
      good as one successful write.

- [ ] **Writing review, in Munli** (PR #136). Web is live on merge; **native is
      not**. ⚠️ **No model call has been made through the restored UI on either
      platform** — the route never changed and its parser is under test, but
      nobody has submitted a passage and read what came back.

- [ ] **The mode switcher** (PR #135). Web is live on merge; **native is not**.
      Holding the last tab, the switcher sheet, Munli's home and the cold-open
      landing all exist only in a build nobody has cut. ⚠️ **And nothing here has
      been exercised on a device at all** — `expo export` bundles and `tsc` is
      clean, which says the routes resolve, not that the gesture feels right or
      that the sheet is reachable one-handed.

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
      _(`/api/writing` was listed here too and should not have been — checked
      2026-09-21 while restoring writing: it has had one since it was written,
      returning 502 on both an unparseable response and a thrown call.)_

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
