import fs from 'node:fs';
import path from 'node:path';

/**
 * Jyutping, checked against a dictionary rather than taken from the model.
 *
 * **Server-only**, for the reason `pitchAccentLookup.ts` is: the table is
 * 2.9 MB and stays on the route so the mobile bundle pays nothing for it.
 * Never import this from a client component or from `packages/core`.
 *
 * Why the model's reading is not trusted on its own is measured in
 * `apps/web/src/data/README.md`. The short version: 121/143 right on all three
 * runs, 22/30 on words built from multi-reading characters (重量, 長大, 傳記),
 * and a third of the misses were the same wrong answer every run.
 */

let table: Map<string, string> | null = null;

/**
 * Parsed once and held in module scope, so the cost lands on a cold start
 * rather than on a lookup. The readings stay as the file's comma-joined string
 * and are split per lookup: 128,818 small arrays are worth not allocating for
 * the handful of surfaces a request ever asks about.
 */
function load(): void {
  if (table) return;
  table = new Map();
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), 'src/data/jyutping.txt'), 'utf8');
  } catch {
    // A missing file must not take the route down. The failure mode is every
    // Cantonese card keeping the model's reading, unchecked — which is what
    // happens if `outputFileTracingIncludes` loses its entry in next.config.ts.
    return;
  }
  for (const line of raw.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    table.set(line.slice(0, tab), line.slice(tab + 1));
  }
}

/** Lowercase, one space between syllables — the shape the table is written in. */
export function normalizeJyutping(reading: string): string {
  return reading.toLowerCase().trim().split(/\s+/).join(' ');
}

/**
 * The Jyutping for a Cantonese term, or `undefined` when the dictionary does
 * not carry it and the model's reading is all there is.
 *
 * The model's reading is the tiebreaker, never the source. Most surfaces have
 * one reading and get it whatever the model said. Where the dictionary lists
 * several — 行 is haang4, hang4 and hong4, 身份證 is said with fan2 or fan6 —
 * the model's answer is kept **only if it is one of them**: it has seen the
 * sense the learner asked about and the table has not. Anything else it says
 * is replaced by the dictionary's first reading, which the file orders by
 * rime-cantonese's own weight.
 */
export function lookupJyutping(term: string, modelReading?: string): string | undefined {
  load();
  const listed = table?.get(term.trim().normalize('NFC'));
  if (!listed) return undefined;
  const readings = listed.split(',');
  if (readings.length > 1 && modelReading) {
    const said = normalizeJyutping(modelReading);
    if (readings.includes(said)) return said;
  }
  return readings[0];
}
