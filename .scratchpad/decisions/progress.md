# Decisions: Progress

Daily rollups, the streak, the charts, the shareable stats image. Newest first. Indexed from
[status.md](../status.md).

## A chart card, and the hero that has to agree with it (2026-09-23)

**The ask**: share a chart as an asset — the last of the three Progress items
scoped 2026-09-15. The backlog item had done most of the thinking already; what
was left were four calls and one thing it had flagged as unknown.

**Which chart: the one on screen.** ⚠️ **The first pass answered this wrong,
and it is the mistake worth keeping.** The question was put to the user as
"which chart does the asset draw", and the answer — cards added, as bars — was
given about the *per-language* detail charts, which have one measure each and no
mark toggle. The user then chose a different home for the button: the
dashboard's weekly chart, which plots **either** reviews or cards added, as
**either** bars or a line. Those two answers were taken as independent and they
were not. What shipped was cards-added bars under a button sitting on a Reviews
line chart, which is a different picture wearing that button, and the user
caught it immediately: *"i expected a copy of the Reviews bar/line chart or the
Cards added bar/line chart, but i just get another calendar grid"*.

**The general lesson**: an answer about *what to draw* is only as good as the
surface it was asked about. Moving the entry point moved the question, and
nothing re-asked it.

**So the measure and the mark travel.** `ShareChart` carries both series over
the same buckets — they cost one pass over rows already fetched — and
`ShareChartOptions` says which of them the card draws and how. The hero follows
the measure, because a big number above a chart is read as the chart's own
total: reviews chart, reviews hero, and the language line comes back with it
(`languages` *is* the languages reviewed); cards chart, cards-added hero, no
language line, and reviews drops to a tile.

**The second half of the same bug: the gate.** `hasShareableChart` asked only
about cards added. A reader looking at a full Reviews chart who had added
nothing that month had *every* chart card filtered out, so the Share button on
their chart opened the carousel on the 30-day calendar — the "another calendar
grid" in the report. It now takes the measure it is being asked about.

**Which series, originally: cards added, as bars.** The user's call, from three
offered, and still the default. The
learned curve was the alternative and costs more than it looks: it needs the
all-time `learnedNow` anchor, which the mobile share screen does not fetch and
would have to buy a read for, and `buildLearnedSeries` is `null` before
2026-09-06 — so over every window but seven days it would be withheld anyway
until October. Cards added is honest over every window the tab offers, because
`newCards` and `packCards` have been written since rollups began.

⚠️ **The line mark survives satori, and that was checked rather than assumed.**
The item warned that `next/og` is flexbox-only and that the line "may not
survive it". It does: satori handles an inline `<svg>` by serializing the
subtree to a `data:` URI and rasterizing it as an image (`Ks()` in the compiled
bundle), and `ti` maps `strokeWidth` to `stroke-width` on the way, so a
React-shaped `<polyline>` and `<circle>` come out right. Three rules follow:
give the `<svg>` an explicit `viewBox` and numeric `width`/`height`; put the
geometry in **absolute pixels**, since there is no percentage to resolve
against; and keep every label outside it, because **`<text>` throws outright**.

That check was made for the first pass, which then drew bars anyway. It is what
made the fix cheap when the mark turned out to have to travel — the finding was
already written down, and only the drawing was missing.

**The source filter does not travel.** The user's call. The detail screens can
filter the same chart to looked-up or pack cards; the shared asset is always the
total, which is the figure the dashboard tile and every other share card show.
One less parameter, and no shared image can mean something narrower than its
label.

**Where it is offered: the weekly chart's own title row**, the user's call —
the row that already carries Bars / Line. Web hands `ShareStatsButton` in as a
node so the chart does not learn about sharing; mobile pushes `/share` with a
new `open` param naming a card by id, beside the `range` param the range row has
always sent. The carousel shows **chart cards plus the existing cards**, charts
last, so a reader arriving from the range row still lands where they always did.

⚠️ **A new variant stayed backward compatible by construction.** `bd`, `c`,
`cm` and `mk` are sent *only* for `v=chart`, so a window card's URL is
byte-for-byte what it was; `cm` and `mk` are omitted at their defaults, so the
shortest URL and an absent parameter mean the same picture; and `readVariant`
reads anything unrecognised as `window`, so a build older than this card keeps
rendering what it always did. And the grain is **carried,
never derived** — `chartBucketDays` is the fallback for a URL that omits `bd`
and nothing more, because deriving it would change what every already-installed
build's links mean the day `DAILY_CHART_MAX_DAYS` moves.

## ⚠️ The stats image had nine glyphs it could not draw (2026-09-23)

Found while checking whether the chart card's labels were in the subset, by
reading the `cmap` rather than by looking at an image — which is the only way it
*could* have been found.

**What was wrong**: the embedded Noto Sans KR subsets held 122 codepoints, and
the route draws strings needing nine more — 담 은 (「담은 카드」, the cards-added
tile, added 2026-09-12), 새 로 힘 and 시 분 (「새로 익힘」 and 「공부 시간」, and
every study-time value), and the `N` of "Newly learned". Both weights, the same
nine.

