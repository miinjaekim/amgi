# Backlog

Open work only, ordered by priority — **except Queued for the next build, which
sits first** because it turns over on every merge and is the list worth seeing
without scrolling. Anything that closes leaves this file:
shipped work is tracked by git and GitHub, and a decision or cancellation moves
to [decisions/](decisions/) **with its reasoning** (indexed under Decisions in
[status.md](status.md)), so a closed call doesn't get reopened from here. Priority mirrors the user's Google Tasks lists
— one for Amgi and one for Munli — and this is the scoped version of both, in
one file: an item from the Munli list is tagged **Munli**.

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

_Build 19 (2.2.0) was approved for external testing, reported 2026-10-06; what
is below merged after it._

- **Review asks for the meaning by typing too** (branch `type-meanings`).
  With "Type your answers" on, word→meaning cards get the input box as well,
  web and mobile; they used to flip. Three outcomes for a typed meaning: the
  back exactly as shown is `easy`, applied, next card; a near match (either
  gloss of two, a leading to/a/an/the dropped, or the card's other-language
  back) reveals with "Correct", what was typed, and the ring on `good` for
  the learner to confirm; anything else is "Not quite" with the ring on
  `again`. Typing the word is unchanged, Hanja is still untyped, and it is
  still one toggle. No new strings: the placeholder names the back's language
  in this direction.
  Two things were chosen in the build rather than asked, and are the user's
  to overrule: both glosses typed in the other order or around the other
  mark count as near rather than a miss, and a near match reads "Correct".
  ⚠️ Not seen in a browser or on a device; under Unverified in
  [status.md](status.md).
- **The review card flips in place** (branch `review-card-flip`). Tap-to-reveal
  review, web and mobile: tap the card and the back replaces the front in the
  same box; tap again for the front. The card keeps its size, the rating row's
  space is held from the start and the ratings stay once shown, a long back
  scrolls inside the card, and pronounce, ⋯ and the details buttons do not
  flip it. A turn about the vertical axis with the faces swapped at the
  midpoint; a fade with reduced motion. Typed-answer review is unchanged.
  **Hiding the front while the back shows is a trial** (the user, 2026-10-06:
  "let's try out hiding the front"); putting the prompt back above the answer
  is one line on each platform, marked in the code.
  **After the user tried it on a phone (2026-10-06):** the turn was too slow
  to sit through once per card, so it is about 190ms in all (it was 130ms and
  then a spring that took about half a second to settle), and the ratings
  appear on the tap rather than at the swap; the card turns one way towards
  the answer and the other way back; and "Show answer" is back, in the held
  rating row, so the thumb that reveals is already where the ratings will be.
  Tapping the card still flips it.
  Two things were chosen in the build rather than asked, and are the user's
  to overrule: web's card is a fixed 20rem tall, and on mobile the reading
  badge is on the back in both directions.
  ⚠️ What has and has not been seen is under Unverified in
  [status.md](status.md).
- **Munli: Writing reworked on mobile** (#193; started as the sticky scroll
  of a long passage and was shaped on the user's phone in Expo Go,
  2026-10-06). The passage field is one fixed size, the room above the
  keyboard, and scrolls inside itself; nothing scrolls around it. A drag
  scrolls without opening the keyboard and a tap opens it (iOS); a tick in the
  header closes it, and scrolling never does. Review is full width under the
  field, with the counter in the field's corner. A review takes the whole
  page: the heading sits above the box, the row inside is Copy, Edit and
  Final/Changes, the rewrite's audio button is gone (the findings keep
  theirs), and "What that says" opens on a tap. Edit returns to the passage;
  done with nothing changed returns to the feedback. Web is unchanged.
- **Munli: save a piece of writing, and read old ones** (web and mobile). A Save button under a review keeps the
  submitted passage and the whole review at `users/{uid}/writings`; Saved gets
  a Writing shelf that opens a dated list, and an entry opens the review as it
  looked, read-only, with a delete. Settings → Your data exports them as a
  text file. No statistics. The security rule was added in the console by the user,
  2026-10-07, who then used it on a phone in Expo Go. ⚠️ **Web has not been
  run signed in, and the export has not been run on either platform.** Web is
  live on deploy; mobile needs the build.
