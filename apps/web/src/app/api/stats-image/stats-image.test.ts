import { describe, it, expect } from 'vitest';
import { layoutHeatmap, readShareImageParams } from './route';

/**
 * What is tested here, and what deliberately is not.
 *
 * **Not the raster.** `GET` cannot be called from vitest — `@vercel/og`'s resvg
 * wasm does not initialise there, and every call fails on the raster step no
 * matter how correct the inputs are. Satori output is not pixel-stable enough
 * to snapshot anyway, so even where it did run, the assertion would have been
 * "a PNG came back". That much is covered by `next build` and by rendering the
 * route against the dev server.
 *
 * **What is tested** is the half that can be wrong in a way that ships: the
 * numbers arrive in a URL the user can edit, so parsing must never throw, must
 * never turn a withheld figure into a zero, and must always hand the layout
 * exactly as many cells as the window claims.
 */
const parse = (query: string) => readShareImageParams(new URLSearchParams(query));

describe('reading the parameters', () => {
  it('reads a full set', () => {
    const p = parse('w=30&r=1284&s=12&l=47&lang=Korean');
    expect(p).toMatchObject({
      windowDays: 30, reviews: 1284, streak: 12, learned: 47, lang: 'Korean',
    });
  });

  it('defaults to a 30-day window when none is given', () => {
    expect(parse('').windowDays).toBe(30);
  });

  it('distinguishes a withheld figure from a zero one', () => {
    // The distinction the whole `null` design rests on. `buildShareStats`
    // returns null for a figure the window cannot cover; a 0 on a shared image
    // is a claim, not a gap, so the two must not collapse here.
    expect(parse('r=10').learned).toBeNull();
    expect(parse('r=10&l=0').learned).toBe(0);
  });

  it('reads the variant, defaulting to the window card', () => {
    // Absent means window, so every URL an older build ever produced keeps
    // rendering exactly what it rendered before the today card existed.
    expect(parse('v=today').variant).toBe('today');
    expect(parse('').variant).toBe('window');
    expect(parse('v=window').variant).toBe('window');
    expect(parse('v=nonsense').variant).toBe('window');
  });

  it('keeps only real study languages out of the g parameter', () => {
    // The label is looked up as `label{code}`, so an invented code would draw
    // the key itself — and would ask the subset fonts for glyphs nobody put in
    // them. Both failures are silent, which is why this filters rather than
    // trusts.
    expect(parse('g=Korean,Japanese').languages).toEqual(['Korean', 'Japanese']);
    expect(parse('g=Korean,Klingon,,Japanese').languages).toEqual(['Korean', 'Japanese']);
    expect(parse('g=').languages).toEqual([]);
    expect(parse('r=10').languages).toEqual([]);
  });

  it('ignores the parameters an older build still sends', () => {
    // Retention and days studied both came off the image on 2026-09-12. Mobile
    // ships by build and this route is server-side, so an installed build goes
    // on appending `ret` and `d` for as long as it is on the phone: they must
    // be inert, never a failure.
    expect(parse('r=10&ret=88&d=23')).toMatchObject({ reviews: 10 });
    expect(parse('r=10&ret=88&d=23')).not.toHaveProperty('retention');
    expect(parse('r=10&ret=88&d=23')).not.toHaveProperty('daysStudied');
  });

  it('keeps a negative cardsLearned, which is a real value', () => {
    // Net maturity can genuinely go negative over a window where more cards
    // lapsed than matured. Clamping it to zero would hide that.
    expect(parse('l=-3').learned).toBe(-3);
  });

  it('floors the counts that cannot be negative', () => {
    const p = parse('r=-5&s=-2');
    expect([p.reviews, p.streak]).toEqual([0, 0]);
  });

  it('treats junk as zero rather than throwing', () => {
    const p = parse('r=abc&s=NaN&w=zzz');
    expect([p.reviews, p.streak]).toEqual([0, 0]);
    expect(p.windowDays).toBe(30);
  });

  it('rejects an infinite value instead of rendering it', () => {
    expect(parse('r=1e999').reviews).toBe(0);
    expect(parse('w=Infinity').windowDays).toBe(30);
  });

  it('clamps the window to something renderable', () => {
    expect(parse('w=0').windowDays).toBe(1);
    expect(parse('w=99999').windowDays).toBe(400);
  });

  it('rounds fractional input, since every figure is drawn as an integer', () => {
    expect(parse('r=12.6&s=4.4').reviews).toBe(13);
    expect(parse('r=12.6&s=4.4').streak).toBe(4);
  });
});

describe('the heat string', () => {
  it('yields exactly one cell per day in the window', () => {
    for (const days of [1, 7, 30, 91, 364, 400]) {
      expect(parse(`w=${days}&h=${'2'.repeat(days)}`).cells).toHaveLength(days);
    }
  });

  it('pads a short string with untouched days', () => {
    const cells = parse('w=10&h=444').cells;
    expect(cells).toEqual([4, 4, 4, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('truncates a string longer than the window', () => {
    // Otherwise the grid overflows the canvas and the layout silently breaks.
    expect(parse(`w=7&h=${'4'.repeat(400)}`).cells).toHaveLength(7);
  });

  it('reads an out-of-range character as untouched', () => {
    expect(parse('w=6&h=9zx-4a').cells).toEqual([0, 0, 0, 0, 4, 0]);
  });

  it('is all-zero when absent, rather than empty', () => {
    expect(parse('w=5').cells).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('the heatmap layout', () => {
  it('lays every cell out and loses none', () => {
    for (const days of [1, 7, 30, 91, 364]) {
      const { rows } = layoutHeatmap(parse(`w=${days}`).cells, days);
      expect(rows.flat()).toHaveLength(days);
    }
  });

  it('keeps the block inside the canvas at every window length', () => {
    // The check that catches a bad `columnsFor`: cells plus gaps must fit the
    // 1080px canvas minus its padding, or the image overflows.
    for (const days of [1, 7, 30, 91, 200, 364, 400]) {
      const { columns, gap, cell, rows } = layoutHeatmap(parse(`w=${days}`).cells, days);
      expect(cell).toBeGreaterThan(0);
      expect(columns * cell + (columns - 1) * gap).toBeLessThanOrEqual(1080 - 84 * 2);
      // And tall enough to leave room for the hero and the tiles.
      expect(rows.length * (cell + gap)).toBeLessThan(900);
    }
  });

  it('never wraps at fewer than seven columns, however short the window', () => {
    expect(layoutHeatmap(parse('w=1').cells, 1).columns).toBeGreaterThanOrEqual(7);
  });
});
