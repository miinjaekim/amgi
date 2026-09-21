# UI/UX

The visual and interaction layer. For *why* the product is shaped this way, see
[vision.md](vision.md).

## Design system

- Background: `#173F35` · Muted: `#418E7B` · Text: `#E9E0D2` · Highlight: `#EAA09C`
- Font: Source Code Pro (mono)
- Style: minimal, focused — inspired by Monkeytype

## Themes

**Each mode has its own set, and they share no ids** (2026-09-21). Amgi offers
Forest / Sonokai / Paper; Munli offers Suisei / Shoko / Godspeed. Both end with
System. The palette is the fastest answer to "which mode am I in" — faster than
reading a tab label, and it lands in the same frame the navigation does — so a
theme offered by both modes would make the switch something you verify rather
than see. `packages/core/src/themes.ts` owns which mode offers what, both
platforms' storage keys, and the `system` mapping; the colours themselves live
per platform and are duplicated by hand.

- **Amgi** — Forest / Sonokai / Paper / System, default Paper, system → Sonokai
  (dark) / Paper (light). Sonokai keeps the `slate` id it inherited from the
  indigo palette it replaced, so stored prefs and the system mapping still
  resolve; only the label moved.
- **Munli** — Suisei / Shoko / Godspeed / System, default Shoko, system → Suisei
  (dark) / Shoko (light). All three are Monkeytype palettes, as Sonokai and
  Paper were, and each keeps its source `bg` exactly. What is rebuilt is
  everything else: Monkeytype's `sub-alt` sits *darker* than its background
  while a card here sits above one, and its `main` is an accent for one line of
  typed text rather than a colour that carries buttons and links. So surface /
  border / muted are OKLCH steps off `bg` at the distances Forest, Sonokai and
  Paper already use, and `highlight` keeps its source hue at a snapped
  contrast — Shoko's `#81c4dd` reaches 1.33:1 on its own background and had to
  come down to 5.64:1. Suisei's orange `sub` is the one signature colour with
  nowhere to go: as `muted` it would put orange on every caption and hairline in
  the mode, so it is left out rather than spent badly.
- Every heat ramp was generated and checked the same way the Amgi three were —
  see the note on `Palette.heat` in `apps/mobile/src/theme.ts`.

**The native tab bar is thin glass** — `BLUR_INTENSITY` 40 in
`FloatingTabBar.tsx`, with a hairline in `border` carrying the edge. The blur was
72 and no border, which over a light palette read as a slab sitting *on* the page
rather than floating above it. The hairline is what lets the fill go this faint
without the bar losing its shape over a busy card. One number, all themes — a
per-theme intensity would be chrome that changes shape as well as colour.

⚠️ **Chrome that sits *on* the background asks `THEME_SCHEME`, never an id.**
The native tab bar picked its blur tint with `resolvedTheme === 'paper'` — true
while Paper was the only light theme, and wrong the moment Shoko and Godspeed
arrived, since both are light and both got a dark frosted slab over a pale
background. `themes.test.ts` now cross-checks `THEME_SCHEME` against every set's
`systemDark`/`systemLight`, so a new theme cannot answer wrong unnoticed.

**Each mode remembers its own choice**, under its own key on each platform
(`THEME_STORAGE_KEYS`). Picking Godspeed in Munli must not move Amgi off Paper;
the repaint on switching *is* the feature.

**The theme follows the route, because the mode does** — see `modes.ts`. Nothing
holds "the current theme" for the app: both `ThemeContext`s read the path, pick
that mode's set, and read that mode's key.
- Web applies in a **layout** effect, not a passive one: a client-side crossing
  of `/munli` would otherwise paint one frame of the mode you just left.
- The pre-paint inline script in `apps/web/src/app/layout.tsx` now reads the
  mode off `location.pathname` before choosing a key. It still also carries
  sidebar-collapse. Don't move this logic into a component — and keep its
  inlined ids and prefix test in step with `THEME_SETS` and `modeFromPath`.
- ⚠️ **Settings is the one screen outside every mode's tree**, and it holds the
  picker. On native it is pushed to `/settings` from every mode's
  `ProgressHeader`, which puts the mode in the route as `?mode=`; `modeForTheme`
  consults that param *only* where the path itself names no mode, so a stale
  param can never drag the palette off a Munli screen. On web there is no
  settings route — it is a popover, so the path never leaves the mode.

## Navigation

- **Both platforms carry the same five surfaces** — Learn, Review, Cards, Packs,
  Progress — but **not in the same order, deliberately**. Native reads
  **Review · Cards · Learn · Packs · Progress**; web's sidebar keeps Learn first
  because `/` is Learn and a vertical list has no leftmost, so "first" makes
  less of a claim there.
- **The first native tab is the initial route**, which makes it the app's answer
  to "what is this for" on every cold open — hence Review. `unstable_settings`
  in `(tabs)/_layout.tsx` is what actually sets it; declaration order only sets
  the bar, since `/` still resolves to the group's `index`.
