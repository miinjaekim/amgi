# Backlog

Open work only, ordered by priority — **except Queued for the next build, which
sits first** because it turns over on every merge and is the list worth seeing
without scrolling. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to Decisions in [status.md](status.md) **with its reasoning**, so a closed call
doesn't get reopened from here. Priority mirrors the user's Google Tasks list;
this is the scoped version of it.

**Mobile ships by build — no OTA.** Iterate in Expo Go (`npx expo start`), cut a
production build when a batch is worth a release; once one native module is in a
build, a second rides along free. **Android auth work is the exception**: it
cannot run in Expo Go, so it needs a development build — and Android release
builds face no review, so a fix there costs ~20 minutes rather than an App
Review cycle. The procedure for cutting one is at the end of this file; what is
queued, released or unverified is under Builds in [status.md](status.md).

---

## Queued for the next build

_Merged, not yet in anyone's hands — mobile ships by build, no OTA._

_Kept at the top of the file, ahead of priority order, from 2026-09-22 on the
user's call — this list changes every time something merges, and it is the one
section worth seeing without scrolling._

- [ ] **Verb conjugation, and Munli's tabs** (PR #143). Web is live on merge;
      **native is not**. The practice loop, the verbs page, Tables and Munli's
      Progress have been exercised in Expo Go, and **the Firestore write path has
      run**. ⚠️ **Two things it does not cover.** The **cross-device claim** has
      never been tried — practise on web, and the phone should update without a
      relaunch. And **the last round post-dates that testing**: the regular /
      irregular split, the two filter dropdowns, the per-section verb dropdown
      and the per-tense save pills are all unseen on a device. Also worth a look:
      five icons on a narrow tab bar, and whether a six-row paradigm reads at
      phone width, since it scrolls horizontally.

