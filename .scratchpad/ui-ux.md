# UI/UX

The visual and interaction layer. For *why* the product is shaped this way, see
[vision.md](vision.md).

## Design system

- Background: `#173F35` · Muted: `#418E7B` · Text: `#E9E0D2` · Highlight: `#EAA09C`
- Font: Source Code Pro (mono)
- Style: minimal, focused — inspired by Monkeytype

## Themes

**Web** — Forest / Sonokai / Paper / System.
- System follows the OS light/dark preference, live via `matchMedia`.
- Sonokai is the dark palette (replaced the old indigo Slate; it keeps the
  `slate` id so stored prefs and the system mapping still resolve).
- A pre-paint inline script in `apps/web/src/app/layout.tsx` applies the theme
  and sidebar-collapse state before first paint — this is what kills both the
  Forest flash and the sidebar expand-flash on load/hard navigation. Don't move
  this logic into a component.

**Mobile** — Forest / Slate / Paper (`apps/mobile/src/context/ThemeContext.tsx`,
labels in `app/(tabs)/settings.tsx`). No System option yet — see open questions.

## Navigation

- **Web desktop** — fixed left `SideNav`: logo, nav, streak, study-language
  chip, user/settings popover. Collapsible to an icon rail, state persisted.
- **Web mobile** — top header + bottom nav. Nav icons shared with the sidebar
  via `nav-items.tsx`.
- **Native** — Expo Router tabs with a custom `FloatingTabBar`; tab labels and
  accessibility labels are localized.
- Settings live in a shared `SettingsMenu` on web so the sidebar popover and the
  mobile header render the same thing.

## Copy & localization

- EN + KO via `packages/core/src/i18n.ts`. `t()` supports `{token}` interpolation.
- Korean strings favor natural phrasing over literal translation — a literal
  render of an English string is a bug, not a starting point.
- The language setup modal's step 2 is localized to the *chosen native
  language*, including the names of the study languages themselves.

## Interaction details worth preserving

- Review card body reserves `min-h-[14rem]` so "Show answer" and the rating grid
  share one top anchor — without it the buttons jump on reveal.
- Depth and examples stream with a typewriter animation and a `▎` cursor glyph
  (both web and native).
- `PronounceButton` sits next to the study-language term in: search explanation
  card, save modal, review (both reveal states), and card detail.

## Open design questions

- Mobile themes: add System (follow OS) to match web, or keep the simpler
  three-option set?
- What does onboarding look like beyond the language modal — tooltip hints, or a
  guided first search?
- Packs: should section themes (verbs / familiar-words-new-meanings /
  adjectives / nouns) surface as filter chips, or stay an editorial convenience?
- Daily-draw UX for packs: swipeable word feed, checklist, or "show me N I
  haven't added"?
