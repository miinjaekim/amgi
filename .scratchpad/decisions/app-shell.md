# Decisions: App shell

Navigation, titles, mode names, onboarding, help, naming. Newest first. Indexed from
[status.md](../status.md).

## Settings is a list of rows, each pushing its own screen (2026-10-04)

Mobile settings was one screen of ten stacked sections. The user: it "feels
overwhelming … a huge list. I'd rather a list that I can skim through, and if
there's something I want to change, I click into it for more details", as
Claude, Instagram and iOS Settings do. Built for mobile in PR #180 and for web
in PR #181. Mobile is a list of screens; web is a menu and a modal (below).

- **The list is the account, then three groups split by thin rules**:
  *Switch mode* · Languages · Appearance · Pronunciation · Reminders — then
  Your data · About — then Account, last and alone. Settled with the user,
  after Claude's account menu: rows with leading icons, the destructive
  actions furthest from the rows tapped often.
- **Navigation only.** Every control moved as it was, into the screen for its
  row. Hanja partition still shows only on the Hanja deck and Reminders only
  signed in.
- **Languages holds four things** (study language, your languages, app
  language, hanja partition) because they are one subject to a user, even
  though they are four settings in the code.
- **Switch mode leads the first group and shows the current mode.** It is the
  one row that opens a sheet instead of pushing. First, because the mode
  decides what the rows under it mean: Appearance offers the current mode's
  themes. Its own group above the others was the alternative, rejected because
  it would give the rarest action in settings the most prominent slot.
  ⚠️ The row is a third visible door, not the first: the swap icon on the
  Progress header has opened the same sheet since 2.0.0.
- **Switching from settings clears the stack first.** `switchMode` replaces,
  and settings is pushed above the mode, so a bare replace would leave the old
  mode one swipe back. Every settings route also carries `?mode=`, which is
  how the sheet knows which mode is current out there and how the theme stays
  the mode's.
- **Flat routes on the root stack**, `settings/<name>`, rather than a nested
  navigator. Web uses the same names.

Web, in PR #181:

- **⚠️ Web is not mobile's list. A `/settings` route built row for row like
  mobile's was built and rejected the same day.** The user, on seeing it:
  "everything for the settings is too small and doesn't feel native to web …
  we've taken what we've had for mobile and just applied it directly to web."
  This reverses "route, not modal", which had been settled that morning. What
  the platforms share is the idea (skim the sections, open one), not the
  layout.
- **The flow is Claude's**, from the user's screenshots: the account button
  opens a small menu; its Settings row opens a large modal with the sections
  down the left and the chosen one on the right, each setting a full-width row
  with its control at the end.
- **The menu**: the email, then Settings · Languages · *Switch to Munli*, then
  Sign out alone. **The mode row is a one-click toggle**, on the user's call:
  it first unfolded a list of the two modes, which was a second click to make
  the only choice there is and pushed the menu upward as it opened. It names
  the mode it goes to. With a third mode it would cycle, which is when a list
  earns its place back. The popover used to *be* the settings screen and had needed a
  scroll bound since 2026-09-09; a menu this short cannot overflow, so the
  bound is gone. Languages has its own row because on a narrow screen it is
  the only way to switch decks; it opens the modal on that section.
- **Four sections where mobile has seven screens**: General (theme,
  pronunciation speed), Languages, Your data (export, privacy policy),
  Account. A pane that size holds more, and six thin panes would be the
  mobile shape again.
- **A modal also answers which mode's settings these are.** It opens over the
  page you are on, so the path still says the mode and the theme picker offers
  that mode's themes. The rejected route had to be mounted twice (`/settings`
  and `/munli/settings`) to get the same thing.
- **On a phone-width browser the modal is full screen**, with the sections in
  a strip across the top.

## Onboarding does it once for real (2026-10-04)

