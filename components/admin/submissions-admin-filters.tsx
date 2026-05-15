'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import type { CongressTrack } from '@/lib/queries';

interface Props {
  tracks: CongressTrack[];
  initial: { status: string; track: string; type: string; q: string };
}

// Filtros server-side: el form actualiza search params y la página re-renderiza.
export function SubmissionsAdminFilters({ tracks, initial }: Props) {
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
      className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2 lg:grid-cols-5"
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
      <div className="flex items-end gap-2">
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
