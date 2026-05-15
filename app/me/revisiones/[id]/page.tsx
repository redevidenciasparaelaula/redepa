import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getSubmissionForReviewer,
  getMyExistingReview,
} from '@/lib/queries';
import { methodologyLabel } from '@/lib/methodologies';
import { ReviewForm } from '@/components/review-form';
import { markAssignmentInProgressAction } from '../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewAssignmentPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/me/revisiones/${id}`);

  const supabase = await createSupabaseServerClient();
  // Cargamos el assignment (RLS deja leer solo si es del usuario o super-admin)
  const { data: a } = await supabase
    .from('review_assignments')
    .select('id, submission_id, reviewer_user_id, status, deadline_at')
    .eq('id', id)
    .maybeSingle();
  if (!a) notFound();

  if (a.reviewer_user_id !== user.id && !user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Esta asignación no te pertenece.
        </p>
        <Link
          href="/me/revisiones"
          className="mt-4 inline-block text-sm underline"
        >
          ← Mis revisiones
        </Link>
      </div>
    );
  }

  const [submission, existing] = await Promise.all([
    getSubmissionForReviewer(a.submission_id),
    getMyExistingReview(a.id),
  ]);
  if (!submission) notFound();

  // Marca la asignación como 'in_progress' al abrirla por primera vez.
  // Idempotente: no hace nada si ya está submitted o in_progress.
  if (a.reviewer_user_id === user.id && a.status === 'pending') {
    await markAssignmentInProgressAction(a.id);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/me/revisiones"
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Mis revisiones
        </Link>
      </div>

      <header className="mb-6">
        <p className="eyebrow">
          Revisión doble ciega · Congreso EPA {submission.congress_year}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {submission.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {submission.track_name && `${submission.track_name} · `}
          {submission.type === 'oral'
            ? 'Oral'
            : submission.type === 'poster'
              ? 'Póster'
              : 'Simposio'}
          {a.deadline_at &&
            ` · Deadline: ${new Date(a.deadline_at).toLocaleDateString('es')}`}
        </p>
      </header>

      <div className="mb-6 rounded-md border-l-4 border-[var(--epa-blue)] bg-[var(--accent)] p-4 text-sm leading-relaxed">
        <strong>Recordatorio:</strong> la revisión es{' '}
        <strong>doble ciega</strong>. No conoces la identidad de quien escribió
        este abstract. Si por alguna razón infiriste de quién se trata (mismo
        equipo, mismo proyecto, etc.) avisa al comité.
      </div>

      <Section title="Abstract">
        <AbstractField label="Contexto y problema" value={submission.abs_context} />
        <AbstractField label="Marco teórico" value={submission.abs_framework} />
        <AbstractField label="Metodología" value={submission.abs_methods} />
        <AbstractField
          label="Resultados o hallazgos"
          value={submission.abs_results}
        />
        <AbstractField
          label="Discusión / aporte al aula"
          value={submission.abs_discussion}
        />
      </Section>

      <Section title="Palabras clave y metodologías">
        {submission.keywords.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Palabras clave
            </p>
            <div className="flex flex-wrap gap-2">
              {submission.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
        {submission.methodologies.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Metodologías
            </p>
            <div className="flex flex-wrap gap-2">
              {submission.methodologies.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-[var(--border)] px-3 py-1 text-sm"
                >
                  {methodologyLabel(m, 'es')}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <ReviewForm assignmentId={a.id} existing={existing} />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function AbstractField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
        {value || <span className="italic text-[var(--muted)]">vacío</span>}
      </p>
    </div>
  );
}
