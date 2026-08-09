'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import BottomNav from '@/components/BottomNav';
import LanguageSetupModal from '@/components/LanguageSetupModal';

const COLLAPSED_KEY = 'sidenav-collapsed';

/**
 * Pages that must render for someone who has not set up an account — today the
 * privacy policy and its Korean translation. Prefix-matched so `/privacy/ko`
 * is covered without listing every translation as one is added.
 */
function isPublicLegalPage(pathname: string | null): boolean {
  return pathname === '/privacy' || (pathname?.startsWith('/privacy/') ?? false);
}

export default function LayoutWithUser({ children }: { children: React.ReactNode }) {
  const { authLoading, nativeLanguage } = useUser();
  const pathname = usePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);

  // The visual collapsed state (sidebar width + hidden labels) is driven by the
  // `sidenav-collapsed` class on <html>, applied before first paint by the
  // inline script in layout.tsx — so nothing flashes on a fresh load or hard
  // navigation. This React state only mirrors that class to drive tooltips.
  useEffect(() => {
    setNavCollapsed(document.documentElement.classList.contains(COLLAPSED_KEY));
  }, []);

  const toggleNav = () => {
    const next = !document.documentElement.classList.contains(COLLAPSED_KEY);
    document.documentElement.classList.toggle(COLLAPSED_KEY, next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    setNavCollapsed(next);
  };

  return (
    <>
      <Header />
      <SideNav collapsed={navCollapsed} onToggle={toggleNav} />
      {/* Stays mounted through its own third step because it commits both
          answers on the last tap, not as they are given — see the modal.

          Never on the privacy policy. That page is reached from mobile's
          Settings through an in-app browser, which carries no auth and no
          localStorage — so `nativeLanguage` is null there for a signed-in user
          who answered these questions months ago, and the modal covered the
          policy with a setup flow that has no dismiss. It is also the page
          Apple opens under 5.1.1(v), and a legal page nobody can read is worse
          than one nobody has styled. */}
      {!authLoading && nativeLanguage === null && !isPublicLegalPage(pathname) && <LanguageSetupModal />}
      <main className="sm:ml-[var(--sidenav-w,14rem)] container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8 transition-[margin] duration-200">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
