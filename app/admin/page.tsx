import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { AdminTabs, type AdminTab } from '@/components/admin-tabs';
import { InstitutionsTab } from '@/components/admin/institutions-tab';
import { ResearchersTab } from '@/components/admin/researchers-tab';
import { AdminsTab } from '@/components/admin/admins-tab';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default async function AdminPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin');

  if (!user.isSuperAdmin && user.adminOfInstitutions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Acceso restringido
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Esta sección es para administradores. Si crees que deberías tener
          acceso, contacta al super administrador de Red EPA.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Volver al directorio
        </Link>
      </div>
    );
  }

  const sp = await searchParams;
  const rawTab = pickString(sp.tab);
  const tab: AdminTab =
    rawTab === 'investigadores'
      ? 'investigadores'
      : rawTab === 'administradores' && user.isSuperAdmin
        ? 'administradores'
        : 'instituciones';

  // Fetchs ligeros para los contadores de las tabs (siempre se hacen)
  const supabase = await createSupabaseServerClient();
  const [{ count: instCount }, { count: resCount }] = await Promise.all([
    user.isSuperAdmin
      ? supabase.from('institutions').select('id', { count: 'exact', head: true })
      : supabase
          .from('institutions')
          .select('id', { count: 'exact', head: true })
          .in('id', user.adminOfInstitutions),
    user.isSuperAdmin
      ? supabase.from('researchers').select('id', { count: 'exact', head: true })
      : supabase
          .from('researchers')
          .select('id', { count: 'exact', head: true })
          .in('institution_id', user.adminOfInstitutions),
  ]);

  // Contador de admins (solo super admin lo ve)
  let adminsCount = 0;
  if (user.isSuperAdmin) {
    const { data: supers } = await supabase.rpc('list_super_admins');
    const { count: instAdminsCount } = await supabase
      .from('institution_admins')
      .select('user_id', { count: 'exact', head: true });
    adminsCount =
      ((supers as { user_id: string }[] | null)?.length ?? 0) +
      (instAdminsCount ?? 0);
  }

  const totalInst = instCount ?? 0;
  const totalRes = resCount ?? 0;

  // Filtros por tab
  const instFilters = {
    q: pickString(sp.q).trim(),
    country: pickString(sp.country),
    withResearchers: (['yes', 'no'].includes(pickString(sp.with))
      ? (pickString(sp.with) as 'yes' | 'no')
      : 'all') as 'yes' | 'no' | 'all',
    sort: (pickString(sp.sort) === 'count' ? 'count' : 'name') as
      | 'name'
      | 'count',
    dir: (pickString(sp.dir) === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  };

  const resFilters = {
    rq: pickString(sp.rq).trim(),
    rinst: pickString(sp.rinst),
    rstatus: (['approved', 'pending'].includes(pickString(sp.rstatus))
      ? (pickString(sp.rstatus) as 'approved' | 'pending')
      : 'all') as 'all' | 'approved' | 'pending',
  };

  const adminFilters = {
    aq: pickString(sp.aq).trim(),
    atype: (['super', 'institution'].includes(pickString(sp.atype))
      ? (pickString(sp.atype) as 'super' | 'institution')
      : 'all') as 'all' | 'super' | 'institution',
    ainst: pickString(sp.ainst),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user.isSuperAdmin
            ? `Estás conectado como super administrador.`
            : `Estás conectado como administrador. Gestionas ${totalInst} institución(es).`}
        </p>
      </header>

      <div className="mb-6">
        <AdminTabs
          current={tab}
          counts={{
            instituciones: totalInst,
            investigadores: totalRes,
            administradores: adminsCount,
          }}
          showAdminsTab={user.isSuperAdmin}
        />
      </div>

      {tab === 'instituciones' && (
        <InstitutionsTab user={user} filters={instFilters} />
      )}
      {tab === 'investigadores' && (
        <ResearchersTab user={user} filters={resFilters} />
      )}
      {tab === 'administradores' && user.isSuperAdmin && (
        <AdminsTab currentUserId={user.id} filters={adminFilters} />
      )}
    </div>
  );
}
