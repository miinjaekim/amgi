import React from 'react';
import { t } from '@/lib/i18n';

export interface NavItem {
  label: string;
  href: string;
  active: boolean;
  icon: (active: boolean, className?: string) => React.ReactElement;
}

export function getNavItems(nativeLanguage: string | null | undefined, pathname: string): NavItem[] {
  return [
    {
      label: t(nativeLanguage, 'navLearn'),
      href: '/',
      active: pathname === '/',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      ),
    },
    {
      label: t(nativeLanguage, 'navReview'),
      href: '/review',
      active: pathname === '/review',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
        </svg>
      ),
    },
    {
      label: t(nativeLanguage, 'navCards'),
      href: '/cards',
      active: pathname === '/cards',
      icon: (active: boolean, className = 'w-6 h-6') => (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
        </svg>
      ),
    },
  ];
}
