'use client';

import { useState, useTransition } from 'react';
import { subscribeToCongressAction } from '@/app/congreso/actions';

interface Props {
  congressId: string;
}

// CongressSubscribeForm
// Form inline para recibir aviso cuando abra la convocatoria. Sin login.
// Honeypot 'company' invisible para detección de bots.
export function CongressSubscribeForm({ congressId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<'ok' | 'already' | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await subscribeToCongressAction(congressId, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(res.status);
      form.reset();
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-[var(--epa-green)] bg-white p-5">
        <p className="text-sm font-semibold text-[var(--epa-green-dark)]">
          {success === 'already'
            ? 'Ya estabas en la lista.'
            : '¡Listo! Te avisamos cuando abra la convocatoria.'}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Mientras tanto, podés explorar el directorio en{' '}
          <a href="/directorio" className="underline">
            redepa.net/directorio
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {/* Honeypot: invisible para humanos, atractivo para bots */}
      <div aria-hidden="true" className="hidden">
        <label>
          Company (déjalo en blanco):
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="block text-xs font-medium text-[var(--foreground)]">
            Nombre (opcional)
          </span>
          <input
            type="text"
            name="name"
            placeholder="ej. María Pérez"
            maxLength={200}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--foreground)]">
            Email <span className="text-red-600">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder="tu@correo.cl"
            maxLength={200}
            className={inputCls}
            autoComplete="email"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-[var(--epa-green)] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--epa-green-dark)] hover:shadow disabled:opacity-50 sm:w-auto"
          >
            {isPending ? 'Enviando…' : 'Avísame'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        Solo te escribimos para anunciar la apertura. Sin spam.
      </p>
    </form>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';
