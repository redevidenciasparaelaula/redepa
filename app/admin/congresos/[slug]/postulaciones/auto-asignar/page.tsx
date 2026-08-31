import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug, loadAutoAssignData } from '@/lib/queries';
import { computeAutoAssignments } from '@/lib/auto-assign';
import { AutoAssignPreview } from '@/components/admin/auto-assign-preview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ target?: string }>;
}

export default async function AutoAssignPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { target: targetParam } = await searchParams;

  const user = await getCurrentUser();
  if (!user)
    redirect(`/sign-in?next=/admin/congresos/${slug}/postulaciones/auto-asignar`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden auto-asignar revisores.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  const target = clampInt(targetParam, 2, 1, 5);
  const data = await loadAutoAssignData(c.id);
  const summary = computeAutoAssignments({
    pool: data.pool,
    submissions: data.submissions,
    config: { reviewersPerSubmission: target },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/admin/congresos/${slug}/postulaciones`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver a postulaciones
        </Link>
      </div>

      <header className="mb-6">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Auto-asignar revisores
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Propuesta de asignaciones para las postulaciones abiertas (Enviadas /
          En revisión). Se respetan las asignaciones existentes, los conflictos
          de interés (autores) y la capacidad máxima de cada revisor. El
          matching prioriza revisores cuyas <em>líneas temáticas</em> del pool
          coinciden con la línea de la postulación.
        </p>
      </header>

      {/* Selector de target (2 por default) */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="mb-2 text-sm font-medium">
          Revisores por postulación (target):
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <Link
              key={n}
              href={`?target=${n}`}
              className={
                'rounded-md border px-4 py-1.5 text-sm ' +
                (n === target
                  ? 'border-[var(--epa-blue)] bg-[var(--epa-blue)] text-white'
                  : 'border-[var(--border)] bg-white hover:bg-[var(--accent)]')
              }
            >
              {n} revisor{n === 1 ? '' : 'es'}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Cambia el target y la propuesta se recalcula automáticamente.
        </p>
      </section>

      {/* Estado del pool */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Postulaciones abiertas" value={data.submissions.length} />
        <Stat label="Revisores activos" value={data.pool.filter((p) => p.active).length} />
        <Stat label="Propuestas totales" value={summary.assignments.length} />
        <Stat
          label="Con cupos incompletos"
          value={summary.gaps.length}
          warning={summary.gaps.length > 0}
        />
      </section>

      {/* Preview interactivo */}
      <AutoAssignPreview slug={slug} summary={summary} />
    </div>
  );
}

function Stat({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={
          'mt-1 text-2xl font-bold ' +
          (warning ? 'text-yellow-700' : 'text-[var(--foreground)]')
        }
      >
        {value}
      </p>
    </div>
  );
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
