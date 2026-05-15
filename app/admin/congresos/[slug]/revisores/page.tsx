import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  getReviewerPoolForCongress,
  getAvailableReviewersNotInPool,
} from '@/lib/queries';
import { ReviewerPoolList, AvailableReviewersList } from '@/components/admin/reviewer-pool-ui';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ReviewerPoolPage({ params }: Props) {
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

  const [pool, available] = await Promise.all([
    getReviewerPoolForCongress(c.id),
    getAvailableReviewersNotInPool(c.id),
  ]);

  const activeInPool = pool.filter((p) => p.active).length;
  const totalCapacity = pool
    .filter((p) => p.active)
    .reduce((sum, p) => sum + p.max_load, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
          congreso. Quienes marcaron la opción "Disponibilidad para Congresos
          EPA" en su perfil aparecen abajo y pueden ser sumados al pool.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total en pool" value={pool.length} />
        <StatCard label="Activos" value={activeInPool} />
        <StatCard label="Capacidad total" value={totalCapacity} sublabel="abstracts" />
        <StatCard label="Disponibles" value={available.length} sublabel="aún no en pool" />
      </section>

      {/* Pool actual */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">En el pool ({pool.length})</h2>
        <ReviewerPoolList pool={pool} congressId={c.id} />
      </section>

      {/* Investigadores disponibles, aún no en pool */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Disponibles para revisar ({available.length})
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Marcaron en su perfil que pueden ser revisores. Aún no están en el pool
          del 2027.
        </p>
        <AvailableReviewersList candidates={available} congressId={c.id} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{sublabel}</p>
      )}
    </div>
  );
}
