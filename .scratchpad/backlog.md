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

**Pronunciation aid: transliteration + Japanese pitch accent** (2026-08-30).
Same terms — JS only on mobile. The **transliteration half needs no backfill and
shows on every existing card at once**, since it derives from the term; the
pitch accent half only appears on cards saved after deploy. Worth checking on
the binary: the badge is now two things joined by `·` (`す＼し · sushi`), so it
is the longest that slot has ever held — watch it at the narrowest phone width,
and on a long word like とうきょう. Reasoning in [status.md](status.md).

**Japanese pitch accent + the pronunciation notes** (2026-08-30). Same terms —
JS only on mobile, since the 2.7 MB accent table stays on the server and the
phone only renders what the card already carries. **Web gets the badge at
deploy; existing Japanese cards do not** — `pitchAccent` is filled when a card
is saved, so a card saved before this shipped keeps showing bare furigana until
it is looked up again. That is the designed fallback, not a bug, but it means
the feature looks absent on an old deck. Worth checking on the binary: the
mark is a full-width ＼ inside the badge (は＼し), so the badge should not
wrap or clip at the narrowest phone width, and the Kikuyu/Japanese note under
the Try: row should not push the search field off-screen. Reasoning in
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

- [ ] **Fix the Kikuyu respelling — it shipped wrong.** Merged known-faulty on
      2026-08-30 rather than gated, so **users are being shown incorrect
      pronunciations now**, which makes this the first thing to pick up here.
      The six candidate causes are in the header comment on
      `packages/core/src/transliterate.ts`, likeliest first: `c` is probably
      /ʃ/ and not /tʃ/, which would make `rũciũ` `roo-shee-oo` rather than
      `roo-chee-oo`. Also unresolved there: `th` /ð/ reads as *thin* not *the*,
      `g` /ɣ/ and `b` /β/ are fricatives respelled as stops, `r` is a tap, the
      `i`/`ĩ` and `u`/`ũ` collapse, and stress is unmarked.
      **Check against a speaker or a descriptive grammar, not by reasoning** —
      the standard the tone question was held to, and for the same reason:
      nobody on this project can hear the mistake. Capturing which words the
      reader saw as wrong is the cheapest first step.
      *Note the precedent this sits against:* the Kikuyu registry entry argues
      silence beats confidently wrong pronunciation, which is what kept the
      Swahili voice and noun class off the language. Gating the respelling off
      until it is right is a one-line change and stays on the table.

- [ ] **Text-based pronunciation aid — the five languages still open.**
      Japanese and Kikuyu are **done** (2026-08-30); the reasoning, and the two
      traps worth reading before touching either, are in the Decisions entry in
      [status.md](status.md). What that pass established is reusable, so this is
      no longer an open design question — it is five applications of a settled
      one.
      **Blocked behind the Kikuyu fix above** — the transliteration table is
      the mechanism four of these five would reuse, and extending a known-broken
      one propagates the bug.
      *The three mechanisms now exist in code:* a stored `TermCore` field filled
      by `/api/explain` (Japanese `pitchAccent`, and pinyin before it), a static
      rule via `pronunciationNote` (Kikuyu), and a render-time transform — which
      is the only one with **no implementation yet**.
      *What the measurement pass already answered for the rest,* probed three
      runs per term at the route's own temperature:
      - **Korean** — the aid is sound change (좋아요 → [조아요]), and it should be
        a **render-time transform, not a model field**. Head to head on 18
        terms: rules 17/18, Gemini 14/18, and the failure sets barely overlap —
        the model misses regular phonology by returning "no change" (신라, 급행,
        한국말), rules miss only what needs a morpheme boundary (값어치, 솜이불).
        A working 표준 발음법 prototype scored 37/40 — it is in
        `docs/pronunciation-research.md` with the numbers behind it, and would
        need rewriting against `packages/core` before shipping.
      - **Spanish and Swahili** — stress, derivable from spelling alone. A
        prototype scored 16/16 and 9/9 first try (also in
        `docs/pronunciation-research.md`). Cheapest of the five. Caveat: those
        expectation tables were author-written, so they test the implementation
        more than they test the assumptions — unlike Korean, which is checkable
        against 표준국어대사전.
      - **French and English** — IPA, and the model is *accurate* here (~16/17
        and ~15/15 on content). The defect is **formatting**: half the runs
        wrapped in `/…/` despite the prompt forbidding it, and English drifted
        GA↔RP. So this is a stored field plus a normalizer that strips
        delimiters and pins the variety, not a new prompt idea.
      - **Swedish** — pitch accent was unstable on 10 of 16, and `sked` came
        back `ˈskeːd` with a literal /sk/, which is the beginner error the aid
        exists to prevent. **Do not ship it off the model.** Japanese is the
        precedent for what would work: a lexical source. Not yet looked for.
      *The one rule that outlived the pass:* readings come from **`/api/explain`,
      the same route furigana comes from** — but "from the route" and "from the
      model" are not the same thing, which is what the Japanese lookup proved.

## Medium

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
