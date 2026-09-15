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

**Build 16 is queued, as of 2026-09-12.** What is waiting on it, all on the
Progress tab: the week-aligned calendar with its weekday and month labels, the
corrected heatmap ramp (a palette change, so it is visible on every theme), the
all-time cards learned tile and its per-language counts, the weekly review
chart — now the web one's twin, bars or line behind a toggle, ruled against a
rounded ceiling instead of its own busiest day — retention and days studied gone
from the tiles and the language rows, and the share flow, now a full-screen
preview swiped card by card, 30 days and 90 days plus today, each carrying four
tiles rather than one.

⚠️ **This build is a native-module build**, unlike the last few: the chart's
line mark added `react-native-svg` 15.15.4 on 2026-09-12. Expo Go bundles it, so
nothing about the dev loop changed, but the binary needs it compiled in and step
3 below (`expo config --type introspect`) is therefore **not** skippable this
time.

⚠️ **The sheet-based chooser this replaces never worked on iOS, and was queued
for this same build.** It closed its own `Modal` on the way to
`Sharing.shareAsync`, which iOS refuses to present mid-dismissal — so the share
sheet never appeared, the promise never settled, and the Share button stayed
disabled for the rest of the session. Replaced 2026-09-12 with a pushed screen,
which cannot be mid-transition when its own button is tapped. The full account
is in the share entry under Decisions in [status.md](status.md).

⚠️ **The preview needs a reachable `EXPO_PUBLIC_API_BASE_URL`.** The card is the
deployed route's own render, so on a build pointed at nothing the preview is a
blank placeholder — and unlike the old thumbnail, *sharing* needs that host too,
since the download is what feeds the OS sheet. Worth one look on the build.

**No console step is needed for `mature`, and this was checked rather than
assumed** (2026-09-12). The worry was that a new field on ten card collections
might hit a rule listing which fields an update may write. It does not: the two
shapes [lessons.md](lessons.md) records are scoped to *operations*
(`read, update, delete` + `create`, or `read, write` + `create`), and nothing in
them enumerates fields. Confirmed against the live project as well — the
backfill wrote flags and the count came back **196** on a real account, where a
rule rejection or a missing index would have thrown and shown no tile at all.
The read side needs nothing either: `mature == true` plus `uid ==` is two
equality filters, which Firestore serves by merging single-field indexes, so
unlike the card queries this needs **no composite index**.

⚠️ **`matureBackfillAt` makes the backfill one-shot, which cuts both ways.** It
has already run against production data from a dev server, so the flags are
really written. If the count is ever wrong, clearing that field on
`users/{uid}` is the only thing that makes it recompute — and a language never
studied has had its rules unexercised by the backfill, since nothing there
needed flagging. The rating path writes the same field, so that would surface
on the first review in it.

⚠️ **Do not read that list as "the progress work is unreleased".** The shared
image renders server-side, so build 15 devices *already* draw the language line
and *already* lost the retention tile — an app that is two builds old renders
the current picture, because it only ever asked a URL for one. Web gets
everything on deploy. Only mobile's own screen waits.

Build 15 (1.6.0) went out 2026-09-10 — the mobile UI redesign, Expo SDK 57,
Hanja and its 급수 pack, subpacks, the shareable stats image, readings in mobile
review, the 병과와 주특기 section — and was approved for external testing the
same day. It also cleared the raw-slug regression build 14 could not.

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

_Empty as of 2026-09-15._ Payments was added here that morning and **parked the
same day** on the user's call — the scoping survives under Parked, only the
implementation is deferred. The unauthenticated-routes item found while scoping it
went to **Medium** rather than being parked alongside: it is not a payments
problem, and it does not go away because payments did.

## Medium

