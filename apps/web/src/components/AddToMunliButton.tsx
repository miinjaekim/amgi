'use client';
import Link from 'next/link';
import { userVerbOutcomeCopy, userVerbSide } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useAddVerb } from '@/hooks/useAddVerb';
import { t } from '@/lib/i18n';

/**
 * "Add to Munli", on a French verb in Amgi: a lookup result and a saved card.
 *
 * Separate from saving the card. Keeping a word and practising its conjugation
 * are two choices, and a learner may want either without the other.
 *
 * The verb is looked up again, with its forms, when this is pressed rather
 * than on every French lookup: eighteen forms would slow every lookup down for
 * a button most of them never use. The caller decides whether to show it; give
 * it a `key` of the verb so one verb's outcome is not shown under the next.
 */
export default function AddToMunliButton({ verb, gloss, className }: {
  /** The French side — the infinitive. */
  verb: string;
  /** What it means, so the verb looked up is this one. */
  gloss?: string;
  className?: string;
}) {
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome, state.phase === 'done' ? state.savedTense : undefined);
  const side = outcome && userVerbSide(outcome);

  return (
    <div className={className}>
      <button
        onClick={() => add(verb, { gloss, practise: true })}
        disabled={working}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
      >
        {t(interfaceLanguage, working ? 'verbAddWorking' : 'verbAddToMunli')}
      </button>
      {(copy || state.phase === 'failed') && (
        <p className="text-xs mt-2" role="status" style={{ color: 'var(--color-muted)' }}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
          {side && (
            <>
              {' '}
              <Link href={`/munli/topics/${side}`} className="underline" style={{ color: 'var(--color-highlight)' }}>
                {t(interfaceLanguage, 'verbOpenInMunli')}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
