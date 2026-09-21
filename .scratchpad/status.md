# Project Status

Session orientation: what's live, what's broken, what's decided.

**Shipped history is not recorded here** — git and GitHub already track it, and a
second copy only goes stale. What belongs in this file is what those two can't
show: the reasoning behind closed calls (Decisions), the console and binary state
that lives outside the repo (Builds, TestFlight), and what is currently
unverified.

_Reconciled against `release/1.7.0` @ `cb7c19c`, 2026-09-19. `npm test` 639/639
and `npm run lint` 0 errors / 21 warnings, both measured._

## Now

- **Munli's bar mirrors Amgi's** (PR #142, 2026-09-22): Practice · Tables ·
  Writing · Topics · Progress, matching Review · Cards · Learn · Packs ·
  Progress slot for slot. **Tables** is the new one — the inventory of what you
  are learning, which Topics had been doing as a second job.

- **The practice set is also the reference** (PR #141, 2026-09-22). Munli's
  **Topics** tab lists one row per grammar topic — Verbs today — and the verbs
  screen carries the conjugation tables themselves: a chip per verb, opening its
  paradigm with persons down and tenses across, every tense whether or not it is
  enrolled.

- **Conjugation is scheduled by rule, not by verb** (PR #140, 2026-09-22). A
  regular group is the item and the verb it is asked through varies; irregular
  verbs stay per-verb and are still unsourced. A **Verbs** tab holds the practice
  set — which tenses and groups exist to be practised — and is where progression
  happens. Conjugation data now rides the live `users/{uid}` subscription on both
  platforms, so practising on one device reaches the other without a relaunch.

- **Practice is a session that ends** (PR #139, 2026-09-22). Munli's first tab
  is Practice: a picker row per practice type, a setup screen (tenses, and an
  explicit switch for practising tables that are not due), then a session fixed
  at Start that finishes when its queue runs out. Conjugation progress is owned
  once for the mode, which fixes a rating being invisible on the Progress tab
  until the app restarted.

- **Munli uses Amgi's shell** (PR #138, 2026-09-22): the same tab bar, the same
  Progress-tab header with its settings gear, plus a mode button beside it in
  both modes. Munli's tabs are Conjugation · Writing · Progress, and its Progress
  measures conjugation. Reverses the Stack-not-Tabs call of the day before, on
  the user's call after using it. ⚠️ **First change in this series the user has
  actually held**; the rest of it is still unseen on a device.

- **Verb conjugation practice** (PR #137, 2026-09-21). Munli's first tool built
  from scratch: one question is one box, the schedule belongs to the table, and
  the content is a rule engine rather than authored forms — French regular verbs
  across three tenses, with irregulars held behind the sourcing gate. ⚠️ **Web is
  live; native is in no build, nobody has answered a question, and the Firestore
  write path has never run.**

- **Writing review is back, as Munli's first tool** (PR #136, 2026-09-21).
  Restored from the removal commit rather than rebuilt; the surface is unchanged
  and its address is not — it was the passage half of Learn and is now a Munli
  tool of its own, so the Word/Passage toggle does not return. ⚠️ **Web is live;
  native is in no build, and no passage has been submitted through it on either
  platform.**

- **Amgi hosts modes, and Munli is the second one** (PR #135, 2026-09-21). The
  shell only — Munli's home says it has no tools yet, which it does not. The
  mode is read off the route on both platforms (`/munli`); the only thing stored
  is which mode a cold open lands in, in a cookie on web and one AsyncStorage
  key on native. Holding the last tab opens the switcher on native; on web it is
  a row at the top of the account menu. ⚠️ **Web is live; native is in no build**
  — see Queued for the next build in [backlog.md](backlog.md). Verified by suite,
  compiler, `next build` and `expo export`; **nobody has looked at either surface
  on a device or in a browser.**

- **1.7.0 is build 16**, cut 2026-09-19 from `cb7c19c` on `release/1.7.0`, with
  the Android APK as `versionCode` 6 from the same commit. ⚠️ **Approval is not
  recorded here because it has not been reported** — 1.6.0's external approval
  covers 1.6.0 only, so testers get this build after a fresh Beta App Review, and
  whether the Test Information paste and that submission have happened is console
  state the repo cannot see. Confirm before assuming.
  **Pre-flight was clean**: `expo config --type introspect` came back
  `entitlements: {}` on the `react-native-svg` build, the TestFlight copy was
  rewritten for both locales, and its character set diffed against the copy Apple
  accepted for 1.6.0 — 42 new characters, 39 precomposed Hangul, nothing outside
  the BMP. **Step 1 was half done for the first time on any build**: smoke-tested
  in Expo Go before the builds were started. The binary half is still undone, as
  the never-verified ⚠️ below says.
  It carries eight merges since build 15 — the progress-display rework
  (retention off, labelled calendar, cards learned, the weekly chart), the
  per-language progress detail with its two charts, the share screen that
  actually reaches the OS sheet, an explanation language per study language,
  tap-to-save in packs, and the streak-count fix.
  ⚠️ **The per-deck language change migrates every existing account on first
  load**, and build 15 is in testers' hands reading the old field — which is why
  `nativeLanguage` is still written alongside `interfaceLanguage`. Nobody has
  watched that migration run against a real multi-deck account.
- **1.6.0 (build 15) is live in TestFlight and approved for external testing**
  (2026-09-10), approved the same day it was submitted. It carries eleven merges
  since build 14 — the mobile UI redesign, Expo SDK 57, Hanja as a study
  language with its 급수 pack, subpacks, the shareable stats image, readings in
  mobile review, and the 병과와 주특기 section. External testers can be invited
  without another review as long as the version doesn't change.
  **It is the first binary on SDK 57**, where every native module moved at once
  rather than one arriving — which is what makes the never-verified list below
  matter more on this build than on the last two. `expo config --type
  introspect` came back clean before the build: `entitlements: {}`, so
  `withoutPushEntitlement` still strips `aps-environment` on 57.
  It also clears the raw-slug regression build 14 could not — pack names resolve
  again in the review picker and the deck chips.
- ⚠️ **Nothing in 1.6.0 has been checked on a binary**, and the native paths
  under Builds have never been verified on *any* build — now with SDK 57 under
  them, which moved every one of those modules at once. **No release now routes testers to that
  list**: What to Test was cut to what's new on 2026-09-02 and 1.6.0's was
  written to the same rule, so nothing asks for it by name. As of 2026-09-04
  it is **not tracked as work either** — the checks come from using the app
  (Decisions, below). The one item with a decision hanging on it is the **Slow
  speed**, a pitch-corrected 0.7× stretch rather than a slow synthesis: if it
  reads as an artifact the fallback is server-side rates behind the same three
  chips, and that is written down in its Decisions entry, not waiting on a list.
- **Mobile merges are unblocked.** The freeze holds only until submission; the
  next mobile change waits for build 17.
- **Languages are per-deck** (2026-09-12, merged as PR #127, on mobile in build
  16). Each study language carries the language it is explained in, and the app's
  own language is a separate setting — see the Decisions entry below.
  ⚠️ **It migrates every existing account on first load**, seeding the language
  list from the collections that hold cards, and **nobody has watched that run
  against a real multi-deck account** — not on web, where it has been live since
  the merge, and not on a binary. `nativeLanguage` is still written alongside
  `interfaceLanguage` because build 15 is in testers' hands and reads the old
  field; that stays until build 15 is out of circulation, which external approval
  of 1.7.0 does not by itself accomplish.
- **The progress dashboard is on both platforms** (2026-08-20) but only in users'
  hands on web, since mobile ships by build. Daily rollups are written on every
  rating and every card save. The Firestore security rule for
  `users/{uid}/progress/{day}` is live in the console — it was the one blocker,
  since without it every write fails `permission-denied` *silently* by design.
- ⚠️ **Progress history began 2026-08-20 and cannot be backfilled.** New cards
  per day could be reconstructed from `createdAt`; review history cannot be
  reconstructed from anything. So the calendar is near-empty for weeks by
  construction — expected, not a bug, and the empty state says so.
- **The progress-display work landed 2026-09-12, and it reaches users in three
  different ways.** ⚠️ Worth keeping straight before wondering why a change is
  or isn't visible. **The shared image is server-side**, so build 15 devices
  already get the language line and already lost the retention tile — no build,
  no OTA, nothing to ship. **Web** has all five changes as soon as it deploys.
  **Mobile's own screen** — the labelled calendar, the corrected ramp, the cards
  learned tile, retention off the language row, the share preview screen —
  is in build 16, so it reaches a tester when that build does and not before.
  The reasoning is in the Decisions entry of the
  same date; the one thing that is *not* recorded anywhere else is that none of
  it has been looked at: the colours were computed and validated, the layouts
  were not.
- **부대·참모 has an eleventh section: 병과와 주특기** (2026-09-09), **word list
  approved the same day**. 24 pairs placed third, after 계급·호칭 and
  부대·편제 — the branch a soldier belongs to and the job inside it, which
  neither military pack covered. It is a section, not a fourth pack: it started
  as a 66-entry pack across all four services and the user cut it to the common
  terms inside the pack that already answers "what unit" and "what rank".
  The pack is now 244 pairs; nothing else about it changed, and both directions
  pick the section up from the one authored pair list as before. It is a subpack,
  so it can be enrolled and reviewed on its own. No console step: it writes into
  `cards` and `cards_korean`, live for months. `npm test` on web is 553/553.
  **It is the first military content authored under the sourcing standard**, so
  every row in `docs/packs/military-branches-subpack-draft.md` carries a tier and
  a citation — 7 A, 16 B, 1 D, no C. The branch inventory is 「군인사법」 제5조;
  the back is the US counterpart branch, and the hint carries 법제처's official
  English wherever the two disagree, which is the reason the section is worth
  having: 병참과 is the Quartermaster Corps and the official English calls it
  "logistics", which in the ROK Army is a different branch again.
  ⚠️ **Branch names take the statute's form — 보병과, not 보병.** Six bare forms
  are already cards in the same pack, and a branch is not the arm; a test pins
  the form rather than leaving it to style. **This is the call most likely to be
  wrong**, since a soldier asked their 병과 answers "보병".
- **Hanja is a study language on both platforms** (2026-09-09), the tenth
  registry entry — an entry, one `/api/explain` branch, two i18n keys and a row
  of example terms per app. Lookup verified against the live API, six probes:
  水 → 물 수 / water, 學 → 배울 학, 樂 → ambiguous across its three 훈음, the
  Japanese form 学 → corrected to 學, 물 → 水, and a bare 음 (수) → ambiguous
  across five characters.
  **All three parts landed the same day.** 훈 and 음 are separate fields, the
  learner picks which part leads from settings, review reads its two faces
  through `hanjaFaces()`, and the 급수 pack is 300 characters over five
  subpacks. Typing is off on this deck.
  Audio landed the same day: the button speaks the 음 (수), never the glyph, and
  refuses to render without one.
  **Both console steps are done** (2026-09-09, reported by the user while
  preparing build 15): `cards_hanja` has its security rule and **both**
  composite indexes. `migrate:legacy-hanja` has also been run against
  production, so the deprecated `hanja` depth field is off Korean cards and
  their breakdown now lives in `characterBreakdown` — which build 14 reads too
  (`characterBreakdown || hanja`), so that migration was safe in both
  directions, unlike the subpack remap under Known Issues.
  ⚠️ **Nothing has been enrolled or reviewed on a real account yet** — that is
  now the only thing between the pack and a saved card, and it is a use check,
  not a console step.
- **Spanish is live on web** (2026-08-22). Registry entry, prompt branch, i18n
  and example terms merged; lookup verified against the live API in both
  directions. `cards_spanish`'s security rule and **both** composite indexes are
  in the console, and `/cards` and `/review` load clean against them. Mobile has
  the code, and 1.5.0 (build 14) is the build that carries it to users.
  The rule uses the explicit `read, update, delete` + `create` form that `cards`
  and `cards_chinese_traditional` use, not the `read, write` form the middle four
  collections drifted into. Both work; only one says what it means. Why, and why
  a new collection needs two indexes rather than one, are in
  [lessons.md](lessons.md).
- **The Kikuyu Basics pack is built** (2026-08-31) — 59 entries, the fifth
  `VOCAB_PACKS` key, shipped **ahead of a speaker check** with a source tier on
  every entry so that stayed visible. **A speaker read the list 2026-09-08 and
  it stands as written**; the tiers remain as the record of where each entry
  came from. The respelling *table* beyond those 59 entries is still unchecked
  — see the Decisions entry for that date. No console step: `cards_kikuyu` and
  both indexes have been live since 2026-08-22.
  It carries a fix to the Kikuyu respelling that **reaches every existing card,
  not just the pack** — a consonant before `w` was stranded as its own syllable
  in both the English and the Hangul path. `npm test` on web is 397/397.
  Unverified on a device: the Korean respelling now emits the `w`-series
  syllables (뫄, 뭬, 콰, 과, 화), which nothing else in the app produces.

- **The Spanish Basics pack is built** (2026-08-31) — 153 entries in five
  sections, the fourth `VOCAB_PACKS` key and the app's first elementary deck.
  Live on web at deploy and on mobile in 1.5.0. **No console step is needed**,
  unlike adding a language: `cards_spanish` and both its indexes have been live
  since 2026-08-22, and a pack writes into the collection that already exists.
  `npm test` on web is 383/383 with the twelve new assertions in it.
  Not yet seen by a signed-in user on either platform — the deck route serves
  and the entries are asserted, but the rendered row is unverified, and it is the
  longest that layout has had to hold (an article badge, and rows that are whole
  questions).

- **Swahili is live on web** (2026-08-27), a ninth study language, and the first
  Bantu one with audio. Registry entry, prompt branch, i18n and example terms
  merged; `/api/explain`, `/api/explain/depth`, `/api/explain/examples` and
  `/api/pronounce` all exercised against the live API, in both directions and
  with a Korean back. `cards_swahili`'s security rule and **both** composite
  indexes are in the console, and the save → `/cards` → `/review` loop was
  walked clean by the user on web *and* in Expo Go on a phone.
  Both indexes were built **by hand**, not from the console's error link — that
  link failed with a bare "unknown error" and was not worth diagnosing, since
  [lessons.md](lessons.md) already prescribes building them by hand and the
  field shapes are known. Worth remembering the next time a language is added:
  the link is not the only route, and it is the flakier one.
  Mobile carries it as of 1.5.0 (build 14); the Expo Go check confirmed the
  code, and the binary is still unconfirmed.
- **Kikuyu is live on web** (2026-08-22), an eighth study language and the first
  with no audio. Registry entry, prompt branch, i18n and example terms merged;
  every route exercised against the live API — lookup both directions, Korean
  back, examples, depth, word of the day. `cards_kikuyu`'s security rule and
  **both** composite indexes are in the console, and saving a card then seeing it
  on `/cards` was confirmed end to end. Mobile has the code but reaches users
  only through a build, and 1.5.0 (build 14) is that build.
  Both console steps went in one at a time and each failed the *next* surface
  rather than the one just fixed, which is the whole of what
  [lessons.md](lessons.md) now says about ordering them.
- **Kikuyu has no pronunciation, and that is the finished state, not a gap.**
  It is the first registry entry with no `ttsLanguageCode`, so it is also the
  first time that field's optionality has ever been exercised: both apps hide
  the pronounce button and `/api/pronounce` returns a clean 400. Verified on
  both. If a future language also lands without audio, this is the path it
  takes.
- **Grammar and writing were removed from the app** (2026-08-18), but
  `/api/writing` and `/api/grammar/exercise` stay deployed because 1.3.0's binary
  still calls them. See Decisions for the one condition that lets them go.

TestFlight context that isn't in the repo:

- Tegi's account is enrolled as **Individual**, which blocks non-account-holders
  from generating certs — worked around with an App Store Connect API Key.
- Bundle ID `com.tegi.amgi` is **disposable**. A public launch under the user's
  own account is a fresh relaunch, not a migration: Apple's App Transfer doesn't
  cover TestFlight-only apps. External approval doesn't change this — it is
  approval of a beta on someone else's account, not a foothold in the store.
- ⚠️ Console state (public link live? testers actually invited?) is never
  knowable from the repo. Confirm before assuming. External *approval* is
  recorded above because it was reported directly; whether anyone has been
  invited under it is not.

## Builds

No OTA, so every mobile change reaches users through one of these.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 1.7.0 | 16 | 2026-09-19 | `cb7c19c` on `release/1.7.0` (version bump + TestFlight copy) — external approval not reported as of this line |
| 1.6.0 | 15 | 2026-09-10 | `c8c113a` on `release/1.6.0` (version bump + TestFlight copy) — external testing approved 09-10, same day |
| 1.5.0 | 14 | 2026-09-02 | `84be8af` on `release/1.5.0` (PR #109, version bump + TestFlight copy) — external testing approved 09-02, same day |
| 1.4.0 | 13 | 2026-08-22 | `dedcdd6` on `release/1.4.0` (version bump + TestFlight copy) — external testing approved 08-24 |
| 1.3.0 | 11 | 2026-08-11 | `86c2c5a` on `release/1.3.0` (version bump) — **first build approved for external testing**, 08-12 |
| 1.2.0 | 9 | 2026-08-02 | `51a53e9` (PR #76, version bump) |
| 1.1.0 | 8 | 2026-07-27 | `8359adf` on `fix/drop-push-entitlement`, pre-merge |
| 1.0.2 | 4 | 2026-07-24 | `0288136` |
| 1.0.1 | 3 | 2026-07-21 | `a85270d` (PR #43, EAS channel fix) |
| 1.0.1 | 2 | 2026-07-21 | `4d217f3` |
| 1.0.0 | 1 | 2026-07-17 | `db8a6ea` (PR #37) |

The table is **iOS only**. Android ships as a sideloaded APK on its own cadence
with no review, so its builds are not release events worth recording — see the
Decisions entry for how it is distributed. 1.5.0's Android APK is `versionCode`
4, cut the same day from `d25b544`; 1.6.0's is `versionCode` 5, cut the same day
as build 15. Its commit was not recorded here — resolve it from the EAS build
record if it ever matters, for the reason the next paragraph gives.
1.7.0's is `versionCode` 6, and both it and build 16 carry the tree at
`cb7c19c` — they were started together, before the step-1 correction commit
landed on the branch. That commit touches `backlog.md` only and nothing bundles
it, so branch head and both binaries differ by nothing either one runs. ⚠️ **The
hash EAS logged for each is not known** and may read as the previous commit with
a dirty tree, depending on exactly when each job uploaded; the content is what
this row is asserting. Check the console if a build ever has to be reproduced
byte for byte — the 1.5.0 entry below is why that distinction is kept.

⚠️ **1.5.0's two builds carry different commit hashes and the same app.** EAS
logged `84be8af` for iOS and `d25b544` for Android; the delta between them is
`backlog.md` and `testflight-beta-info.md` only, `app.json` is byte-identical,
and neither file is bundled. `84be8af` was then **amended away** — it is
unreachable from any branch and survives only until `git gc`, so if build 14
ever has to be reproduced exactly, resolve it from the EAS build record rather
than from the branch.

Build numbers live in EAS (`appVersionSource: remote`), not the repo, so they
have to be read off the console and recorded here. Gaps are normal: the number is
reserved when a job is created, not awarded on success. Builds 5–7 were failed
attempts, and **12 was burned by a failed 1.4.0 run** — the counter increments
before credentials resolve, so a build that never starts still consumes a number.

⚠️ **`--non-interactive` is what failed that run.** It does not skip prompts, it
turns one into an error, and no `appleTeamId` is configured anywhere. The flag
is for CI; drop it when cutting a build by hand. `tech-stack.md` documented it
as the standard incantation, verified in July — `npx` pulls a new EAS CLI every
run, so a command that worked once is not a command that works.

What a build carries is derivable from its commit, so it isn't listed here. The
one fact that isn't: **1.3.0 and 1.4.0 are both native-module builds**
(`expo-clipboard`, then `expo-dev-client`), and both `expo config --type
introspect` passes came back clean — 1.4.0's `entitlements: {}` confirms
`withoutPushEntitlement` still strips `aps-environment`. 1.4.0 is also the first
iOS release carrying `expo-dev-client`, `expo-dev-launcher` and `expo-dev-menu`.

**1.7.0 is a native-module build too: `react-native-svg` 15.15.4**, added
2026-09-12 for the weekly chart's line mark. It is in Expo Go's own bundled set,
so the dev loop was untouched and `npx expo start` needed nothing — but the
binary does, and **the owed `expo config --type introspect` pass was run
2026-09-19 and came back clean**: `entitlements: {}`, no new
`NS*UsageDescription`, no manifest permission beyond the six `expo-audio`,
`expo-file-system` and networking already contribute. Nothing about the library
is configuration-bearing (no plugin, no entitlement, no permission), which is
what the check confirmed rather than a reason it could have been skipped.

⚠️ **Never verified on a real binary**, on any build so far — the logic is
tested, the native bindings are not: pronunciation audio, CSV/Anki export,
sharing — including the stats image's `File.downloadFileAsync` →
`Sharing.shareAsync` path, which has never run end to end and which **turned out
to be broken all along**, found by reading rather than by running on 2026-09-12
(the share entry in Decisions) — offline review
across a force-kill and reconnect, the review reminder
firing *and* disappearing once you review, and account deletion against the
production `EXPO_PUBLIC_API_BASE_URL`. (The 1.3.0 copy button left this list
with the writing rewrite it belonged to.) ⚠️ **The share preview needs that same
host**: the card is the deployed route's own render, so on a build pointed at
nothing the preview draws a blank placeholder — and *sharing* needs it too, since
the download is what feeds the OS sheet. Build 16 is the one to look at it on:
sharing is the path it rewrote, and it has never once run end to end.
1.4.0's What to Test asks for these by
name and puts **offline review first**; **neither 1.5.0's nor 1.6.0's does** —
both were cut to what's new, so no release now asks for this list. **This paragraph is where the
list lives**: tracking it as work was dropped 2026-09-04 (Decisions), so what
retires a line here is somebody hitting the path in normal use, not a session
spent working down the list. Everything here is separately unverified on
Android, where only sign-in has been exercised. **Build 15 raised the stakes
without changing the list**: SDK 57 moved every one of these native modules at
once, so a path that worked on build 14 is not evidence about build 15.

## Known Issues

- **OTA updates never reached the device.** CI published PR #44 successfully
  (run `29892869152`); the change never appeared and debugging dead-ended, so
  **OTA was abandoned 2026-07-23** rather than diagnosed. Not a blocker under the
  Expo Go + production build model — reopen only with a specific reason to want
  OTA back. See [tech-stack.md](tech-stack.md).
- **21 lint warnings, 0 errors** (measured 2026-09-09, cutting build 15) — 13
  React Compiler, the rest accumulated since. Two were added by the subscribe change: the
  `set-state-in-effect` rule fires on the `if (!user) { setX([]); return; }`
  guard that every subscription effect opens with. Same class the codebase
  already carries in `useOnlineStatus` and `useCardEnrichment`, and React's own
  docs name subscribing-in-an-effect as the intended use. Scoped under
  Housekeeping in [backlog.md](backlog.md).

## Decisions

Closed calls, kept with their reasoning — a decision whose reasoning is lost gets
reopened by the next person to notice the symptom. Newest first.

### Munli's bar mirrors Amgi's, slot for slot (2026-09-22)

**The user's call, and the reasoning is worth keeping because it settles a
question that had been answered ad hoc three times this week.** Munli's tabs
were being chosen by what existed; they are now chosen by what Amgi's mean:

| Amgi | Munli | The question it answers |
|---|---|---|
| Review | **Practice** | what should I do now |
| Cards | **Tables** | what am I learning |
| Learn | **Writing** | here is some input, tell me about it |
| Packs | **Topics** | what is there, and what do I want |
| Progress | **Progress** | how is it going overall |

⚠️ **The parallel is not decoration.** A mode that reorders the shell makes
switching feel like leaving the app rather than moving inside it, and the
mapping means whatever a learner knows about one bar is true of the other.
Writing takes the middle for the reason Learn does — the centre of a five-tab
bar is where a thumb already is.

**What this adds is the Cards slot, which Munli did not have.** Topics was doing
two jobs: the catalogue you add from *and* the inventory of what you had added.
Amgi keeps those apart and so does this now — **Tables** lists every table in the
practice set, one row each, with its state and the boxes it keeps losing.

⚠️ **Tables lists what is *not* due as well**, and that is the difference from
`dueTables`. That function answers "what should I do now" and a session is built
from it; an inventory that hid everything you had already learned would be a
strange inventory. Due-first ordering puts what needs attention at the top
without dropping the rest.

**Three states, not two.** Never practised is shown apart from due, even though
a session treats them alike — "not started" and "due now" are different things
to a reader, and collapsing them makes a new practice set look overdue.

**`ParadigmTable` is extracted** so the Topics detail and a Tables row render one
implementation, narrowed by `tenseIds`: Topics shows every tense because reading
a form is not bounded by having enrolled it, and a Tables row shows the one tense
it is about.

⚠️ **`Tables` will not generalise, and that is a known cost.** It is the right
name for a conjugation item and the wrong one the moment a second topic's items
are not tables. It is a label, so it is cheap to change — but the tab is *the
Cards slot*, and whatever replaces the name has to keep meaning "the things you
are learning" rather than "the conjugation tables".

### The practice set is also the reference (2026-09-22)

**The user's call: the Verbs surface should not only be a checklist.** It is
where you go to say what you practise, and the same screen is the natural place
to *look a form up* — so it now carries the tables themselves.

**Two structural changes.**

**The tab is a list of topics, one row each.** Verbs is the only row today, and
that is the point rather than a limitation: the plan is one grammar tool at a
time with the grouping read off the collection later, and this is where that
collection becomes visible. Prepositions add a row; nothing about verbs moves to
make space. ⚠️ It needs a nested `Stack` behind the tab — without a layout there
expo-router flattens the routes into the Tabs navigator, and `FloatingTabBar`
maps over every route in the navigator state, so each would surface as an extra
icon drawing the generic fallback. `(tabs)/decks` carries the same comment for
the same reason.

**Each group carries a chip per verb, and opening one shows its whole
paradigm** — persons down, tenses across, which is the shape a conjugation table
is read in. One open at a time.

⚠️ **The reference shows every tense, including ones that are not enrolled**, and
this is the call worth recording. Enrolment bounds what is *practised*; it has
no business bounding what can be *read*. Seeing what the imparfait actually looks
like is how somebody decides to add it, so hiding it behind the decision to add
it gets the order backwards.

**`buildParadigm` is in core rather than on each screen**, so a table shown for
reference cannot disagree with the table practice is graded against — a test
asserts the two match for every tense. That is the same reason the rules
themselves live there.

**What this does not do:** the reference is per verb, so a group's chips show
eight verbs conjugated identically. That is honest — they *are* identical, which
is the whole argument for scheduling the group rather than the verbs — but it
means the chips are a sampler rather than a catalogue, and a group with one
vehicle would look the same as one with eight.

### A regular group is the item; an irregular verb is the item (2026-09-22)

**The user's call after practising conjugation, and it corrects a redundancy the
first cut built in.** `parler`, `regarder`, `travailler`, `chercher` and `donner`
in the présent were **five scheduled items testing one fact** — getting `parlons`
right says nothing new once `donnons` is known. Regular verbs are a rule and
irregular verbs are not, so they cannot be the same kind of item.

**The model: what gets scheduled depends on whether the verb is a rule or a
fact.**

- **A regular group** (`-er`, `-ir`, …) is one item per tense. A verb from the
  group is the **vehicle** the question is asked through, and it **varies between
  questions** — asking `-er · nous · présent` through `donner` today and
  `chercher` tomorrow tests the ending; asking it through `parler` every time
  tests `parlons`.
- **An irregular verb** keeps a table per verb, because `aller` teaches you
  nothing about `être`.

⚠️ **`-cer` and `-ger` had to become their own groups**, and this is the part
that is easy to get wrong later. `nous mangeons` is not `mang` + `ons`, so
`manger` is a **broken vehicle** for the plain `-er` rule: a learner asked to
produce it from that rule would be marked wrong for applying it correctly. They
are separate patterns, which is also how they are taught. A test asserts every
vehicle is filed under a group whose rule actually fits it.

**The tally says more than it did.** `-er · nous · imparfait` on the Progress tab
is now a claim about an ending across every verb in the group, where before it
was a claim about one word.

**The practice set is a surface of its own — the Verbs tab.** ⚠️ **It is a
different job from the session setup screen, and conflating them is the failure
to avoid**: setup chooses what to cover *this session* and resets; Verbs chooses
what exists to be covered, and persists. That is exactly the split Amgi already
has between enrolling a pack and picking a collection to review, and the setup
screen is bounded by it — a tense that is not enrolled cannot be selected.
**Progression lives there**: the présent is enrolled by default and the learner
adds the imparfait when ready. `vision.md` allows per-level content and refuses
the app deciding what you are ready for; this is the allowed half.
The last tense and the last group cannot be removed — an empty practice set reads
as broken rather than as a choice, and `normalizeEnrolment` would silently refill
it, which is worse than refusing the tap.

**Irregular verbs are still empty, and the types now say so out loud.**
`ConjugationIrregularVerb` stores forms because there is no rule to generate them
from, and `FRENCH_IRREGULARS` is `[]` until the sourcing job lands. Everything
around them is built and tested, so that job is a data file and nothing else.

**No migration, because nothing shipped.** Item ids changed shape
(`French:group:er:present` rather than `French:parler:present`). Normally that
would need one; all six PRs are open and native is in no build, so there is no
data in the world to migrate.

### The stale data fix was the weaker half, and is now the real one (2026-09-22)

⚠️ **This corrects the entry below, written the same day.** That one claimed the
2026-09-15 precedent — the streak chip and the Progress tab keeping two copies of
one number — and then implemented only half of it: a **one-shot read** held in a
provider. It fixed two screens disagreeing on one device and did nothing about
the real case, which the user asked about directly: **practise on the laptop and
the phone would not know until it was relaunched.**

The fix is smaller than the thing it replaces. `users/{uid}` is **already
subscribed to** on both platforms, and conjugation progress lives on that
document — the same subscription already carries the hanja partition and the
language list, with a comment reading *"A language added on the laptop, reaching
the phone without a restart."* So conjugation rides it, and the provider stops
fetching anything.

⚠️ **What the provider still owns is the pending write**, and it has to. A
snapshot can land between rating a table and that rating reaching the server, at
which point the snapshot is *older* than what is on screen. Every rating is held
locally until a snapshot comes back carrying it, and local wins for a held item —
the same shape as the pending-review replay in `review.tsx`, and the same reason.
The buffer drops each item as the server confirms it, so it stays a write buffer
rather than growing into a cache.

**The lesson worth keeping:** a focus-refetch would have made the symptom go away
and left the bug. The question to ask of a stale-data report is not "when should
this reload" but "why is there a second copy".

### Practice is a session that ends, and one copy of its progress (2026-09-22)

Two changes from the user trying conjugation on a device, and they are
independent problems that happened to surface together.

**1. Two screens held two copies of one map.** Practice loaded conjugation
progress into its own state, rated into its own copy and wrote to Firestore;
Munli's Progress tab had loaded a *different* copy when it mounted and never
heard about the write, so nothing appeared there until the app was restarted.
⚠️ **This is the 2026-09-15 entry again** — the streak chip and the Progress tab
keeping two copies of one number — and the fix is the same one, a single source
rather than a reload. A `useFocusEffect` refetch would have hidden this instance
and left the next surface to rediscover it. `ConjugationProvider` now owns the
map for the whole mode. Writes stay per-answer rather than batched at session
end: batching is fewer round trips and loses the session if the app dies, which
is the wrong trade at this size.

**2. Practice never ended, and that was a design bug rather than a missing
feature.** The first cut *silently fell back* to the whole set whenever nothing
was due, so the due count meant nothing once it reached zero and there was no
point at which the learner was finished. The user's call: **start from the state
Review starts from.**

**The shape, mirroring Review deliberately rather than approximately:**

- **Picker → setup → session, on one screen.** Review's start screen is not a
  separate route either; it is what `review.tsx` renders before `started` flips.
- **Rows, not tiles** (the user's call) — one per practice type, due count on the
  right, exactly as the collection picker reads.
- **The queue is fixed at Start and owned from then on**, so a rating written
  mid-session moves the picker's counts and leaves the questions alone. Same
  rule as `buildReviewQueue`, and the same reason `review.tsx` keeps `cards` out
  of its queue-building dependencies.
- **One question per table per session.** The table is the scheduled item, so
  asking it twice in one sitting would be two questions about one fact.
- ⚠️ **A miss does not rejoin the session in progress.** `rateTable` already
  makes a missed table due immediately, so it returns in the *next* session —
  "a session ends when it said it would", which `sm2.ts` states for cards and
  which composes here for free.
- **`done` and `stopped` stay distinct**, because telling someone who quit at 8
  of 30 that they are finished would be untrue.
- **Over-practice became an explicit switch on the setup screen.** It is a
  legitimate thing to want; it was never legitimate as something the draw did
  without being asked.

**The tile stays open at zero due, on the user's call** — a new account has
nothing scheduled, and a dead row on first launch is a bad first impression. So
the row always opens and the setup screen is where "nothing is due" is said,
next to the switch that does something about it.

**Writing stays its own tab, and the reason is the recorded design rather than
layout taste**: writing diagnoses and does not practise, so Practice holds only
things with a queue and a due count. The two never swap jobs.

**A side benefit worth recording, because it removes a hack.** Choosing the box
at queue-build time rather than at question time put every draw inside an event
handler, which retired the seeded-shuffle workaround the screen needed when it
drew during render — React Compiler forbids refs and impure calls there. The
queue builder takes its randomness as an argument, so the session logic is
deterministic under test.

### Munli takes Amgi's shell, not just its account (2026-09-22)

**The user's call after using the switcher in Expo Go**, and it reverses the
`Stack`-not-`Tabs` decision from the day before. Switching modes should change
**what the tabs are**, not **whether there are tabs**: the bar, the Progress tab
and the settings gear in its top right stay put, and only the first tabs and
what Progress measures change.

**Why the original call was wrong, precisely.** It was argued from "a one-tab bar
is furniture", which is true about one tab and says nothing about the shell. The
mistake was treating Munli's *emptiness* as a fact about modes rather than a fact
about that afternoon — so a temporary shortage of tools was allowed to decide the
navigation model. A mode that navigates differently from the rest of the app
reads as **leaving** the app rather than moving inside it, which is the opposite
of what a switcher is for.

**Munli's tabs: Conjugation · Writing · Progress.** Conjugation is first and is
therefore the initial route, by the same argument that puts Review first in
Amgi — the first tab is the mode's answer to "what is this for" on every cold
open, and for a grammar mode the answer is *practise*, not *submit something to
be corrected*. Writing is intentional and occasional; conjugation is the one with
a due count.

⚠️ **Progress is last in both modes, and that is load-bearing rather than tidy.**
Holding the last tab is how modes are switched, so the gesture lands on the same
tab wherever you are — and Munli now has a bar to hold, which it did not when it
was a Stack.

**A visible mode button joins the gear on every Progress tab.** The user asked
for it on Amgi's, and it belongs on both for the same reason the plan gave when
the gesture was chosen: **a hold is undiscoverable by feel.** This is the door
found by looking. `ProgressHeader` is extracted so both modes render the same
one — the `StudyLanguageList` precedent, and the same failure avoided, since a
header rendered twice is a header that drifts.

**Munli's Progress measures conjugation, and says plainly that writing is not
counted.** Findings are not stored and the passage never is, so there is nothing
to count — naming that beats a zero that reads as a bug. ⚠️ The one thing on it
that a card-shaped progress view could not produce is **which box you keep
missing** (`prendre · nous · présent`), and that is the per-box miss tally paying
for the per-table schedule. The schedule knows a table is shaky; only the tally
knows which sixth of it.

**The study language stays in the shared header in every mode**, because it is
the shell's and not a mode's: Munli conjugates whatever deck you are on.

⚠️ **One asymmetry kept on purpose:** web's `/munli` is still a landing page
listing the tools, because web navigates by sidebar rather than by tabs. That is
the same asymmetry Amgi already has — `/` is Learn on web and Review on native —
and it is recorded in [ui-ux.md](ui-ux.md).

### Conjugation: the table is the item, and the content is a rule engine (2026-09-21)

The first Munli tool built from scratch, and the first time the "one tool at a
time" plan had to survive contact with an implementation. Four calls the build
settled.

**The table is the scheduled item, and nothing assumes its six boxes share a
schedule *by definition*.** That second half is what keeps per-verb scheduling a
branch rather than a migration later: `conjugationItemId` is a function, progress
is a map keyed by whatever it returns, and splitting regular verbs from irregular
ones means more ids of the same shape. `ConjugationVerb.group` deliberately has
**no `irregular` member** for the same reason — an irregular verb is stored
forms, not a rule class, and admitting one to the enum would invite generating
them.

**The per-box miss tally is where the per-table schedule pays its debt.** One
schedule cannot know your `nous` is weak; the tally can, so `pickPerson` asks the
most-missed box first. ⚠️ It follows the **verdict**, not the string match — a
form assembled from both hints is `again` and counts as a miss, or the box that
needed both hints stops being offered. And a correct answer *clears* the tally
rather than decrementing it: a box you have now produced is answered, not "less
wrong than before".

**The content is a rule engine, and its correctness is the test suite's job.** A
rule that is wrong is wrong for its whole class at once, so 27 assertions pin
every form the engine produces for three verb classes across three tenses. The
rule most likely to be got wrong has its own case: `-cer`/`-ger` soften before
`a` and `o` only, which is why the adjustment is applied **per ending** rather
than baked into a stem — `nous mangeons` but `nous mangions`.
⚠️ **Irregular verbs were left out, and that is the sourcing gate doing its job**
rather than an omission. `docs/packs/README.md` governs and the model is not a
source. The verb list that did ship is described as *common*, never
frequency-ranked, for the same reason.

**Progress is a field on `users/{uid}`, not a new collection — an operational
call, not an aesthetic one.** This project's Firestore rules live in the console,
so a new collection would deploy and then fail closed in production. The user
document is already owner-writable, and a nested map merges key by key under
`setDoc(..., { merge: true })`, so one table writes without clobbering the rest.
It is small by construction (54 entries for French); the day a language's spec
makes it a real fraction of the 1 MB document limit is the day it earns a rule.

⚠️ **React Compiler's rules decided the shape of the screen, which is worth
recording because it will look arbitrary otherwise.** Reading a ref during render
is an error, and so is calling `Math.random()`; putting the draw in an effect
means a synchronous `setState`, which the same ruleset flags and which the repo
already carries 13 warnings of. So the question is a **pure function of a nonce
and a progress snapshot**, with the shuffle seeded from the nonce. That was
forced, and it fixed a real bug on the way: a draw depending on live progress
redraws the question the instant it is answered, so the learner never sees the
verdict for the box they just typed.

**What this does not establish.** Nobody has answered a question, the Firestore
write path has never run, and the plan's actual claim — that a taxonomy can be
read off a collection of tools — needs a **second** tool to mean anything. ⚠️ The
rule that goes with it is that the second is built *as if the first did not
exist*: a table, a box and a miss tally are a verb paradigm's shapes, and
prepositions have none of them.

### Writing came back unchanged, and three things around it had not (2026-09-21)

Restored from `1ebdc9b^` — the removal was one commit, so the panels, `diff.ts`,
both test files and the i18n keys came back as they were, with the original
Korean copy. `/api/writing` and its parser never left. **The behaviour is
unchanged and only the address moved**, which is the whole claim this entry
exists to make precise, because three things around it *had* changed and a
literal restore would have been wrong in each.

**1. The card-offer rule had to be re-derived, not restored.** The 2026-08-08
decision had a card give way to a *pattern* offer unless it was a gap card, and
its reasoning was measured: on a grammar finding the model often emits a card
whose front is a description — `accord du participe passé avec être` is a
heading, not a deck entry. Patterns no longer exist, so nothing is there to give
way to, and the naive `!!finding.card` would put those headings in the deck. So
`offersCard` keeps the measurement and drops the dependency: **a grammar finding
offers only its gap card; every other kind offers as before.** In core rather
than in both panels — a rule written twice is a rule that drifts.

**2. `nativeLanguage` split while writing was away** (2026-09-12), and both
halves are `string`, so a miscategorised one is silent. Chrome takes
`interfaceLanguage`; the model's notes and the card's back slot take
`deckNativeLanguage`. This is exactly the class of bug the split was made to
surface, and a restored file is the one place the compiler cannot help, because
it was written before the split existed.

**3. The mobile panel reserved height for the floating tab bar.** Munli is a
`Stack` and has none, so the reserve is a band of dead space under the last
finding rather than a fix for anything.

**What the placement bought, stated plainly:** the Word/Passage toggle does not
come back, and neither does the entire design that was going to replace it — the
auto-growing Learn field, the one-line/two-line reveal, wrapping-not-characters,
the `keyboardReserve` growth direction, the Enter/Shift+Enter split. A mode with
its own writing surface has nothing to disambiguate. **Amgi's Learn tab was not
touched.**

⚠️ **A backlog item was stale and is corrected rather than closed.**
`/api/writing` was listed as having no `try`/`catch`. It has had one since it was
written, returning 502 for both an unparseable response and a thrown call. The
item was about `/api/explain`, which genuinely still has none, and the pairing
was wrong when it was written.

**What did not ship with it, and why that is not an oversight.** "Findings you
can return to" needs a Firestore collection and a security rule — console state
the repo cannot verify — so it is its own item rather than a finishing touch.
Routing a finding into a practice tool needs a practice tool. Both are in
[backlog.md](backlog.md) with what the restore established about them.

⚠️ **Nobody has submitted a passage.** The route is unchanged and its parser is
under test, but no model call has been made through the restored UI on either
platform, and the four removal reasons included *"the practice itself was not
good"* — which, where it was about the reviews rather than the surface, this
does not touch at all.

### Munli ships as a route, and web remembers it in a cookie (2026-09-21)

Building the mode switcher settled three things the plan left to the build, and
one of them is a deviation from what the plan said to do.

**The mode is a route on both platforms, and native uses a route *segment*
rather than a group.** `app/munli/` gives native the path `/munli`, which is
exactly web's, so `modeFromPath` is one function with one answer for both. A
route group (`app/(munli)/`) would have been the more idiomatic Expo Router
shape and would have produced no path at all — at which point native would have
needed its own way to say which mode it is in, and the two platforms would drift.

⚠️ **Web remembers the landing mode in a cookie, not localStorage — a deviation,
made for the plan's own reason.** The plan named `localStorage`, and then argued
at length that a stored mode must never reach the pre-paint script because it
would paint the *wrong navigation* for a frame. localStorage cannot avoid that:
it is readable only after hydration, so `/` would render Amgi and then replace
itself. A cookie is readable in `middleware.ts` before the first byte. The
middleware matches `/` and nothing else — a path the user typed, followed or
bookmarked is never rewritten, or a shared link stops meaning one thing.

**Munli is a `Stack`, not `Tabs`, and its nav grows one row per tool.** This is
the plan's "don't design Munli's nav ahead of its tools" taken literally, and it
has one consequence worth stating: **there is no tab bar in Munli to hold**, so
the switching gesture cannot be its only exit. Munli's home carries an explicit
switch button. On web the same gap is filled by the account-menu row, which is
web's *primary* door rather than its fallback — there is no long-press
convention on a desktop sidebar, and a mode nobody can find is a mode nobody
uses.

**`expo-haptics` was considered and not added.** It is bundled in Expo Go, so it
would work while developing and then need the next production build to reach
anyone. The sheet appearing is the confirmation; the buzz would have been a
bonus, and the plan was explicit that the affordance must not depend on it.

**What is not answered:** whether Munli practice feeds the Amgi streak. Nothing
in Munli can be practised yet — writing diagnoses and does not schedule — so the
question arrives with the first practice tool, not with the shell.

### Grammar is one tool at a time, and the grouping comes later (2026-09-21)

**The user's call, made the same day as the Munli entry below and reversing a
second thing in the 2026-09-14 entry — its constraint #2, "levels are the spine."**
There is no ladder. Grammar is built as **individual tools for individual things**
— verb conjugation, prepositions and postpositions, pronouns, articles — one at a
time, each standing alone, and **how they group is read off the collection once
there is one**. _"As I start to build up a collection of these individual things I
can think about how to group them from patterns that might emerge."_

**Why this is not the third flip of one question.** Three shapes have now been
tried on paper and the axis they differ on is where the structure comes from:
errors-as-syllabus (2026-08) put it in the *learner*, and lost its sensor when
writing was removed; the A1 ladder (2026-09-14) put it in an *external
curriculum*, and bought a 200–350-item sourcing job before anything could be used;
this puts it in **what has actually been built**. It is the cheapest of the three
to be wrong about, because being wrong costs one tool rather than a level. And it
is the house pattern rather than a new idea — one study language at a time, a
subpack before a pack, one concept before a level. **Emergence moved from the
learner to the builder**, which is worth stating precisely: the app still does not
decide what a learner is ready for, and there is still no placement test and no
level setting.

⚠️ **The risk is premature abstraction, and it is the only real one.** The moment
tool #2 is fitted into tool #1's shapes, the taxonomy has been built by accident
and nothing was learned. The rule: build the second as if the first did not exist,
extract shared machinery when a third wants it. Two is a coincidence.

**What gets built, in order: the mode switcher, writing, conjugation.**

**Writing comes back un-gated, as a Munli surface.** The 2026-09-14 plan had it
third and gated on the ladder being used, because a finding needed a concept to
point at. With no ladder there is nothing to gate on, and nothing to point at
either — so it returns as **a diagnostic you read**, not a router into practice.
Routing is deferred until there are tools to route into; the first candidate is a
`grammar` finding about a verb form opening that verb's conjugation table, and it is
explicitly not in v1.

⚠️ **The "emergent ordering" half of the 2026-09-14 entry dies here.** Storing
concept ids and counts was what turned a one-shot review into a syllabus — "missed
`la négation` four times" — and it required the closed set of authored concepts
that no longer exists. What can be stored is `FindingKind` counts, four buckets,
honest as history and far too coarse to be a syllabus. **The passage stays
unstored**, which was never in question.

**One thing the Munli placement makes free, and it is a genuine simplification:
the writing input's entire placement design is cancelled.** The auto-growing
field, the one-line/two-line reveal, wrapping-not-character-count, the
`keyboardReserve` growth direction, the Enter/Shift+Enter split and the three
reworded Learn strings — roughly forty lines of scoping from 2026-09-14 — existed
solely because writing had to share Learn's single box without reinstating the
Word/Passage toggle. A mode with its own writing surface has no such problem:
**Amgi's Learn tab is untouched.** The arguments were good and are kept here in
case a passage ever wants to start from Learn again; the work is not scheduled.

**Conjugation is the first tool, and the first-principles calls on it:**

- **One question is one box.** A **table** is one verb in one tense
  (`prendre · présent`); its six **boxes** are the forms, one per person. The app
  names verb, tense and person; the learner types the form. ~5 seconds, and
  `vision.md` already argues that the cost of an exercise sets the bar for what is
  worth practising.
- ⚠️ **The schedule belongs to the table, not the box.** Miss `nous` and the whole
  `prendre · présent` table comes back sooner, and may then ask any of its six
  boxes — with a per-box miss counter inside the item so it prefers the one that
  was missed. The alternative is a schedule per box, where missing `nous` leaves
  `je` untouched.
  **The argument is not volume** (120 tables against 720 boxes; both are ordinary
  deck sizes) but **what counts as one fact**: a regular verb's six forms follow
  one rule, so six schedules are six copies of one fact, while an irregular verb's
  boxes genuinely differ (`prenons` and `prennent` have different stems).
  **Per-table decided, on the user's call** — _"per table seems quite alright for
  now"_ — with per-box closed as the option that splits a regular verb's single
  fact six ways. The accepted cost is that SM-2 learns "your `prendre` présent is
  shaky", not "your *nous* is shaky".
  **Per-verb stays open as a later move, named by the user as one**: regular as a
  table, irregular per box. Most correct, two code paths, and the house pattern of
  deciding by content shape (`isGridDeck`). ⚠️ Build per-table so it stays a branch
  rather than a migration — nothing holding a table's schedule should assume its
  six boxes share one.
  **It is also what keeps the other question shapes cheap** — fill-the-table and
  fill-the-blank-in-a-sentence are then *views of one item* rather than a second
  content model.
- **The content is computed, not authored**, which is what makes conjugation the
  right first tool: a verb list plus rules plus an irregulars table, finite and
  checkable, with no 급수-sized authoring job behind it. ⚠️ `docs/packs/README.md`
  still governs — the model is not a source, and a dataset's licence is checked
  before it is used.
- **The grader already exists and is already right.** `typedAnswer.ts` folds
  apostrophes (iOS keyboards substitute them) and deliberately does **not** fold
  diacritics — its own comment cites `ou`/`où` and `sur`/`sûr`, and
  `préfère`/`prefere` is that case one step further in. Folding accents would
  teach that the accent is optional, which in a conjugation table is the content.
- **French first** — an assumption recorded rather than a decision taken, since
  the tool is language-generic and the dataset is per-language.

**The native language is scoped, not adopted as a rule.** The user raised that a
Korean native and an English native learning French need different things, and
then declined to apply it here: _"for something as simple as verb conjugation, I
don't think we need to take this as a hard rule at least to start out."_ That is
the right cut, and the reason generalises: **the native language matters exactly
where the distance between the two languages is itself the difficulty.** A
conjugation table is a form committed to memory, and `prenons` is hard for the
same reason whoever you are. Articles are the opposite case — Korean has none, so
`a`/`the` for a Korean speaker means learning that a category exists, where a
French speaker learning English already has the category and argues only about
details. Same feature, genuinely different tool. So the principle governs *which
tools get built for whom*, and it arrives with the tool that needs it rather than
as an axis every tool must carry.

**What this cancels outright:** the French A1 level ladder and its référentiel
sourcing gate (the whole 2026-09-14 content plan below), the Practice · Concepts ·
Ask tab sketch from earlier today, and the `concept` abstraction under it. **What
survives from all of it:** authored-or-computed over generated, graded locally,
zero model calls in the daily loop, never pooled with vocabulary review, hints
that cost, and no multiple choice.

### Grammar becomes a mode after all — Munli, and the shell that hosts it (2026-09-21)

**The user's call, and it reverses one half of the entry below from 2026-09-14
rather than amending it.** That entry answered "a pack inside Amgi, or its own
app like Hwasul" with **a pack, no mode, no second app**. Grammar now becomes
**Munli, a separate mode inside the same binary**, reached by holding the last
tab the way Instagram switches accounts. ⚠️ **Only the placement reverses.**
Everything that entry argues about grammar *content* — authored not generated,
graded locally, levels as the spine, never pooled with vocabulary review, one
concept at a time — survives intact and still governs.

**Why this is not simply the option that was rejected.** The 2026-09-14 entry
weighed two options and a mode was not one of them; it is a third, and it is
between them on every axis the entry used. A second app was refused for its
*costs* — its own auth, habit, retention, store listing and Beta App Review
cycle, all of which the no-OTA model makes expensive. A mode pays none of those:
one binary, one account, one habit, one review cycle. The pack was chosen for
its *cheapness*, and its cost was the thing it did to grammar — a grammar point
became a subpack row in a vocabulary browser, and a concept's explanation had
nowhere to live. So the argument that sent Hwasul away ("**does it need new
nouns**") was the right test applied to a question with a missing answer: new
nouns do not imply a new binary, they imply a navigation context.

**Three calls the user made, taken as given:**

1. **Own tab set, shared shell.** Munli has its own surfaces, queue, collections
   and progress; the account, study language, interface language, theme and
   streak stay the shell's. A mode that wanted its own account would be an app.
2. **Hold the last tab.** No new slot in an icon-only bar, five tabs stay five,
   tap still opens Progress. ⚠️ **With the user's own caveat: a hold is
   invisible, so more doors are wanted later** — the account menu row is the
   first, and the backlog item rebuilding that popover is where it goes.
3. **French A1 folds into Munli** rather than shipping as a pack beside it.
   ⚠️ **Superseded within the day** — the entry above cancels the A1 ladder
   entirely and starts from individual tools instead. Recorded because it is what
   was decided at the time this entry was written, not because it stands.

**One design call made here, because it decides the build rather than the
product: a mode is a *location*, not a setting.** Native takes a second Expo
Router group, web a `/munli` route prefix. The alternative — a stored mode the
shell reads — fails on web specifically: the pre-paint script in
`apps/web/src/app/layout.tsx` exists because theme and sidebar-collapse are
client-side state that would otherwise paint wrong for a frame, and a stored mode
would put the **wrong navigation** in that same frame. Routes are known to the
server, so there is nothing to pre-paint and the mode is linkable for free.
Storage keeps exactly one job: which mode a cold open lands in.

**"Never pooled" governs the queue, not the chrome.** Constraint #1 below is
about `collections.ts` refusing an everything-collection. It is not an argument
for two streaks, two accounts or two study languages — those are the shell, and
splitting them would give the user two habits to break instead of one. Left
open: whether Munli practice feeds the Amgi streak (recommended yes).

**Other modes are noted, not planned.** Speaking is the obvious third and Hwasul
was its separate-app form; nothing about it is scoped. The only consequence for
this work is **don't hard-code two** — a list of modes, a mode id in storage, one
route group among several. The bar for a third is the bar that got Munli the
second, and modes are not a growth strategy: each is a tab set to maintain and a
place to be lost in.

⚠️ **What this does not change, and it is the load-bearing half.** The four
reasons grammar was removed in 2026-08 (unfocused, poor practice, unused, heavy
and slow) are answered by the *content* design, not by the mode — authored items,
local grading, zero model calls in the daily loop. A mode makes grammar
navigable; it does not make it good. Generated exercises and model-graded free
production stay dead. And the honest caveat below stands word for word:
authored cloze is Paulston's controlled rung, Bunpro is the shipped cautionary
case, and **the user is still not this feature's user** — which is why the
sequencing is still the risk control, now with the switcher first and writing
last.

### The streak chip and the Progress tab kept two copies of one number (2026-09-15)

**Found by the user, from a three-review gap**: the chip on Learn and Review
read 202 where the Progress tab's bar for today read 205. The instinct was that
these are two different measures — cards reviewed versus reviews — and that
distinction is real *in this codebase*, but it is not what these two numbers
were. **They are the same unit and should have been identical.**

`recordReview` fires once per rating, at one call site per platform, and makes
**two independent fire-and-forget writes**: `recordProgress` (a `merge:true`
write of `increment()`, no read-modify-write) and `recordReviewStreak` (a
**transaction** on `users/{uid}`, with a swallowing `.catch`). `advanceStreak`
does `reviewedToday + 1` and is not even *given* the card or the direction, so
it structurally cannot dedupe by card. Both count directions.

⚠️ **Three drift mechanisms, and they pull in both directions** — which is why
the gap never looked like a systematic offset:

1. **A dropped streak transaction.** Rapid ratings contend on one document; a
   transaction that exhausts its retries is discarded silently while the
   rollup's increment still lands. **Chip reads low.** Three in 205 (~1.5%) is
   an ordinary fast session.
2. **`mergeStreakState` takes `Math.max`, not a sum** (`offlineReview.ts:181`)
   where the rollup *adds* across devices. The comment directly above it says
   reviews "should add up rather than one erasing the other", which `Math.max`
   does not do. **Chip reads low.**
3. **Undo reverses the rollup and deliberately never the streak fields.** **Chip
   reads high** — one per undo, for the rest of the day.

**The fix is to stop keeping two copies**, on the user's call. The chip now
reads the day rollup — the same document and field the Progress tab draws — so
they cannot disagree by construction, and undo moves the chip for free.

⚠️ **The two platforms get there differently, and the reason is the cache.**
Web subscribes (`subscribeToProgressDay`, an `onSnapshot` on today's row), which
is exact. **Mobile cannot**: the Firestore SDK's cache on React Native is
memory-only, so a listener goes blank the moment the app is offline — the one
moment a streak chip most needs to keep counting. So mobile seeds from
`fetchTodayReviews` (which replays the unsent AsyncStorage queue over the
server's copy, exactly as the dashboard does) and then moves the number in step
with each rating and undo.

⚠️ **`reviewedToday` is still written and still load-bearing** — it is what
`advanceStreak` carries and what the streak is computed from. It is simply no
longer *displayed*, which also makes `mergeStreakState`'s `Math.max` inert for
anything a user sees. Left alone rather than "fixed": changing a same-day merge
to add is its own double-counting edge case on re-sync, and nothing reads the
result now.

**It was also a labelling error, and that half is a real bug.** Mobile's badge
said "12 **cards** today" while counting directions — the exact noun collision
`progress.ts` warns against twice ("the two may never share an axis or a
label"). Both locales now say reviews, through `progressChipReviewsToday`.

**Hence the ⓘ.** One `StreakInfo` on web for both chips (`SideNav` and
`Header` render the same streak and would have drifted — the argument that made
mobile's `StreakBadge` shared), a `BottomSheet` on mobile. The sentence it
exists for is that a card studied both ways counts twice, so the number looks
too high until you know what it counts. It is a separate target from the chip
deliberately: the chip navigates to Progress, and one control that navigates or
explains depending on which glyph you hit is worse than two.

### The "By language" row opens a detail view, and the charts follow the range (2026-09-15)

Two of the three Progress items scoped the same day, built on
`feat/progress-language-detail`. **Three calls were the user's**, each one the
backlog had deliberately left open, and all three went to the recommendation.

**Where the detail lives: a dedicated surface, not an expanding row.** Web gets
`/progress/[language]`, mobile a pushed screen (`app/progress/[language].tsx`),
matching the share carousel's precedent. The deciding argument is what the item
asked for — *room for the charts below*. An expanding row keeps the comparison
between languages on screen, which is the genuine cost of this choice, but a
cumulative curve inside a list item on a phone is not a chart. The range travels
in the link (`?range=`, `params.range`), so the detail opens on the window being
looked at rather than making it be chosen again.

**The charts follow the range chip, bucketed by week past 30 days.** Until now
the chip governed only the calendar; the weekly chart ignored it. One bar per
day to 30, one per week at 90 and a year — so 90 days is 13 bars rather than 90,
and a year is 52 rather than 364, which is the wall the heatmap already draws
better. `chartBucketDays` is in core for `niceCeiling`'s reason: the grain
decides what a bar *is*, and two platforms disagreeing would put two different
charts under one title.

⚠️ **Bars are chunked backwards from today, never aligned to Sundays.** Week
alignment would leave the newest bar partial six days out of seven, and a final
bar that dips because the week is not over reads as a slump rather than as a
Tuesday. The cost moves to the *oldest* bar, which is short whenever the window
is not a multiple of seven (90 days is twelve weeks and six days) — the better
end to put it, since a bar carries its own date range and nobody reads a trend
off the left edge.

**Cards added is stacked, not summed.** The backlog called summing the
consistent default and stacking the more informative one; stacking turns out to
be both, because the bar *total* still equals `progressStatNewCards` exactly —
pinned by a test against `summarizeProgress`. So the dashboard tile and the
shared image keep their number while the chart can still say that Wednesday's
spike was a 474-card pack import rather than an enormous study day. A test holds
that total; without it the two surfaces could drift apart silently.

⚠️ **Neither new chart takes the mark toggle, and that dissolves a hazard the
item flagged.** `amgi_week_chart_mark` is a single key shared by both platforms,
so a second consumer would mean switching one chart silently switched another.
It never arises: a stacked pair has no line form (two series as one polyline is
a different chart), and a cumulative curve has no bar form (bars would draw each
one as its own contribution — a level read as a rate). The form follows the data
here rather than being offered, so there is nothing to remember.

⚠️ **The learned curve reaches one day further back than you would expect, and
that is not an off-by-one.** `LEARNED_SERIES_START` is `DETAILED_HISTORY_START`
**minus a day** (2026-09-05, not 09-06). The curve is walked backwards from
today's all-time count by subtracting crossings, so the value at the end of day
D needs every crossing on the days *after* D — for 09-05 those are 09-06
onwards, all recorded. There is a test pinning exactly this, because it is the
thing most likely to be "corrected" into being wrong.

**Everything before it is `null`, never 0, and the line stops.** A curve running
off the left edge into a flat zero claims nothing had been learned then, which
is the one thing the missing data does not say. Both platforms draw only the
known run and caption where it begins, or the chart would look truncated by a
bug.

⚠️ **The mature backfill guard is repeated on both detail surfaces**, rather
than assumed to have run on the dashboard. These are routes, so either can be
the first progress surface an account opens; `matureBackfillAt` keeps it
one-shot, so repeating it costs one preferences read and never a second walk.
Without it a deep-linked first visit would anchor the curve on an undercount.

**Retention stayed off, deliberately.** The verdict counters are per-language
only from 2026-09-04 and the display came off every surface on 2026-09-12; a
detail view is exactly where it would have crept back in because the data is
sitting right there. `byHour` is likewise still not per-language, so "when do
you study Korean" remains a question these rows cannot answer.

**Three follow-up calls the same day, all the user's, after seeing it.**
**Seven days joined the detail screen's ranges and is its default** — a detail
view answers "how is this deck going lately", where the dashboard is read for
the shape of a season, and it is also the one window where both charts sit
entirely inside recorded history. ⚠️ **The range hand-off was dropped to make
that possible**: every arrival is from a row on the dashboard, so an inherited
`?range=` would have meant the screen opened on 90 every time and seven days
would never have been the default.

⚠️ **The stacked bar was reversed one day after it shipped**, for legibility
rather than taste: at 52 bars each band is a few pixels, and the two colours are
steps of one ramp because the ramp is what is theme-safe on both platforms. It
is a **source filter** now — nothing selected means the total, so the resting
state still equals `progressStatNewCards` and the consistency argument that
justified stacking survives intact. Tapping the selected chip clears it, so the
control is its own reset and needs no third chip.

**The weekly chart's title became a measure dropdown** (Reviews / Cards added),
which is the first thing to make the range row's neighbour answer more than one
question. A seven-day `buildCardsAddedSeries` buckets daily, so its rows line up
one-to-one with the heatmap cells — which is what lets both measures share the
scale, the marks, the tooltip and the labels. Session state, not a remembered
preference: the mark is how you like charts drawn, this is a question you ask
and come back from.

**The cards-added bars carry their own numbers, and the axis gave way to them**
(later the same day, on the user's ask — they were looking at the Korean chart
and wanted it more satisfying to read). **An axis exists to let a level be read
off a shape that cannot be labelled** — which is the learned curve, not this.
Labelling every bar states the same quantity *exactly*, so keeping both is two
encodings of one number. The gridlines therefore collapse to the zero line when
the labels are on. ⚠️ **The gutter stays** even with only a "0" in it: dropping
it would win ~30px of bar width and cost the left-edge alignment with the curve
directly below, which is the more valuable of the two.

⚠️ **Three constraints on those labels, and each exists for a reason that is not
obvious from the code.** `LABELLED_BAR_MAX` is keyed on **bar count, never the
window** — the grain changes underneath it, so 7 days is 7 bars and 90 days is
13 weekly ones (both fit) while 30 daily bars and a year's 52 do not; rewriting
this as a range check would silently label the 30-day view into a collision.
**Only non-zero bars get a number**, because cards added is a *sparse* series —
most days you add nothing, and a row of zeroes is noise. And a zero day keeps a
**1px stub** rather than vanishing, since an absent bar and a zero bar look
identical and only one of them is true.

**Weekday labels replaced the two end dates when a bar is a day**, matching what
the dashboard's weekly chart already does, so the two read as one family. Taken
from each bucket's own date rather than a fixed Sunday-to-Saturday run, because
these seven days end on today. A weekday means nothing on a bar covering seven
of them, so weekly buckets take dated ticks instead — see below.

**The learned curve gained a dot per point, and the axis gained middle ticks**
(later the same day, on the user's ask). Both charts now decorate their marks
individually under **one** threshold, `DECORATED_MARK_MAX` — a number over every
bar, a dot on every point. ⚠️ **It is deliberately a single constant covering
both plots**: they sit one above the other, so two constants sharing a value
would drift and the charts would change character at different windows, which
reads as a bug in whichever one changed second. It also renamed from
`LABELLED_BAR_MAX`, which had stopped describing what it governs. Dots are drawn
from `known`, so the curve and its vertices stop at the same place rather than
the dots running on past where the data does.

⚠️ **`AxisLabels` is gone, and naming only the two ends was the defect.** It said
how long the window was and nothing about where anything inside it sat — on a
90-day chart every point between the two labels was unplaceable without hovering
it. `DateTicks` spreads up to four dates instead, each positioned at the *centre
of the mark it names* rather than evenly across the width, so a tick sits under
its own data. The indices are deduped: rounding can otherwise land two ticks on
one mark on a short series. Mobile needs the measured plot width for this, for
the same reason its line does — React Native has no percentage translate.

**A fourth tile: average per day, per language** (later the same day, user's
call). It reuses `progressStatAverage` rather than taking copy of its own,
because it is the dashboard's measure narrowed rather than a different one.
⚠️ **The narrowing is the whole content of `languageAveragePerActiveDay`:
"active" means the days *this language* was studied, not the days the account
was.** A day spent entirely on Japanese is not a quiet Korean day, it is not a
Korean day at all — averaging those in would make every language look worse the
more languages you study, so the figure would be measuring how divided your
attention is rather than how much you do when you sit down with a deck. Rounded
and zero-safe to match `summarizeProgress` exactly, so the two tiles cannot come
to disagree about what the words mean.

⚠️ **The tile asked for first was "cards reviewed", and it is not a
rollup-shaped question.** Worth recording, because the gap is easy to notice
again and expensive to re-derive. Distinct cards **cannot be summed across
days**: a per-day distinct-card counter double-counts anything reviewed on two
days, so unlike `reviewedToday` this is not a missing counter. Counting cards
whose *last* review falls in the window is the correct dedupe, and the last
review **is** recoverable — `getNextReviewData` sets `nextReview` to `now +
interval` on a pass and to `now` on a lapse. So the honest route is a stored
`lastReviewedAt` plus `uid ==` and a range filter, which needs a **composite
index on all ten card collections**, built by hand (lessons.md). **Unlike every
other counter here it would be backfillable**, from that same interval
arithmetic, the way `backfillMatureFlags` recovered maturity — so "from today or
from never" does not apply to it. Not built; the free tile was taken instead.

⚠️ **Verified by suite and compiler, not by eye.** Web is 635/635 with 20 new
assertions, both apps clean under `tsc --noEmit`, lint unchanged at 21 warnings
/ 0 errors, and `expo export` bundles — which is the check that matters most
here, since `app/progress/[language].tsx` sits beside the existing
`(tabs)/progress.tsx` route and a collision is invisible to TypeScript.
**Nobody has looked at either screen**, on a device or in a browser: the
stacked bars, the curve, the two tooltips and the Korean labels at 52 bars are
all unseen. No new native module — `react-native-svg` was already counted for
the weekly chart — so the build story is unchanged.

### Grammar returns as content, not as a mode — and not as its own app (2026-09-14)

⚠️ **Largely superseded 2026-09-21 — read the two entries of that date above
first.** Both of this entry's central calls fell: grammar *is* a mode now, and
levels are *not* the spine — tools are, one at a time, with the grouping read off
them later. The French A1 ladder and its sourcing gate are cancelled outright.
What still governs is everything else here: authored or computed rather than
generated, graded locally, zero model calls in the daily loop, never pooled with
vocabulary review, and why the four 2026-08 removal reasons do not transfer to a
closed conjugation table. That last argument is the one this entry is still worth reading
for.

**The question was whether grammar belongs in Amgi at all**, reopened after the
2026-08-18 removal and with a separate grammar app on the table the way Hwasul
is for speaking. The answer: **the half of grammar that is authored content
belongs, as a pack. The half that is diagnosis stays removed.** No new tab, no
mode, no second app.

⚠️ **First, why the 2026-08 removal happened, because it was recorded nowhere.**
The commit, the merge and the entry below all say "the user's call" and list what
was deleted; none of them says why — so answering this required asking the user
rather than reading. This is the exact failure this section exists to prevent.
All four reasons fired at once: **it made the app feel unfocused, the practice
itself was not good, it went unused, and it was heavy and slow.** And one fact
sets the bar for anything replacing it — **the user is not its user**: "I want it
to exist, but I'm not the user."

**The decisive observation: verb conjugation is not the thing that was removed.**
The ask that reopened this named French conjugation, and that sits on the
opposite side of every axis the removed feature failed on. What was removed was
errors-as-syllabus — emergent from your own writing, model-*generated* per turn,
model-*graded* free production, carrying its own queue and collection. A
conjugation paradigm is **closed, finite, externally authored, gradable by string
comparison, and needs no model call at all**. So the four removal reasons do not
transfer: it is a pack rather than a toggle (focus), the exercise is a published
table rather than an invention (quality), it costs nothing while unused
(adoption), and it has no round trip (weight). Naming it "grammar" is what made
these look like one question.

**The research already said this and was read backwards.** `docs/grammar-research.md`
§1 finds the explicit-practice advantage **concentrated in easy rules** — short
scope, high reliability, few exceptions — and not significant for hard ones. A
conjugation paradigm is the paradigm case of an easy rule. Amgi built the hard
end, where the evidence is weakest, and skipped the end the evidence actually
supports.

**The precedent is the kana packs, and it transfers exactly.** `vision.md` admits
them against its own not-for-beginners rule because **a writing system is a
prerequisite, not vocabulary** — an adult who reads Chinese still cannot read
かな. An adult with 500 French words still cannot conjugate *mettre*. A
paradigm table is infrastructure in the same sense, and it is literally the same
*shape*: `layout: 'grid'` exists for a wall of cells that has to stay scannable.

**And `vision.md` amended itself on 2026-09-09, after the removal, in a way that
reopens this.** Per-level *content* is now allowed where the ladder "comes from
somewhere real — a published curriculum or exam sequence someone thought about."
That amendment was made for 급수 and it covers a conjugation table for the same
reason. **It does not reopen the curriculum**: what stays refused is the app
deciding what a learner is ready for, and a pack of tables decides nothing.

**Why not a separate app.** The test is **whether it needs new nouns.** Speaking
does — a session, a turn, a recording, realtime latency — which is why Hwasul is
a coherent idea. Conjugation needs **zero**: it is `VocabPack` + `layout: 'grid'`
+ the existing `/decks/[packId]/drill`, all built. Against that, a second app
costs its own auth, habit, retention, store listing and Beta App Review cycle —
and the no-OTA model already makes each of those expensive here. Spending that on
a feature already removed once for being unused, for a user the builder is not,
is the highest-cost and lowest-signal option available.

**Three constraints the user set the same day, and they sharpen the shape rather
than complicate it.**

1. **Grammar review is never pooled with vocabulary review.** Its own row in the
   review picker. This is already the house rule — `collections.ts` keeps
   collections apart rather than pooling and filtering, and refuses an
   "everything" collection outright. ⚠️ **And the research does not object**, which
   is easy to get backwards: the interleaving finding measured grammar points
   against *each other*, never grammar against vocabulary. The entry below already
   records that as an extrapolation. So the instinct is backed rather than
   tolerated.
2. **Levels are the spine — A1 first, building up as users need more.** See the
   `vision.md` amendment of this date, which this reverses a line of.
3. **One concept at a time, authored — not a format that fits whatever turns up.**
   This is the exercise *generator* being rejected, and it is what kills the
   remaining machinery: `getPatternExercise` and `gradeFromReview` stay dead.
   Items are written by hand, graded locally by `typedAnswer.ts`, single
   direction. Zero model calls.

**The structural insight that makes all of this cheap: a grammar point is a
*subpack*, and its practice items are the *entries*.** One pack per level, one
subpack per concept, each entry an authored cloze. Level → concept → item is two
levels, and packs are exactly one subpack deep, so this needs **no nesting
change** and inherits enrolment, the review picker, progress and drill as they
stand.

⚠️ **This does not contradict "a grammar point is not a card."** That argument
rejected one card *per pattern* carrying a gloss — the lookup-table row that
teaches the card instead of the function. Here the concept is the subpack and the
cards are *instances of exercising it*. Losing that distinction is how this
becomes the thing that already failed.

⚠️ **`ReviewCollection.kind` does not come back.** It existed only because a
patterns row and your own cards were both `id: null`; a grammar pack carries a
pack-shaped id, so `collectionKey = id ?? ''` still resolves. The separation is
cheaper now than the version that was deleted.

**Writing comes back — as the diagnostic, never as the practice** (added later the
same day, on the user's ask). ⚠️ **This revises the line that stood here**, which
said writing review stays dead. It is revised for a reason inside this entry
rather than because it was asked for: the `vision.md` amendment above justifies
the levels reversal on the grounds that **errors-as-syllabus lost its sensor**.
Writing *was* the sensor. Bringing it back restores the premise, so the
conclusion has to be re-examined rather than quietly kept.

**The two were built as competitors and are actually complements.** The old
design had a finding *generate* a `GrammarPattern` and then *generate* exercises
for it — two model calls per practice turn, unbounded scope, invented exercises.
With an authored ladder in place a finding instead **classifies into a closed
set**: "this is `la négation ne…pas`, A1 #7", which already has its items
written. That is the same move `normalizePartOfSpeech` makes — match a closed
code list, drop what does not fit — and it is far more reliable than generation.

**The cost profile inverts, which answers the "heavy and slow" failure
directly.** The old design put the model **inside the daily loop**, a call per
turn. This puts it **only at the diagnostic moment** — `/api/writing` is one
`gemini-2.5-flash` call at temperature 0.1, already deployed and unchanged. Daily
practice stays authored, local and offline.

**One real change to a recorded decision: submissions stay ephemeral, findings do
not.** Store the **concept ids and counts**, never the prose — "missed `la
négation` four times" is the syllabus signal, and the passage still is not kept.
Strictly less persistence than the version that was rejected, and it is the piece
that turns a one-shot review into a syllabus. It also earns the best surface in
the plan: **the grammar collection ordered by the learner's own error counts.**
That is the whole synthesis in one line — **authored content, emergent
ordering.** Neither half was sufficient alone, which is why both previous
attempts failed.

**The gap card returns for free** — `WritingCardCandidate.gap` is implemented,
the prompt already specifies it, and the route is deployed. It is vocabulary, so
it feeds the ordinary card flow. Cheapest win here by a distance.

**What stays dead, and this is still the load-bearing half:** generated
exercises, model-graded free production, and writing as a *practice* surface.
`getPatternExercise` and `gradeFromReview` do not come back. Writing diagnoses;
authored clozes practise; the two never swap jobs.

⚠️ **Sequencing is the whole risk control, and writing is third.** A finding has
nowhere to point until the ladder exists, so: (1) one concept end to end, (2) the
French A1 ladder, (3) writing as the router into it. That ordering doubles as a
**gate** — writing returns only if (1) and (2) get used, which is the honest
response to "it went unused" from a builder who is not the user. It buys the
option rather than the commitment.

⚠️ **Do not oversell what this buys.** Authored cloze is Paulston's *controlled*
rung, and the same research is blunt that controlled practice alone does not
build form-meaning mapping — Bunpro is the shipped cautionary case, and with
production removed and no writing surface, Amgi now buys its ceiling knowingly.
Accepted for now rather than solved. This does **not** fill the
sentence × production cell `vision.md` wants and must not be described as doing
so. **First language is French, A1** — and one concept ships end to end before a
level is authored.

### A tap on a mobile pack saves the word; detail moves to the second tap (2026-09-13)

On mobile, tapping an **unsaved** entry in a pack now saves it where it stands.
Tapping a **saved** one opens `CardDetailModal` as before, and a **long press**
opens either. The unit this adds is the one the screen was missing: sections are
a sitting, the whole deck is a course, and *these eight words* was previously
eight taps, eight modals and eight dismissals — enough friction that saving the
whole section was the easier move, which is how sections nobody wanted ended up
in review.

**Detail was not removed, it was re-ordered.** The second tap is a better moment
for it anyway: by then there is a card to hang depth and examples on, which is
what the modal is for. The modal is still the only card surface here and still
carries edit/archive/delete, so a mis-tap is undone by tapping the word again
and deleting — no separate unsave.

⚠️ **Web deliberately did not move.** One tap opens there, and the hint copy is
now two pairs of keys rather than one: `packTapHint`/`packTapHintCards` for web,
`packTapSaveHint`/`packTapSaveHintCards` for mobile. A pointer is not a finger —
on web the modal is cheap to open and dismiss, and the cost this removes is a
sheet that covers the list you are reading down.

**Two guards came from enrolment's own scars.** A tapped word writes through
`saveFlashcardsBatch` as a one-card batch rather than
`saveFlashcardToFirestore`, so it lands in the section's subpack via
`buildPackCardDraft` exactly as the section button would file it, and counts as
a pack card rather than a lookup. And when `savedTerms` is still null — the
fetch in flight or failed — a tap **refuses and says so** rather than saving,
because reading unknown as "not saved" is precisely what once enrolled all 71
katakana twice. A local `pendingSaves` set ticks the row on tap so a run of
eight does not read as taps being dropped, and is pruned once the listener
confirms, so a later delete cannot leave a row ticked.

### A native language per deck, and an interface language beside it (2026-09-12)

**`nativeLanguage` was doing three jobs, and the third is why it had to
split.** It picked the card's back slot, it was interpolated into every
`/api/explain` prompt, *and* it was the language of the app's own chrome.
Reading them as one made "Japanese explained in Korean, app in English"
unsayable. The user's call, asked before any code: **backs and explanations
follow the deck; chrome becomes its own setting.**

The deciding argument for putting explanations on the deck side is that they
are **stored on the card and never regenerated** — `definition`, `notes`,
`characterBreakdown`, `briefDefinition` are `Flashcard` fields. Tying them to a
setting that changes later would leave a card whose back is Korean beside a
definition in English, permanently. Shape, migration and the collection
constraint are in [data-model.md](data-model.md).

**The collision resolvers are deleted rather than deprecated**, and that is the
part worth knowing before anyone re-derives them. `resolveStudyLanguage` and
`resolveNativeLanguage` repaired one situation *after* it happened — studying
the language Amgi was speaking to you in — by moving the other setting out from
under the user. With a native language per deck, `nativeOptionsFor` drops the
study language at the point of choosing, so the pair cannot be built; and the
interface language is independent of every deck, so switching decks cannot move
it. That also **retires the one-tap-switch confirmation dialog** recorded in the
2026-09-04 entry below, along with its three i18n keys. The dialog was correct
for as long as a switch could re-language the whole interface. It no longer can.

**The compiler was made to find the call sites, because it otherwise cannot.**
Both values are `string`, so a miscategorised one is silent — a Korean back
beside an English definition, or an app that flips language on a deck switch.
So the context stopped exposing `nativeLanguage` at all and now exposes
`interfaceLanguage` and `deckNativeLanguage`: every one of the ~40 consuming
files failed to compile and had to be re-read and classified deliberately. Two
useful findings fell out of that pass. `directionLabel`/`directionPrompt` were
genuinely *mixed* — they translate chrome **and** derive the back slot from the
same argument — so they take both languages now, which is what lets a chip read
"Japanese → Korean" *in English*; there is a test pinning exactly that sentence,
because it is the one the old signature could not produce. And
`DeleteAccountModal`'s `LOCAL_KEYS` had to learn the two new cache keys, or a
deleted account would leave its language list behind for the next sign-up to
adopt.

**Not done, deliberately:** no backfill of stored explanations. A card written
in English before this stays in English; the deck's language governs what is
written *next*. Rewriting existing cards would spend a model call per card to
change text the learner may have already read and scheduled.

⚠️ **Verified by typecheck and the web suite, not on a device.** Web is
619/619 with both apps clean under `tsc --noEmit`. `npm test` at the root still
fails on `@amgi/mobile` having no `test` script — pre-existing, and the reason
mobile's half is an `expo export` instead. Nobody has yet watched the migration
run against a real multi-deck account, which is the thing to watch first.

### The progress surfaces say what they measure, and the ramp was measured (2026-09-12)

Five items, queued and shipped the same day, on one framing from the user:
**review is about how much you reviewed and how many cards you have learned, not
how accurately you recalled them — and how long it took matters less still.**
That sentence decided three separate things below.

**Retention came off every surface, and nothing behind it changed.** The
percentage is gone from the per-language row on mobile, the tile on the image
and the `ret` parameter. The four verdicts are still written on every rating and
`retentionRate` is still exported, because a rollup keeps only what it counted
in advance: stopping the *write* would throw the history away permanently and
make the per-language split re-earn its 2026-09-04 boundary, where stopping the
*render* costs nothing to undo. ⚠️ **The route must go on tolerating `ret`.**
Mobile ships by build and the route is server-side, so an installed 1.6.0 keeps
appending it for as long as it is on the phone; it is simply unread now, and a
test pins that.

**Week alignment sits *over* `buildHeatmap`, not inside it.** The grid could not
honestly be labelled as it stood — the window starts where it starts, both
screens chunked by seven, so row 0 was whatever weekday the window opened on and
it shifted daily. `buildWeekGrid` pads to the week boundary on top. Inside would
have reached the shared image, which consumes the same cells and deliberately
does *not* align to weeks, and whose `h` parameter is one character per day
asserted on both sides of the URL. Padding is `null` rather than a zeroed cell:
a slot before the window opened is not a day nobody studied.

⚠️ **Month ticks walk days, not columns** — and this was a real bug, caught by a
test rather than by reading it. Keying off each column's first cell put August
on the 2nd and September on the **6th**, because 1 September 2026 is a Tuesday
and 1 August a Saturday, so the column holding the 1st opens in the previous
month. The label landed up to a whole column right of the month it names.

**The heatmap ramp was replaced, and this is the call the 2026-09-07 entry
deferred.** That entry left `levelColor` alone because restyling a shipped
screen is a product call; asking for the data visualisations to be improved is
that call being made. Measured, not eyeballed — the old alpha blend composited
per theme and run through the palette validator: forest **non-monotonic** (a
rest day rendered *lighter* than a studied one), empty versus level 1 at **ΔE
1.4 under deuteranopia** (4.7 normal), hue spread **131°** because blending a
pink highlight over a green ground walks the hue across the wheel, and all three
themes below the 2:1 light-end contrast floor. The new steps are generated in
OKLCH per theme: one hue, monotone lightness, adjacent ΔL ≥ 0.06, faintest step
≥ 2.36:1 on its own surface, and empty kept a **categorical** break at ΔE 20
(≥ 17 under CVD) rather than a step on the scale. Level 4 is still each theme's
exact highlight. **Web and mobile had drifted to two different ramps** — 45% vs
50% at level 2 — and now share one set of values.

**Cards learned is windowed, on the user's call.** It reads as a lifetime figure
and the windowed one is not that, but all-time is only derivable from the card
documents: nine `where uid ==` queries across nine per-language collections,
every time the tab opens, which is the exact cost `shareStats.ts` exists to
avoid.

⚠️ **Shipped withheld, and that was a defect — corrected the same day.** The
first cut reused the image's rule and returned `null` whenever the window
reached past 2026-09-06. Every range on offer is 30 days or more, so that meant
*never*: 30 days back is 2026-08-14, 90 is 2026-06-15, a year is 2025-09-14, and
the 30-day tile would not have appeared until 2026-10-05. The rule exists to
stop a quiet fortnight reading as a low score, not to hide a figure for a month.
A first correction shortened the window to the honest part and captioned it
"since 6 Sep". **That was superseded the same day, and the user's question is
what exposed the real mistake**: the interval is on every card and always has
been, so "is this card learned" never needed the rollups at all. Only "*when*
did it cross" did — and that is the sole thing the 2026-09-06 boundary governs.
The tile had been answering the harder question by accident.

**So "cards learned" is now a state, counted from the cards.** `isFlashcardMature`
reads `frontToBack.interval`, `backToFront.interval` and the pre-split top-level
`interval`, and the answer is stored as a `mature` boolean on the card.

⚠️ **A stored flag rather than a derived one, for one reason: aggregation.**
`getCountFromServer` bills per index scan rather than per document, and two
equality filters (`uid`, `mature`) are served by merging single-field indexes —
so **no composite index**, and ten collections cost ten cheap queries instead of
a read of every card the user owns. Deriving it live would have meant reading
the whole deck on every visit to a tab people open constantly.

**Three writers, one definition.** The rating write, the undo write and the
one-off backfill all call `isFlashcardMature`; three call sites each choosing
their own field set is exactly how they would drift. It is written even when
*false*, so a lapse clears the flag rather than leaving a card counted forever.
Mobile gets this through `updateFlashcardReview` alone — live ratings, ratings
flushed from the offline queue and undos all funnel through it — where web needs
it in two places because it builds its update map inline.

**And unlike a rollup, this one could be backfilled.** A card not rated since
2026-09-12 carries no flag, and long-interval cards are precisely the ones
nobody has rated lately, so the first count would have missed most of its
subject. `backfillMatureFlags` walks all ten collections once per account,
writing only the *mature* cards — a card below the line needs no flag, since
`mature == true` does not match a missing field — and records
`matureBackfillAt` on `users/{uid}` so it never runs twice. The interval is
current state sitting on the document, which is the whole reason this is
possible where a day-of-crossing never was.

⚠️ **The image loses its cards-learned tile entirely.** An all-time figure
cannot sit on a canvas where every other number names one window, and a windowed
one would wear the same words as the dashboard tile while reporting a different
number — the one thing this file says twice not to do. `summarizeProgress` still
returns `totalCardsMatured`, so a window-scoped figure can come back the day it
is given a label that says which window it means.

**It needed no console step, and that was checked rather than assumed.** The
worry was a rule constraining which fields an update may write, since `mature`
is new on ten collections and the rules are manual and not uniform. They are
scoped to *operations* — `read, update, delete` + `create`, or `read, write` +
`create` — and enumerate no fields. Confirmed live the same day: the backfill
wrote its flags and the count returned **196** on a real account, where a rule
rejection or a missing index would have thrown and drawn no tile at all.

⚠️ **The backfill has therefore already run against production data**, from a
dev server rather than a deploy, and `matureBackfillAt` makes it one-shot.
Clearing that field on `users/{uid}` is the only way to make the count
recompute if it is ever wrong.

**Per-language learned costs nothing extra**, because the count was always
per-collection — ten `countMatureFlashcards` calls whose breakdown was being
thrown away in a `reduce`. `mergeLanguageRows` now joins it to the window's
`byLanguage`. ⚠️ **The union is the point**: taking only the window's languages
would hide a deck left alone lately, which is exactly the one whose total you
have forgotten; taking only the languages with learned cards would drop one
being studied now that has matured nothing yet. A row therefore carries two
scopes — a windowed review count beside an all-time learned count — which is
fine on a screen being read and is why this is *not* on the shared image.

**The weekly chart was bars only — reversed 2026-09-12, and mobile now carries
both marks.** The original call was the user's, on the trade being named: seven
days is seven discrete counts, which is what bars are for. That entry already
recorded that the dependency was never the obstacle — Expo SDK 57 bundles
`react-native-svg` 15.15.4 and Skia — so when the user asked for parity there
was nothing to weigh. It was a form choice, and the form choice changed.

**Mobile is now the web chart's twin**: the same title, the same two marks
behind a toggle, the same `niceCeiling` scale and gridlines, and per-day detail.
What differs is only what must — the line is `react-native-svg` rather than
inline SVG, and the detail is a **tap** rather than a hover, since a phone has
no pointer to rest. The remembered mark sits in `AsyncStorage` under
`amgi_week_chart_mark`, mirroring web's `localStorage` key; web keeps its
`useSyncExternalStore` because it has a server snapshot to hydrate against and
mobile does not.

⚠️ **`niceCeiling` and `weekAxisTicks` live in core, and must stay there.** The
ceiling decides how tall every mark is drawn, so two copies drifting would make
one week look like two different weeks on the two platforms. They are the first
chart logic this project has unit-tested (`progress.test.ts`), which is worth
something on surfaces that otherwise have no tests at all.

⚠️ **The old mobile plot scaled to its own busiest day**, which guarantees
exactly one full-height bar and therefore says nothing about how big a week it
was. That — not the missing line — was the real defect behind "make them match".
One series, so the title names the measure and there is no legend. **No day is
labelled inline any more**: the sentence here used to claim the busiest one was,
which web never actually did, so the two are now honestly the same — the
gridlines carry the magnitude and a tap carries the rest.

⚠️ **A crash was caught by a grep rather than by a type.** Mobile's language bars
took their scale from `summary.byLanguage[0]`, which was correct until the list
being rendered became the *union* — a dormant language with learned cards makes
that array empty while rows still exist, so `[0].progress` would have thrown.
TypeScript does not check index access without `noUncheckedIndexedAccess`, and
neither platform's screens have tests, so nothing else was going to catch it.

**Days studied came off both surfaces** (same day, user's call). Beside a streak
it read as a second opinion on one question, and the streak is the one people
mean. `activeDays` stays in `summarizeProgress` — still data, no longer a tile —
and the route tolerates a stale `d` from an installed build exactly as it does
`ret`.

**The chooser previews what it is offering.** Each row draws the actual asset at
thumbnail size, which costs no new machinery: the picture *is* a URL, so the row
renders the same address the share sheet is about to be handed. No second
confirm step — you are looking at what you are about to post while picking it.
Web keeps its anchor (the thumbnail sits inside the `<a>`, so the no-JS download
still works) and waives `@next/next/no-img-element` deliberately, since routing
an OG render through the image optimizer to draw 80px is worse than the raw
request. **The direction this is heading is Strava's**: pick a card, see it,
post it.

⚠️ **Mobile went the whole way there the same day, because the sheet could not
work at all** (2026-09-12, user's call). Its chooser was a `BottomSheet`, which
is a React Native `Modal`, and it closed itself before calling
`Sharing.shareAsync`. **iOS silently refuses to present a view controller while
a modal is animating out**, so the share sheet never appeared, `shareAsync`'s
promise never settled, the `finally` that cleared the busy flag never ran, and
the Share button stayed `disabled` until the app was reloaded — three symptoms,
one cause. Timing around the dismissal would have been a race to lose later, so
mobile's chooser is now a **pushed screen** (`app/share.tsx`): a pushed screen is
not mid-transition when its own button is tapped, which removes the race rather
than narrowing it. Web is untouched and keeps its `<details>` of anchors.

**The preview screen offers a card per range, not per variant.** Swiping is only
worth doing over more than two things, so it draws **30 and 90 days plus
today**, opening on whichever range the Progress tab had selected. ⚠️ **The year
is deliberately not offered** (user's call): 364 cells is a wall that says less
about how you are doing lately than 30 does, and opening from the year chip
falls through to the 30-day card. So the screen needs 90 days of rows where the
tab holds only the range it shows — **one** 90-day query of its own on open, the
same shape of single indexed read the range chips already do.
`buildShareStats`'s no-reads promise is intact: what costs a read is the new
screen, not the numbers. Which cards exist is `buildShareCards` in core, tested
there, so the per-card zeroed-image gate and the ordering cannot drift between
platforms. Errors are inline and the Share button is its own retry — an `Alert`
fired during that same dismissal was subject to the very bug above.

**The card carries four tiles now, and two of them are blank until October**
(2026-09-12, user's call). Streak was the only one left after the cull earlier
the same day; it is joined by **Newly learned**, **Time studied** and **Cards
added**. ⚠️ **"Newly learned" is not the dashboard's "Cards learned"** — that
tile is the all-time count of cards past `MATURE_INTERVAL_DAYS`, which cannot
share a canvas where every other figure names one window, so this is
`cardsMatured`, the *crossings* inside the window, under a label that says so.
The rejection recorded here on 2026-09-12 named exactly that condition, and this
meets it. ⚠️ **Both it and Time studied are withheld until the window clears
`DETAILED_HISTORY_START` (2026-09-06)**: the Today card shows them immediately,
the 30-day card from **2026-10-05** and the 90-day card from **2026-12-04**. A
withheld figure is omitted from the URL rather than sent as 0, and the route
draws no tile for it — so the row is built, not declared, and a card can carry
anywhere from one to four tiles. Cards added has no such boundary and reuses the
dashboard's own `progressStatNewCards` wording, since the two count the same
thing. Tile type shrinks at three or more, because "Time studied" at 30px does
not fit the ~228px a fourth tile gets.

**The image names languages and will never split its figures by them.**
`byLanguage.reviews` goes back to the start; the verdicts inside it only to
2026-09-04 and `cardsMatured` to 2026-09-06, so a per-language number would
break the one-window rule over any window worth posting. Codes travel in the
URL, not display names, so the label lands in the reader's language; the route
filters them through `isStudyLanguage`, which also bounds what glyphs the image
can demand.

⚠️ **The font subset is a standing maintenance obligation, and it bit twice.**
It held 53 glyphs, and **every** language name in both locales fell outside it —
"Korean" wanted a `K` it did not have, 한국어 had 한 but neither 국 nor 어 — all
of which renders as nothing, silently. Two regenerations took it to 122. **The
User-Agent decides the format**: a bare `Mozilla/5.0` gets the raw TrueType
satori needs, a modern browser UA gets WOFF, and an MSIE UA gets **EOT**, which
is what the first attempt downloaded — its "magic" was a little-endian file
size. Verify the cmap covers what you asked for; do not verify by looking at a
picture. The derivation and the trap are in the header of `fonts.ts`.

**The today card is a layout, not a second pipeline.** `buildShareStats` over a
one-day window is already correct numbers for today, so `v=today` picks a
template from the same route — which it must, since mobile cannot rasterize a
view without a native module that costs a build and breaks Expo Go. An absent
`v` is the window card, so every URL an older build produced is unchanged. It
drops the calendar (one day is one square), drops Days studied (it can only read
1) and carries no study-time tile at all, per the framing at the top.
⚠️ **The shareable gate is asked per variant** — a today card on a blank day is
the zeroed image that check exists to prevent, however full the window beside
it. Web's chooser is a `<details>` of per-variant anchors rather than a button
menu, so the no-JS download that made that component an anchor survives the
choice.

**The image itself finally was verified visually** (2026-09-12) — the first
thing on this entry that has been. `next dev` serves the route, so
`curl localhost:3000/api/stats-image?…` writes a real PNG that can simply be
looked at; no build, no account, no device. Both locales, the today card and the
30-day card, one tile through four.

⚠️ **It immediately caught a bug that reading could not.** Korean writes 2h 40m
as 「2시간 40분」 — eight full-width glyphs that cannot fit the ~228px a fourth
tile gets at any legible size, so the value wrapped, grew its tile, and shoved
its own label below the other three. English never wraps and looked perfect.
The fix is a **fixed two-line box around every tile value**, so a label sits on
the same line whether or not a neighbour wrapped. The lesson generalises past
this tile: *any* label or value on this canvas has to be checked in Korean, at
the tightest column it can land in, and the check costs one curl.

⚠️ **Still unverified: the mobile screen around it.** The carousel, its paging
and the OS share sheet need a device — the standing caveat under Builds. The
calendar also needs a signed-in account with history to draw real data.

### 병과 material is a section of 부대·참모, and its branches keep the 「-과」 (2026-09-09)

**Two calls, one branch. Both are the user's on the first, mine on the second.**

**A subpack, not a fourth pack.** The backlog item asked for a Military
specialties pack and it was built that way first: 66 pairs, eight sections, all
four services' statutory inventories, the 병무청 enlisted specialty list and a
traps section, registered as `military-specialties-ko`/`-en`. The user's call on
seeing it: *"i think it might be a little excessive to make a whole new pack.
maybe it could be better to just add a subpack to the unit and staff pack
relating to branches and specialties with just some of the most common/basic
terms."* Reverted and rebuilt as one 24-pair section of 부대·참모.

**Why that is the better shape, in hindsight.** The branch is the third question
after what unit and what rank, and both of those are already this pack. A fourth
military deck would have split one conversation across two decks and asked a
learner to enrol twice for it. **Subpacks made the smaller shape lose nothing**
— the section is separately enrollable, drillable and reviewable, with its own
progress, so "just the branches" is still a thing a learner can do. That is the
same argument that closed the Review-group item on 2026-09-09, arriving from the
other direction.

**The research survives the cut.** What was dropped is listed with its reasons in
`docs/packs/military-branches-subpack-draft.md`, so an expansion — the Navy and
Air Force inventories are the most defensible one — starts from sourced material
rather than from scratch.

**Branch names are written 보병과, not 보병.** Two reasons and the second is
mechanical. The statute names them that way, so the form is sourced rather than
invented, and 보병과 can only be the branch where 보병 is also the arm. And the
bare forms are **already cards in this same pack** — 보병, 방공, 수송, 보급,
군사경찰 — so repeating them would put two cards with one front, and two with one
answer, into a single review queue, which `military-packs.test.ts` refuses across
both packs in both directions. The English side follows the same rule (Infantry
**Branch**, Transportation **Corps**), which is also how the US Army writes its
own branch names.
⚠️ **This is the likeliest thing here to be wrong.** 보병과 is the legal
register; a soldier asked their 병과 answers "보병". It is pinned by a test so
that changing it is a decision rather than a drift, and it is the first thing the
draft asks a reviewer.

**The back is the US branch, not the official English.** 법제처's translation of
군인사법 is an official source and unusable as a card back: it renders 병참과 as
"logistics" — a different ROK branch, 군수과 — and 부관과, now 인사과, as
"aide-de-camp", which is a person. So the back is what a US listener says and
the hint carries the official English where they differ. **That gap is the whole
reason the section is worth having**; a bare bilingual chart of branch names is
something a reader could already find.

⚠️ **Every US branch name rests on one source family** (two Wikipedia pages,
which is self-consistency rather than corroboration), so the section is 7 A, 16
B, 1 D. A reviewer with DA PAM 600-3 can lift most of it to A, and that is the
highest-value thing anyone can do to it. **The word list was approved 2026-09-09**
— of the list, not of those two open items.

### A phrase on the Hanja deck stays a list of characters (2026-09-09)

**Left as built, on the user's call.** Typing 수신제가치국평천하 — or 修身齊家治
國平天下 — into the Hanja deck returns an eight-item disambiguation, one entry
per character with its 훈음, and picking any of them gives a proper card. The
rule that makes a multi-character term ambiguous rather than a card generalises
to the hangul form on its own; no separate handling was needed.

**The argument for leaving it**: every chip is a genuine hanja card, and someone
who types a 고사성어 into a character deck plausibly wants exactly that — its
characters. Studying 고사성어 by their hanja is a normal way to study them.

**What was considered and declined.** The deck is answering a different question
than the one asked, and does not say so — the *phrase* is a Korean vocabulary
item, and the Korean deck already answers it properly (`partOfSpeech: 'idiom'`,
a real gloss, and the depth section breaking out its hanja; the user's own card
for this phrase lives there). The right fix is a cross-deck pointer — "this is a
word, study it on the Korean deck" — and that needs a concept the app has never
had. Declined for now rather than invented mid-branch.

⚠️ **`meanings` has no cap anywhere**, so a pasted run of hanja renders as many
chips as the model returns. Known and accepted: nothing breaks, it is only long,
and no real input has hit it. A prompt-level cap was offered and declined with
the rest. If the wall ever shows up in use, that is the cheap half of the fix.

### The hanja button says the 음, and refuses to say anything else (2026-09-09)

Hanja shipped without audio earlier the same day, and the reason expired within
hours: the voice was settled (`ko-KR`, with `ko-KR-Neural2-C` for single
characters) and the *text* was not, because the answer worth hearing is the 음
and the 음 had no field until three-sided cards landed. It has one now.

**Measured before deciding.** 水 handed to a Korean voice does return audio —
6720 bytes, against 6336 for 수, both well clear of the silence floor. So the
argument for speaking the 음 is not that the glyph fails; it is that **nothing
in the response says what it read**, and a deck whose whole subject is a
character's reading cannot rest on a guess about one. The 음 is a string the
card already holds.

**Enforced in the component, not by convention.** `PronounceButton` renders
nothing on Hanja unless it is given the 음. A surface that forgets to pass it
loses a button instead of gaining a mispronunciation, and example sentences and
translations on this deck therefore have no button at all — which is right,
since neither is a hanja reading.

`getSpokenText` took the 음 as a third argument beside `furigana` rather than
growing a second function: both answer the same question — the reading that
resolves a glyph — and they never appear on one card, so the precedence between
them only had to be defined, not negotiated.

Every utterance on this deck is one syllable, which is exactly what
`ttsShortVoiceName` exists for: Chirp 3: HD intermittently returns silence on a
lone character where Neural2 returned it 0/91 times.

### The 급수 pack was sourced, not recalled — and how (2026-09-09)

**Approved by the user 2026-09-09.** 300 characters, five subpacks, 8급 through
6급. The item budgeted for sourcing being the hard part and it was, but it came
out better than expected: the 배정한자 is published as an XLS in 어문회's own
learning-materials section, and a transcription of it carries the levels *and*
the 대표훈음 with 훈 and 음 already apart — the shape three-sided cards need.

**Fetched as bytes, not as prose, and that is the transferable part.**
`raw.githubusercontent.com` is blocked from the sandbox, so the CSVs came
through the GitHub *contents* API and were base64-decoded locally. The available
alternative was a fetch-and-summarise tool, which puts a **model** between the
source and the file — and a model transcribing 300 hanja is precisely what
"the model is not a source" forbids. It is not a hypothetical: it is how the
四 compatibility-ideograph rows would have been silently normalised away, or
not, with no way to tell which. **When a pack rule says a model is not a source,
that includes the model inside the fetch tool.**

**Two independent sources on the half that matters.** Unihan's `kHangul`
corroborates all 300 음 with no exceptions, and ko.wikipedia's cumulative counts
(8급 50, 7급 150, 6급 300) match at the three rungs it names — which also
settles the per-level figures the backlog had carried as unverified: 50 / 50 /
50 / 75 / 75 newly assigned.

**The kanji-pack question is answered: neither reads from the other.** 151 of
the 300 overlap, and the two decks deliberately answer different questions —
the kanji pack authored *modern Korean* glosses (女 → 여자, 大 → 크다) where a
hanja deck needs the 대표훈음 (계집 녀, 큰 대). So there is no shared source to
keep in step, and the drift risk the backlog flagged does not exist. The kanji
pack corroborates the character and the English; never the 훈.

**The one row that shipped knowingly wrong is fixed.** 省 is 살필 성 —
*examine* — and Unihan's `kDefinition` has only "province" and "save,
economize". It shipped as "province" with the wrongness flagged rather than an
unsourced "examine" written in, and the call came back *examine* on 2026-09-09.
It is now `examine, inspect`, tier B off Wiktionary's own wording for the xǐng
reading, with CC-CEDICT and Unihan's own `kJapaneseKun` (`KAERIMIRU`, 省みる)
agreeing on the sense Unihan's definition field omits. **The lesson is that
flagging held**: the row was findable, the call was one line, and nothing had to
be re-derived to make it. Its English is the only one in the pack from outside
Unihan, so it has its own table (`OFF_UNIHAN`) rather than a line in
`OVERRIDES`, which is what keeps the tier column honest.

**The ingest script is committed beside the draft** because the draft's tier
column is a claim about provenance, and a description of a method is not
evidence of it — re-running it reproduces all 300 rows exactly.

### Three-sided hanja cards cost a setting, not a scheduling axis (2026-09-09)

**Shipped as scoped**, and the scoping is the whole story: the first read of
"three-sided" looked like a third `ReviewDirection`, which is a two-member union
read in 92 places across 24 files and written into every card document in every
language. It is not that. Three parts split into a front and a back is six
configurations, and those six are three partitions × the two directions that
already exist — so `sm2.ts`, `reviewQueue.ts`, `offlineReview.ts` and the
direction filter were **not touched at all**.

**`hanjaFaces()` is the only place the parts are joined**, and that is the rule
worth keeping. `hun` and `eum` are stored apart because the split moves; any
surface that assembles its own 훈음 is a second opinion about the separator.
The back also keeps 한자 · 훈 · 음 order whichever part was lifted out of it, so
水 물 and 물 水 never appear as the same fact in two orders.

**`korean` is still written, and derived.** Every surface keyed on the language
pair — the card list, the detail modal, CSV and Anki export, `getBackSide` —
reads `korean` and now gets the assembled 훈음 without knowing partitions exist.
It is filled from `hunEum()` at the one point a card is written, so it cannot
drift from the two fields it comes from. The alternative was making six generic
surfaces Hanja-aware to avoid storing a derived string; this is the smaller
change and the drift risk is contained to one line per platform.

**Typing is off on Hanja, in both directions.** `gradeTypedAnswer` grades
against *a* side, and a typed 물 against a back of 물 수 is neither right nor
wrong until someone decides whether both parts are required — and on the default
partition the expected answer is a glyph most learners cannot type. Left off
rather than guessed at; `promptsForTyping` takes the study language to say so.

⚠️ **The accepted cost stands: switching partition inherits intervals earned
answering a different question.** The control lives in settings on both
platforms and **nowhere else** — in the review session it would drift into a
per-session toggle and make those inherited intervals meaningless. Reopen with
partition-keyed tracking if switching turns out to be common; it is additive and
invalidates nothing stored.

### Hanja's card back, and the `hanja` name it had to take (2026-09-09)

Two calls taken together, because the registry entry could not be written
without either. Both set by the user.

**An English native gets 훈음 *plus* an English gloss, not instead of it.** 水 is
물 수 to every reader — 훈음 is how the character is *named* in Korean, and
"water" is a different fact about it rather than a translation of 물 수. The
alternative on the table was a Korean-native-only deck, which is arguably truer
to an 어문회 exam deck and closes it to everyone else. So a hanja card carries
four parts: the character, its 훈, its 음, and an English meaning that an English
native sees in addition to the 훈음.

**This is the first card `getBackSideConfig` does not fully describe**, and the
gap is structural rather than a bug. That function answers "which slot holds the
translation", keyed on the *pair* of languages; 훈음 is not a translation and
belongs to neither side of the pair. It still answers correctly for the gloss
slot, which is all it is asked for, and the Hanja branch of `/api/explain` asks
for `korean` outright instead of routing through `nativeBackRule` — which is
empty for an English native and would have dropped the 훈음 for exactly the
reader who most needs it spelled out.

**The deprecated `hanja` depth field was migrated rather than guarded.** It held
legacy Korean cards' character breakdown and was left in place precisely to
avoid a migration, read through `getCharacterBreakdown()`. The new study field
wants the same name for the character itself. The cheap option was a guard —
fall back to the legacy field only for Korean cards, which is precise, since it
was only ever written for them — and the user chose the migration instead:
`migrate:legacy-hanja` promotes it to `characterBreakdown` and deletes it, and
`TermDepth` loses the field. One name, one meaning, nothing to remember later.

⚠️ **The migration must never touch `cards_hanja`**, where `hanja` is the front
of the card: promoting it would put the character in its own breakdown section
and then delete the front. The script excludes Hanja by construction — it builds
its collection list from the registry minus that one entry — rather than by a
filter a later edit could widen past.

### Per-level content is allowed; per-level adaptivity is not (2026-09-09)

**Amends [vision.md](vision.md).** The line "no level setting, no placement test,
no per-level content" now refuses only the first two. Set by the user while
scoping the Hanja packs: *"per-level content is still allowed, but we still want
to apply first principle thinking... we don't create per-level content just for
the sake of it, but rather because we want the content to be approachable and
easily navigable."*

**What the old wording conflated.** Two different things sat in one list. A
level *setting* and a placement test are the app deciding what a learner is
ready for — that is what the rule exists to refuse, and it still refuses it,
because the user's own input already says. Content *organised* into levels is a
navigation question, and it never had the same argument against it. The old
wording only held up because nothing had tested it.

**What replaces it is a test, not a permission.** Levels are allowed where they
make content approachable and navigable, refused where they are structure for
its own sake. Two things to check: does the ladder come from somewhere real — a
published curriculum or exam sequence someone thought about — and can a learner
tell from outside which rung they want. 급수 for hanja passes both. Slicing a
vocabulary deck into "level 1–5" to look organised passes neither.

**Why this was already latent.** The kanji pack chose 학년별한자배당표 over a
JLPT tier for exactly this reason and argued it at length — a real curriculum
with an order someone thought about. That was per-level content shipped in
August under a rule that read as forbidding it, which is a fair sign the rule
was wrong rather than the pack. The **kana exception amended into vision.md
2026-07-24 is untouched** and is a different point: it is about scripts not
being beginner content, not about levels.

**Not affected:** domains-not-starters, and audience-is-not-beginners. A 급수
deck is still a domain — hanja — being unlocked in a sourced order, not a
starter deck.

### No Review group in settings — subpacks answered it instead (2026-09-09)

**Closes "What belongs on the review screen versus in settings"**, removed from
the backlog rather than built. The user's call, on seeing subpacks working:
*"i think we managed to remove the need for a review screen settings by adding
subpacks."*

**What the item was actually stuck on.** The rule it named — *the review screen
holds session properties, settings holds durable preferences* — covered
everything except one axis: a control that is **durable but scoped to review**.
That axis was the only argument for a Review group inside settings, and the
whole item was waiting on it.

**Subpacks removed the pressure by making the scoping structural.** The thing
you would have reached for a persisted setting to do — sit down with part of a
deck rather than all of it — is now a thing you *pick*, in the place you pick
what you are reviewing. A remembered preference would be a worse version of
that: it answers once, invisibly, where the picker answers every session and
shows you the state it is in.

**The rule stands and is now written down**, which was half the item's value:
session properties on the review screen, durable preferences in settings, and
nothing in between needing a third home.

⚠️ **What this does not decide.** Default direction and whether typing starts on
are still session state that resets, and nobody has asked for them to persist.
If someone does, this entry is the thing to reopen — the answer then is a Review
group in settings, and the settings screen's own flat-list problem (noted with
the per-context pronunciation speed item) becomes the same piece of work.

### A pack is reviewable as a whole, and that narrows an older rule (2026-09-09)

**Closes the first of the two calls the subpacks item left open**, answered by
the user directly: *"i still want to be able to review a whole pack; i think
it's relevant when i've already studied all the subsections i wouldn't need to
review the sections separately."*

**It contradicts something written down, which is why it is here.**
`ReviewCollection`'s header says there is *deliberately no "everything"
collection* — a pack and your own words are learned for different reasons, and
katakana arriving mid-way through Japanese vocabulary is worse review than
either done alone. A whole-pack review is that same shape one scope down, so it
needed an argument rather than a shrug.

**The argument is that the rule was never about scope, it was about provenance.**
Two collections are kept apart when they were learned for *different reasons*. A
pack's sections were authored as one deck for one purpose — Greetings and
Numbers are both "the Kikuyu you start with" — so pooling them is not the mixing
the rule rejects. The rule stands unchanged for everything above the pack. What
it gains is a boundary: **a pack is the largest thing that pools.**

**And the user's case is the one the second level would otherwise break.** Once
every section is studied, reviewing them one at a time is six sittings of the
same material — so a design where the only scopes are subpacks would have made
finishing a pack *worse*. The second level is additive: the pack row is first in
its group and stays a real sitting.

**Mechanically it is one asymmetry**, `cardInCollection`: a subpack takes only
its own cards, a pack takes its own *and* every subpack's. Cards saved before
subpacks carry a bare pack id and land in the pack with no subpack, which is why
the migration could ship after the feature rather than inside it.

**One knock-on:** a pack with a single subpack holding all of it renders flat,
because "the whole pack" and "the one section" would be the same sitting offered
twice.

### The gloss ceiling is one rule, and the semicolon knows about disambiguation (2026-09-08)

**Closes "Should `/api/explain` allow two glosses?"** — the only item that was
in Bigger bets, answered by the user directly rather than derived: *"so this
semicolon thing is now only applied for the word of the day? can we have it
also for the explain."* Yes. The entry below had left the two routes differing
on purpose; that difference lasted about an hour.

**Seventeen hand-written copies became one import.** `/api/explain` stated the
rule sixteen times as a bullet plus once as a fragment on the native back, in
four cosmetic wordings, covering eighteen templates (nine languages ×
context/no-context; Kikuyu and Swahili share one rules constant across both of
theirs). It now reads `GLOSS_RULE` from `apps/web/src/lib/glossRule.ts`, and so
does `/api/word-of-the-day`. This is `characterBreakdownInstruction`'s argument
applied to the thing that had already drifted: the day's word stated **no rule
at all**, which is how it shipped "deadline, time limit, period".

**The ceiling had to be restated as a total.** "Never a third" has a loophole —
the model reads it as *never a third within one sense* and nests the marks.
Measured on the lookup: 시원하다 came back "cool, refreshing; relieved, satisfied"
and 微妙 "subtle, delicate; questionable, iffy", four glosses each, both obeying
the rule as written. The sentence now names the whole field and forbids using
both marks at once.

**The semicolon is branch-aware, and that came from the user asking whether the
ambiguity checker was relevant.** It is, decisively. A no-context lookup can
answer `ambiguous: true` with `meanings`; the chip the learner taps comes back
as the `context` of a second lookup (`page.tsx:200` → `handleDisambiguate`). So
the same mark means different things on the two sides:

- **Context template** — the sense is already pinned, so a semicolon does not
  say the word has two senses, it says the prompt ignored the one it was given.
  Comma only. Measured 0 semicolons in 8 pinned re-lookups.
- **No-context template** — a semicolon competes with `meanings`. Two senses far
  enough apart to need one are two chips, not one back. What is left for it is
  the band the ambiguity bar deliberately excludes ("closely related variants of
  the same concept"): 迷う's "get lost" and "be undecided", one idea applied to a
  place and to a decision.

**The disambiguation flow absorbed the offenders, at no extra friction.** Every
word that had produced a four-gloss back — 微妙, 시원하다, 답답하다, 거리, 迷う —
routes to chips instead. And the **chip rate did not move**: 13/30 under the old
strict-single rule, 13/30 under the new one, so the clause redirects which words
disambiguate without sending more of them there. That was the risk worth
measuring, since a chip is an extra tap before a card.

**Known leak, not fixed:** 1 in 28 still breaks the ceiling — Swedish `orka` as
"to have the energy/strength; to cope", which manages a slash *and* a semicolon.
It is left as measured rather than chased with a fourth wording pass.

### The word of the day gets a gloss ceiling of its own (2026-09-08)

**This reverses the cancellation three entries down, on the user's call the same
day.** That entry read the divergence as a question the core lookup had to
answer first — one gloss or two — and parked it behind "Should `/api/explain`
allow two glosses?". The user answered it directly for this surface: *"i don't
like how i find it oftentimes produces translations with many synonyms. i would
rather it translates with one or two only when it's necessary like how we have
our learn search work."* A ceiling nobody had to derive is not a bigger bet, so
the route stopped waiting on one.

**The ceiling is one gloss, a second only when one would mislead** — the card
back's rule, not `/api/explain`'s strict single. A word of the day *is* a card
back, since saving it is what the card is made from, and forcing one gloss onto
a term no single word covers makes the card wrong rather than clean. The prompt
also names the failure it is correcting, because the model's default reading of
"the best translation" was a list: `"deadline"` is a gloss, `"deadline, time
limit, period"` is a list.

**The rule counts glosses; it does not legislate punctuation** — corrected the
same day, again on the user's call: *"i think using a semicolon can still be
alright though (?) i can imagine scenarios where it's necessary."* The first
pass banned the semicolon outright, copying `/api/explain`'s "never list
synonyms with semicolons or slashes", and that was the wrong lever twice. The
reported failure is a **count**, and a ban on the mark is only a proxy for it —
one the model satisfies while still answering "to return, to do again, to
recover". And it forbade the mark carrying the most information: a comma joins
near-synonyms inside one sense, a semicolon separates two senses. 迷う is "to get
lost; to be undecided", and comma-joining those reads as one idea — the exact
misleading back the second gloss exists to prevent. So the rule now sets the
count (never a third) and lets the punctuation *say which kind of pair it is*.

**The slash stayed banned, and that clause is not the same kind of rule.**
Dropping the punctuation sentence dropped the slash with it, and one word in 24
came back as `orka` "to have the energy/strength". A slash is not a sense
distinction, it is a comma the model declined to commit to, so it is named
explicitly. With it back, `orka` returns as "to have the energy, strength".

**Measured twice, 24 words across six languages each.** Before the punctuation
correction and after: zero three-item lists both times, so relaxing the
semicolon did not reopen the failure. What changed is that the semicolons which
appear are genuine sense splits — 거리 "street; distance", 驕傲 "proud; arrogant",
마감 "deadline; closing" — while near-synonyms take the comma (ambiance
"atmosphere, mood"). **A two-sense back is still a weaker card than a one-sense
back**, since it asks two questions at once; it is accepted here because the
alternative is a back that silently hides a meaning, and `briefDefinition` sits
directly beneath it to disambiguate.

**`/api/explain` did not move, and the Bigger bets item stays open.** The user
named Learn's lookup as the thing that already behaves, so changing it would
have been changing the one surface that wasn't reported. The two rules now
differ on purpose — strict single on the lookup, one-or-two on the day's word —
and that difference is the open question, not a drift to reconcile.

**Nothing repairs a document already written.** The word for a (date, language
pair) is generated once and read back by everyone after, so every day already
stored keeps the gloss it was given; the fix reaches tomorrow's word, and
today's only if its document is deleted. Same shape as the `pitchAccent`
decision above — this route has never repaired a stored document on read, and
the CDN TTL was already shortened so a deletion takes effect the same day.

### The save button is one live control, and web moved too (2026-09-08)

Mobile's signed-out save button was painted `saveBtnDisabled` while its
`onPress` ran `handleSignIn` — reported as "looks like it isn't clickable",
and it was clickable the whole time. Fixed by **deleting `saveBtnDisabled`**
rather than by dimming it less: signed out, this is the primary action on the
screen, because it is how an account gets created. The style had no other user,
so the question was whether it should exist, not what shade it should be.

**Web changed too, and it is the half of this that wasn't in the report.** The
backlog described web as a filled primary button plus a separate underlined
sign-in link, and treated that as the better shape to copy. Web was actually
running `disabled={!user}` on the save button, so signed out it was *genuinely*
inert and the small underlined link was the only live control. That is honest —
it never painted one control two ways — but it makes the primary action the
least prominent thing in the group and leaves a dead button sitting on top of
it. Copying it onto mobile would have converged the platforms on the weaker
shape.

So both platforms now render **one control that is always live**, with the
label carrying the state: "Save as flashcard" signed in, "Sign in to save
flashcards." signed out. Web's `disabled={!user}`, its `disabled:` utilities,
and its separate link are gone; the click handler returns early into
`handleSignIn` when there is no user.

⚠️ **The disabled paint was unreadable, not merely dim.** `saveBtnText` is
`C.bg` on `C.border`, which is `#173F35` on `#2D6355` (~1.6:1) on forest and
`#2C2E34` on `#414550` (~1.4:1) on Sonokai — both far under any threshold, so
even a genuinely-disabled button could not have kept that pairing. Deleting the
style resolved the contrast question rather than answering it; if a disabled
save state is ever needed, it needs a new colour pair, not this one.

**The two platforms still differ in fill, and that is pre-existing.** Mobile
fills with `C.highlight`; web fills with `--color-muted` and goes to highlight
on hover. This change aligned the *shape* — one control, one meaning, label
switches — and deliberately did not repaint web's button, which would have
changed the signed-in state nobody complained about. Web's generate button on
`page.tsx` keeps its `disabled:` utilities: it really does disable while a
lookup is in flight.

### Readings reach mobile review, and no setting comes with them (2026-09-08)

`getReading` renders Kikuyu respelling, Japanese furigana + pitch accent and
Chinese pinyin. Web's review screen called it on both faces; **mobile's called
it nowhere** — mobile used it only on Learn and in `CardDetailModal`. So a
Kikuyu learner reviewing on a phone read bare orthography, which for Kikuyu is
the whole point of the aid, and Japanese and Traditional Chinese lost their
readings on that screen too. A parity bug, not a missing feature.

**No setting shipped with it, and that is the decision.** The ask arrived as
"let users *see* Kikuyu pronunciation during review", which reads as a request
for a toggle — but nothing was gated: the render was simply absent. A toggle
would have been a switch for a feature that did not exist on that screen yet.
A reading is an aid rather than a spoiler, and web has shown them
unconditionally since they existed without anyone asking for a switch. Shipping
the parity with no control is the cheap experiment that finds out; an actual
complaint reopens it. The homes-for-controls question the item was really about
stays in [backlog.md](backlog.md), unanswered on purpose.

⚠️ **Reveal-gated on both directions, which is web's placement and not the
obvious one.** The pronounce button on this screen rides the study side
wherever it lands — visible immediately on `frontToBack`, at the reveal on
`backToFront` — so the consistent-looking choice would have been to show the
reading early on `frontToBack` too, and it would not have spoiled anything. It
is gated anyway because the alternative puts the badge *above* the divider on
one draw and *below* the answer on the other with no shared moment of
appearance; a learner would find it in a different place depending on the
direction they drew. Web already resolved this the same way by bundling the
reading into a chip row that only exists after the answer.

Styled as the bordered pill Learn and `CardDetailModal` already put a reading
in, so the same string looks the same on all three mobile surfaces. Derived
from `card` rather than `shownCard`: enrichment writes depth and examples,
never `furigana` or `pitchAccent`, so the reading cannot change mid-card — the
same reason the pronounce button reads `card.furigana`.

**The drill screen is not affected and is not a gap.** It works on `PackEntry`,
which carries no `furigana`/`pinyin`/`kikuyu` fields for `getReading` to read,
and web has no drill to be out of parity with.

### Seven backlog items close, and one of them closes a reopen path (2026-09-08)

A cleanup pass on the user's call rather than a build pass. Six items were
cancelled and one was finished; what follows is the part that would otherwise be
lost, since none of these leaves a commit behind.

**A speaker has read the Kikuyu Basics list, and it stands as written.** The
first native check on pack *content* at volume, and the item that asked for it
is closed rather than cancelled. It settles the two questions the draft was
holding open — the `guka`/`wagui` conflict, and whether kinship is inherently
possessed — as written, and it covers the verb section, which was where a check
was worth the most: seven of ten were Dahl's Law applied to sourced stems rather
than attested infinitives. **The per-entry tiers stay** (16 corroborated twice,
36 on one source, 7 derived); they are now the record of where each entry came
from rather than the only assurance behind it.

⚠️ **This does not clear the respelling table.** The known-unchecked list in
[lessons.md](lessons.md) — `th` [ð] read as *thin*, `g` [ɣ] and `b` [β]
respelled as stops, doubled vowels split into separate syllables, unmarked
stress, the `ĩ`/`e` and `ũ`/`o` merges — is a claim about the *table*, and a
speaker reading 59 entries checks only the rows those entries exercise. The
2026-08-31 cancellation of the respelling item stands for the rest.
Three documents said the check was outstanding and all three are corrected: the
draft header, the pointer in [README.md](README.md), and — the one that mattered
— **`docs/testflight-beta-info.md`, where it was tester-facing copy in both
locales** saying the Kikuyu meanings may be wrong.

**The word learning surface is cancelled: review is the first encounter.** The
user's call and their reason — a word can be learned while reviewing it. The
item's premise is unchanged and was never a bug: a new card is due in *both*
directions at once (`isDue` returns both when neither is tracked, `sm2.ts:23`),
so saved goes straight to graded. That is the loop working rather than a gap to
fill, and the cheap thing this avoids is exactly what the item warned about —
a presentation step that starts writing scheduling becomes an `sm2.ts` change.

**`pitchAccent` is not backfilled.** The item was written as "or decide not to"
and this is that decision. The existing `cards_japanese` deck keeps showing bare
furigana, and **it does not self-heal** — nothing re-runs the lookup on a saved
card. Accepted because the fallback is silent and correct, the deck is small,
and the alternative is a one-off script writing to production data to improve a
display detail. The lookup being a local table made this cheap in *cost*; it
never made it cheap in *risk*, which is the half that decided it.

**Word of the day's synonym lists: cancelled, and the gloss ceiling moves up a
level.** The divergence is real and stays true —
`word-of-the-day/route.ts:138` asks for "the best English translation" with no
anti-synonym rule, so it produces backs `/api/explain` explicitly forbids
("Never list synonyms with semicolons or slashes"): `gũcoka` as "to return; to
do again; to recover", `délai` as "deadline, time limit, period". Cancelled
because fixing it means picking a ceiling — one gloss or the two a card back
already allows — and that question belongs to the core lookup, not to one route.
It now lives entirely in **Bigger bets** as "Should `/api/explain` allow two
glosses?"; when that moves, this route is a single prompt line behind it.

**The pack roadmap closes; packs get scoped one at a time.** TOEFL, and the
Swedish / French / Traditional Chinese gaps, stop being tracked as a list to
work down. **The MOS pack is unaffected** and is now the only pack tracked at
all. Nothing about the standard changed, and none of the principles the item
carried are lost with it: audience-is-not-beginners and domains-not-starters
are in [vision.md](vision.md), with the kana exception amended there
2026-07-24; sourcing, tiers, citations and render-it-before-you-believe-it are
in `docs/packs/README.md`. What the item actually held beyond those was a
queue, and a queue nobody has asked to work down is not a plan.

**The shared term cache is cancelled — and it takes the local-model reopen
condition with it.** This is the consequence worth writing down. The
2026-08-08 decision closed on-device inference with a *specific* reopen
condition: "when the term cache is live and has a measured hit rate, *and*
there is an eval set to score a candidate on". The first half is now
unreachable, so **on-device is closed rather than waiting** — reopening it
means re-arguing the cache first, from `docs/local-model.md` §8, which remains
accurate as analysis and is no longer a plan.

**Precompute depth and examples falls with it**, and always would have: the
item said it was best done *after* the cache "which is where the results would
live". ~600 model calls with no store behind them is a one-off spend that
expires when the deck changes.

**What the file looked like after this pass.** High held one item (per-context
pronunciation speed); Medium held seven; the rest was Bigger bets, Parked,
Housekeeping and one clarification. Both sections have moved on since — High
was refilled on 2026-09-12 and that item went to Medium — so read
[backlog.md](backlog.md) for the shape rather than this sentence. Two long meta-notes were compressed rather than kept —
why build-checking is not tracked, and what left the High section — since both
were already recorded here in full.

### The stats image: one window, and a heatmap ramp that measures wrong (2026-09-07)

The render half, shipped the day after its counters. The design calls are in
the commits; three things outlive them.

**Every figure shares one window, or is withheld.** An image is read all at once
and out of context, so "412 cards learned" beside "1,204 reviews in 30 days" is
taken as two 30-day figures — a lie told by juxtaposition rather than by either
number. `buildShareStats` returns `null` for a figure the window cannot honestly
cover and the image drops it, following what `retentionRate` already does with
an unrated slice. **Concretely: `cardsLearned` is `null` until 2026-10-06**, so
the image shows four numbers for the first month and five after, with no code
change. That is the design working, not a gap to patch.

⚠️ **The app's own heatmap ramp is measurably wrong, and was left alone.**
Running the palette validator against `levelColor` — which alpha-blends the
highlight over the background — found two defects. Its lightness is **not
monotonic**: the lightest studied day renders *darker* than an unstudied one.
And empty versus level-1 are **ΔE 1.4 apart under deuteranopia** (4.7 with
normal vision), so "did not study" and "studied a little" are one colour to a
red-green colourblind reader. The image ships a corrected ramp — one hue,
lightness climbing, empty put ΔE 24 below level 1, since no-data versus
some-data is a *categorical* distinction rather than a step on the magnitude
scale, and lightness is the channel that survives every kind of CVD.
**`levelColor` itself is untouched on both platforms.** It matters less there —
a dashboard cell is tappable and carries a tooltip — but it is the same defect,
and fixing it is a visible restyle of a shipped screen, which is a product call
rather than a side effect of this feature.

**Two findings about the render stack, both of which cost an hour.** Satori has
no system font and the bundled Geist has no Hangul, so Korean renders as blank
boxes unless a face is passed — and the documented way to load one,
`fetch(new URL(..., import.meta.url))`, **fails under Turbopack in dev**, where
undici refuses the `file:` URL outright. The fonts are base64 in source instead,
which is only affordable because they are Google Fonts `text=` subsets: ~10KB
each against ~5.7MB for a full weight. **Regenerate them if the image gains a
character** — a glyph outside the subset draws as nothing, silently.

And **the route's raster cannot be unit-tested**: resvg's wasm does not
initialise under vitest, so `GET` fails on the raster step regardless of its
inputs. Parsing and layout were split out and tested instead, which immediately
earned itself by catching two real bugs — a missing `w` produced a *one-day*
window, because `Number(null)` is `0` and finite so the fallback never fired;
and a 364-day window overflowed the canvas, because cell size was derived from
width alone.

### The share asset's counters, decided before its picture (2026-09-06)

The stats half of the shareable-asset item shipped alone, ahead of the render
and ahead of any surface at all. The reason is the one the item itself carried:
a daily rollup keeps only what it counted in advance, so the choice for each
counter was never "now or later" but **"from today or from never"**.

**"Cards learned" is either direction past 21 days.** Anki's convention, and the
looser of the two readings on purpose. `both` is arguably more honest — you can
recognise *and* produce it — but the review screen has a direction filter, so a
recognition-only learner would score a permanent zero, and a counter that reads
zero for a whole class of user reads as broken rather than as strict. The unit
is *cards*, so unlike `reviews` it double-counts nothing.

**`maturityChange` takes both directions, which is the whole point of it.** A
second direction reaching 21 days on an already-mature card must count nothing.
Without that check the counter would inherit exactly the doubling `reviews`
has — and the reason a new counter was needed at all is that `reviews` counts
directions and cannot be relabelled into a card count. **A lapse subtracts**, so
a window sums to a net figure: someone who forgets a word and relearns it has
not learned two cards.

**Study time is per card, not per session** — and this is the finding that made
the item affordable. It was scoped as the expensive counter, needing a session
timer that survives backgrounding, a force-kill and a phone left face-up on a
table; it would still have been wrong in all three. Anki's measurement —
question shown to rating submitted, capped at 60s — attaches to a rating that
already exists, needs no lifecycle, negates cleanly, and rides the offline queue
untouched. Both it and the maturity crossing are **free at the rating**:
`trackingFor` and `getNextReviewData` were already computed there for the write.

**`byHour` is the one addition that does not ride `COUNTER_KEYS`**, because it
is a map rather than a counter — it needs its own line in merge, negate, apply
and parse, the same four `byLanguage` gets. It is **day-level, not
per-language**: 24 keys times nine languages to answer a question that was never
per-language.

⚠️ **Undo changed shape, and had to.** It rebuilt the delta from the verdict,
which was exact only while the verdict *was* the delta's entire content. Think
time and a maturity crossing are not recoverable from it, so a rebuild would
have subtracted numbers the rating never added. `recordReview` now returns a
`RecordedReview` and `undoReview` takes it back — undo is exact by construction
rather than by two call sites continuing to agree. `reviewDelta`'s context stays
optional throughout, so a caller measuring nothing produces a byte-identical
delta to before, which is why the existing 32 progress tests passed untouched.

**What this means for reading the numbers.** `PROGRESS_HISTORY_START` is
2026-08-20 and `historyStartsMidWindow` guards *that* boundary only. These three
begin **2026-09-06** and have their own, unguarded: a window reaching back
further undercounts rather than being wrong in an interesting way. Any surface
showing them over a long window has to say which boundary it means.

### Mobile navigation, and verdicts per language (2026-09-04)

Four of the six mobile-UI-redesign items shipped together. Three of the calls
behind them are worth keeping; the fourth is a data decision that cannot be
reopened for free.

**The fifth tab is Progress, and Settings left the bar.** The ask was framed as
a "Profile" tab. Progress is the better name on three counts: it names the
screen rather than the account it belongs to, `navProgress` already existed in
both locales so it cost no new copy, and it makes mobile's fifth tab and web's
fifth sidebar item the same word for the same thing — closing a parity gap
rather than opening one. The account block became a header row on that screen,
not its subject. What actually drove the swap is reachability: `/progress` was
reachable only from the streak badge, which renders only while `streak > 0`, so
**breaking a streak hid the screen that would have told you**. Settings, by
contrast, is visited a handful of times ever and now sits behind a gear.

**Review is the initial route.** The order is Review · Cards · Learn · Packs ·
Progress, and the decision that mattered was not the order but what a cold open
lands on — the first tab is the app's own answer to "what is this for", given
on every launch, and the answer is *remember*. Lookup is intent-driven and one
tap away; reviewing is what a returning learner skips when it isn't in front of
them. ⚠️ **`unstable_settings.initialRouteName` is what enforces it.**
Declaration order sets the bar only; `/` still resolves to the tab group's
`index`, so without that export the bar reads Review-first while a launch still
opens on Learn. Web was deliberately **not** reordered: `/` is Learn there, and
a vertical sidebar has no leftmost, so "first" makes less of a claim.

**Verdict counts moved inside `byLanguage`, before the screen that wants them.**
`again`/`hard`/`good`/`easy` were whole-day, which made retention per language
underivable. A daily rollup keeps only what it counted in advance and cannot be
backfilled, so the choice was not "now or later" but "from today or from
whenever someone asks" — every day it went unshipped was a day permanently
without the number. Shipped ahead of any surface for it. Retention counts three
of the four buttons (`hard` is a recall that hurt, not a miss, matching
`getNextReviewData`, which resets only on `again`), and `retentionRate` returns
`null` rather than `100%` for a slice with no verdicts so a pre-2026-09-04 day
reads as *not recorded* instead of *perfect*.

**The one-tap language switch confirms before it moves your native language.**
`setStudyLanguage` runs `resolveNativeLanguage`, so choosing the language Amgi
currently speaks to you in relocates your native language and changes the whole
interface. That is defensible behind a settings screen and alarming from a chip
in a header. The alternative on the table — dropping your own language from the
quick list — was not taken: it removes a legitimate choice to avoid explaining
it. The confirm lives in the shared `StudyLanguageList`, so **settings inherited
a guard it never had**, which is the argument for sharing the list at all.

⚠️ One thing this pass did **not** do, deliberate and still in
[backlog.md](backlog.md): per-context pronunciation speed. The shareable stats
asset that sat beside it here **shipped 2026-09-07** — see the two Decisions
entries above it.

### Checking a build is not tracked work (2026-09-04)

The ranked list of what a release has never been exercised on — eight items on
1.5.0, some of them carried since 1.3.0 — is **off [backlog.md](backlog.md)**.
It had become the oldest open work in the project by outliving four releases,
which is the tell: nothing on it was ever going to be worked through as a
sitting.

**Why.** Every item on it is reached by using the app — playing a clip at Slow,
reviewing on a phone, typing an answer, opening the packs list. A user of the
app finds them; a list of them only accumulates. Two releases' worth of asking
testers to go and check (1.3.0 and 1.4.0's What to Test) returned nothing
either, and 1.5.0's copy deliberately stopped asking. Keeping a queue nobody
works and nobody reports against costs the file's credibility: a backlog whose
oldest section never moves reads as a backlog nobody trusts.

**What was kept, and where.** The facts outlive the tracking, so none of them
were deleted:
- **What has never run on a binary** — pronunciation audio, CSV/Anki export,
  sharing, offline review across a force-kill, the review reminder, account
  deletion against production — stays in the ⚠️ under Builds above, which is now
  the single home for it. Android is still separately unexercised beyond sign-in.
- **The Slow speed's fallback** (server-side rates behind an unchanged UI) is in
  its own Decisions entry, 2026-09-01, where the ear test was deferred on
  purpose. That was the only item with a decision hanging on it and it needs no
  backlog line to survive.
- **The Kikuyu speaker check** stayed *as work*, moved to Medium in the backlog.
  It is the one thing on the old list that using the app cannot surface: no
  amount of review tells you whether a sourced Kikuyu stem is an attested
  infinitive.
- **Deleting `writing.ts`/`grammar.ts`** was never a check — it moved to
  Housekeeping, where the rest of the dead-code cleanup already sits.

The backlog section that held all this is now **Cutting a build**: the pre-flight
order, the What to Test rule, and the `--non-interactive` warning — the things
you need at the moment you cut one.

### Pronunciation speed is a playback rate, not a synthesis rate (2026-09-01)

The speed dial is built. The question it turns on is whether choosing a speed
regenerates audio, and the answer is **no** — nothing about the server changed.

**Why not.** `SPEAKING_RATE = 0.85` in `apps/web/src/app/api/pronounce/route.ts`
is baked into the cache path
(`pronunciation/{lang}/{voice}-r{rate}/{hash}.mp3`). Making the rate a request
parameter means a fresh Google TTS call *and* a permanent stored object per rate
per term — an unbounded multiple of both the bill and the bucket, for a
preference most users set once and never touch. Stretching at playback keeps
**one cached file per term at any speed**, and changing speed costs no round
trip at all. Web uses `HTMLAudioElement.playbackRate` with `preservesPitch`;
mobile uses `expo-audio`'s `setPlaybackRate(rate, 'high')` with
`shouldCorrectPitch`. Both are pitch-corrected on purpose: a slowed clip that
also drops in pitch stops sounding like a careful speaker and starts sounding
like the wrong voice.

**Three named chips, not a slider.** Slow (0.7×) / Normal (1.0×) / Fast (1.2×),
defined once in `packages/core/src/tts.ts`. This settles the asymmetry the plan
flagged — mobile has a settings tab with room for a slider, web has a narrow
dropdown with none — because **both surfaces already speak in chip rows** for
theme and language, so the same control fits each without either growing. It
also keeps the fallback cheap: a fixed set maps onto server-side rates (three
objects per term, still bounded) without the UI changing at all.

`normal` is **1.0, not natural speech** — a multiplier on a clip already
synthesized at 0.85. That is what keeps every existing user at the pace they
have always heard, and it is asserted in a test rather than left to a comment.

**One control covers everything.** `PronounceButton` is the single component
behind the term, the translation and the example sentences, so a second setting
would have had nothing to name.

**Device-local**, following theme's precedent (`localStorage` / `AsyncStorage`),
not a `users/{uid}` field. Study and native language are on the account because
they must follow the user everywhere; a playback rate is a property of the
speakers you happen to be listening through.

⚠️ **The ear test was deferred, deliberately.** Time-stretching is not the same
as synthesizing slowly, and 0.85 was chosen in the first place because learners
need to hear individual sounds. Nobody has yet heard a pitch-corrected 0.7× on
the generative voice. If it reads as an artifact, the fallback above is a small
change behind an unchanged UI.

### The Kikuyu pack, and a syllable Hangul could write all along (2026-08-31)

59 entries, the fifth registry key, and the first pack built under the sourcing
standard one entry down. Shipped **without a speaker having read the list** —
knowingly, with the tier on every entry so what is unverified stays visible: 16
corroborated twice, 36 on a single source, 7 derived from a sourced stem plus a
sourced rule. Two entries with no source at all were cut, which is what tier C
is for.

**The finding worth keeping is a correction to a reasonable-sounding read.** The
respelling stranded a consonant before `w`: `mwarĩ` split `m.wa.rĩ` and rendered
`m-wa-re`, and the Hangul path fell through to `withOnset(jamo, '으')` and
**invented a syllable** — 므와레, three for a two-syllable word. The natural
reading of that is that Hangul cannot hold a `Cw` in one syllable and a
transliteration is a lossy reading aid anyway. **Both halves are wrong, and the
check took one line:** Korean writes 뫄, 뭬, 콰, 퀘, 과 and 화, the last two among
the commonest syllables in the language, and the `w`-series nuclei were already
in `KIKUYU_NUCLEUS`. Only the onset list was missing them. **And the English path
had the identical fault**, where no Hangul constraint applies at all.

**The distinction is worth holding onto, because the principle it was confused
with is correct.** A respelling *is* a reading aid and is allowed to lose things
— `ĩ`/`e` and `ũ`/`o` merge onto one letter, stress is unmarked, `th` cannot say
*the* rather than *thin*. Those are losses of information, argued and accepted.
A syllable the word does not have is not a lossy approximation of anything.

**Why deriving this fix did not violate the lesson about deriving respellings.**
It is not a phonological claim: Kikuyu orthography already marks the split,
writing the vowel when the nasal is its own syllable (`mũndũ`, `mũrata`) and
omitting it when `w` is a glide (`mwana`, `mwarĩ`). Reading `mw` as one onset
reads the spelling as written. It is also what the module's own docstring means
by syllables being open CV — a bare `m` with no vowel was never a syllable the
file claimed existed. An internal-consistency argument, not a chart. Three stale
docstring examples were fixed alongside it: they still showed the
*pre-correction* `rũciũ` → `roo-chee-oo`/`루치우` and `mũgũnda` → 무군다, handing
a reader the two errors #105 fixed.

**The fix reaches every existing Kikuyu card**, not only the pack — 11 of the
pack's 59 entries were affected, including the words for "hello" and "one".

**Kikuyu could not have had a different kind of pack.** The Spanish pack's
beginner exception was argued as a deliberate departure; here there is no pool
of learners further along to write a domain deck for. And because the language
has no synthesised voice, **the respelling on the card is the only pronunciation
aid this deck has** — which is why building it started by rendering every entry
rather than by reading the list, and why a test now asserts that no entry
renders a vowelless syllable.

### Vocab packs are sourced, and the model is not a source (2026-08-31)

_The user's call, made while the Kikuyu draft was being written._ The standard
itself is `docs/packs/README.md`, next to the drafts it governs; this is why.

**The Spanish pack was authored from the model's own knowledge and it mostly
worked** — the vocabulary was never in doubt, and review caught the two things
that were wrong (a gloss that interpreted, an article in two places). Kikuyu is
the case that breaks that method, and the repo had already measured why: noun
class 3 of 8 (2026-08-22), tone self-consistent on 2 of 19
(`docs/pronunciation-research.md`), and a respelling table wrong three times.
**Same source, three failures, all caught by a speaker and none by review.**

So the rule is one line — **the model is not a source, and asking it to check
itself is not corroboration.** Self-consistency was measured as no evidence of
correctness on Japanese pitch accent (18 of 27 stable, 6 correct), which is the
finding that generalises: a second pass over a generated list launders the first
one rather than testing it.

**Three of the draft's own guesses were caught by the sources on the first
pass** — `mĩrongo ĩĩrĩ` for `mĩrongo ĩrĩ`, bare `igana`/`ngiri` where the
numeral is part of the word, and `mũrũ wa maitũ` for `mũrũ wa nyina`. That is
the standard paying for itself before it was finished being written.

**Tiers rather than a bibliography.** A/B/C/D per entry as table columns, because
a paragraph of sources at the bottom lets a reviewer trust the whole list
equally — and the point is the opposite, that they can see which rows are
load-bearing guesses without reading all of it. The Kikuyu draft is 15/33/3/8,
and stating that in its first paragraph is more useful than any of the entries.

**Sources are ranked, because the bottom of the range is contaminated rather
than merely thin.** lughayangu returned `Nakupenda` as Kikuyu — that is Swahili,
and it is the same confusion `STUDY_LANGUAGE_CONFIGS` already refuses a Swahili
TTS voice over. It also drops the diacritics, which on a language whose `ĩ`/`ũ`
distinguish words means it corroborates the word and not the spelling. So
**orthography is part of the citation**, and a source that loses it is cited for
less than it appears to give.

**Conflicts are recorded, not resolved quietly** — `guka` against `wagui` for
grandfather stays visible in the draft, because a draft that picks one silently
has spent the reviewer's only chance to catch it.

**And render the list before believing it.** Not a sourcing rule, but it belongs
in the same standard because it is the same mistake in a different place: a word
list is not what the learner sees. Running the Kikuyu entries through
`kikuyuToEnglish` and `kikuyuToHangul` found a syllabifier bug in ten minutes —
in the word for "hello" — that no amount of rereading the table would have
surfaced.

### The Spanish pack: an article is a field, and a gloss is not an explanation (2026-08-31)

The app's first elementary deck, 153 entries in five sections, and a second
deliberate exception to the "audience is not beginners" rule after the everyday
English pack — a bigger one, since that pack's learners had school English to
filter against and a Spanish learner starting at `hola` has nothing. The
argument is in `spanishBasics.ts`; the list and its review are in
`docs/packs/spanish-basics-pack-draft.md`. What follows is only what a source
diff would not explain.

**`PackEntry` gained a `gender` field** — _the user's call, 2026-08-31._ Pack
cards were the only path that could not carry an article: `/api/explain` returns
`el`/`la` for a looked-up Spanish noun and three surfaces render it as a badge,
while `buildPackCardDraft` wrote nothing, so the same word saved two ways
produced two cards that disagreed about how much they knew. Three lines, and it
reaches the typed grader as well — `acceptedAnswers` takes the article the
learner learned the noun with. The registry had simply never had a Latin-script
pack to expose the gap.

**The article then had to come *out* of the study text, and that is the trap.**
The list was first authored `study: 'la carta'` *with* `gender: 'la'` beside it,
which is the obvious-looking shape and is wrong twice: `acceptedAnswers` emits
`la la carta`, and a pack card and a looked-up card hold different strings for
one word — the exact divergence the field was added to close. 41 entries were
rewritten to the bare noun. **A test caught it, not a reread**, which is the
argument for the round-trip assertion that now sits in
`spanish-pack.test.ts`: build the draft, read it back through the grader, and
assert on what a learner could actually type.

**A gloss translates; a `context` explains.** `el menú del día` was authored as
"the set lunch" and the user pushed back — it means the menu of the day, and the
fixed price and four courses are an institution. The rule that came out of it,
and that the pack now follows: **where the Spanish has a plain reading that is
also correct, the back uses it and the hint carries the institution.** Three more
entries had the same defect (`primer plato`, `segundo plato`, `ración`), so the
class was fixed rather than the instance. `briefDefinition` is where an
institution belongs — it is also what steers every later depth call, so nothing
is lost by moving it there.

**One principled exception, found by an existing guard.** `tapas` was glossed
"tapas" and 타파스: English borrowed the word unchanged and Korean transliterated
it, so both backs said the front back to the learner. `pack-cards.test.ts`
already refused a back equal to its front, which is how it surfaced. **Where no
translation exists, a definition is the only honest back** — "a small plate of
food" — and that does not reopen the rule above, because there is no plain
reading to prefer.

**Two authored back columns can disagree with each other, and nothing catches
it.** This is the first pack where both `English` and `Korean` are live, since a
Spanish deck puts neither in the study slot. They were written independently and
drifted: the Korean side already said 첫 번째 요리 while the English said "the
starter". Worth knowing before the next two-back pack — and the reason
`spanish-pack.test.ts` asserts no two entries share a back **in either
language**, since two cards with one back cannot be reviewed in the
back→study direction at all.

**Phrases are entries, under one rule.** A question is authored complete and
with its punctuation (`¿dónde está el baño?`); a frame the learner finishes is
authored bare (`me llamo`). Never a half-sentence. `foldText` folds away neither
the `¿` nor the accents — deliberately, and Kikuyu's `ĩ`/`ũ` is why — so a bare
`cómo te llamas` would teach the learner to write Spanish wrong to save them one
tap on the rating row. It would also have the pronounce button read a fragment
aloud on a pack that declares `pronounceable`.

**European Spanish is load-bearing here in a way it has not been yet.** The
2026-08-21 decision named the variety; ordering food and asking directions are
the first content where it changes the words rather than the accent. `caña`,
`zumo`, `patata`, `billete`, `todo recto`, `servicios`, `planta baja` — and
`coger`, which is ordinary in Spain and vulgar across much of Latin America. It
is in the deck because the deck is European Spanish, and its `context` says so
rather than leaving a learner to find out.

### Both remaining pronunciation items are cancelled (2026-08-31)

The user's call, and it clears High. Two items left [backlog.md](backlog.md);
neither was closed by being finished, so the reasoning matters more than usual.

**"Check the rest of the Kikuyu respelling against a speaker" — not needed.**
The three errors that were found are fixed and each carries a regression test.
What remained was a ranked list of *suspicions* with no speaker available to
check them against, and a section held open for a check nobody can currently
perform is not a plan. The item's real content was a lesson rather than a task,
so it moved to [lessons.md](lessons.md) rather than closing silently — including
the known-unchecked list, so a speaker turning up later has something to work
from. The pack item that replaced it in High is where this comes back: a Kikuyu
pack is the first thing that would put the unchecked half of that table in front
of a learner at volume.

**The languages still open for the text-based pronunciation aid — deferred
until a user asks.** Not cancelled on doubt: the design question is settled,
Japanese and Kikuyu shipped, and the measurement behind the rest does not go
stale. `docs/pronunciation-research.md` holds the per-language numbers, two
working rule engines (Korean 표준 발음법 at 37/40, Spanish/Swahili stress at
16/16 and 9/9) and the finding that Swedish must not ship off the model. That is
precisely the argument for closing it: **it is cheap to reopen and costs nothing
to leave closed.** Japanese and Kikuyu were built because those two languages
had a gap someone had named; nobody has named one for the others. Reopen on a
user request rather than on a tidiness impulse, and read the research doc first
instead of re-probing — the probes were the expensive part.

### The pronunciation aid is a transliteration, and pitch accent rides along (2026-08-30)

**A correction to the entry below, made after it was built.** The aid asked for
was the term **respelled in the script the learner already reads** — 寿司 as
`sushi` to an English native, `스시` to a Korean one — not a linguistic
notation. Pitch accent is a real aid and the measurement behind it stands, but
it answers a question a learner further along asks. Both now share one badge,
reading first: `す＼し · sushi`.

**The transliteration needs no model, no dictionary and no stored field**, which
is the opposite trade from `pitchAccent` one section down. Accent is a lexical
fact you cannot read off the spelling, so it has to be looked up. A
transliteration *is* readable off the spelling, so asking a model for one would
add error for nothing. Kana → Hepburn scored **10/10** first try; kana → Hangul
scored 7/10 and reached 10/10 once the rule it was missing went in. Because it
derives rather than stores, **it needs no backfill and works on every card
already saved**, including the Japanese cards that will never carry a
`pitchAccent`.

**It is the first field keyed on `nativeLanguage` rather than on the word.**
Every other card field is a fact about the term; this one is a fact about who is
looking at it, which is why it cannot be stored and why `getReading` now takes
both languages. That also gives **Kikuyu a badge it never had** — it has neither
furigana nor pinyin, and its spelling hides real sounds (`c` is /ʃ~tʃ/, never
/k/), so the respelling is the entire aid for the one language with no TTS voice.

**Three rules carry the Hangul, and each was a bug before it was a rule.**
Long vowels are not written, so `とうきょう` is 도쿄 — the miss a letter-for-letter
mapping makes most visibly, and the one that took the Japanese score from 7/10 to
10/10. か/た rows are plain word-initially and aspirated inside, so 京都 is 교토
off the same kana. And ん/っ are 받침, so `さっぽろ` is three Korean syllables to
four Japanese morae. For Kikuyu the equivalents are the `y` glide (`gĩkũyũ` is
기쿠유, not 기쿠우) and prenasalization hanging off the previous syllable
(`mũgũnda` is 무군다; word-initially it opens a 으, so `ndoto` is 은도토 and not
느도토).

**A known loss, recorded so it stays a choice.** The English respelling maps both
`i` and `ĩ` to `ee` and both `u` and `ũ` to `oo` — collapsing the seven-vowel
distinction that the Kikuyu registry entry, its prompt branch and its
`pronunciationNote` all exist to protect. English has no unambiguous respelling
for /ɪ/ and /ʊ/ that a reader will not misread, and the alternative is a
notation to be taught, which is what this feature exists to avoid. **The note is
now the only place that distinction is stated**, so it must not be trimmed.

**The Kikuyu respelling shipped wrong and was fixed the next day, off one
word.** It merged known-faulty on the user's call; a reader then reported that
`cũcũ` "grandmother" came out `choo-choo` where it should sound like *shosho*.
That single four-letter word falsified two independent assumptions, and the
second was the expensive one:

1. **`c` is [ʃ], not [tʃ]** — the letter this table uses most.
2. **`ũ` is the close-mid [o]**, not a lax `u`: *shosho*, not *shoosho*. The
   tilde marks vowel **height**, not laxness, so `ũ` had been respelled a full
   step too high everywhere it appeared.

3. **`ĩ` is [e] and respells `e`, not `ay`** — `gĩkũyũ` is *ge-ko-yo*. Reported
   by someone familiar with the language, after a first attempt had shipped
   `ay` and a second had held `ĩ` at `ee` for want of a source.

**(3) is the entry worth keeping.** The phoneme was already right: published
sources give the seven vowels as i [i], ĩ [e], e [ɛ], a [a], o [ɔ], ũ [o], u [u],
and that is what was implemented. It was still *written* wrong, because English
`ay` is the diphthong /eɪ/ where [e] is a pure vowel. **A phoneme inventory
settles what a sound is and says nothing about how to spell it for a reader** —
and this table has now been corrected twice by someone who can hear the language
after being derived confidently from a chart. `choo-choo` was the sound being
wrong; `gay-ko-yo` was the sound being right and the spelling wrong. The second
is the harder failure to catch, because everything upstream of it checks out.

What remains merged is `ĩ`/`e` on `e` and `ũ`/`o` on `o` — the [e]/[ɛ] and
[o]/[ɔ] pairs. That one **is** a limit of English respelling, and the tell is
that it is symmetric front and back rather than landing on whichever vowel had
been reasoned about most recently.

**The lesson is about the shape of the evidence, not the vowels.** The first
version's own header comment listed six candidate causes and ranked `c` first —
and `c` was indeed wrong, so the ranking looked vindicated. But the vowel error
was the larger one and sat at number five, filed as a known-and-accepted loss
rather than a bug. A self-audit reproduced its own blind spot; **one reported
word from someone who can hear the language did what the ranked list could
not.** For the five languages still open, that argues for a native check before
merge over a longer list of suspicions.

**The collapse the first version apologised for is now fully gone**: `ĩ`/`i`
and `ũ`/`u` are both distinct. Worth correcting the record, because that
collapse was presented as a limit of English orthography and it was not one —
it was the table being wrong, and the apology described the symptom as though it
were the constraint. The merge that *is* a real limit sits one pair over.

**What is still approximate** and would need a speaker rather than more
reasoning: `th` [ð] written `th` invites *thin* for *the*; `g` [ɣ] and `b` [β]
are fricatives respelled as stops; `o` [ɔ] and `ũ` [o] both respell `o`, which
*is* a real limit of English; and stress is unmarked.

**Verified on both platforms** (2026-08-30), which closes the "unverified on a
device" caveat for this feature and not for the ones around it. **Still
unverified:** the Korean copy in both notes is author-written rather than
native-checked, and the corrected Kikuyu table has been checked against one
reported word plus a published phonology — not against a speaker across a range
of terms.

### The pronunciation aid: Japanese from a dictionary, Kikuyu from neither (2026-08-30)

The backlog item asked for a text pronunciation aid per language and said to
plan before code, because "the reading" is a different job in each language.
Scoped on the user's call to **Japanese and Kikuyu first** — which is a sharper
pair than it looks, since neither language's gap is the *reading*. Japanese
already has furigana; what furigana cannot say is **pitch accent** (箸/橋/端 are
all はし). Kikuyu's gap is **tone**. Both are melody, and both were measured
before anything was built.

**Gemini cannot do either, and the Japanese failure is the more instructive
one.** Probed inside the `/api/explain` prompt shape rather than in isolation,
three runs per term at the route's own temperature (0.1):

| | correct | self-consistent |
|---|---|---|
| Japanese pitch accent, 27 terms with known NHK values | **6/27** | 18/27 |
| Kikuyu tone, 19 terms | unverifiable | **2/19** |

The Japanese number carries a warning worth more than the feature: **the model
is not noisy, it is stably wrong.** Eighteen of 27 terms gave the same answer
all three runs, and only six were right — it defaults to [1] 頭高 and, doing so,
returns *one* accent for 雨 and 飴, *one* for 花 and 鼻, *one* for 髪·神·紙. It
erases exactly the minimal pairs that justify a pitch badge. So
**self-consistency is not evidence of correctness**, which is worth remembering
against the Swedish and Kikuyu probes, where consistency was all there was to
measure: inconsistency still proves unreliability, but consistency proves
nothing.

**Japanese ships from a dictionary, and the lookup lives on the route.**
[kanjium](https://github.com/mifunetoshiro/kanjium)'s accent table scored
**27/27** on the same ground truth — written before the file was fetched, so the
two validate each other — with ~99% coverage on realistic lookups. It sits in
`apps/web/src/data/` and is read by `/api/explain`, which keeps three promises
at once: the backlog's rule that readings come from the same route furigana does
(what changed is one field's *source*, not the number of round trips), 0 bytes
added to the mobile bundle, and a value stored on the card so review still works
offline. Provenance, licence and the refresh command are in that folder's
README. **`outputFileTracingIncludes` in `next.config.ts` is load-bearing** —
without it the deployed function ships without the file and the only symptom is
every Japanese card quietly losing its badge, while local dev keeps working.

**The card stores the position, not the mark.** `pitchAccent` is the アクセント核
— 0 for 平板, otherwise the mora after which the pitch falls — and
`markPitchAccent` renders は＼し from it. Storing the datum rather than the
notation is what lets the badge change shape later without a backfill. It also
rides *inside* the existing furigana badge rather than beside it: は＼し already
contains the reading, so it costs no space, and a card with no accent falls back
to bare furigana, which is what every Japanese card showed before.

**Two things that are easy to get wrong and are covered by tests.** A mora is
not a character — きょう is two morae, so counting characters puts 今日 [1]'s
fall inside the ようおん. And **0 is a real accent**: 端 and 学校 are 平板, so any
truthiness check turns "flat" into "unknown". A dictionary *miss* must stay
`undefined`, which is why the two are kept apart at every hop.

**Kikuyu gets a rule, not tone, and this is the finished state.** Same verdict
as its noun class and for a sharper reason: the model was not merely wrong but
not self-consistent, and several runs respelled ũ/ĩ as ú/í — corrupting the two
vowels the registry entry exists to protect, in a language whose whole audio
story is that Swahili is not an acceptable stand-in. There is also **no
alternative source**: no tone-marked machine-readable Kikuyu dictionary exists;
the Rice sketch grammar omits tone, and AfriVoices-KE is ASR audio, not lexical
tone. So Kikuyu gets `pronunciationNote` — a static line about the seven-vowel
system — which is true, useful, and costs no per-card data. **Do not re-probe
tone against a general model**; the thing that would change this is a lexical
source or a native reviewer, not a better prompt.

**The note is the third mechanism, and Japanese uses it too.** A notation nobody
explains is not an aid, so the same slot that teaches Kikuyu's vowels teaches
the ＼ mark. It also carries the kanjium credit, which CC BY-SA 4.0 makes
**required rather than decorative** — it renders on the Learn screen, not in a
licence file nobody opens.

**Not verified on a binary:** mobile shows the badge and the note through
`@amgi/core`, checked by `tsc` and the shared tests only. And nothing exercised
`/api/word-of-the-day` end to end — that route writes a real document for the
day, so it was left to its tests rather than run against production.

### The typed card hides its action row while the keyboard is up (2026-08-29)

A multi-line typed prompt was drawn across the input and the buttons under it:
the front of a typed card is the *gloss*, and a gloss is routinely a phrase —
three lines at the card's 32pt display size. Fixed in
`apps/mobile/app/(tabs)/review.tsx` by taking the bottom action row off screen
for exactly that state, with the keyboard's own return key as the submit path:

```jsx
const typedKeyboardUp = typingThisCard && !revealed && keyboardHeight > 0;
```

**The call worth keeping is *fewer things on screen, not tighter ones*.** Both
tightening levers were already spent and both are recorded as dead ends: trimming
padding bought ~36pt, resolved a one-line prompt and left the layout exactly as
rigid — the same bug came back with a longer gloss — and `adjustsFontSizeToFit`
with `minimumFontScale={0.6}` shrank text to illegible on a device, far past the
floor it was given. The typed branch has **no scroll and no shrink by design**:
the `ScrollView` that used to be there is what carried the word off the top when
the field took focus, and `cardWrapSnug` is `flex: 0`. So the row's ~88pt of
fixed height was the only slack left on the screen, and it is the one element
that had somewhere to go.

**Neither control is lost.** Tapping the card puts the keyboard away and the row
comes back — the same tap-to-dismiss gesture the decision below installs, which
is why the two changes are worth reading together. `onSubmitEditing` blurring is
what returns the row for the reveal.

Verified on a device 2026-08-29 against a three-line gloss. Mobile ships by
build, so it is not in a tester's hands until the next one.

**If a longer prompt ever overruns this too**, the shape to reach for is the
prompt in its own bounded, shrinkable area with the field *outside* it, so the
gloss scrolls within its own box and focus cannot scroll the word away. The trap
to design around is that a `ScrollView` with no flex and no height collapses to
zero in a column — the bounding has to be explicit.

### The card's dismiss target is a Pressable only when a keyboard can be up (2026-08-29)

The details panel would not scroll on the mobile review card. Fixed by making
the wrapper's *component type* conditional, in `apps/mobile/app/(tabs)/review.tsx`:

```jsx
const canRaiseKeyboard = (typingThisCard && !revealed) || editing;
const DismissArea = canRaiseKeyboard ? Pressable : View;
```

**What made this safe rather than a trade between scrolling and keyboard
dismissal:** the two branches that can raise a keyboard — the typed field before
the reveal, and the edit form — are *exactly* the two that render no
`ScrollView`; the `ScrollView` only renders in the `else`. The features never
coexist, so tap-to-dismiss keeps full coverage everywhere a keyboard can appear
while the scrolling card loses its ancestor press handler entirely. That
mutual exclusivity is the load-bearing fact — **if a future change puts a text
input in the same branch as the scroll, this fix stops being free** and the
`StyleSheet.absoluteFill` layer from [lessons.md](lessons.md) is the fallback.

`Pressable` and `View` are module-level references, so the ternary changes
identity only when the branch does — it does not remount the card each render.

**Two corrections to what was written down before.** The recorded symptom was
"works once and then gets stuck"; on the device it was **not scrolling at all,
not even intermittently**, which is the opposite of the intermittent shape
`lessons.md` gives for responder competition. The fix was tried first anyway —
cheap, and unlike `pointerEvents="box-none"` it actually removes the suspect
instead of leaving it in the negotiation — and it worked, so the diagnosis was
right and only the reported *shape* was off. And the backlog's narrowing
question ("within one card, or first card only?") turned out not to be the one
that mattered: `resetCardState()` already clears `showDetails` per card, so the
state-not-resetting branch was dead from the start.

The one thing that was checked from source and did pay: the height chain is
bounded end to end — `root` → `sessionFlex` → `dismissArea` → `cardWrap` →
`cardScroll`, every one `flex: 1` — which ruled out the usual "unbounded
ScrollView has nothing to scroll" cause before any code was written.

### Audio on mobile review hides offline rather than failing (2026-08-28)

The second of the three items queued 2026-08-25, and the smallest: `expo-audio`
is already in the shipped build and `PronounceButton` was already mounted on
Learn, decks, drill and card detail, so review was placement, not capability.
Three calls, two of which the backlog had already made — **study side only**
(the gloss is in a language you already have) and **press-to-play, not autoplay
on reveal**, since audio that fires itself on every card is a different feature
from a playable word.

**The third was the real one: offline it hides.** Review is mobile's
offline-first surface — cached cards, queued ratings — and `/api/pronounce` is a
network call with no local cache, which is the one question web never had to
answer. The precedent decided it: `PronounceButton` already returns `null` for a
language with no configured voice, on the stated reasoning that it will not
render a button that can only fail on click. Offline is that same condition,
temporally. What makes hiding affordable rather than mysterious is that the
progress line above the card already carries `offlineShort`, so the missing
button is explained on screen instead of reading as a bug.

**A measurement sharpened it, and is worth keeping.** The backlog assumed the
button would "spin and land in its error state". It is worse than that:
`getPronunciationUrl` (`packages/core/src/tts.ts`) is a bare `fetch` with **no
`withTimeout`** around it, unlike everything else the review screen calls, so the
spinner has no deadline of the app's own and waits out the platform's. That is a
latent problem on every surface with a pronounce button, not just this one —
review is only the surface where being offline is *expected*. Not fixed here,
because a timeout on `tts.ts` is a shared-code change with its own blast radius.

**Parity turned out to include the examples.** Web puts a `size="sm"` button on
each example sentence in `ReviewDetailsPanel`, and mobile's Learn and card-detail
already do the same — review's example list was the actual last divergence, not
just the term. It takes the same offline gate.

One layout note, learned from drill: the term row is **unconditional**, so the
word sits in the same place in both directions, offline, and on a language with
no voice. `flexShrink` on the text is what keeps a long term wrapping inside the
row instead of pushing the button off the card.

### Swahili takes the audio and drops the noun class (2026-08-27)

The ninth study language, and the one where the backlog item had already made
most of the calls. Two it left open were answered by measurement rather than
assumption, in both cases because the alternative was a silent wrong answer.

**`Intl.Segmenter` accepts `sw`.** Checked, not trusted — the same check `ki`
got, and for the same reason: an unrecognised tag does not throw, it resolves to
the host locale, and every writing diff would then mis-segment with nothing on
screen to say why. `sw` resolves to `sw`.

**It takes audio, and takes the ordinary voice.** This is the interesting
inversion: `sw-KE` was found while *ruling Swahili out* as a Kikuyu stand-in, so
the fact a voice existed was already known — what was not known was which kind.
The live list has 30 `sw-KE` voices and every one is Chirp 3: HD, so Swahili
takes `Charon` like Korean, Swedish, French and Spanish, and none of the
Traditional Chinese WaveNet-fallback reasoning applies. Synthesised before
wiring: `rafiki`, `kuandika`, `furaha` at 6–8 kB, well clear of the 2048-byte
silence floor `/api/pronounce` enforces. No `ttsShortVoiceName` — that field
exists for languages where a lone character is a normal card, and Swahili has no
one-letter words worth one.

**No noun class, same as Kikuyu, and the Kikuyu probe is the evidence.** Swahili
marks class, not gender, so `gender` stays off. What makes this more than an
analogy: the Kikuyu probe failed *by returning Swahili morphology* — `ndimi` for
`thiomi`. That says the model pattern-matches the Bantu class system rather than
knowing any one language's, which is an argument about Swahili and not merely
one made next to it. Class also drives agreement on verbs, adjectives and
possessives, so a wrong one is more damaging here than `el`/`la` ever is.

**The prompt branch is Spanish's, not Kikuyu's.** Kikuyu earned two extra rules
by failing on orthography and on Swahili contamination; Swahili failed at
neither, so it inherits neither. In particular there is **no "not Swahili"
rule** — the contamination runs the other way, Swahili being what leaks into
its lower-resource neighbours. 45 lookups across both directions came back
right: loanwords (`kompyuta`, `daktari`, `simu`), plurals (`miti`, `watoto`,
`vitabu`), and `pole`, `safari` and `jambo` correctly split as ambiguous, which
is the genuinely hard case since two of those are English words too.

**One rule was added on deliberately thin evidence, and is labelled as such.**
Verbs are cited with the `ku-` infinitive; one verb in 32 came back as a bare
stem (`salimu` for "to greet") and it did not reproduce — a re-run with and
without the line was 12/12 prefixed either way. It stays because it costs one
line and the failure it prevents is invisible and permanent: a lone bare stem is
inconsistent with every other verb card in the deck, and `typedAnswer.ts` grades
strictly, so `kusalimu` against a stored `salimu` is a false miss. **It was never
measured to help** — the comment in the route says so, and anyone tightening
that prompt should not read it as load-bearing.

**Unrelated, found while probing and left alone:** in the ambiguous branch the
model often echoes the placeholder `"Swahili or English"` back as
`termLanguage` instead of choosing. Reproduced on Spanish (`pan`, `red`),
French (`pain`, `coin`) and Swedish (`fart`), so it is **pre-existing and
generic to every Latin-script language**, not Swahili's. It is harmless today:
`termLanguage` is only ever compared `=== studyLanguage`, so the value falls to
the English branch, and the ambiguous response carries no side fields for it to
mis-route. Not fixed here because it was not this item's scope.

### Undo a rating: scheduling is reversed, the streak is not (2026-08-25)

A misclicked rating after a flip had no way out — the manage panel can edit or
archive a card but not reschedule it, so a stray `easy` on a mature card pushed
it weeks out with nothing to be done. Review now carries an undo. Four calls:

**One step, not a stack.** Undo restores the last rating and then clears itself;
rating the next card replaces it. This exists for the misclick you notice
immediately, and walking backwards through a session is a different feature with
a different failure mode. The snapshot is one slot of state (`UndoableRating` on
both platforms), so the stack version is a small change if it is ever wanted.

**The day rollup is reversed; the streak is not.** `negateDelta` walks the
day's counters back — `increment()` takes a negative as happily as a positive.
`advanceStreak` has no inverse: it cannot know whether the rating being undone
was the one that started today. And a review genuinely happened, so correcting
which button it landed on is no reason to put a streak at risk. **The cost is
that `reviewedToday` reads one high per undo for the rest of the day**, which is
the deliberate trade rather than a bug to fix later.

**It works from the completion screen too.** The last card of a session is
exactly where a misclick had no recourse — answering it ends the session. Undo
there reopens the card, flipped, and finishing again returns to the summary.

**Mobile sends an inverse rating rather than un-queueing the original**, which
by then may already have reached Firestore. `collapsePendingReviews` keeps the
last entry per card and direction, so the inverse supersedes the rating whether
it flushed or not, and an undo made underground survives the app being killed
exactly as the rating did.

Two shared helpers came out of it and are worth knowing about.
`trackingFor(card, direction)` is now what *both* rate paths read from — web
read the pre-bidirectional legacy fields here and mobile did not, so the same
untouched legacy card started from a different ease on each platform.
`legacyNextReview` is the deprecated top-level field, derived from both
directions; web used to assign it the rated direction's date.

### Typed responses: a local grader, and the rating row is the override (2026-08-24)

Review can now ask the learner to **produce** the word instead of flipping to
it. Four calls, all made with the user, and the backlog item's four open
questions map onto them one for one.

**Grading is local, and strict.** Fold case, Unicode composition, whitespace and
typographic marks, then compare — spacing-insensitively, because Korean word
spacing varies legitimately between writers. No model call: review happens on a
commute, so a grader that needs a signal stops working exactly where the feature
is used, and it would cost a round trip per card and reintroduce the grading
variance the cloze design deliberately removed. **No "close enough" tier
either** — an edit-distance band needs a threshold per writing system, since one
character of a two-character Korean word is a different word where one character
of `anniversaire` is a slip of the thumb.

**A hit is rated `easy` and gone; only a miss stops to ask** — _the user's
call, 2026-08-25, reversing the first cut below._ The asymmetry is the whole
design: producing the word from memory and spelling it correctly is not a
judgement the learner can improve on, so asking them to rate it is asking a
question with one honest answer. A miss is the opposite — the grader may simply
not know the spelling was also right — so it reveals both strings and keeps the
full rating row. **`sm2.ts` is untouched either way**: `getNextReviewData`
already took all four responses.

**The rating row on a miss is what makes strictness honest.** All four buttons
live, with the expected answer beside what was typed, so a learner whose answer
was right in a way the card could not know corrects it with the tap they were
already making. This is the removed cloze override's argument — *they are not
appealing a judgement, they are reading two strings* — and it costs no extra
control, because the buttons were already there.

**⚠️ What the first cut argued, and why it lost.** It capped a hit at `good` and
made the learner rate every card, reasoning that a cloze was a rung a learner
climbed where a due vocabulary word typed correctly is merely the card working
as designed — so emitting `easy` every time ratchets ease across the whole deck.
**That effect is real and it is unbounded**: `getNextReviewData` applies
`ease + 0.1` at quality 5 with no ceiling, so a reliably-typed card's interval
multiplier climbs without limit. Accepted deliberately — a word typed correctly
on sight is a word whose interval *should* be growing fast. If it ever needs
reining in, the lever is a cap in `sm2.ts`, not a downgrade of the verdict.

**⚠️ Accents are matched strictly, which contradicts how the backlog item was
written.** That item named accents alongside spacing and articles as a case
where exact matching is too harsh. The codebase disagrees and wins:
`STUDY_LANGUAGE_CONFIGS` refuses a Swahili TTS voice for Kikuyu precisely
because `ĩ`/`ũ` are the two vowels that distinguish words, and French `ou`/`où`
and `sur`/`sûr` are different words. Folding them together would teach that the
distinction does not matter — worse than a false miss the learner corrects in
one tap. **Articles are handled, and only the card's own:** `gender` holds
French `le`/`la` and Swedish `en`/`ett` in a field of its own, so `le délai` is
accepted for a card whose study side is the bare `délai`. There is no
per-language article list to keep in step with the registry.

**Readings are not accepted.** Typing `かんじ` for 漢字 answers a different
question than the card asked, and a kana or kanji pack exists to teach the
script. Left to the learner to claim on the rating row rather than granted
silently.

**Typing is a session property, and only `backToFront`.** A toggle on the start
screen beside the direction filter — the same axis, *how* the session asks
rather than what it asks about — and not persisted, for the reason the direction
filter is not: a one-off drill should not quietly become how you review from
then on. Only the produce-the-word direction is typed, so a `both` session is
mixed on screen. Typing the *gloss* is the weak half: a back is allowed up to
two translations where the study side is one word, so the expected answer is
genuinely ambiguous in a direction the target never is.

**Every typed card can still be flipped instead** — _the user's call, added to
the design._ One control under the input reveals the answer exactly as typing-off
would, and grades nothing, because nothing was asserted. That matters beyond
convenience: on a phone, typing Korean or Japanese means switching IME every
card, and a learner without one to hand must not be stuck.

**Where the grader came from.** `foldText` and the spacing-insensitive compare
were the cloze grader's, in `grammar.ts` — the module the Queued list is about to
delete. They moved to `packages/core/src/typedAnswer.ts` and `grammar.ts` now
imports them back, so the deployed `/api/grammar/exercise` route is unaffected
and the rules outlive the deletion. **The typographic folding is measured, not
anticipated:** asked for a French elision cloze the model returned `d'` with a
curly apostrophe, and phone keyboards substitute the same character in the other
direction — so an answer typed on iOS and a card written by the model can
disagree on a character neither party chose.

**⚠️ The mobile typed card took three tries, and the first two were fixed by
reasoning rather than looking.** Worth reading before touching that layout, in
`lessons.md` too. What was actually wrong: **the card wrapped a ScrollView, and
focusing the field made it auto-scroll the word off the top** — the learner was
asked to translate a word they could no longer see. Neither of the first two
attempts touched that. Pinning the input to the bottom block made it worse (it
stole height from an already-collapsing `flex: 1` card); blaming
`KeyboardAvoidingView` was closer but still wrong about which part.

What it is now, before the reveal: **no scroll container** — there is nothing to
scroll, so there is nothing to scroll away — a card sized to its two children
rather than stretched, a flexible spacer under it so the buttons stay at the
bottom and the *spacer* is what the keyboard eats, and **the keyboard's measured
height reserved rather than `KeyboardAvoidingView`'s inferred one**. That last
one matters: KAV derives the overlap from its own frame, and on a screen that
already pads for the floating tab bar it under-lifted by ~90pt, cutting 확인 in
half. `keyboardWillShow` hands over the real number. Tapping the card dismisses
the keyboard, the way Learn's does, and it has to be the card rather than the
spacer because the spacer is nearly nothing when the keyboard is up.

**The typed card's padding is load-bearing, not decoration.** With the keyboard
up the fixed content ran ~22pt over the screen, and since nothing there scrolls
or shrinks the overflow was drawn *over* the card. `cardWrapSnug` and
`cardHeaderSnug` give back ~36pt that was holding nothing.

**⚠️ The remaining slack is ~20pt, and anything added to that screen spends it.**
This is not theoretical — the offline/pending banner did exactly that the first
time it appeared during a typed session, pushing the card down until 확인 was
drawn across its border again. Which is why the running session shows that state
as `sessionSyncSuffix`, a suffix on the progress line that already exists,
rather than the bordered block: the other five render sites keep the block,
because the picker, the start screens and the end screens all have room and are
where someone actually looks. **Before adding any chrome to a running session,
check it with the keyboard up.** The next lever, if one is needed, is dropping
the ⋯ row before the reveal — worth ~32pt.

Web keeps its input in the card and keeps its direction prompt: there is room,
and the prompt is filling an otherwise empty answer area rather than restating
the label above it.

**The mobile card no longer spells out the question** — _the user's call, same
pass._ "이것을 영어로 어떻게 말하나요?" was the third statement of the same
thing: the direction label sits right above the card, and the front text's own
language settles it. Worth knowing that removing it **saved no vertical space**
— the header row it lived in stays for the ⋯ options button, which is taller
than the text was. It went for redundancy, and the scrolling was fixed by the
move above.

**Unverified, and both are device-shaped.** The keyboard-avoidance on the review
session has been watched working; what has not is what a Korean or Japanese IME
does to `autoCorrect={false}` and `autoCapitalize="none"`. In `backlog.md` under
what to watch for.

### Three packs authored; one of them sets a rule aside on purpose (2026-08-24)

Everyday English (149), English Idioms (100) and Kanji 教育漢字 1–2 (240).
**Word lists approved 2026-08-24**, the gate every pack goes through. Drafts, now
the record rather than the request: `docs/packs/{daily-life,idioms,kanji}-pack-draft.md`.

Content-only and registry-driven — no pack id is hardcoded anywhere in `apps/`,
so both platforms picked all three up with no change. That also sets when each
audience sees them: **web at deploy, mobile at the next build**, since mobile
ships by build and there is no OTA. Nothing here needs a native module, so the
packs ride whatever build comes next rather than earning one.

Four calls worth keeping:

**"Audience is not beginners" has one recorded exception, and it is the
daily-life pack.** Asked for that way, so it is a deliberate exception rather
than a change of principle — a future pack citing it as precedent is citing an
exception. What keeps it from being a bad deck is a second filter, **concrete
over frequent**: a beginner list fails by filling with the two hundred words a
Korean learner already met in middle school and feeling comprehensive while
teaching nothing, so the entries are elementary in register and *specific* in
reference — `faucet`, `drawer`, `leftovers`, `errand` — and bare high-frequency
function words are left out.

**The kanji pack is the JLPT gap, answered with the school list.** 学年別漢字
配当表 grades 1–2 rather than N5: N5 is an exam's slice of the same material and
stops part-way, where the school list is an order someone thought about and
reaches the point where kanji compound (電車, 教室, 何曜日). N5 is a subset, so
an exam-ladder pack later is a re-sectioning, not a re-authoring. A test checks
the 240 character-for-character against the official lists — across eleven themed
sections nothing else could.

**It is the first pack whose back is not a gloss, and therefore the first
single-glyph pack that is a list.** A kanji's meaning alone does not answer the
card — 生 means "life" and says nothing about 学生 or 生きる — so the back is
`meaning — kun / ON`, kun in hiragana with okurigana in parentheses, on in
katakana, script alone distinguishing them. That does not fit the 4.5rem tile
that makes 71 kana scannable, hence `layout: 'list'`. **The cost is live and
named in the draft:** `isGridDeck` exempts grid decks from the "All" chip on the
card list and list decks are not exempt, so 240 kanji cards will sit alongside
the user's own words there. If that turns out wrong the fix is a per-pack flag,
not a layout change — the layout is keyed on content shape for a reason.

**The idioms prediction in the backlog held.** An idiom's back is a usage note,
so the Korean back is the nearest Korean 관용구 landing on the same *occasion*
(설상가상, 전화위복, 식은 죽 먹기) and every entry additionally carries an
`idiom — …` context hint — the TOPIK convention, so one grep finds every
figurative entry in the app. The hint and the back do different jobs (what it
means vs. when you would say it), and the failure mode is the hint decaying into
the gloss: a test enforces the prefix *and* a minimum length, and caught four
real ones on the first run.

### Android ships as a sideloaded APK, and auth work leaves Expo Go (2026-08-22)

Android is live as a direct-download APK built on the `preview` profile —
`distribution: internal`, which is what makes EAS emit an APK rather than a
Play-store AAB. Verified end to end on a real device: install, launch, Google
sign-in, cards.

**Play was deferred, not rejected.** Sideloading costs nothing, needs no
account and faces no review, which is why it went first. The price is that an
APK has **no update path at all** — worse than TestFlight, which at least
notifies. Every release is a fresh link (EAS gives each build its own URL) and a
manual re-install by each tester. Installs land over the top with data intact,
since the package name and the EAS-held keystore stay constant; if that keystore
is ever lost, every tester has to uninstall first and loses local data.
Revisit Play internal testing when re-sending links costs more than $25 and a
review cycle.

`com.miinjaekim.amgi` is permanent — it is keyed into the Google OAuth client
and would be keyed into any Play listing. Chosen over the iOS bundle id
(`com.tegi.amgi`) because that one lives on a borrowed Apple account.

**The development-build change is the part that supersedes an earlier call.**
[tech-stack.md](tech-stack.md) said: develop in Expo Go, build to release.
**Google sign-in on Android was never covered by that.** It does work in Expo
Go on iOS, which is why the loop held for a year — but that depends on
`ASWebAuthenticationSession` intercepting the redirect with nothing registered,
and Android has no equivalent, so its auth surface was untestable under the
documented loop. Four rounds of 20-minute release builds on a borrowed phone is
what that blind spot actually cost.

So a development build (`expo-dev-client`, the `development` profile that had
sat unused in `eas.json` since the abandoned OTA setup) is now the loop for
anything native-adjacent. **This does not touch the no-OTA decision**, which is
about how work reaches users, not how it is tested. Expo Go still works for
ordinary JS, and nothing forces iOS off it — *unless* the native Google Sign-In
module is ever adopted, which would break Expo Go on both platforms at once.

**What is explicitly still open:** whether to migrate to
`@react-native-google-signin`. Custom URI schemes on Android are on borrowed
time — Google restricts them for new clients by default and recommends Google
Identity Services — so the current path works but is not durable. The three
traps that had to be cleared to get here are in [lessons.md](lessons.md).

**The follow-ups were deliberately not tracked** (user's call, same day). A
backlog item listing them was written and then removed: the APK works, and the
rest was speculative — Android paths nobody has complained about, a migration
with no deadline, a cosmetic scheme duplicate. Tracking them would have kept a
High item open against work nobody intends to do. They get raised again if a
tester hits one, not on a schedule. The two that are real if they ever surface:
**nothing but sign-in has been exercised on Android** (audio, export, sharing,
offline, account deletion, reminders — and reminders need the runtime
`POST_NOTIFICATIONS` grant on 13+ and land in the default "Miscellaneous"
channel), and **removing the redundant `com.miinjaekim.amgi` scheme from
`app.json` is untested** — that array generates the working intent filter, so
verify the redirect still routes before believing it is safe.

### Mobile's card surfaces subscribe too — the gate was opened by a test, not a build (2026-08-22)

Step (2), the same day as step (1). The gate was "step (1) has been on a build
for a release"; what actually opened it was the user reviewing on the laptop and
watching the phone's streak move in Expo Go. **That is weaker evidence than the
gate asked for, and it was taken deliberately** — it settles the question the
gate existed to settle (does `onSnapshot` deliver on React Native, through a
memory-only cache, in this app) and settles nothing about collections. What
follows is what had to be handled *because* the test could not cover it.

**An empty snapshot from the cache is dropped, not delivered.** This is the
listener form of the trap `fetchUserFlashcardsFromServer` was written to dodge:
the cache is memory-only, so before the server answers it holds nothing, and
Firestore reports nothing as an ordinary empty result rather than an error.
Delivered as-is it is indistinguishable from "this account has no cards" — it
would blank the list on every cold start and overwrite the offline snapshot with
nothing. **The streak listener never met this**, because a missing document is
simply ignored there; a collection cannot do that, since empty is a legitimate
answer. So the clean laptop-to-phone test could never have caught it.

**Storing the snapshot is on a slower clock than showing it.** Every rating in a
session comes back as its own snapshot, so writing the offline copy on each
would re-serialise the whole collection once per card, where the fetch-per-focus
it replaced wrote once a visit. It is debounced 5s and flushed when the language
or account changes. Coalescing is safe here in a way it would not be for a
rating: this is a *cache*, unsent ratings live in their own queue and are
replayed over whatever is stored, so a dropped write costs a slightly older
starting point on the next cold offline launch and nothing else. The debounce
lives in the effect, not the module — module-scope state does not survive Fast
Refresh, which is the bug that killed this screen's first freshness attempt.

**Review needed no mid-session guard, and that is a property of the screen.**
The focus reload had to be suppressed mid-session because it reset the pick and
would rebuild the queue under someone eight cards into thirty. A listener does
not, because **`cards` is not what a session runs on**: the queue is built from
it on the Start tap and owns its copy from then on. A snapshot landing mid-review
moves the picker's due counts and leaves the cards in front of the learner alone.
`sessionRunningRef` and `reloadToken` are gone with the reload they protected.

**The one thing a listener does not give back is a deadline.** Offline with a
cold cache it says nothing at all — no data, no error, and the empty cached
snapshot is dropped by the guard above — so the screen would spin forever on a
language this device has never loaded. `withTimeout`'s 10s is now applied by the
load effect itself. This is the newest machinery in the change and the first
thing to check on a device.

Also: `sessionRatings` is cleared per language change and *not* per snapshot.
Every snapshot has the unsent queue replayed over it, so keeping them loses
nothing, and `applyPendingReviews` assigns rather than increments — but clearing
them on a snapshot that raced a rating would drag an answered card back into the
counts. The `onChanged`/`loadCards` calls that told screens to go and look again
are gone, as are `fetchAllUserFlashcards` and `fetchUserFlashcards`, which have
no callers left. `fetchUserFlashcardsFromServer` stays: warming a language nobody
is looking at has no listener to ride on.

**Progress is deliberately not subscribed**, on either platform. It is a
historical rollup whose only moving row is today's, it re-reads on focus, and the
review tab is one tap away. Subscribing it would add a listener for a number that
cannot change while you are looking at it.

### Mobile subscribes for display only, and a ref is what serialises its writes (2026-08-22)

Step (1) of the mobile half, done the day web shipped. The scope was set in
advance — subscribe to `users/{uid}` for **display**, leave the offline write
path alone — and it held. What is worth keeping is *how* a listener is prevented
from quietly becoming a second writer, since the obvious wiring does become one.

**Merge, never assign.** The snapshot handler runs `mergeStreakState` against
what the device holds, which is the same reconcile the launch path already ran.
Assigning the server's copy would discard a session reviewed underground the
instant a snapshot landed. This is the whole reason the listener is safe next to
an offline-first write path rather than in competition with it.

**The AsyncStorage cache is refreshed only when nothing is unsent.** While
`dirty`, that copy belongs to `recordReview` and its retry, and a listener
writing over it would race `markStreakSynced`. Clean, the write is the one the
next launch would have done anyway — worth doing early because `refreshReminders`
plans from the cached `lastReviewDate`, so a laptop review now also stops the
phone nagging about work already done. That second-order effect was the argument
for writing the cache at all; display alone would have left the badge and the
notification disagreeing.

**Streak fields only, though the listener carries the whole document.** The
languages are in there too, and `nativeLanguage` going momentarily null is
exactly what the first-run modal watches for — a snapshot racing the setup flow
would pop it over someone mid-answer. Languages are read at launch and changed
on one device at a time; the streak is the field that genuinely moves elsewhere.

**The streak became one value behind a ref, and that fixed a real bug on the
way.** Four `useState`s could not be merged atomically, and the merge would have
had to read a render-old closure. Moving to one `StreakState` plus a ref means
`recordReview` computes from the ref, not from React state — and consecutive
ratings now compose instead of both starting from the value the last render
happened to see, where the second write silently replaced the first. **That is
web's local-counter bug in its single-device form**, and it was sitting in the
mobile write path unnoticed while the item said mobile did not have that problem.
The item was right that mobile's *cross-device* story was already reconciled; it
was wrong that nothing local could disagree. A transaction still is not the
answer here — it fails offline — and a ref costs nothing.

`recordReview` now calls core's `advanceStreak`, the same pure rule web runs
inside its transaction, rather than its own copy of the arithmetic. Verified
equivalent field by field before swapping, including the new-day restart of
`reviewedToday`; `reviewedToday` is now *derived* for display rather than stored
as zero, so the value the streak is computed from stays honest.

One thing deliberately not done: the in-memory copy stays `dirty` for the rest
of a session once this device records a review — only the cached copy is
cleared, by `markStreakSynced`, and only when it still says what was sent. So
later snapshots merge by date and then by highest rather than taking the server
outright. Left as it is because highest never loses a review and a genuinely
newer day still wins outright; clearing it in state would mean duplicating
`markStreakSynced`'s "only if it still says what was sent" guard.

Unverified on a device: this typechecks, bundles and rides on core logic with
252 passing tests, but **the listener itself has not been watched on a phone**.
Mobile has no test harness, so the wiring is argued rather than exercised — and
that is precisely why step (2) is gated on this having been in a build for a
release. See [backlog.md](backlog.md).

### Web subscribes; the archived bug was never real (2026-08-22)

Four calls out of the data-freshness item, two of which **retract things this
scratchpad asserted**.

**Subscribe, not invalidate.** The item posed it as an open question —
TanStack Query/SWR against `onSnapshot` — and framed listeners as the risky
option whose "read billing should be measured rather than assumed". That has it
backwards, and the measurement is the wrong way round. Firestore bills a
listener for the documents in its *first* snapshot and thereafter only for
documents that actually change, so an idle listener costs nothing, where the
code it replaced re-read the whole collection on every mount of three separate
list surfaces. **A listener is cheaper than what was already there.** The
deciding argument is not cost though: web already initialises
`persistentLocalCache` with `persistentMultipleTabManager` and then reads past
it with one-shot `getDocs`. A query cache on top would have been a *third*
cache — Query → Firestore local → server — each with its own idea of the truth,
which is the disease rather than the cure. Firestore is a sync engine; the
invalidation problem it would have managed is one it does not have.

**The `archived` "query bug" does not exist.** The item called it "one genuine
query bug" and prescribed a backfill. It was reasoned from code and never
checked against data. Checked 2026-08-22 with a read-only audit over all seven
collections: **1,316 cards, zero missing the field.** Nor can one be created —
`buildFlashcardDoc` is the single card constructor on each platform and both
hardcode `archived: false`, and every write path (`addDoc` for saves,
`batch.set` for pack imports) goes through it. The reasoning about `!=` was
correct in the abstract and simply had no instances. **No backfill was run and
none is needed.** Left as it is rather than "fixed defensively", because a
migration over 1,316 documents to repair nothing is a real risk taken against
an imagined one.

**Deck counts show every card; archived filters belong to review and Cards.**
This was posed as "which number is true when two surfaces legitimately count
differently". Decided: browsing a deck is asking how big it is, so decks counts
everything; review and Cards are working surfaces where archiving means
something. **The code already did exactly this** — no change was made, and the
backlog's framing of it as a discrepancy was wrong.

**The streak needed a transaction, not just a listener.** Worth separating,
because subscribing looked sufficient and is not. A listener fixes *displaying*
a stale value; it does nothing about two writers computing from the same
starting value. Two tabs both loading `reviewedToday: 0` and reviewing 10 and 1
times stored `1` — and this needs no second device, only the multi-tab setup
web already enables. So `recordReview` keeps no local copy at all now:
`recordReviewStreak` re-reads inside a transaction, and the subscription brings
the answer back. This is the pattern `recordProgress` has used since the
dashboard shipped, sitting directly above the streak write that did not.

**Mobile stays as it is,** and its reasons are in [backlog.md](backlog.md).
The short version: mobile's streak is already offline-first and reconciled
rather than divergent, and the transaction that fixes web *fails offline*,
which is the bug mobile's cache exists to prevent. Same symptom name, opposite
correct answer.

### Kikuyu ships with no audio and no noun class, both measured (2026-08-22)

Kikuyu is the first study language added where the open questions were about the
*language's* support rather than the app's, and the backlog item said to answer
them on real words before wiring any UI. Both were answered that way.

**No pronunciation, because no voice exists.** Checked against the live Google
Cloud TTS voice list rather than inferred: 2066 voices across 62 locales, and no
`ki`. The only Bantu locale is `sw-KE`, and Swahili is the wrong stand-in for a
reason worse than accent — its alphabet has no `ĩ` or `ũ`, which are the two
vowels that separate Kikuyu words from each other. A voice that cannot say the
distinguishing sounds teaches the wrong pronunciation confidently, which is worse
than a hidden button. So the entry has no `ttsLanguageCode`, and the optional-TTS
path that had been written but never used is now live.

**No noun class on the card, even though it is the obvious analogue of
`gender`.** Kikuyu marks class, not gender, and class governs agreement across
the whole sentence — so it is more useful than `el`/`la`, and a wrong one is
also much more damaging. Probed on eight nouns: `mũndũ` (1/2, `andũ`) and `mũtĩ`
(3/4, `mĩtĩ`) came back right, but `rũthiomi` came back with `ndimi` — the
*Swahili* plural, where Kikuyu has `thiomi`. A field that is wrong that often
teaches wrong agreement everywhere the learner uses the word. Left off until
something better than the model can fill it. The Swahili leak is also why the
prompt branch names Swahili explicitly as something not to answer with; the
nearest high-resource Bantu language is a live contamination risk, not a
theoretical one.

**Everything else was better than expected.** Single-word lookup was correct on
~19 of 20 real words in both directions, `ũhoro` was correctly split into its two
senses, depth returned accurate cultural notes (including the `mũgũnda`/`werũ`
contrast), and example sentences carried correct locative morphology. The one
gloss believed wrong was `gũtherũka`, returned as "to become clear" where it
means "to boil" — close to `gũthera`, which is the shape of error to expect here:
a real Kikuyu word confused with a near neighbour, not an invented one.

**Worth knowing: the spellcheck rule turned out to be a Kikuyu feature.** It was
written for transposed letters and missing accents, and on Kikuyu it restores
dropped vowel diacritics — `muthenya` → `mũthenya`, which is exactly how a
learner will type. The fear was the opposite, that a low-resource language would
be over-corrected into hallucinated forms; five real-but-less-common words
(`gĩthomo`, `mũhĩrĩga`, `kĩrĩma`, `nyeki`, `gũtherũka`) all came back with
`corrected: null`. Re-measure this if the rule is ever loosened.

### Spanish is European Spanish, and that is a deck not a setting (2026-08-21)

The registry needs a locale and a voice, and Spanish is the first language added
where the obvious choice is genuinely contested: `es-ES` against `es-US`, where
the Latin American varieties have the larger audience and differ well past the
accent — `coche`/`carro`, `vosotros`, `ordenador`/`computadora`.

**Went with `es-ES`/`es-ES-Chirp3-HD-Charon`**, on consistency with how `fr-FR`
and `sv-SE` were already chosen: one registry entry names one variety and speaks
it. The alternative was never "support both" — it was a preference toggle, and
that is the design the file header already rejects for Traditional vs Simplified
Chinese. If Latin American Spanish is ever wanted it is **its own entry with its
own collection**, so neither deck constrains the other and a learner's cards
never silently change which Spanish they teach. The comment on the entry says so,
because the cheap-looking fix is to add an accent setting.

Worth knowing: the voice was **verified against the live TTS API**, listed and
synthesized, rather than assumed from the naming pattern. A wrong voice name is a
runtime 400 on the pronounce path that no build or test would catch — the same
class of gap as the two console steps this language is still blocked on.

### Progress is a daily rollup, and the streak stays where it is (2026-08-19)

Four calls made while building the dashboard, each of which would be expensive
to revisit later.

**Grain: one document per user-day, not one row per rating.** Every question
asked of it — which days, how much, how many new cards, habit, recap — is a
per-day question, and a year is 365 documents rather than ~20,000. The cost is
real and worth naming: a rollup discards whatever it didn't count in advance, so
time-of-day and per-card history are gone once a day is summed. Event rows can
be added *alongside* later if a question needs them; the rollup does not have to
be undone first.

**The day is per user, with the language breakdown inside it.** The habit being
tracked is "studied today", not "studied Korean today" — someone who reviews
Japanese has kept their streak. Splitting the streak six ways would punish
exactly the multilingual use the app is built for. The dashboard can still break
any day down by language.

**`reviews` counts directions, not cards** — the same thing `reviewedToday` has
always counted. This is *not* an endorsement of that number: it reads roughly
double what a learner thinks they did. It is a refusal to have two counters that
disagree about what one number means while the honest fix is still an open,
user-visible call. Fix both together or neither.

**The dashboard shows the stored streak, not one derived from the rows.** The
derived number is the better one eventually, and `deriveStreak` is written and
tested in core against that day. But the rows begin empty, so deriving it today
shows `1` to someone on a 200-day streak — and adding a fourth surface that
disagrees about the streak is the precise failure the data-freshness item exists
to stop. The swap is safe once the history is older than the longest live
streak.

One consequence to hold on to: **history begins the day this ships**. New cards
per day could be reconstructed from `createdAt`, but review history cannot be
reconstructed at all, from anything. That asymmetry is why the write shipped
ahead of the screen rather than behind it, and ahead of the data-freshness item
it nominally depends on — the dependency was always about the screen being a
fourth stale surface, never about the write.

### Grammar and writing are removed — the routes stay behind (2026-08-18)

**The user's call, and it reverses everything in the four grammar entries below
rather than amending them.** Grammar patterns and writing review were built,
trialled and redesigned across two weeks; the conclusion is that neither belongs
in Amgi for now. Removed on `chore/remove-grammar-features`: pattern practice,
the writing review panel, the Cards/Grammar management toggle, the Learn
Word/Passage toggle, the patterns Review collection, `services/patterns.ts` on
both platforms, `packages/core/src/diff.ts` and both `TextDiff` components, and
88 i18n keys × 2 languages.

**Two API routes and their parsers deliberately survive**, and this is the part
that will look like an oversight later. `/api/writing` and
`/api/grammar/exercise` stay deployed, which forces `packages/core/src/writing.ts`
and `grammar.ts` to stay too — the routes import `parseWritingReview`,
`WRITING_MAX_CHARS` and `parsePatternExercise`. Both modules now have **zero
callers in the tree**, which is exactly the shape of something safe to delete.

The reason is the no-OTA model. TestFlight 1.3.0 is in external testers' hands
with the writing and pattern UI compiled into the binary; deleting source here
cannot reach it, so those screens keep rendering and keep calling the deployed
routes. Delete the routes and a tester's Writing tab errors out mid-use. Each
module carries a `DO NOT DELETE AS DEAD CODE` header pointing back here.

**When they can go:** once no build predating the removal is still in use — i.e.
after the next build ships and testers have updated. That is the one condition;
nothing else gates it.

**What was given up, recorded because it was argued for at length.** The
"demonstrated gap" card offer — a word the learner reached for and did not have —
went with the writing panel. The entry below at 2026-08-08 calls it the
highest-confidence signal a passage can produce about what to learn next, and
writing review was the only surface that could observe it. Lookup, packs, manual
add and CSV import are the remaining card doors. `docs/grammar-research.md`
stays: it is the argument, and it outlives the code.

**Word order practice is cancelled with it.** It sat in the backlog as a
controlled rung *below* the cloze, inside `ExerciseFormat`'s ladder — with no
ladder there is nothing for it to be a rung of. The case for it (L1 interference
on SOV order, which a cloze structurally cannot reach) was never refuted and is
worth re-reading in `docs/grammar-research.md` if grammar is ever revisited, but
it does not survive as a standalone drill: the same research §"controlled →
meaningful → free" calls a bare ordering task mechanical in Paulston's sense, and
mechanical drills do not build form-meaning mapping on their own.

**The writing-review follow-ups die with it** (2026-08-21), and they were never a
separate call: untested long rewrites through `PronounceButton`, two-gloss card
backs from `/api/writing`, streaming findings as NDJSON. All three describe a
surface that no longer exists. The one that outlived the feature is
`/api/writing`'s missing `try`/`catch` — because `/api/explain` has the same
exposure and is still the core loop, so it stays on the backlog in its own right.

**Collateral simplification:** `ReviewCollection.kind` is gone. It existed only
because a patterns row and your own cards were both `id: null`; with patterns
removed `id` identifies a row again, and `collectionKey` is now `id ?? ''`.
`buildReviewCollections` lost its `patterns` parameter.

**Test count: 313 → 222.** Three test files deleted (`grammar.test.ts`,
`writing-review.test.ts`, `diff.test.ts`) plus four pattern cases out of
`review.test.ts`. Measured, both apps typecheck, `next build` clean with both
retained routes in the manifest.

### Part of speech is stored as a code and rendered in the reader's language (2026-08-11)

**This reverses the backlog item's own decision**, which had the badge reading
English on every card — `noun`, `verb` — reasoning that `formality` already
renders `Standard` in English beside it, so an English part of speech needed no
i18n keys and no closed vocabulary to coerce the model onto. The user asked for
the native language instead.

The reversal was cheap because the alternative it rejected was the wrong one.
"Localized" did not mean *generating* a label per language, which is what the
original call was pricing — it meant storing a **code** and looking the label up
at render. So the closed vocabulary the item wanted to avoid turned out to be
the thing that made this easy: 15 codes in `PART_OF_SPEECH_CODES`, one
`partOfSpeechLabel(nativeLanguage, card)`, and switching native language
re-labels every existing card with no migration — the back-slot problem met
again and solved outright rather than duplicated.

What the item got right and is unchanged: the field sits beside `formality` and
`gender` on `TermCore`, the work is mostly the twelve prompt templates, and
scope is new lookups only — no backfill of old or pack cards. Two corrections to
its touch-point list: `ReviewDetailsPanel` deliberately gets **no** badge (the
review card above it now shows one on the same screen), and the word of the day
also carries the field, which the item didn't mention.

The shape, the language-generic code list, why the Japanese i/na split is out,
and the one-day lag on the word of the day are all in
[data-model.md](data-model.md).

### The spellcheck correction rides the lookup, and is written to refuse (2026-08-10)

The backlog item left one question open: where the correction comes from.
**It rides `/api/explain`**, as a `corrected` field on the no-context prompts —
one round trip, and the model that already knows this language pair does the
judging. A separate check would have been a second call *before* the first, and
a second prompt to keep in step with twelve existing ones. This is the
reuse-the-endpoint rule applied to a route that already had the context.

Three things fell out of that choice and are worth keeping:

- **The prompts echo back the term they were given** (`"term": "${term}"` is
  interpolated into all twelve), so a corrected answer arrives describing one
  word and labelled with another. `applySpellingCorrection` moves the corrected
  spelling onto `term` and strips `corrected` — which is a fact about the
  lookup, not the term, and would otherwise be spread onto a saved card. Both
  clients call it; neither may skip it.
- **The override is a request, not a filter.** "Search instead for what you
  typed" sends `exact: true`, which drops the rule from the prompt entirely.
  Asked again without it, the model explains what was typed. Filtering the
  answer client-side would have left the model still deciding.
- **Only the no-context prompts carry the rule.** A context lookup is a
  *re*-lookup of a term this route already returned — disambiguation, or "not
  what you meant?" — so the spelling question was settled a call ago. Both Learn
  screens carry the correction across those calls themselves, or the banner
  would vanish on disambiguating and take the way back with it.

The rule is written to **refuse**, because a learner typing a word they don't
know well is exactly who a correction overrules wrongly: rare, archaic,
dialectal, slang, proper-noun and validly inflected spellings are all named as
*not* misspellings, and so is any case where two corrections are equally likely.

⚠️ **It names slips per writing system, not per letter.** The first cut said
"transposed, doubled, dropped or wrong letter" and silently missed the commonest
Korean error: 마지하다 for 맞이하다 — the word spelled the way it *sounds* once
받침 and 연음 apply, with no letter out of place. The model answered "to meet"
with no correction offered, which is the exact failure the item existed to fix.
Anything added here later should be probed against a Hangul phonetic misspelling
before it is believed. The refusal set that must stay clean: `lagom`,
`dépaysement`, `積ん読`, `눈치`, `撒嬌`, `rizz`, `Gyeongju`, `serendipity`,
`맞이했습니다`, `먹었어요`, `하염없다`, `食べられなかった`, `s'agissait`.

Bulk import passes `exact` too. It has nowhere to show a correction and saves
what comes back, so a silent one would be a card the learner never agreed to.

### A word you reached for and didn't have is the best card a passage yields (2026-08-08)

From a trial: writing in French, the user hit a word they didn't know, wrote the
English one inline, and got a *pattern* offer back but no vocabulary card.

- **Two marks tell you a word was missing**, and both are easy to read past
  because the rest of the sentence often looks fine: the word appears in the
  native language mid-sentence, or the learner talks around it — "the thing for
  cutting bread" where a native says `un couteau à pain`. The prompt now hunts
  for both by name, gives each its own finding, and ranks them high.
- **`WritingCardCandidate.gap` marks them**, and the flag earns its place by
  being *different evidence*. Every other card offer is a judgement — this would
  be worth knowing. A gap card is a demonstration: the learner tried to say
  something and the word was not there. That is the highest-confidence signal a
  passage can produce about what to learn next, so the UI labels it rather than
  letting it look like any other suggestion.
- **⚠️ This corrects a call in the grammar entry below.** That entry had a
  pattern offer *replace* the card offer, reasoning that showing both for one
  grammar point asks the learner to choose between two things the app has not
  explained. That reasoning holds for one point and was wrong as a blanket rule:
  a word you didn't have and a pattern the same sentence illustrates are two
  objects, and hiding the first behind the second is what the trial hit. Now a
  card shows alongside a pattern **when it is a gap card**, and otherwise still
  gives way.
- **Why gap and not "whenever they differ"**, which was the first fix and was
  measured to be worse: on a grammar finding the model often emits a card whose
  front is a *description* — `accord du participé passé avec être` is a heading,
  not something anyone wants in a deck. Those differ from the pattern text and
  would have come back. Keying on `gap` admits exactly the case that prompted
  this and nothing else.
- Verified live in both directions: `corkscrew` → `un tire-bouchon` and the
  circumlocution → `un couteau à pain`, both ranked first; and in Korean,
  `crowded` → 붐비다 shown alongside a separate `-아/어서` pattern offer.
- Mobile gets the new cards for free — its panel reads `finding.card` and does
  not branch on patterns — though not the `gap` label until parity.

### Grammar patterns are closed — and one constraint outlives the item (2026-08-10)

The mobile pass came back clean, so the last grammar-patterns item left
[backlog.md](backlog.md) and the feature is done. Everything the item still
carried was either answered or is recorded below; nothing is deferred.

- **What the pass answered.** Both blockers the item named are gone: the API half
  shipped with `c70c47c`, so `/api/grammar/exercise` and `/api/writing`'s
  `pattern` field exist on the deployed API that `EXPO_PUBLIC_API_BASE_URL`
  points at, and Expo Go against production exercised the feature end to end
  with no issues found. The drawn cloze blank and the offline-disabled patterns
  row were part of that pass.
- ⚠️ **Carried forward, and the one reason to read this entry: don't remove the
  "+ card" fallback from `/api/writing`.** It emits `card` alongside `pattern` so
  a *shipped* build — which reads `card` and ignores `pattern` — still gets the
  take-away. Both platforms now apply the gap-card rule, so the duplicate is
  inert in current code and will look like dead weight to whoever next reads that
  route. It stays until no old build is in the wild, and **with no OTA that is a
  while** — the first build that could retire it is the one this queue produces,
  plus however long users take to update.
- **Two things stay unverified and neither is a task.** Graduation from cloze to
  the production rung still needs about a week of real intervals to reach, which
  is deliberate and argued in the entry below — don't build a "make due now"
  control to shortcut it. And `alternates` is still coming back empty on live
  clozes, absorbed by the learner override; the signal to watch is **being marked
  wrong while right**, and one real instance is worth more than a prompt rewritten
  on speculation.
- **The last open design question is unchanged and still off the backlog:**
  whether a tier-1 hint is ever offered unprompted after an idle on production
  turns. It wants a real session to answer it, not a slot.

### Grammar patterns stay their own row, and the tail is cancelled (2026-08-09)

_User's calls, after trialling the built feature. Closes the last of the design
questions and cuts the backlog item down to what is actually left to do._

- **Patterns do NOT interleave into the vocab queue.** This was one of the two
  remaining opens and it closes as **no, for now**. The research argument for
  interleaving was always narrower than it looked: the studies measured grammar
  points against *each other*, which the session queue already does via
  `buildPatternQueue`, not grammar against vocabulary — that was always an
  extrapolation. And the original objection stands on its own: sitting down to
  flip cards and sitting down to produce sentences are different acts, and
  mixing them changes what Review feels like without anyone choosing it.
  Reversible; nothing was built to prevent it.
- **The Learn door (1b) is cancelled, not deferred.** It was the cold-start path
  — a third `ExplainResult` arm on `/api/explain`, costing **12 prompt
  templates** across six language branches each splitting on `if (context)`.
  Manual add now covers what it was for: you type the pattern, pick its kind,
  done — no endpoint, no model call, and more control over what counts than the
  detector would have given. A twelve-template feature that duplicates a
  free-form one is not worth carrying on a list.
- **No dev-only "make due now" control, and graduation ships unverified.** The
  cloze → production step cannot be reached in a sitting — a correct cloze
  schedules a day out and the next six — so seeing it happen would have needed
  either a week or a scheduling override built for testing. Neither is worth it:
  the step is derived from `repetitions` in four lines, it is unit-tested both
  directions including the lapse-demotes case, and the remaining risk is one a
  real session surfaces on its own. **Deliberate**, so don't read "unverified"
  as an oversight and add the tool.
- **One open question left, and it is the last one:** whether a tier-1 hint is
  ever offered unprompted after an idle, on production turns only. Offering
  rescues the learner who won't ask; it also interrupts thinking, which is what
  the design exists to protect. Not on the backlog — it wants a real session to
  answer it, not a slot.
- **Known weak spot, measured and left alone:** `alternates` came back **empty
  on every live cloze generated so far**, across French and Korean, despite the
  prompt asking outright for every acceptable variant and warning that a missing
  one marks a correct answer wrong. So the learner override is currently
  absorbing all of it. Left as-is deliberately: it is one prompt away from being
  fixed *if* it turns out to bite, and guessing at which variants matter without
  real answers to look at is how you write a worse prompt. The signal to watch
  is being marked wrong while right.
- **The speculative tail is off the backlog**, and none of the reasoning is lost
  because all of it already lives elsewhere: produce-offline /
  evaluate-on-reconnect and the acquisition signal are both in the older design
  calls below; the acquisition signal and the structured-input comprehension
  rung are both argued in `docs/grammar-research.md` §4, which is also honest
  that structured input is forced-choice and sits awkwardly beside
  no-multiple-choice. Contrast turns — paired situations, both *produced* — stay
  a live idea in `vision.md`'s "why it and not its neighbour", and would be a
  refinement of the production rung rather than a new one. Any of these can come
  back as its own item when there is a reason; none of them are next.

### Grammar patterns: cloze first, production when it sticks (2026-08-08)

Written after (1a) was built, tried once, did not feel good, and the research
was then read properly. **Read `docs/grammar-research.md` before changing any of
this** — the design is derived from it rather than merely informed by it. The
argument is in [vision.md](vision.md), the type in
[data-model.md](data-model.md).

_This entry replaces an earlier same-day version that had the pattern's **kind**
select between two exercise formats. That was a real distinction aimed at the
wrong axis, and its bare transformation drill is dropped outright: mechanical
drills are close to the one practice type the literature is unanimous against.
The trail is kept because the choice/form distinction survives — demoted._

What the trial reported, in the user's order:

1. no way to manage saved patterns;
2. saving one feels too vague — unclear what should and shouldn't count;
3. during practice it is ambiguous which pattern is being asked for;
4. too much variance everywhere — saving, generation, grading.

**One mistake produced (2), (3) and (4): free production was made rung one when
it is rung three.** Practice runs controlled → meaningful → free. A situation is
the least constrained prompt there is, which is (3); free text has unbounded
correct answers, which is (4); and with only one exercise available everything
had to be squeezed into it, which is (2). (1) is an independent gap.

- **Two formats, and the learner's *stage* picks between them.** A cloze — one
  sentence with the pattern blanked, typed into — until the pattern sticks, then
  free production. Everything (1a) built survives as the second rung; nothing is
  thrown away.
- **Cloze does not break "no multiple choice."** That principle exists because
  offering candidates does the retrieval for the learner. A cloze offers
  nothing: it is cued recall, which measurably beats recognition for retention.
  The learner still arrives at the form; the sentence only fences off part of
  the search space, which is the same trade the hint tiers already make.
- **Cloze cannot be the terminal state either.** Production forces syntactic
  processing that gap-filling does not, and the cautionary case is a shipped
  product: Bunpro is a Japanese grammar SRS built entirely on cloze, and its own
  community's most-asked question is how to practise speaking. Stopping there
  buys a learner who is excellent at grammar exercises — the exact thing the
  research is weakest at showing transfers.
- **`kind` is demoted to deciding whether a pattern graduates.** `form` rules
  (`de` → `d'`) stay at cloze permanently, because there is no meaning to choose
  and production has nothing to add. `choice` patterns must graduate. Still read
  off the learner's error rather than off a grammar reference — see
  data-model.md.
- **Stage is derived from `repetitions`, never stored.** No field, no migration,
  no way for stage and schedule to disagree — and a lapse demotes a pattern back
  to cloze for free, because `getNextReviewData` already resets `repetitions` on
  `again` (`sm2.ts:68`). The threshold borrows SM-2's own boundary rather than
  inventing a second definition of "learned".
- **The cloze hints are free.** Tier 1 is the pattern's stored `gloss` — the
  meaning of the point being asked for, which is exactly Bunpro's first tier —
  and tier 2 is the citation form. Neither is generated. This is the direct fix
  for (3): the sentence disambiguates, and the meaning is one keypress away
  without being given up front.
- **A cloze turn is one model call and grades locally.** Session cost drops from
  a flat *2n* to `n_cloze + 2·n_production`, weighted cheap because everything
  starts at cloze — and (4) disappears entirely for cloze turns, since exact
  comparison has no variance at all.
- **Interleave within a session, keep the separate row for now.** Interleaving
  beats blocking for grammar on delayed tests, so the session queue shuffles.
  Folding patterns into the *vocab* queue stays open: the measured comparison is
  grammar points against each other, not grammar against vocabulary. ⚠️ **Do not
  judge this by feel** — blocked practice reliably *feels* smoother during a
  session and is worse a week later, so "that flowed better" is evidence of
  nothing here.
- **Patterns get a management surface: a mode toggle on Cards.** _User's call._
  Not a fifth nav entry for ten items, and not the deck-filter row either —
  `filterCardsByDeck` returns `Flashcard[]` and a pattern is not one. A
  Cards/Patterns switch above the existing list: pattern, gloss, kind, next
  practice, and edit / archive / delete. Answers (1).
- **Patterns can be added by hand.** _User's call._ Pattern, optional gloss, and
  **the kind, chosen by the user from two labelled options**. No model call, so
  no new endpoint — and making the learner answer "is this a rule that always
  applies, or a choice about how to say something?" is the most direct statement
  the app can make about what counts, which is (2). Far cheaper than the Learn
  arm's 12 prompt templates, which is now weaker rather than merely later.
- **The curated grammar pack stays closed, and is now better argued.** It was
  rejected on the aesthetic ground that adaptivity should be emergent.
  Pienemann's teachability hypothesis supplies a mechanism: instruction changes
  the *rate* of acquisition but not the *route*, so an ordered syllabus is
  fighting a constraint rather than merely being un-Amgi. Errors-as-syllabus is
  well-founded — the patterns you get wrong are by construction the ones at your
  developmental edge.
- **The learner override is in, and the ease ratchet closes with it.** _User's
  call, 2026-08-08 — this was the last of the three opens._ On any verdict below
  `good`, one control re-grades as if the answer had been right. Cloze is what
  made it obviously correct rather than merely tempting: the expected answer sits
  on screen beside what the learner typed, so they are not appealing a
  judgement, they are reading two strings and reporting that `alternates` was
  short. It re-grades correctness, not effort — the hint clamp still applies, so
  at tier 2 it does nothing, which is right.
  Separately, **a hint-free exact cloze match now emits `easy`**, which is what
  actually un-sticks the ratchet. That reasoning is cloze-specific: a string
  comparison is not a judgement that can be wrong, so a clean hit is exactly the
  signal `easy` is for. Production stays capped at `good`. `sm2.ts` is still
  untouched — `getNextReviewData` already takes all four responses.
  **Two opens remain:** folding into the vocab queue (above), and an unprompted
  tier-1 hint after an idle, which now applies to production turns only.
- **What building it corrected** (2026-08-08, same day): only one thing, and it
  was found by running the real model rather than by reasoning. Asked for a
  French elision cloze, Gemini returns `d’` with a **curly** apostrophe — which
  no learner types, so the single rule that prompted this entire redesign would
  have been ungradeable on every attempt. Cloze comparison now folds
  typographic apostrophes, quotes and dashes to their ASCII forms. Worth
  remembering as a class of bug rather than an instance: the cloze grader is
  exact by design, so *every* character the model and the keyboard disagree
  about is a false negative.
  Classification was verified live at the same time and needed no change —
  `-는데` came back `choice` off a naturalness finding, and both French elisions
  came back `form` off grammar findings.
- **Recorded, not solved:** the meta-analyses behind all of this largely
  measured *explicit* knowledge — being good at grammar exercises. The claim
  that any of it transfers to writing Korean rests on the production rung and on
  the sequence argument, not on the effect sizes. Amgi's own acquisition signal
  (a pattern that stops appearing as a finding in your writing) remains the best
  available answer and is still not v1.

### No local model yet — and the first step isn't a model (2026-08-08)

The spike ran and produced what it was supposed to: a written answer, not a
feature. **`docs/local-model.md` is that answer** and is the thing to read
before this reopens. The backlog item is closed rather than deferred; the two
pieces worth doing were scoped out of it into Medium.

Why closed:

- **The hot path is one route.** Only `/api/explain`'s core arm is worth
  replacing, and 293 pack entries already bypass it — now many more, with #81.
  Depth, examples and writing review carry the actual differentiation and are
  exactly what small models fail.
- **The size band that fits a 4 GB phone is the band that fails the quality
  bar.** RAM binds before disk (~1.5 GB of weights on beta devices). Ambiguity
  judgment, Korean register and Traditional Chinese script fidelity all sit
  below that line — and a 简体字 leak is invisible to anyone who can't read the
  difference, which is the worst kind of failure to ship.
- **Latency was never the win people assume.** ~60–100 tokens of JSON on-device
  is 2–5 s, the same band as a Flash round trip. A *cache hit* is two orders of
  magnitude faster. Cost isn't a problem at a single-digit beta either.
- **Expo Go can't load a native inference module**, so the whole app would run
  without the dev loop the no-OTA shipping model is built around — and web can't
  follow at all, which forks the mobile↔web parity reached in July.

**One correction worth keeping**, because it was assumed the other way for
months: **weights are data, not code.** `expo-file-system` is already a
dependency, so model files download at runtime like any other asset. Only the
*runtime* is a native module — one build gets it in and models are swappable
after. The no-OTA constraint is real but narrower than the backlog claimed.

**Reopen condition, and it is specific: an eval harness first.** `npm test` is
unit tests; nothing measures model output, so no candidate can be judged today
and any comparison would be vibes. Reopen when the term cache is live and has a
measured hit rate, *and* there is an eval set to score a candidate on — at which
point the question is answerable instead of speculative. Apple Foundation Models
is the one path that dodges the size problem entirely (zero download, guided
generation would kill the JSON-parsing fragility), and is worth re-checking when
the floor is no longer iOS 26 / iPhone 15 Pro.

### A pack may be authored as pairs, and register twice (2026-08-08)

The military packs are the first content where **both sides are terms a
professional has to produce**, not a study side and a gloss. So the source in
`packages/core/src/military.ts` is `BilingualSection[]` with neither side
privileged, and `derivePack` reads it once per direction.

- **No new pack shape was needed**, which was the bet the draft made and it held.
  `buildPackCardDraft` already writes the study side last, so it wins over
  whichever authored side lands in the same slot. Only the *opposite* side is
  authored: a Korean back on a Korean deck could never be read, and its only
  effect would be to look authored.
- **Four ids, not two.** `getCollectionId` returns `card.packId` unqualified, so
  two directions sharing an id collapse cards saved from the Korean deck and the
  English deck into one collection on `/cards`. Producing `battalion` from 대대
  is not the same skill as the reverse and drilling both is the premise, so the
  id carries the direction (`-ko` / `-en`) and the display name does not.
- **The name has to be direction-neutral on both sides.** "Military English" is
  wrong for the English native studying Korean; 군사용어 is what the field calls
  the material anyway. A test pins this, because it is the kind of thing a later
  rename undoes without noticing.
- **The split is by register, not difficulty** — neither pack is the beginner
  one. 부대·참모 is a unit and a combined staff, where the failure mode is
  stumbling. 안보·정세 is a briefing and a press statement, where it is saying
  "joint" for 연합 in front of people who will quote it. They are also **not a
  sequence**: a 통역병 in a line unit wants one first, a 통역장교 headed for
  public affairs the other, and the deck page cannot say "either, depending" —
  so the order in `VOCAB_PACKS` is not a recommendation and says so in a comment.
- **No term appears twice and no two terms share a back, across both packs and in
  both directions.** Same constraint that forced the 초래하다/야기하다 splits on
  TOPIK, now enforced across two packs rather than within one — which is why
  three traps (취역식/임관식, the 전역 homograph, 제병협동) sit in 안보·정세
  despite belonging to 부대·참모's traps section by nature.
- **Hints stay out of the drafts' own numbering.** Five `context` strings pointed
  at draft sections ("see §10"). A hint survives onto the card as
  `briefDefinition` and is read by the depth and examples calls, so a pointer to
  a document neither the learner nor the model can see is worse than useless.
  They state the point directly now, in the drafts too, so what a reviewer reads
  is what ships.

### Skeletons stop at the three that shipped (2026-08-06)

The long tail is **cancelled, not deferred** — deck and drill screens, the writing
panel, and the web port that parity argued for. The three in PR #80 were picked
because they were the worst: a cold launch opening on a full-screen spinner with
nothing on it, and the two longest lists. Those are fixed. What was left is the
tail where the wait is already short enough that a shaped placeholder and a
spinner are the same experience, and each one is still a real diff to write and
maintain against a layout that changes.

`SkeletonBar` / `SkeletonGroup` / `SkeletonRows` **stay** in
`apps/mobile/src/components/Skeleton.tsx` — they're in use, and a fourth case is a
composition away if some screen turns out to load slowly enough to earn one. That
is the reopen condition: **a measured slow load on a specific screen**, not
coverage for its own sake. "Web has no skeleton component" is not by itself a
reason to build one; parity is about what a user can do, not about which
primitives each platform owns.

_In-button spinners were already excluded and remain so — there the question is
whether the press registered, which a spinner answers and a skeleton doesn't._

### Contextual tips: cancelled, pull help is the answer (2026-08-04)

Dropped from the backlog, not deferred. The "?" shipped in PR #74 on Learn, Packs
and Review **is** the answer to contextual help: it's pull, so it needs no record
of who has seen what — which was the item's only hard problem.

The surfaces the old item still listed as unexplained — drill, export, archive,
and the Cards page's two filter axes — get another "?" if they turn out to need
one. That's a small addition to an existing pattern, not a feature to carry on a
list. **Reopen only for a genuinely *pushed* tip**, which brings back both costs
at once: somewhere to store "seen tip X", and a per-tip trigger that must not
fire before that feature exists for that user. Nothing observed so far justifies
either. Sits with *Onboarding is not a checklist* below: the fix for "onboarding
is just text" is never another widget describing the app.

### Export stays as it is — own cards only (2026-08-04)

Cancelled for the plainest reason: **nobody has asked.** It was noticed in PR #51
and written down, never requested. That a CSV/Anki dump omits pack cards is
consistent with what `/cards` means, and neither of the sketched fixes (an export
on the deck page, an "include pack cards" toggle) has a user behind it.

Consequence to know about, since it lands without anyone choosing it: **export
follows the visible filter**, so an export taken on the default view now includes
pack cards. The old item kept the two apart precisely so that wouldn't happen
silently — that caution is now spent deliberately rather than by accident. If the
wider dump is ever wrong, the axis is already there to narrow it. _Shipped in #80
(08-04), which also dropped the Anki export's own archived skip: with the filter
in charge, a second one would hand you an empty file from the Archived tab._

### Grammar is patterns you exercise, not cards you flip (2026-08-03)

Designed before any code. The *argument* is in [vision.md](vision.md) and is the
part to read first — vocabulary is a lookup table, grammar is a function, and a
card runs the function on zero arguments. The type is in
[data-model.md](data-model.md), the staging in [backlog.md](backlog.md).

- **A pattern review is a one-sentence writing review with a target.**
  `/api/writing` already returns the native rewrite plus what to notice, pitched
  at the level the writing shows. A prompt gives a situation and a meaning in the
  native language, the learner writes the sentence, the verdict and the why come
  back through `WritingFinding`. Nothing new is invented.
- **The prompt never names the pattern.** "Use `-다가` in a sentence" teaches the
  label; the reach is the skill. The situation is chosen so the pattern is the
  natural way to say it.
- **Every exercise is production — no multiple choice.** Offering candidates does
  the retrieval for the learner. The latency objection doesn't hold: a turn costs
  20–60 seconds of thinking, so a two-second evaluation is invisible.
- **A hint tier, because the blank textbox is the real failure mode.** Refusing
  multiple choice leaves a stuck learner with nothing to do but be wrong, and it
  bites hardest on the patterns needing the most practice. One Hint control, two
  tiers: (1) the shape without the name, (2) the citation form itself. **Hints
  clamp the verdict** — `hard` after tier 1, `again` after tier 2 — which keeps
  retrieval the learner's and tells the scheduler the truth, with no new
  scheduler work. Both tiers generate with the situation, so no extra round trip.
  **Open:** whether a tier-1 hint is ever offered unprompted after an idle.
  Offering rescues the learner who won't ask; it also interrupts thinking, which
  is what this design exists to protect.
- **Verdicts are coarse: `good` / `hard` / `again`, never `easy`.** The rewrite
  shows on every verdict — a "got it" that still differs from native phrasing is
  worth seeing (same reasoning as `rewriteNative`).
  ⚠️ **`sm2.ts` is untouched as a file but not as behaviour.** In
  `getNextReviewData` (`sm2.ts:77`) `good` is exactly ease-neutral
  (`+0.1 − 1×(0.08 + 0.02)`) and `hard` is `−0.14`; `easy` (`+0.1`) is the only
  response that raises ease and it is the one excluded. So ease becomes a
  **one-way ratchet** for patterns: it falls and never climbs back, where a card
  recovers. Two exits when it bites, neither taken: emit `easy` for a clean
  first-try answer, or let the learner's override produce it. That makes the
  override question load-bearing, not cosmetic.
  *Risk, recorded not solved:* a wrong harsh verdict demoralises in a way a
  self-graded card never does. Mitigated by coarse verdicts, the rewrite always
  visible, and the note in the learner's language. **Open:** may the learner
  override a verdict.
- **`again` keeps a pattern due now, which reads differently here.**
  `sm2.ts:79-89` leaves a missed card due immediately so a restarted session
  picks it up — right for cards, hard-won (it was a platform divergence). For a
  pattern the rewrite was on screen seconds ago, so an immediate retry is nearer
  copying than recall. A fresh situation blunts it. Not a blocker and *not* a
  reason to touch `sm2.ts`: the fix, if needed, is a floor on reappearance where
  patterns are queued.
- **A review is two model calls.** Generate the situation, then grade — they
  can't collapse, since the exercise must exist before there's anything to grade.
  A session of _n_ patterns is _2n_ calls where a vocab session is zero; that's
  the running cost and it belongs next to the design. Only generation is new.
  Generation can be batched for the whole due set if per-turn latency
  disappoints, which trades a slower start for faster turns — a real-sessions
  question, not a v1 one.
- **Grading failure mid-session is the case with no obvious answer**, and it is
  not the offline case. The learner has spent 40 seconds on that sentence, so
  losing it is the one outcome to rule out. v1: keep the text, offer retry, allow
  a skip with no verdict — a skip writes no `ReviewTracking`, leaving the pattern
  due. Never write a verdict the model didn't produce.
- **Patterns get their own row in the Review picker — no fifth tab.** A 40-second
  production turn between two 3-second flips changes what Review feels like;
  doing that silently isn't a change to make by accident. The surface is free but
  **the function is not**: `buildReviewCollections` is `(cards: Flashcard[], …)`
  and `ReviewCollection.id` is contractually "null is your own cards, anything
  else is a pack id". A patterns row needs a second input and an identity outside
  that namespace — prefer a discriminating field over a reserved string, which is
  one future pack id away from colliding. **Open:** interleaving patterns into the
  vocab queue; decide once the rhythm is known.
- **Two ways in, both emergent.** A `kind === 'grammar'` writing finding offers
  "Practice this pattern" instead of "Save card" (a `WritingFinding.pattern?`
  sibling to `card?`; the prompt already asks for citation form). And Learn, by
  detection — a third `ExplainResult` arm, no new UI. Cost, named: `/api/explain`
  has six language branches each splitting again on `if (context)` — **12 prompt
  templates, not 6**. `/api/writing` is language-generic by comparison, which is
  why the writing-finding door ships first.
- **No curated grammar pack.** An ordered grammar curriculum is exactly the
  configured levelling [vision.md](vision.md) argues against twice. Errors are the
  syllabus; Learn covers cold start, the only thing a pack was for.
- **Spoken production is scoped with conversation practice, not ahead of it.** The
  app has no ASR at all — TTS out, nothing in. Web has Web Speech; mobile needs a
  native module, so a build of its own. Conversation practice already owns
  "transcription + per-participant feedback" and is already told to reuse
  `writing.ts`. Solving capture twice is the drift that put
  `reviewQueue`/`drill`/`reminders` in core. v1 is typed production.
- **Pattern review requires a connection in v1.** Model-graded production can't
  work offline and offline review is shipped, so the row is disabled offline
  rather than failing (`useOnlineStatus` / `useNetworkStatus` already exist). The
  resolution path is produce-offline / evaluate-on-reconnect, the same
  queue-and-flush as `enqueueReview`. Recorded, not built.
- **The acquisition signal is the north star, and it reopens a closed call.** A
  pattern that **stops appearing as a grammar finding in your own writing** is
  measurable evidence of acquisition, where a review count isn't. That needs
  writing stored over time, which the ephemeral-submissions call below closed off
  — reopened explicitly rather than assumed away. Not v1.

#### What building (1a) corrected (2026-08-08)

Three things the design did not survive contact with. The first two are settled;
the third is a step nobody has taken yet.

- **A verdict cannot be derived from `/api/writing` alone.** The design has
  grading reuse the route unchanged, and it does — but that route grades prose
  without knowing which pattern was being practised. A learner who sidesteps
  `-다가` entirely and writes something correct gets a clean review and a `good`,
  which schedules out the very pattern they avoided. Since "when to reach for
  it" is the *first* of the three things this feature exists to teach, that is
  the feature failing at its own premise, not an edge case. Fix:
  `PatternExercise.targetForms`, the surface fragments that count as having
  reached — generation knows the pattern and is a call already being paid for,
  so it lists them for free. Grading stays `/api/writing` unchanged; the check
  is local. **Cost, named:** it is a substring match, so it is exact for
  suffixal patterns and approximate elsewhere, and a thin form list scores a
  correct answer as a miss. An unmeasurable reach is therefore scored as
  *reached* — a wrong `again` on a good sentence is the outcome this design
  least wants. Measured over three answers against a generated `-다가` exercise:
  correct use → `good`, sidestep → `again`, botched form → `hard`.
- **The entry door is not `kind === 'grammar'`.** The design says a grammar
  finding offers "Practice this pattern". Measured on a passage using
  `-고 있었어요` where a native would use `-는데`, the model returns `naturalness`
  — correctly, since no rule was broken — and `-는데` is exactly the pattern
  worth practising. Gating on `grammar` hid the best offers behind the one kind
  that means "you made an error". The gate is gone; what a pattern *is* lives in
  the prompt, which defines it. The kind describes the finding, not the
  take-away.
- ⚠️ **The `patterns` collection has no Firestore security rule, so nothing
  works yet.** Reads fail with `Missing or insufficient permissions` and the
  patterns row silently doesn't appear — which is the isolation working as
  designed (a patterns read that throws must not cost the user their cards), and
  is also why this will not announce itself. There is no `firestore.rules` in
  the repo, so it is a console step, and it is the *only* thing standing between
  this branch and a usable feature. The composite index the design budgeted for
  turned out not to be needed: two equality filters with no `orderBy` are served
  by merging single-field indexes, and `archived`/sort are handled in JS because
  patterns number in the tens.

### Onboarding is not a checklist (2026-08-02)

Built, then rejected — measured, not guessed. The complaint was fair (the tour
card only *names* the four surfaces), but a three-step card on the Learn empty
state was the wrong answer twice over:

- **It occupied Learn permanently** until the loop closed. Learn is the surface
  [vision.md](vision.md) most wants out of the way; a progress tracker above the
  search field is the opposite.
- **It was still telling, not showing.** Ticking a box narrates what you just
  did. That was the same objection the checklist was *meant* to answer — so the
  lesson is that the fix for "onboarding is just text" is not a different widget
  describing the app.

Whatever comes next should teach inside the flow and not live on Learn. The
derived-signal machinery was the good part (`cardCount > 0`, `lastReviewDate`
— no stored state) and is at `ba9a844` in the reflog of
`feat/onboarding-first-run`. What shipped: two setup questions plus a one-card
tour, and that's where onboarding rests.

### Learn-flow `packId` stamping and daily draw: both dropped (2026-08-02)

Removed, not deferred — the pack unification answered both.

- *Stamping `packId` on Learn saves* existed because one word saved two ways
  landed in two places. Decks no longer route to Learn, so there is one path.
  What remains is typing a pack word in by hand, which is a person deliberately
  looking something up — that card genuinely is their own. Reopen only if a second
  surface starts saving pack words without a `packId`.
- *Daily draw* was one of four ways to make a 160-word pack learnable. Section
  enrolment solved it more simply — six sittings of 20–40, no scheduling state, and
  the user picks when to sit down rather than the app rationing. Reopen only if
  sections land too much at once in practice.

### Packs: one kind, not two (2026-08-02)

The `lookup`/`cards` split was a cheap way to ship a word list without authoring
backs, and it was cheap in the wrong place: a `lookup` pack couldn't be
bulk-saved, drilled or reviewed, so the packs with the most words had the least
machinery. Rejected alternatives: *batch-generate backs at enrol time* (a long
spinner on the tap, and it generates the curated half of the content, against
[vision.md](vision.md)); *migrate pack by pack* (two live code paths
indefinitely).

**The tension worth remembering:** both packs' headers argue these are words
where one gloss is *not enough* (여건, 취지, `outstanding`). Still true. The
resolution is that **the back is a seed, not a finished card** — it makes the word
savable and reviewable at all, and depth is generated on demand afterwards.
Before, that generation was mandatory and came *before* the card existed. If a
future change makes on-demand depth hard to reach, this justification goes with
it and gloss-only cards become a real regression.

Sections are **semantic, not uniform slices** — "Familiar words, second meanings"
is a theme a learner can hold, "words 31–60" isn't. Costs evenness (sections run
20–45); accepted. `layout` replaced `kind` for grid-vs-list, keyed on the content's
shape, so a future single-character pack inherits the grid without being asked.

### Writing review: design calls (2026-07-31 → 2026-08-01)

- **A Word/Passage toggle on Learn, not a fifth tab.** Alternatives were a
  `/write` route (the `/decks` precedent) and a tab. The toggle won on the vision
  statement — "ONE place to ask, understand, and remember" — since a passage
  you're unsure about is the same question as a word, at a different size. It also
  **defers the nav question until conversation practice lands** and there are two
  output surfaces to place together. Cost accepted: discoverability rests on the
  toggle, so it's a visible segmented control.
- **Findings are one ordered list, not fixed sections.** This *is* the
  level-adaptivity mechanism and is easy to undo by accident. The model orders by
  what this writer most needs. Fixed sections give a beginner an empty register
  heading and an advanced writer an empty grammar one — and adaptivity has to be
  rebuilt as configuration. Verified against real passages, both directions.
- **Any teachable unit becomes a card, including grammar patterns.** The first
  draft said vocabulary only — wrong, for the reason the audience amendment in
  [vision.md](vision.md) fixes. One-off typos still get no card.
  ⚠️ Superseded for grammar specifically by the grammar-pattern design above: a
  pattern is no longer a card at all.
- **The rewrite is shown in the native language too** (`rewriteNative`). A
  correctness check, not a convenience: the rewrite is the one text on screen the
  user did *not* write, so its meaning is the one they cannot verify, and a
  correction that quietly changed their meaning is worse than none — they'll learn
  the changed version. Subordinate to the rewrite but **not** behind a tap, despite
  "depth on demand": a check nobody opens is a check nobody runs. The prompt
  translates faithfully *including* where the rewrite departs.
- **A card back may carry up to two glosses, never more.** Forcing exactly one
  (copied from `/api/explain`) makes the card wrong rather than clean when no
  single word covers the term. Two is a ceiling for necessity, never a third.
  ⚠️ `/api/explain` still enforces strictly one, left alone deliberately —
  relaxing the core lookup loop didn't belong in a writing-review change. The
  inconsistency is the open question, not the rule.
- **Submissions are ephemeral; only saved cards persist.** No new collection, so
  neither manual console step applies.
  ⚠️ **Being reopened** by the grammar acquisition signal above, which needs
  exactly this. Still not owed; no longer settled.

### Decks, drill and review shape (2026-07-25 → 2026-07-26)

- **Drilling lives on Decks, not in Review.** A deck-scoped Review either respects
  due dates (4 of 71 kana, can't drill) or ignores them (two loops behind one tab
  with no way to tell which you'll get). Drill is a closed set, repeatable, not
  due-gated; Review is what the scheduler says. *Amended by PR #51:* Review
  composes collections rather than filtering a pool, so "which cards" is a choice
  made before starting. The load-bearing half stands — the two loops stay distinct.
- **Drill writes no SM-2 state.** Practice and scheduling stay separate, so
  grinding the kana chart five times can't wreck intervals. If drill ever feels
  like it "doesn't count", the fix is progress shown in the deck, not writes to the
  scheduler.
- **No "All cards" row on Decks.** It's a nav entry pointing at a nav entry, and a
  naming fix isn't worth a fake row. The one thing it would buy — drill my whole
  collection ignoring due dates — is a button on Cards if anyone ever asks.
- **Decks is a nav item on both platforms** (reversing the 2026-07-25 "route, not
  a tab"). The original trigger was pack *coverage*; what actually justified it was
  the **model** changing — a pack became a collection you review, a peer of Cards,
  and a peer doesn't live behind a link on Learn. The empty-for-four-languages
  objection was answered rather than outgrown: a *conditional* nav item reflows the
  bar on every language switch, worse than a quiet empty state that explains what a
  pack is. Nav reads Learn / Review / Cards / **Packs** — "Packs" rather than
  "Decks" so the two entries don't ask to be compared as Anki-style decks.

### Naming and audio (2026-07-23 → 2026-07-25)

- **The app keeps the name "Amgi."** Whether 암기 still fits as the app grew past
  Korean was weighed; the answer is yes. Settled — don't re-raise it as growth
  advice. A domain can be bought against the current name whenever wanted.
- **`cmn-TW-Wavenet-A` stays** for Traditional Chinese. Samples were listened to
  against `cmn-CN-Chirp3-HD-Charon` and accepted. `cmn-TW` has no Chirp 3: HD voice
  at all, so this trades voice quality for a Taiwanese rather than Mainland accent.
  The accent won.
- **A single kana may sound different from the rest of its deck.** Single
  characters route to a Neural2 voice while longer text uses Chirp 3: HD, so the
  speaker audibly changes between a tile and a sentence. Correctness beat
  consistency; moving Japanese and Korean wholesale to Neural2 would cost quality
  on longer text. **Not a consistency bug** — if it resurfaces it's a re-decision.
- **No OTA.** See Known Issues and [tech-stack.md](tech-stack.md).
