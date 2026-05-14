'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteInstitutionAction } from '@/app/admin/institutions/actions';

interface Props {
  id: string;
  name: string;
  researchersCount: number;
}

// Variante compacta para usar inline en la lista del tab Instituciones.
// Misma lógica que <InstitutionDeleteButton> de la página de detalle,
// pero estilo "underline link" para integrarse con los otros mini-links
// del header de cada institución (⚙ gestionar, + agregar uno, etc.)
export function InstitutionDeleteLink({ id, name, researchersCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const hasResearchers = researchersCount > 0;

  function onClick() {
    setErr(null);
    if (hasResearchers) {
      alert(
        `No puedes eliminar "${name}" porque tiene ${researchersCount} investigador(es) asignados.\n\n` +
          `Reasígnalos a otra institución desde su perfil, o entra a "⚙ gestionar" y usa "Fusionar".`
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
    startTransition(async () => {
      const result = await deleteInstitutionAction(id);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs text-red-700 underline hover:text-red-900 disabled:opacity-50"
        title={
          hasResearchers
            ? 'Esta institución tiene investigadores asignados; reasígnalos primero.'
            : 'Eliminar institución'
        }
      >
        {pending ? 'eliminando…' : '🗑 eliminar'}
      </button>
      {err && (
        <span className="ml-2 text-xs text-red-700" role="alert">
          {err}
        </span>
      )}
    </>
  );
}
