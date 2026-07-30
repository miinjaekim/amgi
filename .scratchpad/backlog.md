# Backlog

Ordered by priority. **Only open work lives here** — shipped, cancelled and
decided items move to [status.md](status.md), reasoning included, so a closed
call doesn't get reopened from this file. Source of truth is the user's Google
Tasks list; this is the scoped version. Last synced 2026-07-26.

**Focus (2026-07-25): ship the depth work to the phone.** The Japanese/Chinese
depth batch is merged but invisible until a build goes out, so the next build is
deliberately narrow — nothing that isn't already on `main`.

_Amended 2026-07-26:_ "no new native modules" was part of that narrowness and no
longer holds — offline review (PR #53) brings `expo-network`. Taken knowingly: a
build was going out regardless, and the module buys an accurate offline banner
and a prompt flush on reconnect. It does mean the depth batch now ships on
offline review's schedule rather than ahead of it. The same reasoning then
applied to reminders (PR #61): once one native module is in the build, a second
rides along for free rather than costing a build of its own.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. See [tech-stack.md](tech-stack.md).

---

## Queued for the next build

_Last build: **1.1.0 / build 6**, 2026-07-27 — submitted and under review for
external testing._

Merged since, waiting on the next build. All three are JS-only, so no native
module was added and `expo config --type introspect` is not needed this time:

- **Direction choice on mobile Review** (PR #65)
- **A second Learn tab tap clears the search** (PR #66)
- **Card backs follow native language** (PR #67) — the one worth testing
  deliberately; see the What to Test block in
  `docs/testflight-beta-info-ko.md`, which was rewritten for this build.
  Production data was already backfilled and de-duplicated, so a Korean-native
  tester's existing kana cards should read hangul the moment the build lands.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing, **offline review + reconnect sync**, **account deletion**,
**the review reminder actually firing and then disappearing once you review**)
on the build itself → bump `version` in `app.json` → check
`docs/testflight-beta-info-ko.md` is still accurate → **`expo config --type
introspect` if any native module was added**, which is where an entitlement you
did not ask for shows up before a cloud build finds it.

_The listing check earned its place in this list on 2026-07-27: it still
advertised five study languages after Traditional Chinese made six, and said
nothing about account deletion — which Apple looks for under 5.1.1(v)._


---

## High — everything else user-facing

## Housekeeping — broken tooling that hides signal

`npm test` and `npm run lint` are both green on a clean checkout as of
2026-07-26 — see the Shipped entries in [status.md](status.md). What is left
here is what those two now *show*.

- [ ] **13 React Compiler warnings, then turn the rules back up** — `eslint-config-next@16`
      brought `react-hooks/set-state-in-effect` (11) and `react-hooks/immutability`
      (2), and they are real: a `useEffect` that calls `setState` synchronously
      renders twice on mount. Set to `warn` in `apps/web/eslint.config.mjs` so
      landing the lint fix didn't mean landing 13 rushed ones. Most want
      `useSyncExternalStore` — `useOnlineStatus` reading `navigator.onLine`,
      `review/page.tsx` setting `clientNow` to dodge a hydration mismatch — so
      each is a small design call, not a mechanical edit. Clear them, then
      delete the override; **don't silence them further**, which is the failure
      mode the override exists to avoid.

- [ ] **Lint covers `apps/web` only** — `@amgi/core` and `@amgi/mobile` have no
      `lint` script, so `turbo lint` runs one package and reports success.
      Honest today, misleading the moment it gates CI. Mobile needs
      `eslint-config-expo` (`npx expo lint` installs it and writes the config);
      core needs a small flat config of its own. Do it with the CI gate, not
      before — a lint nobody runs is the thing this section is about.

## Medium

- [ ] **Vocabulary packs — iterate beyond v1** — v1 shipped in PR #34 (TOEIC,
      133 words). *Principles (2026-07-13):* audience is not beginners; packs
      unlock domains, never "starter" anything; curated from real sources, not
      AI-generated; word lists need user approval before shipping.
      *Next:* daily-draw UX; section themes as filters; more packs (TOEFL, and
      a JLPT pack pairs naturally with the Japanese work above); pre-authored
      content instead of per-word Gemini calls. Drafts:
      `docs/packs/toeic-pack-draft.md`.

- [ ] **Drill for lookup packs** — lowered from High 2026-07-25: the payoff is
      thin. Drill currently reads the pack, so only `cards` packs (the kana) have
      a Drill button. A `LookupPack` holds words with no back side, so there is
      nothing to check an answer against. Making TOEIC drillable means drilling
      the user's *saved cards* for that pack instead, which needs `packId` —
      read via `getCollectionId` since PR #51. But `packId` is written only by
      `buildPackCardDraft`, so a TOEIC word saved through Learn still carries
      none: this now needs the Learn flow to stamp the pack it came from, which
      would also give lookup packs a review collection of their own. That is the
      real prerequisite, and it is the more valuable half — drill would still
      duplicate a loop those cards already have.

- [ ] **Stamp `packId` on words saved through Learn from a pack** — surfaced by
      PR #51. A pack word reaches Learn as `?term=`/`context=`, and whatever you
      save there carries no pack, so a `lookup` pack (TOEIC) has no review
      collection and no "Review this deck" — only `cards` packs (the kana) do.
      Carry the pack id through the handoff and into the draft and the asymmetry
      goes. Weigh one thing first: those cards then *leave* `/cards`, same as
      kana. For a word you chose to look up and thought about, that may be the
      wrong call — the deck is where it came from, not necessarily where it
      belongs. Decide that before building; it is the whole question.

- [ ] **Export covers only your own cards** — noticed in PR #51, not decided.
      `/cards` export reads the now-scoped list, so a CSV/Anki dump omits every
      pack card. Consistent with what that surface means, but a *backup* that
      silently drops 107 kana is a different thing from a scoped view. Either an
      export on the deck page, or an "include pack cards" option — small either
      way, but pick one deliberately.

- [ ] **Offline term capture** — jot terms to look up later, queued locally and
      resolved on reconnect. No model needed, just a queue and a flush.

- [ ] **Grid view for cards** — denser scanning of a large deck. Nobody's
      blocked on it.

## Parked — generation features

Deprioritized 2026-07-24. Both generate word lists for a user who hasn't asked
for a specific word — a different, unproven job from the core "I met a word,
explain and remember it" loop. Revisit after the language-depth work.

- [ ] **Goal-based vocab lists: ambiguity + placement** — (1) ambiguous terms
      are silently skipped; add a picker or pass the goal to `/api/explain` as
      context. (2) Move generation out of the Import button into its own home.
      Decide placement before building.

- [ ] **Card generation (goal-based)** — the Learn page has a coming-soon
      placeholder. Lean surface: goal input → list with checkboxes → one
      free-text refine field → save. `/api/vocab-list` already takes
      `previousWords` + `feedback`; deliberately no too-basic/too-advanced chips.

## Bigger bets — need design first

- [ ] **Writing review** — submit writing, get grammar feedback *plus* how a
      native would express what you were reaching for. The second half is what
      fits Amgi's premise. Open: input surface, whether corrections generate
      flashcards (that's the loop back into the product), length limits, and
      whether submissions are stored or ephemeral.

- [ ] **Conversation practice** — transcription + per-participant feedback; MVP
      is end-of-conversation feedback on a recording. Same "here's what you
      meant to say" model as Writing review — scope the two together.

## Research / exploratory

- [ ] **Offline definitions/translations** — the hard phase of Offline Amgi
      (on-device model or pre-cached content). It was never allowed to block the
      cheap offline work, and that held: offline review shipped in PR #53 and
      offline term capture is still queued above, both without it.
- [ ] **Training a language-learning model / survey existing ones** — spike:
      what exists, whether fine-tuning beats prompting, what a first step looks
      like. Would inform offline definitions.

## Needs clarification

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in the
      prompt.
- [ ] **Shared term cache** — `terms` collection keyed by normalized term +
      language. Defer until traffic justifies it. Overlaps with pre-authored
      pack content.
