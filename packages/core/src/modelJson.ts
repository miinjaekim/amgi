/**
 * Pulling a JSON value out of a model response.
 *
 * Every route that asks Gemini for JSON has carried its own
 * `stripMarkdownCodeBlock` — strip the fences, hand the rest to `JSON.parse`,
 * hope. That works until the model says anything at all around the JSON, and
 * then it throws `Unexpected non-whitespace character after JSON` and the whole
 * request 500s.
 *
 * Measured, not hypothesised: a writing review came back as a complete, valid
 * object followed by trailing commentary, and the passage the learner had
 * waited on was lost. Longer and more instruction-dense prompts make it likelier
 * — the model starts explaining itself.
 *
 * So: find where the JSON actually starts, scan to its matching close brace,
 * and parse that. Anything before or after is discarded rather than fatal.
 */

/** Removes ``` fences wherever they appear, including a language tag. */
export function stripCodeFences(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

/**
 * The first balanced `{…}` or `[…]` in `text`, or null when there is none.
 *
 * A brace-depth scan rather than "first `{` to last `}`", because that naive
 * slice joins two adjacent objects into one unparseable string — and two
 * objects is a thing models do when they decide to show their work. String
 * literals and their escapes are tracked so a brace inside a quoted value
 * cannot end the scan early, which matters here: every one of these responses
 * carries user-facing prose in its string values.
 */
export function extractJsonBlock(text: string): string | null {
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth++;
    else if (char === close && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Parses a model response that is supposed to be JSON.
 *
 * Throws a `SyntaxError` when there is nothing parseable, which every caller
 * already has to handle — the model can always return something unusable, and
 * this only widens what counts as usable.
 */
export function parseModelJson(raw: string): unknown {
  const block = extractJsonBlock(stripCodeFences(raw));
  if (block === null) throw new SyntaxError('No JSON found in model response');
  return JSON.parse(block);
}
