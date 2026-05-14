import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stripAccents } from '@/lib/text';
import {
  listAllResearchers,
  listResearchersByInstitutions,
} from '@/lib/queries';
import type { Institution, ResearcherWithInstitution } from '@/lib/supabase/types';
import { AdminInstitutionFilters } from '@/components/admin-institution-filters';
import { DeleteResearcherButton } from '@/components/delete-researcher-button';
import { ResetPasswordButton } from '@/components/reset-password-button';
import { InstitutionDeleteLink } from '@/components/admin/institution-delete-link';

interface User {
  id: string;
  isSuperAdmin: boolean;
  adminOfInstitutions: string[];
}

interface Props {
  user: User;
  filters: {
    q: string;
    country: string;
    withResearchers: 'yes' | 'no' | 'all';
    sort: 'name' | 'count';
    dir: 'asc' | 'desc';
  };
}

export async function InstitutionsTab({ user, filters }: Props) {
  const supabase = await createSupabaseServerClient();
  let allInstitutions: Institution[] = [];
  let researchers: ResearcherWithInstitution[] = [];

  if (user.isSuperAdmin) {
    const { data: instData } = await supabase
      .from('institutions')
      .select('*')
      .order('name', { ascending: true });
    allInstitutions = instData ?? [];
    researchers = await listAllResearchers();
  } else {
    const { data: instData } = await supabase
      .from('institutions')
      .select('*')
      .in('id', user.adminOfInstitutions)
      .order('name', { ascending: true });
    allInstitutions = instData ?? [];
    researchers = await listResearchersByInstitutions(user.adminOfInstitutions);
  }

  const byInstitution = new Map<string, ResearcherWithInstitution[]>();
  for (const inst of allInstitutions) byInstitution.set(inst.id, []);
  const orphans: ResearcherWithInstitution[] = [];
  for (const r of researchers) {
    if (r.institution_id && byInstitution.has(r.institution_id)) {
      byInstitution.get(r.institution_id)!.push(r);
    } else {
      orphans.push(r);
    }
  }

  let institutions = allInstitutions;
  if (user.isSuperAdmin) {
    const needle = stripAccents(filters.q);
    institutions = allInstitutions.filter((inst) => {
      if (needle && !stripAccents(inst.name).includes(needle)) return false;
      if (filters.country && inst.country !== filters.country) return false;
      const count = byInstitution.get(inst.id)?.length ?? 0;
      if (filters.withResearchers === 'yes' && count === 0) return false;
      if (filters.withResearchers === 'no' && count > 0) return false;
      return true;
    });
    institutions = [...institutions].sort((a, b) => {
      let cmp: number;
      if (filters.sort === 'count') {
        const ca = byInstitution.get(a.id)?.length ?? 0;
        const cb = byInstitution.get(b.id)?.length ?? 0;
        cmp = ca - cb;
      } else {
        cmp = a.name.localeCompare(b.name, 'es');
      }
      return filters.dir === 'desc' ? -cmp : cmp;
    });
  }

  const countriesInUse = [...new Set(allInstitutions.map((i) => i.country))].sort(
    (a, b) => a.localeCompare(b, 'es')
  );

  const totalCount = allInstitutions.length;
  const shownCount = institutions.length;

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {user.isSuperAdmin && (
          <>
            <Link
              href="/admin/institutions/new"
              className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
            >
              + Agregar institución
            </Link>
            <Link
              href="/admin/institutions/assign-admin"
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
            >
              + Asignar admin de institución
            </Link>
          </>
        )}
      </div>

      {user.isSuperAdmin && (
        <>
          <AdminInstitutionFilters countries={countriesInUse} initial={filters} />
          {(filters.q ||
            filters.country ||
            filters.withResearchers !== 'all') && (
            <p className="mb-4 text-xs text-[var(--muted)]">
              Mostrando {shownCount} de {totalCount} instituciones.
            </p>
          )}
        </>
      )}

      <div className="space-y-8">
        {institutions.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
            Sin instituciones que coincidan con esos filtros.
          </p>
        ) : (
          institutions.map((inst) => {
            const list = byInstitution.get(inst.id) ?? [];
            return (
              <InstitutionSection
                key={inst.id}
                institution={inst}
                researchers={list}
                canDelete={user.isSuperAdmin}
              />
            );
          })
        )}

        {user.isSuperAdmin &&
          orphans.length > 0 &&
          !filters.q &&
          !filters.country &&
          filters.withResearchers === 'all' && (
            <InstitutionSection
              institution={null}
              researchers={orphans}
              title="Sin institución"
              canDelete={false}
            />
          )}
      </div>
    </>
  );
}

function InstitutionSection({
  institution,
  researchers,
  title,
  canDelete,
}: {
  institution: Institution | null;
  researchers: ResearcherWithInstitution[];
  title?: string;
  canDelete: boolean;
}) {
  const heading = title ?? institution?.name ?? '—';
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
          {institution && (
            <span className="text-xs text-[var(--muted)]">
              {institution.country}
            </span>
          )}
          {institution && (
            <>
              <Link
                href={`/admin/institutions/${institution.id}`}
                className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
              >
                ⚙ gestionar
              </Link>
              <Link
                href={`/admin/researchers/new?institution=${institution.id}`}
                className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
              >
                + agregar uno
              </Link>
              <Link
                href="/admin/researchers/bulk"
                className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
              >
                ↥ carga masiva
              </Link>
              {canDelete && (
                <InstitutionDeleteLink
                  id={institution.id}
                  name={institution.name}
                  researchersCount={researchers.length}
                />
              )}
            </>
          )}
        </div>
        <span className="shrink-0 text-xs text-[var(--muted)]">
          {researchers.length === 1
            ? '1 investigador'
            : `${researchers.length} investigadores`}
        </span>
      </header>

      {researchers.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-4 text-center text-xs text-[var(--muted)]">
          Sin investigadores aún en esta institución.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Cargo o rol</Th>
                <Th>Correo</Th>
                <Th>País / ciudad</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {researchers.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--accent)]"
                >
                  <td className="px-3 py-2 align-top">
                    <Link
                      href={`/researcher/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top text-[var(--muted)]">
                    {r.title_es ?? '—'}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <a
                      href={`mailto:${r.email}`}
                      className="text-[var(--muted)] hover:underline"
                    >
                      {r.email}
                    </a>
                  </td>
                  <td className="px-3 py-2 align-top text-[var(--muted)]">
                    {[r.city, r.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <div className="inline-flex flex-wrap items-start justify-end gap-2">
                      <Link
                        href={`/researcher/${r.id}/edit`}
                        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--accent)]"
                      >
                        Editar
                      </Link>
                      <ResetPasswordButton email={r.email} name={r.full_name} />
                      <DeleteResearcherButton id={r.id} name={r.full_name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={
        'border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] ' +
        (align === 'right' ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  );
}
