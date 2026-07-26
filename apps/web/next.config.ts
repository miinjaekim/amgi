import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Load firebase-admin from node_modules at runtime instead of bundling it
   * into the serverless function.
   *
   * It resolves its own internals through dynamic requires, which the bundler
   * cannot follow — the pieces it misses are simply absent from the deployed
   * function, and the module throws when required. Everything importing
   * `lib/firebaseAdmin` then returns 500 before its handler ever runs, so the
   * failure looks nothing like a Firebase problem: wrong-method requests that
   * should 404/405 return 500 too.
   *
   * This stayed hidden while only `app`, `storage`, and `firestore` were
   * imported and surfaced when `auth` was added (PR #55), whose JWT and JWKS
   * dependencies are the ones that break. It reproduces on Vercel only —
   * `next build && next start` locally bundles differently and serves all three
   * routes fine, which is why the build passing proved nothing.
   */
  serverExternalPackages: ['firebase-admin'],
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  },
};

export default nextConfig;
