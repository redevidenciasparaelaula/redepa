'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { requestPasswordRecoveryAction } from '@/app/sign-in/actions';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordRecoveryAction(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-5 text-sm text-[var(--success-text)]">
        <p className="font-semibold">Revisa tu correo</p>
        <p className="mt-2 leading-relaxed">
          Te enviamos un enlace a <strong>{email}</strong>. Ábrelo desde el
          mismo navegador para configurar una nueva contraseña.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block text-xs text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm transition-colors placeholder:text-[var(--muted)]';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tu.correo@institucion.edu"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !email}
        className="w-full rounded-md bg-[var(--epa-green)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">
        <Link
          href="/sign-in"
          className="text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
        >
          ← Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
