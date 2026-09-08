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

**Queued: the mobile UI redesign, Expo SDK 57, and the shareable stats asset**
(PR #111 merged 2026-09-04; the asset landed 2026-09-07). 1.5.0 (build 14) is on
SDK 54 and predates all of it, so **testers are running none of this** — the tab
bar they have is still Learn-first with a Settings tab. The batch is worth a
release on its own; nothing needs to wait for a second feature.

⚠️ **Two things about the stats asset to check on the build, not in Expo Go.**
The Share control needs `EXPO_PUBLIC_API_BASE_URL` pointing at a deployment that
*has* `/api/stats-image` — against an older deployment the button fetches a 404
and reports a failure, which will read as a broken feature rather than a stale
backend. And the share path itself (`File.downloadFileAsync` →
`Sharing.shareAsync`) has **never run end to end**: no new native module is
involved, so Expo Go exercises the same code, but sharing is already on the
never-verified-on-a-binary list under Builds below.

⚠️ **Checking a build is not tracked here** (2026-09-04). The ranked list of what
1.5.0 had never been exercised on came off this file — all of it is reached by
using the app, so it surfaces in use rather than in a sitting spent working down
a list. The durable halves stayed elsewhere: the never-verified-on-a-binary
caveat under Builds in [status.md](status.md), and the Slow speed's fallback in
that file's Decisions entry. Reasoning in Decisions there too.

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
still earns its clause; a request to go and test something does not. **The
Kikuyu clause is no longer one of them** — a speaker read the list 2026-09-08,
and the sentence saying otherwise has already been cut from both locales rather
than carried forward a third build.

⚠️ **Cut the build without `--non-interactive`.** It does not skip prompts, it
turns one into an error — 1.4.0 died on an unanswerable Apple Team ID question
and burned build 12. The flag is for CI.

_A version bump queues another Beta App Review; 1.5.0's external approval covers
1.5.0 only. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._

⚠️ **This build is the first on Expo SDK 57**, so two pre-flight steps stop
being optional. `expo config --type introspect` — every native module moved,
and that is where an unasked-for entitlement shows up before a cloud build finds
it. And the **native-adjacent paths on the binary itself**: audio,
notifications, sharing, file system, the auth redirect. Expo Go runs the SDK's
own bundled native modules, so a clean Expo Go pass says nothing about them.
Upgrade notes in [lessons.md](lessons.md)._

⚠️ **Do not hand-run the OTA workflow before that build ships.**
`.github/workflows/mobile-ota-update.yml` is `workflow_dispatch`-only and its
push trigger is commented out, which is the only thing that stopped the #111
merge from publishing. `runtimeVersion` is `appVersion`, so an update published
now would target 1.5.0 — an **SDK 54 binary being handed an SDK 57 bundle**,
which does not degrade gracefully._

## High

Queued 2026-08-31, in the user's order. **One item is left of it.** Everything
else in this section either shipped — Spanish and Kikuyu packs, the pronunciation
speed dial in build 14, the shareable stats asset across four commits on
2026-09-07 — or was cancelled, with the reasoning in the Decisions entries in
[status.md](status.md) and the Kikuyu respelling item's durable half in
[lessons.md](lessons.md).

### What is left of the mobile UI redesign — queued 2026-09-01

Five of the six items have shipped: the tab rearrange, the Progress tab, the
settings redesign and the quick study-language switcher on 2026-09-04, which
moved pieces of the same screen and were built together for that reason, then
the shareable stats asset on 2026-09-07. **One remains**, and it depends on
nothing above.

⚠️ **The per-language write-path decision was taken with them** and is not
reopenable cheaply — verdict counts now live inside `byLanguage`, so retention
per language is derivable from 2026-09-04 onward and from no earlier date.
Reasoning in the Decisions entry in [status.md](status.md); the shape is in
[data-model.md](data-model.md).

- [ ] **Per-context pronunciation speed.** One setting drives every play button
      today, and the comment above the speed selector in `app/settings.tsx` says
      why: term, translation and example all render the same `PronounceButton`,
      so a second setting had nothing to name. The ask names two things it could
      split on — **content** (term vs example sentence) and **surface**
      (browsing vs learn/review).
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

## Medium

- [ ] **The signed-out save button is styled as disabled but is not.** Reported
      as "looks like it isn't clickable", and the cause is one line in
      `app/(tabs)/index.tsx`: the button carries
      `[s.saveBtn, !user && s.saveBtnDisabled]` while its `onPress` is
      `user ? handleOpenSave : handleSignIn`. So signed out it is painted
      `C.border` — the disabled treatment — and **it still works**. The label
      already says what it does ("Sign in to save flashcards."); only the paint
      disagrees.
      ⚠️ **Do not fix this by dimming it less.** A button that is enabled should
      not wear the disabled style at all — `saveBtnDisabled` has no other user
      on this screen, so the question is whether it should exist rather than
      what shade it should be. Signed out this is a *primary* action: it is how
      an account gets created.
      **Web already does something different and arguably better** — a filled
      primary button plus a separate underlined "Sign in to save flashcards."
      link beneath it (`app/page.tsx`), so it never paints one control two ways.
      Decide whether mobile adopts that shape or just stops lying about being
      disabled; the two platforms should not diverge further.
      Also worth checking the *contrast* while in there: `saveBtnText` is
      `C.bg` on `C.border`, which on the forest palette is a dark-on-dark pair
      that would likely fail a contrast check even if it were genuinely
      disabled.

- [ ] **Military specialties pack (병과 / 주특기, "MOS").** Infantry, engineer,
      signal, artillery, armor, logistics, medical, and the rest — the branch a
      soldier belongs to, which the two shipped military packs do not cover.
      **This is the only pack currently scoped**, and since the pack roadmap
      closed 2026-09-08 it is the only one tracked at all — a further pack now
      needs its own case made rather than a slot on a list.
      **English *and* Korean study languages, like the others**: it is a
      `BilingualPack` in `packages/core/src/military.ts`, so it derives both
      directions from one pair list via `derivePack(PACK, 'Korean' | 'English')`
      — follow `MILITARY_UNIT` / `MILITARY_AFFAIRS` exactly rather than
      authoring two packs.
      ⚠️ **The naming is itself a content decision.** 병과 (branch/corps) and
      주특기 (primary specialty) are **not the same thing** — 병과 is the corps
      you are commissioned or assigned into, 주특기 is the specific job code
      within it — and US "MOS" maps cleanly to neither: the US Army splits
      *branch* from *MOS*, and the Marine Corps, Navy and Air Force each use a
      different scheme again. Settle in the draft which of the two the pack is
      about, or section it explicitly into both, before writing entries.
      ⚠️ **ROK and US structures do not line up one-to-one**, which is exactly
      the failure mode the existing military packs were built to avoid — a
      correct-looking translation that misleads the listener. Expect `context`
      notes to do heavy lifting here.
      Follow `docs/packs/README.md`: **the model is not a source**, so every
      entry carries a tier and a citation, and the list is rendered through the
      app's own transforms before anyone believes it. The two existing military
      drafts are **bilingual pair lists** rather than a study side plus glosses
      — match that shape, and hand the draft to a reviewer rather than the TS.
      Needs user approval on the word list before shipping.

- [ ] **Readings are missing from mobile review — and then: what belongs on the
      review screen versus in settings.** Two halves, and the first is a plain
      parity bug rather than the design question it arrived as.
      **The bug.** `getReading` is what renders Kikuyu respelling, Japanese
      furigana + pitch accent, and Chinese pinyin. Web's review screen calls it
      (`app/review/page.tsx`, both faces of the card); **mobile's review screen
      does not call it at all** — mobile only uses it in `(tabs)/index.tsx` and
      `CardDetailModal.tsx`. So a Kikuyu learner reviewing on a phone sees the
      bare orthography, which for Kikuyu is the whole point of the aid. This is
      **not Kikuyu-specific**: Japanese and Traditional Chinese lose their
      readings on that screen too.
      ⚠️ **Ship the parity first and decide the setting after.** The ask arrived
      as "let users see Kikuyu pronunciation during review", but nothing is
      gated today — the render is simply absent. Adding a toggle first would be
      building a switch for a feature that does not exist on that screen yet.
      **Then the design question**, which is the item's real content. There is
      already an unstated rule worth making explicit: **the review screen holds
      session properties, settings holds durable preferences.** `directionFilter`
      and `typingEnabled` live in `review.tsx` state, reset every session, and
      the typed-answers Decisions entry in [status.md](status.md) argues that
      deliberately. Native language, study language, theme, pronunciation speed
      and reminders persist and live in `app/settings.tsx`.
      By that rule "show readings" is a durable preference and belongs in
      settings — *if* it needs to be optional at all, which is a real question:
      a reading is an aid, not a spoiler, and web has shown them unconditionally
      without anyone asking for a switch. **The cheapest correct answer may be
      no setting.**
      A second axis worth naming before building anything: a control can be
      *durable but scoped to review* (a default direction, whether typing starts
      on), which is neither of the two homes above and is the case that would
      justify a **Review section inside settings** rather than more controls on
      the review screen itself — where every added control costs the card its
      space on a phone.
      **And the settings screen itself is the third piece.** It is a flat list
      of unrelated rows — account, languages, theme, speed, reminders, privacy,
      data — with no grouping beyond the section headings it already has. If a
      Review group is being added, that is the moment to look at the whole
      screen rather than appending one more row.
      ⚠️ `settingsPronunciationSpeedDesc` is already load-bearing copy in both
      locales, and the per-context speed item above would change it. These two
      items touch the same screen — **read that one before starting this**.

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

## Bigger bets

- [ ] **Should `/api/explain` allow two glosses?** It still says "single best
      translation" across six prompt branches (12 templates), while a card back is
      allowed up to two when one would mislead. Changing the core lookup loop has
      a bigger blast radius than a new surface, so decide deliberately — and if
      yes, all branches move together.
      **This is now the only place the gloss ceiling is tracked.** The
      word-of-the-day divergence was cancelled 2026-09-08 (Decisions in
      [status.md](status.md)); if the ceiling here moves, that route is the next
      thing to look at, since its prompt is a single line missing the rule.

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
