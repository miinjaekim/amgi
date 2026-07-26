import { auth } from '../config/firebase';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Delete the signed-in account and everything belonging to it. Irreversible.
 *
 * The uid is never sent — the server derives it from the ID token, so a
 * tampered request can only ever delete the account it can already prove it
 * owns. Deleting server-side also avoids the client's `deleteUser()`
 * requirement of a recent sign-in, which on the phone would mean a second
 * Google OAuth round trip in the middle of closing an account.
 */
export async function deleteAccount(): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in.');

  const response = await fetch(`${BASE_URL}/api/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Account deletion failed (${response.status})`);
  }
}
