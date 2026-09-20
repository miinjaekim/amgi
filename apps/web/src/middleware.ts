import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MODE_COOKIE_NAME, getMode, parseMode } from '@amgi/core';

/**
 * `/` resolves to whichever mode you were last in.
 *
 * This is the whole of mode persistence on web, and it is deliberately the
 * *only* thing that reads the stored value. Every other path already says which
 * mode it belongs to, so nothing else has to ask.
 *
 * ⚠️ **Only `/`.** A path the user typed, followed or bookmarked is never
 * rewritten — landing on `/review` must always mean Amgi's review, whatever the
 * cookie says, or a shared link stops meaning one thing.
 *
 * Server-side, so the mode is settled before the first byte: the alternative is
 * reading it after hydration and replacing a page that has already painted.
 */
export function middleware(request: NextRequest) {
  const mode = parseMode(request.cookies.get(MODE_COOKIE_NAME)?.value);
  const home = getMode(mode).home;
  if (home === '/') return NextResponse.next();
  return NextResponse.redirect(new URL(home, request.url));
}

/** Matches the site root exactly — not `/*`, and not any other path. */
export const config = { matcher: '/' };
