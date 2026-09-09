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

⚠️ **Build 15 also clears a live cosmetic regression.** The subpack remap ran
2026-09-09 against production, so build 14 shows every pack as a raw slug
(`toeic-core/verbs`) in the review picker and the deck chips — it predates the
code that resolves those ids. Web was fixed by deploying #116; mobile cannot be
until a build. See Known Issues in [status.md](status.md).

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

Two queues, kept apart because they were asked for a week apart. **Hanja
(2026-09-09) is the newer and the larger**; below it, one item is left of the
2026-08-31 queue — everything else there either shipped (Spanish and Kikuyu
packs, the pronunciation speed dial in build 14, the shareable stats asset
across four commits on 2026-09-07) or was cancelled, with the reasoning in the
Decisions entries in [status.md](status.md) and the Kikuyu respelling item's
durable half in [lessons.md](lessons.md).

### Korean Hanja — a study language, three-sided cards, 급수 packs — queued 2026-09-09

Asked for as one thing; it is three. Take them in this order — each is usable
without the next.

✅ **None of the three touches the scheduler.** The first read of "three-sided"
looked expensive, because a third review direction would have meant editing a
two-member union read in 92 places across 24 files and written into every
Firestore document in every language. **It is not that** (see 2 below): three
parts split front/back is three partitions × the two directions that already
exist, so `ReviewDirection` does not grow. What is left is a registry entry, two
new card fields, a pack-shape extension, and a front/back setting — all
additive, none of it under the scheduling code every other language runs on.

#### 1. `Hanja` as a `StudyLanguage` — ✅ shipped 2026-09-09

- [x] **Add the registry entry, its Gemini prompt branches and its i18n keys.**

The registry in `packages/core/src/types.ts` was built for this, and it held: an
entry, one `/api/explain` branch, two i18n keys and one line of example terms
per app. Nothing conditional spread anywhere else.

What the item asked to settle first, settled:

- **The name collision is gone, by migration.** `hanja` on `TermDepth` — the
  deprecated field holding legacy Korean cards' character breakdown — is
  removed, and `migrate:legacy-hanja` moves those cards onto
  `characterBreakdown`. `getCharacterBreakdown()` lost its fallback. The
  alternative was a guard keying the fallback on study language, which works and
  leaves two meanings under one name forever; the user chose the migration.
  ⚠️ **The script must never see `cards_hanja`** — there `hanja` is the front of
  the card — and it excludes Hanja by construction rather than by filter.
- **An English native gets 훈음 *plus* a gloss** — user's call 2026-09-09. 水 is
  물 수 to every reader and "water" is a different fact about it, not a
  translation. So the Hanja branch of `/api/explain` asks for `korean` outright
  instead of going through `nativeBackRule`, which is empty for an English
  native. `getBackSideConfig` still answers correctly for the gloss slot, which
  is all it is asked for; 훈 and 음 become fields of their own in 2 below.
- **No `characterSectionKey`.** A card whose front is one character has nothing
  to break into characters, so the depth prompt leaves the section out. Korean
  keeps `sectionHanja` for the question it does answer, and the keys never meet.
- **No TTS fields yet, and the missing piece is the text, not the voice.**
  `ko-KR` + `ko-KR-Neural2-C` is settled and written down in the entry; what is
  not is what to hand it, since the 음 has no field until 2 below. Both apps hide
  the pronunciation button while these are unset.

Verified against Gemini, six probes on the live route: 水 → 물 수 / water, 學 →
배울 학, 樂 → ambiguous across 즐길 락 / 노래 악 / 좋아할 요, 学 → corrected to
學 by the spellcheck rule that already bans Simplified forms, 물 → 水, and a bare
음 (수) → ambiguous across 水 手 數 受 首, each label carrying its own 훈음.

⚠️ **Two manual Firestore steps remain**, the ones every new collection needs
and neither of which is in the repo: security rules for `cards_hanja` (no
wildcard support — add them in the console) and the composite index on
`archived + createdAt`, which Firebase offers a creation link for on the first
failing query.

#### 2. Three-sided cards — ✅ shipped 2026-09-09

- [x] **Store 훈 and 음 as separate fields; let the learner choose the split.**

A card holds three parts — 한자 (水), 훈, the meaning (물), and 음, the sound
(수). 훈음 is the two read together (물 수); 독음 is the sound a character takes
inside a word. **At review the learner picks which parts are on the front**; the
rest fall to the back. Sometimes the character alone with 훈음 behind it,
sometimes 훈음 with the character behind it, sometimes two parts up and one
behind.

