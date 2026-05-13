'use client';

import { useState, useTransition } from 'react';
import { adminResetPasswordAction } from '@/app/admin/actions';

interface Props {
  email: string;
  name: string;
}

export function ResetPasswordButton({ email, name }: Props) {
  const [pending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (
      !confirm(
        `¿Resetear la contraseña de ${name} (${email})?\n\nSe generará una nueva contraseña que tendrás que comunicarle. La anterior dejará de funcionar.`
      )
    )
      return;
    setError(null);
    setNewPassword(null);
    startTransition(async () => {
      const result = await adminResetPasswordAction(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewPassword(result.password);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--accent)] disabled:opacity-50"
      >
        {pending ? 'Reseteando…' : 'Reset contraseña'}
      </button>
      {newPassword && (
        <span className="rounded-md border border-[var(--success-border-strong)] bg-[var(--success-bg)] px-2 py-1 font-mono text-xs text-[var(--success-text)]">
          Nueva: <strong>{newPassword}</strong>{' '}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(newPassword)}
            className="ml-1 underline"
          >
            copiar
          </button>
        </span>
      )}
      {error && (
        <span className="text-xs text-red-700">{error}</span>
      )}
    </span>
  );
}
