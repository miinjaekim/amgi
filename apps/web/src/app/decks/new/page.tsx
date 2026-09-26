'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { subscribeToAllUserFlashcards } from '@/services/firestore';
import { createUserPack, proposePackSubtopics, startPackSubtopic } from '@/services/userPacks';
import {
  PACK_BRIEF_LIMITS,
  getPackText,
  getStudyLangSide,
  userPackId,
  type PackBrief,
  type PackPurpose,
  type ProposedSubtopic,
  type SubtopicProposal,
  type TranslationKey,
} from '@amgi/core';
import { t } from '@/lib/i18n';

const PURPOSES: { id: PackPurpose; label: TranslationKey; hint: TranslationKey }[] = [
  { id: 'goal', label: 'makePackPurposeGoal', hint: 'makePackPurposeGoalHint' },
  { id: 'struggle', label: 'makePackPurposeStruggle', hint: 'makePackPurposeStruggleHint' },
  { id: 'situation', label: 'makePackPurposeSituation', hint: 'makePackPurposeSituationHint' },
];

const inputClass =
  'w-full p-3 rounded-lg border border-[var(--color-muted)] bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-highlight)]';

/**
 * Making a pack: a few set questions, then the subtopics the model proposes.
 *
 * Set questions rather than one text box or a chat, per the backlog: each
 * answer has a job in the prompt, and a blank box gets "TOEIC" and nothing
 * else. No level question; the learner's saved cards answer it.
 */
