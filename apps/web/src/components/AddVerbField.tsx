'use client';
import { useState } from 'react';
import Link from 'next/link';
import { userVerbOutcomeCopy, userVerbTopic } from '@amgi/core';
import type { MunliTopic } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useAddVerb } from '@/hooks/useAddVerb';
import { t } from '@/lib/i18n';

/**
 * Add a verb of your own to Munli.
 *
 * What it becomes is not the learner's choice and not this field's: a regular
 * verb joins its group as one more verb the pattern is asked through, and an
 * irregular one gets a table on this page. The line under the field says which
 * happened, and links across when the verb landed on the other topic.
 */
export default function AddVerbField({ topic }: { topic: MunliTopic['id'] }) {
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  const [term, setTerm] = useState('');
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome);
  const landed = outcome && userVerbTopic(outcome);

  return (
    <form
      className="mb-8"
      onSubmit={event => {
        event.preventDefault();
        if (!term.trim() || working) return;
        void add(term).then(() => setTerm(''));
      }}
    >
      <div className="flex gap-2">
        <input
          value={term}
          onChange={event => setTerm(event.target.value)}
          placeholder={t(interfaceLanguage, 'verbAddPlaceholder')}
          aria-label={t(interfaceLanguage, 'verbAddPlaceholder')}
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
      </div>
      {(copy || state.phase === 'failed') && (
        <p className="font-mono text-xs mt-2" role="status" style={{ color: 'var(--color-muted)' }}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
          {landed && landed !== topic && (
            <>
              {' '}
              <Link href={`/munli/topics/${landed}`} className="underline" style={{ color: 'var(--color-highlight)' }}>
                {t(interfaceLanguage, landed === 'regular' ? 'topicRegularVerbs' : 'verbsIrregular')}
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
}
