'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addAuthorByEmailAction,
  addExternalAuthorAction,
  removeAuthorAction,
  setPresenterAction,
  reorderAuthorsAction,
} from '@/app/congreso/2027/postular/actions';
import type { SubmissionAuthorEnriched } from '@/lib/queries';

interface Props {
  submissionId: string;
  authors: SubmissionAuthorEnriched[];
  readOnly: boolean;
  // Callback opcional que corre ANTES de cualquier mutación de autores.
  // Sirve para que el editor padre guarde primero los campos que aún no
  // fueron persistidos y no se pierdan al router.refresh().
  onBeforeMutate?: () => Promise<{ ok: boolean }>;
}

export function SubmissionAuthorsEditor({
  submissionId,
  authors,
  readOnly,
  onBeforeMutate,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'directory' | 'external'>('idle');
  const [reorderPending, startReorder] = useTransition();
  const [reorderErr, setReorderErr] = useState<string | null>(null);
  const router = useRouter();

  const sorted = [...authors].sort(
    (a, b) => a.display_order - b.display_order
  );

  function move(id: string, direction: 'up' | 'down') {
    const idx = sorted.findIndex((a) => a.id === id);
    if (idx < 0) return;
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    setReorderErr(null);
    startReorder(async () => {
      // Guardar primero el resto del formulario si el padre lo pidió
      if (onBeforeMutate) {
        const saveRes = await onBeforeMutate();
        if (!saveRes.ok) {
          setReorderErr('No se pudieron guardar los cambios previos.');
          return;
        }
      }
      const res = await reorderAuthorsAction(
        submissionId,
        newOrder.map((a) => a.id)
      );
      if (!res.ok) setReorderErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {!readOnly && sorted.length > 1 && (
        <p className="mb-2 text-xs text-[var(--muted)]">
          Usa las flechas ↑ ↓ para reordenar las y los autores. El primero
          aparecerá como principal en la portada del abstract.
        </p>
      )}
      <ul className="space-y-2">
        {sorted.map((a, i) => (
          <AuthorRow
            key={a.id}
            author={a}
            index={i}
            total={sorted.length}
            submissionId={submissionId}
            readOnly={readOnly}
            canRemove={!readOnly && sorted.length > 1 && !a.is_corresponding}
            onMoveUp={() => move(a.id, 'up')}
            onMoveDown={() => move(a.id, 'down')}
            reorderBusy={reorderPending}
          />
        ))}
      </ul>
      {reorderErr && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {reorderErr}
        </p>
      )}

      {!readOnly && (
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          {mode === 'idle' && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setMode('directory')}
                className="rounded-md bg-[var(--epa-blue)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                + Agregar autor del directorio
              </button>
              <button
                type="button"
                onClick={() => setMode('external')}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-1.5 text-sm hover:bg-[var(--accent)]"
              >
                + Agregar autor externo
              </button>
            </div>
          )}

          {mode === 'directory' && (
            <AddByDirectoryForm
              submissionId={submissionId}
              onDone={() => setMode('idle')}
              onBeforeMutate={onBeforeMutate}
            />
          )}

          {mode === 'external' && (
            <AddExternalForm
              submissionId={submissionId}
              onDone={() => setMode('idle')}
              onBeforeMutate={onBeforeMutate}
            />
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Fila de cada autor
// =====================================================================
function AuthorRow({
  author,
  index,
  total,
  submissionId,
  readOnly,
  canRemove,
  onMoveUp,
  onMoveDown,
  reorderBusy,
}: {
  author: SubmissionAuthorEnriched;
  index: number;
  total: number;
  submissionId: string;
  readOnly: boolean;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  reorderBusy: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onRemove() {
    if (!confirm(`Quitar a ${author.full_name} de los autores?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await removeAuthorAction(submissionId, author.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onMakePresenter() {
    if (author.is_presenter) return;
    setError(null);
    startTransition(async () => {
      const res = await setPresenterAction(submissionId, author.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const institution = author.institution_name ?? null;

  return (
    <li className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {!readOnly && total > 1 && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label="Subir en el orden"
                title="Subir"
                onClick={onMoveUp}
                disabled={reorderBusy || index === 0}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-xs text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Bajar en el orden"
                title="Bajar"
                onClick={onMoveDown}
                disabled={reorderBusy || index === total - 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-xs text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">
                #{index + 1}
              </span>
              <p className="font-medium text-[var(--foreground)]">
                {author.full_name}
              </p>
              {index === 0 && (
                <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
                  Principal
                </span>
              )}
              {author.is_presenter && (
                <span className="rounded-full bg-[var(--epa-green)] px-2 py-0.5 text-xs font-medium text-white">
                  Presenta
                </span>
              )}
              {author.user_id === null && (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  Externo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {author.email}
              {institution && ` · ${institution}`}
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {!author.is_presenter && (
              <button
                type="button"
                onClick={onMakePresenter}
                disabled={isPending}
                className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
              >
                Marcar como presentador/a
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={isPending}
                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// =====================================================================
// Panel: agregar autor del directorio (por email)
// Nota: es un <div> (no <form>) para NO anidarse dentro del <form> padre.
// Los <form> anidados son HTML inválido y causan que se dispare el submit
// del formulario equivocado (borrando datos no guardados).
// =====================================================================
function AddByDirectoryForm({
  submissionId,
  onDone,
  onBeforeMutate,
}: {
  submissionId: string;
  onDone: () => void;
  onBeforeMutate?: () => Promise<{ ok: boolean }>;
}) {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    if (!email.trim()) {
      setError('Email requerido.');
      return;
    }
    setError(null);
    startTransition(async () => {
      if (onBeforeMutate) {
        const saveRes = await onBeforeMutate();
        if (!saveRes.ok) {
          setError('No se pudieron guardar los cambios previos.');
          return;
        }
      }
      const fd = new FormData();
      fd.set('email', email.trim());
      const res = await addAuthorByEmailAction(submissionId, fd);
      if (!res.ok) setError(res.error);
      else {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-medium">Agregar co-autora/o del directorio</p>
      <p className="text-xs text-[var(--muted)]">
        Si la persona tiene cuenta en redepa.net, se autocompletan nombre e
        institución desde su perfil. Si no aparece, usa &quot;Agregar autor externo&quot;.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          required
          placeholder="ejemplo@universidad.cl"
          className={inputCls}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          {isPending ? 'Agregando…' : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={onDone}
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
    </div>
  );
}

// =====================================================================
// Formulario: agregar autor externo (no en el directorio)
// =====================================================================
function AddExternalForm({
  submissionId,
  onDone,
  onBeforeMutate,
}: {
  submissionId: string;
  onDone: () => void;
  onBeforeMutate?: () => Promise<{ ok: boolean }>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    if (!fullName.trim()) { setError('Nombre requerido.'); return; }
    if (!email.trim()) { setError('Email requerido.'); return; }
    setError(null);
    startTransition(async () => {
      if (onBeforeMutate) {
        const saveRes = await onBeforeMutate();
        if (!saveRes.ok) {
          setError('No se pudieron guardar los cambios previos.');
          return;
        }
      }
      const fd = new FormData();
      fd.set('full_name', fullName.trim());
      fd.set('email', email.trim());
      if (institutionName.trim()) fd.set('institution_name', institutionName.trim());
      const res = await addExternalAuthorAction(submissionId, fd);
      if (!res.ok) setError(res.error);
      else {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-medium">Agregar co-autora/o externo</p>
      <p className="text-xs text-[var(--muted)]">
        Si la persona no está en redepa.net. Solo necesitamos nombre, email e
        institución.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Nombre completo</span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={200}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Institución (opcional)</span>
        <input
          type="text"
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          maxLength={300}
          className={inputCls}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          {isPending ? 'Agregando…' : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={onDone}
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
    </div>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';
