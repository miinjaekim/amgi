// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import { verifyIdToken } from '@/lib/idToken';

const PROJECT = 'amgi-test';
const ISSUER = `https://securetoken.google.com/${PROJECT}`;

type Key = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

let keys: JWTVerifyGetKey;
let googleKey: Key;
let strangerKey: Key;

/** A token shaped like Firebase's, with any part of it overridable. */
function token(
  overrides: { sub?: string | null; aud?: string; iss?: string; exp?: string | null; key?: Key; kid?: string } = {},
) {
  const jwt = new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: overrides.kid ?? 'google-1' })
    .setIssuer(overrides.iss ?? ISSUER)
    .setAudience(overrides.aud ?? PROJECT)
    .setIssuedAt();
  if (overrides.sub !== null) jwt.setSubject(overrides.sub ?? 'uid-123');
  if (overrides.exp !== null) jwt.setExpirationTime(overrides.exp ?? '1h');
  return jwt.sign(overrides.key ?? googleKey);
}

beforeAll(async () => {
  const google = await generateKeyPair('RS256');
  const stranger = await generateKeyPair('RS256');
  googleKey = google.privateKey;
  strangerKey = stranger.privateKey;
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(google.publicKey)), kid: 'google-1', alg: 'RS256', use: 'sig' }],
  });
});

describe('verifyIdToken', () => {
  it('returns the uid of a token Google signed for this project', async () => {
    expect(await verifyIdToken(await token(), PROJECT, keys)).toBe('uid-123');
  });

  it('refuses a token issued for another Firebase project', async () => {
    const other = await token({ aud: 'someone-elses-app', iss: 'https://securetoken.google.com/someone-elses-app' });
    expect(await verifyIdToken(other, PROJECT, keys)).toBeNull();
  });

  it('refuses the right audience from the wrong issuer', async () => {
    expect(await verifyIdToken(await token({ iss: 'https://example.com' }), PROJECT, keys)).toBeNull();
  });

  it('refuses a token signed by a key that is not Google\'s', async () => {
    expect(await verifyIdToken(await token({ key: strangerKey }), PROJECT, keys)).toBeNull();
  });

  it('refuses an expired token, and one with no expiry at all', async () => {
    expect(await verifyIdToken(await token({ exp: '-1m' }), PROJECT, keys)).toBeNull();
    expect(await verifyIdToken(await token({ exp: null }), PROJECT, keys)).toBeNull();
  });

  it('refuses a token with no subject', async () => {
    expect(await verifyIdToken(await token({ sub: null }), PROJECT, keys)).toBeNull();
    expect(await verifyIdToken(await token({ sub: '' }), PROJECT, keys)).toBeNull();
  });

  it('refuses an unsigned token', async () => {
    const [, payload] = (await token()).split('.');
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    expect(await verifyIdToken(`${header}.${payload}.`, PROJECT, keys)).toBeNull();
  });

  it('refuses everything when the project is not configured', async () => {
    expect(await verifyIdToken(await token(), undefined, keys)).toBeNull();
    expect(await verifyIdToken(await token(), '', keys)).toBeNull();
  });

  it('refuses an empty or malformed token without throwing', async () => {
    expect(await verifyIdToken('', PROJECT, keys)).toBeNull();
    expect(await verifyIdToken('not-a-jwt', PROJECT, keys)).toBeNull();
  });
});
