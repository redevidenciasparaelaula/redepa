'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveContactAction,
  unsaveContactAction,
} from '@/app/me/contactos/actions';

interface Props {
  researcherId: string;
  initialSaved: boolean;
  /** Tamaño del botón. 'sm' = 24px (table), 'md' = 28px (cards/detail). */
  size?: 'sm' | 'md';
}

// SaveContactButton
// Toggle verde: "+" cuando no está guardado, "✓" cuando sí.
// Optimistic UI: el ícono cambia al instante y se revierte si la action falla.
// Tooltip nativo "Agregar a mis contactos" / "Ya en mis contactos · quitar".
export function SaveContactButton({
  researcherId,
  initialSaved,
  size = 'md',
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconDim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  function onClick(e: React.MouseEvent) {
    // Evita propagar al Link envolvente cuando el botón vive dentro de
    // una card que es clickeable.
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;

    const previous = saved;
    const next = !saved;
    setSaved(next);
    setError(null);

    startTransition(async () => {
      const res = next
        ? await saveContactAction(researcherId)
        : await unsaveContactAction(researcherId);
      if (!res.ok) {
        setSaved(previous);
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const label = saved
    ? 'Ya en mis contactos · click para quitar'
    : 'Agregar a mis contactos';

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title={label}
        aria-label={label}
        aria-pressed={saved}
        className={
          `inline-flex ${dim} shrink-0 items-center justify-center rounded-full border ` +
          'transition-colors duration-150 disabled:opacity-50 ' +
          (saved
            ? 'border-[var(--epa-green)] bg-[var(--epa-green)] text-white hover:bg-[var(--epa-green-dark)]'
            : 'border-[var(--epa-green)] text-[var(--epa-green)] hover:bg-[var(--epa-green)] hover:text-white')
        }
      >
        {saved ? (
          // Checkmark
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconDim}
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          // Plus
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconDim}
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>
      {error && (
        <span
          role="alert"
          className="absolute -bottom-5 right-0 whitespace-nowrap text-xs text-red-600"
        >
          {error}
        </span>
      )}
    </span>
  );
}
