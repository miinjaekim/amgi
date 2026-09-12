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
 * And **there is no system font**: the bundled default is Geist, which has no
 * Hangul, so Korean would render as blank boxes without the faces loaded below.
 */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import {
  formatStudyTime, isStudyLanguage, t,
  type ShareVariant, type StudyLanguage, type TranslationKey,
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

  return {
    // `t` falls back to English for anything it does not recognise, so the raw
    // parameter goes straight through rather than being validated twice.
    lang: q.get('lang'),
    variant: q.get('v') === 'today' ? 'today' : 'window',
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
  };
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
    lang, variant, windowDays, reviews, streak, languages, cells,
    cardsMatured, studySeconds, cardsAdded,
  } = readShareImageParams(req.nextUrl.searchParams);
  const label = (key: TranslationKey, vars?: Record<string, string | number>) => t(lang, key, vars);

  /**
   * What was being studied, under the number that counts it.
   *
   * Three names at most. A fourth does not fit the width at this size, and a
   * remainder is more honestly a count than a truncated list.
   */
  const named = languages.slice(0, 3).map(code => label(`label${code}` as TranslationKey));
  const rest = languages.length - named.length;
  const languageLine = named.length === 0
    ? null
    : `${named.join(' · ')}${rest > 0 ? ` +${rest}` : ''}`;
  const { gap, cell, rows } = layoutHeatmap(cells, windowDays);

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
  // ⚠️ **Zero hides the tile, and that is a render rule, not a data one.** The
  // null/zero distinction is load-bearing upstream — withheld and none are
  // different facts, which is why the parser keeps them apart — but neither is
  // worth a tile: "0 Newly learned" beside a streak reads as a rebuke on a
  // today card that simply is not finished yet. Applied to all three so the row
  // cannot be inconsistent about it, which it was until this line existed.
  if (cardsMatured !== null && cardsMatured > 0) {
    tiles.push({ label: label('shareStatMatured'), value: formatCount(cardsMatured) });
  }
  if (studySeconds !== null && studySeconds > 0) {
    tiles.push({ label: label('shareStatTime'), value: formatStudyTime(studySeconds, lang) });
  }
  if (cardsAdded > 0) {
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
            {formatCount(reviews)}
          </div>
          {/* Never "cards reviewed": `reviews` counts directions, so this label
              is load-bearing. See `ShareStats.reviews`. */}
          <div style={{ fontSize: 46, color: C.text, marginTop: 12 }}>
            {label('shareStatReviews')}
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