- [ ] **Writing review, in Munli** (PR #136). Web is live on merge; **native is
      not**. ⚠️ **No model call has been made through the restored UI on either
      platform** — the route never changed and its parser is under test, but
      nobody has submitted a passage and read what came back.

- [ ] **The mode switcher** (PR #135). Web is live on merge; **native is not**.
      Holding the last tab, the switcher sheet, Munli's home and the cold-open
      landing all exist only in a build nobody has cut. ⚠️ **And nothing here has
      been exercised on a device at all** — `expo export` bundles and `tsc` is
      clean, which says the routes resolve, not that the gesture feels right or
      that the sheet is reachable one-handed.

## High

_Reordered 2026-09-22 on the user's call: the three Munli items that sat here
were removed, because they were written up without being asked for. The Decisions
entry of that date in [status.md](status.md) records what they were and why they
left, so none of them gets reopened from here. Munli's own plan is in the two
entries of 2026-09-21._

_**Play led this section for part of that day and is now in Parked**, blocked on
a Korean phone number it cannot reach from abroad — same-day Decisions entry.
Munli has the focus back._

_**The five Munli items below were asked for by the user on 2026-09-22**, after
using the tabs — unlike the three that left this section the same day. They are
in build order rather than the order they were raised: the grain question gates
the picker and the Saved tab, because both display due counts and what a due
count *counts* is that decision. **Nothing here is started**; the user's call was
to plan first._

- [ ] **Conjugation schedules a table; a table is six facts.** **Raised
      2026-09-22 by the user**, from using it: *"having one tense of one verb
      group due means I'd practice just one verb conjugation … I might be
      struggling with `ils` but I randomly got `tu` or `je` and the practice
      ends."*
      **What happens today.** The scheduled unit is a table, `(subject, tense)`
      (`ConjugationProgress`, `packages/core/src/conjugation.ts:145`), and
      `buildConjugationQueue` is `pool.map(table => one question)` — literally
      one question per due table, with `pickPerson` drawing the box. Its own
      comment gives the reasoning: *"The table is the scheduled item, so asking
      it twice in one sitting would be two questions about one fact."*
      ⚠️ **That sentence is the defect.** A table is six facts, not one, and the
      code already knows it: `misses` exists as a per-person tally precisely
      because *"one schedule cannot know that your `nous` specifically is
      weak"*. The model half-admits the grain is wrong and patches it with a
      draw bias instead of fixing it.
      **The complaint is sharper than it was put.** `rateTable` applies one
      box's verdict to the whole table's SM-2 interval, so **answering `tu`
      correctly schedules `ils` away too** — five boxes pushed out on evidence
      from one. `pickPerson` only helps *after* a miss is recorded, and gets
      exactly one draw per session.

      **Four ways out, cheapest first.**
      **(a) Ask every box of a due table.** Six questions per due table, one
      rating for the table, worst answer winning. No migration, no new item ids.
      Cost: a table you are five-sixths solid on still costs six questions, and
      the schedule still speaks for the boxes as a block.
      **(b) Ask *n* boxes weighted by `misses`, and hold the interval back
      unless the weak ones cleared.** The cheapest fix to the stated symptom.
      ⚠️ Hacky: the interval still speaks for boxes that were never asked.
      **(c) Schedule per box** — the item becomes `(subject, tense, person)`.
      ⚠️ **There is direct precedent in Amgi**: a card is scheduled per
      *direction*, and `helpReviewPoints` says so to the user — *"Each card is
      asked both ways — recognising a word and saying it are tracked
      separately."* Splitting a table into six boxes is that same move. Cost: a
      migration of `ConjugationProgressMap` on the user document, item ids
      change, `misses` becomes redundant, and **due counts multiply by six** —
      "12 due" becomes "72 due", which changes both what a session feels like
      and what the two items below display.
      **(d) Schedule per box, present per table** — a due table opens as its
      paradigm with the due cells to fill, each cell rating independently.

      **Recommendation: (d), which is (c) underneath.** It answers the complaint
      directly — a weak `ils` is asked because it is due, not because a die
      landed on it — and it matches how conjugation is actually practised, as a
      paradigm rather than a flashcard. Presenting per table also keeps the
      count legible: *"-er · présent — 3 boxes due"* rather than 72 loose items.
      ⚠️ **Weigh it against the standing rule first.** *"Three-sided hanja cards
      cost a setting, not a scheduling axis"* and *"Per-level content is allowed;
      per-level adaptivity is not"* (both in Decisions) are the app resisting
      exactly this kind of multiplication; the direction precedent above is the
      counter-argument. **This is the call to make before anything below is
      built.**

- [ ] **The practice picker should be sections with due counts, not chips.**
      **Asked for 2026-09-22**: after opening Conjugation, the setup screen is
      two rows of chips — tenses, then verb groups — and the user wants Review's
      shape instead, *"splits according to different sections, and we see how
      much is due for each section"*.
      **Most of this is already in core.** `summarizeConjugation` returns
      `byTense: { tenseId, label, practised, total, due }`
      (`packages/core/src/conjugation.ts:676`), which is a section list already;
      Review's row is `renderCollectionRow` at
      `apps/web/src/app/review/page.tsx:676` — name, due count in highlight,
      "caught up" in muted, a sub-line with the total.
      ⚠️ **Review has one axis and conjugation has two.** Enrolment is
      `subjectKey:tenseId` pairs, so a section is a tense *or* a subject, not
      both. **Tense as the section, subject as the second level**, mirroring
      pack → subpack with a whole-tense row first: you sit down to practise the
      imparfait, and Progress already groups by tense.
      `practiceIncludeNotDue` survives as over-practice on the second screen.
      ⚠️ **Blocked on the grain call above** — not for the layout, which is the
      same either way, but for what the counts say.
      Both platforms: `apps/web/src/app/munli/practice/page.tsx` and
      `apps/mobile/app/munli/index.tsx` (the chips are at lines 188–230).

- [ ] **Tables becomes Saved, and starts managing something.** **Asked for and
      shaped 2026-09-22, on the user's call.** Today it is a flat list of
      `-er · présent` rows sorted due-first, each expanding to a paradigm, and
      **it manages nothing** — saving and unsaving live on Topics as per-tense
      pills. The user wants *"a management surface to see what patterns or
      concepts I have saved to practice"*.
      **The precedent is Amgi's own split**: Packs is the catalogue, Cards is
      where you curate what it added, and Cards genuinely edits and deletes.
      `tables/page.tsx` already calls itself *"Munli's answer to Amgi's Cards"*
      and never took the management half.
      **Decided shape.** **One row per subject** — a pattern (`-er`) or an
      irregular verb (`être`) — carrying its saved tenses as **pills that show
      due state**; tapping a pill unsaves that pair through `setEnrolled`, the
      same control and the same semantics Topics already uses; the row expands
      to the paradigm. This grains the set by *pattern* while Practice grains by
      *tense*, so the two surfaces answer different questions.
      **Decided name: Saved** — it mirrors the Save action that put things
      there. Renaming reaches `munliTabTables` / `tablesTitle` and friends in
      `packages/core/src/i18n.ts`, the route `/munli/tables` → `/munli/saved`,
      `getMunliNavItems` in `apps/web/src/components/nav-items.tsx`, and
      `ICONS` / `LABELS` in `apps/mobile/app/munli/_layout.tsx`.
      ⚠️ **Blocked on the grain call above** for what a pill's due dot means.

- [ ] **Writing needs to say how to use it.** **Asked for 2026-09-22**: the tab
      drops you straight into a panel with no guidance, and the specific thing
      worth telling someone is that **they can write the L2 as broken as they
      like and fill what they don't know with their L1**.
      **The pattern already exists and Munli is not using it.**
      `apps/mobile/src/components/PageHeader.tsx` carries a **"?" button**
      opening a sheet with a lead sentence and bullets, and its own comment makes
      the argument for it: *"Pull, not push — the answer is there when you wonder
      and invisible when you don't … Explaining rather than demonstrating is fine
      here, and only here: the user asked."* Amgi ships `helpLearnLead/Points`
      and `helpReviewLead/Points` in that shape
      (`packages/core/src/i18n.ts:485`); this is `helpWritingLead` +
      `helpWritingPoints`, en + ko.
      ⚠️ **Web has no help sheet at all** — nothing in `apps/web/src` matches
      it. Either build the component there or put the copy inline; the component
      is the better buy, because Munli's other tabs want it too.

- [ ] **Munli's page titles do not match each other or Amgi's.** **Asked for
      2026-09-22**, from noticing Writing's title is smaller.
      **Mobile.** Amgi has the answer and Munli ignores it: `PageHeader` exports
      `PAGE_TITLE_SIZE = 21` with `color: C.highlight`, and its comment records
      that these drifted before — *"it sat at 24 against this file's 21 until
      2026-09-04. A shared constant is the only thing that keeps two headers the
      same size without either one knowing about the other."* `cards.tsx` cannot
      use the component and imports the constant instead. **Munli's five tabs
      use neither**: each rolls its own at `fontSize: 22, color: C.text`, and
      `apps/mobile/app/munli/writing.tsx:36` is `fontSize: 18` plus a
      `fontFamily: 'monospace'` nothing else in the mode sets. That last one is
      what was noticed.
      **Web is not a size problem.** Every Munli `h1` is already `text-2xl`; the
      difference from Amgi is **colour** — Amgi's are
      `text-[var(--color-highlight)]`, Munli's are `--color-text`. Munli has its
      own palette, so highlight stays mode-distinct.
      **Adopting `PageHeader` on mobile closes this item and the one above it in
      one move**, which is the reason they are adjacent.

- [ ] **Irregular French verbs.** Conjugation ships with regular groups only, and
      a French conjugation tool without `être`, `avoir` and `aller` is missing the
      verbs a learner reaches for first. **The model already holds them**:
      `ConjugationIrregularVerb` stores forms per tense, `FRENCH_IRREGULARS` is
      `[]`, and the Verbs tab already has a section that says so. **This item is
      now a data file and a licence check, nothing else.** ⚠️ **This is the
      sourcing job, and it is the whole reason they were left out**: an irregular
      form is recalled content, not a rule, and `docs/packs/README.md` governs —
      the model is not a source. So this is a citable reference, a licence check,
      and a dataset; it is not a prompt.
      **The engine is already shaped for it**: `ConjugationVerb.group` dispatches
      rules and deliberately has no `irregular` member, because an irregular verb
      is stored forms rather than a rule class. Adding them means a table of
      forms beside the generator, not a fourth branch inside it.
      **The verb list wants the same treatment.** What shipped is described as
      *common*, not frequency-ranked, because ranking it is a sourcing claim with
      nothing behind it. Same job.

## Medium

_One of the three Progress items scoped 2026-09-15 is left. The other two —
the per-language detail view and both charts — are built on
`feat/progress-language-detail`, which is what unblocks this one. The three
calls the user made on them, and the boundary finding that came out of building
them, are in the Decisions entry of that date in [status.md](status.md).
Moved High → Medium 2026-09-21, on the user's call, when Munli took High._

- [ ] **Mobile launch should feel instant, behind a branded splash.** **Asked
      for 2026-09-22**: every open *"takes longer than I feel it should"*; the
      user wants it to feel professional, with the logo up while it loads the
      way Instagram does. **Talked through, not started.**
      **The device already holds what launch needs; launch waits for the
      server anyway.** `onAuthStateChanged` in
      `apps/mobile/src/context/UserContext.tsx` awaits
      `getUserPreferencesFromServer` *before* reading the cached interface
      language, study language, language list and streak. Until it answers,
      `studyLanguage` is the `'Korean'` default, `interfaceLanguage` is
      `undefined` (labels paint in English) and Learn and Settings sit on
      skeletons. ⚠️ **That read has no timeout** — it is a bare
      `getDocFromServer` — so a weak signal holds launch for as long as
      Firestore keeps retrying, where everything else gives up at
      `REQUEST_TIMEOUT_MS`.
      **There is no splash screen.** `app.json` configures none, so iOS shows a
      blank screen while JS boots. `ModeGate`'s comment in `app/_layout.tsx`
      assumes one is up, and nothing holds it.
      **Review paints before auth restores.** It is the landing tab and is not
      gated on `authLoading`, so a cold open flashes "Sign in to review" — in
      English, since the interface language is not known yet.
      **Proposed, in order:**
      (1) **Cache first, server second** — hydrate from AsyncStorage, clear
      `authLoading`, reconcile with the server in the background. Every
      existing rule (only the server may say "unset", adoption, migration,
      streak merge) survives; only the order changes. A device with no cache
      still waits, so first run is unchanged. Put a timeout on the read.
      (2) **Splash via the `expo-splash-screen` plugin** — logo on `#173F35`,
      with a dark variant; `preventAutoHideAsync` and hide once mode, auth and
      cached prefs are known, **capped around 1.5s** so a slow network never
      strands you on the logo. Optionally an animated hand-off with Reanimated
      (already a dependency).
      (3) Gate Review on `authLoading`; set `expo-updates` to stop checking on
      launch, since nothing ships OTA.
      **Not worth it**: moving to `@react-native-firebase` for a persistent
      Firestore cache — a large migration for what (1) mostly gets.
      **Ships by build.** (1) and (3) can be iterated in Expo Go; the splash
      needs a native build to judge.
      **Open questions for the user:**
      — Felt in Expo Go or the TestFlight build? Expo Go is slow to start by
      nature, so measure in a real build, before and after.
      — Static logo, or logo plus an animated hand-off?
      — Priority: placed at the top of Medium while Munli holds High.

- [ ] **Share a chart as an asset.** The chart it depends on now exists:
      `buildCardsAddedSeries` and `buildLearnedSeries` are in core, per-language,
      and both platforms draw them. The
      shipped share pipeline answers most of this, and its two hard constraints
      decide the rest.
      **Two things changed under this item on 2026-09-15.** Cards added is no
      longer stacked but **filtered** by source, so a shared chart has to decide
      whether the filter travels — it is one more query parameter, and the
      backward-compatibility rule below covers it. And the charts now **follow
      the range, bucketed by week past 30 days** (`chartBucketDays`), so the
      asset's series is not necessarily one value per day: the route must be
      told the grain or be handed the buckets, not infer either.
      ⚠️ **It must be server-rendered by `/api/stats-image`.** Mobile cannot
      rasterize a view without `react-native-view-shot` — a native module that
      costs an EAS build *and* stops the feature working in Expo Go. That is why
      one route draws every variant and both platforms only ever fetch a URL.
      ⚠️ **The series travels in the query string**, because the route takes no
      uid and never touches Firestore — the privacy design, not an optimisation: a
      route that resolved a uid would let anyone render anyone's stats. `h` is the
      precedent (one character per day, 364 for a year) but it sends *levels* 0–4
      precisely so the route need not know the window's busiest day. A labelled
      axis needs real counts, so this wants its own parameter and the route
      calling `niceCeiling` itself — it is in core, so the asset gets the same
      scale the app drew.
      **A new variant is backward compatible by construction.** `ShareVariant` is
      `'window' | 'today'` and the parser reads anything unrecognised as
      `'window'`, so every URL an installed build produces keeps rendering what it
      always did. The rule that no parameter may ever become a parse failure
      applies to the new one too. `buildShareCards` then offers the card and
      `hasShareableHistory` gates it, per card.
      ⚠️ **Satori is flexbox-only, and the line mark may not survive it.** Bars are
      divs with heights; the line is SVG on both platforms, which `next/og` does
      not draw the way either of them does. **Check this before promising both
      marks** — bars-only on the shared asset is a fine answer, silently dropping
      the line is not.
      ⚠️ **A per-language chart re-opens a rule `shareStats.ts` closed.** It sends
      language *names only*, never a per-language split of the numbers, because
      `byLanguage.reviews` reaches back to the start while `cardsMatured` only
      reaches 2026-09-06 — so a per-language figure breaks the one-window rule
      over any window worth posting. A **cards-added** chart is exempt (full
      per-language history since 2026-08-20); a **learned** chart is not, and must
      be withheld over a window reaching past that date exactly as `cardsMatured`
      already is.

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
      _(`/api/writing` was listed here too and should not have been — checked
      2026-09-21 while restoring writing: it has had one since it was written,
      returning 502 on both an unparseable response and a thrown call.)_

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
      **It gained a second reason on 2026-09-21.** The mode switcher (shipped in
      PR #135, under Queued for the next build) wants a *Switch mode ›* row as its discoverable door, and a row menu is
      where that row goes — a hold on a tab is not something a user finds by
      looking. Neither item blocks the other, but landing them together is one
      menu built once instead of a menu and then a menu edit.

## Bigger bets

_Empty as of 2026-09-08 — the gloss ceiling was the only item here, and it
closed (Decisions in [status.md](status.md))._

## Parked

- [ ] **Amgi on Google Play — internal testing track.** ⏸ **On hold from
      2026-09-22, the same day it was scoped and taken up**, on the user's call.
      Step 1 is blocked: identity verification delivers its code to a **+82**
      number and the user is abroad without one. **Unblocks on** help from
      someone in Korea with the line, or the flight back. The two Play entries of
      that date in [status.md](status.md) hold the reasoning — including why a
      family member's number is not a way around it.
      ⚠️ **The hold is the account, not the item.** Steps 2–5 need no Play
      account: `eas.json`, the listing copy, the feature graphic, the data safety
      answers and the privacy-page anchor can all be done from anywhere. Only the
      service account, the upload and the SHA-1 registration wait.
      **Decided 2026-09-22** (Decisions in [status.md](status.md) holds the four
      calls and their reasoning): a **personal** developer account on the Google
      account that already owns Firebase and the Android OAuth client, the
      sideloaded APK channel **retired** once Play is live, and listing copy in
      **en + ko**, as TestFlight's already is. Production is not in scope; this
      buys the one thing the APK lacks — an update path.
      ⚠️ **The acceptance gate is Google sign-in on a Play-delivered install**,
      not a green build. Play App Signing re-signs the AAB with Google's key, so
      the fingerprint an end user's install carries is **not** the EAS upload
      keystore's, and the OAuth client is keyed to package name + SHA-1. Until
      the App signing SHA-1 is registered, sign-in fails on Play installs **and
      passes everywhere else** — the shape that cost four release builds in
      August ([lessons.md](lessons.md)).

      **1 · Account** ⛔ **blocked — this is the hold.**
      Register at `play.google.com/console` on the Firebase-owning account, $25
      one-off, then identity verification — government ID plus a real address.
      ⚠️ **Two things here are already settled and must not be redone.** The
      payments profile is **Korea, and a payments profile's country is
      permanent** — it cannot be edited, only replaced by a new profile. And the
      **주민등록등본 is in hand**; 정부24 issues it as a **password-protected
      PDF**, which verification cannot open, so strip the password before
      uploading, and make the **도로명주소 match the payments profile character
      for character** — a 지번/도로명 mismatch is the usual rejection, not a bad
      document.
      ⛔ **What blocks:** the code goes to a **+82** number and the country cannot
      be changed on that field. Korean 휴대폰 본인확인 matches the number against
      the name and 생년월일 registered to it, so a borrowed line fails against
      the user's own documents. Untried: **착신전환** to a foreign number plus the
      **voice-call** option, which needs nobody else.
      **Once unblocked**, create the app entry: *Amgi*, app, free, default
      language en-US. The package is claimed by the first upload, not typed in —
      `com.miinjaekim.amgi`, permanent, already keyed into the OAuth client.

      **2 · Repo work** (an afternoon, parallel with the wait).
      `apps/mobile/eas.json` only: an `android` block on the `production` profile
      (AAB is its default; `distribution: internal` on `preview` is what makes
      today's APK), and `submit.production.android` beside the existing
      `ios.ascAppId`. The submit key is a **Google Play service account** — made
      in Google Cloud, granted a release role in Play Console under Users and
      permissions, JSON downloaded and kept **out of the repo** (EAS secret or a
      gitignored path). `appVersionSource: remote` already covers Android; the
      counter is at `versionCode` 6 and Play only requires it to increase.
      ⚠️ **Plan on the first upload being manual.** The Publishing API has not
      historically been able to create an app's *first* release, so
      `--auto-submit` is a step-3-onwards convenience, not a step-2 one. Verify
      rather than fight it.

      **3 · Build, sign, and prove auth.** Build
      (`npx eas-cli build --platform android --profile production`), upload the
      AAB to the **internal testing** track, which enrols it in Play App Signing
      automatically. Then, before inviting anybody: copy the **app signing**
      certificate SHA-1 from Play Console → Test and release → App integrity, and
      add it to the Firebase Android app **and** the Android OAuth client in
      Google Cloud, **keeping the upload key's SHA-1 registered as well**.
      Install from the internal link on a real device and sign in. That test is
      the gate; nothing below matters if it fails.

      **4 · The console forms**, which gate any release going live even on the
      internal track. App content: privacy policy URL (exists, both locales), app
      access (there is no email/password path — the note has to say a Google
      account is required), ads (none), content rating questionnaire, target
      audience (13+, and the privacy page already says not directed at under-13s),
      data safety, plus the nil declarations for financial/health/government
      features.
      **Data safety is the one with real content**: Google account identifiers,
      user content (cards, and writing passages), app activity; text processed by
      **Gemini** through the API routes; TTS audio in Storage; in transit
      encryption; deletion available in-app. ⚠️ **It must match `/privacy`
      exactly**, including the deliberate exception — cached pronunciation audio
      is keyed by a hash of the word, not by user, and survives account deletion.
      Play also wants a **public deletion-request URL**: the privacy page's
      "Data retention and deletion" section is the content, but the section
      needs an `id` to link to.

      **5 · Listing copy and assets**, en + ko, into a new
      `docs/play-store-listing.md` beside `docs/testflight-beta-info.md` — the
      Beta App Description there is most of the full description already, and the
      same one-line-per-paragraph rule applies. Needs: app name, short description
      (80 chars), full description (4000), 512px icon (downscale
      `assets/icon.png`, which is 1024), **a 1024×500 feature graphic, which does
      not exist in any form**, and at least two phone screenshots.
      ⚠️ **Check the generative-AI policy while writing these.** Play has
      required an in-app way to report offensive AI output; Amgi generates card
      content through Gemini. If it applies it is a small feature, not a form.

      **6 · Testers and cutover.** Internal track takes up to 100 tester emails,
      each a Google account. ⚠️ **Testers must uninstall the sideloaded APK
      first** — different signing key, so it cannot install over the top — and
      that loses the AsyncStorage layer: streak, offline snapshot, rating queue.
      **Cards are in Firestore and survive.** Say so in the invitation rather
      than letting someone find out.
      Then the notes follow the cutover: the APK channel comes out of
      [tech-stack.md](tech-stack.md), Android gets build rows under Builds in
      [status.md](status.md) the way iOS has, and **the line at the foot of this
      file stops being true** — a Play release is reviewed, so Android is no
      longer the exception that ships the same day.

      **Worth doing before anyone but you is invited**, though it blocks nothing:
      reminders have no `setNotificationChannel` call and no runtime
      `POST_NOTIFICATIONS` request, so on Android 13+ they land in the default
      "Miscellaneous" channel if they arrive at all — and **nothing but sign-in
      has ever been exercised on Android** (the never-verified ⚠️ under Builds in
      [status.md](status.md)).

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

- [ ] **Delete `packages/core/src/grammar.ts` and its API route.** ⚠️ **Split
      2026-09-14 — `writing.ts` is no longer part of this**, and as of 2026-09-21
      it is not even the same *kind* of case: writing shipped in PR #136, so
      `writing.ts` has real callers on both platforms again
      (`WritingReviewPanel`). It is ordinary live code now, which means **its
      `DO NOT DELETE AS DEAD CODE` header is already false** and should go —
      it argues from "no callers in this tree", which stopped being true on
      merge. **Keep `writing.ts` and its route.** `grammar.ts` is the opposite case: `getPatternExercise` and
      `gradeFromReview` are the generation and model-grading the new design
      explicitly rejects, so nothing will want them back.
      **The gate is open**: it was "once no build predating the 2026-08-18 grammar
      removal is still in use". What is left is not a condition but a fact to
      check — that testers have actually updated, since an un-updated 1.3.0 device
      still has the UI compiled in and calls the route. Two releases now sit
      between them and it, which makes this cheaper to believe than it was, but it
      is still console state rather than a repo fact. The file carries a
      `DO NOT DELETE AS DEAD CODE` header; the reasoning is in
      [status.md](status.md). **`typedAnswer.ts` is not part of this** —
      `grammar.ts` imports its folding rules rather than owning them, so the
      deletion takes the importer and leaves the module.

- [ ] **Two callerless functions in `apps/web/src/services/firestore.ts`** —
      `countUserFlashcards` and `fetchArchivedFlashcards`, neither imported
      anywhere. Unlike `grammar.ts` these have **no build to keep alive**: they are
      web-only, so nothing pins them. Left in place while the subscribe change was
      landing to keep that diff to one subject.

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

---

## Cutting a build

Reference, not open work — what you need at the moment you cut one. Scope set
2026-09-04 (Decisions in [status.md](status.md)): the pre-flight order, the What
to Test rule, and the `--non-interactive` warning. What a build *carries* is
derivable from its commit; what is queued, released or never verified on a
binary is under Builds in [status.md](status.md).

**Pre-flight**, in order. Steps 2–6 were all exercised cutting 1.6.0 and again
cutting 1.7.0; step 1 was half done for the first time on 1.7.0:

1. Smoke-test in Expo Go, then verify the native-adjacent paths on the build
   itself — Expo Go runs the SDK's own bundled native modules, so a clean pass
   there says nothing about audio, notifications, sharing, the file system or
   the auth redirect. **The Expo Go half happened for the first time on 1.7.0**
   (2026-09-19, by the user, before the builds were started). ⚠️ **The half that
   matters more has still never happened on any build**: nothing in that list has
   been exercised on a binary. The list of what it covers, and why working down
   it is not tracked as a task, is in the never-verified ⚠️ under Builds in
   [status.md](status.md).
2. Bump `version` in `app.json` **before** starting the build. EAS
   auto-increments the *build* number and never the version, so nothing catches
   this for you.
3. `expo config --type introspect` if any native module or `app.json` native
   config changed — this is where an unasked-for entitlement shows up before a
   cloud build finds it. 1.6.0's came back `entitlements: {}`, which is what
   `withoutPushEntitlement` is there to produce, and 1.7.0's — the
   `react-native-svg` build — came back the same (Builds in
   [status.md](status.md)).
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

_A version bump queues another Beta App Review; an external approval covers the
version it was granted for and nothing later. Batch changes into a build rather than cutting one per feature.
Android is the exception — no review, so a fix there ships the same day._
