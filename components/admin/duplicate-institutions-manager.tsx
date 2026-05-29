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
  const isSimilar = group.matchType === 'similar';

  // Target (a mantener) = la institución con más researchers (viene 1ra).
  const [targetId, setTargetId] = useState<string>(group.institutions[0].id);
  // Fuentes seleccionadas para fusionar. En grupos 'exact' pre-seleccionamos
  // todas (alta confianza). En 'similar' arrancamos vacío: el admin debe
  // marcar explícitamente cuáles fusionar (evita unir universidades distintas
  // que solo comparten una palabra, ej. todas las "Universidad Católica").
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (isSimilar) return new Set();
    return new Set(
      group.institutions.filter((i) => i.id !== group.institutions[0].id).map((i) => i.id)
    );
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const target = group.institutions.find((i) => i.id === targetId);
  // Las fuentes elegibles son todas menos el target; las efectivas son las
  // seleccionadas (excluyendo el target por si quedó marcado y luego se eligió).
  const effectiveSources = group.institutions.filter(
    (i) => i.id !== targetId && selected.has(i.id)
  );
  const totalResearchersToMove = effectiveSources.reduce(
    (s, i) => s + i.researcher_count,
    0
  );

  function toggleSource(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setTarget(id: string) {
    setTargetId(id);
    // El target no puede estar marcado como fuente
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function mergeSelected() {
    if (!target) return;
    if (effectiveSources.length === 0) {
      setError('Marca al menos una institución para fusionar.');
      return;
    }
    if (
      !confirm(
        `Vas a fusionar ${effectiveSources.length} institución(es) dentro de "${target.name}". Se moverán ${totalResearchersToMove} researcher(s) y se borrarán las instituciones origen. Esta acción no se puede deshacer. ¿Confirmar?`
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      for (const src of effectiveSources) {
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
          ✅ Grupo fusionado. {effectiveSources.length} institución(es)
          movida(s) dentro de "{target?.name}". Refrescando…
        </p>
      </div>
    );
  }

  return (
    <article
      className={
        'rounded-lg border bg-[var(--card)] p-5 ' +
        (isSimilar ? 'border-amber-300' : 'border-[var(--border)]')
      }
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                'rounded-full px-2 py-0.5 text-xs font-medium ' +
                (isSimilar
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-[var(--epa-blue)] text-white')
              }
            >
              {isSimilar ? '⚠ Posible duplicado · revisar' : 'Coincidencia exacta'}
            </span>
            <code className="text-xs text-[var(--muted)]">{group.key}</code>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {group.institutions.length} instituciones ·{' '}
            {group.institutions.reduce((s, i) => s + i.researcher_count, 0)}{' '}
            researchers afectados en total
          </p>
        </div>
      </header>

      {isSimilar && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Estas tienen nombres parecidos pero podrían ser instituciones
          distintas. Verifica antes de fusionar y marca solo las que realmente
          sean la misma.
        </p>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Elegí cuál mantener (radio) y marca cuáles fusionar dentro (checkbox)
      </p>
      <ul className="space-y-2">
        {group.institutions.map((inst) => {
          const isTarget = inst.id === targetId;
          const isChecked = selected.has(inst.id);
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
              <div className="flex flex-1 items-start gap-3">
                <input
                  type="radio"
                  name={`target-${group.key}-${group.institutions[0].id}`}
                  checked={isTarget}
                  onChange={() => setTarget(inst.id)}
                  aria-label={`Mantener ${inst.name}`}
                  className="mt-1 h-4 w-4"
                />
                {!isTarget && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSource(inst.id)}
                    aria-label={`Fusionar ${inst.name}`}
                    className="mt-1 h-4 w-4"
                  />
                )}
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
              </div>
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
          onClick={mergeSelected}
          disabled={isPending || effectiveSources.length === 0}
          className="rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? 'Fusionando…'
            : `Fusionar ${effectiveSources.length} dentro de "${target?.name ?? ''}"`}
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
