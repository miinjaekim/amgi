# Lessons

## Google sign-in on Android: three traps, and none of them in our code (2026-08-22)

The first Android build reached Google, got a code back, and still signed
nobody in. Three separate things had to be cleared, and **not one of them was a
bug in this repo** — which is the reason to write them down.

**1. Google blocks custom URI schemes for *new* Android OAuth clients.** The
symptom is `400: invalid_request` on the consent screen, which reads like a
malformed redirect. It is not: Google restricted custom schemes for app
impersonation reasons, and the block applies to **newly created clients only**.
Existing ones keep working — which is exactly why iOS was fine and Android was
not, on the same code. The fix is a toggle in the client's *Advanced Settings*
in Google Cloud, not a rebuild. **The discriminator is the client's age, not
anything you can see from the app**, so nothing in a diff will ever point at it.
It is also a reprieve rather than a fix; Google says it may withdraw the
escape hatch, and points at Google Identity Services instead.

**2. expo-router answers the OAuth redirect before the auth session does.** The
redirect arrives as a deep link and *two* subsystems consume it: the auth
session resolves the sign-in, and the router treats the same URL as navigation.
With no matching route the router renders "Unmatched Route", so a **successful**
sign-in ends on an error screen. `app/oauthredirect.tsx` exists only to give
that navigation somewhere to go. iOS never sees this, because
`ASWebAuthenticationSession` intercepts the redirect in-process and it never
becomes a deep link at all.

**3. The one that actually dropped the token: Android has no native
AuthSession.** Expo's own docs say so. `expo-web-browser` polyfills it by
racing two promises — "the browser closed" against "the redirect arrived" — and
**the redirect is what closes the browser**, so both fire from a single event.
When the browser-closed side wins, `promptAsync` resolves `dismiss`, the
redirect listener is torn down in a `finally`, and the authorization code is
discarded. Nothing is logged: the provider's code-for-token exchange
(`providers/Google.js`) has a `.then` and **no `.catch`**, so every failure in
that path is invisible by construction. Open as expo/expo#23781; worked around
with `promptAsync({ showInRecents: true })`.

**The meta-lesson is about what a development build can and cannot prove.**
Sign-in succeeded in a dev build against the *same code* that had just failed on
a release APK — because debug timing does not lose the race. That was worth
having: it proved the client id, the SHA-1, the redirect URI, the console
toggle and the Firebase exchange were all correct, narrowing the problem to one
thing. But it could not prove the fix, and treating it as a green light would
have shipped a broken build. **A timing bug is only closed by the build type it
appears in.**

Underneath all three, the same asymmetry: **Google sign-in works in Expo Go on
iOS and cannot work there on Android.** Passing `redirectUri` explicitly dodges
the `exp://` that `makeRedirectUri` would return, and then
`ASWebAuthenticationSession` intercepts the custom scheme with nothing
registered anywhere. Android has no such interception — the scheme has to be
registered by the app receiving it, and in Expo Go the app *is* Expo Go. So the
one platform that needed the most iteration was the one the documented dev loop
could never touch. See the development-build decision in [status.md](status.md).

