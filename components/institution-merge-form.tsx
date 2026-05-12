'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mergeInstitutionsAction } from '@/app/admin/institutions/actions';
import { InstitutionCombobox } from './institution-combobox';
import type { Institution } from '@/lib/supabase/types';

interface Props {
  source: Institution;
  allInstitutions: Institution[];
}

export function InstitutionMergeForm({ source, allInstitutions }: Props) {
  const router = useRouter();
  const [targetId, setTargetId] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const eligible = allInstitutions.filter((i) => i.id !== source.id);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!targetId) {
      setError('Selecciona la institución destino.');
      return;
    }
    const target = allInstitutions.find((i) => i.id === targetId);
    if (
      !confirm(
        `Vas a fusionar:\n\n` +
          `ORIGEN: ${source.name} (${source.country})\n` +
          `→ DESTINO: ${target?.name} (${target?.country})\n\n` +
          `Todos los investigadores y admins del origen se moverán al destino, y el origen se eliminará. Esta acción no se puede deshacer.\n\n¿Continuar?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await mergeInstitutionsAction(source.id, targetId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/admin');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      <p className="text-sm text-[var(--muted)]">
        Mueve todos los investigadores y admins de <strong>{source.name}</strong>{' '}
        a otra institución, y elimina esta. Útil para limpiar duplicados con
        diferente ortografía.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Fusionar en (destino)
        </label>
        <InstitutionCombobox
          institutions={eligible}
          value={targetId}
          onChange={setTargetId}
          placeholder="Buscar institución destino…"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !targetId}
        className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {pending ? 'Fusionando…' : 'Fusionar y eliminar origen'}
      </button>
    </form>
  );
}
