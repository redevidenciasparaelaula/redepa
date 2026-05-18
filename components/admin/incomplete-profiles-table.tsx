'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendIncompleteProfileRemindersAction } from '@/app/admin/perfiles-incompletos/actions';
import { MISSING_LABELS } from '@/lib/profile-completeness';
import type { IncompleteProfileRow } from '@/lib/queries';

interface Props {
  rows: IncompleteProfileRow[];
}

const CATEGORY_BADGE_COLOR: Record<string, string> = {
  basics: 'bg-red-100 text-red-800',
  education: 'bg-amber-100 text-amber-900',
  visibility: 'bg-[var(--accent)] text-[var(--foreground)]',
  searchable: 'bg-[var(--epa-blue)] text-white',
};

export function IncompleteProfilesTable({ rows }: Props) {
  const [filter, setFilter] = useState<string>(''); // categoría a filtrar
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        filter &&
        !r.completeness.missing.includes(filter as 'basics' | 'education' | 'visibility' | 'searchable')
      )
        return false;
      if (q) {
        const hay =
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.institution_name ?? '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allVisibleSelected) {
      const next = new Set(selected);
      for (const r of visible) next.delete(r.id);
      setSelected(next);
    } else {
      const next = new Set(selected);
      for (const r of visible) next.add(r.id);
      setSelected(next);
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function send() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `¿Enviar recordatorio por email a ${selected.size} investigador/a/es? Los emails saldrán de inmediato.`
      )
    )
      return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendIncompleteProfileRemindersAction([...selected]);
      if (!res.ok) {
        setError(res.error);
      } else {
        setResult(res.data);
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        🎉 No hay perfiles incompletos. Todos los investigadores aprobados
        tienen sus 4 categorías mínimas completas.
      </div>
    );
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o institución…"
          className="flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        >
          <option value="">Todas las categorías faltantes</option>
          <option value="basics">Falta cargo / institución</option>
          <option value="education">Falta año de grado</option>
          <option value="visibility">Falta foto / redes / DOIs</option>
          <option value="searchable">Falta temas / metodologías</option>
        </select>
      </div>

      {/* Barra de acción */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-sm text-[var(--muted)]">
          Mostrando <strong>{visible.length}</strong> de {rows.length} ·
          Seleccionados: <strong>{selected.size}</strong>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(new Set(visible.map((r) => r.id)))}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs hover:bg-[var(--accent)]"
          >
            Seleccionar todos los visibles
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs hover:bg-[var(--accent)]"
            >
              Limpiar selección
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={isPending || selected.size === 0}
            className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
          >
            {isPending
              ? 'Enviando…'
              : `Enviar recordatorio (${selected.size})`}
          </button>
        </div>
      </div>

      {result && (
        <div className="mb-3 rounded-md border border-[var(--epa-green)] bg-[var(--card)] p-3 text-sm">
          ✅ Enviados: <strong>{result.sent}</strong>
          {result.failed > 0 && (
            <>
              {' · '}Fallidos: <strong>{result.failed}</strong>
            </>
          )}
          {result.skipped > 0 && (
            <>
              {' · '}Skip (ya estaban completos): <strong>{result.skipped}</strong>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-left">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos los visibles"
                  className="h-4 w-4"
                />
              </th>
              <Th>Investigador/a</Th>
              <Th>Institución</Th>
              <Th>Falta</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className="border-t border-[var(--border)] align-top hover:bg-[var(--surface)]"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Seleccionar ${r.full_name}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/researcher/${r.id}`}
                    className="font-medium hover:underline"
                  >
                    {r.full_name}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">{r.email}</div>
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">
                  {r.institution_name ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.completeness.missing.map((m) => (
                      <span
                        key={m}
                        className={
                          'rounded-full px-2 py-0.5 text-xs font-medium ' +
                          (CATEGORY_BADGE_COLOR[m] ?? 'bg-[var(--accent)]')
                        }
                      >
                        {MISSING_LABELS[m]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/researcher/${r.id}/edit`}
                    className="text-xs text-[var(--epa-blue)] underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </th>
  );
}
