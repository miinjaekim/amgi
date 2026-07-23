# Lessons Learned

Gotchas already paid for. Grouped so you can skim the relevant section.

## Process

- Always use Git — new branch per feature, commit as work completes. Never work
  directly on `main`.
- Always proxy third-party API keys server-side — never `NEXT_PUBLIC_` for secrets.

## Firestore

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

## Expo Go dev loop

- **`npx expo start` from `apps/mobile`, scan the QR — this is the dev loop.**
  Confirmed working 2026-07-23.
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
