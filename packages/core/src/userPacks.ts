import { parseModelJson } from './modelJson';
import type { PackEntry, VocabPack } from './packs';
import type { StudyLanguage } from './types';

/**
 * Packs a learner makes for themselves.
 *
 * Built so a learner can ask for words without the model writing them. The
 * learner says what the pack is for, the model proposes subtopics (cheap, and
 * the only step it authors), and each chosen subtopic is **sourced**: a
 * search-grounded call lists words from the pages it found, and a word stays
 * only when one of those pages, fetched, actually contains it. That last check
 * is what keeps `docs/packs/README.md`'s rule, "the model is not a source", true
 * here.
 *
 * Google's per-line attribution (`groundingSupports`) is deliberately not
 * used. Measured on the TOEIC eval, it left a whole subtopic with no line
 * attributed, and attributed `invoice` to a page without it. Attribution is the
 * model's claim about a source; a page that contains the word is the source.
 *
 * Everything in this file is pure; the calls live in
 * `apps/web/src/lib/userPackSourcing.ts`.
 */

/**
 * Why the pack exists, in one of the three shapes the hand-made packs started
 * from: a goal (TOEIC), a struggle (English idioms) or a situation (moving to
 * Argentina).
 */
export type PackPurpose = 'goal' | 'struggle' | 'situation';

export const PACK_PURPOSES: readonly PackPurpose[] = ['goal', 'struggle', 'situation'];

/**
 * The learner's answers to the set questions.
 *
 * **No level question.** Level is read from the learner's own cards
 * (`knownTerms` on the requests below), which also lets sourcing skip what they
 * already have.
 */
export interface PackBrief {
  purpose: PackPurpose;
  /** A sentence about the goal, struggle or situation. */
  about: string;
  /** Where the words will be used. */
  usage: string;
  /** Pasted material, optional. Words found in it are cited to it. */
  material?: string;
  /** Anything to focus on or leave out, optional. */
  focus?: string;
}

/** Caps on what a learner can send, so the prompt stays a prompt. */
export const PACK_BRIEF_LIMITS = {
  about: 300,
  usage: 300,
  focus: 300,
  material: 20_000,
  /** Saved study-side terms passed for level and exclusion. */
  knownTerms: 400,
} as const;

/** A validated brief, or null when a required answer is missing. */
export function parsePackBrief(raw: unknown): PackBrief | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  const purpose = PACK_PURPOSES.find(p => p === r.purpose);
  const about = text(r.about, PACK_BRIEF_LIMITS.about);
  const usage = text(r.usage, PACK_BRIEF_LIMITS.usage);
  if (!purpose || !about || !usage) return null;
  return {
    purpose,
    about,
    usage,
    material: text(r.material, PACK_BRIEF_LIMITS.material),
    focus: text(r.focus, PACK_BRIEF_LIMITS.focus),
  };
}

/** The learner's saved terms, trimmed, de-duplicated and capped. */
export function parseKnownTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    const key = normalizeTerm(t);
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= PACK_BRIEF_LIMITS.knownTerms) break;
  }
  return out;
}

/**
 * One subtopic the model proposes. Each one the learner keeps becomes a
 * subpack, so its name follows the section-name rule in `docs/packs/README.md`:
 * short, concrete, and true on its own.
 */
export interface ProposedSubtopic {
  /** Unique within the pack, and never contains `/` (see `packRefId`). */
  id: string;
  name: { English: string; Korean: string };
  note?: { English: string; Korean: string };
  /** Rough size, so the learner can see what ticking it costs. */
  estimatedWords: number;
  /** What sourcing should search for. Pipeline-only, never shown. */
  searchHint: string;
}

export const SUBTOPIC_WORDS = { min: 8, max: 40 } as const;