- [ ] **Every API route is unauthenticated.** Found 2026-09-15 while scoping
      payments, and **deliberately not parked with it** — payments gated nothing,
      so the two were always independent and this stands on its own merits.
      All ten routes in `apps/web/src/app/api` take no token and check no user:
      no `authorization` header is read anywhere, and `firebase-admin` is imported
      by the migration scripts and `lib/firebaseAdmin.ts` but by **no route**. Nine
      of the ten spend a `gemini-2.5-flash` call (`explain`, `depth`,
      `depth-stream`, `examples`, `examples-stream`, `vocab-list`,
      `word-of-the-day`, `writing`, `grammar/exercise`); `pronounce` spends Google
      Cloud TTS. Anyone with the URL can drain the budget today.
      **What makes this urgent later rather than only untidy now:** metering is
      impossible without attribution, so *any* usage-based pricing is blocked on
      it. ⚠️ **And `users/{uid}/progress/{day}` is client-written** by a rule that
      permits any value — harmless for a dashboard, fraud the moment a payout or a
      quota reads it. `status.md` also records those increments as deliberately
      non-idempotent. Server-authoritative review recording is a real
      architectural change and it collides with mobile's offline-first rating
      queue; **do not scope that here**, just don't let a pricing model assume it.

      ⚠️ **Nothing counts lookups.** `progress.ts` counts `newCards` — cards
      *saved*, tagged `CardSource = 'lookup' | 'pack'` — so a lookup nobody saves
      spends a full model call and is recorded nowhere. That is precisely the
      number a quota would be denominated in. Same "from today or from never"
      argument this file makes about every rollup: each week without the counter
      is a week that cannot be priced from retroactively. **Cheapest item here.**
      ⚠️ **Amended 2026-09-15 — no longer urgent.** That deadline was about being
      able to price from real usage, and pricing is parked. The counter stays cheap
      and stays unrecoverable retroactively, so it is still worth doing — it is
      just no longer a reason to hurry.

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
      deep and level → concept → item is exactly two.
      **This does not contradict "a grammar point is not a card"**
      ([vision.md](vision.md)). What was rejected was one card *per pattern* with a
      gloss on the back — the lookup-table row. Here the concept is the subpack and
      the cards are *instances of exercising it*, which is the distinction that
      argument turns on. Don't lose it: it is what keeps this from being the thing
      that already failed.
      **Its own row in the review picker** — the user's call. Grammar and vocab are
      never interleaved in one sitting, which `collections.ts` already prefers
      ("no 'everything' collection", deliberately).
      ⚠️ **Give grammar sets a real `id` and `ReviewCollection.kind` stays
      deleted.** `kind` only ever existed because a patterns row and your own cards
      were *both* `id: null`. A grammar pack carries a pack-shaped id, so
      `collectionKey = id ?? ''` still resolves and the discriminator the removal
      deleted does not come back. This is strictly better than what was there.
      **Zero model calls.** Items are authored, graded locally by `typedAnswer.ts`,
      single-direction. That answers three of the four reasons the old feature
      failed — heavy, slow, grading variance — by construction rather than by
      tuning. `getPatternExercise` and `gradeFromReview` stay dead.
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
      Scoped 2026-09-14; the reasoning and the revision it makes to an earlier call
      are in the Decisions entry in [status.md](status.md).
      ⚠️ **Do not start this before the two items above.** A finding needs an
      authored concept to point at; without the ladder it has to invent one, which
      is exactly what failed. The ordering is also the **gate**: writing comes back
      only if the ladder gets used.
      **The job is routing, not practice.** A finding classifies into the closed
      set of authored concepts — the `normalizePartOfSpeech` move, match or drop —
      and enrols that subpack. No exercise generation. `getPatternExercise` and
      `gradeFromReview` stay dead.
      **Most of it is already built and deployed.** `/api/writing` is one
      `gemini-2.5-flash` call at temp 0.1; `parseWritingReview`, the four
      `FindingKind`s, `WritingCardCandidate.gap` and `buildWritingCardDraft` all
      still work. What is new is the classifier and the counts.
      **Persist findings, not prose** — concept ids and counts only. Keeps the
      ephemeral-submissions decision intact while giving the grammar collection its
      best ordering: *the learner's own error counts over authored content*.
      **Placement — one input, no toggle.** The Word/Passage toggle is what was
      disliked, not Learn itself: it forced a mode choice up front on a surface
      whose job is one box. ⚠️ **An offer, not a route** — a phrase lookup is
      legitimate (the idioms pack), so the input must never be silently
      reinterpreted. Same shape as the spellcheck override, "a request, not a
      filter".

      **The input, designed 2026-09-14.** No value on its own — it ships with this
      item, not before it, or it is a button with nothing behind it.

      ⚠️ **This supersedes an earlier line in this item** that had the offer appear
      *after* submission, beside the explanation. Moved *before* submission: a
      paragraph submitted to `/api/explain` spends a model call and renders a
      nonsense result, and both are avoidable by asking first.

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

      **The gap card is the cheapest win** and can ship with this or ahead of it.

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