**Reading Android logs, since this is where it was settled.** Filter by the
app's process, never by keyword — `adb logcat --pid=$(adb shell pidof -s
<package>)`. Grepping logcat for `Error` returns pages of unrelated system
noise (`keystore2`, RKP provisioning, Phenotype) and none of your app. The line
that ended the guessing was `ActivityTaskManager: START ... dat=<scheme>:/...
cmp=<package>/.MainActivity`, which proved the OS delivered the redirect to the
live process — so everything before the library race was working.

## The review queue is per direction — never mutate it by index (2026-08-10)

`ReviewQueueItem` is one entry per due **direction**, so a card due both ways is
two entries with the same `card.id`. Any mutation that means "this card is gone"
has to filter by id; filtering by index removes the question on screen and
leaves the card queued the other way round. That is how archiving a card mid-
session put it back a few cards later, and how deleting one left an entry
pointing at a document that no longer existed (#86).

Both platforms had it, written independently — which is the actual lesson: the
queue's shape is easy to forget at the call site, so the removal lives in
`removeCardFromQueue` in core and both screens call it. It returns the new index
as well as the queue, because the two only agree if the entries removed *before*
the current one are counted.

Editing a card mid-session is the exception that proves it: `handleEditSave`
maps by index on purpose, since only the entry on screen is being changed.

## Hermes has `Intl`, but not `Intl.Segmenter` (2026-08-09)

Measured, not assumed — and measurable without a device:

```
$ node_modules/react-native/sdks/hermesc/osx-bin/hermes some.js
Intl: object
Intl.Segmenter: undefined
unicode prop escapes: yes
```

`typeof Intl === 'object'` makes it *look* supported, so a feature check on
`Intl` alone passes and then the specific API is missing. Anything relying on
segmentation — word diffing, word counts, truncating at a word boundary — needs
a real fallback on mobile, not a polite `try`.

**The fallback has to be script-aware, not a whitespace split.** Half the study
languages put no spaces between words, so splitting 私は昨日映画を見ました on
whitespace yields one token and any diff over it can only say "all of this
changed". Splitting spaceless scripts per character instead lands well: the LCS
still finds the common run and coalescing merges it back, so 見 → 観 comes out
as a one-character edit. Verified by running the bundled diff through that same
`hermes` binary:

```
[ko] 어제 학교에 가고 있었[-어요. 그런-]{+는+}데 비가 왔어요.
[ja] 私は昨日映画を[-見-]{+観+}ました。
```

Two things worth keeping from how this was checked:

- **That `hermes` binary ships in `node_modules` and runs plain JS.** Bundle a
  core module with esbuild (`--format=iife --target=es2020`) and you can test
  engine behaviour without a simulator, a build, or a device.
- **`expo export --platform ios` compiles the whole app to Hermes bytecode**, so
  it catches broken imports and JSX that `tsc` passes over. Cheaper than a build
  and worth running before claiming a mobile change works.

## A generated exercise must be checkable, not just well-prompted (2026-08-08)

A grammar cloze came back reading `Mon frère adore ___ football chaque
week-end.` with `expected: "au"` — the model had deleted "jouer" along with the
gap but left it out of the answer too. Filling in the "correct" answer gave
**"Mon frère adore au football"**, which is not French, and the learner who
wrote the correct `jouer au` was marked wrong by their own app. The prompt
already said "everything else in the sentence stays intact"; it was simply not
obeyed.

**The fix was not better wording — it was a redundant field.** Generation now
returns the complete sentence as well, and the exercise is discarded unless
filling the gap reproduces it exactly. A model that silently drops a word now
fails a string comparison instead of reaching a learner.

The general shape, worth reaching for whenever a model generates something the
app will assert is correct: **ask for the same fact twice in two forms, and
check them against each other.** Prompt instructions are requests; a round trip
between two returned fields is enforcement. And when the content is something
the user will *learn*, fail visibly into a retry rather than tolerantly into a
display — the tolerant-parser instinct that is right for a writing finding is
wrong here, because the cost of showing it is teaching the wrong thing.

Two follow-on details, both found by the check's own first run:

- **Compare whitespace-insensitively.** An elision attaches with no space, so
  `J'ai besoin ___ eau.` + `d'` rebuilds to `d' eau` where the full sentence has
  `d'eau`. Strict comparison threw away a correct exercise. Ignoring spacing
  still catches the real failure — a missing word is not a missing space.
- **Fold typographic marks.** The same generator returns `d’` with a curly
  apostrophe, which no learner types and which no ASCII comparison matches.

### …and the check then broke every turn, which is its own lesson

The redundant field was added to the parser as **required**, the route was
tested with `curl`, the JSON looked right, and it shipped broken: the route
parses the model's response and returns the *parsed* object, so it had stripped
`full` — and `getPatternExercise` parses the route's response a **second** time
(mobile can point at a deployed route of a different vintage). Every cloze
failed that second parse.

Two things to carry forward:

- **A field a parser requires must survive the parse**, or a double-parsed
  pipeline rejects everything. `full` is now part of `ClozeExercise` rather than
  an input-only field — which also let the graded view stop reassembling a
  string it can be handed.
- **Curl against a route is not a test of the client path.** The route was
  verified three times over and the bug was in the layer after it. Anything with
  a shared-core fetch wrapper needs exercising *through the wrapper* — a
  throwaway vitest file that calls `getPatternExercise` against the dev server
  found it in one run, and would have found it before shipping. Learned

Gotchas already paid for. Grouped so you can skim the relevant section.

## A layout bug is not fixed by arithmetic (2026-08-25)

