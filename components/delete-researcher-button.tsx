'use client';

import { useState, useTransition } from 'react';
import { deleteResearcherAction } from '@/app/admin/actions';

interface Props {
  id: string;
  name: string;
}

export function DeleteResearcherButton({ id, name }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      !confirm(
        `¿Eliminar el perfil de "${name}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteResearcherAction(id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? 'Eliminando…' : 'Eliminar'}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
