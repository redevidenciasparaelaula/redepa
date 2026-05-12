import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { countriesByGroup } from '@/lib/countries';
import { listInstitutions } from '@/lib/queries';
import type { Institution } from '@/lib/supabase/types';
import { AdminAddForm } from '@/components/admin-add-form';

interface Props {
  searchParams: Promise<{ institution?: string }>;
}

export default async function NewResearcherPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/researchers/new');

  if (!user.isSuperAdmin && user.adminOfInstitutions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo administradores pueden agregar investigadores manualmente.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Volver al directorio
        </Link>
      </div>
    );
  }

  const { institution: defaultInstitutionParam } = await searchParams;

  // Cargar las instituciones que este usuario puede asignar.
  const supabase = await createSupabaseServerClient();
  let availableInstitutions: Institution[] = [];
  let allInstitutions: Institution[] = [];

  if (user.isSuperAdmin) {
    allInstitutions = await listInstitutions();
    availableInstitutions = allInstitutions;
  } else {
    const { data } = await supabase
      .from('institutions')
      .select('*')
      .in('id', user.adminOfInstitutions)
      .order('name', { ascending: true });
    availableInstitutions = data ?? [];
    allInstitutions = availableInstitutions;
  }

  // Default institution: viene de query param, o única opción, o vacío
  let defaultInstitutionId = defaultInstitutionParam ?? '';
  if (
    !defaultInstitutionId &&
    !user.isSuperAdmin &&
    availableInstitutions.length === 1
  ) {
    defaultInstitutionId = availableInstitutions[0]!.id;
  }

  const countries = countriesByGroup('es');

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
          Agregar investigador
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          El perfil se publica de inmediato. Lo puedes editar o eliminar
          después.
        </p>
      </header>
      <AdminAddForm
        availableInstitutions={availableInstitutions}
        defaultInstitutionId={defaultInstitutionId}
        allInstitutions={allInstitutions}
        isSuperAdmin={user.isSuperAdmin}
        countries={countries}
      />
    </div>
  );
}