- [ ] **Payments — Stripe proof-of-concept on web.** Scoped and **parked the same
      day, 2026-09-15, on the user's call**: *"i don't think it's the right time to
      work on payment features right now."* The scoping stands and nothing below
      has to be re-derived; only the implementation is deferred.
      **The goal was never a pricing model** — it was proving funds can reach a
      bank account, and learning the moving parts, since the user has not built
      payments before. The commitment/deposit model that prompted it (pay $30, earn
      it back a day at a time for reviewing) is sketched and unbuilt.
      ⚠️ **Remember its structural flaw before reviving it: revenue arrives only
      when the learner fails.** A user who studies all 30 days is refunded in full
      and cost a month of Gemini and TTS, so the best users are negative margin and
      every difficulty knob acquires a quiet financial gradient — which
      [vision.md](vision.md)'s no-dark-patterns line forbids. The fixes are to
      split an optional stake from a flat subscription, or to keep a
      non-refundable service portion. It also cuts against the 2026-09-12 call that
      **review is about how much you reviewed, not how well** — retention came off
      every surface for reading as judgement, and money judges harder.

      ⚠️ **THE GATE, upstream of any code: Stripe does not support Korea as a
      business location.** Verified 2026-09-15 rather than recalled, because it is
      the kind of fact that goes stale. Korea is absent from
      [stripe.com/global](https://stripe.com/global) and from the business-locations
      list on [Stripe's own Korea page](https://docs.stripe.com/payments/countries/korea).
      ⚠️ **`SK` in that list is Slovakia** — `KR` is the code that would mean Korea
      and it is not there. Easiest misread available, and an expensive one.
      **"Korea support" there means selling *to* Korean customers from a foreign
      entity, never *being* a Korean business**; Stripe does not pay out to Korean
      banks. So the first decision is the entity: a supported-country one (Stripe
      Atlas — $500, Delaware, ~2 business days, 175+ countries, ⚠️ Korean-resident
      eligibility **unconfirmed**, ask Stripe directly), or a Korean one, which
      drops Stripe entirely for a PG (토스페이먼츠 / KCP / 이니시스) needing
      사업자등록증 and a Korean bank account.
      **카카오페이 and 네이버페이 are Stripe payment methods with recurring
      support** (Samsung Pay and PAYCO one-time only) — so the Korean rails may
      need no second PG at all, which tilts the entity choice toward Atlas.

      ⚠️ **iOS sells nothing until the app is off Tegi's Apple account.** An IAP
      subscription binds to the app record, so the eventual relaunch under the
      user's own account **strands every subscriber** rather than migrating them.
      That is why this was web-only, and why it needed no build.

      **The shape, if it comes back:** (1) a Payment Link from the Dashboard, no
      code, to prove funds arrive and learn activation, test-vs-live and payout
      timing; (2) `/api/checkout` plus a signature-verified `/api/stripe/webhook`
      writing the entitlement. ⚠️ Entitlement comes from the **webhook**, never a
      `?success=true` redirect (forgeable); raw body via `req.text()`, not
      `req.json()`; idempotent `set()` rather than an increment — the **opposite**
      call from `progress_daily`, which is deliberately non-idempotent; and link
      customer↔uid at session creation (`metadata: { uid }`) or retrofitting it
      against live accounts is genuinely unpleasant. The entitlement must **not**
      live in `UserPreferences`, which is client-writable by its own rule.
      Provision via `vercel integration add stripe`, not `npm install stripe`.
      ⚠️ **Korean consumer law** binds any subscription sold to Korean customers,
      per Stripe's own page: full refund within 7 days if unused, pro-rated refund
      on cancellation at any time, 30 days' notice before a price rise, and a
      reminder 7 days before each charge. The first two bear directly on the
      deposit model.

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

- [ ] ⚠️ **Split 2026-09-14 — `writing.ts` is no longer deletable.** The grammar
      plan above brings writing back as the diagnostic (Decisions in
      [status.md](status.md)), and it wants `parseWritingReview`, the finding
      types, `WritingCardCandidate.gap` and `buildWritingCardDraft` — all still
      correct, plus `/api/writing` itself, unchanged. **Keep `writing.ts` and its
      route.** `grammar.ts` is the opposite case and can still go on the condition
      below: `getPatternExercise` and `gradeFromReview` are the generation and
      model-grading the new design explicitly rejects, so nothing will want them
      back. Treat the item below as being about `grammar.ts` only.

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
