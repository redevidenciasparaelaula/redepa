import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  getReviewOverviewForCongress,
  type SubmissionOverview,
} from '@/lib/queries';
import { SubmissionsAdminFilters } from '@/components/admin/submissions-admin-filters';
import { SubmissionsAdminTable } from '@/components/admin/submissions-admin-table';

// Fuerza dinámico: la vista cambia con cada assignment/review y no queremos
// servir versiones cacheadas post-refresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

const COMPLETE_TARGET = 2; // umbral para "asignaciones completas" (paridad con auto-asignar default)

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
  const filterAssignments = pickString(sp.assignments);
  const filterReviews = pickString(sp.reviews);
  const filterReviewer = pickString(sp.reviewer);
  const filterDecision = pickString(sp.decision);

  const { submissions: allRows, poolMembers } = await getReviewOverviewForCongress(c.id);

  const filtered = allRows.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterTrack && r.track_id !== filterTrack) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterQ) {
      const hay =
        r.title.toLowerCase().includes(filterQ) ||
        r.authors_names.toLowerCase().includes(filterQ);
      if (!hay) return false;
    }
    if (filterAssignments) {
      const n = r.assignments.length;
      if (filterAssignments === 'none' && n !== 0) return false;
      if (filterAssignments === 'incomplete' && n >= COMPLETE_TARGET) return false;
      if (filterAssignments === 'complete' && n < COMPLETE_TARGET) return false;
    }
    if (filterReviews) {
      const done = r.reviews_completed;
      const total = r.assignments.length;
      if (filterReviews === 'none' && done !== 0) return false;
      if (filterReviews === 'some' && (done === 0 || done === total || total === 0))
        return false;
      if (filterReviews === 'all' && (total === 0 || done !== total)) return false;
    }
    if (filterReviewer) {
      if (!r.assignments.some((a) => a.reviewer_user_id === filterReviewer))
        return false;
    }
    if (filterDecision) {
      if (filterDecision === 'pending' && r.decision_at !== null) return false;
      if (filterDecision === 'accepted' && r.status !== 'accepted') return false;
      if (filterDecision === 'rejected' && r.status !== 'rejected') return false;
    }
    return true;
  });

  // Conteos agregados sobre TODAS las rows
  const totals = countByStatus(allRows);

  // Reviewers para el dropdown de filtro (solo los que están activos y tienen nombre)
  const reviewerOptions = poolMembers
    .filter((m) => m.active)
    .map((m) => ({ user_id: m.user_id, full_name: m.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/admin/congresos/${c.slug}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Congreso EPA · {c.year}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Postulaciones
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Todas las postulaciones recibidas, incluso borradores. Como
            super-admin / chair tienes acceso a los datos de autoría que están
            ocultos para los revisores.
          </p>
        </div>
        {(totals.submitted > 0 || totals.under_review > 0) && (
          <Link
            href={`/admin/congresos/${c.slug}/postulaciones/auto-asignar`}
            className="shrink-0 rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            🎲 Auto-asignar revisores
          </Link>
        )}
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
        reviewers={reviewerOptions}
        initial={{
          status: filterStatus,
          track: filterTrack,
          type: filterType,
          q: filterQ,
          assignments: filterAssignments,
          reviews: filterReviews,
          reviewer: filterReviewer,
          decision: filterDecision,
        }}
      />

      <p className="mb-3 text-xs text-[var(--muted)]">
        Mostrando <strong>{filtered.length}</strong> de {allRows.length} postulaciones.
      </p>

      <SubmissionsAdminTable rows={filtered} slug={c.slug} />
    </div>
  );
}

function countByStatus(rows: SubmissionOverview[]) {
  return {
    all: rows.length,
    draft: rows.filter((r) => r.status === 'draft').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    under_review: rows.filter((r) => r.status === 'under_review').length,
    accepted: rows.filter((r) => r.status === 'accepted').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    withdrawn: rows.filter((r) => r.status === 'withdrawn').length,
  };
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
