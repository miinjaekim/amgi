import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Firebase ID tokens, verified here rather than by `firebase-admin/auth`.
 *
 * **Never import `firebase-admin/auth` in this app** — eslint refuses it. It
 * loads `jwks-rsa`, which is CommonJS and does `require('jose')`, and `jose` is
 * ESM-only. Where the runtime cannot `require()` an ES module that throws
 * `ERR_REQUIRE_ESM` *while the module is loading*, so it is not the route that
 * verifies a token that fails: it is every route that imports
 * `firebaseAdmin.ts`. That took `/api/word-of-the-day` and `/api/pronounce`
 * down twice (PR #55 in July, PR #175 in October), both times with nothing
 * wrong locally, because a current Node on a laptop loads it fine.
 *
 * Importing `jose` from our own code is a different thing: the bundler compiles
 * it into the route as the ES module it is, and nothing `require()`s it.
 *
 * The checks are the ones `verifyIdToken` makes — signed by Google's current
 * key with RS256, issued for this project, not expired, and carrying a subject.
 * It does not check revocation; neither did the call it replaces.
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */

/** Fetched on first use and cached by `jose`, which also refetches on an unknown key ID. */
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/**
 * The uid a Firebase ID token was issued to, or null if it does not verify.
 * `keys` is a parameter so the tests can sign with a key of their own.
 */
export async function verifyIdToken(
  token: string,
  projectId: string | undefined,
  keys: JWTVerifyGetKey = GOOGLE_KEYS,
): Promise<string | null> {
  // Without a project there is no audience to hold the token to, and a token
  // issued for any other Firebase project would pass. Refuse rather than guess.
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      requiredClaims: ['exp', 'sub'],
    });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
