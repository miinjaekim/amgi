import {
  getStudyLanguageConfig,
  normalizeTerm,
  type PackBack,
  type SourcedWord,
  type UserPack,
  type UserPackEntry,
  type UserPackSubtopic,
} from '@amgi/core';
import { getDb } from '@/lib/firebaseAdmin';
import { sourceSubtopic } from '@/lib/userPackSourcing';

/**
 * The background half of a user-made pack: source one subtopic, give each word
 * a back, and write it into the pack document.
 *
 * One subtopic per function invocation. A whole pack took ten minutes in the
 * eval, past a function's 300s, and a subtopic takes under two.
 */

export const USER_PACKS = 'userPacks';

const BACK_CONCURRENCY = 5;

/**
 * A card back for one sourced word, from `/api/explain`: the same route a
 * looked-up word goes through, so a user pack's card and a looked-up card for
 * the same word agree. Called over HTTP rather than imported for exactly that
 * reason; a second prompt here would drift.
 */
async function explainBack(
  origin: string,
  word: SourcedWord,
  subtopicName: string,
  studyLanguage: UserPack['studyLanguage'],
  nativeLanguage: string,
): Promise<UserPackEntry | null> {
  try {
    const res = await fetch(`${origin}/api/explain`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        term: word.study,
        // Always a context, so the route explains one sense rather than
        // coming back with a list of meanings to pick from.
        context: word.sense ?? `as used in the topic "${subtopicName}"`,
        studyLanguage,
        nativeLanguage,
        exact: true,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // The study side's own slot would be overwritten at save time, so it is
    // never authored as a back (see `PackBack`).
    const studyField = getStudyLanguageConfig(studyLanguage).studyField;
    const back: PackBack = {};
    if (studyField !== 'english' && typeof data.english === 'string' && data.english.trim()) back.English = data.english.trim();
    if (studyField !== 'korean' && typeof data.korean === 'string' && data.korean.trim()) back.Korean = data.korean.trim();
    if (!back.English && !back.Korean) return null;
    return {
      study: word.study,
      back,
      ...(word.sense ? { context: word.sense } : {}),
      ...(typeof data.gender === 'string' && data.gender ? { gender: data.gender } : {}),
      tier: word.tier,
      sources: word.sources,
    };
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * Firestore refuses `undefined` anywhere in a write, and optional fields
 * (a subtopic with no note) arrive as exactly that.
 */
export function firestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function patchSubtopic(pack: UserPack, subtopicId: string, patch: Partial<UserPackSubtopic>): UserPackSubtopic[] {
  return firestoreSafe(pack.subtopics.map(s => (s.id === subtopicId ? { ...s, ...patch } : s)));
}

/** Marks a subtopic as started. Returns the pack, or null if it is not the caller's. */
export async function startSubtopic(packId: string, subtopicId: string, uid: string): Promise<UserPack | null> {
  const ref = getDb().collection(USER_PACKS).doc(packId);
  return getDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const pack = snap.exists ? ({ ...snap.data(), id: snap.id } as UserPack) : null;
    if (!pack || pack.ownerUid !== uid || !pack.subtopics.some(s => s.id === subtopicId)) return null;
    tx.update(ref, { subtopics: patchSubtopic(pack, subtopicId, { status: 'sourcing', startedAt: Date.now() }) });
    return pack;
  });
}

export async function runSubtopic(opts: {
  pack: UserPack;
  subtopicId: string;
  knownTerms: string[];
  origin: string;
}): Promise<void> {
  const { pack, subtopicId, knownTerms, origin } = opts;
  const ref = getDb().collection(USER_PACKS).doc(pack.id);
  const subtopic = pack.subtopics.find(s => s.id === subtopicId)!;

  let entries: UserPackEntry[] = [];
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API not configured');
    // Sibling subtopics source in parallel, so only the ones already finished
    // can be excluded here; the write below catches the rest.
    const excludeTerms = pack.subtopics.filter(s => s.id !== subtopicId).flatMap(s => s.entries.map(e => e.study));
    const { words } = await sourceSubtopic({
      apiKey,
      brief: pack.brief,
      studyLanguage: pack.studyLanguage,
      subtopic,
      knownTerms,
      excludeTerms,
    });
    const backed = await mapLimit(words, BACK_CONCURRENCY, w =>
      explainBack(origin, w, subtopic.name.English, pack.studyLanguage, pack.nativeLanguage),
    );
    entries = backed.filter((e): e is UserPackEntry => e !== null);
  } catch (error) {
    console.error('user pack sourcing failed', pack.id, subtopicId, error);
  }

  await getDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return; // deleted while sourcing
    const current = { ...snap.data(), id: snap.id } as UserPack;
    // A term belongs to exactly one section of its pack (docs/packs/README.md),
    // and whichever subtopic finished first keeps it.
    const taken = new Set(
      current.subtopics.filter(s => s.id !== subtopicId).flatMap(s => s.entries.map(e => normalizeTerm(e.study))),
    );
    const kept = entries.filter(e => !taken.has(normalizeTerm(e.study)));
    tx.update(ref, {
      subtopics: patchSubtopic(current, subtopicId, {
        status: kept.length ? 'ready' : 'failed',
        entries: kept,
      }),
    });
  });
}