- The label is "Packs" (`navDecks` → 단어팩) but the **route is `/decks`** — the
  rename was a copy change, not a move. "Packs" rather than "Decks" is
  deliberate: it sits next to Cards, and calling both a "deck" invites an
  Anki-style comparison neither one is. See the reversed `/decks` decision in
  [status.md](status.md).
- **The nav is about to become per-mode** (planned 2026-09-21, nothing built).
  The five surfaces above are *Amgi's* nav; Munli, the grammar mode, gets its
  own set, reached by holding the last tab — Progress on native, the sidebar's
  bottom button on web — or from the mode button beside the gear on any
  Progress tab. **Every mode uses the same shell**: same tab bar, same
  Progress-tab header (`ProgressHeader`, shared). Only the first tabs and what
  Progress measures change. Munli's are Practice · Tables · Writing · Topics · Progress — mirroring
  Amgi's Review · Cards · Learn · Packs · Progress slot for slot, with
  Practice the initial route for the reason Review is Amgi's.
  **Practice mirrors Review's three states on one screen** — a picker of rows
  with due counts, a setup screen, then a session whose queue is fixed at Start
  and which *ends*. Writing is not in it: it diagnoses rather than practises.
  **Topics is the catalogue** (Munli's Packs) — one row per grammar topic, each
  opening a screen that says what is practised *and* shows the tables, which is
  the lookup the pack browser never had. **Tables is the inventory** (Munli's
  Cards) — every table in the practice set with its state.
  ⚠️ **Progress is deliberately last in both**, because the switch gesture is on
  the last tab and should not move between modes.
  Web keeps its own asymmetry, as it already does for Amgi: `/munli` is a
  landing page listing the tools, because web navigates by sidebar. **A mode is a route, not a state**: `(munli)` beside
  `(tabs)` on native, a `/munli` prefix on web, which is what keeps the
  pre-paint script from having to learn about it. Scoped in
  [backlog.md](backlog.md); the reasoning is in [vision.md](vision.md).
- **Settings is not a tab** (2026-09-04). On native it is a pushed screen behind
  the gear on the Progress header; on web it is a popover. Nothing deep-links to
  it on either.
- **Web desktop** — fixed left `SideNav`: logo, nav, streak, study-language
  chip, user/settings popover. Collapsible to an icon rail, state persisted.
- **Web mobile** — top header + bottom nav. Nav icons shared with the sidebar
  via `nav-items.tsx`.
- **Native** — Expo Router tabs with a custom `FloatingTabBar`. The bar is
  **icon-only**, so position and glyph are the only affordances a reorder has —
  labels exist for screen readers only. Localized.
- Settings live in a shared `SettingsMenu` on web so the sidebar popover and the
  mobile header render the same thing. The **study-language list** is shared the
  same way on both platforms (`StudyLanguageList`), because it is offered from
  two places on each and a switch that behaves differently depending on where it
  was made is one nobody trusts.
- **Changing study language to your own native language moves your native
  language**, and therefore the interface language — `resolveNativeLanguage`.
  Native confirms before that one switch; web does not yet.

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

- ~~Mobile themes: add System (follow OS) to match web?~~ **Answered in code** —
  `THEMES` in `apps/mobile/src/theme.ts` carries all four, `system` included.
- ~~What does onboarding look like beyond the language modal?~~ **Answered
  2026-08-02 for first run**: one card naming the four surfaces, as step 3 of
  the setup modal. A *guided first search* — running an example lookup for you
  end-to-end — was the considered alternative and was not taken; it is the most
  to build and the most to get wrong on a surface the user hasn't asked anything
  of yet. **Closed entirely 2026-08-04**: contextual tips were cancelled — the
  "?" pull help on Learn, Packs and Review is the answer, and any surface still
  needing explanation gets another "?" rather than a pushed tip. See Decisions
  in [status.md](status.md).
- **Progress is the one tab that doesn't say its own name.** Learn, Review,
  Cards and Packs each open with a title; Progress opens with the account
  header instead — avatar, display name, language chip, gear. That was
  deliberate (the account block had to land somewhere once Settings left the
  bar, and a title above it would push the data down a line), but it does mean
  the only label is the tab glyph, and the bar is icon-only. Leave it, or give
  it a title and move the account row under it?
- **The "?" help is on Learn, Review and Packs but not Cards or Progress.** Not
  an oversight — those two have no help copy written. Worth deciding whether
  that stays the answer now that Progress is a tab rather than a screen you
  reached on purpose from a streak badge.
- Packs: should section themes (verbs / familiar-words-new-meanings /
  adjectives / nouns) surface as filter chips, or stay an editorial convenience?
- Daily-draw UX for packs: swipeable word feed, checklist, or "show me N I
  haven't added"?
