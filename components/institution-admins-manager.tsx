'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addInstitutionAdminAction,
  removeInstitutionAdminAction,
} from '@/app/admin/institutions/actions';

interface Admin {
  user_id: string;
  email: string;
  created_at: string;
}

interface Props {
  institutionId: string;
  admins: Admin[];
}

export function InstitutionAdminsManager({ institutionId, admins }: Props) {
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
      const result = await addInstitutionAdminAction(institutionId, target);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        result.invited
          ? `${target} invitada/o por correo y asignada/o como admin. Recibirá un enlace mágico para activar su acceso.`
          : `${target} asignada/o como admin.`
      );
      setEmail('');
      router.refresh();
    });
  }

  async function remove(userId: string, adminEmail: string) {
    if (!confirm(`¿Quitar a ${adminEmail} como admin de esta institución?`)) {
      return;
    }
    setRemoving(userId);
    setError(null);
    setSuccess(null);
    const result = await removeInstitutionAdminAction(institutionId, userId);
    setRemoving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`${adminEmail} removido.`);
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
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </div>
      )}

      <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
        {admins.length === 0 ? (
          <li className="px-4 py-3 text-sm text-[var(--muted)]">
            Aún no hay admins asignados a esta institución.
          </li>
        ) : (
          admins.map((a) => (
            <li
              key={a.user_id}
              className="flex items-center justify-between gap-3 px-4 py-2"
            >
              <span className="truncate text-sm">{a.email}</span>
              <button
                type="button"
                onClick={() => remove(a.user_id, a.email)}
                disabled={removing === a.user_id}
                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {removing === a.user_id ? 'Quitando…' : 'Quitar'}
              </button>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">
            Agregar admin por correo
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@institucion.cl"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {adding ? 'Asignando…' : 'Asignar'}
        </button>
      </form>
      <p className="text-xs text-[var(--muted)]">
        Si el correo ya tiene cuenta, se asigna directo. Si no, le enviamos
        una invitación por correo y queda asignada/o de inmediato.
      </p>
    </div>
  );
}
