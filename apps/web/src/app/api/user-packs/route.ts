import { NextRequest, NextResponse } from 'next/server';
import {
  parsePackBrief,
  parseSubtopics,
  type StudyLanguage,
  type UserPack,
  type UserPackSubtopic,
} from '@amgi/core';
import { getDb, verifyRequestUid } from '@/lib/firebaseAdmin';
import { USER_PACKS, firestoreSafe } from '@/lib/userPackJobs';

/**
 * Creates a pack from the subtopics the learner kept:
 * `{ brief, studyLanguage, nativeLanguage, name, description, subtopics }` →
 * `{ id }`. Nothing is sourced yet; the client starts each subtopic with
 * `POST /api/user-packs/{id}/source`.
 */
export async function POST(req: NextRequest) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Sign in to make a pack' }, { status: 401 });

  const body = await req.json();
  const brief = parsePackBrief(body?.brief);
  // Re-validated through the parser the subtopics step used, so ids are
  // regenerated here and can't carry a slash in from the client.
  const subtopics = parseSubtopics(JSON.stringify(body?.subtopics ?? []));
  const name = body?.name;
  const description = body?.description;
  const valid = (p: unknown) =>
    !!p && typeof (p as { English?: unknown }).English === 'string' && typeof (p as { Korean?: unknown }).Korean === 'string';
  if (!brief || subtopics.length === 0 || !valid(name) || !valid(description)) {
    return NextResponse.json({ error: 'brief, name, description and subtopics are required' }, { status: 400 });
  }

  const ref = getDb().collection(USER_PACKS).doc();
  const pack: Omit<UserPack, 'id'> = {
    ownerUid: uid,
    visibility: 'private',
    studyLanguage: (body.studyLanguage ?? 'Korean') as StudyLanguage,
    nativeLanguage: body.nativeLanguage === 'Korean' ? 'Korean' : 'English',
    brief,
    name: { English: name.English.slice(0, 80), Korean: name.Korean.slice(0, 80) },
    description: { English: description.English.slice(0, 200), Korean: description.Korean.slice(0, 200) },
    subtopics: subtopics.map((s): UserPackSubtopic => ({ ...s, status: 'pending', entries: [] })),
    createdAt: Date.now(),
  };
  await ref.set(firestoreSafe(pack));
  return NextResponse.json({ id: ref.id, subtopicIds: pack.subtopics.map(s => s.id) });
}
