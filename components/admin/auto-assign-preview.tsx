'use client';

// Preview interactivo del resultado de la auto-asignación.
// Muestra:
//   - Una tabla con TODAS las asignaciones propuestas (una fila por par
//     submission-revisor), con checkbox para incluir/excluir.
//   - Un resumen por revisor (cuántas asignaciones nuevas se le suman
//     encima de las que ya tenía).
//   - Un panel de "cupos que quedaron sin llenar" (gaps), si los hay.
//   - Botón "Confirmar" que llama al server action bulkAssignReviewersAction.
//
// El super-admin puede destildar filas antes de confirmar. Todo lo tildado
// se aplica de una y dispara los emails a los revisores.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  bulkAssignReviewersAction,
  type BulkAssignResult,
} from '@/app/admin/congresos/[slug]/postulaciones/actions';
import type { AutoAssignSummary } from '@/lib/auto-assign';

export function AutoAssignPreview({
  slug,
  summary,
}: {
  slug: string;
  summary: AutoAssignSummary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkAssignResult | null>(null);

  // Un id sintético por (submission, reviewer) para poder marcar/desmarcar
  const keyOf = (submissionId: string, reviewerId: string) =>
    `${submissionId}::${reviewerId}`;

  const initialSelected = useMemo(
    () =>
      new Set(
        summary.assignments.map((a) =>
          keyOf(a.submission_id, a.reviewer_user_id)
        )
      ),
    [summary]
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  function toggle(submissionId: string, reviewerId: string) {
    const k = keyOf(submissionId, reviewerId);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll(check: boolean) {
    if (!check) {
      setSelected(new Set());
    } else {
      setSelected(
        new Set(
          summary.assignments.map((a) =>
            keyOf(a.submission_id, a.reviewer_user_id)
          )
        )
      );
    }
  }

  // Agrupamos por submission para mostrar
  const bySubmission = useMemo(() => {
    const m = new Map<
      string,
      { title: string; rows: typeof summary.assignments }
    >();
    for (const a of summary.assignments) {
      const g = m.get(a.submission_id) ?? {
        title: a.submission_title,
        rows: [],
      };
      g.rows.push(a);
      m.set(a.submission_id, g);
    }
    return Array.from(m.entries());
  }, [summary.assignments]);

  const selectedCount = selected.size;
  const totalCount = summary.assignments.length;

  function onConfirm() {
    const items = summary.assignments
      .filter((a) => selected.has(keyOf(a.submission_id, a.reviewer_user_id)))
      .map((a) => ({
        submission_id: a.submission_id,
        reviewer_user_id: a.reviewer_user_id,
      }));

    if (items.length === 0) return;
    if (
      !confirm(
        `¿Confirmar ${items.length} asignaciones? Se enviarán emails a los revisores.`
      )
    )
      return;

    startTransition(async () => {
      const res = await bulkAssignReviewersAction(items);
      setResult(res);
      router.refresh();
    });
  }

  // Después de confirmar, mostramos el resultado y damos link para volver
  if (result) {
    return (
      <div className="rounded-lg border-2 border-[var(--epa-green)] bg-white p-6">
        <p className="font-semibold text-[var(--epa-green-dark)]">
          ✓ Asignaciones aplicadas
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <strong>{result.applied}</strong> asignaciones creadas correctamente.
          </li>
          {result.failed > 0 && (
            <li className="text-red-700">
              <strong>{result.failed}</strong> fallaron (ver detalle abajo).
            </li>
          )}
          <li>
            Se envían emails a los revisores en segundo plano (uno por
            postulación).
          </li>
        </ul>

        {result.failed > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Ver errores ({result.failed})
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {result.rows
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={`${r.submission_id}::${r.reviewer_user_id}`}>
                    ⚠ {r.submission_id.slice(0, 8)}… → {r.reviewer_user_id.slice(0, 8)}…: {r.error}
                  </li>
                ))}
            </ul>
          </details>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/admin/congresos/${slug}/postulaciones`}
            className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--epa-green-dark)]"
          >
            ← Volver a postulaciones
          </Link>
        </div>
      </div>
    );
  }

  // Caso: no hay nada que proponer
  if (summary.assignments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-sm">
        <p className="font-semibold">No hay asignaciones para proponer.</p>
        <p className="mt-1 text-[var(--muted)]">
          Puede ser porque todas las postulaciones ya tienen sus revisores
          asignados, o porque no hay revisores compatibles disponibles en el
          pool para las postulaciones abiertas.
        </p>
        {summary.gaps.length > 0 && (
          <GapsList gaps={summary.gaps} className="mt-4" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="text-sm">
          <p>
            <strong>{selectedCount}</strong> de <strong>{totalCount}</strong>{' '}
            asignaciones seleccionadas.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Destildá las que no querés aplicar. Al confirmar se envía email a
            cada revisor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
          >
            Marcar todas
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
          >
            Desmarcar todas
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || selectedCount === 0}
            className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
          >
            {isPending
              ? 'Aplicando…'
              : `Confirmar ${selectedCount} asignaciones`}
          </button>
        </div>
      </div>

      {/* Tabla propuestas agrupada por submission */}
      <div className="space-y-4">
        {bySubmission.map(([subId, group]) => (
          <div
            key={subId}
            className="rounded-lg border border-[var(--border)] bg-white p-5"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold">{group.title}</h3>
              <Link
                href={`/admin/congresos/${slug}/postulaciones/${subId}`}
                className="text-xs text-[var(--muted)] hover:underline"
              >
                Ver detalle →
              </Link>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {group.rows.map((row) => {
                const k = keyOf(row.submission_id, row.reviewer_user_id);
                const checked = selected.has(k);
                return (
                  <li key={k} className="flex items-start gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggle(row.submission_id, row.reviewer_user_id)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {row.reviewer_name}
                        {row.institution_conflict && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-normal text-yellow-800">
                            ⚠ misma institución
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {row.reviewer_email} · {row.match_reason}
                      </p>
                    </div>
                    <span
                      className={
                        'ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ' +
                        (row.match_score >= 10
                          ? 'bg-[var(--epa-green)] text-white'
                          : row.match_score > 0
                            ? 'bg-[var(--accent)] text-[var(--foreground)]'
                            : 'bg-[var(--surface)] text-[var(--muted)]')
                      }
                    >
                      score {row.match_score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Resumen por revisor */}
      {summary.reviewerLoad.length > 0 && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="mb-3 text-base font-semibold">
            Carga por revisor (post-asignación)
          </h3>
          <ul className="space-y-1 text-sm">
            {summary.reviewerLoad.map((r) => {
              const overload = r.total_after > r.max_load;
              return (
                <li key={r.user_id} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{r.full_name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    +{r.added} nuevas
                  </span>
                  <span
                    className={
                      'ml-auto text-xs ' +
                      (overload ? 'font-semibold text-red-700' : 'text-[var(--muted)]')
                    }
                  >
                    {r.total_after} / {r.max_load}{overload && ' ⚠ sobrepasa max_load'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Gaps: postulaciones que no llegaron al target */}
      {summary.gaps.length > 0 && <GapsList gaps={summary.gaps} />}
    </div>
  );
}

function GapsList({
  gaps,
  className = '',
}: {
  gaps: AutoAssignSummary['gaps'];
  className?: string;
}) {
  return (
    <section
      className={
        'rounded-lg border border-yellow-300 bg-yellow-50 p-5 text-sm ' +
        className
      }
    >
      <h3 className="mb-2 text-base font-semibold text-yellow-900">
        ⚠ Postulaciones sin cupos completos ({gaps.length})
      </h3>
      <ul className="space-y-1 text-xs text-yellow-900">
        {gaps.map((g) => (
          <li key={g.submission_id}>
            <strong>{g.submission_title}</strong> — {g.filled}/{g.target}{' '}
            revisores. {g.reason}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-yellow-900">
        Para cerrar estos gaps: agregá más revisores al pool con las líneas
        temáticas necesarias, o subí el max_load de los actuales.
      </p>
    </section>
  );
}