The answer to *Onboarding is not a checklist* below, scoped with the user and
built in PR #178. After the three language questions, first run walks through
one real lookup, full screen and before the app: a word, the explanation from
`/api/explain` (the route Learn calls, never a second prompt), the card it
becomes, one flip, one rating, the packs for that language, then sign-in. It
replaces the tour card. Munli is left out. Existing users see none of it.

Four calls the user made on a proposal, each against alternatives:

- **Review timing is shown by rating the card once.** Review's own four
  buttons, answered with the day the scheduler gives and the same card asked
  the other way round. Rejected: a timeline strip of intervals (a diagram, not
  something you do) and a sentence (the telling the 2026-08-02 entry rejected).
- **Packs are the real list**, as the Packs page shows it, not tappable.
  Rejected: tapping through to a pack, which sends people past sign-in, and
  showing sample words, which is a curated list needing approval per language.
  A language with no packs has no packs screen.
- **The card is kept only by an account set up in this flow**, with its
  rating. An existing account keeps its own languages and cards and gets
  nothing added. *Not now* drops the card. Rejected: holding it on the device
  until a later sign-in, which needs stored state and produces a card the user
  may not remember making.
- **Skip drops the card and carries on to packs and sign-in**, and a lookup
  silent for 15 seconds becomes a retry screen. Rejected: skip ending setup
  outright, since prompting sign-in was the original ask.

**The suggested words are Learn's existing example chips**, one per language,
chosen to be in the study language, not a starter word, and single-meaning
when run through the route (`SETUP_WORDS`). Swapping one means re-running it:
`sobremesa` and 배 both return the meaning picker.

## Amgi's titles name the study language; Import removed, Export to Your data (2026-09-25)

