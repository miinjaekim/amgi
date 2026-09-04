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

**Mobile** — Forest / Sonokai / Paper / System, same four as web
(`apps/mobile/src/context/ThemeContext.tsx`, list in `src/theme.ts`, rendered by
`app/settings.tsx`). The `slate` id is Sonokai here too, for the same
stored-preference reason.

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
