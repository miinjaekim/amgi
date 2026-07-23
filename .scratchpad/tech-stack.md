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

## Shipping to mobile: OTA vs. native rebuild

⚠️ **As of 2026-07-23 OTA delivery is unproven** — an update published
successfully by CI never reached the TestFlight build. Until that's debugged
(see the High/infrastructure item in [backlog.md](backlog.md)), the split below
describes the intended model, not observed behavior. Assume mobile changes reach
users only via a new build.

The expensive path is a native build — it means an App Store Connect
submission and a review wait, so those get **batched**. OTA updates are free
and immediate, so they should **not** be batched; holding a JS-only fix for the
next binary delays it for no reason.

**Ships over the air** (JS/TS only — anything under `app/`, `src/`, or
`packages/core`):
- UI layout, screens, components, styles, themes
- i18n strings
- Business logic, service calls, state
- Anything server-side. API route changes deploy with Vercel and reach the
  mobile app immediately — no mobile release involved at all.

**Requires a new build + review:**
- Adding or removing a native dependency (`expo-notifications`, a new
  `expo-*` module with native code)
- `app.json` changes: `plugins`, `ios`/`android` config, permissions, icon,
  bundle identifier, `version`
- Anything changing `runtimeVersion` — with `policy: "appVersion"`, bumping
  `version` starts a new runtime lineage

⚠️ **Two things to get right when you do cut a build:**
1. Verify `build.production.channel` is still `"default"` in `eas.json`. An
   older branch merged in can silently drop it (see PR #43) and the build will
   ship unable to receive any update.
2. Bumping `version` changes the runtime version, so updates published against
   the old version won't reach the new build. CI republishes on the next push
   to `main` — just don't assume an already-published update carried over.

Practical consequence: keep a running list of what's blocked on a build
(see the "Queued for the next build" section in [backlog.md](backlog.md)) and
ship everything else continuously as it lands.