/** URL-safe, slash-free, unique against `taken`. */
export function subtopicId(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'topic';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** The subtopics in a model response. Malformed entries are dropped, not fatal. */
export function parseSubtopics(raw: string): ProposedSubtopic[] {
  let parsed: unknown;
  try {
    parsed = parseModelJson(raw);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { subtopics?: unknown })?.subtopics)
      ? (parsed as { subtopics: unknown[] }).subtopics
      : [];
  const taken = new Set<string>();
  const out: ProposedSubtopic[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const pair = (v: unknown) => {
      const p = v as Record<string, unknown> | undefined;
      return typeof p?.English === 'string' && p.English.trim() &&
        typeof p?.Korean === 'string' && p.Korean.trim()
        ? { English: p.English.trim(), Korean: p.Korean.trim() }
        : undefined;
    };
    const name = pair(s.name);
    const searchHint = typeof s.searchHint === 'string' ? s.searchHint.trim() : '';
    if (!name || !searchHint) continue;
    const words = Math.round(Number(s.estimatedWords));
    const id = subtopicId(name.English, taken);
    taken.add(id);
    out.push({
      id,
      name,
      note: pair(s.note),
      estimatedWords: Number.isFinite(words)
        ? Math.min(Math.max(words, SUBTOPIC_WORDS.min), SUBTOPIC_WORDS.max)
        : 20,
      searchHint,
    });
  }
  return out;
}

/**
 * Where a word was found. `material` is the learner's own pasted text; `web` is
 * a page search returned.
 */
export type WordSource =
  | { kind: 'material' }
  | { kind: 'web'; url: string; title: string };

/**
 * How well-sourced a word is, on `docs/packs/README.md`'s scale:
 * A is two independent sources, B is one. A word no readable page contains is
 * C, and is cut.
 */
export type SourceTier = 'A' | 'B';

export interface SourcedWord {
  /** The study-language text, the front of the card. */
  study: string;
  /**
   * Which sense, in English, when the word alone is ambiguous. Handed to the
   * lookup route as `context` when the card is made, the way a hand-made
   * pack's `context` is.
   */
  sense?: string;
  tier: SourceTier;
  /** Only sources that were checked to contain the word. */
  sources: WordSource[];
}

/** Why a word the search attributed did not make it. */
export interface DroppedWord {
  study: string;
  reason: 'known' | 'duplicate' | 'not-found';
}

/**
 * Case, width and accent-composition folded, so `Résumé` saved on a card
 * matches `résumé` on a page. Accents are *kept*: dropping them would make a
 * page without diacritics corroborate the spelling, which the README says it
 * does not.
 */
