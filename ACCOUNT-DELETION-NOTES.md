# Account deletion — parked 2026-07-27

This branch holds the reverted work from PR #55 (account deletion) and PR #56
(an attempted fix). Both were reverted from `main` by PR #57 after they took
production down. This file is temporary and should be deleted when the work
lands.

## The bug

Adding `import { getAuth } from 'firebase-admin/auth'` to `lib/firebaseAdmin.ts`
makes that module fail to load in Vercel's serverless functions. Every route
importing it then returns 500 before its handler runs.

| Route | Imports firebaseAdmin | Status while broken |
|---|---|---|
| `/api/pronounce` | yes | 500 |
| `/api/word-of-the-day` | yes | 500 |
| `/api/account` | yes | 500 |
| `/api/explain` | no | 405 (fine) |
| `/api/vocab-list` | no | 405 (fine) |

Pronunciation and word of the day were down too — not just the new endpoint.

## Established

- **Module load, not credentials or handler logic.** `GET /api/account`
  returned 500 where it should return 405. A route exporting only `DELETE` can
  only do that if the module throws on import. Same for `/api/pronounce`. This
  is the most useful diagnostic here — a 500 on a wrong-method request means
  the module, not the code you were looking at.
- **Only `auth` triggers it.** `app`, `storage` and `firestore` had been
  imported for months without trouble.
- **Does not reproduce locally.** `next build` succeeds and `next start` serves
  all three routes correctly, with and without the change. A green build and a
  local smoke test both said nothing.
- **`serverExternalPackages: ['firebase-admin']` was not sufficient** — that was
  PR #56, and production still 500'd after it deployed.

## Not yet checked

- **Vercel's function/build logs for the actual require error.** This is the
  gap. Everything above is inferred from HTTP status codes; the logs would name
  the failing module directly and probably end the guesswork quickly. Start
  here.
- Whether the service account has `firebaseauth.users.delete`. This would *not*
  explain a module-load failure, but it matters once loading is fixed.
- A lazy `await import('firebase-admin/auth')` inside `getAdminAuth()`, so
  module load stays clean if the static import is what the bundler mishandles.
  Plausible but untested, and only helps if the static import really is the
  cause.

## Worth doing regardless of the fix

A post-deploy check that actually requests the routes. CI was green on a build
that was broken in production, which is why this reached users at all. Even a
single curl of `/api/word-of-the-day` after deploy would have caught it.

When this lands, `lessons.md` should get the two durable points: a wrong-method
500 means module load, and `firebase-admin` bundles differently on Vercel than
it does locally.

## Resuming

`main` was reverted, so this branch is an ancestor of it. To pick the work back
up, branch from `main` and revert the reverts:

    git checkout -b feat/account-deletion-v2 main
    git revert --no-edit -m 1 <merge commit of PR #57>

Then delete this file.
