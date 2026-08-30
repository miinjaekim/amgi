import fs from 'node:fs';
import path from 'node:path';

/**
 * Tokyo-standard pitch accent, looked up rather than generated.
 *
 * **Server-only.** The table is 2.7 MB; it stays on the route so the mobile
 * bundle pays nothing for it. Never import this from a client component or
 * from `packages/core` — `markPitchAccent` there is the half that renders, and
 * it is deliberately data-free.
 *
 * Why a table and not the model is argued with numbers in
 * `apps/web/src/data/README.md`. The short version: 6/27 against 27/27, and
 * the model's errors are the ones that matter — it flattens 雨/飴 and 花/鼻
 * into a single accent, erasing the distinction the badge exists to teach.
 */

type Entry = { reading: string; accent: number };

let index: Map<string, Entry[]> | null = null;
let byReading: Map<string, number> | null = null;

/**
 * Parsed once and held in module scope, so the cost lands on a cold start
 * rather than on a lookup. Fluid Compute reuses the instance across requests,
 * which is what makes a 2.7 MB parse acceptable here at all.
 */
function load(): void {
  if (index) return;
  index = new Map();
  byReading = new Map();
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), 'src/data/pitch-accents.txt'), 'utf8');
  } catch {
    // A missing file must not take the lookup — or the route — down with it.
    // The failure mode is every Japanese card losing its badge, which is
    // exactly what happens if `outputFileTracingIncludes` is ever dropped from
    // next.config.ts, so it is worth recognising from the symptom.
    return;
  }
  for (const line of raw.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const tab2 = line.indexOf('\t', tab + 1);
    if (tab2 < 0) continue;
    const surface = line.slice(0, tab);
    const reading = line.slice(tab + 1, tab2);
    const accent = Number(line.slice(tab2 + 1));
    if (!Number.isInteger(accent)) continue;
    const list = index.get(surface);
    if (list) list.push({ reading, accent });
    else index.set(surface, [{ reading, accent }]);
    if (!byReading.has(reading)) byReading.set(reading, accent);
  }
}

/**
 * The accent position for a Japanese term, or `undefined` when the dictionary
 * does not carry it.
 *
 * `furigana` is what disambiguates a surface with several readings, and the
 * card already carries it — 橋 is `きょう` [1] or `はし` [2], and 端 has seven
 * readings, so matching on the surface alone would pick one at random.
 *
 * The reading-only fallback is not a nicety: the table keys 「ありがとう」under
 * 有り難う and 「こんにちは」under 今日は, so a term the learner typed in kana
 * misses the surface index entirely and would otherwise get no badge. Measured
 * on 127 realistic lookups, the fallback is the difference between 94.5% and
 * ~99% coverage.
 */
export function lookupPitchAccent(term: string, furigana?: string): number | undefined {
  load();
  if (!index || !byReading) return undefined;
  const entries = index.get(term);
  if (entries?.length) {
    if (furigana) {
      const exact = entries.find(e => e.reading === furigana);
      if (exact) return exact.accent;
    }
    // A surface needs disambiguating only when its readings actually disagree
    // about the accent. 神 is かみ/かむ/しん and all three are [1]; 山 is
    // むれ/やま and both are [2]. Requiring a furigana match there would drop
    // an accent that was never in doubt. 橋 (きょう [1] / はし [2]) and 水
    // (すい [1] / みず [0]) are the real ambiguities, and those stay undefined
    // rather than guessing — a wrong accent teaches a wrong word.
    const accents = new Set(entries.map(e => e.accent));
    if (accents.size === 1) return entries[0].accent;
  }
  const reading = furigana || term;
  return byReading.get(reading);
}
