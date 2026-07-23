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
