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

Queued 2026-08-25, in the user's order. Two of the three are done — Swahili,
and audio on mobile review, which is built and waiting on a build rather than on
work. See the Decisions entry in [status.md](status.md) for what each settled.

**The two mobile review card bugs below were found 2026-08-28 while testing the
audio change and are not caused by it** — both are reachable on `main` without
it, and both were introduced by the typed-answer work. They were attempted in
the audio PR and **backed out on the user's call** so that PR stayed one
feature; the attempts are recorded here because knowing what has already failed
is the useful half. Neither has a verified diagnosis. **Start on a device, not
in the code** — the scroll one was reasoned from source twice and the answer was
wrong twice.

- [ ] **Review card: the details panel scrolls once, then sticks.** Reported on
      a device as "it works once and then gets stuck" when opening *dig deeper*
      details — details being simply the only content tall enough to need
      scrolling, which is what makes it look local to that panel.
      *Prime suspect, unconfirmed:* the card's `ScrollView` sits inside the
      `Pressable` that tap-to-dismisses the keyboard (added with typed answers
      in `184db17`), and [lessons.md](lessons.md) already records this exact
      class — an enclosing press handler and a scroll gesture compete for the
      same touch, so a drag is intermittently resolved as a press.
      *Two fixes already tried.* `pointerEvents="box-none"` on the `Pressable`
      **is verified not to fix it** — don't retry it. The likely reason:
      `pointerEvents` decides which view is hit-tested, but the responder system
      still bubbles the touch up the React tree and consults every ancestor, so
      a `box-none` ancestor stays in the negotiation. Swapping the component
      outright (`Pressable` when the card holds a field, plain `View` otherwise)
      was written and **never tested** — it was backed out with everything else.
      That one is still the most promising, and `lessons.md`'s own prescription.
      *Before writing any more code, answer this on a device:* does it stick
      **within one card** — scrolls a little, then frozen until you leave it —
      or does it work on the **session's first card** and not on later ones?
      Those are different bugs; the first is responder capture, the second is
      state not resetting per card. Every attempt so far assumed the first.

- [ ] **Review card: a multi-line typed prompt is drawn over the action row.**
      On a typed card the front is the *gloss*, and a gloss is routinely a
      phrase — "to be envious of someone's good fortune" runs to three lines at
      the card's 32pt display size. Check and *Show answer instead* then land
      across the input. Screenshotted 2026-08-28 on TOPIK 고급, English → Korean.
      *Root cause is already written down:* [lessons.md](lessons.md) — in a
      React Native column, content that does not fit is drawn over what is below
      it. The typed branch has no scroll and no shrink by design (a `ScrollView`
      there is what carried the word off the top when the field took focus), and
      `cardWrapSnug` is `flex: 0`, so nothing gives.
      *Do not re-trim padding.* The previous fix bought ~36pt that way, which
      resolved a one-line prompt and left the layout exactly as rigid — this is
      the same bug returning, not a new one.
      *And `adjustsFontSizeToFit` is a dead end:* tried with `numberOfLines={4}`
      and `minimumFontScale={0.6}`, and it shrank "accordingly; as a result" to
      illegible — far past the floor it was given. Verified on a device.
      *The shape that is likely right:* the prompt in its own bounded, shrinkable
      area with the field **outside** it, so a long gloss scrolls within its own
      box and focus cannot scroll the word away. The trap to design around is
      that a `ScrollView` with no flex and no height collapses to zero in a
      column, so the bounding has to be explicit.

- [ ] **Text-based pronunciation aid, per language.** **Plan before code** —
      the seam is cheap and the per-language answer is the whole problem.
      *The seam:* `getReading(card)` (`packages/core/src/types.ts:514`) already
      folds Japanese `furigana` and Traditional Chinese `pinyin` into one badge
      slot across the six Learn/review/detail render sites on web and mobile, so
      a third reading is one field plus one line there — not a conditional per
      site.
      *Why it needs clarification:* "the reading" isn't the same job in each
      language. Hangul is already phonetic, so romanising Korean teaches
      nothing — the useful aid there is the **sound change** (좋아요 → [조아요]),
      which is a different kind of data. French wants liaison/elision or IPA,
      Swedish pitch accent, English IPA for a Korean native. **Kikuyu has no TTS
      at all**, so a text aid is the only pronunciation support that language
      can ever get — likely the highest-value one, and the hardest, since it's
      tone. Swahili's stress is regular (penultimate), so it may want a rule
      stated once rather than per-card data.
      *So the call per language is which of three:* a stored `TermCore` field
      like furigana/pinyin (costs a field + a prompt branch + a backfill story
      for existing cards), a render-time transform off the term, or a static
      rule shown once in the UI. Only the first is expensive.
      *Two constraints on whatever fills it:* it comes from **`/api/explain`,
      the same route furigana and pinyin come from** — never a parallel prompt.
      And a wrong reading is permanent on the card and teaches wrong
      pronunciation every review, the same failure mode that kept noun class off
      Kikuyu, so accuracy has to be measured on real terms before it ships.

## Medium

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
