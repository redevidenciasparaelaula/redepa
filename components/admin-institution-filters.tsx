'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface Props {
  countries: string[];
  initial: {
    q?: string;
    country?: string;
    withResearchers?: 'yes' | 'no' | 'all';
    sort?: 'name' | 'count';
    dir?: 'asc' | 'desc';
  };
}

export function AdminInstitutionFilters({ countries, initial }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(initial.q ?? '');
  const [country, setCountry] = useState(initial.country ?? '');
  const [withR, setWithR] = useState(initial.withResearchers ?? 'all');
  const [sort, setSort] = useState<'name' | 'count'>(initial.sort ?? 'name');
  const [dir, setDir] = useState<'asc' | 'desc'>(initial.dir ?? 'asc');

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (country) params.set('country', country);
    if (withR !== 'all') params.set('with', withR);
    if (sort !== 'name') params.set('sort', sort);
    if (dir !== 'asc') params.set('dir', dir);
    const qs = params.toString();
    router.push(qs ? `/admin?${qs}` : '/admin');
  }

  function clear() {
    setQ('');
    setCountry('');
    setWithR('all');
    setSort('name');
    setDir('asc');
    router.push('/admin');
  }

  void sp;

  const inputClass =
    'rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';

  return (
    <form
      onSubmit={apply}
      className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Buscar institución
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre…"
            className={`${inputClass} w-full`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            País
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Mostrar
          </label>
          <select
            value={withR}
            onChange={(e) =>
              setWithR(e.target.value as 'yes' | 'no' | 'all')
            }
            className={inputClass}
          >
            <option value="all">Todas</option>
            <option value="yes">Con investigadores</option>
            <option value="no">Sin investigadores</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Orden
          </label>
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'count')}
              className={inputClass}
            >
              <option value="name">Nombre</option>
              <option value="count">Cantidad de investigadores</option>
            </select>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as 'asc' | 'desc')}
              className={inputClass}
            >
              <option value="asc">↑</option>
              <option value="desc">↓</option>
            </select>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-1.5 text-sm font-medium text-white"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
