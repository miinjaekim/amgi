import type { User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { PackBrief, ProposedSubtopic, StudyLanguage, SubtopicProposal, UserPack } from '@amgi/core';

/**
 * The learner's own packs. Read here, live; every write goes through
 * `/api/user-packs`, because sourcing runs on the server and the client never
 * writes these documents.
 */
export function subscribeToUserPacks(
  uid: string,
  onChange: (packs: UserPack[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'userPacks'), where('ownerUid', '==', uid)),
    snapshot =>
      onChange(
        snapshot.docs
          .map(d => ({ ...(d.data() as Omit<UserPack, 'id'>), id: d.id }))
          .sort((a, b) => a.createdAt - b.createdAt),
      ),
    onError,
  );
}

async function send(user: User | null, path: string, init: { method: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (user) headers.authorization = `Bearer ${await user.getIdToken()}`;
  const res = await fetch(path, {
    method: init.method,
    headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export function proposePackSubtopics(
  brief: PackBrief,
  studyLanguage: StudyLanguage,
  knownTerms: string[],
): Promise<SubtopicProposal> {
  return send(null, '/api/user-packs/subtopics', { method: 'POST', body: { brief, studyLanguage, knownTerms } });
}

export function createUserPack(
  user: User,
  body: {
    brief: PackBrief;
    studyLanguage: StudyLanguage;
    nativeLanguage: string;
    name: SubtopicProposal['name'];
    description: SubtopicProposal['description'];
    subtopics: ProposedSubtopic[];
  },
): Promise<{ id: string; subtopicIds: string[] }> {
  return send(user, '/api/user-packs', { method: 'POST', body });
}

/** Starts (or retries) one subtopic. Returns once the server has taken it. */
export function startPackSubtopic(user: User, packId: string, subtopicId: string, knownTerms: string[]) {
  return send(user, `/api/user-packs/${packId}/source`, { method: 'POST', body: { subtopicId, knownTerms } });
}

export function deleteUserPack(user: User, packId: string) {
  return send(user, `/api/user-packs/${packId}`, { method: 'DELETE' });
}
