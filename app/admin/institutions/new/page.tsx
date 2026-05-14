import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { countriesByGroup } from '@/lib/countries';
import { InstitutionCreateForm } from '@/components/institution-create-form';

export default async function NewInstitutionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/institutions/new');

  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super admin puede crear instituciones.
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
        >
          ← Volver a Administración
        </Link>
      </div>
    );
  }

  const countries = countriesByGroup('es');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/admin"
        className="text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver a Administración
      </Link>

      <header className="mt-4 mb-6">
        <p className="eyebrow">Super admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Nueva institución
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Agrega una institución al directorio. Después podrás asignarle
          un admin de institución desde la página de detalle.
        </p>
      </header>

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <InstitutionCreateForm countries={countries} />
      </div>
    </div>
  );
}
