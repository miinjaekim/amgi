import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
  }
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Lazy — only touches env vars/credentials when a request actually needs
// Storage, not at module import time (which runs during Next.js's build-time
// page-data collection, before that's a safe assumption).
export function getBucket() {
  return getStorage(getAdminApp()).bucket();
}

export function getDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

/**
 * The uid behind a request's `Authorization: Bearer <Firebase ID token>`, or
 * null if there isn't a valid one.
 *
 * A uid sent in the body or a query string is a claim, not proof — anyone
 * could send someone else's. For a request that destroys an account, the uid
 * has to come from a token the server has verified, which is what this is for.
 */
export async function verifyRequestUid(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  try {
    return (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    // Expired, malformed, or signed by someone else — all equally "no".
    return null;
  }
}