export default function MakePackPage() {
  const router = useRouter();
  const { user, interfaceLanguage, studyLanguage, deckNativeLanguage } = useUser();
  const [purpose, setPurpose] = useState<PackPurpose | null>(null);
  const [about, setAbout] = useState('');
  const [usage, setUsage] = useState('');
  const [material, setMaterial] = useState('');
  const [focus, setFocus] = useState('');
  const [proposal, setProposal] = useState<SubtopicProposal | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownTerms, setKnownTerms] = useState<string[]>([]);

  // What the learner already has: their level, and words not to suggest again.
  useEffect(() => {
    if (!user) return;
    return subscribeToAllUserFlashcards(
      user.uid,
      studyLanguage,
      cards => setKnownTerms(cards.map(c => getStudyLangSide(c)).filter(Boolean)),
      () => {},
    );
  }, [user, studyLanguage]);

  const brief = (): PackBrief | null =>
    purpose && about.trim() && usage.trim()
      ? {
          purpose,
          about: about.trim(),
          usage: usage.trim(),
          ...(material.trim() ? { material: material.trim() } : {}),
          ...(focus.trim() ? { focus: focus.trim() } : {}),
        }
      : null;

  async function suggest() {
    const b = brief();
    if (!b) return;
    setBusy(true);
    setError(null);
    try {
      const next = await proposePackSubtopics(b, studyLanguage, knownTerms);
      setProposal(next);
      setPicked(new Set(next.subtopics.map(s => s.id)));
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
    }
    setBusy(false);
  }

  function addCustom() {
    const name = custom.trim();
    if (!name || !proposal) return;
    const id = `custom-${proposal.subtopics.length + 1}`;
    const part: ProposedSubtopic = {
      id,
      // The learner's own words, in whichever language they typed them.
      name: { English: name, Korean: name },
      estimatedWords: 20,
      searchHint: name,
    };
    setProposal({ ...proposal, subtopics: [...proposal.subtopics, part] });
    setPicked(new Set([...picked, id]));
    setCustom('');
  }

  async function create() {
    const b = brief();
    if (!b || !proposal || !user) return;
    const subtopics = proposal.subtopics.filter(s => picked.has(s.id));
    if (subtopics.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { id, subtopicIds } = await createUserPack(user, {
        brief: b,
        studyLanguage,
        nativeLanguage: deckNativeLanguage,
        name: proposal.name,
        description: proposal.description,
        subtopics,
      });
      // Each part is its own background job. Once the server has taken them
      // all, the learner is free to go; the pack page shows the rest.
      await Promise.all(subtopicIds.map(sid => startPackSubtopic(user, id, sid, knownTerms)));
      router.push(`/decks/${userPackId(id)}`);
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
      setBusy(false);
    }
  }

  const back = (
    <Link href="/decks" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
      ← {t(interfaceLanguage, 'decksBack')}
    </Link>
  );

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        {back}
        <p className="mt-6 text-[var(--color-muted)]">{t(interfaceLanguage, 'makePackSignIn')}</p>
      </div>
    );
  }

  const label = (key: TranslationKey) => (
    <span className="block text-sm font-semibold text-[var(--color-text)] mb-2">{t(interfaceLanguage, key)}</span>
  );

  if (proposal) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setProposal(null)}
          disabled={busy}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← {t(interfaceLanguage, 'makePackBack')}
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mt-4">
          {getPackText(proposal.name, interfaceLanguage)}
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">{getPackText(proposal.description, interfaceLanguage)}</p>

        <h2 className="text-lg font-semibold text-[var(--color-text)] mt-8">{t(interfaceLanguage, 'makePackPartsTitle')}</h2>
        <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">{t(interfaceLanguage, 'makePackPartsIntro')}</p>

        <ul className="flex flex-col gap-2">
          {proposal.subtopics.map(s => {
            const on = picked.has(s.id);
            return (
              <li key={s.id}>
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    on ? 'border-[var(--color-highlight)] bg-[var(--color-muted)]/20' : 'border-[var(--color-muted)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = new Set(picked);
                      if (on) next.delete(s.id);
                      else next.add(s.id);
                      setPicked(next);
                    }}
                    className="mt-1 accent-[var(--color-highlight)]"
                  />
                  <span className="flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[var(--color-text)]">{getPackText(s.name, interfaceLanguage)}</span>
                      <span className="text-xs text-[var(--color-muted)] shrink-0">
                        {t(interfaceLanguage, 'makePackPartWords', { count: s.estimatedWords })}
                      </span>
                    </span>
                    {s.note && (
                      <span className="block text-sm text-[var(--color-muted)] mt-0.5">
                        {getPackText(s.note, interfaceLanguage)}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-4">
          {label('makePackAddPart')}
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
              maxLength={80}
              placeholder={t(interfaceLanguage, 'makePackAddPartPlaceholder')}
              className={inputClass}
            />
            <button
              onClick={addCustom}
              disabled={!custom.trim()}
              className="px-4 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] disabled:opacity-40"
            >
              {t(interfaceLanguage, 'makePackAdd')}
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-[var(--color-highlight)]">{error}</p>}
        <button
          onClick={create}
          disabled={busy || picked.size === 0}
          className="mt-8 w-full py-3 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] disabled:opacity-40"
        >
          {busy ? t(interfaceLanguage, 'makePackCreating') : t(interfaceLanguage, 'makePackCreate')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {back}
      <h1 className="text-2xl font-bold text-[var(--color-text)] mt-4">{t(interfaceLanguage, 'makePackTitle')}</h1>
      <p className="text-sm text-[var(--color-muted)] mt-1">{t(interfaceLanguage, 'makePackIntro')}</p>

      <div className="mt-8">
        {label('makePackPurpose')}
        <div className="grid gap-2 sm:grid-cols-3">
          {PURPOSES.map(p => (
            <button
              key={p.id}
              onClick={() => setPurpose(p.id)}
              aria-pressed={purpose === p.id}
              className={`text-left p-3 rounded-lg border transition-colors ${
                purpose === p.id
                  ? 'border-[var(--color-highlight)] bg-[var(--color-muted)]/20'
                  : 'border-[var(--color-muted)] hover:bg-[var(--color-muted)]/20'
              }`}
            >
              <span className="block text-sm text-[var(--color-text)]">{t(interfaceLanguage, p.label)}</span>
              <span className="block text-xs text-[var(--color-muted)] mt-0.5">{t(interfaceLanguage, p.hint)}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block mt-6">
        {label('makePackAbout')}
        <textarea
          value={about}
          onChange={e => setAbout(e.target.value)}
          maxLength={PACK_BRIEF_LIMITS.about}
          rows={2}
          placeholder={purpose ? t(interfaceLanguage, PURPOSES.find(p => p.id === purpose)!.hint) : ''}
          className={inputClass}
        />
      </label>

      <label className="block mt-6">
        {label('makePackUsage')}
        <input value={usage} onChange={e => setUsage(e.target.value)} maxLength={PACK_BRIEF_LIMITS.usage} className={inputClass} />
      </label>

      <label className="block mt-6">
        {label('makePackMaterial')}
        <textarea
          value={material}
          onChange={e => setMaterial(e.target.value)}
          maxLength={PACK_BRIEF_LIMITS.material}
          rows={4}
          placeholder={t(interfaceLanguage, 'makePackMaterialHint')}
          className={inputClass}
        />
      </label>

      <label className="block mt-6">
        {label('makePackFocus')}
        <input value={focus} onChange={e => setFocus(e.target.value)} maxLength={PACK_BRIEF_LIMITS.focus} className={inputClass} />
      </label>

      {error && <p className="mt-4 text-sm text-[var(--color-highlight)]">{error}</p>}
      <button
        onClick={suggest}
        disabled={busy || !brief()}
        className="mt-8 w-full py-3 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] disabled:opacity-40"
      >
        {busy ? t(interfaceLanguage, 'makePackSuggesting') : t(interfaceLanguage, 'makePackSuggest')}
      </button>
    </div>
  );
}
