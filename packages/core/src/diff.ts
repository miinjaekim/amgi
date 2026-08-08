/**
 * Word-level diff between what the learner wrote and how a native would put it.
 *
 * Reading a correction as two separate blocks means holding one in your head
 * while your eye travels to the other, and the actual edits — the part worth
 * learning — are never on screen as edits at all. This turns the pair into one
 * text with the changes marked in place.
 *
 * Pure, and in core rather than in the web app, for the reason `reviewQueue`
 * and `drill` are: the interesting part is the algorithm, the algorithm is the
 * same on both platforms, and a second copy is a copy that drifts.
 */

export type DiffOp = 'same' | 'remove' | 'add';

export interface DiffSegment {
  op: DiffOp;
  text: string;
}

/**
 * Above this many token pairs, the diff is abandoned for a whole-text
 * replacement.
 *
 * The table is quadratic, and `WRITING_MAX_CHARS` caps a passage at 1000
 * characters — which is at most ~1000 tokens in a language written without
 * spaces, so ~1M cells and comfortably inside this. The guard exists so that a
 * future caller passing something much larger degrades to a coarse diff instead
 * of locking the tab.
 */
const MAX_CELLS = 4_000_000;

/**
 * Splits text into words, punctuation and whitespace, preserving everything —
 * the concatenation of the result is always the input.
 *
 * `Intl.Segmenter` rather than a whitespace split, because half the study
 * languages do not put spaces between words. Splitting 私は昨日映画を見ました on
 * whitespace yields one token and a diff that can only say "all of this
 * changed", which is exactly the useless output this feature exists to replace.
 * Segmenter knows the word boundaries.
 *
 * Falls back to a whitespace split where `Intl.Segmenter` is missing. That
 * still serves French, Swedish and English correctly and degrades the CJK
 * languages to what they would have had anyway.
 */
export function tokenize(text: string, locale?: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (
    locale?: string,
    options?: { granularity: 'word' },
  ) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;

  if (Segmenter) {
    try {
      const segmenter = new Segmenter(locale, { granularity: 'word' });
      return Array.from(segmenter.segment(text), part => part.segment);
    } catch {
      // An unusable locale should cost the segmentation, not the diff.
    }
  }
  return text.split(/(\s+)/).filter(Boolean);
}

/**
 * Groups a run of changes so removals always precede additions.
 *
 * The walk below emits whichever side the table prefers, so a single edit can
 * come out as add/remove/add and read as though three things happened. Ordering
 * each run makes every change read the same way round — what was there, then
 * what replaces it.
 */
function orderRun(run: DiffSegment[]): DiffSegment[] {
  const removed = run.filter(segment => segment.op === 'remove').map(s => s.text).join('');
  const added = run.filter(segment => segment.op === 'add').map(s => s.text).join('');
  const out: DiffSegment[] = [];
  if (removed) out.push({ op: 'remove', text: removed });
  if (added) out.push({ op: 'add', text: added });
  return out;
}

function coalesce(segments: DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = [];
  let run: DiffSegment[] = [];
  const flush = () => {
    if (run.length) out.push(...orderRun(run));
    run = [];
  };
  for (const segment of segments) {
    if (!segment.text) continue;
    if (segment.op === 'same') {
      flush();
      const last = out[out.length - 1];
      if (last && last.op === 'same') last.text += segment.text;
      else out.push({ ...segment });
    } else {
      run.push(segment);
    }
  }
  flush();
  return out;
}

/**
 * The edits that turn `before` into `after`, as a flat list to render inline.
 *
 * A standard LCS diff over tokens. Returns a single `same` segment when the two
 * texts match, and a plain remove/add pair when they share nothing — both of
 * which render correctly without special-casing at the call site.
 */
export function diffText(before: string, after: string, locale?: string): DiffSegment[] {
  if (before === after) return before ? [{ op: 'same', text: before }] : [];
  if (!before) return after ? [{ op: 'add', text: after }] : [];
  if (!after) return [{ op: 'remove', text: before }];

  const a = tokenize(before, locale);
  const b = tokenize(after, locale);
  const n = a.length;
  const m = b.length;

  if ((n + 1) * (m + 1) > MAX_CELLS) {
    return [{ op: 'remove', text: before }, { op: 'add', text: after }];
  }

  // Suffix-length table: `dp[i][j]` is the LCS length of a[i..] and b[j..].
  // Flat and typed, because the natural `number[][]` allocates a row object per
  // token and this runs on every review.
  const width = m + 1;
  const dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] = a[i] === b[j]
        ? dp[(i + 1) * width + (j + 1)] + 1
        : Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)]);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      segments.push({ op: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
      segments.push({ op: 'remove', text: a[i] });
      i++;
    } else {
      segments.push({ op: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) segments.push({ op: 'remove', text: a[i++] });
  while (j < m) segments.push({ op: 'add', text: b[j++] });

  return coalesce(segments);
}

/** Whether a diff found anything to show — false when the texts are identical. */
export function hasChanges(segments: readonly DiffSegment[]): boolean {
  return segments.some(segment => segment.op !== 'same');
}