✅ **This does not need a third `ReviewDirection`, and that is the whole
difference in cost.** Three parts split into a front and a back is six
configurations, and those six are exactly **three partitions × the two
directions that already exist**:

| partition | forward (`frontToBack`) | reverse (`backToFront`) |
|---|---|---|
| 한자 \| 훈 + 음 | 水 → 물 수 — the exam's main question | 물 수 → 水, write it |
| 훈 \| 한자 + 음 | 물 → 水 수 | 水 수 → 물 |
| 음 \| 한자 + 훈 | 수 → 水 물 | 水 물 → 수 |

So `frontToBack` / `backToFront` keep meaning exactly what they mean today —
forward and reverse — and the names stay true. **The 92 call sites across 24
files are untouched.** What is new is *which partition is in play*, and that is
a setting, not a scheduling axis.

✅ **The partition is a display setting, chosen deck-level — decided by the
user 2026-09-09.** The learner picks a partition and the card is scheduled on
the two directions it already has, so `sm2.ts`, `reviewQueue.ts`,
`offlineReview.ts` and the direction filter need **no change at all**.

The alternative was scheduling per partition — six tracking slots on the
document. Correct, and far more than anyone asked for.

⚠️ **The accepted cost: switching partition inherits intervals earned answering
a different question.** Deck-level rather than a per-session toggle is what
keeps that small — chosen once, the way a study language is. **Do not put this
control in the review session**, which is where it would drift into a toggle and
make the inherited intervals meaningless.

The reopen path is cheap and stays open: partition-keyed tracking is additive,
so it can be layered on later without invalidating anything stored. Reopen it if
switching turns out to be common rather than a one-time setup.

⚠️ **Do not pre-assemble the back.** The kanji pack renders `meaning — readings`
into one authored string (`물 — みず / スイ`), which is right there because the
split never moves. Here it moves by definition, so 훈 and 음 must be **separate
fields** on the card and stay that way through the pack, the draft and the
renderer. This is the concrete reason a pack cannot do this and a registry entry
can — a pack cannot add a field.

⚠️ **`PackBack` has two slots for two *languages*, not three parts.**
`PackEntry = { study, back: { English?, Korean? }, context? }` cannot express
한자 + 훈 + 음. The pack shape needs extending before entries can be authored —
settle it in the draft.

✅ **What it does not have to settle any more is what an English native sees.**
That was decided with 1 above: 훈 and 음 are Korean and shown to every reader,
and an English gloss is *additional*. So the shape a pack entry needs is four
authored parts — 한자, 훈, 음, and an English meaning — not two backs. The
lookup route already returns exactly that quartet.

⚠️ **A two-part back breaks the typed-answer grader's assumption**, so
**typing is off on Hanja in both directions** — the cheapest honest answer, and
`promptsForTyping` now takes the study language to say so. Two reasons rather
than one: `gradeTypedAnswer` grades against *a* side, so a typed 물 against a
back of 물 수 is neither right nor wrong until someone decides whether both
parts are required; and on the default partition the expected answer is a glyph
most learners cannot type at all. Additive if anyone asks for it.

Progress rolls up verdict counts per language (`byLanguage`, 2026-09-04) and
that keeps working unchanged — another consequence of not growing the union.

**What shipped, beyond the two bullets above:**

- `hun` and `eum` on `TermCore`, beside `furigana` and `pinyin` rather than as
  `CardSideField`s — those name the *languages* a card has sides in, and both
  of these are Korean.
- `hanjaFaces(card, partition)` is the **only** place the three parts are ever
  joined, and the back keeps 한자 · 훈 · 음 order whichever part was lifted out.
  It falls back to the character partition on a card that cannot be split, so
  the part-1 cards that carry the 훈음 assembled in `korean` still review.
- `korean` is still written on save, derived through `hunEum()` — so the card
  list, the detail modal, CSV and Anki export need no idea partitions exist.
  Derived at the one point a card is written, never authored.
- `directionLabel` and `directionPrompt` name the *parts* on Hanja (한자 → 훈 ·
  음), composed from three short part names rather than six hand-written pairs.
- The picker is in settings on both platforms and **only there**, shown only
  when the study language is Hanja.
- An English native gets the gloss under the 훈음 on the reveal, in both
  directions — the 2026-09-09 decision, rendered.

Verified against Gemini: 水 → 물 / 수, 學 → 배울 / 학, and 物 → 만물 / 물, which
is the case worth having — the 훈 and the 음 are different words that both
contain 물, and one pre-assembled string would have to be taken apart by a
parser guessing where the 훈 ends.

