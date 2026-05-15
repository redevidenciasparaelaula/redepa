'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideSubmissionAction } from '@/app/admin/congresos/[slug]/postulaciones/actions';
import type { ChairReviewView } from '@/lib/queries';

interface Props {
  submissionId: string;
  status: string;
  decisionNote: string | null;
  reviews: ChairReviewView[];
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

export function DecisionPanel({
  submissionId,
  status,
  decisionNote,
  reviews,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(decisionNote ?? '');
  const router = useRouter();

  const completed = reviews.length;

  // Promedios + distribución de recomendaciones
  const avg = completed === 0
    ? null
    : {
        originality: mean(reviews.map((r) => r.score_originality)),
        methodology: mean(reviews.map((r) => r.score_methodology)),
        clarity: mean(reviews.map((r) => r.score_clarity)),
        impact: mean(reviews.map((r) => r.score_impact)),
        overall: mean(
          reviews.flatMap((r) => [
            r.score_originality,
            r.score_methodology,
            r.score_clarity,
            r.score_impact,
          ])
        ),
      };

  const recoDistribution = reviews.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.recommendation] = (acc[r.recommendation] ?? 0) + 1;
      return acc;
    },
    {}
  );

  function emit(decision: 'accepted' | 'rejected' | 'revert') {
    const labels: Record<typeof decision, string> = {
      accepted: 'aceptar',
      rejected: 'rechazar',
      revert: 'revertir la decisión (volver a "En revisión")',
    };
    if (!confirm(`¿Confirmar ${labels[decision]} esta postulación?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await decideSubmissionAction(
        submissionId,
        decision,
        decision === 'revert' ? null : note.trim() || null
      );
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const decided = status === 'accepted' || status === 'rejected';

  return (
    <div className="space-y-6">
      {completed === 0 && (
        <p className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
          Aún no hay reviews entregadas para esta postulación.
        </p>
      )}

      {/* Resumen agregado */}
      {avg && (
        <div className="rounded-md border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Promedios ({completed} review{completed === 1 ? '' : 's'})
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Avg label="Originalidad" value={avg.originality} />
            <Avg label="Metodología" value={avg.methodology} />
            <Avg label="Claridad" value={avg.clarity} />
            <Avg label="Aporte / impacto" value={avg.impact} />
            <Avg label="Global" value={avg.overall} highlight />
          </div>
          {Object.keys(recoDistribution).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
              {Object.entries(recoDistribution).map(([reco, count]) => (
                <span
                  key={reco}
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (RECO_COLOR[reco] ?? 'bg-[var(--accent)] text-[var(--muted)]')
                  }
                >
                  {RECO_LABEL[reco] ?? reco}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews individuales */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Reviews individuales
          </h3>
          {reviews.map((r) => (
            <ReviewCard key={r.assignment_id} r={r} />
          ))}
        </div>
      )}

      {/* Decisión del chair */}
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Decisión del comité
        </h3>

        {decided ? (
          <div className="mt-3">
            <p>
              Estado actual:{' '}
              <span
                className={
                  'inline-block rounded-full px-2 py-0.5 text-sm font-medium ' +
                  (status === 'accepted'
                    ? 'bg-[var(--epa-green)] text-white'
                    : 'bg-red-100 text-red-800')
                }
              >
                {status === 'accepted' ? 'Aceptada' : 'Rechazada'}
              </span>
            </p>
            {decisionNote && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                <span className="font-medium">Nota: </span>
                {decisionNote}
              </p>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => emit('revert')}
                disabled={isPending}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
              >
                Revertir decisión
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-sm font-medium">
                Nota interna (opcional)
              </span>
              <span className="block text-xs text-[var(--muted)]">
                Se guarda con la decisión. Solo el comité la ve.
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                maxLength={2000}
                className="mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => emit('accepted')}
                disabled={isPending}
                className="rounded-md bg-[var(--epa-green)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
              >
                Aceptar postulación
              </button>
              <button
                type="button"
                onClick={() => emit('rejected')}
                disabled={isPending}
                className="rounded-md border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Rechazar postulación
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-[var(--muted)]">
              Recuerda: para emitir decisión el congreso tiene que estar en
              estado "En revisión" o "Programa armado". Ajustá el estado del
              congreso primero si hace falta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ r }: { r: ChairReviewView }) {
  const avgScore =
    (r.score_originality + r.score_methodology + r.score_clarity + r.score_impact) /
    4;
  return (
    <details className="group rounded-md border border-[var(--border)] bg-white p-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{r.reviewer_name}</p>
          <p className="text-xs text-[var(--muted)]">{r.reviewer_email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              'rounded-full px-2 py-0.5 text-xs font-medium ' +
              (RECO_COLOR[r.recommendation] ?? 'bg-[var(--accent)]')
            }
          >
            {RECO_LABEL[r.recommendation] ?? r.recommendation}
          </span>
          <span className="rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
            Promedio: {avgScore.toFixed(2)}
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] text-[var(--epa-blue)] transition-transform group-open:rotate-45"
          >
            +
          </span>
        </div>
      </summary>
      <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-3 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Score label="Originalidad" value={r.score_originality} />
          <Score label="Metodología" value={r.score_methodology} />
          <Score label="Claridad" value={r.score_clarity} />
          <Score label="Aporte / impacto" value={r.score_impact} />
        </div>
        <Block title="Comentarios para la autora / autor" body={r.comments_to_author} />
        <Block
          title="Comentarios para el comité (confidencial)"
          body={r.comments_to_chair}
          confidential
        />
        <p className="text-xs text-[var(--muted)]">
          Entregada el {new Date(r.submitted_at).toLocaleString('es')}
        </p>
      </div>
    </details>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-sm font-semibold">{value} / 5</p>
    </div>
  );
}

function Block({
  title,
  body,
  confidential,
}: {
  title: string;
  body: string;
  confidential?: boolean;
}) {
  return (
    <div
      className={
        'rounded-md border p-3 ' +
        (confidential
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-[var(--border)] bg-[var(--surface)]')
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
        {body || <span className="italic text-[var(--muted)]">vacío</span>}
      </p>
    </div>
  );
}

function Avg({
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
        'rounded-md border p-3 ' +
        (highlight
          ? 'border-[var(--epa-blue)] bg-[var(--card)]'
          : 'border-[var(--border)] bg-white')
      }
    >
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="text-xl font-bold">{value.toFixed(2)}</p>
    </div>
  );
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
