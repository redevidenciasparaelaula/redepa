'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addToReviewerPoolAction,
  updateReviewerPoolEntryAction,
  removeFromReviewerPoolAction,
  addManuallyToDirectoryAndPoolAction,
  type ManualAddResult,
} from '@/app/admin/congresos/[slug]/revisores/actions';
import type {
  ReviewerPoolMember,
  AvailableReviewerCandidate,
} from '@/lib/queries';
import type { Institution } from '@/lib/supabase/types';
import type { CongressTrack } from '@/lib/queries';

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
// ManualAddToPoolForm: crea cuenta + directorio + pool en un solo paso.
// Útil cuando queremos sumar a alguien que todavía no está registrado
// en redepa.net (ej. una revisora invitada externamente).
// =====================================================================
export function ManualAddToPoolForm({
  congressId,
  institutions,
  tracks,
}: {
  congressId: string;
  institutions: Pick<Institution, 'id' | 'name'>[];
  tracks: Pick<CongressTrack, 'id' | 'name'>[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualAddResult | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const router = useRouter();

  function toggleTrack(name: string) {
    setSelectedTracks((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedTracks.length === 0) {
      setError('Selecciona al menos una línea temática.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    // Los tracks van en el campo `topics` del pool, que es el que se
    // matchea contra las postulaciones al sugerir revisores.
    formData.set('topics', selectedTracks.join(', '));
    // Este flujo no captura metodologías (decisión de producto):
    // se guardan como vacío.
    formData.set('methodologies', '');
    setError(null);
    startTransition(async () => {
      const res = await addManuallyToDirectoryAndPoolAction(
        congressId,
        formData
      );
      if (!res.ok) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res);
      setSelectedTracks([]);
      // El form NO se resetea inmediatamente porque el super-admin
      // necesita ver la contraseña temporal. Se limpia cuando cierra.
      router.refresh();
    });
  }

  function reset() {
    setExpanded(false);
    setError(null);
    setResult(null);
    setSelectedTracks([]);
  }

  if (!expanded && !result) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">Agregar manualmente</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Suma a alguien que aún no está en redepa.net: se crea la cuenta,
              se le agrega al directorio y se le suma al pool en un paso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 rounded-md border border-[var(--epa-blue)] bg-white px-4 py-2 text-sm font-semibold text-[var(--epa-blue)] hover:bg-[var(--epa-blue)] hover:text-white"
          >
            + Agregar manualmente
          </button>
        </div>
      </div>
    );
  }

  // Vista de resultado: cuenta creada, mostrar contraseña
  if (result && result.ok) {
    return (
      <div className="rounded-lg border-2 border-[var(--epa-green)] bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--epa-green-dark)]">
              ✓ Listo
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                {result.createdAuthUser
                  ? 'Cuenta de acceso creada.'
                  : 'La persona ya tenía cuenta en redepa.net.'}
              </li>
              <li>
                {result.createdResearcher
                  ? 'Perfil agregado al directorio.'
                  : 'La persona ya tenía perfil en el directorio.'}
              </li>
              <li>Agregada al pool del congreso.</li>
            </ul>

            {result.password && (
              <div className="mt-4 rounded-md border border-[var(--epa-blue)] bg-[var(--accent)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--epa-blue)]">
                  Contraseña temporal — cópiala ahora
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-[var(--foreground)]">
                  {result.password}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Comunícasela al revisor por un canal seguro. No vuelve a
                  mostrarse. Puede cambiarla desde /me después de ingresar.
                </p>
              </div>
            )}

            {result.warning && (
              <p className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800">
                ⚠ {result.warning}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)]"
          >
            Agregar otra persona
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--epa-blue)] bg-white p-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre completo">
            <input
              type="text"
              name="full_name"
              required
              className={inputCls}
              placeholder="Ej. María González Pérez"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              name="email"
              required
              className={inputCls}
              placeholder="revisora@universidad.cl"
            />
          </Field>
        </div>
        <Field label="Institución" hint="Elige de la lista.">
          <select name="institution_id" required className={inputCls} defaultValue="">
            <option value="" disabled>
              Elige una institución…
            </option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="País (opcional)">
            <input
              type="text"
              name="country"
              className={inputCls}
              placeholder="Chile"
            />
          </Field>
          <Field label="Ciudad (opcional)">
            <input
              type="text"
              name="city"
              className={inputCls}
              placeholder="Santiago"
            />
          </Field>
        </div>
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
        <fieldset>
          <legend className="text-sm font-medium text-[var(--foreground)]">
            Líneas temáticas que puede revisar
          </legend>
          <p className="text-xs text-[var(--muted)]">
            Selecciona una o más. Se usan para hacer match con las postulaciones.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tracks.map((t) => {
              const checked = selectedTracks.includes(t.name);
              return (
                <label
                  key={t.id}
                  className={
                    'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ' +
                    (checked
                      ? 'border-[var(--epa-blue)] bg-[var(--accent)]'
                      : 'border-[var(--border)] bg-white hover:bg-[var(--surface)]')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTrack(t.name)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>{t.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
          >
            {isPending ? 'Creando…' : 'Crear y agregar al pool'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="rounded-md border border-[var(--border)] bg-white px-4 py-1.5 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
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
    </div>
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
