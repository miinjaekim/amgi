'use client';
import React from 'react';
import { useUser } from '@/components/UserContext';
import Header from '@/components/Header';
import LanguageSetupModal from '@/components/LanguageSetupModal';

export default function LayoutWithUser({ children }: { children: React.ReactNode }) {
  const { user, nativeLanguage, handleSignIn, handleSignOut } = useUser();
  return (
    <>
      <Header user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
      {user && nativeLanguage === null && <LanguageSetupModal />}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}
