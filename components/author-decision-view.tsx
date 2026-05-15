import type { AuthorReviewView } from '@/lib/queries';

interface Props {
  status: string;
  decisionAt: string | null;
  decisionNote: string | null;
  reviews: AuthorReviewView[];
}

const RECO_LABEL: Record<string, string> = {
  accept: 'Aceptar',
  minor_revision: 'Aceptar con revisión menor',
  major_revision: 'Pedir revisión mayor',
  reject: 'Rechazar',
};

const RECO_COLOR: Record<string, string> = {
  accept: 'bg-[var(--epa-green)] text-white',
  minor_revision: 'bg-[var(--epa-green)] text-white',
  major_revision: 'bg-yellow-100 text-yellow-800',
  reject: 'bg-red-100 text-red-800',
};

export function AuthorDecisionView({
  status,
  decisionAt,
  decisionNote,
  reviews,
}: Props) {
  const accepted = status === 'accepted';
  const verdictLabel = accepted ? 'Aceptada' : 'No aceptada';
  const decided = accepted || status === 'rejected';

  return (
    <section className="mb-8 space-y-6">
      {/* Banner con el resultado */}
      <div
        className={
          'rounded-lg border p-5 sm:p-6 ' +
          (accepted
            ? 'border-[var(--epa-green)] bg-[var(--card)]'
            : 'border-red-200 bg-red-50')
        }
      >
        <p className="eyebrow">Decisión del comité</p>
        <h2
          className={
            'mt-2 text-2xl font-bold tracking-tight ' +
            (accepted ? 'text-[var(--epa-green-dark)]' : 'text-red-800')
          }
        >
          {decided
            ? `Tu postulación fue ${verdictLabel.toLowerCase()}`
            : 'Decisión emitida'}
        </h2>
        {decisionAt && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Decidida el {formatDate(decisionAt)}
          </p>
        )}
        {decisionNote && (
          <div className="mt-4 rounded-md border border-[var(--border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Nota del comité
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {decisionNote}
            </p>
          </div>
        )}
      </div>

      {/* Comentarios de pares revisores (anónimos) */}
      {reviews.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <h3 className="text-lg font-semibold">
            Comentarios de los pares revisores
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Las {reviews.length} personas que evaluaron tu trabajo son anónimas
            (revisión doble ciega). Solo ves los comentarios que escribieron
            para ti, no las conversaciones internas del comité.
          </p>
          <div className="mt-5 space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.position} review={r} />
            ))}
          </div>
        </div>
      )}

      {decided && reviews.length === 0 && (
        <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-5 text-sm text-[var(--muted)]">
          El comité tomó la decisión sin reviews adjuntas. Si tienes preguntas,
          escribe a hola@redepa.net.
        </div>
      )}
    </section>
  );
}

function ReviewCard({ review }: { review: AuthorReviewView }) {
  const avg =
    (review.score_originality +
      review.score_methodology +
      review.score_clarity +
      review.score_impact) /
    4;

  return (
    <article className="rounded-md border border-[var(--border)] bg-white p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          Revisor/a {String.fromCharCode(64 + review.position)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              'rounded-full px-2 py-0.5 text-xs font-medium ' +
              (RECO_COLOR[review.recommendation] ?? 'bg-[var(--accent)]')
            }
          >
            {RECO_LABEL[review.recommendation] ?? review.recommendation}
          </span>
          <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
            Promedio: {avg.toFixed(2)} / 5
          </span>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="Originalidad" value={review.score_originality} />
        <Score label="Metodología" value={review.score_methodology} />
        <Score label="Claridad" value={review.score_clarity} />
        <Score label="Aporte / impacto" value={review.score_impact} />
      </dl>

      <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Comentarios
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
          {review.comments_to_author || (
            <span className="italic text-[var(--muted)]">
              Sin comentarios escritos.
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm font-semibold">{value} / 5</dd>
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
