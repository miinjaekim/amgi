'use client';
import React from 'react';
import { useUser } from '@/components/UserContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import LanguageSetupModal from '@/components/LanguageSetupModal';

export default function LayoutWithUser({ children }: { children: React.ReactNode }) {
  const { authLoading, nativeLanguage } = useUser();
  return (
    <>
      <Header />
      {!authLoading && nativeLanguage === null && <LanguageSetupModal />}
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
