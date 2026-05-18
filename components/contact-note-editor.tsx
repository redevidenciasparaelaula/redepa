'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContactNoteAction } from '@/app/me/contactos/actions';

interface Props {
  researcherId: string;
  initialNote: string | null;
}

// Editor inline de nota privada. Empieza colapsado mostrando la nota como
// texto plano (o "Agregar nota" si está vacío). Click → expande a textarea.
// Guarda al blur o al presionar el botón.
export function ContactNoteEditor({ researcherId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote ?? '');
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    if (note === (initialNote ?? '')) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateContactNoteAction(researcherId, note);
      if (!res.ok) {
        setError(res.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Nota privada
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 block w-full whitespace-pre-wrap rounded-md border border-dashed border-[var(--border)] bg-white p-3 text-left text-sm hover:border-[var(--epa-blue)] hover:bg-[var(--surface)]"
        >
          {initialNote ? (
            <span className="text-[var(--foreground)]">{initialNote}</span>
          ) : (
            <span className="italic text-[var(--muted)]">
              Agregar una nota privada (ej. de qué hablamos, qué le interesa, etc.)
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Nota privada
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        rows={4}
        maxLength={2000}
        autoFocus
        placeholder="Conversamos en EPA 2025, le interesa evaluación formativa, experiencia en escuelas rurales, etc."
        className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-4 py-1 text-xs font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setNote(initialNote ?? '');
            setEditing(false);
            setError(null);
          }}
          disabled={isPending}
          className="rounded-md border border-[var(--border)] bg-white px-4 py-1 text-xs hover:bg-[var(--accent)]"
        >
          Cancelar
        </button>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {note.length} / 2000
        </span>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
