'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import type { CongressTrack } from '@/lib/queries';

interface Reviewer {
  user_id: string;
  full_name: string;
}

interface Props {
  tracks: CongressTrack[];
  reviewers: Reviewer[];
  initial: {
    status: string;
    track: string;
    type: string;
    q: string;
    assignments: string;
    reviews: string;
    reviewer: string;
    decision: string;
  };
}

// Filtros server-side: el form actualiza search params y la página re-renderiza.
export function SubmissionsAdminFilters({ tracks, reviewers, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string' && v.trim()) sp.set(k, v.trim());
    }
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  function onReset() {
    startTransition(() => router.push(pathname));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Buscar</span>
        <input
          type="text"
          name="q"
          defaultValue={initial.q}
          placeholder="título o autora/o"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Estado</span>
        <select name="status" defaultValue={initial.status} className={inputCls}>
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviadas</option>
          <option value="under_review">En revisión</option>
          <option value="accepted">Aceptadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="withdrawn">Retiradas</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Línea temática</span>
        <select name="track" defaultValue={initial.track} className={inputCls}>
          <option value="">Todas</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Tipo</span>
        <select name="type" defaultValue={initial.type} className={inputCls}>
          <option value="">Todos</option>
          <option value="oral">Oral</option>
          <option value="poster">Póster</option>
          <option value="symposium">Simposio</option>
        </select>
      </label>

      {/* Segunda fila: filtros del ciclo de revisión */}
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Asignaciones</span>
        <select
          name="assignments"
          defaultValue={initial.assignments}
          className={inputCls}
        >
          <option value="">Todas</option>
          <option value="none">Sin revisor</option>
          <option value="incomplete">Incompletas (&lt; 2)</option>
          <option value="complete">Completas (≥ 2)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Reviews recibidas</span>
        <select
          name="reviews"
          defaultValue={initial.reviews}
          className={inputCls}
        >
          <option value="">Todas</option>
          <option value="none">Ninguna entregada</option>
          <option value="some">Algunas entregadas</option>
          <option value="all">Todas entregadas</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Revisor específico</span>
        <select
          name="reviewer"
          defaultValue={initial.reviewer}
          className={inputCls}
        >
          <option value="">Cualquier revisor</option>
          {reviewers.map((r) => (
            <option key={r.user_id} value={r.user_id}>
              {r.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Decisión del comité</span>
        <select
          name="decision"
          defaultValue={initial.decision}
          className={inputCls}
        >
          <option value="">Todas</option>
          <option value="pending">Pendiente</option>
          <option value="accepted">Aceptada</option>
          <option value="rejected">Rechazada</option>
        </select>
      </label>

      <div className="col-span-1 flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)]"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm hover:bg-[var(--accent)]"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';
