# Amgi Mobile — Planning Scratchpad

## Vision
A native iOS/Android app (Expo) that mirrors the web app's core loop — look up a term, get an AI explanation, save as a flashcard, review with spaced repetition — with a native feel and App Store distribution.

---

## Decisions Made
- **Framework:** Expo SDK 54 (React Native) with Expo Router v6 — pinned to SDK 54 for Expo Go compatibility
- **Repo:** Monorepo in the same repo as the web app (Turborepo + npm workspaces)
- **Styling:** Plain `StyleSheet.create()` for now — NativeWind deferred until skeleton is stable
- **Firebase:** Firebase JS SDK (same as web) — avoids native module complexity with Expo Go
- **Auth:** `expo-auth-session/providers/google` + `signInWithCredential` (Firebase JS SDK) — no `@react-native-firebase`
- **Backend:** No changes — mobile calls the existing `/api/explain/*` Next.js routes for Gemini
- **Dev client:** Expo Go (no custom builds needed)

---

## What's Reusable

| Layer | Status | Notes |
|---|---|---|
| `sm2.ts` | ✅ As-is | Pure TS, zero dependencies |
| `gemini.ts` | ✅ As-is | HTTP fetch to existing `/api/explain/*` |
| `userPreferences.ts` | ✅ As-is | Firebase JS SDK — same on web and mobile |
| `i18n.ts` | ✅ As-is | Plain object, no web dependencies |
| Data types (`Flashcard`, `TermCore`, etc.) | ✅ As-is | Pure TS interfaces |
| `firestore.ts` | ⚠️ Mobile version needed | Same JS SDK but separate file in `apps/mobile` |
| React components, Tailwind CSS | ❌ Rebuild | Web-only |
| Next.js API routes | ✅ Keep as-is | Gemini key must stay server-side |

---

## Repo Structure (implemented)

```
amgi-ai-2/
├── apps/
│   ├── web/                   ← Next.js app
│   └── mobile/                ← Expo app (SDK 54)
│       ├── app/               ← expo-router file-based routes
│       │   ├── _layout.tsx    ← root layout (UserProvider)
│       │   └── (tabs)/        ← tab navigator
│       │       ├── _layout.tsx
│       │       ├── index.tsx  ← Learn screen
│       │       ├── review.tsx ← Review screen (stub)
│       │       └── cards.tsx  ← Cards screen (stub)
│       ├── src/
│       │   ├── config/firebase.ts      ← initializeAuth + AsyncStorage persistence
│       │   ├── context/UserContext.tsx ← Google Sign-In + auth state
│       │   └── services/userPreferences.ts
│       ├── metro.config.js    ← monorepo-aware (watchFolders, resolveRequest)
│       └── babel.config.js    ← babel-preset-expo@54.0.11 pinned
├── packages/
│   └── core/                  ← shared logic (@amgi/core)
├── turbo.json
└── package.json               ← workspaces root
```

---

## Implementation Steps

### ✅ Step 1 — Turborepo setup
- Turborepo + npm workspaces at repo root
- Web app lives in `apps/web/`
- Workspace `@amgi/core` at `packages/core/`

### ✅ Step 2 — Extract `packages/core`
- Moved: `sm2.ts`, `gemini.ts`, `userPreferences.ts`, `i18n.ts`, and all TS interfaces
- Web imports updated: `@/services/...` → `@amgi/core/...`

### ✅ Step 3 — Bootstrap Expo app (SDK 54)
Key gotchas solved:
- **Hermes error ("private properties not supported"):** Root had `babel-preset-expo@56` which uses `hermes-v1` (skips private field transforms). SDK 54 Hermes can't run them. Fix: pin `babel-preset-expo@~54.0.11` as a devDependency in `apps/mobile/`.
- **React version mismatch:** Web app's `react@19.2.7` at root conflicted with `react-native-renderer@19.1.0`. `extraNodeModules` is only a fallback. Fix: `config.resolver.resolveRequest` in `metro.config.js` intercepts all `react` imports and forces them to the local `react@19.1.0`.
- **gitignore:** Changed `/node_modules` → `**/node_modules` so workspace-local node_modules are excluded.
- **No NativeWind yet** — deferred until screens are stable.

### ✅ Step 4 — Auth
- `initializeAuth` + `getReactNativePersistence(AsyncStorage)` for persistent sessions
- `expo-auth-session/providers/google` + `GoogleAuthProvider.credential(id_token)` + `signInWithCredential`
- **iOS OAuth in Expo Go gotcha:** In Expo Go, `makeRedirectUri()` always returns `exp://...` (the dev server URL), which Google rejects. Fix: explicitly pass `redirectUri` as the reversed iOS client ID scheme (`com.googleusercontent.apps.xxx:/oauthredirect`). This bypasses Expo Go's override, and `ASWebAuthenticationSession` intercepts the custom scheme natively without needing it registered in Info.plist.
- iOS OAuth client created in Google Cloud Console with bundle ID `host.exp.Exponent` (Expo Go's bundle ID).
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` added to `.env.local`.

### ✅ Step 5 — Build screens

| Screen | Status | Notes |
|---|---|---|
| Learn | ✅ | Search + disambiguation + explanation card + lazy depth/examples + save modal |
| Cards | ✅ | FlatList, search/filter/sort, inline edit, archive/delete via Alert |
| Review | ✅ | Due-card queue (both directions), reveal animation, SM-2 ratings (Again/Hard/Good/Easy) |
| Settings | — | Sign-out in Learn auth bar; language picker deferred |

Key gotchas solved:
- **`initializeAuth` already-initialized on fast refresh:** wrap in try/catch, fall back to `getAuth(app)`.
- **API base URL trailing slash:** strip with `.replace(/\/$/, '')` — double slash caused Vercel redirect hang.
- `EXPO_PUBLIC_*` env vars are baked at bundle time; always restart with `--clear` after `.env.local` changes.
- API calls the production Vercel URL (`EXPO_PUBLIC_API_BASE_URL`) — Gemini key stays server-side.

---

## Future Features

### Personalised Explanation Preferences
Users set preferences for how they want explanations delivered — e.g. formality level, depth (brief vs. detailed), emphasis (etymology, cultural context, example-heavy), and tone. Preferences are stored in `users/{uid}` in Firestore alongside `nativeLanguage`. Over time, the Gemini prompt includes a preferences block so explanations gradually feel tailored to each user.

Rough shape:
- **Storage:** extend `UserPreferences` in `packages/core/src/types.ts` with an optional `explanationStyle` object
- **UI:** Settings screen with a few toggles/pickers (depth, formality, focus areas)
- **Prompt:** inject preferences into the system prompt in `/api/explain` and `/api/explain/depth`
- **Iteration:** start with 2–3 simple knobs, expand based on what users actually adjust

---

## Open Design Questions
- Should the mobile app support offline flashcard review (queue cached locally, sync on reconnect)?
- Should theme (Forest/Slate/Paper) carry over exactly, or design a mobile-native dark/light theme?
- Push notifications for daily review reminders — Day 1 feature or later?
- Should saved cards sync instantly or batch sync?

---

## Key Resources
- Expo Router docs: https://expo.github.io/router/
- EAS Build (App Store): https://docs.expo.dev/build/introduction/
