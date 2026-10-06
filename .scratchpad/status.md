# Project Status

Session orientation: what's live, what's unverified, what's decided.

**Shipped history is not recorded here.** Git and GitHub already track it, and a
second copy only goes stale. What belongs in this file is what those two can't
show: console and binary state that lives outside the repo (Now, Builds), what
is currently unverified, and the index of closed calls (Decisions).

_Last cleaned up 2026-10-04 at `1245c23`. Test and lint counts are under
Housekeeping in [backlog.md](backlog.md)._

## Now

- **2.1.0 is build 18, live in TestFlight and approved for external testing**
  (2026-09-28). External testers can be invited without another review as long
  as the version doesn't change.
- **2.2.0 is build 19, submitted and waiting on Beta App Review** (2026-10-05), cut from
  `4f13448` on `main`, the merge of `release/2.2.0` (PR #191). It carries the
  twelve PRs under Queued for the next build in [backlog.md](backlog.md); web
  already has all of them. Pre-flight: no native module or `app.json` native
  config has changed since 2.1.0, introspect came back `entitlements: {}`, the
  review notes are 3993 of 4000 characters, and the copy has no character Apple
  has not already accepted except Hangul syllables. The user smoke-tested in
  Expo Go before the cut. The build ran without auto-submit and was uploaded
  with `eas submit`, after the Account Holder accepted an updated Apple
  agreement: until then every upload was refused with "You do not have
  required contracts to perform an operation (403)", which is not a key or
  password problem. Testers stay on build 18 until approval; the queue turns
  over then, not now.
- **Web deploys on merge**, so everything on `main` is live there.
- **`/api/grammar/exercise` stays deployed** for any device still on 1.3.0,
  which has the grammar UI compiled in. The deletion is under Housekeeping in
  [backlog.md](backlog.md).
- **`nativeLanguage` is still written alongside `interfaceLanguage`**, because
  build 15 reads the old field. What retires it is the console showing no
  sessions on build 15, not another release.

TestFlight context that isn't in the repo:

- Tegi's account is enrolled as **Individual**, which blocks non-account-holders
  from generating certs. Worked around with an App Store Connect API Key.
- Bundle ID `com.tegi.amgi` is **disposable**. A public launch under the user's
  own account is a fresh relaunch, not a migration: Apple's App Transfer doesn't
  cover TestFlight-only apps.
- ⚠️ Console state (public link live? testers actually invited?) is never
  knowable from the repo. Confirm before assuming.

## Unverified

Nothing here is tracked as work: by the 2026-09-04 decision
([process](decisions/process.md)), these checks come from using the app, and a
line leaves when somebody hits the path in normal use.

**Never verified on a real binary, on any build.** The logic is tested, the
native bindings are not, and SDK 57 (build 15) moved every one of these modules
at once:

- pronunciation audio
- CSV/Anki export
- sharing, including the stats image's download-then-share path, which was
  rewritten in build 16 and has never run end to end
- offline review across a force-kill and reconnect
- the review reminder firing, and disappearing once you review
- account deletion against the production `EXPO_PUBLIC_API_BASE_URL`

The share preview needs that same host: on a build pointed at nothing it draws a
blank placeholder. On **Android**, only sign-in has ever been exercised.

**Never looked at on a device or a real account:**

- **Munli on a binary.** Expo Go covered the practice loop, the verbs page,
  Tables and Progress (2026-09-22) and the keyboard flow (2026-09-25). Not
  covered: the changes after 09-22 (two-topic split, filter dropdowns, save
  pills), and the cross-device claim (practise on web, phone updates without a
  relaunch).
- **Writing review**: no passage has been submitted through it on either
  platform since it came back (PR #136).
- **Build 18**: the mid-review edit card on a small iPhone with a long gloss,
  and whether the cold-open cache feels faster. Judge the second with the
  launch stopwatch ([data-loading](decisions/data-loading.md)).
- **The per-deck language migration** runs on every existing account's first
  load. Nobody has watched it against a real multi-deck account.
- **The Slow pronunciation speed** is a pitch-corrected stretch, not a slow
  synthesis. If it sounds like an artifact, the fallback is written in its
  entry in [pronunciation](decisions/pronunciation.md).
- **Hanja**: nothing has been enrolled or reviewed on a real account.
- **Progress display** (calendar, ramp, tiles): colours were computed and
  validated, layouts were not looked at.
- **Kikuyu's Korean respelling** emits `w`-series syllables (뫄, 뭬, 콰, 과, 화)
  that nothing else in the app produces. Unseen on a device.
- **The Spanish Basics rows** (article badge, whole-question rows) are the
  longest that pack layout has had to hold. Unseen by a signed-in user.
- **Account deletion removing a user's packs.** The deletion extension was
  given `ownerUid` on 2026-10-05 so that it would; nobody has deleted an account
  that owned a pack and looked. The privacy policy says packs are removed.

**Progress history has two start dates and neither can be backfilled.** Daily
rollups begin 2026-08-20; `cardsMatured`, `studySeconds` and `byHour` begin
2026-09-06. Per-language retention is honest from 2026-09-04. The stats image
shows four numbers until 2026-10-06 and five after, with no code change.

## Builds

No OTA, so every mobile change reaches users through one of these.

| Version | Build | Date | Cut from |
|---|---|---|---|
| 2.2.0 | 19 | 2026-10-05 | `4f13448` on `main`, the merge of `release/2.2.0` (PR #191). Submitted 10-05, waiting on external review |
| 2.1.0 | 18 | 2026-09-27 | `d1de37e` on `release/2.1.0` (PR #176). External testing approved 09-28 |
| 2.0.0 | 17 | 2026-09-23 | `69476aa` on `release/1.8.0`. Approved 09-23. The branch name says 1.8.0 because it was cut before the 2.0.0 call |
| 1.7.0 | 16 | 2026-09-19 | `cb7c19c` on `release/1.7.0`. External approval never reported |
| 1.6.0 | 15 | 2026-09-10 | `c8c113a` on `release/1.6.0`. Approved 09-10. First binary on SDK 57 |
| 1.5.0 | 14 | 2026-09-02 | `84be8af` on `release/1.5.0` (PR #109). Approved 09-02 |
| 1.4.0 | 13 | 2026-08-22 | `dedcdd6` on `release/1.4.0`. Approved 08-24 |
| 1.3.0 | 11 | 2026-08-11 | `86c2c5a` on `release/1.3.0`. **First build approved for external testing**, 08-12 |
| 1.2.0 | 9 | 2026-08-02 | `51a53e9` (PR #76) |
| 1.1.0 | 8 | 2026-07-27 | `8359adf` on `fix/drop-push-entitlement`, pre-merge |
| 1.0.2 | 4 | 2026-07-24 | `0288136` |
| 1.0.1 | 3 | 2026-07-21 | `a85270d` (PR #43, EAS channel fix) |
| 1.0.1 | 2 | 2026-07-21 | `4d217f3` |
| 1.0.0 | 1 | 2026-07-17 | `db8a6ea` (PR #37) |

- **The table is iOS only.** Android ships as a sideloaded APK with no review
  ([releases](decisions/releases.md)). Its `versionCode` is at 10 (2.2.0, from
  `81eaab3`, finished 2026-10-06); 6 was 1.7.0 from `cb7c19c`, 4 was 1.5.0
  from `d25b544` and 5 was 1.6.0. 7 to 9 were the same 2.2.0 run and produced
  no APK: 7 errored on EAS ("We've lost connection to the worker", a server
  error) and 8 and 9 were cancelled.
- **Build numbers live in EAS** (`appVersionSource: remote`), so they are read
  off the console and recorded here. Gaps are normal: a number is reserved when
  a job is created. Builds 5–7 failed, and 12 was burned by a 1.4.0 run started
  with `--non-interactive` (see Cutting a build in [backlog.md](backlog.md)).
- **The hash EAS logged can differ from the row.** 1.5.0's iOS and Android
  builds carry different hashes and the same app (the delta is notes only), and
  `84be8af` was amended away. If a build ever has to be reproduced exactly,
  resolve it from the EAS build record, not from the branch.
- **Native-module builds so far:** 1.3.0 (`expo-clipboard`), 1.4.0
  (`expo-dev-client`), 1.6.0 (SDK 57), 1.7.0 (`react-native-svg`). Every
  `expo config --type introspect` pass came back `entitlements: {}`, so
  `withoutPushEntitlement` still strips `aps-environment`.
- **A version bump queues another Beta App Review.** The freeze on mobile
  merges holds only from cut to submission.

## Known Issues

- **One person had problems downloading the 2.2.0 Android APK**
  (`versionCode` 10), reported to the user 2026-10-06. Noted on the user's
  call, to deal with later. **Nothing more is known yet**: not what went wrong
  (the download link, the install, or the first launch), nor the device or
  Android version. Start by getting those from the tester.

- **OTA updates never reached the device.** CI published PR #44 successfully
  (run `29892869152`); the change never appeared and debugging dead-ended, so
  **OTA was abandoned 2026-07-23** rather than diagnosed. Reopen only with a
  specific reason to want OTA back. See [tech-stack.md](tech-stack.md).

## Decisions

Closed calls, kept with their reasoning, because a decision whose reasoning is
lost gets reopened by the next person to notice the symptom. The entries live in
[decisions/](decisions/), one file per area, newest first. Add a new entry to
the top of its file and a line here.

### Munli

The second mode: its shell, conjugation practice, writing review as a tool, English articles. 2026-09-21 on.

- [Munli's themes come up out of the water (2026-10-05)](decisions/munli.md#munlis-themes-come-up-out-of-the-water-2026-10-05)
- [On mobile a tab's heading is its name, and the name is web's (2026-10-05)](decisions/munli.md#on-mobile-a-tabs-heading-is-its-name-and-the-name-is-webs-2026-10-05)
- [A second tap on the Saved tab returns to the shelves (2026-10-05)](decisions/munli.md#a-second-tap-on-the-saved-tab-returns-to-the-shelves-2026-10-05)
- [A verb you keep missing is drawn more often, and that is all it changes (2026-10-05)](decisions/munli.md#a-verb-you-keep-missing-is-drawn-more-often-and-that-is-all-it-changes-2026-10-05)
- [Verbs are one topic again, and Amgi has a door into it (2026-10-04)](decisions/munli.md#verbs-are-one-topic-again-and-amgi-has-a-door-into-it-2026-10-04)
- [English articles: a box on every slot, and the rule is what's scheduled (2026-09-28)](decisions/munli.md#english-articles-a-box-on-every-slot-and-the-rule-is-whats-scheduled-2026-09-28)
- [Munli's practice sets are per language unless marked general (2026-09-25)](decisions/munli.md#munlis-practice-sets-are-per-language-unless-marked-general-2026-09-25)
- [A right answer says so, and then gets out of the way (2026-09-22)](decisions/munli.md#a-right-answer-says-so-and-then-gets-out-of-the-way-2026-09-22)
- [What the first Munli pass got wrong, from using it (2026-09-22)](decisions/munli.md#what-the-first-munli-pass-got-wrong-from-using-it-2026-09-22)
- [⚠️ Two of those four turned out to be content (2026-09-22)](decisions/munli.md#two-of-those-four-turned-out-to-be-content-2026-09-22)
- [The irregular verbs are sourced, and three is the whole list (2026-09-22)](decisions/munli.md#the-irregular-verbs-are-sourced-and-three-is-the-whole-list-2026-09-22)
- [Munli's titles come from one place, and so does its gutter (2026-09-22)](decisions/munli.md#munlis-titles-come-from-one-place-and-so-does-its-gutter-2026-09-22)
- [Web gets a help sheet, and Writing is what needed one (2026-09-22)](decisions/munli.md#web-gets-a-help-sheet-and-writing-is-what-needed-one-2026-09-22)
- [Tables becomes Saved, and takes the management half (2026-09-22)](decisions/munli.md#tables-becomes-saved-and-takes-the-management-half-2026-09-22)
- [The practice setup is Review's picker, with the tense as the section (2026-09-22)](decisions/munli.md#the-practice-setup-is-reviews-picker-with-the-tense-as-the-section-2026-09-22)
- [A table is six facts, so the box carries the schedule (2026-09-22)](decisions/munli.md#a-table-is-six-facts-so-the-box-carries-the-schedule-2026-09-22)
- [Munli's bar mirrors Amgi's, slot for slot (2026-09-22)](decisions/munli.md#munlis-bar-mirrors-amgis-slot-for-slot-2026-09-22)
- [What conjugation schedules is a rule, not a verb (2026-09-22)](decisions/munli.md#what-conjugation-schedules-is-a-rule-not-a-verb-2026-09-22)
- [Practice is a session that ends (2026-09-22)](decisions/munli.md#practice-is-a-session-that-ends-2026-09-22)
- [Conjugation rides the user-document subscription (2026-09-22)](decisions/munli.md#conjugation-rides-the-user-document-subscription-2026-09-22)
- [Enrolment is pairs, and Verbs is content first (2026-09-22)](decisions/munli.md#enrolment-is-pairs-and-verbs-is-content-first-2026-09-22)
- [Munli gets its own themes, and a mode's palette is how you know where you are (2026-09-21)](decisions/munli.md#munli-gets-its-own-themes-and-a-modes-palette-is-how-you-know-where-you-are-2026-09-21)
- [Writing came back unchanged, and three things around it had not (2026-09-21)](decisions/munli.md#writing-came-back-unchanged-and-three-things-around-it-had-not-2026-09-21)
- [Munli ships as a route, and web remembers it in a cookie (2026-09-21)](decisions/munli.md#munli-ships-as-a-route-and-web-remembers-it-in-a-cookie-2026-09-21)
- [Grammar is one tool at a time, and the grouping comes later (2026-09-21)](decisions/munli.md#grammar-is-one-tool-at-a-time-and-the-grouping-comes-later-2026-09-21)
- [Grammar becomes a mode after all — Munli, and the shell that hosts it (2026-09-21)](decisions/munli.md#grammar-becomes-a-mode-after-all--munli-and-the-shell-that-hosts-it-2026-09-21)

### Grammar and writing

The August grammar-patterns feature, its removal, and the reasoning that led to Munli. Read before touching `grammar.ts` or reopening pattern practice.

- [Grammar returns as content, not as a mode — and not as its own app (2026-09-14)](decisions/grammar-and-writing.md#grammar-returns-as-content-not-as-a-mode--and-not-as-its-own-app-2026-09-14)
- [Grammar and writing are removed — the routes stay behind (2026-08-18)](decisions/grammar-and-writing.md#grammar-and-writing-are-removed--the-routes-stay-behind-2026-08-18)
- [A word you reached for and didn't have is the best card a passage yields (2026-08-08)](decisions/grammar-and-writing.md#a-word-you-reached-for-and-didnt-have-is-the-best-card-a-passage-yields-2026-08-08)
- [Grammar patterns are closed — and one constraint outlives the item (2026-08-10)](decisions/grammar-and-writing.md#grammar-patterns-are-closed--and-one-constraint-outlives-the-item-2026-08-10)
- [Grammar patterns stay their own row, and the tail is cancelled (2026-08-09)](decisions/grammar-and-writing.md#grammar-patterns-stay-their-own-row-and-the-tail-is-cancelled-2026-08-09)
- [Grammar patterns: cloze first, production when it sticks (2026-08-08)](decisions/grammar-and-writing.md#grammar-patterns-cloze-first-production-when-it-sticks-2026-08-08)
- [Grammar is patterns you exercise, not cards you flip (2026-08-03)](decisions/grammar-and-writing.md#grammar-is-patterns-you-exercise-not-cards-you-flip-2026-08-03)
- [Writing review: design calls (2026-07-31 → 2026-08-01)](decisions/grammar-and-writing.md#writing-review-design-calls-2026-07-31--2026-08-01)
- [`GrammarPattern` — designed 2026-08-03, web built 2026-08-08](decisions/grammar-and-writing.md#grammarpattern--designed-2026-08-03-web-built-2026-08-08) (the data model, moved from data-model.md)

### Packs

Vocab packs: the sourcing standard, each curated pack, subpacks, user-made packs.

- [Users make vocab packs from a goal, and an agent sources them (2026-09-25)](decisions/packs.md#users-make-vocab-packs-from-a-goal-and-an-agent-sources-them-2026-09-25)
- [A tap on a mobile pack saves the word; detail moves to the second tap (2026-09-13)](decisions/packs.md#a-tap-on-a-mobile-pack-saves-the-word-detail-moves-to-the-second-tap-2026-09-13)
- [병과 material is a section of 부대·참모, and its branches keep the 「-과」 (2026-09-09)](decisions/packs.md#병과-material-is-a-section-of-부대참모-and-its-branches-keep-the--과-2026-09-09)
- [The 급수 pack was sourced, not recalled — and how (2026-09-09)](decisions/packs.md#the-급수-pack-was-sourced-not-recalled--and-how-2026-09-09)
- [Per-level content is allowed; per-level adaptivity is not (2026-09-09)](decisions/packs.md#per-level-content-is-allowed-per-level-adaptivity-is-not-2026-09-09)
- [No Review group in settings — subpacks answered it instead (2026-09-09)](decisions/packs.md#no-review-group-in-settings--subpacks-answered-it-instead-2026-09-09)
- [A pack is reviewable as a whole, and that narrows an older rule (2026-09-09)](decisions/packs.md#a-pack-is-reviewable-as-a-whole-and-that-narrows-an-older-rule-2026-09-09)
- [The Kikuyu pack, and a syllable Hangul could write all along (2026-08-31)](decisions/packs.md#the-kikuyu-pack-and-a-syllable-hangul-could-write-all-along-2026-08-31)
- [Vocab packs are sourced, and the model is not a source (2026-08-31)](decisions/packs.md#vocab-packs-are-sourced-and-the-model-is-not-a-source-2026-08-31)
- [The Spanish pack: an article is a field, and a gloss is not an explanation (2026-08-31)](decisions/packs.md#the-spanish-pack-an-article-is-a-field-and-a-gloss-is-not-an-explanation-2026-08-31)
- [Three packs authored; one of them sets a rule aside on purpose (2026-08-24)](decisions/packs.md#three-packs-authored-one-of-them-sets-a-rule-aside-on-purpose-2026-08-24)
- [A pack may be authored as pairs, and register twice (2026-08-08)](decisions/packs.md#a-pack-may-be-authored-as-pairs-and-register-twice-2026-08-08)
- [Learn-flow `packId` stamping and daily draw: both dropped (2026-08-02)](decisions/packs.md#learn-flow-packid-stamping-and-daily-draw-both-dropped-2026-08-02)
- [Packs: one kind, not two (2026-08-02)](decisions/packs.md#packs-one-kind-not-two-2026-08-02)

### Progress

Daily rollups, the streak, the charts, the shareable stats image.

- [A chart card, and the hero that has to agree with it (2026-09-23)](decisions/progress.md#a-chart-card-and-the-hero-that-has-to-agree-with-it-2026-09-23)
- [⚠️ The stats image had nine glyphs it could not draw (2026-09-23)](decisions/progress.md#the-stats-image-had-nine-glyphs-it-could-not-draw-2026-09-23)
- [The streak chip and the Progress tab kept two copies of one number (2026-09-15)](decisions/progress.md#the-streak-chip-and-the-progress-tab-kept-two-copies-of-one-number-2026-09-15)
- [The "By language" row opens a detail view, and the charts follow the range (2026-09-15)](decisions/progress.md#the-by-language-row-opens-a-detail-view-and-the-charts-follow-the-range-2026-09-15)
- [The progress surfaces say what they measure, and the ramp was measured (2026-09-12)](decisions/progress.md#the-progress-surfaces-say-what-they-measure-and-the-ramp-was-measured-2026-09-12)
- [The stats image: one window, and a heatmap ramp that measures wrong (2026-09-07)](decisions/progress.md#the-stats-image-one-window-and-a-heatmap-ramp-that-measures-wrong-2026-09-07)
- [The share asset's counters, decided before its picture (2026-09-06)](decisions/progress.md#the-share-assets-counters-decided-before-its-picture-2026-09-06)
- [Progress is a daily rollup, and the streak stays where it is (2026-08-19)](decisions/progress.md#progress-is-a-daily-rollup-and-the-streak-stays-where-it-is-2026-08-19)

### Pronunciation

Audio, playback speed, the pronunciation aid, pitch accent.

- [Jyutping: the model answers and a dictionary overrules it (2026-10-04)](decisions/pronunciation.md#jyutping-the-model-answers-and-a-dictionary-overrules-it-2026-10-04)
- [Pronunciation speed splits by content, not by surface (2026-09-23)](decisions/pronunciation.md#pronunciation-speed-splits-by-content-not-by-surface-2026-09-23)
- [The hanja button says the 음, and refuses to say anything else (2026-09-09)](decisions/pronunciation.md#the-hanja-button-says-the-음-and-refuses-to-say-anything-else-2026-09-09)
- [Pronunciation speed is a playback rate, not a synthesis rate (2026-09-01)](decisions/pronunciation.md#pronunciation-speed-is-a-playback-rate-not-a-synthesis-rate-2026-09-01)
- [Both remaining pronunciation items are cancelled (2026-08-31)](decisions/pronunciation.md#both-remaining-pronunciation-items-are-cancelled-2026-08-31)
- [The pronunciation aid is a transliteration, and pitch accent rides along (2026-08-30)](decisions/pronunciation.md#the-pronunciation-aid-is-a-transliteration-and-pitch-accent-rides-along-2026-08-30)
- [The pronunciation aid: Japanese from a dictionary, Kikuyu from neither (2026-08-30)](decisions/pronunciation.md#the-pronunciation-aid-japanese-from-a-dictionary-kikuyu-from-neither-2026-08-30)
- [Audio on mobile review hides offline rather than failing (2026-08-28)](decisions/pronunciation.md#audio-on-mobile-review-hides-offline-rather-than-failing-2026-08-28)

### Study languages

Per-language calls: Spanish, Kikuyu, Swahili, Hanja, and a native language per deck.

- [Arabic is Modern Standard, unvowelled on the front, with a reading nobody checked (2026-10-05)](decisions/languages.md#arabic-is-modern-standard-unvowelled-on-the-front-with-a-reading-nobody-checked-2026-10-05)
- [Cantonese is its own deck, and the model needed no persuading (2026-10-04)](decisions/languages.md#cantonese-is-its-own-deck-and-the-model-needed-no-persuading-2026-10-04)
- [A native language per deck, and an interface language beside it (2026-09-12)](decisions/languages.md#a-native-language-per-deck-and-an-interface-language-beside-it-2026-09-12)
- [A phrase on the Hanja deck stays a list of characters (2026-09-09)](decisions/languages.md#a-phrase-on-the-hanja-deck-stays-a-list-of-characters-2026-09-09)
- [Three-sided hanja cards cost a setting, not a scheduling axis (2026-09-09)](decisions/languages.md#three-sided-hanja-cards-cost-a-setting-not-a-scheduling-axis-2026-09-09)
- [Hanja's card back, and the `hanja` name it had to take (2026-09-09)](decisions/languages.md#hanjas-card-back-and-the-hanja-name-it-had-to-take-2026-09-09)
- [Swahili takes the audio and drops the noun class (2026-08-27)](decisions/languages.md#swahili-takes-the-audio-and-drops-the-noun-class-2026-08-27)
- [Kikuyu ships with no audio and no noun class, both measured (2026-08-22)](decisions/languages.md#kikuyu-ships-with-no-audio-and-no-noun-class-both-measured-2026-08-22)
- [Spanish is European Spanish, and that is a deck not a setting (2026-08-21)](decisions/languages.md#spanish-is-european-spanish-and-that-is-a-deck-not-a-setting-2026-08-21)

### Cards and lookup

Card fields, glosses, part of speech, spellcheck, saving, My Cards, export.

- [A card says where it stands with Review (2026-10-05)](decisions/cards-and-lookup.md#a-card-says-where-it-stands-with-review-2026-10-05)
- [French verbs are tagged with their group, and only their group (2026-09-23)](decisions/cards-and-lookup.md#french-verbs-are-tagged-with-their-group-and-only-their-group-2026-09-23)
- [My Cards opens on "All", reversing #80 (2026-09-23)](decisions/cards-and-lookup.md#my-cards-opens-on-all-reversing-80-2026-09-23)
- [The gloss ceiling is one rule, and the semicolon knows about disambiguation (2026-09-08)](decisions/cards-and-lookup.md#the-gloss-ceiling-is-one-rule-and-the-semicolon-knows-about-disambiguation-2026-09-08)
- [The word of the day gets a gloss ceiling of its own (2026-09-08)](decisions/cards-and-lookup.md#the-word-of-the-day-gets-a-gloss-ceiling-of-its-own-2026-09-08)
- [The save button is one live control, and web moved too (2026-09-08)](decisions/cards-and-lookup.md#the-save-button-is-one-live-control-and-web-moved-too-2026-09-08)
- [Part of speech is stored as a code and rendered in the reader's language (2026-08-11)](decisions/cards-and-lookup.md#part-of-speech-is-stored-as-a-code-and-rendered-in-the-readers-language-2026-08-11)
- [The spellcheck correction rides the lookup, and is written to refuse (2026-08-10)](decisions/cards-and-lookup.md#the-spellcheck-correction-rides-the-lookup-and-is-written-to-refuse-2026-08-10)
- [Export stays as it is — own cards only (2026-08-04)](decisions/cards-and-lookup.md#export-stays-as-it-is--own-cards-only-2026-08-04)

### Review

The review session: typed answers, undo, readings, decks and drill.

- [The brief definition shows after the reveal, never on the prompt (2026-10-04)](decisions/review.md#the-brief-definition-shows-after-the-reveal-never-on-the-prompt-2026-10-04)
- [Readings reach mobile review, and no setting comes with them (2026-09-08)](decisions/review.md#readings-reach-mobile-review-and-no-setting-comes-with-them-2026-09-08)
- [The typed card hides its action row while the keyboard is up (2026-08-29)](decisions/review.md#the-typed-card-hides-its-action-row-while-the-keyboard-is-up-2026-08-29)
- [The card's dismiss target is a Pressable only when a keyboard can be up (2026-08-29)](decisions/review.md#the-cards-dismiss-target-is-a-pressable-only-when-a-keyboard-can-be-up-2026-08-29)
- [Undo a rating: scheduling is reversed, the streak is not (2026-08-25)](decisions/review.md#undo-a-rating-scheduling-is-reversed-the-streak-is-not-2026-08-25)
- [Typed responses: a local grader, and the rating row is the override (2026-08-24)](decisions/review.md#typed-responses-a-local-grader-and-the-rating-row-is-the-override-2026-08-24)
- [Decks, drill and review shape (2026-07-25 → 2026-07-26)](decisions/review.md#decks-drill-and-review-shape-2026-07-25--2026-07-26)

### App shell

Navigation, titles, mode names, onboarding, help, naming.

- [Settings is a list of rows, each pushing its own screen; on web, a menu and a modal (2026-10-04)](decisions/app-shell.md#settings-is-a-list-of-rows-each-pushing-its-own-screen-2026-10-04)
- [Onboarding does it once for real (2026-10-04)](decisions/app-shell.md#onboarding-does-it-once-for-real-2026-10-04)
- [Amgi's titles name the study language; Import removed, Export to Your data (2026-09-25)](decisions/app-shell.md#amgis-titles-name-the-study-language-import-removed-export-to-your-data-2026-09-25)
- [The modes are named in the reader's language, and 2.0.0 (2026-09-23)](decisions/app-shell.md#the-modes-are-named-in-the-readers-language-and-200-2026-09-23)
- [Mobile navigation, and verdicts per language (2026-09-04)](decisions/app-shell.md#mobile-navigation-and-verdicts-per-language-2026-09-04)
- [Skeletons stop at the three that shipped (2026-08-06)](decisions/app-shell.md#skeletons-stop-at-the-three-that-shipped-2026-08-06)
- [Contextual tips: cancelled, pull help is the answer (2026-08-04)](decisions/app-shell.md#contextual-tips-cancelled-pull-help-is-the-answer-2026-08-04)
- [Onboarding is not a checklist (2026-08-02)](decisions/app-shell.md#onboarding-is-not-a-checklist-2026-08-02)
- [Naming and audio (2026-07-23 → 2026-07-25)](decisions/app-shell.md#naming-and-audio-2026-07-23--2026-07-25)

### Data loading

Subscriptions, the launch cache, fallbacks, and why there is no local model.

- [ID tokens are verified without `firebase-admin/auth` (2026-10-05)](decisions/data-loading.md#id-tokens-are-verified-without-firebase-adminauth-2026-10-05)
- [Launch paints from the device, behind a splash that lets go (2026-09-22)](decisions/data-loading.md#launch-paints-from-the-device-behind-a-splash-that-lets-go-2026-09-22)
- [A plausible fallback is worse than no fallback (2026-09-22)](decisions/data-loading.md#a-plausible-fallback-is-worse-than-no-fallback-2026-09-22)
- [Mobile's card surfaces subscribe too — the gate was opened by a test, not a build (2026-08-22)](decisions/data-loading.md#mobiles-card-surfaces-subscribe-too--the-gate-was-opened-by-a-test-not-a-build-2026-08-22)
- [Mobile subscribes for display only, and a ref is what serialises its writes (2026-08-22)](decisions/data-loading.md#mobile-subscribes-for-display-only-and-a-ref-is-what-serialises-its-writes-2026-08-22)
- [Web subscribes; the archived bug was never real (2026-08-22)](decisions/data-loading.md#web-subscribes-the-archived-bug-was-never-real-2026-08-22)
- [No local model yet — and the first step isn't a model (2026-08-08)](decisions/data-loading.md#no-local-model-yet--and-the-first-step-isnt-a-model-2026-08-08)

### Releases

Android distribution and Google Play.

- [Play holds on a +82 phone number, and Munli takes the focus back (2026-09-22)](decisions/releases.md#play-holds-on-a-82-phone-number-and-munli-takes-the-focus-back-2026-09-22)
- [Amgi goes to Play, on the internal testing track (2026-09-22)](decisions/releases.md#amgi-goes-to-play-on-the-internal-testing-track-2026-09-22)
- [Android ships as a sideloaded APK, and auth work leaves Expo Go (2026-08-22)](decisions/releases.md#android-ships-as-a-sideloaded-apk-and-auth-work-leaves-expo-go-2026-08-22)

### Process

How the backlog and these notes are run.

- [Three Munli follow-ups leave High; the backlog is the user's list (2026-09-22)](decisions/process.md#three-munli-follow-ups-leave-high-the-backlog-is-the-users-list-2026-09-22)
- [Seven backlog items close, and one of them closes a reopen path (2026-09-08)](decisions/process.md#seven-backlog-items-close-and-one-of-them-closes-a-reopen-path-2026-09-08)
- [Checking a build is not tracked work (2026-09-04)](decisions/process.md#checking-a-build-is-not-tracked-work-2026-09-04)
