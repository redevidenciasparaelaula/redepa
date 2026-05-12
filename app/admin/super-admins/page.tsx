import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { SuperAdminsManager } from '@/components/super-admins-manager';

interface SuperAdminRow {
  user_id: string;
  email: string;
  created_at: string;
}

export default async function SuperAdminsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/super-admins');
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Acceso restringido
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super admin.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver a Administración
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_super_admins');
  if (error) {
    console.error('list_super_admins error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      status: (error as { status?: number }).status,
    });
  }
  const superAdmins: SuperAdminRow[] = (data as SuperAdminRow[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver a Administración
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Super administradores
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Gestiona quién tiene acceso total al sistema.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">
            La función RPC <code>list_super_admins</code> devolvió un error.
          </p>
          <ul className="mt-2 space-y-0.5 text-xs">
            <li>
              <strong>message:</strong> {error.message || '(vacío)'}
            </li>
            <li>
              <strong>code:</strong> {error.code || '(vacío)'}
            </li>
            <li>
              <strong>details:</strong> {error.details || '(vacío)'}
            </li>
            <li>
              <strong>hint:</strong> {error.hint || '(vacío)'}
            </li>
          </ul>
        </div>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <SuperAdminsManager
          superAdmins={superAdmins}
          currentUserId={user.id}
        />
      </section>
    </div>
  );
}
