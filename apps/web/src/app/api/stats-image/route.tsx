/**
 * The shareable stats image — 1080×1920, the story format.
 *
 * **One implementation for both platforms.** Mobile cannot rasterize a view
 * without `react-native-view-shot`, a native module that would cost an EAS
 * build *and* stop the feature working in Expo Go, putting the whole dev loop
 * behind a 20-minute build. A route that returns a PNG is consumed the same way
 * everywhere: web links it, mobile downloads it with `File.downloadFileAsync`
 * and hands the local uri to `Sharing.shareAsync`.
 *
 * **The numbers are passed in, never looked up.** This route does not touch
 * Firestore and takes no uid. That is the privacy design, not an optimisation:
 * a route that resolved a uid would let anyone render anyone's stats, and the
 * fix is to make that structurally impossible rather than merely forbidden. It
 * also means no auth plumbing on mobile and a deterministic, cacheable
 * response. The cost is that `?r=999999` is forgeable — a vanity forgery with
 * no victim, which authentication would not have prevented anyway, since
 * anyone can screenshot a real image and edit it.
 *
 * ⚠️ **`next/og` is Satori, not a browser.** Flexbox only, and every container
 * with more than one child needs an explicit `display: flex` or it throws.
 * Inline style objects only — no Tailwind, no `globals.css`, no CSS variables.
 * And **there is no system font**: a `fonts` option replaces the bundled Geist
 * rather than adding to it, and Geist has no Hangul — so every glyph this draws
 * has to be in the subsets below. What actually happens when one is not is
 * neither a blank box nor an error, and is worth reading before changing a
 * label: see the header of `fonts.ts`.
 */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import {
  chartBucketDays, formatStudyTime, isStudyLanguage, niceCeiling, shiftDate, studyTimeTile, t,
  weekdayIndex, weekdayLabels,
  type ShareChartMark, type ShareChartMeasure, type ShareVariant,
  type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { NOTO_SANS_KR_BOLD_BASE64, NOTO_SANS_KR_REGULAR_BASE64, fontData } from './fonts';

/** Story format. Instagram, KakaoTalk and every other story surface use 9:16. */
const WIDTH = 1080;
const HEIGHT = 1920;
const PAD = 84;

/**
 * The forest palette, hardcoded.
 *
 * The image is brand collateral the moment it leaves the app, so it does not
 * follow the viewer's theme the way every in-app surface does — one look to
 * tune against a PNG rather than three, and a shared image that changes colour
 * depending on who exported it reads as a different product.
 */
const C = {
  bg: '#173F35',
  surface: '#1E5246',
  text: '#E9E0D2',
  muted: '#7FB3A1',
  highlight: '#EAA09C',
};

/**
 * The heatmap ramp: one hue, lightness climbing monotonically.
 *
 * **Not the app's `levelColor`,** which alpha-blends the highlight over the
 * background and has two defects that only matter once there is no tooltip to
 * disambiguate a cell. Its lightness is not monotonic — the lightest studied
 * day lands *darker* than an unstudied one — and its empty cell and level-1
 * cell are ΔE 1.4 apart under deuteranopia, so "did not study" and "studied a
 * little" are the same colour to a red-green colourblind reader. Measured with
 * the palette validator rather than by eye.
 *
 * `EMPTY` is deliberately far below level 1 in lightness (ΔE 24 under CVD,
 * 31 with normal vision): no-data versus some-data is a categorical
 * distinction, not a step on the magnitude scale, and lightness is the channel
 * that survives every kind of colour blindness.
 */
const EMPTY_CELL = '#1d2a26';
const LEVELS = ['#a65e59', '#c1706a', '#d88680', '#e9a09b'] as const;

function cellColor(level: number): string {
  return level <= 0 ? EMPTY_CELL : LEVELS[Math.min(level, 4) - 1];
}

/**
 * Compact above 10,000 only.
 *
 * A stat tile auto-compacts (`12.9K`), but the hero figure is the one number
 * the image exists to show and `1,284` is more of a boast than `1.3K`. The
 * threshold is where the digits stop fitting rather than where the convention
 * usually sits.
 */
function formatCount(value: number): string {
  if (value < 10_000) return value.toLocaleString('en-US');
  return `${(value / 1000).toFixed(value < 100_000 ? 1 : 0)}K`;
}

/**
 * One of the small figures under the hero.
 *
 * `compact` is not a style preference: at three tiles the row gives each about
 * 300px and at four about 228px, and "Time studied" at 30px does not fit 228
 * on one line. Shrinking both sizes together keeps the value dominant over its
 * label, which is the only thing that has to survive a thumbnail.
 */
function StatTile({ label, value, compact }: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  const size = compact ? 58 : 76;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
      paddingLeft: 8, paddingRight: 8,
    }}>
      {/* ⚠️ **Fixed at two lines' worth, deliberately.** A value is not always
          one line: Korean writes 2h 40m as 「2시간 40분」, eight full-width
          glyphs that cannot fit the ~228px a fourth tile gets at any legible
          size, so it wraps. Left to size itself, that tile grew and shoved its
          own label below the other three, breaking the row — caught by
          rendering the Korean card, not by reading the code. Reserving the
          space unconditionally keeps every label on one line whether or not a
          neighbour wrapped, and costs a short value nothing but air. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: Math.round(size * 1.1 * 2), textAlign: 'center',
        fontSize: size, fontWeight: 700, color: C.text, lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: compact ? 25 : 30, color: C.muted, textAlign: 'center',
      }}>
        {label}
      </div>
    </div>
  );
}

/**
 * How many columns the calendar wraps at.
 *
 * Not seven. The app's heatmap is seven rows of weekdays because a dashboard
 * cell is tappable and a weekday is a real axis; here nothing is tappable and
 * there is no axis label, so weekday alignment buys nothing and costs the
 * shape — a 30-day window at seven rows is five columns, a narrow strip on a
 * 1080px canvas. Wrapping at roughly `sqrt(days × 2.2)` keeps the block close
 * to a fixed footprint across every window, so the layout below it does not
 * move when the range changes.
 */
function columnsFor(dayCount: number): number {
  return Math.max(7, Math.min(26, Math.round(Math.sqrt(dayCount * 2.2))));
}

/**
 * The tallest the calendar block may be.
 *
 * The cell size has to be derived from **both** the width and this, not from
 * width alone: a year at 26 columns is 14 rows, and sizing those to fill 912px
 * of width would make the block over 1000px tall on a canvas that still owes
 * room to the hero figure and the tiles. Sizing from width only is exactly the
 * bug the layout test caught.
 */
const HEATMAP_MAX_HEIGHT = 620;

/**
 * The tallest the cards-added chart may be.
 *
 * The calendar's own maximum, deliberately: the chart stands in the calendar's
 * slot, and a shorter block leaves the root's `space-between` to spread the
 * difference as dead green between the hero and the tiles — which reads as
 * something that failed to load rather than as room.
 */
const CHART_HEIGHT = HEATMAP_MAX_HEIGHT;

/**
 * The most bars the route will draw.
 *
 * The longest window the app offers is a year, which is 52 weekly bars, so this
 * is not a limit any real URL reaches — it is a bound on what a hand-edited one
 * can ask the renderer to lay out.
 */
const CHART_MAX_BARS = 400;

/** The plot's drawn width: the canvas less its two gutters. */
const PLOT_WIDTH = WIDTH - PAD * 2;

/**
 * The most marks a line decorates one by one.
 *
 * The detail screens' own threshold, for their reason: at seven points a dot
 * per reading says "these are seven discrete counts", which is true and is what
 * a line otherwise hides; at 52 it is a beaded string.
 */
const DECORATED_MARK_MAX = 14;

/**
 * The dot on a line's reading.
 *
 * ⚠️ **A reading at zero or at the ceiling is clipped in half by the plot's own
 * edge, and that is left alone.** Nudging the dot inwards to keep it whole
 * would put the marker somewhere the line is not, which is the one thing a
 * chart may not do — a marker meeting the axis is the ordinary way this looks.
 */
const DOT_RADIUS = 10;

/**
 * The chart, drawn the way the reader had it drawn.
 *
 * ⚠️ **Both marks, because the button is on a chart that has both.** The card
 * is reached from the weekly chart's own title row, beside the Bars / Line
 * toggle — an asset that was always bars would be a different picture wearing
 * that button. The first pass shipped exactly that and the user caught it.
 *
 * **Satori draws the line, which was checked rather than assumed.** `next/og`
 * is flexbox-only for *layout*, but it handles an inline `<svg>` by serializing
 * the subtree to a `data:` URI and rasterizing it, mapping `strokeWidth` to
 * `stroke-width` on the way. Two rules come out of that: the geometry is in
 * absolute pixels against a fixed `viewBox`, since there is no percentage to
 * resolve against, and **`<text>` throws** — so the ceiling label stays an HTML
 * div outside the svg.
 *
 * **The scale is `niceCeiling`, called here rather than sent.** It is in core,
 * so the asset lands on the same round number the app drew its own chart
 * against — 47 gives a ceiling of 50 on both. Sending it would be one more
 * forgeable parameter for a figure the route can derive exactly.
 */
function Chart({ values, ceiling, mark, weekdays }: {
  values: number[];
  ceiling: number;
  mark: ShareChartMark;
  /** One name per mark, drawn under it — or absent, when a mark is not a day. */
  weekdays?: string[];
}) {
  /**
   * A value's height in px. Both marks read it, so they sit on one scale.
   *
   * ⚠️ **Bars give an empty bucket nothing at all, unlike the app's charts.**
   * They give an empty day a hairline because an absent bar and an empty one
   * look identical — but here the zero rule runs right across the plot, so the
   * empty bucket is already marked, and a row of stubs sitting on that rule
   * turns it into a dashed line. Seen by rendering the 30-day card.
   */
  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.round((value / ceiling) * CHART_HEIGHT)
    : 0);
  /** A bar short enough to vanish is given a floor; the line needs no such thing. */
  const barHeight = (value: number) => (value > 0 ? Math.max(8, heightOf(value)) : 0);

  // The same threshold the detail screens switch gutters at: past 26 bars there
  // is no room for a gap that still reads as one.
  const gap = values.length > 26 ? 4 : 8;
  /** Horizontal centre of a bucket's slot, in the svg's own pixels. */
  const centre = (index: number) => ((index + 0.5) * PLOT_WIDTH) / values.length;
  const y = (value: number) => CHART_HEIGHT - heightOf(value);
  const dotted = values.length <= DECORATED_MARK_MAX;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* The ceiling, sitting on the rule it names. Only one gridline is drawn:
          a shared image is read at thumbnail size, where a second rule is
          texture rather than information. */}
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ fontSize: 28, color: C.muted }}>{formatCount(ceiling)}</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          width: '100%',
          height: CHART_HEIGHT,
          borderTopWidth: 2,
          borderTopStyle: 'solid',
          borderTopColor: C.surface,
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: C.muted,
        }}
      >
        {mark === 'line' ? (
          <svg
            width={PLOT_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${PLOT_WIDTH} ${CHART_HEIGHT}`}
          >
            <polyline
              points={values.map((value, index) => `${centre(index)},${y(value)}`).join(' ')}
              fill="none"
              stroke={C.highlight}
              strokeWidth={7}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* A dot per reading when there are few enough to tell apart. At a
                year's 52 points they close up into the line itself. */}
            {dotted && values.map((value, index) => (
              <circle key={index} cx={centre(index)} cy={y(value)} r={DOT_RADIUS} fill={C.highlight} />
            ))}
          </svg>
        ) : (
          values.map((value, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: barHeight(value),
                marginRight: index === values.length - 1 ? 0 : gap,
                borderRadius: 4,
                backgroundColor: C.highlight,
              }}
            />
          ))
        )}
      </div>
      {/* Under each mark, in the same slots the bars take — same flex, same
          gap — so a name sits under its own bar and, on a line, under its own
          dot, which is centred in that slot too. */}
      {weekdays && (
        <div style={{ display: 'flex', width: '100%', marginTop: 14 }}>
          {weekdays.map((name, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                marginRight: index === weekdays.length - 1 ? 0 : gap,
                fontSize: 30,
                color: C.muted,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Everything the image is built from, read out of the query string.
 *
 * Separated from the render because the render cannot be unit-tested: resvg's
 * wasm rasterizer does not initialise under vitest, so a test that called `GET`
 * would fail on the raster step no matter how right the inputs were. This half
 * *is* testable, and it is the half a user can edit — the numbers arrive in a
 * URL, so nothing here may throw, and the worst a bad parameter earns is a zero.
 */
export interface ShareImageParams {
  lang: string | null;
  /**
   * Which layout to draw. Anything unrecognised is the window card, which is
   * also what a URL with no `v` at all means — so every link an older build
   * ever produced keeps rendering what it always rendered.
   */
  variant: ShareVariant;
  windowDays: number;
  reviews: number;
  streak: number;
  /**
   * The languages reviewed in the window, busiest first.
   *
   * Filtered to codes the app actually knows: the label is looked up as
   * `label{code}`, so an invented code in a hand-edited URL would otherwise
   * draw the key itself. It also bounds the glyphs this can demand of the
   * subset fonts to the nine real names.
   */
  languages: StudyLanguage[];
  /**
   * Cards that matured inside the window, and seconds studied in it — `null`
   * when the window reaches back before either counter existed, which is the
   * caller withholding them rather than reporting zero.
   */
  cardsMatured: number | null;
  studySeconds: number | null;
  /** Cards added in the window. Never withheld; zero simply draws no tile. */
  cardsAdded: number;
  /** Exactly `windowDays` levels, 0–4, padded and truncated to fit. */
  cells: number[];
  /**
   * The chart the card draws: its marks, what one of them covers, which of the
   * two measures they count, and which mark they are drawn as.
   *
   * Only `v=chart` sends them, so every other card parses an empty series and
   * draws no chart — which is also what a hand-edited `v=chart` with no `c` at
   * all gets, rather than an empty plot frame.
   *
   * ⚠️ **`bucketDays` is read, not worked out.** `chartBucketDays` is the
   * fallback for a URL that omits it and nothing more: deriving it would mean
   * every link an installed build had already produced changing meaning the day
   * that threshold moved.
   */
  chart: {
    bucketDays: number;
    values: number[];
    measure: ShareChartMeasure;
    mark: ShareChartMark;
    /**
     * The last day the chart covers, `YYYY-MM-DD`, or `null` when the URL has
     * none — every chart link made before weekdays were drawn, which simply
     * draws none.
     */
    end: string | null;
  };
}

export function readShareImageParams(q: URLSearchParams): ShareImageParams {
  const num = (key: string, fallback = 0) => {
    // The empty check is load-bearing: `Number(null)` and `Number('')` are both
    // `0`, which is finite, so testing only `Number.isFinite` would let a
    // missing parameter through as a real zero and the fallback would never
    // fire. That read a missing `w` as a one-day window.
    const value = q.get(key);
    if (value === null || value.trim() === '') return fallback;
    const raw = Number(value);
    return Number.isFinite(raw) ? raw : fallback;
  };
  /**
   * A figure that may legitimately be absent, kept apart from `num`.
   *
   * `null` means the caller withheld it because its window could not honestly
   * cover it; a real `0` means it covered it and the answer was none. Collapsing
   * the two is exactly the lie `buildShareStats` withholds to avoid.
   */
  const optional = (key: string): number | null => {
    const value = q.get(key);
    if (value === null || value.trim() === '') return null;
    const raw = Number(value);
    return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : null;
  };
  const windowDays = Math.max(1, Math.min(400, Math.round(num('w', 30))));

  // One character per day, '0'–'4', oldest first — the level `buildHeatmap`
  // already computed. Sent this way rather than as counts so the route never
  // has to know the window's busiest day to scale against.
  const heat = (q.get('h') ?? '').slice(0, windowDays).split('')
    .map(ch => (ch >= '0' && ch <= '4' ? Number(ch) : 0));

  /**
   * One bar's count. Junk reads as zero rather than as a gap: a bar is a
   * position in a series, so dropping one would shift every bar after it.
   */
  const bar = (part: string): number => {
    const raw = Number(part);
    return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  };
  const values = (q.get('c') ?? '')
    .split(',')
    .filter(part => part.trim() !== '')
    .slice(0, CHART_MAX_BARS)
    .map(bar);

  return {
    // `t` falls back to English for anything it does not recognise, so the raw
    // parameter goes straight through rather than being validated twice.
    lang: q.get('lang'),
    variant: readVariant(q.get('v')),
    windowDays,
    reviews: Math.max(0, Math.round(num('r'))),
    streak: Math.max(0, Math.round(num('s'))),
    // Absent means withheld, which is why these cannot go through `num`: its
    // fallback would turn "the window cannot cover this" into a drawn zero.
    cardsMatured: optional('m'),
    studySeconds: optional('t'),
    cardsAdded: Math.max(0, Math.round(num('a'))),
    languages: (q.get('g') ?? '').split(',').filter(isStudyLanguage),
    // `ret`, `d` and `l` are deliberately not read. Retention, days studied and
    // an all-time cards learned all came off the image on 2026-09-12, but
    // mobile ships by build and the route is server-side, so an installed build
    // goes on appending them for as long as it is there. An unread parameter is
    // ignored; none of them may ever become a parse failure. (`m` is the
    // *windowed* maturity count that arrived later — a different number under a
    // different key, so an old build's `l` can never be mistaken for it.)
    cells: [...heat, ...Array(Math.max(0, windowDays - heat.length)).fill(0)],
    chart: {
      // Clamped to the window it claims to cover: a bar spanning more days than
      // the window has is the only reading of `bd` that could not have come
      // from the app.
      bucketDays: Math.max(1, Math.min(windowDays, Math.round(num('bd', chartBucketDays(windowDays))))),
      values,
      // Single letters, and the default is the absent value — so the common
      // card's URL carries neither. Anything unrecognised is the default, for
      // the reason `readVariant` gives.
      measure: q.get('cm') === 'r' ? 'reviews' : 'cards',
      mark: q.get('mk') === 'l' ? 'line' : 'bars',
      end: readDate(q.get('e')),
    },
  };
}

/** A `YYYY-MM-DD` that is a real day, or `null` — never a throw. */
function readDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) ? null : value;
}

/**
 * The weekday under each of a chart's marks, oldest first, or `undefined`.
 *
 * **The dashboard's rule, so the shared chart reads like the one it came
 * from:** only when a mark is a day, and only at a count where every mark is
 * labelled anyway (`DECORATED_MARK_MAX`) — in practice, the 7-day chart. A
 * 30-day chart of names would be a grey smear at this size.
 */
export function chartWeekdays(
  chart: ShareImageParams['chart'],
  lang: string | null,
): string[] | undefined {
  const { values, bucketDays, end } = chart;
  if (!end || bucketDays !== 1 || values.length === 0 || values.length > DECORATED_MARK_MAX) {
    return undefined;
  }
  const names = weekdayLabels(lang);
  return values.map((_, index) => names[weekdayIndex(shiftDate(end, index - (values.length - 1)))]);
}

/**
 * The layout the URL asks for, with anything unrecognised read as the window
 * card.
 *
 * ⚠️ **This is the backward-compatibility rule in one function.** An installed
 * build goes on producing whatever `v` it knew about, and a build older than
 * the chart card produces none at all — both have to keep rendering, so an
 * unknown variant may never be a parse failure.
 */
function readVariant(value: string | null): ShareVariant {
  if (value === 'today') return 'today';
  if (value === 'chart') return 'chart';
  return 'window';
}

/** The calendar block: cell size in px and the rows it wraps into. */
export function layoutHeatmap(cells: number[], windowDays: number) {
  const columns = columnsFor(windowDays);
  const gap = 10;
  const rowCount = Math.max(1, Math.ceil(cells.length / columns));
  const byWidth = (WIDTH - PAD * 2 - gap * (columns - 1)) / columns;
  const byHeight = (HEATMAP_MAX_HEIGHT - gap * (rowCount - 1)) / rowCount;
  const cell = Math.max(1, Math.floor(Math.min(byWidth, byHeight)));
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return { columns, gap, cell, rows };
}

export async function GET(req: NextRequest) {
  const {
    lang, variant, windowDays, reviews, streak, languages, cells, chart,
    cardsMatured, studySeconds, cardsAdded,
  } = readShareImageParams(req.nextUrl.searchParams);
  const label = (key: TranslationKey, vars?: Record<string, string | number>) => t(lang, key, vars);
  const isChart = variant === 'chart' && chart.values.length > 0;

  /**
   * What was being studied, under the number that counts it.
   *
   * Three names at most. A fourth does not fit the width at this size, and a
   * remainder is more honestly a count than a truncated list.
   *
   * ⚠️ **Not under a cards-added hero.** `languages` is the languages
   * *reviewed* in the window — that is what `ShareStats` promises and what
   * makes it an honest caption for a review count. Under a cards-added figure
   * the same line would read as the languages those cards were added to, which
   * is a different question these rows are not being asked. So it follows the
   * hero rather than the variant: a reviews chart keeps it.
   */
  const named = languages.slice(0, 3).map(code => label(`label${code}` as TranslationKey));
  const rest = languages.length - named.length;
  const countsCards = isChart && chart.measure === 'cards';
  const languageLine = countsCards || named.length === 0
    ? null
    : `${named.join(' · ')}${rest > 0 ? ` +${rest}` : ''}`;
  const { gap, cell, rows } = layoutHeatmap(cells, windowDays);

  /**
   * The hero figure, and the word under it.
   *
   * ⚠️ **The chart card's hero is the total its bars add up to, not reviews.**
   * A big number above a chart is read as the chart's own total by anyone who
   * sees it, so the two have to be the same measure — and they are two
   * different measures here, because `reviews` counts *directions* where cards
   * added counts cards. The label is the dashboard's own, reused rather than
   * restated.
   */
  const hero = countsCards
    ? { value: formatCount(cardsAdded), label: label('progressStatNewCards') }
    : { value: formatCount(reviews), label: label('shareStatReviews') };

  const regular = fontData(NOTO_SANS_KR_REGULAR_BASE64);
  const bold = fontData(NOTO_SANS_KR_BOLD_BASE64);

  /**
   * The figures under the calendar, however many of them there are.
   *
   * Days studied is still absent on purpose — beside a streak it read as a
   * second opinion on the same question. The three that joined it on
   * 2026-09-12 each name the window the rest of the card names: maturity
   * *crossings* rather than the dashboard's all-time state, seconds actually
   * spent, and cards added. Any of the first two can be withheld, and cards
   * added can be zero, so this row is built rather than declared — a tile whose
   * number the window cannot cover is not drawn at all, which is why nothing
   * here ever renders a placeholder dash.
   */
  const tiles: { label: string; value: string }[] = [
    { label: label('shareStatStreak'), value: formatCount(streak) },
  ];
  // Reviews is the hero on every other card and a tile only under a cards-added
  // one, where the hero is already spoken for. It names the same window as the
  // rest of the row, which is the only thing that has ever qualified a figure
  // for it.
  if (countsCards && reviews > 0) {
    tiles.push({ label: label('shareStatReviews'), value: formatCount(reviews) });
  }
  // ⚠️ **Zero hides the tile, and that is a render rule, not a data one.** The
  // null/zero distinction is load-bearing upstream — withheld and none are
  // different facts, which is why the parser keeps them apart — but neither is
  // worth a tile: "0 Newly learned" beside a streak reads as a rebuke on a
  // today card that simply is not finished yet. Applied to all three so the row
  // cannot be inconsistent about it, which it was until this line existed.
  if (cardsMatured !== null && cardsMatured > 0) {
    tiles.push({ label: label('shareStatMatured'), value: formatCount(cardsMatured) });
  }
  // A daily average over a window and the total on a today card — derived from
  // `t` and `w` rather than sent, so an installed build's URL gets it too.
  const time = studyTimeTile(studySeconds, windowDays);
  if (time) {
    tiles.push({ label: label(time.labelKey), value: formatStudyTime(time.seconds, lang) });
  }
  // Not under a cards-added hero, where this number *is* the hero: a tile
  // repeating it would be the same figure twice on one canvas.
  if (cardsAdded > 0 && !countsCards) {
    // The dashboard's own words, reused rather than restated: the two surfaces
    // count the same thing and must not name it differently.
    tiles.push({ label: label('progressStatNewCards'), value: formatCount(cardsAdded) });
  }
  const compactTiles = tiles.length >= 3;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: PAD,
          backgroundColor: C.bg,
          color: C.text,
          fontFamily: 'Noto Sans KR',
        }}
      >
        {/* The window, said out loud. Every figure below shares it, which is
            the whole reason `buildShareStats` withholds the ones it cannot
            cover — an image is read all at once, so a total over a different
            range than the label would lie by juxtaposition. */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ fontSize: 34, color: C.muted, letterSpacing: 1 }}>
            {variant === 'today'
              ? label('shareVariantToday')
              : label('shareWindowDays', { count: windowDays })}
          </div>
        </div>

        {/* The hero figure. Exactly one per image: at thumbnail size a second
            number this large would leave neither of them readable. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 260, fontWeight: 700, lineHeight: 1, color: C.highlight }}>
            {hero.value}
          </div>
          {/* Never "cards reviewed" where this is the review count: `reviews`
              counts directions, so the label is load-bearing. See
              `ShareStats.reviews`, and `hero` for the chart card's own. */}
          <div style={{ fontSize: 46, color: C.text, marginTop: 12 }}>
            {hero.label}
          </div>
          {/* Directly under the figure it qualifies: "1,204 reviews" never said
              of what. The window line at the top stays the window. */}
          {languageLine !== null && (
            <div style={{ fontSize: 30, color: C.muted, marginTop: 16 }}>
              {languageLine}
            </div>
          )}
        </div>

        {/* A calendar of one day is a single square, so the today card does
            without one.

            ⚠️ **The element goes, not just its children.** The root is
            `justify-content: space-between`, so an empty div still claims a
            slot and spreads the remaining ones apart — which left about a third
            of the today card as dead green and read as something that had
            failed to load. Emptying the children is not the same as removing
            the child. */}
        {/* The chart stands in the calendar's slot, and like it goes entirely
            rather than emptying: the root is `space-between`, so a childless
            div still claims a slot and spreads the rest of the card apart. */}
        {isChart && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Chart
              values={chart.values}
              ceiling={niceCeiling(Math.max(0, ...chart.values))}
              mark={chart.mark}
              weekdays={chartWeekdays(chart, lang)}
            />
            {/* ⚠️ **Said out loud whenever a bar is not a day.** Past 30 days
                the app buckets by week, so a 90-day window is 13 bars — read as
                13 days by anyone who is not told otherwise, which turns a busy
                quarter into a quiet fortnight. The app's own note, reused. */}
            {chart.bucketDays > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: 14,
              }}>
                <div style={{ fontSize: 26, color: C.muted }}>
                  {label(chart.mark === 'line'
                    ? 'shareChartWeeklyPoints'
                    : 'progressChartWeeklyNote')}
                </div>
              </div>
            )}
          </div>
        )}

        {variant === 'window' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((row, y) => (
              <div key={y} style={{ display: 'flex', marginBottom: y === rows.length - 1 ? 0 : gap }}>
                {row.map((level, x) => (
                  <div
                    key={x}
                    style={{
                      width: cell,
                      height: cell,
                      marginRight: x === row.length - 1 ? 0 : gap,
                      borderRadius: 8,
                      backgroundColor: cellColor(level),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', width: '100%' }}>
          {tiles.map(tile => (
            <StatTile
              key={tile.label}
              label={tile.label}
              value={tile.value}
              compact={compactTiles}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: C.muted, letterSpacing: 3 }}>
            {label('shareFooter')}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Noto Sans KR', data: regular, weight: 400, style: 'normal' },
        { name: 'Noto Sans KR', data: bold, weight: 700, style: 'normal' },
      ],
      // Deterministic in its inputs, so it can be cached hard. Nothing here is
      // per-user beyond the numbers already in the URL.
      headers: { 'Cache-Control': 'public, max-age=3600, immutable' },
    },
  );
}
