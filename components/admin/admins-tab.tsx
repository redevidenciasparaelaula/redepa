import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stripAccents } from '@/lib/text';
import { listAllInstitutionAdmins } from '@/lib/queries';
import { AdminFilters } from '@/components/admin/admin-filters';
import { RemoveAdminButton } from '@/components/admin/remove-admin-button';

interface SuperAdminRpcRow {
  user_id: string;
  email: string;
  created_at: string;
}

interface Props {
  currentUserId: string;
  filters: {
    aq: string;
    atype: 'all' | 'super' | 'institution';
    ainst: string;
  };
}

interface UnifiedRow {
  user_id: string;
  email: string;
  kind: 'super' | 'institution';
  institution_id?: string;
  institution_name?: string;
  created_at: string;
}

export async function AdminsTab({ currentUserId, filters }: Props) {
  const supabase = await createSupabaseServerClient();

  // 1. Super admins (RPC ya existente)
  const { data: superRows, error: superErr } = await supabase.rpc(
    'list_super_admins'
  );
  if (superErr) console.error('list_super_admins error', superErr);
  const superAdmins: SuperAdminRpcRow[] =
    (superRows as SuperAdminRpcRow[] | null) ?? [];

  // 2. Admins de institución
  const instAdmins = await listAllInstitutionAdmins();

  // 3. Lista de instituciones para el filtro
  const { data: instRows } = await supabase
    .from('institutions')
    .select('id, name')
    .order('name', { ascending: true });
  const institutionsForFilter = (instRows ?? []).map((i) => ({
    id: i.id,
    name: i.name,
  }));

  // 4. Unificar en una sola lista
  const unified: UnifiedRow[] = [
    ...superAdmins.map(
      (s): UnifiedRow => ({
        user_id: s.user_id,
        email: s.email,
        kind: 'super',
        created_at: s.created_at,
      })
    ),
    ...instAdmins.map(
      (a): UnifiedRow => ({
        user_id: a.user_id,
        email: a.email,
        kind: 'institution',
        institution_id: a.institution_id,
        institution_name: a.institution_name,
        created_at: a.created_at,
      })
    ),
  ];

  // 5. Aplicar filtros
  const needle = stripAccents(filters.aq.toLowerCase());
  const filtered = unified.filter((r) => {
    if (needle && !stripAccents(r.email.toLowerCase()).includes(needle))
      return false;
    if (filters.atype !== 'all' && r.kind !== filters.atype) return false;
    if (filters.ainst && r.institution_id !== filters.ainst) return false;
    return true;
  });

  // Orden: super primero, después por email
  filtered.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'super' ? -1 : 1;
    return a.email.localeCompare(b.email);
  });

  const hasFilters = filters.aq || filters.atype !== 'all' || filters.ainst;

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/institutions/assign-admin"
          className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
        >
          + Asignar admin de institución
        </Link>
        <Link
          href="/admin/super-admins"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
        >
          + Agregar super admin
        </Link>
      </div>

      <AdminFilters institutions={institutionsForFilter} initial={filters} />

      {hasFilters && (
        <p className="mb-4 text-xs text-[var(--muted)]">
          Mostrando {filtered.length} de {unified.length} administradores.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          {hasFilters
            ? 'Sin administradores que coincidan con esos filtros.'
            : 'Aún no hay administradores en el sistema.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <Th>Correo</Th>
                <Th>Rol</Th>
                <Th>Institución</Th>
                <Th>Asignado</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={`${r.kind}-${r.user_id}-${r.institution_id ?? ''}`}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--accent)]"
                >
                  <td className="px-3 py-2 align-top font-medium">
                    {r.email}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <RoleBadge kind={r.kind} />
                  </td>
                  <td className="px-3 py-2 align-top text-[var(--muted)]">
                    {r.kind === 'institution' ? r.institution_name : '—'}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-[var(--muted)]">
                    {new Date(r.created_at).toLocaleDateString('es', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    {r.kind === 'super' && r.user_id === currentUserId ? (
                      <span className="text-xs text-[var(--muted)]">tú</span>
                    ) : (
                      <RemoveAdminButton
                        kind={r.kind}
                        userId={r.user_id}
                        email={r.email}
                        institutionId={r.institution_id}
                      />
                    )}
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

function RoleBadge({ kind }: { kind: 'super' | 'institution' }) {
  if (kind === 'super') {
    return (
      <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
        Super admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
      Admin de institución
    </span>
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
