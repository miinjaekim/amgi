'use client';
import { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
  key: string;
  label: string;
}

/**
 * A dropdown that holds several answers at once.
 *
 * ⚠️ **A dropdown rather than a row of chips, and the reason is the option
 * count.** Inline chips are the better control while they fit on one line —
 * which is how the Cards filters are still drawn — and stop being so once a
 * list can grow. Tenses and verb groups both will, so the row would become the
 * page's first screen.
 *
 * **Selections apply as you click**, matching the native filter sheet: there is
 * no draft to keep, so there is no Cancel to need, and undoing a choice is one
 * click.
 */
export default function MultiSelect({
  label, options, selected, onToggle,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // What is on, stated rather than left to be spotted among what is available.
  const summary = options.filter(o => selected.includes(o.key)).map(o => o.label).join(', ');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors"
        style={{ color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
      >
        <span style={{ color: 'var(--color-muted)' }}>{label}</span>
        <span className="max-w-[16rem] truncate">{summary || '—'}</span>
        <span style={{ color: 'var(--color-muted)' }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute z-40 mt-1 min-w-full w-max max-h-80 overflow-y-auto rounded-xl border shadow-xl"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        >
          {options.map(option => (
            <label
              key={option.key}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-muted)]/20"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.key)}
                onChange={() => onToggle(option.key)}
              />
              <span className="font-mono text-sm whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
