'use client';

import { useState } from 'react';

export function CollapsibleFilters({
  children,
  label = 'Filtros',
  // Si true, el panel está siempre colapsable (en todos los viewports).
  // Útil para vistas que no tienen sidebar fijo, ej. la tabla del directorio.
  alwaysCollapsible = false,
}: {
  children: React.ReactNode;
  label?: string;
  alwaysCollapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const buttonClass = alwaysCollapsible
    ? 'mb-3 flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]'
    : 'mb-3 flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] lg:hidden';

  const panelClass = alwaysCollapsible
    ? open
      ? 'block'
      : 'hidden'
    : open
      ? 'block'
      : 'hidden lg:block';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={buttonClass}
      >
        <span className="inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-[var(--epa-blue)]"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {label}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={panelClass}>{children}</div>
    </>
  );
}
