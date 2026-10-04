'use client';
import { useState } from 'react';
import Link from 'next/link';
import { userVerbOutcomeCopy, userVerbSubjectKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useAddVerb } from '@/hooks/useAddVerb';
import { t } from '@/lib/i18n';

/**
 * Add a verb of your own to Munli.
 *
 * ⚠️ **One button above both groups of rows**, drawn as the Packs list draws
 * "Make a pack". What a verb becomes is not the learner's choice: a regular
 * verb joins its pattern as one more verb it is asked through, and an
 * irregular one becomes a row of its own. The line underneath says which, and
 * links to where it went.
 */
export default function AddVerbField() {
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome);
  const landed = outcome && userVerbSubjectKey(outcome);

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="block w-full p-4 rounded-xl border border-dashed font-mono font-bold text-center transition-colors hover:bg-[var(--color-muted)]/20"
          style={{ color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
        >
          + {t(interfaceLanguage, 'verbAddOpen')}
        </button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={event => {
            event.preventDefault();
            if (!term.trim() || working) return;
            void add(term).then(() => setTerm(''));
          }}
        >
          <input
            value={term}
            onChange={event => setTerm(event.target.value)}
            placeholder={t(interfaceLanguage, 'verbAddPlaceholder')}
            aria-label={t(interfaceLanguage, 'verbAddOpen')}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border bg-transparent font-mono text-sm"
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
          />
          <button
            type="submit"
            disabled={!term.trim() || working}
            className="px-4 py-2 rounded-lg font-mono text-sm font-bold disabled:opacity-50"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(interfaceLanguage, working ? 'verbAddWorking' : 'verbAddButton')}
          </button>
        </form>
      )}
      {(copy || state.phase === 'failed') && (
        <p className="font-mono text-xs mt-2" role="status" style={{ color: 'var(--color-muted)' }}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
          {landed && (
            <>
              {' '}
              <Link href={`/munli/topics/verbs/${encodeURIComponent(landed)}`} className="underline" style={{ color: 'var(--color-highlight)' }}>
                {t(interfaceLanguage, 'verbOpen')}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
