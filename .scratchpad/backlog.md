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

**Nothing is queued.** Build 15 (1.6.0) went out 2026-09-10 — the mobile UI
redesign, Expo SDK 57, Hanja and its 급수 pack, subpacks, the shareable stats
image, readings in mobile review, the 병과와 주특기 section — and was approved
for external testing the same day. It also cleared the raw-slug regression build
14 could not. The next mobile change starts this list again.

⚠️ **Checking a build is not tracked here** (2026-09-04). The ranked list of what
a release has never been exercised on came off this file — all of it is reached
by using the app, so it surfaces in use rather than in a sitting spent working
down a list. The durable halves live elsewhere: the never-verified-on-a-binary
caveat under Builds in [status.md](status.md), and the Slow speed's fallback in
that file's Decisions entry.

**Pre-flight**, in order. Steps 2–6 were all exercised cutting 1.6.0; step 1
never has been, on any build:

1. Smoke-test in Expo Go, then verify the native-adjacent paths on the build
   itself — Expo Go runs the SDK's own bundled native modules, so a clean pass
   there says nothing about audio, notifications, sharing, the file system or
   the auth redirect. ⚠️ **This has never happened**, through fifteen builds; see
   the never-verified caveat under Builds in [status.md](status.md) for what is
   on it and why working down the list is not tracked as a task.
2. Bump `version` in `app.json` **before** starting the build. EAS
   auto-increments the *build* number and never the version, so nothing catches
   this for you.
3. `expo config --type introspect` if any native module or `app.json` native
   config changed — this is where an unasked-for entitlement shows up before a
   cloud build finds it. 1.6.0's came back `entitlements: {}`, which is what
   `withoutPushEntitlement` is there to produce.
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

⚠️ **Don't hand-run the OTA workflow.** `.github/workflows/mobile-ota-update.yml`
is `workflow_dispatch`-only and its push trigger is commented out, which is the
only thing that stopped the #111 merge from publishing an update to a binary two
SDKs behind it. OTA is abandoned (2026-07-23); leave the workflow alone rather
than tidying it up, so the option stays open.

_A version bump queues another Beta App Review; 1.6.0's external approval covers
1.6.0 only. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._

## High

**Five items, one subject: what the progress surfaces show.** Queued
2026-09-12. The mobile UI redesign that stood here is finished — its last item,
per-context pronunciation speed, moved to Medium the same day rather than
closing, since nothing about it was decided. Everything else in the 2026-08-31
queue either shipped (Spanish and Kikuyu packs, the pronunciation speed dial in
build 14, the shareable stats asset across four commits on 2026-09-07) or was
cancelled, with the reasoning in the Decisions entries in [status.md](status.md).

### Reading the progress data better — queued 2026-09-12

The rollups are richer than the dashboard reads them. A day already carries
per-language slices, per-hour counts, maturity crossings and study seconds; the
tab draws four tiles, a grid of unlabelled squares and a bar per language.
**Every item below is a display change over data already written** — none needs
a new counter, and none blocks another.

Each lands in **two or three places**: `apps/mobile/app/(tabs)/progress.tsx` and
`apps/web/src/app/progress/page.tsx` are near-identical surfaces built from the
same `@amgi/core` helpers, and the shared asset is rendered server-side by
`apps/web/src/app/api/stats-image/route.tsx` from numbers `packages/core/src/
shareStats.ts` computes. Put anything derived in core, where it is testable —
the render route's raster **cannot** be unit-tested (resvg's wasm does not
initialise under vitest), which is the reason that split exists at all.

⚠️ **Three settled rules govern every number here.** They are decided, recorded
in [status.md](status.md), and not to be relitigated while doing display work:
**(1)** a figure the window cannot honestly cover comes back `null` and is
dropped, never rendered as 0 — `PROGRESS_HISTORY_START` (2026-08-20) bounds the
rows, `DETAILED_HISTORY_START` (2026-09-06) bounds `cardsMatured`,
`studySeconds` and `byHour`, and the per-language verdict split starts
2026-09-04. **(2)** every figure on the shared image spans **one** window, or is
withheld — juxtaposition is what lies, not any single number. **(3)** `reviews`
counts **directions** and `cardsMatured` counts **cards**, so the two may never
share a label or a grid row without saying which is which.

- [ ] **Pick which asset you are sharing, one of them today's review.** The
      share affordance renders exactly one picture today: the selected window's
      numbers through `shareImagePath`. The ask is a chooser in front of it,
      with **"what I reviewed today"** as one of the options.
      ⚠️ **A today asset is not the existing template at `w=1`.** That layout is
      window-shaped — a hero count, a wrapped calendar, a tile row — and one day
      of it is a single square. So this is a **second template inside the same
      route**, selected by a query parameter; keep one route, because one route
      for both platforms is the reason the asset works on mobile at all (mobile
      cannot rasterize a view without `react-native-view-shot`, which costs an
      EAS build and breaks Expo Go).
      ⚠️ **`hasShareableHistory` has to be asked per variant.** It currently
      gates the button on the *window* having reviews; a today asset offered on
      a day with none is exactly the zeroed image that gate exists to prevent,
      even when the 90-day window behind it is full.
      **The chooser is a new surface on both platforms.** Mobile has
      `BottomSheet` already, used by the study-language switcher on this very
      screen — follow it. Web is the constraint: `ShareStatsButton` is an
      **anchor with `download`**, deliberately, so the base case needs no JS and
      cannot fail into nothing. Whatever the picker is, each variant must end at
      its own `href` so that property survives.
      ⚠️ **New copy on the image can render blank.** The Noto faces are base64
      `text=` subsets (~10KB against ~5.7MB); a glyph outside the subset draws as
      nothing, silently. Regenerate them with the template. Satori rules too:
      flexbox only, explicit `display: flex` on any multi-child container.

