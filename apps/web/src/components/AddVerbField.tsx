'use client';
import { useState } from 'react';
import { userVerbOutcomeCopy, userVerbSide } from '@amgi/core';
import type { VerbSide } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useAddVerb } from '@/hooks/useAddVerb';
import { t } from '@/lib/i18n';

/**
 * Add a verb of your own to Munli.
 *
 * ⚠️ **One button for both sides of the topic, above the switch.** What a verb
 * becomes is not the learner's choice: a regular verb joins its group as one
 * more verb the pattern is asked through, and an irregular one gets its own
 * table. So the button belongs to neither side, and `onLanded` lets the page
 * turn to wherever the verb went.
 */
export default function AddVerbField({ onLanded }: { onLanded: (side: VerbSide) => void }) {
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome);

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg border font-mono text-sm font-bold"
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
            void add(term).then(added => {
              setTerm('');
              const side = added && userVerbSide(added);
              if (side) onLanded(side);
            });
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
        </p>
      )}
    </div>
  );
}
