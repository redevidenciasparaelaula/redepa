'use client';

import { useState, useTransition } from 'react';
import { setAvailableForReviewAction } from '@/app/me/actions';

interface Props {
  initialValue: boolean;
}

export function AvailabilityForReviewForm({ initialValue }: Props) {
  const [checked, setChecked] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChange(next: boolean) {
    setChecked(next);
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const result = await setAvailableForReviewAction(next);
      if (!result.ok) {
        setError(result.error);
        setChecked(!next); // revertir UI
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={pending}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)] text-[var(--epa-green)]"
        />
        <span className="text-sm leading-relaxed text-[var(--foreground)]">
          <span className="font-medium">
            Estaría dispuesta/o a ser evaluador/a en un Congreso EPA.
          </span>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Te contactaremos cuando se abra el proceso de revisión, para
            confirmar tu disponibilidad y coordinar los detalles (carga,
            temas asignados, plazos).
          </span>
        </span>
      </label>

      {pending && (
        <p className="mt-2 text-xs text-[var(--muted)]">Guardando…</p>
      )}
      {savedAt && !error && !pending && (
        <p className="mt-2 text-xs text-[var(--success-text-medium)]">
          Preferencia guardada.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
