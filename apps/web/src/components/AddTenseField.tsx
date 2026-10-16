'use client';
import { useState } from 'react';
import { addedTenses, userTenseOutcomeCopy } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useAddTense } from '@/hooks/useAddTense';
import { t } from '@/lib/i18n';

/**
 * Add a tense of your own to Munli, and see the ones you have added.
 *
 * Drawn as `AddVerbField` is, beside it. The learner types a tense's name — in
 * French, English or Korean — and what it matched, or why it did not, is the
 * line underneath. The added tenses are listed here rather than on each
 * verb, because a tense belongs to every verb at once.
 *
 * ⚠️ **Removing takes the tense's progress with it**, so the button asks twice,
 * inline rather than in a dialog: the first tap turns it into the second.
 */
export default function AddTenseField() {
  const { interfaceLanguage } = useUser();
  const { state, add, remove, spec } = useAddTense();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!spec) return null;

  const working = state.phase === 'working';
  const copy = state.phase === 'done' ? userTenseOutcomeCopy(state.outcome) : undefined;
  const mine = addedTenses(spec);

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="block w-full p-4 rounded-xl border border-dashed font-mono font-bold text-center transition-colors hover:bg-[var(--color-muted)]/20"
          style={{ color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
        >
          + {t(interfaceLanguage, 'tenseAddOpen')}
        </button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={event => {
            event.preventDefault();
            if (!typed.trim() || working) return;
            void add(typed).then(outcome => { if (outcome?.status === 'added') setTyped(''); });
          }}
        >
          <input
            value={typed}
            onChange={event => setTyped(event.target.value)}
            placeholder={t(interfaceLanguage, 'tenseAddPlaceholder')}
            aria-label={t(interfaceLanguage, 'tenseAddOpen')}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border bg-transparent font-mono text-sm"
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
          />
          <button
            type="submit"
            disabled={!typed.trim() || working}
            className="px-4 py-2 rounded-lg font-mono text-sm font-bold disabled:opacity-50"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(interfaceLanguage, working ? 'tenseAddWorking' : 'verbAddButton')}
          </button>
        </form>
      )}
      {(copy || state.phase === 'failed') && (
        <p className="font-mono text-xs mt-2" role="status" style={{ color: 'var(--color-muted)' }}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'tenseAddFailed')}
        </p>
      )}

      {mine.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'tensesAdded')}
          </h2>
          <ul className="flex flex-col gap-1">
            {mine.map(tense => (
              <li key={tense.id} className="flex items-center gap-3 font-mono text-sm">
                <span className="flex-1" style={{ color: 'var(--color-text)' }}>
                  {tense.label}
                  <span className="ml-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'verbUnverifiedTag')}
                  </span>
                </span>
                <button
                  onClick={() => {
                    if (confirming !== tense.id) { setConfirming(tense.id); return; }
                    setConfirming(null);
                    remove(tense.id);
                  }}
                  onBlur={() => setConfirming(prev => (prev === tense.id ? null : prev))}
                  aria-label={t(interfaceLanguage, 'tenseRemoveLabel', { tense: tense.label })}
                  className="text-xs underline"
                  style={{ color: confirming === tense.id ? 'var(--color-highlight)' : 'var(--color-muted)' }}
                >
                  {t(interfaceLanguage, confirming === tense.id ? 'tenseRemoveConfirm' : 'tenseRemove')}
                </button>
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'tenseUnverified')}
          </p>
        </section>
      )}
    </div>
  );
}