- [ ] **Show cards learned on the dashboard, not only on the shared image.**
      `summarizeProgress` already returns `totalCardsMatured` and the asset
      already renders it as `shareStatLearned` ("Cards learned" / "익힌 카드").
      The tab has never shown it — the stat grid is streak, reviews, days
      studied, average, on both platforms.
      ⚠️ **It undercounts before 2026-09-06 and the asset handles that; the
      dashboard would not.** `buildShareStats` returns `null` when the window
      reaches past `DETAILED_HISTORY_START`, and `fullyCoveredWindow` exists to
      offer a shorter honest window instead. Reuse both. A quiet low number in a
      90-day tile is the failure mode.
      ⚠️ **Decide first whether the wanted number is all-time.** "Cards I have
      learned" reads as a lifetime figure, and the windowed one is not that. An
      all-time count *is* derivable from the card documents via `isCardMature`
      — at the cost of nine `where uid ==` queries across nine per-language
      collections, which is precisely what `shareStats.ts` was built to avoid
      ("a promise that sharing costs no reads"). That is a read-cost call, not a
      layout one; take it before building either.

- [ ] **Label the calendar's days, and the other figures while there.** The
      heatmap is seven rows per column with nothing naming a row, so which row
      is Monday is unanswerable; the columns name no months either.
      ⚠️ **The grid is not weekday-aligned, so labels would currently be
      wrong** — worse than absent. `buildHeatmap` starts at `endDate − (n−1)`
      and chunks by seven from there, so row 0 is whatever weekday the window
      happens to open on and it shifts every day. The "364 rather than 365 so
      the calendar is a whole number of weeks" comment on both `RANGES` is true
      of the *count* only. **Padding to the week boundary comes first**, in
      `buildHeatmap` where it is shared and tested, not in each renderer.
      **What else is drawn without being labelled:** the per-language bar is a
      share of the *busiest* language and never says so; the legend reads
      Less → More without naming the quantity; and `byHour` has been collected
      since 2026-09-06 and is **drawn nowhere at all** — "when do you study" is
      written down and never shown.
      ⚠️ **The app's heatmap ramp is measurably wrong and was left alone
      deliberately** (Decisions, 2026-09-07): `levelColor` alpha-blends the
      highlight, so its lightness is not monotonic — the busiest day renders
      *darker* than a rest day — and empty versus level 1 are ΔE 1.4 apart under
      deuteranopia. The corrected ramp already exists in `route.tsx`. It was
      held back because restyling a shipped screen is a product call; **if this
      item restyles the grid anyway, take the fix with it** rather than leaving
      two ramps in the repo.

- [ ] **Say which languages the shared image is about.** It reports reviews, a
      streak, days studied and a calendar without ever naming what was studied.
      `summary.byLanguage` is in hand at both call sites and has been written
      since rollups began, so this costs no read.
      ⚠️ **Numbers are passed in, never looked up** — the route takes no uid,
      touches no Firestore, and that is the privacy design rather than an
      optimisation. Languages travel the same way: `shareImageQuery` grows a
      parameter. Use the `label{StudyLanguage}` keys, which exist in both
      locales already, and **regenerate the font subsets** — 한국어 and friends
      are new glyphs on that canvas.
      ⚠️ **Name them, and their review counts if wanted; do not split retention
      or maturity per language on this image.** `byLanguage.reviews`,
      `newCards` and `packCards` go back to the start; the verdicts inside
      `byLanguage` only start 2026-09-04 and `cardsMatured` 2026-09-06, so those
      break rule (2) above over any window worth posting.
      The canvas is full — window label, hero, calendar, tiles, footer — so this
      is a layout call, not an insertion.

- [ ] **Take retention off both surfaces; keep every counter behind it.**
      Review is about how much you reviewed and how many cards you have learned,
      not how accurately you recalled them, and time taken matters less still —
      so the percentage stops being displayed.
      **Three display sites, and nothing else:** the per-language row on mobile
      (`progressRetention`, "{percent}% recalled" / "{percent}% 기억" — web's
      language list never showed it), the `shareStatRetention` tile in
      `route.tsx`, and the `ret` parameter `shareImageQuery` sends. Both i18n
      keys become dead in both locales; delete them with the render.
      ⚠️ **Do not touch the write path.** `again`/`hard`/`good`/`easy` keep
      being written, `retentionRate` and `ratedTotal` stay exported. A rollup
      keeps only what it counted in advance and cannot be backfilled, so
      stopping the write throws away history permanently — and the per-language
      split would have to re-earn its 2026-09-04 boundary from scratch.
      ⚠️ **The route must keep *accepting* `ret` while ignoring it.** Mobile
      ships by build, the route is server-side: build 15 goes on appending `ret`
      to the URL for as long as it is installed. (The flip side is free — the
      tile disappears from already-shipped builds the moment the route stops
      drawing it.)
      Tests to follow down: `share-stats.test.ts` (four cases) and
      `stats-image.test.ts` (four more) assert on it. The parse cases guard a
      real bug class and should keep asserting the parameter is *tolerated*.

## Medium

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
