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

- **Editing a card mid-review** (2026-09-25). An edit now reaches the card's
  other direction: both platforms' save handlers match queue entries by
  `card.id` instead of by index, and patch the card list too, as enrichment
  does. On mobile, Save and Cancel moved into the card header in place of the
  `···`, and the editing card uses the typed card's tighter padding, so the
  keyboard can no longer cover them. ⚠️ **Not yet seen on a small iPhone** —
  check it with a long gloss on the back. JS only; web gets the first fix on
  merge.

- **Switching study language on an open deck lands on the Decks list.** The
  deck and its drill used to render `deckNotFound`; now a pack that resolved and
  then stopped resolving (`usePackLost`) sends the deck to the root of the Decks
  tab stack and the drill back through it. A link that never resolved still
  gets `deckNotFound`. JS only; web is live on merge.

- **My Cards opens on "All"** (2026-09-23) — `DEFAULT_DECK_FILTER` flipped
  from `'mine'`; web has it on merge. Reasoning under Decisions in
  [status.md](status.md).

- **My Cards and Progress paint from the device on a cold open** (2026-09-23).
  Mobile's Firestore cache is memory-only, so both used to wait a round trip
  after the app was killed. Cards keeps its own AsyncStorage copy of every card
  (`amgi_library_*`, archived included — Review's copy is active-only) and
  Progress keeps its rollups per range plus the learned count; each paints at
  once and the live read replaces it. Only server-backed reads are stored, and
  an offline `getDocs` (which resolves *empty* on RN) now returns the device's
  copy instead of a blank chart. ⚠️ **Felt "faster (?)" in Expo Go — undecided.**
  Judge it on the build, alongside the launch stopwatch.

- **The one-line definition shows wherever Dig Deeper does** (#162,
  2026-09-23). Mobile lookup now renders `briefDefinition` under the
  translation, as web already did, and card detail on both platforms shows a
  saved card's one-liner. Dig Deeper's prompt assumes the reader has seen that
  line, so on those surfaces it used to open on nuance about a meaning nobody
  stated. No prompt change yet: the user's original ask — Dig Deeper reading
  like a dictionary — gets judged once the line has been lived with. Cards
  saved before 997ec3d have no one-liner. JS only; web is live on merge.

- **Expo SDK 57 patch bumps** (2026-09-23) — `expo` 57.0.20 → 57.0.24 and the
  `expo-*` modules to match, the updates Expo's CLI flagged. Taken because Expo
  Go loaded the app slowly from every checkout until the update, and quickly
  after it. Several are native modules (`expo-audio`, `expo-notifications`,
  `expo-updates`…), so the build is where they land.

- **The 7-day chart share card names its days** (2026-09-24). A weekday sits
  under each bar or point, but only when each mark is one day and there are no
  more than 14 of them, which is the dashboard's rule. The route needs the
  chart's last day to do it, so `shareImageQuery` now sends `e`. Web has it on
  merge. Mobile builds its own share URL, so charts shared from phones get
  weekdays from the build on; older links render without them.

- **French verb cards name their conjugation group** (2026-09-23) — the
  part-of-speech badge reads "-ir verb" / 「-ir 동사」 in place of "Verb", with
  Munli's six groups (`-er`, `-cer`, `-ger`, `-ir`, `-re`, irregular).
  `/api/explain` sets `verbGroup`, so cards saved from either app carry it once
  web deploys. Mobile only *shows* it from the build on; until then it shows
  "Verb". Only on cards looked up after the merge, with no backfill. Only the
  group, and the reasoning is under Decisions in [status.md](status.md).

- **Two pronunciation speeds: words and sentences** (2026-09-23). Settings
  shows two chip rows. Example sentences and Writing's native version play at
  the sentence speed; everything else plays at the word speed. The old single
  setting became the word speed, and it also seeds the sentence speed once, so
  nobody's pace resets. Web has it on merge. JS only.

- **Writing's worked example for Traditional Chinese** (2026-09-24). This is
  all "Munli for Mandarin" means for now. The empty Writing tab shows
  他騎著 bicycle / 자전거 走了。 → 他騎著腳踏車走了。 and the card 腳踏車. The
  sentence is the MOE 國語辭典's own example; citations are in
  `docs/packs/writing-worked-example-draft.md`. Other grammar practice for
  Chinese still needs its own planning. Web has it on merge. JS only.

- **Munli shows only the current language's practice** (2026-09-25). For a
  language with no conjugation spec (every language except French), Topics,
  Practice, Saved and Progress show "Nothing to practise in {language} yet"
  and point to Writing. They no longer list French's verb topics or mention
  French. Every Munli title row ends in a chip naming the study language, except
  Progress, whose header already shows it. Saved's page title is now "Saved"
  (「저장함」), the same as its tab. The rule is under Decisions in
  [status.md](status.md). Web has it on merge. JS only.

⚠️ **In testers' hands is not the same as seen.** Nothing in that build has been
opened on a device, which is most of what Munli is. Untracked here by the
2026-09-04 decision that these checks come from using the app, not a list; the
two with something hanging on them live with their decisions — the **launch
stopwatch** (2026-09-22) and the **Slow speed** artifact question.

## High

⚠️ **Two questions for the user are open**, neither of them a work item:
whether `faire` joins the three sourced irregular verbs (#150), and whether a
practice session should cover several tenses at once again, which the section
picker narrowed (#146). Both are written up in their Decisions entries of
2026-09-22.

- [ ] **Users make their own vocab packs** — scoped with the user 2026-09-25.
      **Vocab only**: Munli grammar waits until the user has written a few more
      grammar topics by hand. The starting point is how the user's own packs
      began: someone with a **goal** (TOEIC), a **struggle** (English idioms)
      or a **situation** (moving to Argentina). Replaces *Goal-based
      generation*, which was parked because it made words nobody asked for.
      Here the user does ask, and an agent **finds the words in sources**
      rather than writing them, so the model is still not the source.
      1. **A few set questions**, not one text box and not a chat. First draft:
         what's the pack for (goal / struggle / situation, plus a sentence);
         where will you use these words; any material to hand (optional
         paste or upload); anything to focus on or leave out (optional).
         **No level question**: skip words the user already has and read their
         level from their cards. The language is the current study language.
         The Korean copy needs the user's approval.
      2. **The agent proposes subtopics**, each with a rough word count. The
         user ticks, unticks or adds their own. **Each subtopic becomes a
         subpack**, so pack size follows the domain. It grows by adding a
         subtopic and shrinks by removing one. This step is cheap, so the slow
         part only runs for what was chosen.
      3. **Sourcing runs in the background** per subtopic: search, pull words
         from sources, and **keep a citation per word**. It takes minutes, so the
         user gets a notice when it's done, not a spinner. Card backs come from
         the existing lookup route (reuse rule). **No word-by-word review
         for now**, per the user: choosing subtopics is enough control, and
         unwanted cards are deleted like any card.
      4. **The user can make it official.** Citations let the user review a
         user pack against `docs/packs/README.md` and adopt it. How packs get
         nominated waits for sharing.
      **Entry point:** a *Make a pack* action on Packs.
      **Test against the packs already built.** Answer the questions as the
      people behind the TOEIC, idioms and Argentina packs would have, and compare
      the agent's pack with the hand-made one before any user sees it.
      ⚠️ **This extends the sourcing exception** that *Users add their own
      French verbs to Munli* (Medium) makes: labelled as user-made, never
      reaching another user. The exception goes into the README when built.
      ⚠️ **Store packs so they can have an owner and a visibility later**, even
      though phase 1 is private. Sharing is where this is headed.
      **Later phases**, raised by the user and not yet scoped:
      - **Profile**, opened from the icon on Progress. It holds why the user is
        studying, which pre-fills step 1 and shapes suggestions.
      - **Sharing a pack** with specific people.
      - **Finding and connecting with similar learners.** Privacy, moderation
        and what "connect" means are all open.
      Open, not blocking: **cost per pack** (several search-backed calls). The
      user is setting it aside while the focus is making the app usable.
      **Copyright** matters once packs are shared: taking words from a source is
      fine, but copying a published list wholesale is not.

- [ ] **English articles and prepositions, in Munli.** Not designed yet — the
      user hasn't settled what a question looks like (2026-09-24), and it needs
      its own session. What's known going in: Munli's only practice type today
      is a conjugation table, and an article is a *choice* rather than a form,
      so this is a new practice type, not a new dataset. The shape that fits
      the rules in `vision.md` (typed production, no multiple choice) and the
      sourcing standard is **fill the gap on sourced sentences** — e.g.
      Tatoeba (CC BY) with the article blanked. ⚠️ The hard part is that one gap
      often has several right answers (*I saw a/the dog*), so each needs an
      accepted set. And the audience is mostly Korean speakers, whose language
      has no articles.

- [ ] **Smoother conjugation practice** — from the user's task list,
      2026-09-25: *"Automatically open keyboard, allow users to overwrite
      typos."* Mobile only (`apps/mobile/app/munli/index.tsx`).
      - **The keyboard should open by itself.** Neither the single box nor the
        table's boxes use `autoFocus` today, so every question starts with a tap.
        In a table, **Done should move to the next box**. Today only the single
        box has `onSubmitEditing`. Keep the single box editable between
        questions (the ⚠️ there): that is what keeps the keyboard up.
      - **Typos.** Amgi's review already handles this: a miss shows both strings
        and keeps the rating row, so the learner can override. Munli has no
        equivalent. ⚠️ **`check` writes the rating immediately** (`rate(updates)`),
        so an override has to replace that rating, or the rating has to wait
        until the learner moves on. Otherwise a typo still counts as a miss on
        the box's schedule.
      ❓ **"Overwrite typos" has two readings**, and the user hasn't said which:
      **(a)** after a miss, a *That was a typo* action counts it as right, like
      Amgi's override; or **(b)** the learner fixes the typed text and checks
      again. (b) is weaker, because the right form is already on screen when
      they retype it.

- [ ] **Users add their own French verbs to Munli** — scoped with the user
      2026-09-24. **Any verb, forms from the model**, the way a term lookup
      works. What an added verb *becomes* follows the split `conjugation.ts`
      already turns on:
      - **A regular verb becomes a vehicle, not an item.** `danser` joins the
        `-er` group's vehicles *for that user only* — nothing new is scheduled,
        it just starts turning up in `-er` questions. Scheduling it would drill
        the `-er` endings again under a new name, which is what the 2026-09-22
        rework removed.
      - **An irregular verb gets its own table**, per verb, exactly as `être`,
        `avoir` and `aller` do — with stored forms for every tense the spec
        knows (présent, imparfait, futur simple).
      - **The group comes from the model and is checked locally.** It is not
        derivable from the ending (`partir`). When the model calls a verb
        regular, conjugate it by the rule and compare against the model's
        forms; a mismatch means it is not the group claimed. Irregular forms
        have no such check.
      ⚠️ **This is a written exception to `docs/packs/README.md`**, which says
      the model is not a source. The exception holds only if a user-added verb
      is **labelled as unverified** wherever its forms are shown, and **never
      reaches another user**. Write the exception into the README when this is
      built, not only here.
      **Two entry points**, per the user: an *Add a verb* field on Topics →
      Irregular verbs, and a *Practise its conjugation* action on a French verb
      card in Amgi (a French verb card already carries its conjugation group,
      #165, so it knows what it would be practised as).
      Still to decide:
      - **Pronominal verbs.** `se lever` needs `me`/`te`/`se` and `subjectFor`
        only knows `je`/`j'`. Refuse them in the first cut, or handle them.
      - **An added verb that is already there** — `être`, or a vehicle already
        in a group. Presumably a no-op that points at the existing table.
      - **Whether this settles `faire`** (#150): a user can now add it
        themselves, but a model-generated `faire` is not the sourced one. The
        curated list and user-added verbs are two different things.

## Medium

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
      **It gained a second reason on 2026-09-21.** The mode switcher (PR #135,
      shipped in 2.0.0) wants a *Switch mode ›* row as its discoverable door,
      and a row menu is where that row goes — a hold on a tab is not something a user finds by
      looking. Neither item blocks the other, but landing them together is one
      menu built once instead of a menu and then a menu edit.

## Bigger bets

_Empty as of 2026-09-25._

## Parked

- [ ] **Reload for term lookups, Dig Deeper and examples.** ⏸ Passed on "at
      least for now" by the user, 2026-09-24. Worth keeping for when it
      returns: none of these routes caches, so a reload is just another call,
      and at the lookup's 0.1 it would come back near-identical. A reload has
      to run hotter than the first call, or be told what not to repeat.
      Reloading on a *saved* card overwrites stored fields, which the
      lookup-before-save case does not.

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
      The review screen is part of that: it reserves the keyboard's height from
      `keyboardWillShow`/`keyboardWillHide`, which Android never fires (it
      has only `keyboardDid*`). So on Android nothing is reserved for the typed
      answer field or the mid-review edit form, and whether the window's own
      resize covers for it under edge-to-edge is untested. Left as it
      was on 2026-09-25 because it can't be checked without a device. Look at it
      on the first Play install.

## Housekeeping — tooling that hides signal

`npm test` (854/854) and `npm run lint` (0 errors, 21 warnings) are green,
measured 2026-09-23. What's left is what those two now *show*.

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
      still has the UI compiled in and calls the route. Three releases now sit
      between them and it as of 2026-09-23, which makes this cheaper to believe
      than it was, but it is still console state rather than a repo fact. The
      file carries a
      `DO NOT DELETE AS DEAD CODE` header; the reasoning is in
      [status.md](status.md). **`typedAnswer.ts` is not part of this** —
      `grammar.ts` imports its folding rules rather than owning them, so the
      deletion takes the importer and leaves the module.

- [ ] **Two callerless functions in `apps/web/src/services/firestore.ts`** —
      `countUserFlashcards` and `fetchArchivedFlashcards`, neither imported
      anywhere. Unlike `grammar.ts` these have **no build to keep alive**: they are
      web-only, so nothing pins them. Left in place while the subscribe change was
      landing to keep that diff to one subject.

- [ ] **The mobile screen gutter is 20, hardcoded in four stylesheets.**
      _Munli's screens stopped being part of this on 2026-09-22 (PR #149): they
      share `SCREEN_GUTTER`, exported from `PageHeader` beside
      `PAGE_TITLE_SIZE`. So the constant exists and this item is now only
      Amgi's four — which still needs the decision below before they can take
      it._ Cards
      sat at 16 until 2026-09-04, so tabbing to it shifted every left edge by
      four pixels; that is fixed, but by editing six numbers rather than by
      sharing one. ⚠️ **A shared constant needs a decision first**, which is why
      it wasn't taken then: `review.tsx` is **not uniformly 20** — `ratingRow`
      is 16 where `reviewScroll` is 20, so the rating buttons sit four pixels
      wider than the card above them. Either that is deliberate (a wider tap
      target on the row you hit most) or it is the same bug Cards had. Settle
      that, then a constant can cover all four screens; skipping review would
      leave the thing a constant exists to prevent.

- [ ] **21 lint warnings**, counted 2026-09-23 — the number has drifted up as
      the app grew, so recount rather than trusting this line. 17 are React
      Compiler (`react-hooks/set-state-in-effect` ×15,
      `react-hooks/immutability` ×2) and they're real: a `useEffect` calling
      `setState` synchronously renders twice on mount. Most want
      `useSyncExternalStore`, so each is a small design call, not a mechanical
      edit. Set to `warn` so landing the lint fix didn't mean landing rushed
      ones — clear them, then delete the override, and **don't silence them
      further**. The other four: two `<img>` that should be `next/image`
      (`Header.tsx:94`, `SideNav.tsx:187`), one unused binding
      (`decks/[packId]/drill/page.tsx:34`), one missing dep
      (`cards/page.tsx:123`).

- [ ] **Lint covers `apps/web` only** — core and mobile have no `lint` script, so
      `turbo lint` runs one package and reports success. Honest today, misleading
      the moment it gates CI. Mobile needs `eslint-config-expo`, core a small flat
      config. Do it with the CI gate, not before.
      _Concrete cost, found by hand 2026-09-04:_ `app/settings.tsx` imports
      `cancelAllReminders` and never calls it. `tsc` doesn't flag an unused
      import and nothing else looks, so mobile accumulates exactly the class of
      dead code web's lint catches on the next commit.

## Needs clarification

- [ ] **Words with several parts of speech.** A card carries one
      `partOfSpeech`, and `normalizePartOfSpeech` keeps only the first of
      "noun/verb". Two shapes are possible, and which one is the item:
      **(a) one card, several badges** — `partOfSpeech` becomes a list; or
      **(b) each part of speech is its own sense** — the lookup already offers
      a meanings picker for ambiguous terms, and a card is already one sense
      (the depth and example prompts are scoped to it), so a noun/verb split
      would become two pickable meanings. (b) fits the model better, since the
      definition and examples differ by part of speech anyway. Needs an example
      word that went wrong.
      _2026-09-23: the user leaned toward (a) but asked for a recommendation.
      Recommended (b): the definition, examples and review prompt all differ by
      part of speech, so a two-badge card still has to explain one of them, and
      the other badge is a claim the rest of the card doesn't back up. Keep (a)
      for the rare case where the meaning really is the same across parts of
      speech. Awaiting the user's call._

- [ ] **Temperature: 0 or keep 0.1?** Lookup, Dig Deeper and writing run at
      0.1; examples at 0.4. _2026-09-24 recommendation: keep 0.1._ The two
      barely differ, and 0 is not strictly deterministic on Gemini either. The
      pitch-accent check in `apps/web/src/data/README.md` was measured at 0.1
      and would need re-running after a change. The temperature question only
      really matters if reload comes back (Parked), where a reload has to run
      hotter than the first call or it returns the same answer. Awaiting the
      user's call.

- [ ] **Personalised explanation preferences** — emphasis knobs (etymology,
      cultural context, example-heavy). Store in `users/{uid}`, include in prompt.

---

## Cutting a build

Reference, not open work — what you need at the moment you cut one. Scope set
2026-09-04 (Decisions in [status.md](status.md)): the pre-flight order, the What
to Test rule, and the `--non-interactive` warning. What a build *carries* is
derivable from its commit; what is queued, released or never verified on a
binary is under Builds in [status.md](status.md).

**Pre-flight**, in order. Steps 2–7 were all exercised cutting 2.0.0; step 5 is
new there, and step 1 remains half done — the Expo Go half only:

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
5. **Check Beta App Review Information fits 4000 characters** — App Store
   Connect's ceiling, and newlines count. 2.0.0 hit it at 4145, the first build
   that did. ⚠️ **What you cut is prose, never a paragraph**: each one answers a
   question review has asked, so dropping one invites that question back as a
   rejection. Look instead for the same claim made twice. The file's own ⚠️ says
   don't shorten this section; both warnings are true and this is how they meet.

   ```
   python3 -c "
   import re,pathlib
   s=pathlib.Path('docs/testflight-beta-info.md').read_text()
   print(len(re.split(r'\*\*Review Notes:\*\*',s)[1].split('\`\`\`')[1].lstrip('\n')))"
   ```

   Anchored on "Review Notes:" rather than on the section. A fenced block in
   that file means "copy pasted into App Store Connect" — both this check and
   the character-set diff below rely on that, so picking blocks by position
   breaks the moment anything else in the file is fenced. Verified 2026-09-23:
   prints 3805.

6. **Diff the listing copy's character set against the version Apple last
   accepted** before pasting — not read it, diff it. That is what catches a
   non-BMP character, and blank error bullets are all App Store Connect will
   tell you. See [lessons.md](lessons.md).
7. Submit (`ascAppId` is in `eas.json`), then paste the copy into Test
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
