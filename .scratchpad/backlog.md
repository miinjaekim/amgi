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
offline review's schedule rather than ahead of it. Push notifications still
wants a build of its own — see below.

**Mobile shipping model: no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release. See [tech-stack.md](tech-stack.md).

---

## Queued for the next build

_Last build: **1.0.2 / build 4**, 2026-07-24._

- [ ] **Japanese & Chinese depth batch** (PR #49) — pronunciation for four more
      languages, the kanji/hanzi breakdown, the kana packs, and the
      single-character TTS fix. No new native module; all of it is invisible on
      the phone until a build ships.

- [ ] **Decks page + drill** (PR #50, merged 2026-07-25) — replaces
      `PacksModal` on both platforms. Still no new native module, so the build
      stays narrow. The kana packs from the batch above land on a page rather
      than in a modal, which is the surface most of that work is actually seen
      through.

- [ ] **Offline review on mobile** (PR #53, merged 2026-07-26) — the first
      thing in this batch that is *not* JS-only: it adds `expo-network`, so the
      "no new native modules" line above no longer holds for this build. That
      was a deliberate call — a build was going out anyway, and the alternative
      (deriving connectivity from Firestore's own signals) bought a worse banner
      to save a module. Note this is the one item here that cannot be smoke-
      tested for real in Expo Go: airplane mode plus a force-kill is the test,
      and the durable queue is the part worth verifying on the build itself.

- [ ] **Account deletion** (PR #55, merged 2026-07-27) — required by App Store
      Guideline 5.1.1(v), so this is a *submission blocker*, not a nice-to-have:
      an app offering account creation must offer in-app deletion. The web half
      is already live; the mobile half needs this build. Verify on the build
      that deletion actually signs you out and leaves no cards behind — it calls
      the deployed API, so `EXPO_PUBLIC_API_BASE_URL` must be right in the
      production profile, not just in the dev env.

**Pre-flight:** smoke-test in Expo Go → verify native-adjacent things (audio,
files, sharing, **offline review + reconnect sync**, **account deletion**) on
the build itself → bump
`version` in `app.json` → check `docs/testflight-beta-info-ko.md` is still
accurate.


---

## High — everything else user-facing

- [ ] **Push notifications — WOTD and streaks** — for an SRS app "remind me
      before I forget" is the product promise, not a growth hack. Prerequisite
      met: PR #47 fixed WOTD repeats, so a notification can't push a word you
      already saw. Needs `expo-notifications`, scheduling, per-type opt-in.
      Streak nudges are the easiest place to break "no dark patterns".
      Deliberately **not** in the next build — it brings a native module, so it
      wants a build of its own rather than riding along with a JS-only release.

_Privacy is done — see the Shipped entry for PR #55. The mobile half rides this
build; the web half went live on merge._

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
      *Next:* daily-draw UX; section themes as filters; more packs (TOEFL,
      TOPIK, and a JLPT pack pairs naturally with the Japanese work above);
      pre-authored content instead of per-word Gemini calls. Draft:
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