- **The audio button is an icon, not an emoji** (branch `mobile-audio-icon`).
  Mobile only: `PronounceButton` draws Ionicons' `volume-medium-outline`, the
  two-wave outline speaker web already has, at 17 and 20 in place of the 14 and
  17 emoji. Colour, error red, spinner, label and hit area are unchanged.
  Checked by the user, 2026-10-07, and found good.

What has never been looked at on a device is listed under Unverified in
[status.md](status.md). It is not tracked here, by the 2026-09-04 decision that
those checks come from using the app.

- **A worked example on Munli's Writing tab for every study language but
  Hanja** (branch `munli-writing-examples-all-languages`). Nine added to the
  two there were: Korean, Swedish, English, Japanese, Cantonese, Arabic,
  Spanish, Kikuyu, Swahili. Sources per sentence are in
  `docs/packs/writing-worked-example-draft.md`. **Not seen on a device:** the
  Arabic line, whose direction mobile leaves to React Native's default.
- **Forms on Swedish and French lookups** (branch `forms-note`, #199; from
  Google Tasks, scoped with the user 2026-10-07 and changed 2026-10-08).
  **Swedish shows a small table** under the definition, on the Learn result
  and card details, web and mobile: a noun's four forms (en bok, boken,
  böcker, böckerna), or one row for an adjective whose forms are not word
  plus -t and -a (gammal, gammalt, gamla). **French shows one sentence**,
  only on an irregular word ("Irregular plural: chevaux."), in those two
  places and on the revealed back in review. Both come from the existing
  `/api/explain` call and are saved on the card; new lookups only, no
  backfill. Four things were built on the planning session's recommendation
  and are the user's to overrule; they and the reasoning are in
  [cards-and-lookup](decisions/cards-and-lookup.md). ⚠️ What has and has not
  been seen is under Unverified in [status.md](status.md).

## High

