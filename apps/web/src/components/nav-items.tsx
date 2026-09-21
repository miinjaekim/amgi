import React from 'react';
import { modeFromPath } from '@amgi/core';
import { t } from '@/lib/i18n';

export interface NavItem {
  label: string;
  href: string;
  active: boolean;
  icon: (active: boolean, className?: string) => React.ReactElement;
}

/**
 * The nav for whichever mode this path belongs to.
 *
 * The mode is derived from the path rather than passed in, so a caller cannot
 * render one mode's chrome around another mode's page. Every nav surface —
 * `SideNav`, `BottomNav` — goes through here.
 *
 * ⚠️ **Munli's list grows a row per tool, and no faster.** The mode shipped
 * before its first tool by design, and a navigation invented for surfaces that
 * do not exist is furniture. Callers still render an empty list as an empty
 * state rather than a missing one, because that is true again the moment a mode
 * is added.
 */
export function getNavItemsForMode(interfaceLanguage: string | null | undefined, pathname: string): NavItem[] {
  return modeFromPath(pathname) === 'munli'
    ? getMunliNavItems(interfaceLanguage, pathname)
    : getNavItems(interfaceLanguage, pathname);
}

/** Munli's tools. One row each, in the order they were built. */
export function getMunliNavItems(interfaceLanguage: string | null | undefined, pathname: string): NavItem[] {
  return [
    {
      label: t(interfaceLanguage, 'munliToolWriting'),
      href: '/munli/writing',
      active: pathname.startsWith('/munli/writing'),
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM19.5 15v3.75A2.25 2.25 0 0117.25 21H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5H9" />
        </svg>
      ),
    },
    {
      label: t(interfaceLanguage, 'munliToolConjugation'),
      href: '/munli/conjugation',
      active: pathname.startsWith('/munli/conjugation'),
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18M8 3v18" />
        </svg>
      ),
    },
    // Last, as Progress is last in Amgi's nav — the shell is the same in every
    // mode, and only what it measures changes.
    {
      label: t(interfaceLanguage, 'navProgress'),
      href: '/munli/progress',
      active: pathname.startsWith('/munli/progress'),
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 19v-6m4 6V9m4 10v-4" />
        </svg>
      ),
    },
  ];
}

/** Nav labels are chrome, so they take the interface language, never a deck's. */
export function getNavItems(interfaceLanguage: string | null | undefined, pathname: string): NavItem[] {
  return [
    {
      label: t(interfaceLanguage, 'navLearn'),
      href: '/',
      active: pathname === '/',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      ),
    },
    {
      label: t(interfaceLanguage, 'navReview'),
      href: '/review',
      active: pathname === '/review',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
        </svg>
      ),
    },
    {
      label: t(interfaceLanguage, 'navCards'),
      href: '/cards',
      active: pathname === '/cards',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
        </svg>
      ),
    },
    // Unconditional, even on a language with no packs: a nav item that appears
    // and disappears would reflow the bar on every study-language switch, which
    // is worse than a quiet empty state. Packs are a peer of Cards now, not a
    // drill-down from Learn.
    {
      label: t(interfaceLanguage, 'navDecks'),
      href: '/decks',
      active: pathname.startsWith('/decks'),
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6M4 6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2m-7 0h7m0 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2m-7 0h7M8 10h3m2 0h3" />
        </svg>
      ),
    },
    {
      label: t(interfaceLanguage, 'navProgress'),
      href: '/progress',
      active: pathname === '/progress',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 19v-6m4 6V9m4 10v-4" />
        </svg>
      ),
    },
  ];
}
