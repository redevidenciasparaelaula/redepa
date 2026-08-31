import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  getReviewOverviewForCongress,
  getAvailableReviewersNotInPool,
  listInstitutions,
  type PoolMemberOverview,
} from '@/lib/queries';
import {
  ReviewerPoolList,
  AvailableReviewersList,
  ManualAddToPoolForm,
} from '@/components/admin/reviewer-pool-ui';
import { PoolFilters } from '@/components/admin/pool-filters';

// Forzar renderizado dinámico: el pool cambia con cada add/remove y no
// queremos servir versiones cacheadas después de router.refresh().
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

export default async function ReviewerPoolPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}/revisores`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden gestionar el pool de evaluadores.
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
  const filterQ = pickString(sp.q).trim().toLowerCase();
  const filterTrack = pickString(sp.track);
  const filterLoad = pickString(sp.load);
  const filterProgress = pickString(sp.progress);
  const filterActive = pickString(sp.active);

  const [{ poolMembers }, available, institutions] = await Promise.all([
    getReviewOverviewForCongress(c.id),
    getAvailableReviewersNotInPool(c.id),
    listInstitutions(),
  ]);

  const filtered = poolMembers.filter((m) => {
    if (filterQ) {
      const hay =
        m.full_name.toLowerCase().includes(filterQ) ||
        m.email.toLowerCase().includes(filterQ);
      if (!hay) return false;
    }
    if (filterTrack) {
      if (!m.topics.some((t) => t.toLowerCase() === filterTrack.toLowerCase()))
        return false;
    }
    if (filterLoad) {
      const load = m.assignments_count;
      const max = m.max_load;
      if (filterLoad === 'empty' && load !== 0) return false;
      if (filterLoad === 'capacity' && !(load > 0 && load < max)) return false;
      if (filterLoad === 'full' && load !== max) return false;
      if (filterLoad === 'over' && load <= max) return false;
    }
    if (filterProgress) {
      const done = m.reviews_completed;
      const total = m.assignments_count;
      if (filterProgress === 'none' && !(total > 0 && done === 0)) return false;
      if (filterProgress === 'in_progress' && !(total > 0 && done > 0 && done < total)) return false;
      if (filterProgress === 'done' && !(total > 0 && done === total)) return false;
      if (filterProgress === 'overdue') {
        const now = Date.now();
        const hasOverdue = m.assignments.some(
          (a) =>
            !a.review_submitted &&
            a.deadline_at &&
            new Date(a.deadline_at).getTime() < now
        );
        if (!hasOverdue) return false;
      }
    }
    if (filterActive) {
      if (filterActive === 'active' && !m.active) return false;
      if (filterActive === 'inactive' && m.active) return false;
    }
    return true;
  });

  const totals = summarize(poolMembers);

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
          Pool de evaluadores
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Investigadoras e investigadores asignados como revisores para este
          congreso. Quienes marcaron la opción &quot;Disponibilidad para Congresos
          EPA&quot; en su perfil aparecen abajo y pueden ser sumados al pool.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total en pool" value={totals.total} />
        <StatCard label="Activos" value={totals.active} />
        <StatCard label="Con capacidad" value={totals.withCapacity} />
        <StatCard label="Al día" value={totals.upToDate} sublabel="entregaron todo" />
        <StatCard
          label="Con vencidas"
          value={totals.withOverdue}
          sublabel="deadline pasado"
          warning={totals.withOverdue > 0}
        />
      </section>

      <PoolFilters
        tracks={c.tracks}
        initial={{
          q: filterQ,
          track: filterTrack,
          load: filterLoad,
          progress: filterProgress,
          active: filterActive,
        }}
      />

      <p className="mb-3 text-xs text-[var(--muted)]">
        Mostrando <strong>{filtered.length}</strong> de {poolMembers.length} revisores.
      </p>

      {/* Pool actual */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          En el pool ({filtered.length})
        </h2>
        <ReviewerPoolList pool={filtered} congressId={c.id} slug={c.slug} />
      </section>

      {/* Agregar manualmente */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Agregar manualmente</h2>
        <ManualAddToPoolForm
          congressId={c.id}
          institutions={institutions}
          tracks={c.tracks}
        />
      </section>

      {/* Investigadores disponibles, aún no en pool */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Disponibles para revisar ({available.length})
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Marcaron en su perfil que pueden ser revisores. Aún no están en el pool
          del {c.year}.
        </p>
        <AvailableReviewersList candidates={available} congressId={c.id} />
      </section>
    </div>
  );
}

function summarize(pool: PoolMemberOverview[]) {
  const now = Date.now();
  return {
    total: pool.length,
    active: pool.filter((p) => p.active).length,
    withCapacity: pool.filter(
      (p) => p.active && p.assignments_count < p.max_load
    ).length,
    upToDate: pool.filter(
      (p) =>
        p.assignments_count > 0 && p.reviews_completed === p.assignments_count
    ).length,
    withOverdue: pool.filter((p) =>
      p.assignments.some(
        (a) =>
          !a.review_submitted &&
          a.deadline_at &&
          new Date(a.deadline_at).getTime() < now
      )
    ).length,
  };
}

function StatCard({
  label,
  value,
  sublabel,
  warning,
}: {
  label: string;
  value: number;
  sublabel?: string;
  warning?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-4 ' +
        (warning
          ? 'border-yellow-300 bg-yellow-50'
          : 'border-[var(--border)] bg-[var(--card)]')
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={
          'mt-1 text-2xl font-bold ' +
          (warning ? 'text-yellow-800' : 'text-[var(--foreground)]')
        }
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{sublabel}</p>
      )}
    </div>
  );
}
