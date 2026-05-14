'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteInstitutionAction } from '@/app/admin/institutions/actions';

interface Props {
  id: string;
  name: string;
  researchersCount: number;
}

export function InstitutionDeleteButton({ id, name, researchersCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasResearchers = researchersCount > 0;

  function onClick() {
    if (hasResearchers) {
      alert(
        `No puedes eliminar "${name}" porque tiene ${researchersCount} investigador(es) asignados.\n\n` +
          `Opciones:\n` +
          `  • Reasigna los investigadores a otra institución desde su perfil.\n` +
          `  • Usa "Fusionar con otra institución" para mover todos de una vez.`
      );
      return;
    }
    if (
      !confirm(
        `¿Eliminar "${name}"?\n\nEsta acción es permanente. Se borrarán también los admins asignados a esta institución.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteInstitutionAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/admin');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? 'Eliminando…' : 'Eliminar esta institución'}
      </button>
      {hasResearchers && (
        <p className="text-xs text-red-900">
          ⚠️ No se puede eliminar mientras tenga investigadores asignados (
          {researchersCount}). Reasígnalos o fusiona con otra institución
          primero.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
