'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addToReviewerPoolAction,
  updateReviewerPoolEntryAction,
  removeFromReviewerPoolAction,
} from '@/app/admin/congresos/[slug]/revisores/actions';
import type {
  ReviewerPoolMember,
  AvailableReviewerCandidate,
} from '@/lib/queries';

// =====================================================================
// ReviewerPoolList: lista de quienes están en el pool, con edición inline
// =====================================================================
export function ReviewerPoolList({
  pool,
  congressId,
}: {
  pool: ReviewerPoolMember[];
  congressId: string;
}) {
  if (pool.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        Todavía no hay nadie en el pool. Agrega revisores desde la lista de abajo.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {pool.map((m) => (
        <PoolRow key={m.user_id} member={m} congressId={congressId} />
      ))}
    </ul>
  );
}

function PoolRow({
  member,
  congressId,
}: {
  member: ReviewerPoolMember;
  congressId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await updateReviewerPoolEntryAction(
        member.user_id,
        congressId,
        formData
      );
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function onRemove() {
    if (
      !confirm(
        `Quitar del pool a ${member.researcher?.full_name ?? member.email}?`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await removeFromReviewerPoolAction(member.user_id, congressId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const displayName = member.researcher?.full_name ?? member.email;
  const institution = member.researcher?.institution_name;

  if (editing) {
    return (
      <li className="rounded-lg border border-[var(--epa-blue)] bg-white p-5">
        <form onSubmit={onSave} className="space-y-3">
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-[var(--muted)]">{member.email}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Carga máx (abstracts)">
              <input
                type="number"
                name="max_load"
                min={1}
                max={50}
                defaultValue={member.max_load}
                required
                className={inputCls}
              />
            </Field>
            <Field
              label="Activo"
              hint="Desactiva para excluirlo del próximo round de asignaciones."
            >
              <label className="mt-2 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={member.active}
                  className="h-4 w-4"
                />
                <span className="text-sm">Activo en este congreso</span>
              </label>
            </Field>
          </div>
          <Field
            label="Temas de expertise"
            hint="Separados por coma. Se usan para hacer match con las postulaciones."
          >
            <input
              type="text"
              name="topics"
              defaultValue={member.topics.join(', ')}
              className={inputCls}
            />
          </Field>
          <Field label="Metodologías de expertise" hint="Separadas por coma.">
            <input
              type="text"
              name="methodologies"
              defaultValue={member.methodologies.join(', ')}
              className={inputCls}
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-[var(--border)] bg-white px-4 py-1.5 text-sm hover:bg-[var(--accent)]"
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-[var(--border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--foreground)]">{displayName}</p>
            {!member.active && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                Inactivo
              </span>
            )}
            {member.researcher === null && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                Sin perfil en directorio
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {member.email}
            {institution && ` · ${institution}`}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Stat label="Carga máx" value={`${member.max_load}`} />
            <Stat
              label="Asignados"
              value={`${member.assignments_count} / ${member.max_load}`}
            />
            <Stat label="Temas" value={`${member.topics.length}`} />
            <Stat label="Metodologías" value={`${member.methodologies.length}`} />
          </dl>

          {member.topics.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              <span className="font-medium">Temas: </span>
              {member.topics.join(', ')}
            </p>
          )}
          {member.methodologies.length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              <span className="font-medium">Metodologías: </span>
              {member.methodologies.join(', ')}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--accent)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}

// =====================================================================
// AvailableReviewersList: candidatos (marcados como disponibles, no en pool)
// =====================================================================
export function AvailableReviewersList({
  candidates,
  congressId,
}: {
  candidates: AvailableReviewerCandidate[];
  congressId: string;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
        No hay investigadores marcados como disponibles fuera del pool. Cuando
        alguien marque la opción en su perfil, aparecerá acá.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {candidates.map((c) => (
        <CandidateRow key={c.id} candidate={c} congressId={congressId} />
      ))}
    </ul>
  );
}

function CandidateRow({
  candidate,
  congressId,
}: {
  candidate: AvailableReviewerCandidate;
  congressId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('email', candidate.email);
    setError(null);
    startTransition(async () => {
      const res = await addToReviewerPoolAction(congressId, formData);
      if (!res.ok) setError(res.error);
      else {
        setExpanded(false);
        router.refresh();
      }
    });
  }

  return (
    <li className="rounded-lg border border-[var(--border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--foreground)]">
            {candidate.full_name}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {candidate.email}
            {candidate.institution_name && ` · ${candidate.institution_name}`}
          </p>
          {candidate.topics.length > 0 && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              <span className="font-medium">Temas: </span>
              {candidate.topics.join(', ')}
            </p>
          )}
          {candidate.methodologies.length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              <span className="font-medium">Metodologías: </span>
              {candidate.methodologies.join(', ')}
            </p>
          )}
        </div>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-md bg-[var(--epa-green)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)]"
          >
            + Agregar al pool
          </button>
        )}
      </div>

      {expanded && (
        <form
          onSubmit={onAdd}
          className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"
        >
          <p className="text-sm text-[var(--muted)]">
            Confirma carga, temas y metodologías. Por defecto se prellenan los
            temas/metodologías del perfil.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Carga máx (abstracts)">
              <input
                type="number"
                name="max_load"
                min={1}
                max={50}
                defaultValue={5}
                required
                className={inputCls}
              />
            </Field>
          </div>
          <Field
            label="Temas de expertise"
            hint="Separados por coma. Edita si querés acotar."
          >
            <input
              type="text"
              name="topics"
              defaultValue={candidate.topics.join(', ')}
              className={inputCls}
            />
          </Field>
          <Field label="Metodologías de expertise" hint="Separadas por coma.">
            <input
              type="text"
              name="methodologies"
              defaultValue={candidate.methodologies.join(', ')}
              className={inputCls}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
            >
              Agregar al pool
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-md border border-[var(--border)] bg-white px-4 py-1.5 text-sm hover:bg-[var(--accent)]"
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

// =====================================================================
// Helpers compartidos
// =====================================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {hint && (
        <span className="block text-xs text-[var(--muted)]">{hint}</span>
      )}
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
