# Tech Stack

Monorepo (npm workspaces + Turborepo): `apps/web`, `apps/mobile`, `packages/core`.

## Web (`apps/web`)

- **Framework:** React / Next.js 16 (App Router)
- **Database:** Firebase Firestore (IndexedDB persistent cache enabled — web
  only; see the mobile section for why the phone can't have this)
- **AI:** Google Gemini 2.5 Flash, proxied through Next.js API routes — the key
  never reaches the browser
- **Auth:** Firebase Authentication (Google sign-in)
- **TTS:** Google Cloud TTS (Chirp 3: HD), audio cached in Firebase Storage
- **Deployment:** Vercel — https://amgi-iota.vercel.app

### Security rules (console config)

Rules are console state, not repo code, and **there is no wildcard support** —
every collection needs its own `match`. Added to the console 2026-08-20 for the
progress dashboard's daily rollups and confirmed working; without it every write
fails `permission-denied`:

```
match /users/{uid}/progress/{day} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Note this is a **subcollection of `users/{uid}`**, so ownership is in the path
and the rule needs no field check — unlike the card collections, which are
top-level and match on the `uid` field. If the `users/{uid}` rule is written
with a bare `match /users/{uid}` and no recursive wildcard, the subcollection is
*not* covered by it; rules do not cascade to subcollections.

### Delete User Data extension (console config)

Account deletion is `deleteUser()` from the client SDK; this extension does the
data cleanup, triggered by the auth deletion. Console state, not repo code —
same category as security rules and composite indexes. Requires Blaze.

Install `firebase/delete-user-data` and set:

| Parameter | Value | Why |
|---|---|---|
| Cloud Firestore paths | `users/{UID}` | preferences doc, addressed by id |
| Firestore delete mode | `recursive` | cheap insurance if subcollections ever appear |
| Enable auto discovery | `yes` | cards are found by field, not by path |
| Auto discovery search fields | `uid` | every card document carries `uid` |
| Auto discovery depth | `3` (default) | cards are top-level; no need to go deeper |
| Realtime Database / Storage paths | *leave empty* | neither holds per-user data |

Leaving the Storage paths empty is deliberate: pronunciation audio is keyed by a
hash of the text, not by user, and is shared — deleting it would break playback
on other people's cards.

Auto discovery is what covers the six per-language card collections without
naming them, so adding a language needs no change here. It does not match UIDs
nested in arrays or maps; ours is a flat top-level field, so that limit does not
bite.

## Mobile (`apps/mobile`)

- **Framework:** Expo SDK 57 / React Native 0.86, Expo Router (file-based)
- **Auth:** Firebase Auth via `expo-auth-session` + `expo-web-browser` (Google OAuth)
- **Storage:** Firebase Firestore + `@react-native-async-storage/async-storage`.
  Firestore's persistent cache is IndexedDB-backed and so unavailable here —
  the client is memory-only, which dies with the process. Anything that must
  outlive a kill is mirrored to AsyncStorage by hand
  (`src/services/offlineReview.ts` holds the review snapshot, rating queue and
  streak). See [lessons.md](lessons.md).
- **Connectivity:** `expo-network` — drives the offline banner and flushes the
  rating queue on reconnect
- **Audio:** `expo-audio` (mic/record permissions explicitly disabled in the plugin config)
- **Notifications:** `expo-notifications` — *local* scheduling only, no push. Its
  iOS plugin stamps the `aps-environment` entitlement regardless, so
  `plugins/withoutPushEntitlement.js` deletes it again and **must be listed
  first** in `plugins` to win (see [lessons.md](lessons.md))
- **Updates:** `expo-updates` is installed and configured, but **OTA is not used**
  — see the shipping-model section below. Don't read its presence as a delivery
  path

**EAS configuration** (`app.json` / `eas.json`) — these four settings work as a
set; changing one without the others breaks OTA delivery:
- `runtimeVersion.policy: "appVersion"` — updates only reach builds with a
  matching app version
- `cli.appVersionSource: "remote"` — EAS owns the build number
- `build.production.autoIncrement: true`
- `build.production.channel: "default"` — must match the channel CI publishes to

iOS bundle ID is `com.tegi.amgi` (borrowed developer account — see
[status.md](status.md)); App Store Connect app id `6792360498`; EAS project
`bc217cdf-916f-409f-868a-5994ff9813bf` under owner `mjkim314`.

## Shared (`packages/core`)

`@amgi/core` — imported by both apps:

| File | Contents |
|---|---|
| `types.ts` | `Flashcard`, `STUDY_LANGUAGE_CONFIGS`, `getStudyLanguageConfig()`, `getBackSideConfig()` |
| `sm2.ts` | SM-2 spaced repetition scheduling, `isDue()` |
| `collections.ts` | `getCollectionId()`, `buildReviewCollections()` — the one place `packId` is read for grouping |
| `reviewQueue.ts` | Review queue construction (direction filter, shuffle) |
| `drill.ts` | Drill queue — pure, requeues missed cards `DRILL_REQUEUE_GAP` later |
| `reminders.ts` | What to schedule and when, for the two local notifications |
| `offlineReview.ts` | Snapshot + rating-queue shapes replayed by mobile's AsyncStorage layer |
| `gemini.ts` | Prompt/response helpers, `parseStreamedDepth`, `parseStreamedExamples` |
| `i18n.ts` | EN + KO strings, `t()` with `{token}` interpolation |
| `packs.ts` | Pack registry + TOEIC pack; `buildPackCardDraft`, `getVocabPack` |
| `kana.ts` | Hiragana/katakana packs, generated from one table |
| `topik.ts` | TOPIK 고급 pack (Korean) |
| `tts.ts` | `getPronunciationUrl` — shared fetch for `/api/pronounce` |
| `writing.ts` | Writing-review types, `parseWritingReview`, `buildWritingCardDraft`, `getWritingReview`. Names nothing about writing — conversation practice reuses it |

Pack source drafts live in `docs/packs/` and are referenced from the pack files
themselves.

The queue modules (`reviewQueue`, `drill`) and `reminders` are here rather than
per-platform on purpose: each existed twice at some point, and the copies
drifted — see `isDue` in [status.md](status.md).

## CI (`.github/workflows`)

- **`mobile-typecheck.yml`** — PRs touching `apps/mobile/**` or
  `packages/core/**` run `npx tsc --noEmit` in `apps/mobile`. This is the only
  automatic gate.
- **`mobile-ota-update.yml`** — typecheck, then `eas update --channel default`.
  **`workflow_dispatch` only.** Its push trigger was commented out when OTA was
  abandoned, because publishing on every merge burned CI time and EAS update
  quota on updates nobody received. The pipeline is kept, not deleted, in case
  OTA is ever revisited; needs the `EXPO_TOKEN` secret.

There is **no lint or test gate in CI** — see the housekeeping section of
[backlog.md](backlog.md).

Manual OTA push, if it's ever wanted: `npx eas-cli update --branch main
--message "..."` from `apps/mobile`.

## Shipping to mobile: Expo Go for dev, builds for release

**Decided 2026-07-23: we do not use OTA updates.** Delivery to the TestFlight
build failed repeatedly and every debugging attempt dead-ended, so the model is
now simply: iterate in Expo Go, cut a build when a batch is worth releasing.
Don't reopen OTA unless there's a specific reason to.

### Development loop — Expo Go

```
cd apps/mobile && npx expo start   # scan the QR with the phone
```

Every JS/TS change reloads instantly. This covers essentially all feature work:
screens, layout, styles, themes, i18n, business logic, state. Server-side
changes need nothing mobile at all — API routes deploy with Vercel and the app
picks them up on the next call.

Google sign-in **works in Expo Go on iOS**, despite the custom
`com.googleusercontent.apps.…:/oauthredirect` scheme — see [lessons.md](lessons.md)
for why, and don't re-derive it. **It cannot work in Expo Go on Android**, and
that is not a bug to fix: iOS works because `ASWebAuthenticationSession`
intercepts the redirect with nothing registered anywhere, and Android has no
equivalent — the scheme must be registered by the app receiving it, which in
Expo Go is Expo Go. Use a development build for Android auth work.

Known limits:
- `expo-updates` code paths don't execute in Expo Go.
- Expo Go runs the SDK's own bundled native module versions, so behavior can
  differ subtly from a production build. Fine for layout/state; verify anything
  native-adjacent (audio, file system, sharing) on a real build before release.
- **Timing differs from a release build**, which is not only a "subtle
  behaviour" caveat: an Android auth race that failed every release APK did not
  reproduce in a development build at all. A race is only closed by the build
  type it appears in.

### Development build — required for Android auth, optional otherwise

`expo-dev-client` plus the `development` profile in `eas.json`. Build once, then
`npx expo start` behaves exactly as above; rebuild only when a **native**
dependency or `app.json` native config changes.

```
npx eas-cli build --platform android --profile development
```

Nothing here goes near App Store Connect — the profile is `distribution:
internal`. Adopting the native Google Sign-In module would break Expo Go on
**both** platforms, since the JS would import a module Expo Go does not carry;
that has not been done. See the Decisions entry in [status.md](status.md).

### Release — Android APK

```
npx eas-cli build --platform android --profile preview
```

`distribution: internal` is what makes this an APK rather than a Play AAB. Each
build gets its own install URL; installs land over the top with data intact so
long as the package name and EAS-held keystore are unchanged. No review, so an
Android fix costs ~20 minutes rather than an App Review cycle.

### Release — production build

Batch work and cut a build when the batch justifies an App Store review cycle.
See the "Queued for the next build" section in [backlog.md](backlog.md).

Build-time-only concerns (nothing else needs a build to *reach* users, because
nothing ships between builds):
- Native dependencies, `app.json` `plugins`/permissions/icon/bundle id
- `version` bumps

The command, from `apps/mobile` (verified 2026-08-22 cutting 1.4.0):

```
npx eas-cli build --platform ios --profile production --auto-submit
```

⚠️ **Do not add `--non-interactive`.** This file recommended it until 1.4.0, on
the strength of one 2026-07-24 run — and it failed: the flag does not skip
prompts, it turns one into an error. EAS asked for an **Apple Team ID**, which
is configured nowhere (no `appleTeamId` in `eas.json`, no `credentials.json`),
and the build died after the version counter had already incremented, burning
build 12. `npx` fetches a new EAS CLI every run, so *"it worked in July"* is not
evidence about today. The flag is for CI, where nobody can answer. Notes on the
output:
- It used to warn that the app "uses Expo Go for development", silenced with
  `EAS_BUILD_NO_EXPO_GO_WARNING=true`. That variable is **probably now
  vestigial** — the warning fires when no `expo-dev-client` is present, and
  there has been one since 1.4.0. Worth noting what it was saying: Expo Go can
  behave differently from a production build. It was suppressed for a year, and
  that is the class of gap that cost four release builds on Android auth.
- `appVersionSource: remote` means EAS owns the build number; bump only
  `version` in `app.json` and let `autoIncrement` handle the rest. Check the
  current one with `eas-cli build:version:get --platform ios`.
- Env vars come from the **production environment on EAS**, not `.env.local`.
- Submission ends at "uploaded to App Store Connect" — Apple processing takes
  another 5–10 min and TestFlight distribution is separate console work.

⚠️ `runtimeVersion.policy` is `appVersion` and `build.production.channel` is
`"default"`. Both only matter for OTA, which we don't use — leave them alone
rather than "cleaning them up", so the option stays open.
