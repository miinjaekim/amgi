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

/**
 * The signed-in user behind a request, from its `Authorization: Bearer <id
 * token>` header, or null. Needed wherever the server writes on a user's
 * behalf; the model routes that write nothing don't ask.
 */
export async function verifyRequestUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return null;
  try {
    return (await getAuth(getAdminApp()).verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}