**Why nobody saw it.** `fonts.ts` said a missing glyph "renders as nothing,
*silently*". It usually does not: `ImageResponse` passes satori
`loadDynamicAsset`, which detects the script of any segment the given fonts
cannot draw and **downloads a face for it from Google Fonts at render time**. So
the labels appeared, at the cost of a network fetch on the share path and of
rendering as nothing whenever that fetch is slow, blocked or offline. Worth
knowing for its own sake: a `fonts` option **replaces** the bundled Geist rather
than adding to it, so Latin is no safer than Hangul here — the missing `N` and
the missing 새 were the same bug.

**The repair**: subset regenerated to 138 glyphs from an audit of what the route
actually draws — a fixed list of keys, not "every `share*` value", since
`shareTitle`, `shareChoose`, `shareBack`, `shareNothingYet` and `shareFailed`
are chooser strings that never reach a canvas. `fonts.ts` now carries that list,
the corrected account of what a missing glyph does, and a note to check both
weights against the same set.

## The streak chip and the Progress tab kept two copies of one number (2026-09-15)

**Found by the user, from a three-review gap**: the chip on Learn and Review
read 202 where the Progress tab's bar for today read 205. The instinct was that
these are two different measures — cards reviewed versus reviews — and that
distinction is real *in this codebase*, but it is not what these two numbers
were. **They are the same unit and should have been identical.**

`recordReview` fires once per rating, at one call site per platform, and makes
**two independent fire-and-forget writes**: `recordProgress` (a `merge:true`
write of `increment()`, no read-modify-write) and `recordReviewStreak` (a
**transaction** on `users/{uid}`, with a swallowing `.catch`). `advanceStreak`
does `reviewedToday + 1` and is not even *given* the card or the direction, so
it structurally cannot dedupe by card. Both count directions.

⚠️ **Three drift mechanisms, and they pull in both directions** — which is why
the gap never looked like a systematic offset:

1. **A dropped streak transaction.** Rapid ratings contend on one document; a
   transaction that exhausts its retries is discarded silently while the
   rollup's increment still lands. **Chip reads low.** Three in 205 (~1.5%) is
   an ordinary fast session.
2. **`mergeStreakState` takes `Math.max`, not a sum** (`offlineReview.ts:181`)
   where the rollup *adds* across devices. The comment directly above it says
   reviews "should add up rather than one erasing the other", which `Math.max`
   does not do. **Chip reads low.**
3. **Undo reverses the rollup and deliberately never the streak fields.** **Chip
   reads high** — one per undo, for the rest of the day.

**The fix is to stop keeping two copies**, on the user's call. The chip now
reads the day rollup — the same document and field the Progress tab draws — so
they cannot disagree by construction, and undo moves the chip for free.

