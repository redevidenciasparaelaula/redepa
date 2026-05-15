import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  listMyReviewAssignments,
  type MyReviewAssignment,
} from '@/lib/queries';

const STATUS_LABEL: Record<MyReviewAssignment['assignment_status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  submitted: 'Entregada',
  declined: 'Rechazada',
};

const STATUS_COLOR: Record<MyReviewAssignment['assignment_status'], string> = {
  pending: 'bg-[var(--accent)] text-[var(--muted)]',
  in_progress: 'bg-[var(--epa-blue)] text-white',
  submitted: 'bg-[var(--epa-green)] text-white',
  declined: 'bg-red-100 text-red-800',
};

const RECO_LABEL: Record<string, string> = {
  accept: 'Aceptar',
  minor_revision: 'Aceptar con revisión menor',
  major_revision: 'Pedir revisión mayor',
  reject: 'Rechazar',
};

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/me/revisiones');

  const items = await listMyReviewAssignments();

  const pending = items.filter((a) => !a.review_submitted && a.assignment_status !== 'declined');
  const submitted = items.filter((a) => a.review_submitted);
  const declined = items.filter((a) => a.assignment_status === 'declined');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mis revisiones</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Postulaciones que te asignaron como par revisor/a en los Congresos
          EPA. La revisión es doble ciega: no verás los nombres ni las
          instituciones de quienes escribieron el abstract.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          No tienes asignaciones de revisión por ahora. Cuando el comité te
          asigne abstracts, aparecerán acá.
        </div>
      ) : (
        <div className="space-y-10">
          {pending.length > 0 && (
            <Group title={`Por revisar (${pending.length})`}>
              {pending.map((a) => (
                <Row key={a.assignment_id} a={a} />
              ))}
            </Group>
          )}
          {submitted.length > 0 && (
            <Group title={`Entregadas (${submitted.length})`}>
              {submitted.map((a) => (
                <Row key={a.assignment_id} a={a} />
              ))}
            </Group>
          )}
          {declined.length > 0 && (
            <Group title={`Rechazadas (${declined.length})`}>
              {declined.map((a) => (
                <Row key={a.assignment_id} a={a} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );

  function Group({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </h2>
        <ul className="space-y-3">{children}</ul>
      </section>
    );
  }

  function Row({ a }: { a: MyReviewAssignment }) {
    return (
      <li className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {a.congress_name} · {a.congress_year}
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
              {a.submission_title || 'Sin título'}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {a.track_name ? `${a.track_name} · ` : ''}
              {a.submission_type === 'oral'
                ? 'Oral'
                : a.submission_type === 'poster'
                  ? 'Póster'
                  : 'Simposio'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={
                  'rounded-full px-2 py-0.5 text-xs font-medium ' +
                  STATUS_COLOR[a.assignment_status]
                }
              >
                {STATUS_LABEL[a.assignment_status]}
              </span>
              {a.review_submitted && a.recommendation && (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--foreground)]">
                  Recomendaste: {RECO_LABEL[a.recommendation] ?? a.recommendation}
                </span>
              )}
              {a.deadline_at && (
                <span className="text-xs text-[var(--muted)]">
                  Deadline: {formatDate(a.deadline_at)}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/me/revisiones/${a.assignment_id}`}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
          >
            {a.review_submitted ? 'Ver / editar' : 'Revisar →'}
          </Link>
        </div>
      </li>
    );
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