⚠️ **One prompt-adherence miss, not fixed here.** 物 came back with
`english: "thing, object, matter"` — three glosses, where the shared
`GLOSS_RULE` caps the field at two. The rule is one shared string across every
prompt on purpose, so this wants fixing there or not at all; a Hanja-specific
gloss rule is exactly the fork that rule exists to prevent.

#### 3. 급수 packs from 전국한자능력검정시험 배정한자

- [ ] **Author 8급 through 6급 as five subpacks. Stop there.**

**Scope is 8급, 7급II, 7급, 6급II, 6급** — set by the user 2026-09-09. The ladder
runs to 1급 and there is no plan to climb it; anything past 6급 needs its own
case made, like any pack.

Source: <https://namu.wiki/w/전국한자능력검정시험/배정한자>.

⚠️ **Cite 한국어문회, not namu.wiki.** Per `docs/packs/README.md` a
community-contributed wiki is the bottom tier and is treated as *contaminated*,
not merely thin. But the underlying facts are not wiki claims: the 배정한자 list
is a **published exam specification**, and 어문회 publishes an official
**대표훈음** for each character. That makes this the rare pack whose content is
authority-specified end to end — 물 수 is not a judgement call the way a Kikuyu
gloss was. Use namu.wiki as a convenience index, cite the official list, and the
tiering stays honest.
⚠️ **namu.wiki returns 403 to automated fetches** (checked 2026-09-09), so
there is no scripted transcription path from it. Budget for it or find the
official list in a machine-readable form.

⚠️ **Levels are cumulative, sections are not.** A 8급 character is also on the
7급 list. `docs/packs/README.md` pins that **a term appears in exactly one
section of its pack** — that is what lets `scripts/remap-pack-subpacks.ts`
derive a card's subpack from its study side, and it is enforced in
`apps/web/src/services/collections.test.ts`. So a section holds the characters
**newly assigned at that level**, never the cumulative list. Name the sections
for the level (8급, 7급II, …); those names are user-facing copy in the review
picker now.

**Stopping at 6급 keeps this the size of a pack that has already shipped.**
Cumulative to 6급 is ~300 characters against the kanji pack's 240 and TOEIC's
~160 — a known quantity, not a new class of undertaking. The full ladder is
what would not have been: it passes 1,000 by 4급 and ~1,817 by 3급.
⚠️ **The per-level counts are unverified.** The figures to hand are 50 / 50 / 50
/ 75 / 75 newly assigned (50 / 100 / 150 / 225 / 300 cumulative); a search
corroborated the *upper* rungs of the same series (3급II 1,500, 3급 1,817, 2급
2,355, 1급 3,500) but not these five. Confirm against the official 어문회 list
before the section sizes are treated as real.

⚠️ **The "All" chip problem arrives here at the same scale as the kanji deck,
not a larger one** — which is the other thing stopping at 6급 buys. Single-glyph
packs whose back carries readings are `layout: 'list'`, and `isGridDeck` exempts
only *grid* decks from the All chip; that is already tracked for the 240-card
kanji deck under Medium below. ~300 Hanja cards make it the same question asked
twice rather than a new one, so **decide it once, on the kanji item, and let
Hanja inherit the answer**.

⚠️ **The kanji pack already holds 240 Korean 훈음**, authored and reviewed
(`docs/packs/kanji-pack-draft.md` — 水 물 수 → 물). Free corroboration for the
overlap, and a **drift risk**: the same character's 훈음 would then live in two
files. Decide whether Hanja reads from the kanji rows, the other way round, or
neither, and write down which.

**The per-level rule in [vision.md](vision.md) was amended for this**, on the
user's call 2026-09-09 — per-level content is allowed where levels make content
approachable and navigable, and is still refused where it is structure for its
own sake. A 급수 ladder is the first case: it is a published curriculum ordering,
the same argument the kanji pack made for 학년별한자배당표 over a JLPT tier.
Reasoning in the Decisions entry in [status.md](status.md).

Needs user approval on the word list before shipping, like every curated pack.

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

- [ ] **Military specialties pack (병과 / 주특기, "MOS").** Infantry, engineer,
      signal, artillery, armor, logistics, medical, and the rest — the branch a
      soldier belongs to, which the two shipped military packs do not cover.
      Since the pack roadmap closed 2026-09-08 a pack needs its own case made
      rather than a slot on a list; this one and the Hanja 급수 packs under High
      are the only two tracked.
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