⚠️ **The two platforms get there differently, and the reason is the cache.**
Web subscribes (`subscribeToProgressDay`, an `onSnapshot` on today's row), which
is exact. **Mobile cannot**: the Firestore SDK's cache on React Native is
memory-only, so a listener goes blank the moment the app is offline — the one
moment a streak chip most needs to keep counting. So mobile seeds from
`fetchTodayReviews` (which replays the unsent AsyncStorage queue over the
server's copy, exactly as the dashboard does) and then moves the number in step
with each rating and undo.

⚠️ **`reviewedToday` is still written and still load-bearing** — it is what
`advanceStreak` carries and what the streak is computed from. It is simply no
longer *displayed*, which also makes `mergeStreakState`'s `Math.max` inert for
anything a user sees. Left alone rather than "fixed": changing a same-day merge
to add is its own double-counting edge case on re-sync, and nothing reads the
result now.

**It was also a labelling error, and that half is a real bug.** Mobile's badge
said "12 **cards** today" while counting directions — the exact noun collision
`progress.ts` warns against twice ("the two may never share an axis or a
label"). Both locales now say reviews, through `progressChipReviewsToday`.

**Hence the ⓘ.** One `StreakInfo` on web for both chips (`SideNav` and
`Header` render the same streak and would have drifted — the argument that made
mobile's `StreakBadge` shared), a `BottomSheet` on mobile. The sentence it
exists for is that a card studied both ways counts twice, so the number looks
too high until you know what it counts. It is a separate target from the chip
deliberately: the chip navigates to Progress, and one control that navigates or
explains depending on which glyph you hit is worse than two.

## The "By language" row opens a detail view, and the charts follow the range (2026-09-15)

Two of the three Progress items scoped the same day, built on
`feat/progress-language-detail`. **Three calls were the user's**, each one the
backlog had deliberately left open, and all three went to the recommendation.

**Where the detail lives: a dedicated surface, not an expanding row.** Web gets
`/progress/[language]`, mobile a pushed screen (`app/progress/[language].tsx`),
matching the share carousel's precedent. The deciding argument is what the item
asked for — *room for the charts below*. An expanding row keeps the comparison
between languages on screen, which is the genuine cost of this choice, but a
cumulative curve inside a list item on a phone is not a chart. The range travels
in the link (`?range=`, `params.range`), so the detail opens on the window being
looked at rather than making it be chosen again.

**The charts follow the range chip, bucketed by week past 30 days.** Until now
the chip governed only the calendar; the weekly chart ignored it. One bar per
day to 30, one per week at 90 and a year — so 90 days is 13 bars rather than 90,
and a year is 52 rather than 364, which is the wall the heatmap already draws
better. `chartBucketDays` is in core for `niceCeiling`'s reason: the grain
decides what a bar *is*, and two platforms disagreeing would put two different
charts under one title.

⚠️ **Bars are chunked backwards from today, never aligned to Sundays.** Week
alignment would leave the newest bar partial six days out of seven, and a final
bar that dips because the week is not over reads as a slump rather than as a
Tuesday. The cost moves to the *oldest* bar, which is short whenever the window
is not a multiple of seven (90 days is twelve weeks and six days) — the better
end to put it, since a bar carries its own date range and nobody reads a trend
off the left edge.

**Cards added is stacked, not summed.** The backlog called summing the
consistent default and stacking the more informative one; stacking turns out to
be both, because the bar *total* still equals `progressStatNewCards` exactly —
pinned by a test against `summarizeProgress`. So the dashboard tile and the
shared image keep their number while the chart can still say that Wednesday's
spike was a 474-card pack import rather than an enormous study day. A test holds
that total; without it the two surfaces could drift apart silently.

⚠️ **Neither new chart takes the mark toggle, and that dissolves a hazard the
item flagged.** `amgi_week_chart_mark` is a single key shared by both platforms,
so a second consumer would mean switching one chart silently switched another.
It never arises: a stacked pair has no line form (two series as one polyline is
a different chart), and a cumulative curve has no bar form (bars would draw each
one as its own contribution — a level read as a rate). The form follows the data
here rather than being offered, so there is nothing to remember.

⚠️ **The learned curve reaches one day further back than you would expect, and
that is not an off-by-one.** `LEARNED_SERIES_START` is `DETAILED_HISTORY_START`
**minus a day** (2026-09-05, not 09-06). The curve is walked backwards from
today's all-time count by subtracting crossings, so the value at the end of day
D needs every crossing on the days *after* D — for 09-05 those are 09-06
onwards, all recorded. There is a test pinning exactly this, because it is the
thing most likely to be "corrected" into being wrong.

**Everything before it is `null`, never 0, and the line stops.** A curve running
off the left edge into a flat zero claims nothing had been learned then, which
is the one thing the missing data does not say. Both platforms draw only the
known run and caption where it begins, or the chart would look truncated by a
bug.

⚠️ **The mature backfill guard is repeated on both detail surfaces**, rather
than assumed to have run on the dashboard. These are routes, so either can be
the first progress surface an account opens; `matureBackfillAt` keeps it
one-shot, so repeating it costs one preferences read and never a second walk.
Without it a deep-linked first visit would anchor the curve on an undercount.

**Retention stayed off, deliberately.** The verdict counters are per-language
only from 2026-09-04 and the display came off every surface on 2026-09-12; a
detail view is exactly where it would have crept back in because the data is
sitting right there. `byHour` is likewise still not per-language, so "when do
you study Korean" remains a question these rows cannot answer.

**Three follow-up calls the same day, all the user's, after seeing it.**
**Seven days joined the detail screen's ranges and is its default** — a detail
view answers "how is this deck going lately", where the dashboard is read for
the shape of a season, and it is also the one window where both charts sit
entirely inside recorded history. ⚠️ **The range hand-off was dropped to make
that possible**: every arrival is from a row on the dashboard, so an inherited
`?range=` would have meant the screen opened on 90 every time and seven days
would never have been the default.

⚠️ **The stacked bar was reversed one day after it shipped**, for legibility
rather than taste: at 52 bars each band is a few pixels, and the two colours are
steps of one ramp because the ramp is what is theme-safe on both platforms. It
is a **source filter** now — nothing selected means the total, so the resting
state still equals `progressStatNewCards` and the consistency argument that
justified stacking survives intact. Tapping the selected chip clears it, so the
control is its own reset and needs no third chip.

**The weekly chart's title became a measure dropdown** (Reviews / Cards added),
which is the first thing to make the range row's neighbour answer more than one
question. A seven-day `buildCardsAddedSeries` buckets daily, so its rows line up
one-to-one with the heatmap cells — which is what lets both measures share the
scale, the marks, the tooltip and the labels. Session state, not a remembered
preference: the mark is how you like charts drawn, this is a question you ask
and come back from.

**The cards-added bars carry their own numbers, and the axis gave way to them**
(later the same day, on the user's ask — they were looking at the Korean chart
and wanted it more satisfying to read). **An axis exists to let a level be read
off a shape that cannot be labelled** — which is the learned curve, not this.
Labelling every bar states the same quantity *exactly*, so keeping both is two
encodings of one number. The gridlines therefore collapse to the zero line when
the labels are on. ⚠️ **The gutter stays** even with only a "0" in it: dropping
it would win ~30px of bar width and cost the left-edge alignment with the curve
directly below, which is the more valuable of the two.

⚠️ **Three constraints on those labels, and each exists for a reason that is not
obvious from the code.** `LABELLED_BAR_MAX` is keyed on **bar count, never the
window** — the grain changes underneath it, so 7 days is 7 bars and 90 days is
13 weekly ones (both fit) while 30 daily bars and a year's 52 do not; rewriting
this as a range check would silently label the 30-day view into a collision.
**Only non-zero bars get a number**, because cards added is a *sparse* series —
most days you add nothing, and a row of zeroes is noise. And a zero day keeps a
**1px stub** rather than vanishing, since an absent bar and a zero bar look
identical and only one of them is true.

**Weekday labels replaced the two end dates when a bar is a day**, matching what
the dashboard's weekly chart already does, so the two read as one family. Taken
from each bucket's own date rather than a fixed Sunday-to-Saturday run, because
these seven days end on today. A weekday means nothing on a bar covering seven
of them, so weekly buckets take dated ticks instead — see below.

**The learned curve gained a dot per point, and the axis gained middle ticks**
(later the same day, on the user's ask). Both charts now decorate their marks
individually under **one** threshold, `DECORATED_MARK_MAX` — a number over every
bar, a dot on every point. ⚠️ **It is deliberately a single constant covering
both plots**: they sit one above the other, so two constants sharing a value
would drift and the charts would change character at different windows, which
reads as a bug in whichever one changed second. It also renamed from
`LABELLED_BAR_MAX`, which had stopped describing what it governs. Dots are drawn
from `known`, so the curve and its vertices stop at the same place rather than
the dots running on past where the data does.

⚠️ **`AxisLabels` is gone, and naming only the two ends was the defect.** It said
how long the window was and nothing about where anything inside it sat — on a
90-day chart every point between the two labels was unplaceable without hovering
it. `DateTicks` spreads up to four dates instead, each positioned at the *centre
of the mark it names* rather than evenly across the width, so a tick sits under
its own data. The indices are deduped: rounding can otherwise land two ticks on
one mark on a short series. Mobile needs the measured plot width for this, for
the same reason its line does — React Native has no percentage translate.

**A fourth tile: average per day, per language** (later the same day, user's
call). It reuses `progressStatAverage` rather than taking copy of its own,
because it is the dashboard's measure narrowed rather than a different one.
⚠️ **The narrowing is the whole content of `languageAveragePerActiveDay`:
"active" means the days *this language* was studied, not the days the account
was.** A day spent entirely on Japanese is not a quiet Korean day, it is not a
Korean day at all — averaging those in would make every language look worse the
more languages you study, so the figure would be measuring how divided your
attention is rather than how much you do when you sit down with a deck. Rounded
and zero-safe to match `summarizeProgress` exactly, so the two tiles cannot come
to disagree about what the words mean.

⚠️ **The tile asked for first was "cards reviewed", and it is not a
rollup-shaped question.** Worth recording, because the gap is easy to notice
again and expensive to re-derive. Distinct cards **cannot be summed across
days**: a per-day distinct-card counter double-counts anything reviewed on two
days, so unlike `reviewedToday` this is not a missing counter. Counting cards
whose *last* review falls in the window is the correct dedupe, and the last
review **is** recoverable — `getNextReviewData` sets `nextReview` to `now +
interval` on a pass and to `now` on a lapse. So the honest route is a stored
`lastReviewedAt` plus `uid ==` and a range filter, which needs a **composite
index on all ten card collections**, built by hand (lessons.md). **Unlike every
other counter here it would be backfillable**, from that same interval
arithmetic, the way `backfillMatureFlags` recovered maturity — so "from today or
from never" does not apply to it. Not built; the free tile was taken instead.

⚠️ **Verified by suite and compiler, not by eye.** Web is 635/635 with 20 new
assertions, both apps clean under `tsc --noEmit`, lint unchanged at 21 warnings
/ 0 errors, and `expo export` bundles — which is the check that matters most
here, since `app/progress/[language].tsx` sits beside the existing
`(tabs)/progress.tsx` route and a collision is invisible to TypeScript.
**Nobody has looked at either screen**, on a device or in a browser: the
stacked bars, the curve, the two tooltips and the Korean labels at 52 bars are
all unseen. No new native module — `react-native-svg` was already counted for
the weekly chart — so the build story is unchanged.

## The progress surfaces say what they measure, and the ramp was measured (2026-09-12)

Five items, queued and shipped the same day, on one framing from the user:
**review is about how much you reviewed and how many cards you have learned, not
how accurately you recalled them — and how long it took matters less still.**
That sentence decided three separate things below.

**Retention came off every surface, and nothing behind it changed.** The
percentage is gone from the per-language row on mobile, the tile on the image
and the `ret` parameter. The four verdicts are still written on every rating and
`retentionRate` is still exported, because a rollup keeps only what it counted
in advance: stopping the *write* would throw the history away permanently and
make the per-language split re-earn its 2026-09-04 boundary, where stopping the
*render* costs nothing to undo. ⚠️ **The route must go on tolerating `ret`.**
Mobile ships by build and the route is server-side, so an installed 1.6.0 keeps
appending it for as long as it is on the phone; it is simply unread now, and a
test pins that.

**Week alignment sits *over* `buildHeatmap`, not inside it.** The grid could not
honestly be labelled as it stood — the window starts where it starts, both
screens chunked by seven, so row 0 was whatever weekday the window opened on and
it shifted daily. `buildWeekGrid` pads to the week boundary on top. Inside would
have reached the shared image, which consumes the same cells and deliberately
does *not* align to weeks, and whose `h` parameter is one character per day
asserted on both sides of the URL. Padding is `null` rather than a zeroed cell:
a slot before the window opened is not a day nobody studied.

⚠️ **Month ticks walk days, not columns** — and this was a real bug, caught by a
test rather than by reading it. Keying off each column's first cell put August
on the 2nd and September on the **6th**, because 1 September 2026 is a Tuesday
and 1 August a Saturday, so the column holding the 1st opens in the previous
month. The label landed up to a whole column right of the month it names.

**The heatmap ramp was replaced, and this is the call the 2026-09-07 entry
deferred.** That entry left `levelColor` alone because restyling a shipped
screen is a product call; asking for the data visualisations to be improved is
that call being made. Measured, not eyeballed — the old alpha blend composited
per theme and run through the palette validator: forest **non-monotonic** (a
rest day rendered *lighter* than a studied one), empty versus level 1 at **ΔE
1.4 under deuteranopia** (4.7 normal), hue spread **131°** because blending a
pink highlight over a green ground walks the hue across the wheel, and all three
themes below the 2:1 light-end contrast floor. The new steps are generated in
OKLCH per theme: one hue, monotone lightness, adjacent ΔL ≥ 0.06, faintest step
≥ 2.36:1 on its own surface, and empty kept a **categorical** break at ΔE 20
(≥ 17 under CVD) rather than a step on the scale. Level 4 is still each theme's
exact highlight. **Web and mobile had drifted to two different ramps** — 45% vs
50% at level 2 — and now share one set of values.

**Cards learned is windowed, on the user's call.** It reads as a lifetime figure
and the windowed one is not that, but all-time is only derivable from the card
documents: nine `where uid ==` queries across nine per-language collections,
every time the tab opens, which is the exact cost `shareStats.ts` exists to
avoid.

⚠️ **Shipped withheld, and that was a defect — corrected the same day.** The
first cut reused the image's rule and returned `null` whenever the window
reached past 2026-09-06. Every range on offer is 30 days or more, so that meant
*never*: 30 days back is 2026-08-14, 90 is 2026-06-15, a year is 2025-09-14, and
the 30-day tile would not have appeared until 2026-10-05. The rule exists to
stop a quiet fortnight reading as a low score, not to hide a figure for a month.
A first correction shortened the window to the honest part and captioned it
"since 6 Sep". **That was superseded the same day, and the user's question is
what exposed the real mistake**: the interval is on every card and always has
been, so "is this card learned" never needed the rollups at all. Only "*when*
did it cross" did — and that is the sole thing the 2026-09-06 boundary governs.
The tile had been answering the harder question by accident.

**So "cards learned" is now a state, counted from the cards.** `isFlashcardMature`
reads `frontToBack.interval`, `backToFront.interval` and the pre-split top-level
`interval`, and the answer is stored as a `mature` boolean on the card.

⚠️ **A stored flag rather than a derived one, for one reason: aggregation.**
`getCountFromServer` bills per index scan rather than per document, and two
equality filters (`uid`, `mature`) are served by merging single-field indexes —
so **no composite index**, and ten collections cost ten cheap queries instead of
a read of every card the user owns. Deriving it live would have meant reading
the whole deck on every visit to a tab people open constantly.

**Three writers, one definition.** The rating write, the undo write and the
one-off backfill all call `isFlashcardMature`; three call sites each choosing
their own field set is exactly how they would drift. It is written even when
*false*, so a lapse clears the flag rather than leaving a card counted forever.
Mobile gets this through `updateFlashcardReview` alone — live ratings, ratings
flushed from the offline queue and undos all funnel through it — where web needs
it in two places because it builds its update map inline.

**And unlike a rollup, this one could be backfilled.** A card not rated since
2026-09-12 carries no flag, and long-interval cards are precisely the ones
nobody has rated lately, so the first count would have missed most of its
subject. `backfillMatureFlags` walks all ten collections once per account,
writing only the *mature* cards — a card below the line needs no flag, since
`mature == true` does not match a missing field — and records
`matureBackfillAt` on `users/{uid}` so it never runs twice. The interval is
current state sitting on the document, which is the whole reason this is
possible where a day-of-crossing never was.

⚠️ **The image loses its cards-learned tile entirely.** An all-time figure
cannot sit on a canvas where every other number names one window, and a windowed
one would wear the same words as the dashboard tile while reporting a different
number — the one thing this file says twice not to do. `summarizeProgress` still
returns `totalCardsMatured`, so a window-scoped figure can come back the day it
is given a label that says which window it means.

**It needed no console step, and that was checked rather than assumed.** The
worry was a rule constraining which fields an update may write, since `mature`
is new on ten collections and the rules are manual and not uniform. They are
scoped to *operations* — `read, update, delete` + `create`, or `read, write` +
`create` — and enumerate no fields. Confirmed live the same day: the backfill
wrote its flags and the count returned **196** on a real account, where a rule
rejection or a missing index would have thrown and drawn no tile at all.

⚠️ **The backfill has therefore already run against production data**, from a
dev server rather than a deploy, and `matureBackfillAt` makes it one-shot.
Clearing that field on `users/{uid}` is the only way to make the count
recompute if it is ever wrong.

**Per-language learned costs nothing extra**, because the count was always
per-collection — ten `countMatureFlashcards` calls whose breakdown was being
thrown away in a `reduce`. `mergeLanguageRows` now joins it to the window's
`byLanguage`. ⚠️ **The union is the point**: taking only the window's languages
would hide a deck left alone lately, which is exactly the one whose total you
have forgotten; taking only the languages with learned cards would drop one
being studied now that has matured nothing yet. A row therefore carries two
scopes — a windowed review count beside an all-time learned count — which is
fine on a screen being read and is why this is *not* on the shared image.

**The weekly chart was bars only — reversed 2026-09-12, and mobile now carries
both marks.** The original call was the user's, on the trade being named: seven
days is seven discrete counts, which is what bars are for. That entry already
recorded that the dependency was never the obstacle — Expo SDK 57 bundles
`react-native-svg` 15.15.4 and Skia — so when the user asked for parity there
was nothing to weigh. It was a form choice, and the form choice changed.

**Mobile is now the web chart's twin**: the same title, the same two marks
behind a toggle, the same `niceCeiling` scale and gridlines, and per-day detail.
What differs is only what must — the line is `react-native-svg` rather than
inline SVG, and the detail is a **tap** rather than a hover, since a phone has
no pointer to rest. The remembered mark sits in `AsyncStorage` under
`amgi_week_chart_mark`, mirroring web's `localStorage` key; web keeps its
`useSyncExternalStore` because it has a server snapshot to hydrate against and
mobile does not.

⚠️ **`niceCeiling` and `weekAxisTicks` live in core, and must stay there.** The
ceiling decides how tall every mark is drawn, so two copies drifting would make
one week look like two different weeks on the two platforms. They are the first
chart logic this project has unit-tested (`progress.test.ts`), which is worth
something on surfaces that otherwise have no tests at all.

⚠️ **The old mobile plot scaled to its own busiest day**, which guarantees
exactly one full-height bar and therefore says nothing about how big a week it
was. That — not the missing line — was the real defect behind "make them match".
One series, so the title names the measure and there is no legend. **No day is
labelled inline any more**: the sentence here used to claim the busiest one was,
which web never actually did, so the two are now honestly the same — the
gridlines carry the magnitude and a tap carries the rest.

⚠️ **A crash was caught by a grep rather than by a type.** Mobile's language bars
took their scale from `summary.byLanguage[0]`, which was correct until the list
being rendered became the *union* — a dormant language with learned cards makes
that array empty while rows still exist, so `[0].progress` would have thrown.
TypeScript does not check index access without `noUncheckedIndexedAccess`, and
neither platform's screens have tests, so nothing else was going to catch it.

**Days studied came off both surfaces** (same day, user's call). Beside a streak
it read as a second opinion on one question, and the streak is the one people
mean. `activeDays` stays in `summarizeProgress` — still data, no longer a tile —
and the route tolerates a stale `d` from an installed build exactly as it does
`ret`.

**The chooser previews what it is offering.** Each row draws the actual asset at
thumbnail size, which costs no new machinery: the picture *is* a URL, so the row
renders the same address the share sheet is about to be handed. No second
confirm step — you are looking at what you are about to post while picking it.
Web keeps its anchor (the thumbnail sits inside the `<a>`, so the no-JS download
still works) and waives `@next/next/no-img-element` deliberately, since routing
an OG render through the image optimizer to draw 80px is worse than the raw
request. **The direction this is heading is Strava's**: pick a card, see it,
post it.

⚠️ **Mobile went the whole way there the same day, because the sheet could not
work at all** (2026-09-12, user's call). Its chooser was a `BottomSheet`, which
is a React Native `Modal`, and it closed itself before calling
`Sharing.shareAsync`. **iOS silently refuses to present a view controller while
a modal is animating out**, so the share sheet never appeared, `shareAsync`'s
promise never settled, the `finally` that cleared the busy flag never ran, and
the Share button stayed `disabled` until the app was reloaded — three symptoms,
one cause. Timing around the dismissal would have been a race to lose later, so
mobile's chooser is now a **pushed screen** (`app/share.tsx`): a pushed screen is
not mid-transition when its own button is tapped, which removes the race rather
than narrowing it. Web is untouched and keeps its `<details>` of anchors.

**The preview screen offers a card per range, not per variant.** Swiping is only
worth doing over more than two things, so it draws **30 and 90 days plus
today**, opening on whichever range the Progress tab had selected. ⚠️ **The year
is deliberately not offered** (user's call): 364 cells is a wall that says less
about how you are doing lately than 30 does, and opening from the year chip
falls through to the 30-day card. So the screen needs 90 days of rows where the
tab holds only the range it shows — **one** 90-day query of its own on open, the
same shape of single indexed read the range chips already do.
`buildShareStats`'s no-reads promise is intact: what costs a read is the new
screen, not the numbers. Which cards exist is `buildShareCards` in core, tested
there, so the per-card zeroed-image gate and the ordering cannot drift between
platforms. Errors are inline and the Share button is its own retry — an `Alert`
fired during that same dismissal was subject to the very bug above.

**The card carries four tiles now, and two of them are blank until October**
(2026-09-12, user's call). Streak was the only one left after the cull earlier
the same day; it is joined by **Newly learned**, **Time studied** and **Cards
added**. ⚠️ **"Newly learned" is not the dashboard's "Cards learned"** — that
tile is the all-time count of cards past `MATURE_INTERVAL_DAYS`, which cannot
share a canvas where every other figure names one window, so this is
`cardsMatured`, the *crossings* inside the window, under a label that says so.
The rejection recorded here on 2026-09-12 named exactly that condition, and this
meets it. ⚠️ **Both it and Time studied are withheld until the window clears
`DETAILED_HISTORY_START` (2026-09-06)**: the Today card shows them immediately,
the 30-day card from **2026-10-05** and the 90-day card from **2026-12-04**. A
withheld figure is omitted from the URL rather than sent as 0, and the route
draws no tile for it — so the row is built, not declared, and a card can carry
anywhere from one to four tiles. Cards added has no such boundary and reuses the
dashboard's own `progressStatNewCards` wording, since the two count the same
thing. Tile type shrinks at three or more, because "Time studied" at 30px does
not fit the ~228px a fourth tile gets.

**The image names languages and will never split its figures by them.**
`byLanguage.reviews` goes back to the start; the verdicts inside it only to
2026-09-04 and `cardsMatured` to 2026-09-06, so a per-language number would
break the one-window rule over any window worth posting. Codes travel in the
URL, not display names, so the label lands in the reader's language; the route
filters them through `isStudyLanguage`, which also bounds what glyphs the image
can demand.

⚠️ **The font subset is a standing maintenance obligation, and it bit twice.**
It held 53 glyphs, and **every** language name in both locales fell outside it —
"Korean" wanted a `K` it did not have, 한국어 had 한 but neither 국 nor 어 — all
of which renders as nothing, silently. Two regenerations took it to 122. **The
User-Agent decides the format**: a bare `Mozilla/5.0` gets the raw TrueType
satori needs, a modern browser UA gets WOFF, and an MSIE UA gets **EOT**, which
is what the first attempt downloaded — its "magic" was a little-endian file
size. Verify the cmap covers what you asked for; do not verify by looking at a
picture. The derivation and the trap are in the header of `fonts.ts`.

**The today card is a layout, not a second pipeline.** `buildShareStats` over a
one-day window is already correct numbers for today, so `v=today` picks a
template from the same route — which it must, since mobile cannot rasterize a
view without a native module that costs a build and breaks Expo Go. An absent
`v` is the window card, so every URL an older build produced is unchanged. It
drops the calendar (one day is one square), drops Days studied (it can only read
1) and carries no study-time tile at all, per the framing at the top.
⚠️ **The shareable gate is asked per variant** — a today card on a blank day is
the zeroed image that check exists to prevent, however full the window beside
it. Web's chooser is a `<details>` of per-variant anchors rather than a button
menu, so the no-JS download that made that component an anchor survives the
choice.

**The image itself finally was verified visually** (2026-09-12) — the first
thing on this entry that has been. `next dev` serves the route, so
`curl localhost:3000/api/stats-image?…` writes a real PNG that can simply be
looked at; no build, no account, no device. Both locales, the today card and the
30-day card, one tile through four.

⚠️ **It immediately caught a bug that reading could not.** Korean writes 2h 40m
as 「2시간 40분」 — eight full-width glyphs that cannot fit the ~228px a fourth
tile gets at any legible size, so the value wrapped, grew its tile, and shoved
its own label below the other three. English never wraps and looked perfect.
The fix is a **fixed two-line box around every tile value**, so a label sits on
the same line whether or not a neighbour wrapped. The lesson generalises past
this tile: *any* label or value on this canvas has to be checked in Korean, at
the tightest column it can land in, and the check costs one curl.

⚠️ **Still unverified: the mobile screen around it.** The carousel, its paging
and the OS share sheet need a device — the standing caveat under Builds. The
calendar also needs a signed-in account with history to draw real data.

## The stats image: one window, and a heatmap ramp that measures wrong (2026-09-07)

The render half, shipped the day after its counters. The design calls are in
the commits; three things outlive them.

**Every figure shares one window, or is withheld.** An image is read all at once
and out of context, so "412 cards learned" beside "1,204 reviews in 30 days" is
taken as two 30-day figures — a lie told by juxtaposition rather than by either
number. `buildShareStats` returns `null` for a figure the window cannot honestly
cover and the image drops it, following what `retentionRate` already does with
an unrated slice. **Concretely: `cardsLearned` is `null` until 2026-10-06**, so
the image shows four numbers for the first month and five after, with no code
change. That is the design working, not a gap to patch.

⚠️ **The app's own heatmap ramp is measurably wrong, and was left alone.**
Running the palette validator against `levelColor` — which alpha-blends the
highlight over the background — found two defects. Its lightness is **not
monotonic**: the lightest studied day renders *darker* than an unstudied one.
And empty versus level-1 are **ΔE 1.4 apart under deuteranopia** (4.7 with
normal vision), so "did not study" and "studied a little" are one colour to a
red-green colourblind reader. The image ships a corrected ramp — one hue,
lightness climbing, empty put ΔE 24 below level 1, since no-data versus
some-data is a *categorical* distinction rather than a step on the magnitude
scale, and lightness is the channel that survives every kind of CVD.
**`levelColor` itself is untouched on both platforms.** It matters less there —
a dashboard cell is tappable and carries a tooltip — but it is the same defect,
and fixing it is a visible restyle of a shipped screen, which is a product call
rather than a side effect of this feature.

**Two findings about the render stack, both of which cost an hour.** Satori has
no system font and the bundled Geist has no Hangul, so Korean renders as blank
boxes unless a face is passed — and the documented way to load one,
`fetch(new URL(..., import.meta.url))`, **fails under Turbopack in dev**, where
undici refuses the `file:` URL outright. The fonts are base64 in source instead,
which is only affordable because they are Google Fonts `text=` subsets: ~10KB
each against ~5.7MB for a full weight. **Regenerate them if the image gains a
character** — a glyph outside the subset draws as nothing, silently.

And **the route's raster cannot be unit-tested**: resvg's wasm does not
initialise under vitest, so `GET` fails on the raster step regardless of its
inputs. Parsing and layout were split out and tested instead, which immediately
earned itself by catching two real bugs — a missing `w` produced a *one-day*
window, because `Number(null)` is `0` and finite so the fallback never fired;
and a 364-day window overflowed the canvas, because cell size was derived from
width alone.

## The share asset's counters, decided before its picture (2026-09-06)

The stats half of the shareable-asset item shipped alone, ahead of the render
and ahead of any surface at all. The reason is the one the item itself carried:
a daily rollup keeps only what it counted in advance, so the choice for each
counter was never "now or later" but **"from today or from never"**.

**"Cards learned" is either direction past 21 days.** Anki's convention, and the
looser of the two readings on purpose. `both` is arguably more honest — you can
recognise *and* produce it — but the review screen has a direction filter, so a
recognition-only learner would score a permanent zero, and a counter that reads
zero for a whole class of user reads as broken rather than as strict. The unit
is *cards*, so unlike `reviews` it double-counts nothing.

**`maturityChange` takes both directions, which is the whole point of it.** A
second direction reaching 21 days on an already-mature card must count nothing.
Without that check the counter would inherit exactly the doubling `reviews`
has — and the reason a new counter was needed at all is that `reviews` counts
directions and cannot be relabelled into a card count. **A lapse subtracts**, so
a window sums to a net figure: someone who forgets a word and relearns it has
not learned two cards.

**Study time is per card, not per session** — and this is the finding that made
the item affordable. It was scoped as the expensive counter, needing a session
timer that survives backgrounding, a force-kill and a phone left face-up on a
table; it would still have been wrong in all three. Anki's measurement —
question shown to rating submitted, capped at 60s — attaches to a rating that
already exists, needs no lifecycle, negates cleanly, and rides the offline queue
untouched. Both it and the maturity crossing are **free at the rating**:
`trackingFor` and `getNextReviewData` were already computed there for the write.

**`byHour` is the one addition that does not ride `COUNTER_KEYS`**, because it
is a map rather than a counter — it needs its own line in merge, negate, apply
and parse, the same four `byLanguage` gets. It is **day-level, not
per-language**: 24 keys times nine languages to answer a question that was never
per-language.

⚠️ **Undo changed shape, and had to.** It rebuilt the delta from the verdict,
which was exact only while the verdict *was* the delta's entire content. Think
time and a maturity crossing are not recoverable from it, so a rebuild would
have subtracted numbers the rating never added. `recordReview` now returns a
`RecordedReview` and `undoReview` takes it back — undo is exact by construction
rather than by two call sites continuing to agree. `reviewDelta`'s context stays
optional throughout, so a caller measuring nothing produces a byte-identical
delta to before, which is why the existing 32 progress tests passed untouched.

**What this means for reading the numbers.** `PROGRESS_HISTORY_START` is
2026-08-20 and `historyStartsMidWindow` guards *that* boundary only. These three
begin **2026-09-06** and have their own, unguarded: a window reaching back
further undercounts rather than being wrong in an interesting way. Any surface
showing them over a long window has to say which boundary it means.

## Progress is a daily rollup, and the streak stays where it is (2026-08-19)

Four calls made while building the dashboard, each of which would be expensive
to revisit later.

**Grain: one document per user-day, not one row per rating.** Every question
asked of it — which days, how much, how many new cards, habit, recap — is a
per-day question, and a year is 365 documents rather than ~20,000. The cost is
real and worth naming: a rollup discards whatever it didn't count in advance, so
time-of-day and per-card history are gone once a day is summed. Event rows can
be added *alongside* later if a question needs them; the rollup does not have to
be undone first.

**The day is per user, with the language breakdown inside it.** The habit being
tracked is "studied today", not "studied Korean today" — someone who reviews
Japanese has kept their streak. Splitting the streak six ways would punish
exactly the multilingual use the app is built for. The dashboard can still break
any day down by language.

**`reviews` counts directions, not cards** — the same thing `reviewedToday` has
always counted. This is *not* an endorsement of that number: it reads roughly
double what a learner thinks they did. It is a refusal to have two counters that
disagree about what one number means while the honest fix is still an open,
user-visible call. Fix both together or neither.

**The dashboard shows the stored streak, not one derived from the rows.** The
derived number is the better one eventually, and `deriveStreak` is written and
tested in core against that day. But the rows begin empty, so deriving it today
shows `1` to someone on a 200-day streak — and adding a fourth surface that
disagrees about the streak is the precise failure the data-freshness item exists
to stop. The swap is safe once the history is older than the longest live
streak.

One consequence to hold on to: **history begins the day this ships**. New cards
per day could be reconstructed from `createdAt`, but review history cannot be
reconstructed at all, from anything. That asymmetry is why the write shipped
ahead of the screen rather than behind it, and ahead of the data-freshness item
it nominally depends on — the dependency was always about the screen being a
fourth stale surface, never about the write.
