import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { countriesByGroup } from '@/lib/countries';
import { listInstitutions } from '@/lib/queries';
import type { Institution } from '@/lib/supabase/types';
import { InstitutionEditForm } from '@/components/institution-edit-form';
import { InstitutionAdminsManager } from '@/components/institution-admins-manager';
import { InstitutionMergeForm } from '@/components/institution-merge-form';
import { InstitutionDeleteButton } from '@/components/institution-delete-button';

interface Props {
  params: Promise<{ id: string }>;
}

interface AdminRow {
  user_id: string;
  email: string;
  created_at: string;
}

export default async function InstitutionPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/institutions/${id}`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Acceso restringido
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super admin puede editar instituciones.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver a Administración
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: institution } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .maybeSingle<Institution>();
  if (!institution) notFound();

  // Conteo de investigadores para mostrar en advertencia de merge
  const { count: researchersCount } = await supabase
    .from('researchers')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', id);

  // Admins via RPC
  const { data: adminsData, error: adminsError } = await supabase.rpc(
    'list_institution_admins',
    { p_institution_id: id }
  );
  if (adminsError) {
    console.error('list_institution_admins error', adminsError);
  }
  const admins: AdminRow[] = (adminsData as AdminRow[] | null) ?? [];

  const allInstitutions = await listInstitutions();
  const countries = countriesByGroup('es');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver a Administración
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {institution.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {institution.country}
          {institution.city ? ` · ${institution.city}` : ''} ·{' '}
          {researchersCount ?? 0} investigador(es)
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Datos de la institución
          </h2>
          <InstitutionEditForm
            institution={institution}
            countries={countries}
          />
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Admins de esta institución
          </h2>
          <InstitutionAdminsManager
            institutionId={institution.id}
            admins={admins}
          />
        </section>

        <section className="rounded-lg border border-amber-300 bg-amber-50 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-900">
            Fusionar con otra institución
          </h2>
          <InstitutionMergeForm
            source={institution}
            allInstitutions={allInstitutions}
          />
        </section>

        <section className="rounded-lg border border-red-300 bg-red-50 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-900">
            Zona de peligro
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-red-900">
            Eliminar la institución es permanente. No se puede deshacer.
            Solo es posible si no tiene investigadores asignados — primero
            reasígnalos a otra institución o usa &ldquo;Fusionar&rdquo; arriba.
          </p>
          <InstitutionDeleteButton
            id={institution.id}
            name={institution.name}
            researchersCount={researchersCount ?? 0}
          />
        </section>
      </div>
    </div>
  );
}
