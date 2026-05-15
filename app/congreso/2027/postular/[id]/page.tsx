import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  getSubmission,
  listReviewsForSubmissionAuthorView,
} from '@/lib/queries';
import { SubmissionEditor } from '@/components/submission-editor';
import { AuthorDecisionView } from '@/components/author-decision-view';

interface Props {
  params: Promise<{ id: string }>;
}

const SLUG = 'epa-2027';
const YEAR = 2027;

export default async function SubmissionEditPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/congreso/${YEAR}/postular/${id}`);

  const submission = await getSubmission(id);
  if (!submission) notFound();

  // Verifica que el usuario es uno de los autores (o super-admin)
  const isAuthor = submission.authors.some((a) => a.user_id === user.id);
  if (!isAuthor && !user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo las autoras o autores de esta postulación pueden editarla.
        </p>
        <Link
          href={`/congreso/${YEAR}/postular`}
          className="mt-4 inline-block text-sm underline"
        >
          ← Volver a mis postulaciones
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(SLUG);
  if (!c) notFound();

  const deadlinePassed =
    !!c.cfp_close_at && new Date(c.cfp_close_at) < new Date();
  const cfpOpen = c.status === 'cfp_open';
  // Solo se puede editar si: CFP abierto + deadline no pasado + status en draft/withdrawn/submitted
  const readOnly =
    !cfpOpen ||
    deadlinePassed ||
    ['accepted', 'rejected', 'under_review'].includes(submission.status);

  // Si el comité ya emitió decisión, traemos las reviews anonimizadas para
  // mostrárselas al autor.
  const decisionEmitted = submission.decision_at !== null;
  const authorReviews = decisionEmitted
    ? await listReviewsForSubmissionAuthorView(submission.id)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/congreso/${YEAR}/postular`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Mis postulaciones
        </Link>
      </div>

      {/* Decisión del comité + reviews anonimizadas (al autor) */}
      {decisionEmitted && (
        <AuthorDecisionView
          status={submission.status}
          decisionAt={submission.decision_at}
          decisionNote={submission.decision_note}
          reviews={authorReviews}
        />
      )}

      {readOnly && !decisionEmitted && (
        <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          Esta postulación es solo de lectura
          {deadlinePassed && ' (el deadline ya pasó)'}
          {!cfpOpen && ' (el CFP no está abierto)'}
          {submission.status === 'under_review' &&
            ' (está siendo revisada por pares)'}
          .
        </div>
      )}

      <SubmissionEditor
        submission={submission}
        tracks={c.tracks}
        readOnly={readOnly}
      />
    </div>
  );
}