export function normalizeTerm(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * One line of grounded output: `word` or `word | sense`. Numbering and bullets
 * are stripped, because the model adds them however it is asked.
 */
export function parseSourcedLine(line: string): { study: string; sense?: string } | null {
  const cleaned = line
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
  // A heading or a preamble ("Here are the words:") is not an entry.
  if (!cleaned || cleaned.endsWith(':')) return null;
  const [studyPart, ...rest] = cleaned.split('|');
  let study = studyPart.trim().replace(/^["“]|["”]$/g, '');
  let sense = rest.join('|').trim();
  // `CBU (Clave Bancaria Uniforme)`: the brackets are a gloss, and left on the
  // study side they stop the word matching the page it came from.
  const bracket = study.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (bracket) {
    study = bracket[1].trim();
    sense ||= bracket[2].trim();
  }
  if (!study || study.length > 60) return null;
  return sense ? { study, sense } : { study };
}

/** The subset of Gemini's grounding metadata this pipeline reads. */
export interface GroundingMetadataLike {
  groundingChunks?: { web?: { uri?: string; title?: string } }[];
}

/** The entries in a grounded response, one per line. */
export function parseSourcedLines(text: string): { study: string; sense?: string }[] {
  return text.split('\n').flatMap(line => {
    const parsed = parseSourcedLine(line);
    return parsed ? [parsed] : [];
  });
}

/**
 * Whether `term` appears in `haystack` (already normalized).
 *
 * Latin-script terms need a word boundary, so `bid` is not found inside
 * `forbidden`. Scripts written without spaces — Hangul, kana, Han — take a
 * plain substring, since there is no boundary to find.
 */
export function textContainsTerm(haystack: string, term: string): boolean {
  const needle = normalizeTerm(term);
  if (!needle) return false;
  if (/[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯豈-﫿]/.test(needle)) {
    return haystack.includes(needle);
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(haystack);
}

/** The host a URL names, without `www.`, for counting independent sources. */
export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * A: two independent sources (two domains, or the learner's material plus a
 * page). B: one. Null: none, and the word is cut.
 */
export function tierFor(sources: WordSource[]): SourceTier | null {
  const independent = new Set(sources.map(s => (s.kind === 'material' ? 'material' : sourceDomain(s.url))));
  if (independent.size >= 2) return 'A';
  if (independent.size === 1) return 'B';
  return null;
}

/** A pack's name and one-line description, in both interface languages. */
export interface PackTitle {
  name: { English: string; Korean: string };
  description: { English: string; Korean: string };
}

/** What the subtopics step returns: a proposed title, and the subtopics. */
export interface SubtopicProposal extends PackTitle {
  subtopics: ProposedSubtopic[];
}

/**
 * The title in a subtopics response, or a plain fallback made from the
 * learner's own words when the model left it out.
 */
export function parsePackTitle(raw: string, brief: PackBrief): PackTitle {
  let parsed: Record<string, unknown> = {};
  try {
    const value = parseModelJson(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value as Record<string, unknown>;
  } catch {}
  const pair = (v: unknown, fallback: string) => {
    const p = v as Record<string, unknown> | undefined;
    return {
      English: typeof p?.English === 'string' && p.English.trim() ? p.English.trim() : fallback,
      Korean: typeof p?.Korean === 'string' && p.Korean.trim() ? p.Korean.trim() : fallback,
    };
  };
  const short = brief.about.length > 40 ? `${brief.about.slice(0, 40)}…` : brief.about;
  return { name: pair(parsed.name, short), description: pair(parsed.description, brief.about) };
}

/**
 * A learner's pack as stored, one Firestore document per pack in `userPacks`.
 *
 * **Owner and visibility are here from the start**, though phase 1 is private:
 * sharing is where this is headed, and adding an owner to documents that were
 * written without one is a migration. Only the server writes these; the
 * client reads its own.
 */
export interface UserPack extends PackTitle {
  id: string;
  ownerUid: string;
  visibility: 'private';
  studyLanguage: StudyLanguage;
  nativeLanguage: string;
  brief: PackBrief;
  subtopics: UserPackSubtopic[];
  /** Epoch ms. */
  createdAt: number;
}

/**
 * `failed` covers a search that returned no pages as well as an error: the
 * eval saw the model skip search even when retried, and the learner can try
 * again.
 */
export type SubtopicStatus = 'pending' | 'sourcing' | 'ready' | 'failed';

export interface UserPackEntry extends PackEntry {
  tier: SourceTier;
  sources: WordSource[];
}

export interface UserPackSubtopic extends ProposedSubtopic {
  status: SubtopicStatus;
  entries: UserPackEntry[];
  /**
   * Epoch ms when sourcing last started. A function that times out never
   * writes `failed`, so a subtopic stuck in `sourcing` past
   * `SOURCING_STALE_MS` is offered for retry.
   */
  startedAt?: number;
}

/** Longer than a sourcing function is allowed to run (300s), with margin. */
export const SOURCING_STALE_MS = 6 * 60 * 1000;

/** Whether the learner can start this subtopic again. */
export function canRetrySubtopic(subtopic: Pick<UserPackSubtopic, 'status' | 'startedAt'>, now = Date.now()): boolean {
  if (subtopic.status === 'failed') return true;
  return subtopic.status === 'sourcing' && now - (subtopic.startedAt ?? 0) > SOURCING_STALE_MS;
}

/** Pack ids are namespaced so they can never collide with a curated one. */
export const USER_PACK_PREFIX = 'user-';

export function userPackId(docId: string): string {
  return `${USER_PACK_PREFIX}${docId}`;
}

export function isUserPackId(packId: string): boolean {
  return packId.startsWith(USER_PACK_PREFIX);
}

/**
 * The pack as every pack surface sees it. Only finished subtopics become
 * sections, so a pack still being sourced shows what it has so far.
 */
export function userPackToVocabPack(pack: UserPack): VocabPack {
  return {
    id: userPackId(pack.id),
    name: pack.name,
    description: pack.description,
    layout: 'list',
    pronounceable: true,
    userMade: true,
    sections: pack.subtopics
      .filter(s => s.status === 'ready' && s.entries.length > 0)
      .map(s => ({
        id: s.id,
        name: s.name,
        ...(s.note ? { note: s.note } : {}),
        entries: s.entries,
      })),
  };
}

/** How far along sourcing is. Done means nothing is pending or running. */
export function userPackProgress(pack: Pick<UserPack, 'subtopics'>) {
  const count = (status: SubtopicStatus) => pack.subtopics.filter(s => s.status === status).length;
  const ready = count('ready');
  const failed = count('failed');
  const total = pack.subtopics.length;
  return { ready, failed, total, done: ready + failed === total };
}
