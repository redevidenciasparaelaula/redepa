'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addAuthorByEmailAction,
  addExternalAuthorAction,
  removeAuthorAction,
  setPresenterAction,
} from '@/app/congreso/2027/postular/actions';
import type { SubmissionAuthor } from '@/lib/supabase/types';

interface Props {
  submissionId: string;
  authors: SubmissionAuthor[];
  readOnly: boolean;
}

export function SubmissionAuthorsEditor({
  submissionId,
  authors,
  readOnly,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'directory' | 'external'>('idle');

  const sorted = [...authors].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div>
      <ul className="space-y-2">
        {sorted.map((a, i) => (
          <AuthorRow
            key={a.id}
            author={a}
            index={i}
            submissionId={submissionId}
            readOnly={readOnly}
            canRemove={!readOnly && sorted.length > 1 && !a.is_corresponding}
          />
        ))}
      </ul>

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
            />
          )}

          {mode === 'external' && (
            <AddExternalForm
              submissionId={submissionId}
              onDone={() => setMode('idle')}
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
  submissionId,
  readOnly,
  canRemove,
}: {
  author: SubmissionAuthor;
  index: number;
  submissionId: string;
  readOnly: boolean;
  canRemove: boolean;
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

  const institution =
    author.external_institution_name ??
    (author.institution_id ? 'En directorio' : '—');

  return (
    <li className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]">
              #{index + 1}
            </span>
            <p className="font-medium text-[var(--foreground)]">
              {author.full_name}
            </p>
            {author.is_corresponding && (
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
            {institution !== '—' && ` · ${institution}`}
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
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
// Formulario: agregar autor del directorio (por email)
// =====================================================================
function AddByDirectoryForm({
  submissionId,
  onDone,
}: {
  submissionId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await addAuthorByEmailAction(submissionId, formData);
      if (!res.ok) setError(res.error);
      else {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-[var(--border)] bg-white p-4"
    >
      <p className="text-sm font-medium">Agregar co-autora/o del directorio</p>
      <p className="text-xs text-[var(--muted)]">
        Si la persona tiene cuenta en redepa.net, se autocompletan nombre e
        institución desde su perfil. Si no aparece, usa "Agregar autor externo".
      </p>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          required
          placeholder="ejemplo@universidad.cl"
          className={inputCls}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          Agregar
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
    </form>
  );
}

// =====================================================================
// Formulario: agregar autor externo (no en el directorio)
// =====================================================================
function AddExternalForm({
  submissionId,
  onDone,
}: {
  submissionId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await addExternalAuthorAction(submissionId, formData);
      if (!res.ok) setError(res.error);
      else {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-[var(--border)] bg-white p-4"
    >
      <p className="text-sm font-medium">Agregar co-autora/o externo</p>
      <p className="text-xs text-[var(--muted)]">
        Si la persona no está en redepa.net. Solo necesitamos nombre, email e
        institución.
      </p>
      <label className="block">
        <span className="text-sm font-medium">Nombre completo</span>
        <input
          type="text"
          name="full_name"
          required
          maxLength={200}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          required
          maxLength={200}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Institución (opcional)</span>
        <input
          type="text"
          name="institution_name"
          maxLength={300}
          className={inputCls}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          Agregar
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
    </form>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';