The typed-review card on mobile took three attempts, and the first two were
reasoned from style values instead of looked at. The real fault was visible in
one screenshot the whole time: **the card wrapped a `ScrollView`, and focusing
the field made it auto-scroll to bring the input into view — carrying the word
off the top of the card.** The learner was asked to translate a word that was no
longer on screen. Neither of the first two attempts touched a ScrollView.

Three things worth keeping:

- **Attempt one — pinning the input to the fixed bottom block — made it worse**,
  and predictably so. The card was `flex: 1`; every pixel the bottom block grew
  came straight out of it.
- **`KeyboardAvoidingView` under-lifts on a screen that already pads its
  bottom.** It derives the overlap from its own measured frame, so the floating
  tab bar's `paddingBottom` got double-counted and it lifted ~90pt short —
  enough to cut the submit button in half. Reserving the keyboard's *measured*
  height (`keyboardWillShow` → `endCoordinates.height`, minus what the screen
  already pads) leaves no arithmetic to be wrong about. The Learn screen had
  already concluded this; it is written in a comment there.
- **In a React Native column, content that does not fit is drawn over what is
  below it** — it does not clip and it does not scroll. So a layout with nothing
  flexible left silently overlaps rather than failing visibly, and "it fits on my
  arithmetic" is worth about nothing. Ask for a screenshot.

## Process

- Always use Git — new branch per feature, commit as work completes. Never work
  directly on `main`.
- Always proxy third-party API keys server-side — never `NEXT_PUBLIC_` for secrets.

## Firestore

