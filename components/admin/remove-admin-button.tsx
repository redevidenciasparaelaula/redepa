'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  removeInstitutionAdminAction,
  removeSuperAdminAction,
} from '@/app/admin/institutions/actions';

type Kind = 'super' | 'institution';

interface Props {
  kind: Kind;
  userId: string;
  email: string;
  institutionId?: string;
}

export function RemoveAdminButton({ kind, userId, email, institutionId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const verb =
      kind === 'super'
        ? `super admin a ${email}`
        : `admin de institución a ${email}`;
    if (!confirm(`¿Quitar ${verb}? No borra su cuenta, solo el rol.`)) return;
    startTransition(async () => {
      const result =
        kind === 'super'
          ? await removeSuperAdminAction(userId)
          : await removeInstitutionAdminAction(institutionId!, userId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Quitando…' : 'Quitar rol'}
    </button>
  );
}
