import { useEffect, useMemo, useState } from 'react';
import { savedWritingsFor } from '@amgi/core';
import type { SavedWriting } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { subscribeToSavedWritings } from '../services/writings';

/**
 * The signed-in learner's saved writings in the language being studied, newest
 * first, live.
 *
 * `loading` is true until the first snapshot (or its failure) for this
 * account, so a surface can tell "none saved" from "not known yet".
 */
export function useSavedWritings(): { writings: SavedWriting[]; loading: boolean } {
  const { user, studyLanguage } = useUser();
  const uid = user?.uid;
  const [state, setState] = useState<{ uid: string; writings: SavedWriting[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeToSavedWritings(
      uid,
      writings => setState({ uid, writings }),
      error => {
        console.error(error);
        setState({ uid, writings: [] });
      },
    );
  }, [uid]);

  const all = state && state.uid === uid ? state.writings : null;
  const writings = useMemo(() => savedWritingsFor(all ?? [], studyLanguage), [all, studyLanguage]);
  return { writings, loading: !!uid && all === null };
}