- **Account deletion is the client SDK plus an extension, not the Admin SDK.**
  `deleteUser()` from the client removes the account; the *Delete User Data*
  extension triggers on that and sweeps Firestore server-side, so cleanup
  finishes even if the app is closed. This is the documented Firebase pattern
  and it keeps `firebase-admin` out of it entirely — which matters, because the
  attempt that did use `firebase-admin/auth` (PR #55) took `/api/pronounce` and
  `/api/word-of-the-day` down with it and was reverted. Root cause was never
  found; the fix was to not need it. Config lives in
  [tech-stack.md](tech-stack.md) — it is console state, like the rules below.
  Expect `auth/requires-recent-login`: deletion is security-sensitive and needs
  a sign-in from the last ~5 minutes, so both platforms reauthenticate and retry.
- **Extension installs can fail on a service account that plainly exists.**
  Installing *Delete User Data* failed twice with "Default service account
  `<project-number>-compute@developer.gserviceaccount.com` doesn't exist" while
  that account was sitting right there in IAM, enabled. Retrying later, config
  unchanged, worked. Extensions deploy 1st gen Cloud Functions, and on projects
  that have not used Compute Engine the default account is provisioned lazily
  and propagates slowly — so the error means "not ready yet" at least as often
  as it means "missing". **Retry before changing anything**; the temptation is
  to start editing config that had nothing to do with it.
- **Security rules are manual** (Firebase console), not in the codebase. Add
  rules for every new collection — there is no wildcard support.
- **Composite indexes** are required for multi-field filter+sort queries (e.g.
  `archived + createdAt`). Firebase gives a direct creation link on the first
  failing query.
- **A new cards collection needs _two_ composite indexes, and the console link
  only builds the one that failed.** Measured adding Spanish (2026-08-22), where
  the backlog item had said "the composite index", singular:
  - `uid` ASC, `archived` ASC, `createdAt` DESC — `activeCardsQuery`, so
    `subscribeToUserFlashcards` / `fetchUserFlashcards` (**`/review`**, both
    platforms) and `fetchArchivedFlashcards`
  - `uid` ASC, `createdAt` DESC — `allCardsQuery`, so
    `subscribeToAllUserFlashcards` / `fetchAllUserFlashcards` (**`/cards` and
    the decks pages**, both platforms, and export)

  Both platforms issue the same shapes. The trap is that clicking the link in
  the first error makes the deck look finished, because the two surfaces you
  check first need *different* indexes: `/review` comes back to life and
  `/cards` is still broken.

  **`/cards` is where the second one bites — not export**, which is what this
  lesson said until Kikuyu (2026-08-22) proved otherwise by failing there
  immediately. Export was the wrong landmark: it made the gap sound remote when
  it is one nav click away.

  **And on web that failure had no error and no link.** `/cards` subscribes, and
  its `onError` used to discard the error — Firestore only logs a
  snapshot-listener error itself when *no* handler is supplied, so an empty
  handler is quieter than none. What you get instead is the saved card
  appearing for a second, served out of the IndexedDB cache, and then vanishing
  under "no cards saved". Fixed in `cards/page.tsx` so the link reaches the
  console, but the shape is worth recognising: **a card that flashes and
  disappears is a failing query, not a failing write.**

  Create both up front. If a link never arrives, build the second by hand —
  Indexes → Composite, collection `cards_<lang>`, `uid` ASC then `createdAt`
  DESC, scope Collection.
- **Two rule shapes are in use for card collections, and only one says what it
  means.** `cards` and `cards_chinese_traditional` use explicit
  `read, update, delete` + a separate `create`. The middle four (`cards_swedish`,
  `cards_english`, `cards_french`, `cards_japanese`) use `read, write` + a
  separate `create`, which *works only by accident*: `write` already covers
  `create`, and on a create `resource.data` is null, so that clause always
  denies — the separate `create` line is what actually grants it, because rules
  OR together. Copy the explicit form for a new collection. Don't "simplify" a
  card rule down to `allow read, write` alone; it would deny every create.
- **Backfill new boolean fields** on existing documents — `!=` and `==` both
  exclude documents where the field is missing entirely.
- **Firebase v9 rejects `undefined` field values.** `addDoc`/`setDoc` throw
  "Unsupported field value: undefined" if any key holds an explicit `undefined`
  (easy to hit by spreading an object literal). Strip with
  `Object.fromEntries(Object.entries(data).filter(([,v]) => v !== undefined))`
  before writing. Better still: avoid object literals that always declare every
  key — only include keys with real values.
- **The persistent cache is web-only.** `persistentLocalCache` is IndexedDB
  backed, and React Native has no IndexedDB, so `getFirestore` on mobile is a
  *memory* cache: it survives backgrounding but not a kill. Anything that has
  to outlive the process on mobile needs its own AsyncStorage layer — which is
  what `apps/mobile/src/services/offlineReview.ts` is. Do not assume a Firestore
  behaviour that holds on web holds on the phone.
- **Neither reads nor writes fail offline, and each lies differently.**
  `getDocs`/`getDoc` fall back to the local cache, so on RN they resolve
  *empty* — indistinguishable from "this user has no data", which is how an
  offline launch came to wipe the cached language and zero the streak. Use
  `getDocsFromServer`/`getDocFromServer` wherever "couldn't reach the server"
  has to be told apart from "there is nothing there". Writes are the opposite:
  `updateDoc` neither resolves nor rejects offline, it stays pending until it
  can commit — so any await on one needs a timeout, or it hangs forever.
- **Firebase Admin Storage must initialize lazily.** An eager top-level
  `export const bucket = ...` crashed Vercel's build-time page-data collection,
  which runs before env vars are available. Use a `getBucket()` accessor
  (`apps/web/src/lib/firebaseAdmin.ts`).

## Next.js / web

- Reading `localStorage` in a `useState` initializer causes a hydration
  mismatch in the App Router. Always read it in a `useEffect` — or, for
  render-blocking state like theme, in a pre-paint inline script in `layout.tsx`.
- `nativeLanguage` uses `undefined` (not yet loaded) vs `null` (loaded, not set)
  vs `string` (set). That three-way distinction is what drives the language
  modal; collapsing it to a nullable breaks first-load behavior.
- Effects that load deck data must depend on `studyLanguage` — otherwise
  switching language keeps rendering the previous deck's cards.
- **Routing a `setState` through a helper can add a React Compiler warning.**
  `handleExitReview` in `review/page.tsx` is called from an effect. Inlining two
  `setState` calls into it is free; calling a `clearTypedAnswer()` helper that
  does the same two calls added a fresh `react-hooks/exhaustive-deps` warning
  against that effect. The rule is set to `warn` deliberately so the existing
  ones could be cleared thoughtfully — adding one is a regression, and the fix
  is to inline rather than to silence.
- **A web page opened from mobile is a stranger.** Mobile's Settings opens
  `/privacy` with `WebBrowser.openBrowserAsync`, which carries **no Firebase
  auth and no `localStorage`** — so every "has this user set up yet" gate on web
  fires for a signed-in mobile user who answered months ago. It put the
  first-run `LanguageSetupModal`, which has no dismiss, on top of the privacy
  policy. Fixed by exempting `/privacy*` in `LayoutWithUser`. The general rule:
  **any web route mobile links out to must render for a logged-out first-time
  visitor**, because from the in-app browser's side that is exactly who it is.

## Expo / React Native monorepo

- **Hermes error** — caused by a root-level `babel-preset-expo@56`. Fix: pin
  `babel-preset-expo@~54.0.11` in `apps/mobile/`.
- **React version conflict** — use `config.resolver.resolveRequest` in
  `metro.config.js` to force all `react` imports to the local version. Also mind
  `nodeModulesPaths` order.
- **`initializeAuth` already-initialized on fast refresh** — wrap in try/catch
  and fall back to `getAuth(app)`.
- **Mobile OAuth redirect** — `makeRedirectUri()` always returns `exp://...`,
  which Google rejects. Fix: explicitly pass the reversed iOS client ID scheme
  as `redirectUri`.
- **Review auto-selects a single collection, so `collectionId` is never
  `undefined` for most users.** `review.tsx` sets it as soon as `collections`
  holds exactly one entry — which is every account whose only cards are their
  own. Anything keyed on `collectionId === undefined` therefore runs *only* for
  users with a pack enrolled. Cost two rounds of debugging on the
  stale-card-lists fix: the refresh guard used that check to mean "not
  mid-session", so the fix worked for an account with a pack and did nothing
  for everyone else, while the symptom looked like the reload never firing.
  - **A session in flight is `started && queueFor === collectionId && !done &&
    !stopped`** — the expression the render already uses. A guard keyed on a
    *choice* rather than on the *state it protects* is how this happened.
  - The same auto-select hides anything mounted only on the collection picker,
    which is why Review's header sits on all four non-session surfaces.
  - **Suspect your own recent change before the environment.** The wrong turn
    was blaming a stale Metro bundle and rewriting a working mechanism. The
    evidence that cracked it — a page title missing on one screen — was in the
    first report and pointed straight at the render path.

- **A `ScrollView` inside a `TouchableOpacity` scrolls only sometimes.** The
  enclosing press handler and the scroll gesture compete for the same touch, so
  a drag is intermittently resolved as a press — which reads as "scrolling is
  broken half the time" rather than as a layout problem, and sends you looking
  at heights. Cost a round trip on the page-help modal, where the sheet was
  wrapped in a Touchable for tap-to-dismiss (copied from `SaveFlashcardModal`,
  where it is fine because that sheet holds only text inputs).
  - **Fix:** keep the sheet a plain `View` and put tap-to-dismiss on its own
    `Pressable` layer behind it via `StyleSheet.absoluteFill`. The ScrollView
    is then the sole responder for anything starting inside it.
  - `CardDetailModal`, `ImportModal` and the first-run tour never had this,
    because all three use plain `View` sheets. The house pattern was already
    right; the bug came from copying the one modal that isn't scrollable.
- **`EXPO_PUBLIC_*` env vars are baked at bundle time** — restart Metro with
  `--clear` after changing `.env.local`.
- **State set in a handler and derived in an effect leaves one render where the
  two disagree** — and that render still runs, so anything reading both crashes
  or shows the wrong thing. Cost a `Cannot read property 'card' of undefined` in
  mobile review (PR #52): tapping a collection set `collectionId`, the queue for
  it was built in an effect, and the frame in between had the new collection
  with the old collection's empty queue. Web had the same shape and no bug,
  because it derives with `useMemo` during render.
  - **Prefer deriving during render.** Where the value must stay state — a
    shuffled queue that local edits mutate — record *what it was built for* and
    have the render wait for the two to agree, rather than guarding the one
    field that happened to crash. The guard fixes the crash and leaves the
    siblings: `index` and `done` were equally stale, so moving between two
    decks also flashed the previous one's "all caught up".
  - Reading it is not enough to catch this; it needs the device.

- **`expo-notifications` stamps the push entitlement on whether you use push or
  not.** Its iOS plugin sets `aps-environment` unconditionally — no option to
  opt out — because it cannot tell local notifications from remote push. The
  build then fails with *"Provisioning profile doesn't support the Push
  Notifications capability"*, which reads like a credentials problem and is
  really a capability the app does not need. Amgi schedules locally, so
  `apps/mobile/plugins/withoutPushEntitlement.js` deletes the key again.
- **Config plugin mods run in reverse registration order.** The most recently
  registered entitlement mod runs *first*, so to have the last word you must be
  listed **first** in `plugins`. Registering after the plugin you mean to
  correct silently does nothing — it edits the value before that plugin has
  written it. `npx expo config --type introspect` shows the resolved
  entitlements without generating `ios/`, which is how to check this in seconds
  rather than by waiting on a cloud build.
- **A failed EAS build still consumes its build number.** With
  `appVersionSource: "remote"` and `autoIncrement`, the number is reserved when
  the job is created, not awarded on success. Gaps are harmless — App Store
  Connect only needs them to increase.

## Expo Go dev loop

- **`npx expo start` from `apps/mobile`, scan the QR — this is the dev loop.**
  Confirmed working 2026-07-23.
- **There are no React Native component tests in this repo**, so a mobile
  screen's render order is checked by running it and by nothing else. Web tests
  and `tsc` passing says nothing about it — PR #51 shipped mobile review broken
  on every path into a session with both green. When a change restructures what
  a mobile screen renders, the Expo Go pass *is* the test, not a formality after
  one.
- **Google sign-in works in Expo Go**, even though the redirect is the custom
  scheme `com.googleusercontent.apps.…:/oauthredirect`, which Expo Go does not
  register. It works because `expo-web-browser` uses iOS's
  `ASWebAuthenticationSession`, which captures a redirect matching the callback
  scheme *inside the session* — the scheme never has to be in an Info.plist.
  This is what the explicit `redirectUri` in `UserContext.tsx` is for; the code
  comment there says "In Expo Go" for exactly this reason.
  ⚠️ Don't re-derive this as "custom schemes can't work in Expo Go" — that
  reasoning is wrong and has cost time twice.
- Expo Go runs the SDK's own bundled native modules, so behavior can differ
  subtly from a production build. Fine for layout and state; verify audio, file
  system, and sharing on a real build before release.
- `expo-updates` code paths don't execute in Expo Go.

## EAS builds & OTA updates

**We don't use OTA** (decided 2026-07-23) — delivery to the TestFlight build
failed and every debugging attempt dead-ended. Ship via builds instead. The
notes below are kept only in case OTA is ever revisited.

- **OTA only reaches builds it matches.** `runtimeVersion.policy: "appVersion"`
  means an update is delivered only to builds with the same app version — bump
  `version` in `app.json` and you cut off existing installs from updates.
- **Channel must match on both sides.** A production build with no `channel` in
  `eas.json` won't receive updates published to `--channel default`. This was
  the bug fixed in PR #43.
- **Adding a native dependency means a new build, not an OTA.** Pronunciation
  (`expo-audio`) and anything else touching native modules can't ship over the
  air to an existing build.
- With `cli.appVersionSource: "remote"`, EAS owns the build number — don't also
  hand-edit `buildNumber` locally.
- Manual push: `npx eas-cli update --branch main --message "..."` from `apps/mobile`.

## Apple / App Store Connect

- An **Individual**-enrolled developer account can't let a non-account-holder
  generate certificates. Work around it with an App Store Connect API Key.
- Apple's **App Transfer doesn't cover TestFlight-only apps** — an app that has
  never shipped to the App Store can't be moved between accounts. Launching
  under a borrowed account means a fresh relaunch later, not a migration.

## Google Cloud TTS

- **Chirp 3: HD returns silence for single-character text.** It's a generative
  model, and on a lone character it intermittently emits a ~0.3s near-silent
  clip instead of speech — measured 11/70 kana and 9/21 Korean syllables, with
  a *different* set failing on each run, so it can't be worked around by
  blacklisting characters. Two-character text was clean (0/15). The Neural2
  voices were clean 0/91 on the same inputs, so `ttsShortVoiceName` routes
  single characters to one. Affects any deck with one-character cards — this
  was already broken for Korean (물, 해, 아) before the kana packs surfaced it.
- **Never cache a generation you haven't sanity-checked.** `/api/pronounce`
  keys cached audio by content hash with no expiry, so one bad response is
  permanent — that's what made a silent あ survive to be played rather than
  just being a flaky first tap. The route now rejects implausibly small audio
  and retries once instead of storing it. Anything cached forever needs a
  validity check at write time, not read time.
- The voice name is part of the cache path, which is what let the fix land
  without a purge: changing the voice for short text moved those clips to a
  new path and orphaned the poisoned ones.
