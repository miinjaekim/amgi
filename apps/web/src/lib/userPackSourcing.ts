import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getStudyLanguageConfig,
  normalizeTerm,
  parseSourcedLines,
  parseModelJson,
  parsePackLevel,
  parsePackTitle,
  parseSubtopics,
  textContainsTerm,
  tierFor,
  toHeadword,
  type DroppedWord,
  type GroundingMetadataLike,
  type PackBrief,
  type PackLevel,
  type ProposedSubtopic,
  type SubtopicProposal,
  type SourcedWord,
  type StudyLanguage,
  type WordSource,
} from '@amgi/core';

/**
 * The two model steps behind a user-made pack. Shared by
 * `/api/user-packs/subtopics`, `/api/user-packs/source` and the eval script, so
 * the script measures what the routes actually do.
 */

const MODEL = 'gemini-2.5-flash';

const PURPOSE_LINE: Record<PackBrief['purpose'], string> = {
  goal: 'They are working towards a goal',
  struggle: 'They keep struggling with something',
  situation: 'They are facing a situation',
};

function describeBrief(brief: PackBrief): string {
  return [
    `${PURPOSE_LINE[brief.purpose]}: ${brief.about}`,
    `Where they will use these words: ${brief.usage}`,
    brief.focus ? `What to focus on or leave out: ${brief.focus}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The learner's level comes from what they have saved, not from a question.
 * With no cards there is nothing to read, and the brief is all there is.
 */
function describeKnown(knownTerms: string[], language: string): string {
  if (knownTerms.length === 0) {
    return `They have no saved ${language} words yet, so judge their level from what they wrote above.`;
  }
  return `These are ${language} words they have already saved. Read their level from them, and never include any of them:\n${knownTerms.join(', ')}`;
}

/** The floor every sourcing call picks against. */
function describeLevel(level: PackLevel | undefined): string {
  if (!level) return '';
  const easy = level.tooEasy.length ? ` Words like ${level.tooEasy.join(', ')} are below it: nothing that easy.` : '';
  return `\nThe words must be at ${level.cefr}: ${level.summary.English}.${easy}\n`;
}

/**
 * Token use across a run, for the eval's cost line. Thinking is billed as
 * output, so it is counted there.
 */
export interface ModelUsage {
  input: number;
  output: number;
  /** Calls made with search on; the part of the bill counted per call. */
  grounded: number;
}

type OnUsage = (usage: ModelUsage) => void;

function reportUsage(onUsage: OnUsage | undefined, response: unknown, grounded: boolean) {
  const meta = (response as { usageMetadata?: Record<string, number> }).usageMetadata ?? {};
  onUsage?.({
    input: meta.promptTokenCount ?? 0,
    output: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
    grounded: grounded ? 1 : 0,
  });
}

function materialBlock(brief: PackBrief): string {
  return brief.material
    ? `\nThey handed over this material:\n"""\n${brief.material}\n"""\n`
    : '';
}

/** Step 2: the model proposes subtopics. No search; this is the cheap step. */
export async function proposeSubtopics(opts: {
  apiKey: string;
  brief: PackBrief;
  studyLanguage: StudyLanguage;
  knownTerms: string[];
  onUsage?: OnUsage;
}): Promise<SubtopicProposal | null> {
  const { brief, studyLanguage, knownTerms } = opts;
  const language = getStudyLanguageConfig(studyLanguage).label;
  const model = new GoogleGenerativeAI(opts.apiKey).getGenerativeModel({
    model: MODEL,
    // No thinking: this is the step the learner waits on, and it took 30s
    // with it. Splitting a brief into parts is not where reasoning pays.
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } as never,
  });

  const prompt = `A learner of ${language} wants a vocabulary pack of their own.

${describeBrief(brief)}
${materialBlock(brief)}
${describeKnown(knownTerms, language)}

First decide the level the words should be at, as "level":
- "cefr" is a CEFR band such as "B1" or "B2–C1". Read it from their saved words when there are enough of them. Otherwise read it from what they are aiming at: an exam score, a job, a situation, or what they say they already know. An exam or score sets a high floor. Do not lower it for safety.
- "summary" is one plain line saying who these words are for, in English and natural Korean, e.g. "Advanced business English for a TOEIC 900 score".
- "tooEasy" is five to eight ${language} words from their own topic that sit just below that level: the hardest words this learner already knows, so the line is drawn where it matters. Never basics like greetings or "work": everyone knows those, and they draw no line.

Then split what they need into subtopics. Each subtopic becomes its own deck the learner can take or leave, so:
- Split along lines this learner would recognise from their own situation, not along parts of speech or difficulty bands.
- Every subtopic must follow from something they wrote. Leave out neighbouring topics they did not ask for: someone asking about idioms in meetings did not ask for slang or phrasal verbs. Three to eight subtopics.
- No two subtopics may share words. If two would overlap, merge them into one.
- Split by what trips this learner up, not only by topic, when that is what their goal tests. An exam has its traps: familiar words used in a second meaning, pairs that are easily confused, collocations. A struggle has a shape of its own. Make such a subtopic when it fits what they wrote.
- "name" is short and concrete, and must make sense read alone in a list with no description beside it. "Group 3" or "Miscellaneous" is never a name.
- "note" is one short line on why these words belong together.
- "estimatedWords" is how many words the subtopic honestly holds for this learner, between 8 and 40. Leave out words any learner at their level already knows; a small subtopic is fine.
- "searchHint" is the web search you would run to find published word lists, glossaries or real texts for this subtopic, written in whichever language those sources are published in. When their goal names an exam, a course or a standard, search for sources made for it ("TOEIC Part 5 vocabulary list"), never a general glossary of the field.
- Write names and notes in both English and natural Korean.

Also name the whole pack: a short "name" a learner would recognise as theirs, and a one-line "description" of what it covers, both in English and natural Korean.

Respond with only this JSON:
{"name": {"English": "...", "Korean": "..."}, "description": {"English": "...", "Korean": "..."}, "level": {"cefr": "...", "summary": {"English": "...", "Korean": "..."}, "tooEasy": ["..."]}, "subtopics": [{"name": {"English": "...", "Korean": "..."}, "note": {"English": "...", "Korean": "..."}, "estimatedWords": 20, "searchHint": "..."}]}`;

  // Retried once: the eval saw a well-formed prompt come back with nothing
  // parseable, and a second call is cheap next to making the learner re-ask.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await model.generateContent(prompt);
    reportUsage(opts.onUsage, result.response, false);
    const raw = result.response.text();
    const subtopics = parseSubtopics(raw);
    if (subtopics.length) {
      let level: PackLevel | undefined;
      try {
        level = parsePackLevel((parseModelJson(raw) as { level?: unknown })?.level);
      } catch {}
      return { ...parsePackTitle(raw, brief), ...(level ? { level } : {}), subtopics };
    }
  }
  return null;
}

/**
 * The redirect search hands back is short-lived, so the page it points at is
 * what gets stored.
 */
async function resolveRedirect(uri: string): Promise<string> {
  try {
    const res = await fetch(uri, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return res.headers.get('location') ?? uri;
  } catch {
    return uri;
  }
}

const PAGE_BYTES = 3_000_000;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: "'", lsquo: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  agrave: 'à', egrave: 'è', ccedil: 'ç', ecirc: 'ê', acirc: 'â', ocirc: 'ô', ouml: 'ö', auml: 'ä', aring: 'å',
};

/**
 * Numeric entities, and the named ones accented Latin text uses. An
 * `pr&eacute;stamo` left encoded can never match `préstamo`, which on a Spanish
 * glossary would be most of the page.
 */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED_ENTITIES[code] ?? m;
  });
}

/** A page's visible text, normalized, or null when it could not be read. */
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; AmgiPackSourcing/1.0)' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html') && !type.includes('text')) return null;
    const html = (await res.text()).slice(0, PAGE_BYTES);
    const text = html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return normalizeTerm(decodeEntities(text));
  } catch {
    return null;
  }
}

export interface SourcingResult {
  words: SourcedWord[];
  dropped: DroppedWord[];
  /** Every page search attributed, and whether it could be read. */
  pages: { url: string; title: string; readable: boolean }[];
}

/**
 * Step 3: find the words for one subtopic in sources.
 *
 * The model searches and lists words, then every page the search returned is
 * fetched and each word is checked against all of them. A word no readable page
 * contains is cut, which is the README's tier C.
 */
export async function sourceSubtopic(opts: {
  apiKey: string;
  brief: PackBrief;
  studyLanguage: StudyLanguage;
  subtopic: Pick<ProposedSubtopic, 'name' | 'note' | 'estimatedWords' | 'searchHint'>;
  knownTerms: string[];
  /** Words already in the pack's other subtopics. */
  excludeTerms?: string[];
  level?: PackLevel;
  onUsage?: OnUsage;
}): Promise<SourcingResult> {
  const { brief, studyLanguage, subtopic, knownTerms, excludeTerms = [], level } = opts;
  const language = getStudyLanguageConfig(studyLanguage).label;
  const model = new GoogleGenerativeAI(opts.apiKey).getGenerativeModel({
    model: MODEL,
    // Search grounding is not in this SDK's types, but the API takes it.
    tools: [{ googleSearch: {} } as never],
    generationConfig: { temperature: 0.2 },
  });

  // Ask for more than the estimate: some lines will not survive the page check.
  const asked = Math.ceil(subtopic.estimatedWords * 1.4);
  const exclude = [...knownTerms, ...excludeTerms];

  const prompt = `A learner of ${language} is building a vocabulary pack.

${describeBrief(brief)}
${materialBlock(brief)}
This part of the pack is "${subtopic.name.English}"${subtopic.note ? ` (${subtopic.note.English})` : ''}.
${describeLevel(level)}
Search the web for published sources that list or use ${language} vocabulary for this: word lists, glossaries, exam guides, dictionaries, real texts. Start from: ${subtopic.searchHint}

Use sources made for this learner's goal or situation. When they name an exam, use that exam's own word lists and guides; a general glossary of the field (business, finance, management) is not one, and its jargon is not what the exam asks.

Take up to ${asked} ${language} words or expressions from what you find. Only take words that appear in a source you found${brief.material ? ' or in their material' : ''}; do not add words of your own. Pick the ones this learner most needs, and skip anything below their level.
${exclude.length ? `\nNever include any of these, they already have them:\n${exclude.join(', ')}\n` : ''}
Write each word as a dictionary headword, spelled as the source spells it:
- its dictionary form: the infinitive for a verb, the base form of an idiom ("burn the midnight oil", not "burning the midnight oil"), lowercase unless always capitalised;
- no article on a noun, and no "to" before a verb;
- one form only, never alternatives joined by a slash;
- a word or a set expression, never a whole sentence, a name, an organisation or a law.

One per line. When the word alone is ambiguous, add " | " and a few English words naming the sense meant. When a word is vulgar, sexual, or offensive where this learner will use it, even if it is harmless elsewhere, end its line with " | vulgar". No numbering, no headings, nothing else.`;

  // Search is the model's to choose, and the eval caught it answering from
  // memory with no pages at all. Nothing would survive the check, so ask again.
  let text = '';
  let meta: GroundingMetadataLike | undefined;
  for (let attempt = 0; attempt < 2 && !meta?.groundingChunks?.length; attempt++) {
    const result = await model.generateContent(prompt);
    reportUsage(opts.onUsage, result.response, true);
    const candidate = result.response.candidates?.[0];
    meta = (candidate as { groundingMetadata?: GroundingMetadataLike } | undefined)?.groundingMetadata;
    text = result.response.text();
  }
  const lines = parseSourcedLines(text);

  // Every page the search returned, resolved and read once. Two chunks can
  // redirect to the same page.
  const uris = [...new Map((meta?.groundingChunks ?? []).flatMap(c => (c.web?.uri ? [[c.web.uri, c.web] as const] : []))).values()];
  const fetched = await Promise.all(
    uris.map(async web => {
      const url = await resolveRedirect(web.uri!);
      return { url, title: web.title ?? '', text: await fetchPageText(url) };
    }),
  );
  const pages = [...new Map(fetched.map(p => [p.url, p])).values()];

  const material = brief.material ? normalizeTerm(brief.material) : null;
  const skip = new Set(exclude.map(normalizeTerm));
  const seen = new Set<string>();
  const words: SourcedWord[] = [];
  const dropped: DroppedWord[] = [];

  for (const raw of lines) {
    const headword = toHeadword(raw.study, studyLanguage);
    if (!headword) {
      dropped.push({ study: raw.study, reason: 'not-headword' });
      continue;
    }
    const line = { ...raw, study: headword };
    const key = normalizeTerm(line.study);
    if (skip.has(key)) {
      dropped.push({ study: line.study, reason: 'known' });
      continue;
    }
    if (seen.has(key)) {
      dropped.push({ study: line.study, reason: 'duplicate' });
      continue;
    }
    seen.add(key);

    const sources: WordSource[] = [];
    if (material && textContainsTerm(material, line.study)) sources.push({ kind: 'material' });
    for (const page of pages) {
      if (page.text && textContainsTerm(page.text, line.study)) {
        sources.push({ kind: 'web', url: page.url, title: page.title });
      }
    }
    const tier = tierFor(sources);
    if (!tier) {
      dropped.push({ study: line.study, reason: 'not-found' });
      continue;
    }
    words.push({
      study: line.study,
      ...(line.sense ? { sense: line.sense } : {}),
      ...(line.vulgar ? { vulgar: true } : {}),
      tier,
      sources,
    });
  }

  // The over-ask was insurance against the check, not a bigger subtopic. The
  // model listed them most-needed first, so the tail is what goes.
  return {
    words: words.slice(0, subtopic.estimatedWords),
    dropped,
    pages: pages.map(p => ({ url: p.url, title: p.title, readable: p.text !== null })),
  };
}
