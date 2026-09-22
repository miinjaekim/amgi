# Backlog

Open work only, ordered by priority — **except Queued for the next build, which
sits first** because it turns over on every merge and is the list worth seeing
without scrolling. Anything that closes leaves this file:
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

## Queued for the next build

_Merged, not yet in anyone's hands — mobile ships by build, no OTA._

_Kept at the top of the file, ahead of priority order, from 2026-09-22 on the
user's call — this list changes every time something merges, and it is the one
section worth seeing without scrolling._

- [ ] **Verb conjugation, and Munli's tabs** (PR #143). Web is live on merge;
      **native is not**. The practice loop, the verbs page, Tables and Munli's
      Progress have been exercised in Expo Go, and **the Firestore write path has
      run**. ⚠️ **Two things it does not cover.** The **cross-device claim** has
      never been tried — practise on web, and the phone should update without a
      relaunch. And **the last round post-dates that testing**: the regular /
      irregular split, the two filter dropdowns, the per-section verb dropdown
      and the per-tense save pills are all unseen on a device. Also worth a look:
      five icons on a narrow tab bar, and whether a six-row paradigm reads at
      phone width, since it scrolls horizontally.

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

## High

_Reordered 2026-09-22 on the user's call. Play leads, and the three Munli items
that sat here were removed: they were written up without being asked for. The
Decisions entry of that date in [status.md](status.md) records what they were and
why they left, so none of them gets reopened from here. Munli's own plan is in
the two entries of 2026-09-21._

- [ ] **Amgi on Google Play** — scoped 2026-09-22 from a question; **nothing is
      decided**. The trigger set when Android went sideloaded is now the thing to
      weigh: _"revisit Play internal testing when re-sending links costs more than
      $25 and a review cycle"_ (Decisions 2026-08-22 in [status.md](status.md)).
      **It is two decisions, not one, and only the first is cheap.**
      **Internal testing track** — $25, no review queue, up to 100 testers by
      email — is close to a drop-in replacement for the sideload model and fixes
      its one real defect: an APK has **no update path at all**, so every release
      today is a fresh EAS link and a manual re-install by each tester. Play
      auto-updates them.
      **A production listing** is the expensive half: store listing, data-safety
      declaration, content rating, review cycles, and possibly a multi-week
      testing gate before you may even apply (below). The build work is nearly
      identical for both; the difference is policy and calendar.
      ⚠️ **Play App Signing changes the SHA-1, and that breaks Google sign-in on
      Play installs only.** Google re-signs the AAB with its own key, so the
      fingerprint an end user's install carries is *not* the EAS upload
      keystore's — and the Android OAuth client is keyed to package name + SHA-1.
      Register the **Play App Signing certificate's** SHA-1 (as well as the upload
      key's) in Google Cloud and Firebase *before* the first internal-track
      install, and test sign-in on a **Play-delivered** build specifically. This
      is the exact shape of the failure [lessons.md](lessons.md) already paid four
      release builds for: nothing in a diff points at it, and a build installed
      any other way will pass.
      ⚠️ **A Play build cannot install over the sideloaded APK** — different
      signing key, so testers uninstall first. Cards survive (Firestore); the
      AsyncStorage layer does not, so the offline review snapshot, the rating
      queue and the **streak** go with it.
      **The repo work is small.** `app.json` needs nothing — `com.miinjaekim.amgi`
      is already permanent and keyed into the OAuth client, and `adaptiveIcon`
      exists. It is `apps/mobile/eas.json`: an Android side to the `production`
      profile (`distribution: internal` on `preview` is what makes today's build an
      APK; `production` already defaults to an AAB), plus
      `submit.production.android` with a Google Play service account key, which
      today holds `ios.ascAppId` only. `appVersionSource: remote` already covers
      Android — EAS keeps a separate counter per platform, at `versionCode` 6.
      **Console work, mostly writing:** listing copy, phone screenshots (tablet
      too if tablet support is declared — `supportsTablet` is iOS-only today),
      512px icon, 1024×500 feature graphic; the **data-safety form** (Firebase Auth
      identifiers, card content in Firestore, text sent to Gemini through the API
      routes, TTS audio in Storage — and the shared pronunciation cache, keyed by
      text hash rather than by user, is a genuine "not deleted with the account"
      disclosure that must match what `/privacy` already says); content rating;
      **App access** notes, since there is no email/password path and a reviewer
      has to get past Google sign-in. The privacy policy URL exists in both
      locales. Play wants in-app account deletion **and** a public deletion-request
      URL — `deleteUser()` is wired (`UserContext.tsx`), so only the URL is
      missing, probably a section on the privacy page.
      ⚠️ **Two policy questions to check in the console rather than assume**, both
      of which can change the size of this item:
      **(1) the closed-testing gate** — personal developer accounts registered
      after Nov 2023 have had to run closed testing with a minimum number of
      opted-in testers (12, most recently) for 14 continuous days before applying
      for production. Organization accounts are exempt but need a D-U-N-S number.
      If it still holds, production is a **multi-week** item gated on recruiting a
      dozen real testers, and it should drive the personal-vs-organization choice
      *before* the $25 is spent.
      **(2) the generative-AI policy** — Play has required an in-app way to report
      offensive AI output. Amgi generates card content through Gemini, so this
      could be a small feature to build rather than a form to fill.
      **The precondition is not paperwork.** **Nothing but sign-in has ever been
      exercised on Android** (the never-verified ⚠️ under Builds in
      [status.md](status.md)) — audio, export, sharing, offline, account deletion,
      reminders, and reminders need the runtime `POST_NOTIFICATIONS` grant on 13+
      and land in the default "Miscellaneous" channel, with no
      `setNotificationChannel` call anywhere in mobile. Sideloading to people you
      know tolerates that; a public listing is arbitrary devices and one-star
      reviews. Work that list on a Play-delivered build before any production push.
      **Recommended shape, if it is taken up:** internal track now, production
      later — an afternoon (eas.json profile, service account, SHA-1 registration,
      one AAB, one sign-in test) buys the auto-update path and starts any
      tester-count clock running while the untested Android surfaces get
      exercised. Production then becomes forms on top of proven infrastructure.
      ⚠️ It also **retires the line at the foot of this file**: a Play release is
      reviewed, so "Android is the exception — a fix there ships the same day"
      stops being true for whatever is on Play. Both can coexist (the APK stays a
      valid channel) but only if it stays deliberate rather than forgotten.
      _Also relevant and still open: custom URI schemes on Android are a reprieve
      Google may withdraw ([lessons.md](lessons.md)), and a listing makes that a
      dependency for real users rather than a handful of testers. It raises the
      value of the `@react-native-google-signin` migration; it does not block
      anything here._

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
      **It gained a second reason on 2026-09-21.** The mode switcher (shipped in
      PR #135, under Queued for the next build) wants a *Switch mode ›* row as its discoverable door, and a row menu is
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
      it is not even the same *kind* of case: writing shipped in PR #136, so
      `writing.ts` has real callers on both platforms again
      (`WritingReviewPanel`). It is ordinary live code now, which means **its
      `DO NOT DELETE AS DEAD CODE` header is already false** and should go —
      it argues from "no callers in this tree", which stopped being true on
      merge. **Keep `writing.ts` and its route.** `grammar.ts` is the opposite case: `getPatternExercise` and
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
