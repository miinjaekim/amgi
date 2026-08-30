import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // `/api/explain` reads the pitch accent table with `fs`, which tracing cannot
  // infer from a runtime-built path. Without this entry the deployed function
  // ships without the file, `lookupPitchAccent` swallows the read error, and
  // the only symptom is that every Japanese card quietly loses its badge —
  // locally it keeps working, because the file is on disk.
  outputFileTracingIncludes: {
    '/api/explain': ['./src/data/pitch-accents.txt'],
  },
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  },
};

export default nextConfig;
