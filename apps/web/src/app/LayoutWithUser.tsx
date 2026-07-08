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

  // Read after mount — localStorage in a useState initializer causes a hydration mismatch.
  useEffect(() => {
    setNavCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
  }, []);

  // Sidebar width is a root CSS variable so the sidebar, main content, and any
  // fixed bars (e.g. cards bulk actions) stay in sync when collapsed.
  useEffect(() => {
    // Collapsed width fits the logo row (the widest fixed content).
    document.documentElement.style.setProperty('--sidenav-w', navCollapsed ? '4.5rem' : '14rem');
  }, [navCollapsed]);

  const toggleNav = () => {
    setNavCollapsed(v => {
      localStorage.setItem(COLLAPSED_KEY, v ? '0' : '1');
      return !v;
    });
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
