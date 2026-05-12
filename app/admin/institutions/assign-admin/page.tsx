import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listInstitutions } from '@/lib/queries';
import { AssignInstitutionAdminForm } from '@/components/assign-institution-admin-form';

export default async function AssignAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/institutions/assign-admin');
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Acceso restringido
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super admin puede asignar admins de institución.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver a Administración
        </Link>
      </div>
    );
  }

  const institutions = await listInstitutions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver a Administración
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asignar admin de institución
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Da a alguien permiso para gestionar los investigadores de una
          institución (ver, editar, eliminar, agregar). No es lo mismo que
          super admin — el acceso se limita a esa institución.
        </p>
      </header>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <AssignInstitutionAdminForm institutions={institutions} />
      </section>
    </div>
  );
}
