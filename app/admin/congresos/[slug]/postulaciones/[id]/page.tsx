import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCongressBySlug,
  getSubmission,
  listAssignmentsForSubmission,
  suggestReviewersForSubmission,
  listReviewsForSubmissionChairView,
} from '@/lib/queries';
import { methodologyLabel } from '@/lib/methodologies';
import { ReviewerAssignmentPanel } from '@/components/admin/reviewer-assignment-panel';
import { DecisionPanel } from '@/components/admin/decision-panel';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
};

const TYPE_LABEL: Record<string, string> = {
  oral: 'Oral',
  poster: 'Póster',
  symposium: 'Simposio',
};

export default async function AdminSubmissionDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const user = await getCurrentUser();
  if (!user)
    redirect(`/sign-in?next=/admin/congresos/${slug}/postulaciones/${id}`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden ver el detalle.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const [c, sub] = await Promise.all([
    getCongressBySlug(slug),
    getSubmission(id),
  ]);
  if (!c || !sub) notFound();
  if (sub.congress_id !== c.id) notFound();

  const [assignments, suggestions, reviews] = await Promise.all([
    listAssignmentsForSubmission(sub.id),
    suggestReviewersForSubmission(sub.id, c.id),
    listReviewsForSubmissionChairView(sub.id),
  ]);

  const trackName = c.tracks.find((t) => t.id === sub.track_id)?.name ?? null;

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

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Congreso EPA · {c.year}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {sub.title || 'Sin título'}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {STATUS_LABEL[sub.status]} · {TYPE_LABEL[sub.type]}
            {trackName && ` · ${trackName}`}
            {sub.submitted_at &&
              ` · Enviada el ${formatDate(sub.submitted_at)}`}
          </p>
        </div>
      </header>

      {/* Autoría (visible para chair/super-admin, oculto en RLS para revisores) */}
      <Section title="Autoría">
        <p className="mb-3 text-xs text-[var(--muted)]">
          Esta información NO es visible para los pares revisores (doble ciega).
        </p>
        <ul className="space-y-2">
          {sub.authors.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{a.full_name}</p>
                  {a.is_corresponding && (
                    <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                  {a.is_presenter && (
                    <span className="rounded-full bg-[var(--epa-green)] px-2 py-0.5 text-xs font-medium text-white">
                      Presenta
                    </span>
                  )}
                  {a.user_id === null && (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      Externo
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {a.email}
                  {a.external_institution_name &&
                    ` · ${a.external_institution_name}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Abstract */}
      <Section title="Abstract">
        <dl className="space-y-5">
          <AbstractField label="Contexto y problema" value={sub.abs_context} />
          <AbstractField label="Marco teórico" value={sub.abs_framework} />
          <AbstractField label="Metodología" value={sub.abs_methods} />
          <AbstractField label="Resultados o hallazgos" value={sub.abs_results} />
          <AbstractField
            label="Discusión / aporte al aula"
            value={sub.abs_discussion}
          />
        </dl>
      </Section>

      {/* Tags */}
      <Section title="Palabras clave y metodologías">
        {sub.keywords.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Palabras clave
            </p>
            <div className="flex flex-wrap gap-2">
              {sub.keywords.map((k) => (
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
        {sub.methodologies.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Metodologías
            </p>
            <div className="flex flex-wrap gap-2">
              {sub.methodologies.map((m) => (
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

      {/* Revisión: assignments actuales + sugerencias para asignar */}
      <Section title="Revisores asignados">
        <ReviewerAssignmentPanel
          submissionId={sub.id}
          assignments={assignments}
          suggestions={suggestions}
          submissionStatus={sub.status}
        />
      </Section>

      {/* Decisión del comité: ver reviews + aceptar/rechazar */}
      <Section title="Reviews entregadas y decisión">
        <DecisionPanel
          submissionId={sub.id}
          status={sub.status}
          decisionNote={sub.decision_note}
          reviews={reviews}
        />
      </Section>
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
      {children}
    </section>
  );
}

function AbstractField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
        {value || <span className="italic text-[var(--muted)]">vacío</span>}
      </dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
