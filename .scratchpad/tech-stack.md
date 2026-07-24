# Tech Stack

Monorepo (npm workspaces + Turborepo): `apps/web`, `apps/mobile`, `packages/core`.

## Web (`apps/web`)

- **Framework:** React / Next.js 16 (App Router)
- **Database:** Firebase Firestore (IndexedDB persistent cache enabled)
- **AI:** Google Gemini 2.5 Flash, proxied through Next.js API routes — the key
  never reaches the browser
- **Auth:** Firebase Authentication (Google sign-in)
- **TTS:** Google Cloud TTS (Chirp 3: HD), audio cached in Firebase Storage
- **Deployment:** Vercel — https://amgi-iota.vercel.app

## Mobile (`apps/mobile`)

- **Framework:** Expo SDK 54 / React Native 0.81, Expo Router (file-based)
- **Auth:** Firebase Auth via `expo-auth-session` + `expo-web-browser` (Google OAuth)
- **Storage:** Firebase Firestore + `@react-native-async-storage/async-storage`
- **Audio:** `expo-audio` (mic/record permissions explicitly disabled in the plugin config)
- **Updates:** EAS OTA via `expo-updates`

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
| `types.ts` | Flashcard union, `STUDY_LANGUAGE_CONFIGS`, `getStudyLanguageConfig()` |
| `sm2.ts` | SM-2 spaced repetition scheduling |
| `gemini.ts` | Prompt/response helpers, `parseStreamedDepth`, `parseStreamedExamples` |
| `i18n.ts` | EN + KO strings, `t()` with `{token}` interpolation |
| `packs.ts` | Curated vocabulary packs (source draft in `docs/packs/`) |
| `tts.ts` | `getPronunciationUrl` — shared fetch for `/api/pronounce` |

## CI (`.github/workflows`)

- **`mobile-typecheck.yml`** — PRs touching `apps/mobile/**` or
  `packages/core/**` run `npx tsc --noEmit` in `apps/mobile`.
- **`mobile-ota-update.yml`** — pushes to `main` touching those same paths
  typecheck, then `eas update --channel default`. Needs the `EXPO_TOKEN` secret.

Manual OTA push, if needed: `npx eas-cli update --branch main --message "..."`
from `apps/mobile`.

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

Google sign-in **works in Expo Go**, despite the custom
`com.googleusercontent.apps.…:/oauthredirect` scheme — see [lessons.md](lessons.md)
for why, and don't re-derive it.

Known limits:
- `expo-updates` code paths don't execute in Expo Go.
- Expo Go runs the SDK's own bundled native module versions, so behavior can
  differ subtly from a production build. Fine for layout/state; verify anything
  native-adjacent (audio, file system, sharing) on a real build before release.

### Release — production build

Batch work and cut a build when the batch justifies an App Store review cycle.
See the "Queued for the next build" section in [backlog.md](backlog.md).

Build-time-only concerns (nothing else needs a build to *reach* users, because
nothing ships between builds):
- Native dependencies, `app.json` `plugins`/permissions/icon/bundle id
- `version` bumps

The command, from `apps/mobile` (verified 2026-07-24 cutting 1.0.2):

```
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

`--non-interactive` works because the App Store Connect API Key and iOS
credentials already live on the EAS servers; it skips Apple-side validation of
the distribution cert but builds and submits fine. Notes on the output:
- It warns that the app "uses Expo Go for development" — expected under our
  model, not a problem. Silence it with `EAS_BUILD_NO_EXPO_GO_WARNING=true`.
- `appVersionSource: remote` means EAS owns the build number; bump only
  `version` in `app.json` and let `autoIncrement` handle the rest. Check the
  current one with `eas-cli build:version:get --platform ios`.
- Env vars come from the **production environment on EAS**, not `.env.local`.
- Submission ends at "uploaded to App Store Connect" — Apple processing takes
  another 5–10 min and TestFlight distribution is separate console work.

⚠️ `runtimeVersion.policy` is `appVersion` and `build.production.channel` is
`"default"`. Both only matter for OTA, which we don't use — leave them alone
rather than "cleaning them up", so the option stays open.
