# Lessons Learned

Gotchas already paid for. Grouped so you can skim the relevant section.

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