⚠️ **Two questions for the user are open**, neither of them a work item:
whether `faire` joins the three sourced irregular verbs (#150), and whether a
practice session should cover several tenses at once again, which the section
picker narrowed (#146). Both are written up in their Decisions entries of
2026-09-22.

## Medium

- [ ] **User-made vocab packs: refine for testing** — moved to Medium
      2026-10-04. What's left after phase 1: phase 1 (the
      questions, subtopic picker, background sourcing with a citation per word,
      on web and mobile) merged in PR #175 on 2026-10-04 and is queued for the
      next build. The design and the sourcing exception are in
      `docs/packs/README.md`; the eval is `docs/packs/user-pack-eval.md`
      (`npm run eval:user-packs`).
      **Waiting on the user:** whether mild insults (*ortiva*, *chanta*,
      *mina*) get the vulgar badge too; today only strong ones do.
      **Left for later, by the user's call 2026-10-02:** a frequency-list
      level floor (the prompt-stated level is still too low for TOEIC 900)
      and a second-meanings part for TOEIC.
      **Known, not fixed:** the model sometimes skips search (that part shows
      as failed, with a retry), and the finished notice is in-app only, with
      no push or email.
      **Later phases**, raised by the user and not yet scoped:
      - **Profile**, opened from the icon on Progress. It holds why the user is
        studying, which pre-fills step 1 and shapes suggestions.
      - **Sharing a pack** with specific people. Packs are already stored with
        an owner and a visibility for this.
      - **Finding and connecting with similar learners.** Privacy, moderation
        and what "connect" means are all open.
      Open, not blocking: **cost per pack** (several search-backed calls).
      **Copyright** matters once packs are shared: taking words from a source is
      fine, but copying a published list wholesale is not.

- [ ] **Munli: cards from writing look different from cards from lookup.**
      Added from Google Tasks 2026-10-05.

- [ ] **Munli: more French verb tenses.** Added from Google Tasks 2026-10-06
      ("Different verb tenses"). The user's reading: add tenses beyond the
      three there now (présent, imparfait, futur simple). Which tenses is not
      decided.

- [ ] **Munli: make writing review faster.** Added from Google Tasks
      2026-10-07. Where the time goes has not been measured.

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

_Empty as of 2026-09-25._

## Parked

- [ ] **English articles, in Munli.** ⏸ Set aside by the user 2026-10-02, to
      come back to later; the work so far is kept. **No app code exists** —
      everything is two documents on main, so there is no branch to resume:
      - `docs/packs/english-articles-draft.md` — 8 rules from two grammars, 54
        Tatoeba sentences (66 boxes), and six calls at the top still waiting
        on the user (pre-filled non-tested slots, typing "no article", `a` for
        `an`, two-rule sentences, the two single-source rules, the Korean rule
        names).
      - `docs/packs/english-articles-generation-research.md` — the 2026-10-02
        measurement of a model checker for generated sentences. The model never
        contradicted a sourced article (0 of 66) but **cannot judge whether a
        context forces one answer**: the verdict follows the checker's wording,
        not the sentence.
      The design as it stood: a new practice type, not a conjugation dataset —
      sourced sentences with **a box on every article slot** (typed
      `a`/`an`/`the`/`-`), and **the usage rule is what gets scheduled**
      (sentences are vehicles, like verbs in conjugation). English only, so its
      topic shows only for English (2026-09-25 rule). Prepositions were to be
      the next tool, separately.
      **Three questions the measurement raised, undecided when parked:**
      whether sentences may be generated at all (the checker alone can't
      license it); whether "only forcing contexts" survives, given that
      strictly only place names force one answer, or becomes a stored accepted
      set per box; and the two Earth sentences in the draft, which also take
      no article. Start from these when it returns.

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

`npm test` (912/912) and `npm run lint` (0 errors, 22 warnings) are green,
measured 2026-10-04. What's left is what those two now *show*.

- [ ] **The Google consent screen says "Amgi AI".** Rename it to **Amgi** in the
      Google Cloud OAuth consent screen → Branding → App name. Console-side, no
      build, no code — but it is shown to **every** user signing in, on iOS and
      web as much as Android.

- [ ] **Delete `packages/core/src/grammar.ts` and `/api/grammar/exercise`.**
      Nothing in the tree calls them; they stay deployed for any device still
      on 1.3.0, which has the grammar UI compiled in. The gate ("no build
      predating the 2026-08-18 removal is still in use") is console state, not
      a repo fact: seven releases sit above 1.3.0, so check that testers have
      updated and then delete. The reasoning is in
      [decisions/grammar-and-writing.md](decisions/grammar-and-writing.md).
      **`typedAnswer.ts` is not part of this**: `grammar.ts` imports its folding
      rules, so the deletion takes the importer and leaves the module.

- [ ] **`writing.ts` still carries a `DO NOT DELETE AS DEAD CODE` header** that
      stopped being true when writing review came back in PR #136. It is
      ordinary live code with callers on both platforms. Remove the header;
      keep the file and its route.

- [ ] **`fetchArchivedFlashcards` in `apps/web/src/services/firestore.ts` has
      no callers.** Web-only, so no build pins it. (`countUserFlashcards` was
      listed with it and has since gained a caller in `UserContext`.)

- [ ] **The mobile screen gutter is 20, hardcoded across Amgi's screens.**
      Munli's screens already share `SCREEN_GUTTER`, exported from `PageHeader`,
      so the constant exists and only Amgi's screens are left. ⚠️ **A shared constant needs a decision first**, which is why
      it wasn't taken then: `review.tsx` is **not uniformly 20** — `ratingRow`
      is 16 where `reviewScroll` is 20, so the rating buttons sit four pixels
      wider than the card above them. Either that is deliberate (a wider tap
      target on the row you hit most) or it is the same bug Cards had. Settle
      that, then a constant can cover all four screens; skipping review would
      leave the thing a constant exists to prevent.

- [ ] **22 lint warnings**, counted 2026-10-04. The number drifts up as the
      app grows, so recount rather than trusting this line. Most are React
      Compiler (`react-hooks/set-state-in-effect`, plus
      `react-hooks/immutability` ×2) and they're real: a `useEffect` calling
      `setState` synchronously renders twice on mount. Most want
      `useSyncExternalStore`, so each is a small design call, not a mechanical
      edit. Set to `warn` so landing the lint fix didn't mean landing rushed
      ones — clear them, then delete the override, and **don't silence them
      further**. The rest include two `<img>` that should be `next/image`
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
