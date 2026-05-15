'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitReviewAction,
  declineAssignmentAction,
} from '@/app/me/revisiones/actions';
import type { ExistingReviewValues } from '@/lib/queries';

interface Props {
  assignmentId: string;
  existing: ExistingReviewValues | null;
}

const SCORE_FIELDS: {
  name: 'score_originality' | 'score_methodology' | 'score_clarity' | 'score_impact';
  label: string;
  hint: string;
}[] = [
  {
    name: 'score_originality',
    label: 'Originalidad',
    hint: '¿La pregunta o el enfoque aportan algo nuevo?',
  },
  {
    name: 'score_methodology',
    label: 'Metodología',
    hint: '¿La metodología es apropiada para la pregunta y está bien justificada?',
  },
  {
    name: 'score_clarity',
    label: 'Claridad',
    hint: '¿Está escrito de forma comprensible y bien estructurada?',
  },
  {
    name: 'score_impact',
    label: 'Aporte / impacto',
    hint: '¿Qué tan relevante es para la enseñanza y la práctica docente en Latam?',
  },
];

const RECO_OPTIONS = [
  { value: 'accept', label: 'Aceptar' },
  { value: 'minor_revision', label: 'Aceptar con revisión menor' },
  { value: 'major_revision', label: 'Pedir revisión mayor' },
  { value: 'reject', label: 'Rechazar' },
];

export function ReviewForm({ assignmentId, existing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await submitReviewAction(assignmentId, fd);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Revisión entregada. ¡Gracias!');
        router.refresh();
      }
    });
  }

  function onDecline() {
    if (
      !confirm(
        'Si declinas, el comité tendrá que asignar a otra persona. ¿Confirmar?'
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await declineAssignmentAction(assignmentId);
      if (!res.ok) setError(res.error);
      else router.push('/me/revisiones');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Tus notas</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Escala de 1 (deficiente) a 5 (excelente).
        </p>
        <div className="mt-5 space-y-4">
          {SCORE_FIELDS.map((f) => (
            <ScoreRow
              key={f.name}
              name={f.name}
              label={f.label}
              hint={f.hint}
              defaultValue={existing?.[f.name]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Recomendación</h2>
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Recomendación</legend>
          {RECO_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-white p-3 hover:bg-[var(--accent)]"
            >
              <input
                type="radio"
                name="recommendation"
                value={o.value}
                defaultChecked={existing?.recommendation === o.value}
                required
                className="mt-0.5"
              />
              <span className="text-sm font-medium">{o.label}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Comentarios</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">
              Para la autora / autor
            </span>
            <span className="block text-xs text-[var(--muted)]">
              Lo verá quien postuló una vez que el comité emita la decisión.
              Sé constructivo/a y específico/a.
            </span>
            <textarea
              name="comments_to_author"
              rows={6}
              maxLength={4000}
              defaultValue={existing?.comments_to_author ?? ''}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">
              Para el comité (confidencial)
            </span>
            <span className="block text-xs text-[var(--muted)]">
              Solo lo ve el comité. Útil para señalar conflictos de interés,
              preocupaciones específicas, recomendación matizada, etc.
            </span>
            <textarea
              name="comments_to_chair"
              rows={4}
              maxLength={4000}
              defaultValue={existing?.comments_to_chair ?? ''}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-white px-4 py-3 sm:mx-0 sm:rounded-md sm:border">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          {isPending
            ? 'Enviando…'
            : existing
              ? 'Actualizar revisión'
              : 'Enviar revisión'}
        </button>
        {!existing && (
          <button
            type="button"
            onClick={onDecline}
            disabled={isPending}
            className="rounded-md border border-[var(--border)] bg-white px-5 py-2 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
          >
            Declinar asignación
          </button>
        )}
        {okMsg && (
          <span className="text-sm text-[var(--epa-green-dark)]">{okMsg}</span>
        )}
        {error && (
          <span className="text-sm text-red-600" role="alert">
            {error}
          </span>
        )}
        {existing && (
          <span className="ml-auto text-xs text-[var(--muted)]">
            Entregada el{' '}
            {new Date(existing.submitted_at).toLocaleString('es')}. Puedes
            actualizarla mientras el comité no haya emitido decisión.
          </span>
        )}
      </div>
    </form>
  );
}

function ScoreRow({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  hint: string;
  defaultValue?: number;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-3">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-[var(--muted)]">{hint}</p>
      <fieldset className="mt-3 flex flex-wrap gap-2">
        <legend className="sr-only">{label}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--accent)] has-[:checked]:border-[var(--epa-blue)] has-[:checked]:bg-[var(--epa-blue)] has-[:checked]:text-white"
          >
            <input
              type="radio"
              name={name}
              value={n}
              defaultChecked={defaultValue === n}
              required
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';
