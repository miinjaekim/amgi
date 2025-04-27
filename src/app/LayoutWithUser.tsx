'use client';
import React from 'react';
import { useUser } from '@/components/UserContext';
import Header from '@/components/Header';

export default function LayoutWithUser({ children }: { children: React.ReactNode }) {
  const { user, handleSignIn, handleSignOut } = useUser();
  return (
    <>
      <Header user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
} 