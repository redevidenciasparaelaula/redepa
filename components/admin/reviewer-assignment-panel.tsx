'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignReviewerAction,
  unassignReviewerAction,
  updateAssignmentDeadlineAction,
} from '@/app/admin/congresos/[slug]/postulaciones/actions';
import type {
  AssignmentRow,
  ReviewerSuggestion,
} from '@/lib/queries';

interface Props {
  submissionId: string;
  assignments: AssignmentRow[];
  suggestions: ReviewerSuggestion[];
  submissionStatus: string;
}

const ASSIGNMENT_STATUS_LABEL: Record<AssignmentRow['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  submitted: 'Enviada',
  declined: 'Rechazada',
};

const ASSIGNMENT_STATUS_COLOR: Record<AssignmentRow['status'], string> = {
  pending: 'bg-[var(--accent)] text-[var(--muted)]',
  in_progress: 'bg-[var(--epa-blue)] text-white',
  submitted: 'bg-[var(--epa-green)] text-white',
  declined: 'bg-red-100 text-red-800',
};

export function ReviewerAssignmentPanel({
  submissionId,
  assignments,
  suggestions,
  submissionStatus,
}: Props) {
  const submissionUnassignable = submissionStatus === 'draft';

  return (
    <div className="space-y-6">
      {submissionUnassignable && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
          Esta postulación todavía es borrador. Puedes asignar revisores ahora;
          ellos no verán nada hasta que la postulación sea enviada.
        </div>
      )}

      {/* Asignados actuales */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Asignados ({assignments.length})
        </h3>
        {assignments.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            Aún no hay revisores asignados.
          </p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <AssignmentRowItem key={a.assignment_id} a={a} />
            ))}
          </ul>
        )}
      </div>

      {/* Sugerencias */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Sugerencias del pool ({suggestions.length})
        </h3>
        {suggestions.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            No hay nadie activo en el pool. Agrégalos primero en{' '}
            <a
              href="../revisores"
              className="text-[var(--epa-blue)] underline"
            >
              Gestionar pool
            </a>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <SuggestionRow
                key={s.user_id}
                s={s}
                submissionId={submissionId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Fila de un revisor ya asignado
// =====================================================================
function AssignmentRowItem({ a }: { a: AssignmentRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const router = useRouter();

  function onUnassign() {
    if (!confirm(`Quitar a ${a.reviewer_name}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await unassignReviewerAction(a.assignment_id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onSaveDeadline(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get('deadline_at') ?? '').trim();
    const iso = raw ? `${raw}T23:59:59Z` : null;
    setError(null);
    startTransition(async () => {
      const res = await updateAssignmentDeadlineAction(a.assignment_id, iso);
      if (!res.ok) setError(res.error);
      else {
        setEditingDeadline(false);
        router.refresh();
      }
    });
  }

  const dateInput = a.deadline_at ? a.deadline_at.slice(0, 10) : '';

  return (
    <li className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{a.reviewer_name}</p>
            <span
              className={
                'rounded-full px-2 py-0.5 text-xs font-medium ' +
                ASSIGNMENT_STATUS_COLOR[a.status]
              }
            >
              {ASSIGNMENT_STATUS_LABEL[a.status]}
            </span>
            {a.review_submitted && (
              <span className="rounded-full bg-[var(--epa-green-dark)] px-2 py-0.5 text-xs font-medium text-white">
                ✓ Review entregada
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">{a.reviewer_email}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Asignado el {formatDate(a.assigned_at)}
            {a.deadline_at && ` · Deadline: ${formatDate(a.deadline_at)}`}
          </p>

          {editingDeadline && (
            <form
              onSubmit={onSaveDeadline}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input
                type="date"
                name="deadline_at"
                defaultValue={dateInput}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[var(--epa-green)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditingDeadline(false)}
                className="rounded-md border border-[var(--border)] bg-white px-3 py-1 text-xs"
              >
                Cancelar
              </button>
            </form>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!editingDeadline && (
            <button
              type="button"
              onClick={() => setEditingDeadline(true)}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--accent)]"
            >
              Cambiar deadline
            </button>
          )}
          {!a.review_submitted && (
            <button
              type="button"
              onClick={onUnassign}
              disabled={isPending}
              className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

// =====================================================================
// Fila de un revisor sugerido
// =====================================================================
function SuggestionRow({
  s,
  submissionId,
}: {
  s: ReviewerSuggestion;
  submissionId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onAssign() {
    setError(null);
    startTransition(async () => {
      const res = await assignReviewerAction(submissionId, s.user_id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const blocked = s.is_conflict || s.is_already_assigned;
  const noCapacity = s.capacity_left <= 0;

  return (
    <li
      className={
        'rounded-md border p-4 ' +
        (blocked
          ? 'border-[var(--border)] bg-[var(--surface)] opacity-60'
          : 'border-[var(--border)] bg-white')
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{s.full_name}</p>
            {s.match_score > 0 && (
              <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
                Match {s.match_score}
              </span>
            )}
            {s.is_conflict && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                Conflicto: es autor/a
              </span>
            )}
            {s.is_already_assigned && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                Ya asignado/a
              </span>
            )}
            {!blocked && noCapacity && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                Sin capacidad
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {s.email}
            {s.institution_name && ` · ${s.institution_name}`}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Carga: {s.current_load} / {s.max_load}
          </p>

          {(s.match_keywords.length > 0 || s.match_methodologies.length > 0) && (
            <p className="mt-2 text-xs">
              <span className="text-[var(--muted)]">Match en: </span>
              <span className="font-medium text-[var(--foreground)]">
                {[...s.match_keywords, ...s.match_methodologies].join(', ')}
              </span>
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        {!blocked && (
          <button
            type="button"
            onClick={onAssign}
            disabled={isPending}
            className="rounded-md bg-[var(--epa-green)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
          >
            {isPending ? 'Asignando…' : 'Asignar'}
          </button>
        )}
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
