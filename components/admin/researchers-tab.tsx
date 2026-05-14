import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stripAccents } from '@/lib/text';
import {
  listAllResearchers,
  listResearchersByInstitutions,
} from '@/lib/queries';
import type { Institution, ResearcherWithInstitution } from '@/lib/supabase/types';
import { DeleteResearcherButton } from '@/components/delete-researcher-button';
import { DownloadTemplateButton } from '@/components/download-template-button';
import { ResetPasswordButton } from '@/components/reset-password-button';
import { ResearcherFilters } from '@/components/admin/researcher-filters';

interface User {
  id: string;
  isSuperAdmin: boolean;
  adminOfInstitutions: string[];
}

interface Props {
  user: User;
  filters: {
    rq: string;
    rinst: string;
  };
}

export async function ResearchersTab({ user, filters }: Props) {
  const supabase = await createSupabaseServerClient();
  let researchers: ResearcherWithInstitution[] = [];
  let institutionsForFilter: Institution[] = [];

  if (user.isSuperAdmin) {
    researchers = await listAllResearchers();
    const { data: instData } = await supabase
      .from('institutions')
      .select('*')
      .order('name', { ascending: true });
    institutionsForFilter = instData ?? [];
  } else {
    researchers = await listResearchersByInstitutions(user.adminOfInstitutions);
    const { data: instData } = await supabase
      .from('institutions')
      .select('*')
      .in('id', user.adminOfInstitutions)
      .order('name', { ascending: true });
    institutionsForFilter = instData ?? [];
  }

  const needle = stripAccents(filters.rq);
  const filtered = researchers.filter((r) => {
    if (needle) {
      const hay =
        stripAccents(r.full_name) + ' ' + stripAccents(r.email);
      if (!hay.includes(needle)) return false;
    }
    if (filters.rinst && r.institution_id !== filters.rinst) return false;
    return true;
  });

  const hasFilters = !!(filters.rq || filters.rinst);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/researchers/new"
          className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
        >
          + Agregar un investigador
        </Link>
        <Link
          href="/admin/researchers/bulk"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
        >
          ↥ Carga masiva (Excel)
        </Link>
        <DownloadTemplateButton>
          ↓ Descargar plantilla Excel
        </DownloadTemplateButton>
      </div>

      <ResearcherFilters
        institutions={institutionsForFilter.map((i) => ({
          id: i.id,
          name: i.name,
        }))}
        initial={filters}
      />

      {hasFilters && (
        <p className="mb-4 text-xs text-[var(--muted)]">
          Mostrando {filtered.length} de {researchers.length} investigadores.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          {hasFilters
            ? 'Sin investigadores que coincidan con esos filtros.'
            : 'Aún no hay investigadores en el directorio.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Institución</Th>
                <Th>Correo</Th>
                <Th>País</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
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
                    {r.title_es && (
                      <div className="mt-0.5 text-xs text-[var(--muted)]">
                        {r.title_es}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-[var(--muted)]">
                    {r.institutions?.name ?? '—'}
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
                    {r.country ?? '—'}
                    {r.city && (
                      <div className="text-xs">{r.city}</div>
                    )}
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
    </>
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
