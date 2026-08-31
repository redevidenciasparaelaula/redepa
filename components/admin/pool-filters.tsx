'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import type { CongressTrack } from '@/lib/queries';

interface Props {
  tracks: CongressTrack[];
  initial: {
    q: string;
    track: string;
    load: string;
    progress: string;
    active: string;
  };
}

export function PoolFilters({ tracks, initial }: Props) {
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
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
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
          placeholder="nombre o email"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Línea que cubre</span>
        <select name="track" defaultValue={initial.track} className={inputCls}>
          <option value="">Todas</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Carga</span>
        <select name="load" defaultValue={initial.load} className={inputCls}>
          <option value="">Cualquiera</option>
          <option value="empty">Sin asignar</option>
          <option value="capacity">Con capacidad</option>
          <option value="full">Lleno</option>
          <option value="over">Sobre-cargado</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Progreso reviews</span>
        <select
          name="progress"
          defaultValue={initial.progress}
          className={inputCls}
        >
          <option value="">Cualquiera</option>
          <option value="none">Sin empezar</option>
          <option value="in_progress">En curso (algunas entregadas)</option>
          <option value="done">Al día (todas entregadas)</option>
          <option value="overdue">Con deadline vencido</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[var(--muted)]">Estado</span>
        <select name="active" defaultValue={initial.active} className={inputCls}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </label>

      <div className="col-span-1 flex items-end gap-2 sm:col-span-2 lg:col-span-5">
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