**The chip Munli got the same day now ends every Amgi title row too**: Learn
(mobile only, since web's Learn has no title), Review, Packs and My Cards.
`PageHeader` shows it unconditionally on both platforms. Mobile's component is
`StudyLanguageChip` now, no longer `MunliLanguageChip`. Neither Progress has
it: Munli's has its own switcher, and Amgi's covers every language.
**It's a label, not a switcher.** It was briefly a dropdown. The user tried it
on a phone, called it overkill, and switching stays on Progress.
⚠️ On phone-width web the top bar already shows the study language, so the
chip repeats it. Munli's web pages already did this before the change.

**Import is gone.** It never imported a file: it ran pasted words through
Learn's lookup. It was briefly renamed "Look up a list" and moved to Learn, and
then the user removed it outright. Pack-creation features planned for later
will cover bulk-adding, so this would have been a second way in.

**Export moved to Settings → Your data, and now takes everything**: every
language, archived cards included (`fetchAllCardsForExport`, then core's
`cardsToCSV` / `cardsToAnki`). It used to export whatever My Cards was
filtered to. The move is what forced the scope change. The privacy policy and
the delete-account warning both say "take a copy first", and a copy that
misses a removed language or the archive isn't a copy. The CSV gained a
Language column, and the Anki file puts each language in its own subdeck
(`Amgi::Korean`). Both privacy pages point there now (last updated 2026-09-25).
The file builder is shared, so the two platforms can't drift again. They had
already drifted over how they found a card's study side.

## The modes are named in the reader's language, and 2.0.0 (2026-09-23)

**Two calls made while cutting the build**, both the user's.

**The mode names are translated.** A Korean interface says 암기 and 문리; every
other one says Amgi and Munli. `modes.ts` had carried this as an open question
since the mode shipped — it said the names were not translated, that "Amgi"
rendering as "Amgi" in a Korean interface was the precedent Munli followed, and
that a Korean 문리 was the user's call. It is now answered.

⚠️ **The question was only about Munli, and both names had to move.** The
switcher lists the modes as rows, one above the other: "Amgi / 문리" reads as two
products from two companies. A name is localized here or neither is — which is
why answering a question about one name changed two.

**What this does not touch** is `Amgi · 암기`, the document title and the welcome
line. Those are bilingual on purpose: they greet a reader *before* the interface
language is known. The mode names are read by someone already inside the app,
who has answered that question. The same split governs the TestFlight copy —
the Korean description still opens "Amgi는 언어 학습용 플래시카드 앱입니다",
because that names the product, and only the mode bullets say 암기 and 문리.

The shape is `nameKey: TranslationKey` replacing `name: string`, so the compiler
found all four consumers rather than a grep: web's `SideNav`, `ModeSwitcher` and
Munli's home, and native's `ModeSwitcherSheet`.

**The version is 2.0.0, not 1.8.0.** The recommendation here was 1.8.0 and the
user chose 2.0.0; the reasoning for the number is that Munli makes this two apps
in one, and the version is what a tester sees. ⚠️ **What was argued against it,
recorded so the cadence change is not mistaken for a slip**: the version had been
a build-batch counter, one minor per build from 1.3.0 through 1.7.0, and it never
expressed how large a batch was; and 2.0.0 is spent on a build where nothing has
been opened on a device. The counter-argument is that a beta with no public 1.0
has no launch number to protect.

## Mobile navigation, and verdicts per language (2026-09-04)

Four of the six mobile-UI-redesign items shipped together. Three of the calls
behind them are worth keeping; the fourth is a data decision that cannot be
reopened for free.

**The fifth tab is Progress, and Settings left the bar.** The ask was framed as
a "Profile" tab. Progress is the better name on three counts: it names the
screen rather than the account it belongs to, `navProgress` already existed in
both locales so it cost no new copy, and it makes mobile's fifth tab and web's
fifth sidebar item the same word for the same thing — closing a parity gap
rather than opening one. The account block became a header row on that screen,
not its subject. What actually drove the swap is reachability: `/progress` was
reachable only from the streak badge, which renders only while `streak > 0`, so
**breaking a streak hid the screen that would have told you**. Settings, by
contrast, is visited a handful of times ever and now sits behind a gear.

**Review is the initial route.** The order is Review · Cards · Learn · Packs ·
Progress, and the decision that mattered was not the order but what a cold open
lands on — the first tab is the app's own answer to "what is this for", given
on every launch, and the answer is *remember*. Lookup is intent-driven and one
tap away; reviewing is what a returning learner skips when it isn't in front of
them. ⚠️ **`unstable_settings.initialRouteName` is what enforces it.**
Declaration order sets the bar only; `/` still resolves to the tab group's
`index`, so without that export the bar reads Review-first while a launch still
opens on Learn. Web was deliberately **not** reordered: `/` is Learn there, and
a vertical sidebar has no leftmost, so "first" makes less of a claim.

**Verdict counts moved inside `byLanguage`, before the screen that wants them.**
`again`/`hard`/`good`/`easy` were whole-day, which made retention per language
underivable. A daily rollup keeps only what it counted in advance and cannot be
backfilled, so the choice was not "now or later" but "from today or from
whenever someone asks" — every day it went unshipped was a day permanently
without the number. Shipped ahead of any surface for it. Retention counts three
of the four buttons (`hard` is a recall that hurt, not a miss, matching
`getNextReviewData`, which resets only on `again`), and `retentionRate` returns
`null` rather than `100%` for a slice with no verdicts so a pre-2026-09-04 day
reads as *not recorded* instead of *perfect*.

**The one-tap language switch confirms before it moves your native language.**
`setStudyLanguage` runs `resolveNativeLanguage`, so choosing the language Amgi
currently speaks to you in relocates your native language and changes the whole
interface. That is defensible behind a settings screen and alarming from a chip
in a header. The alternative on the table — dropping your own language from the
quick list — was not taken: it removes a legitimate choice to avoid explaining
it. The confirm lives in the shared `StudyLanguageList`, so **settings inherited
a guard it never had**, which is the argument for sharing the list at all.

⚠️ One thing this pass did **not** do, deliberate and still in
[backlog.md](../backlog.md): per-context pronunciation speed. The shareable stats
asset that sat beside it here **shipped 2026-09-07** — see the two Decisions
entries above it.

## Skeletons stop at the three that shipped (2026-08-06)

The long tail is **cancelled, not deferred** — deck and drill screens, the writing
panel, and the web port that parity argued for. The three in PR #80 were picked
because they were the worst: a cold launch opening on a full-screen spinner with
nothing on it, and the two longest lists. Those are fixed. What was left is the
tail where the wait is already short enough that a shaped placeholder and a
spinner are the same experience, and each one is still a real diff to write and
maintain against a layout that changes.

`SkeletonBar` / `SkeletonGroup` / `SkeletonRows` **stay** in
`apps/mobile/src/components/Skeleton.tsx` — they're in use, and a fourth case is a
composition away if some screen turns out to load slowly enough to earn one. That
is the reopen condition: **a measured slow load on a specific screen**, not
coverage for its own sake. "Web has no skeleton component" is not by itself a
reason to build one; parity is about what a user can do, not about which
primitives each platform owns.

_In-button spinners were already excluded and remain so — there the question is
whether the press registered, which a spinner answers and a skeleton doesn't._

## Contextual tips: cancelled, pull help is the answer (2026-08-04)

Dropped from the backlog, not deferred. The "?" shipped in PR #74 on Learn, Packs
and Review **is** the answer to contextual help: it's pull, so it needs no record
of who has seen what — which was the item's only hard problem.

The surfaces the old item still listed as unexplained — drill, export, archive,
and the Cards page's two filter axes — get another "?" if they turn out to need
one. That's a small addition to an existing pattern, not a feature to carry on a
list. **Reopen only for a genuinely *pushed* tip**, which brings back both costs
at once: somewhere to store "seen tip X", and a per-tip trigger that must not
fire before that feature exists for that user. Nothing observed so far justifies
either. Sits with *Onboarding is not a checklist* below: the fix for "onboarding
is just text" is never another widget describing the app.

## Onboarding is not a checklist (2026-08-02)

Built, then rejected — measured, not guessed. The complaint was fair (the tour
card only *names* the four surfaces), but a three-step card on the Learn empty
state was the wrong answer twice over:

- **It occupied Learn permanently** until the loop closed. Learn is the surface
  [vision.md](../vision.md) most wants out of the way; a progress tracker above the
  search field is the opposite.
- **It was still telling, not showing.** Ticking a box narrates what you just
  did. That was the same objection the checklist was *meant* to answer — so the
  lesson is that the fix for "onboarding is just text" is not a different widget
  describing the app.

Whatever comes next should teach inside the flow and not live on Learn. The
derived-signal machinery was the good part (`cardCount > 0`, `lastReviewDate`
— no stored state) and is at `ba9a844` in the reflog of
`feat/onboarding-first-run`. What shipped: two setup questions plus a one-card
tour, and that's where onboarding rests.

## Naming and audio (2026-07-23 → 2026-07-25)

- **The app keeps the name "Amgi."** Whether 암기 still fits as the app grew past
  Korean was weighed; the answer is yes. Settled — don't re-raise it as growth
  advice. A domain can be bought against the current name whenever wanted.
- **`cmn-TW-Wavenet-A` stays** for Traditional Chinese. Samples were listened to
  against `cmn-CN-Chirp3-HD-Charon` and accepted. `cmn-TW` has no Chirp 3: HD voice
  at all, so this trades voice quality for a Taiwanese rather than Mainland accent.
  The accent won.
- **A single kana may sound different from the rest of its deck.** Single
  characters route to a Neural2 voice while longer text uses Chirp 3: HD, so the
  speaker audibly changes between a tile and a sentence. Correctness beat
  consistency; moving Japanese and Korean wholesale to Neural2 would cost quality
  on longer text. **Not a consistency bug** — if it resurfaces it's a re-decision.
- **No OTA.** See Known Issues and [tech-stack.md](../tech-stack.md).
