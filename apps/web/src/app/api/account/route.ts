import { NextResponse } from 'next/server';
import { getDb, getAdminAuth, verifyRequestUid } from '@/lib/firebaseAdmin';
import { userDataCollections } from '@amgi/core';

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400;

async function deleteOwnedDocs(uid: string, collection: string): Promise<number> {
  const db = getDb();
  let deleted = 0;

  // Paged rather than read-all-then-delete: a long-standing account can hold
  // more cards than is comfortable to hold in memory at once.
  for (;;) {
    const snapshot = await db
      .collection(collection)
      .where('uid', '==', uid)
      .limit(BATCH_LIMIT)
      .get();
    if (snapshot.empty) return deleted;

    const batch = db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snapshot.size;

    if (snapshot.size < BATCH_LIMIT) return deleted;
  }
}

/**
 * Delete the caller's account and everything belonging to it. Irreversible.
 *
 * Runs server-side with the Admin SDK for two reasons. Sweeping six
 * collections from the client would be a long sequence of batched deletes with
 * no way to recover from stopping halfway, and `deleteUser()` on the client
 * requires a recent sign-in — which would mean a second Google OAuth round trip
 * purely to satisfy the SDK.
 *
 * Deliberately *not* deleted: cached pronunciation audio in Firebase Storage.
 * It is keyed by a hash of the text, not by user, and is shared — removing it
 * would break playback on other people's cards that happen to use the same
 * word. It holds no personal data, which is why the privacy policy can describe
 * it separately.
 */
export async function DELETE(request: Request) {
  const uid = await verifyRequestUid(request);
  if (!uid) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const collections = userDataCollections();
    let cardsDeleted = 0;
    for (const collection of collections) {
      cardsDeleted += await deleteOwnedDocs(uid, collection);
    }

    await getDb().collection('users').doc(uid).delete();

    // Last, so a failure anywhere above leaves the account still signed-in and
    // retryable rather than orphaning data behind an auth record that is gone.
    await getAdminAuth().deleteUser(uid);

    return NextResponse.json({ deleted: { cards: cardsDeleted, collections: collections.length } });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return NextResponse.json(
      { error: 'Could not delete the account. Nothing was fully removed — please try again.' },
      { status: 500 },
    );
  }
}
