import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  listMySubmissionsForCongress,
  type SubmissionListItem,
} from '@/lib/queries';
import { createDraftSubmissionAction } from './actions';

const SLUG = 'epa-2027';

const STATUS_LABEL: Record<SubmissionListItem['status'], string> = {
  draft: 'Borrador',
  submitted: 'Enviado',
  under_review: 'En revisión',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

const STATUS_COLOR: Record<SubmissionListItem['status'], string> = {
  draft: 'bg-[var(--accent)] text-[var(--muted)]',
  submitted: 'bg-[var(--epa-blue)] text-white',
  under_review: 'bg-[var(--epa-blue)] text-white',
  accepted: 'bg-[var(--epa-green)] text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-[var(--accent)] text-[var(--muted)]',
};

const TYPE_LABEL: Record<SubmissionListItem['type'], string> = {
  oral: 'Oral',
  poster: 'Póster',
  symposium: 'Simposio',
};

export default async function PostularPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/congreso/2027/postular');

  const c = await getCongressBySlug(SLUG);
  if (!c) notFound();

  const cfpOpen = c.status === 'cfp_open';
  const deadlinePassed =
    !!c.cfp_close_at && new Date(c.cfp_close_at) < new Date();
  const canCreate = cfpOpen && !deadlinePassed;

  const submissions = await listMySubmissionsForCongress(c.id, user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/congreso/2027"
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Mis postulaciones
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Acá ves los abstracts que estás escribiendo para esta edición. Puedes
          guardar borradores y editarlos hasta el deadline del CFP.
        </p>
      </header>

      {!cfpOpen && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
          {c.status === 'draft' ? (
            <p>
              La convocatoria aún no abre. Te avisaremos cuando esté abierta.
            </p>
          ) : (
            <p>
              El CFP ya no está abierto (estado:{' '}
              <span className="font-semibold">{c.status}</span>). No se pueden
              crear nuevas postulaciones.
            </p>
          )}
        </div>
      )}

      {cfpOpen && deadlinePassed && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          El plazo de postulación ya pasó. No se pueden crear ni modificar
          postulaciones.
        </div>
      )}

      <section className="mb-6">
        {canCreate && (
          <form action={createDraftSubmissionAction}>
            <button
              type="submit"
              className="rounded-md bg-[var(--epa-green)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-green-dark)]"
            >
              + Nueva postulación
            </button>
          </form>
        )}
      </section>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Aún no tienes postulaciones para este congreso.
        </div>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {s.title || 'Sin título'}
                    </h3>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-xs font-medium ' +
                        STATUS_COLOR[s.status]
                      }
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {TYPE_LABEL[s.type]}
                    {s.track_name && ` · ${s.track_name}`}
                    {' · Actualizado '}
                    {formatDate(s.updated_at)}
                  </p>
                </div>
                <Link
                  href={`/congreso/2027/postular/${s.id}`}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
                >
                  {s.status === 'draft' ? 'Continuar editando' : 'Ver / editar'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
