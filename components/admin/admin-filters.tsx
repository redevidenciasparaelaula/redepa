'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  institutions: { id: string; name: string }[];
  initial: {
    aq?: string;
    atype?: 'all' | 'super' | 'institution';
    ainst?: string;
  };
}

export function AdminFilters({ institutions, initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initial.aq ?? '');
  const [type, setType] = useState(initial.atype ?? 'all');
  const [inst, setInst] = useState(initial.ainst ?? '');

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('tab', 'administradores');
    if (q.trim()) params.set('aq', q.trim());
    if (type !== 'all') params.set('atype', type);
    if (inst) params.set('ainst', inst);
    router.push(`/admin?${params.toString()}`);
  }

  function clear() {
    setQ('');
    setType('all');
    setInst('');
    router.push('/admin?tab=administradores');
  }

  const fieldClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';

  return (
    <form
      onSubmit={apply}
      className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Buscar
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Correo…"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'all' | 'super' | 'institution')
            }
            className={fieldClass}
          >
            <option value="all">Todos</option>
            <option value="super">Super admin</option>
            <option value="institution">Admin de institución</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Institución
          </label>
          <select
            value={inst}
            onChange={(e) => setInst(e.target.value)}
            className={fieldClass}
          >
            <option value="">Todas</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--epa-green-dark)]"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent)]"
          >
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}
