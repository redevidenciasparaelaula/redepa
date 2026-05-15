import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug, listSubmissionsForAdmin } from '@/lib/queries';
import { SubmissionsAdminFilters } from '@/components/admin/submissions-admin-filters';
import { SubmissionsAdminTable } from '@/components/admin/submissions-admin-table';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default async function AdminSubmissionsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}/postulaciones`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden ver las postulaciones del congreso.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  const sp = await searchParams;
  const filterStatus = pickString(sp.status);
  const filterTrack = pickString(sp.track);
  const filterType = pickString(sp.type);
  const filterQ = pickString(sp.q).trim().toLowerCase();

  const allRows = await listSubmissionsForAdmin(c.id);

  const filtered = allRows.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterTrack && r.track_id !== filterTrack) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterQ) {
      const hay =
        r.title.toLowerCase().includes(filterQ) ||
        (r.authors_names ?? '').toLowerCase().includes(filterQ);
      if (!hay) return false;
    }
    return true;
  });

  // Counts agregados sobre TODAS las rows (no las filtradas)
  const totals = {
    all: allRows.length,
    draft: allRows.filter((r) => r.status === 'draft').length,
    submitted: allRows.filter((r) => r.status === 'submitted').length,
    under_review: allRows.filter((r) => r.status === 'under_review').length,
    accepted: allRows.filter((r) => r.status === 'accepted').length,
    rejected: allRows.filter((r) => r.status === 'rejected').length,
    withdrawn: allRows.filter((r) => r.status === 'withdrawn').length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/admin/congresos/${c.slug}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Postulaciones
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Todas las postulaciones recibidas, incluso borradores. Como
          super-admin / chair tienes acceso a los datos de autoría que están
          ocultos para los revisores.
        </p>
      </header>

      {/* Tarjetas con conteos por estado */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={totals.all} highlight />
        <StatCard label="Borrador" value={totals.draft} />
        <StatCard label="Enviadas" value={totals.submitted} />
        <StatCard label="En revisión" value={totals.under_review} />
        <StatCard label="Aceptadas" value={totals.accepted} />
        <StatCard label="Rechazadas" value={totals.rejected} />
        <StatCard label="Retiradas" value={totals.withdrawn} />
      </section>

      <SubmissionsAdminFilters
        tracks={c.tracks}
        initial={{
          status: filterStatus,
          track: filterTrack,
          type: filterType,
          q: filterQ,
        }}
      />

      <SubmissionsAdminTable rows={filtered} slug={c.slug} />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (highlight
          ? 'border-[var(--epa-blue)] bg-[var(--card)]'
          : 'border-[var(--border)] bg-[var(--card)]')
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
