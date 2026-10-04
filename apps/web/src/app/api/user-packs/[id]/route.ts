import { NextRequest, NextResponse } from 'next/server';
import { getDb, verifyRequestUid } from '@/lib/firebaseAdmin';
import { USER_PACKS } from '@/lib/userPackJobs';

/**
 * Deletes a pack. Cards already saved from it stay: they are the learner's
 * cards now, the same as when a curated pack leaves the registry.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verifyRequestUid(req);
  if (!uid) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const { id } = await params;
  const ref = getDb().collection(USER_PACKS).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerUid !== uid) {
    return NextResponse.json({ error: 'No such pack' }, { status: 404 });
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
