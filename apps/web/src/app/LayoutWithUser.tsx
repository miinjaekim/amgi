'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import BottomNav from '@/components/BottomNav';
import LanguageSetupModal from '@/components/LanguageSetupModal';

const COLLAPSED_KEY = 'sidenav-collapsed';

export default function LayoutWithUser({ children }: { children: React.ReactNode }) {
  const { authLoading, nativeLanguage } = useUser();
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
      {!authLoading && nativeLanguage === null && <LanguageSetupModal />}
      <main className="sm:ml-[var(--sidenav-w,14rem)] container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8 transition-[margin] duration-200">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
