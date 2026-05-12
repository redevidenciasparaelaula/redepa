'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addInstitutionAdminAction } from '@/app/admin/institutions/actions';
import { InstitutionCombobox } from './institution-combobox';
import type { Institution } from '@/lib/supabase/types';

interface Props {
  institutions: Institution[];
}

export function AssignInstitutionAdminForm({ institutions }: Props) {
  const router = useRouter();
  const [institutionId, setInstitutionId] = useState('');
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    institutionName: string;
    institutionId: string;
    invited: boolean;
  } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!institutionId) {
      setError('Selecciona una institución.');
      return;
    }
    if (!email.trim()) {
      setError('Escribe un correo.');
      return;
    }
    const inst = institutions.find((i) => i.id === institutionId);
    startTransition(async () => {
      const result = await addInstitutionAdminAction(institutionId, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({
        email: email.trim(),
        institutionName: inst?.name ?? '',
        institutionId,
        invited: result.invited,
      });
      setEmail('');
      router.refresh();
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-emerald-900">
        <p className="font-medium">
          {success.invited
            ? `${success.email} invitada/o por correo y asignada/o como admin de ${success.institutionName}. Recibirá un enlace para activar su acceso.`
            : `${success.email} es ahora admin de ${success.institutionName}.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/admin/institutions/${success.institutionId}`}
            className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Ver institución
          </Link>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-100"
          >
            Asignar otro
          </button>
          <Link
            href="/admin"
            className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-100"
          >
            Volver a Administración
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Institución <span className="text-red-600">*</span>
        </label>
        <InstitutionCombobox
          institutions={institutions}
          value={institutionId}
          onChange={setInstitutionId}
          placeholder="Buscar universidad…"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Correo del admin <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@institucion.cl"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Si el correo ya tiene cuenta, se asigna directo. Si no, le enviamos
          una invitación.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending || !institutionId || !email}
        className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Asignando…' : 'Asignar admin'}
      </button>
    </form>
  );
}
