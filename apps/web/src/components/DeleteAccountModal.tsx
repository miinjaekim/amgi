'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/**
 * Local caches that would otherwise outlive the account. Nothing here is
 * authoritative, but leaving a deleted user's language and streak on the device
 * makes a completed deletion look unfinished.
 *
 * The theme is deliberately kept: it is a preference for this browser, not data
 * about the person, and resetting it would read as a bug.
 */
const LOCAL_KEYS = ['amgi_native_language', 'amgi_study_language'];

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { user, nativeLanguage } = useUser();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? '';
  // Typing the account's own address is language-neutral — a fixed word like
  // DELETE reads as an instruction in one language and noise in the other — and
  // it confirms *which* account is going.
  const confirmed = typed.trim().toLowerCase() === email.toLowerCase() && email.length > 0;

  const handleDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const current = auth.currentUser;
      if (!current) throw new Error('not signed in');

      try {
        await deleteUser(current);
      } catch (err) {
        // Deleting an account is security-sensitive, so Firebase refuses it
        // unless the sign-in is recent (roughly five minutes). Proving it is
        // the same person is reasonable for something irreversible, so this
        // reauthenticates and retries rather than reporting a failure.
        if ((err as { code?: string }).code !== 'auth/requires-recent-login') throw err;
        await reauthenticateWithPopup(current, googleProvider);
        await deleteUser(auth.currentUser ?? current);
      }

      // Firestore data is removed by the Delete User Data extension, which
      // triggers on the deletion above and runs server-side — so it completes
      // whether or not this tab stays open.
      for (const key of LOCAL_KEYS) localStorage.removeItem(key);
      window.location.href = '/';
    } catch (err) {
      // A cancelled reauthentication popup is a decision, not a failure.
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(t(nativeLanguage, 'deleteAccountFailed'));
      }
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{t(nativeLanguage, 'deleteAccountConfirmTitle')}</h2>
        <p className="text-sm text-[var(--color-muted)]">{t(nativeLanguage, 'deleteAccountWarning')}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {t(nativeLanguage, 'deleteAccountExportHint')}{' '}
          <Link href="/cards" className="underline" onClick={onClose}>
            {t(nativeLanguage, 'navCards')}
          </Link>
        </p>

        <label className="block text-sm">
          <span className="block mb-1">{t(nativeLanguage, 'deleteAccountTypeEmail', { email })}</span>
          <input
            type="email"
            autoComplete="off"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            disabled={busy}
            className="w-full p-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
          />
        </label>

        {error && <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>}

        <div className="flex gap-3 justify-end flex-wrap">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
          >
            {t(nativeLanguage, 'cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: '#c0392b', color: '#fff' }}
          >
            {busy ? t(nativeLanguage, 'deleteAccountWorking') : t(nativeLanguage, 'deleteAccountAction')}
          </button>
        </div>
      </div>
    </div>
  );
}
