import type { FormsTable as FormsTableData } from '@amgi/core';

/**
 * A Swedish word's forms as a small grid: a noun's four, or an adjective's
 * three in one row. `formsTable()` in core decides the cells; this only draws
 * them, and mobile draws the same ones.
 *
 * Sized to its contents rather than to the card, so on a wide lookup result
 * it sits under the definition as a compact block instead of four words
 * spread across 600px.
 */
export default function FormsTable({ table, className = '' }: { table: FormsTableData; className?: string }) {
  const labelled = table.rows.some(row => row.label);
  return (
    <div className={className}>
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            {labelled && <td />}
            {table.columns.map(column => (
              <th key={column} scope="col" className="pr-6 pb-1 text-left text-xs font-normal text-[var(--color-muted)]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={row.label ?? index}>
              {row.label && (
                <th scope="row" className="pr-6 py-0.5 text-left text-xs font-normal text-[var(--color-muted)]">
                  {row.label}
                </th>
              )}
              {row.cells.map((cell, column) => (
                <td key={column} lang="sv" className="pr-6 py-0.5 text-[var(--color-text)]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-[var(--color-muted)] opacity-70">{table.caption}</p>
    </div>
  );
}
