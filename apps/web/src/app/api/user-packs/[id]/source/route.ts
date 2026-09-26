import { after, NextRequest, NextResponse } from 'next/server';
import { parseKnownTerms } from '@amgi/core';
import { verifyRequestUid } from '@/lib/firebaseAdmin';
import { runSubtopic, startSubtopic } from '@/lib/userPackJobs';

/**
 * Sources one subtopic of a pack in the background: `{ subtopicId,
 * knownTerms? }` → 202. The result lands in the pack document, which the
 * client is already listening to. Also how a failed subtopic is retried.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const subtopicId = typeof body?.subtopicId === 'string' ? body.subtopicId : '';
  const pack = subtopicId ? await startSubtopic(id, subtopicId, uid) : null;
  if (!pack) return NextResponse.json({ error: 'No such pack or subtopic' }, { status: 404 });

  const knownTerms = parseKnownTerms(body.knownTerms);
  const origin = req.nextUrl.origin;
  after(() => runSubtopic({ pack, subtopicId, knownTerms, origin }));
  return NextResponse.json({ ok: true }, { status: 202 });
}
