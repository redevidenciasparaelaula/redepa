'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updatePasswordAction } from '@/app/sign-in/actions';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    startTransition(async () => {
      const result = await updatePasswordAction(password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      setPassword('');
      setConfirm('');
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Contraseña actualizada.
        </div>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="text-xs text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
        >
          Cambiarla otra vez
        </button>
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
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          Nueva contraseña
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Mínimo 8 caracteres.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          Repite la contraseña
        </label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !password || !confirm}
        className="w-full rounded-md bg-[var(--epa-green)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </form>
  );
}
