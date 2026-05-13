'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addSuperAdminAction,
  removeSuperAdminAction,
} from '@/app/admin/institutions/actions';

interface SuperAdmin {
  user_id: string;
  email: string;
  created_at: string;
}

interface Props {
  superAdmins: SuperAdmin[];
  currentUserId: string;
}

export function SuperAdminsManager({ superAdmins, currentUserId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [adding, startAdding] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const target = email;
    startAdding(async () => {
      const result = await addSuperAdminAction(target);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        result.invited
          ? `${target} invitada/o por correo y promovida/o a super admin. Recibirá un enlace mágico para entrar.`
          : `${target} ahora es super admin.`
      );
      setEmail('');
      router.refresh();
    });
  }

  async function remove(userId: string, adminEmail: string) {
    if (
      !confirm(
        `¿Quitar a ${adminEmail} como super admin?\n\nMantiene su acceso si es admin de alguna institución.`
      )
    )
      return;
    setRemoving(userId);
    setError(null);
    setSuccess(null);
    const result = await removeSuperAdminAction(userId);
    setRemoving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`${adminEmail} ya no es super admin.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success-text)]">
          {success}
        </div>
      )}

      <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
        {superAdmins.length === 0 ? (
          <li className="px-4 py-3 text-sm text-[var(--muted)]">
            Sin super admins. (Esto sería raro — significa que perdiste el acceso.)
          </li>
        ) : (
          superAdmins.map((a) => {
            const isMe = a.user_id === currentUserId;
            return (
              <li
                key={a.user_id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <span className="truncate text-sm">
                  {a.email}
                  {isMe && (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      (tú)
                    </span>
                  )}
                </span>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => remove(a.user_id, a.email)}
                    disabled={removing === a.user_id}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {removing === a.user_id ? 'Quitando…' : 'Quitar'}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">
            Agregar super admin por correo
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {adding ? 'Agregando…' : 'Agregar'}
        </button>
      </form>
      <p className="text-xs text-[var(--muted)]">
        Super admin tiene acceso total: puede editar todas las instituciones,
        todos los investigadores y gestionar admins. Asígnalo solo a personas
        de confianza del equipo Red EPA.
      </p>
    </div>
  );
}
