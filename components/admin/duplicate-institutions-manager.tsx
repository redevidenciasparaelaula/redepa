'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mergeInstitutionAction } from '@/app/admin/instituciones/duplicadas/actions';
import type { DuplicateGroup } from '@/lib/queries';

interface Props {
  groups: DuplicateGroup[];
}

export function DuplicateInstitutionsManager({ groups }: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        🎉 No hay grupos de instituciones duplicadas detectados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <DuplicateGroupCard key={g.key} group={g} />
      ))}
    </div>
  );
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  // Por defecto el "target" (a mantener) es la institución con más researchers
  // (que viene ordenada primera del query).
  const [targetId, setTargetId] = useState<string>(group.institutions[0].id);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const target = group.institutions.find((i) => i.id === targetId);
  const sources = group.institutions.filter((i) => i.id !== targetId);
  const totalResearchersToMove = sources.reduce(
    (s, i) => s + i.researcher_count,
    0
  );

  function mergeAll() {
    if (!target) return;
    if (sources.length === 0) return;
    if (
      !confirm(
        `Vas a fusionar ${sources.length} institución(es) dentro de "${target.name}". Se moverán ${totalResearchersToMove} researcher(s) y se borrarán las instituciones origen. ¿Confirmar?`
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      for (const src of sources) {
        const res = await mergeInstitutionAction(src.id, target.id);
        if (!res.ok) {
          setError(`Falló al fusionar "${src.name}": ${res.error}`);
          return;
        }
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-[var(--epa-green)] bg-[var(--card)] p-5">
        <p className="text-sm">
          ✅ Grupo fusionado. {sources.length} institución(es) movida(s) dentro
          de "{target?.name}". Refrescando…
        </p>
      </div>
    );
  }

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
      <header className="mb-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Grupo: <code>{group.key}</code>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {group.institutions.length} instituciones con nombre normalizado igual ·{' '}
          {group.institutions.reduce((s, i) => s + i.researcher_count, 0)}{' '}
          researchers afectados en total
        </p>
      </header>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Elegí cuál mantener (las demás se fusionarán dentro)
      </p>
      <ul className="space-y-2">
        {group.institutions.map((inst) => {
          const isTarget = inst.id === targetId;
          return (
            <li
              key={inst.id}
              className={
                'flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 ' +
                (isTarget
                  ? 'border-[var(--epa-green)] bg-white'
                  : 'border-[var(--border)] bg-white')
              }
            >
              <label className="flex flex-1 cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name={`target-${group.key}`}
                  checked={isTarget}
                  onChange={() => setTargetId(inst.id)}
                  className="mt-1 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{inst.name}</p>
                  {inst.name_en && (
                    <p className="text-xs text-[var(--muted)]">
                      EN: {inst.name_en}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {[inst.city, inst.country].filter(Boolean).join(', ')} ·{' '}
                    Creada {formatDate(inst.created_at)}
                  </p>
                </div>
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (inst.researcher_count > 0
                      ? 'bg-[var(--epa-blue)] text-white'
                      : 'bg-[var(--accent)] text-[var(--muted)]')
                  }
                >
                  {inst.researcher_count} researcher
                  {inst.researcher_count === 1 ? '' : 's'}
                </span>
                {isTarget && (
                  <span className="rounded-full bg-[var(--epa-green)] px-2 py-0.5 text-xs font-medium text-white">
                    Se mantiene
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={mergeAll}
          disabled={isPending}
          className="rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? 'Fusionando…'
            : `Fusionar ${sources.length} dentro de "${target?.name}"`}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
