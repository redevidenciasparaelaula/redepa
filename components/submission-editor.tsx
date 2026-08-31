'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateSubmissionAction,
  submitSubmissionAction,
  withdrawSubmissionAction,
  deleteSubmissionAction,
} from '@/app/congreso/2027/postular/actions';
import type { CongressTrack, FullSubmission } from '@/lib/queries';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import { SubmissionAuthorsEditor } from './submission-authors-editor';
import {
  DEFAULT_SUBMISSION_MAX_CHARS,
  DEFAULT_SUBMISSION_TYPES_ALLOWED,
  resolveAbstractFields,
} from '@/lib/abstract-fields';

interface Props {
  submission: FullSubmission;
  tracks: CongressTrack[];
  readOnly: boolean;
  // Config del formulario (viene del congreso). Si null → defaults.
  submissionIntro?: string | null;
  submissionMaxChars?: number | null;
  submissionTypesAllowed?: ('oral' | 'poster' | 'symposium')[] | null;
  abstractFieldLabels?: Record<string, string> | null;
}

const ALL_TYPE_OPTIONS: { value: 'oral' | 'poster' | 'symposium'; label: string }[] = [
  { value: 'oral', label: 'Oral' },
  { value: 'poster', label: 'Póster' },
  { value: 'symposium', label: 'Simposio' },
];

export function SubmissionEditor({
  submission,
  tracks,
  readOnly,
  submissionIntro,
  submissionMaxChars,
  submissionTypesAllowed,
  abstractFieldLabels,
}: Props) {
  // Resolver config del congreso con fallback a defaults
  const ABSTRACT_FIELDS = resolveAbstractFields(abstractFieldLabels ?? null);
  const SOFT_LIMIT = submissionMaxChars ?? DEFAULT_SUBMISSION_MAX_CHARS;
  const MAX_ABSTRACT_LEN = Math.max(SOFT_LIMIT + 100, SOFT_LIMIT); // pequeño margen sobre el límite suave
  const allowedTypes =
    submissionTypesAllowed && submissionTypesAllowed.length > 0
      ? submissionTypesAllowed
      : DEFAULT_SUBMISSION_TYPES_ALLOWED;
  const TYPE_OPTIONS = ALL_TYPE_OPTIONS.filter((o) =>
    allowedTypes.includes(o.value)
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();
  const methodologies = methodologiesAlphabetical('es');

  // Estado local solo para el contador de caracteres en vivo.
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      ABSTRACT_FIELDS.map((f) => [
        f.name,
        ((submission[f.name] as string) ?? '').length,
      ])
    )
  );

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await updateSubmissionAction(submission.id, formData);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Guardado.');
        router.refresh();
      }
    });
  }

  function onSubmit() {
    if (
      !confirm(
        'Una vez enviada, tu postulación pasa a revisión. Puedes seguir editándola hasta el deadline. ¿Enviar ahora?'
      )
    )
      return;
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await submitSubmissionAction(submission.id);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Postulación enviada.');
        router.refresh();
      }
    });
  }

  function onWithdraw() {
    if (!confirm('¿Retirar la postulación? Pasa al estado "retirada".'))
      return;
    setError(null);
    startTransition(async () => {
      const res = await withdrawSubmissionAction(submission.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onDelete() {
    if (
      !confirm(
        '¿Eliminar este borrador? Esta acción no se puede deshacer.'
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteSubmissionAction(submission.id);
      if (!res.ok) setError(res.error);
      else router.push('/congreso/2027/postular');
    });
  }

  const status = submission.status;
  const isDraft = status === 'draft';

  return (
    <form onSubmit={onSave} className="space-y-8">
      <header>
        <p className="eyebrow">Postulación · Congreso EPA 2027</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {isDraft ? 'Editar borrador' : 'Postulación'}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Estado actual:{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {status}
          </span>
          . Solo en español. No menciones tu nombre ni tu institución dentro
          del texto: la revisión es doble ciega.
        </p>
      </header>

      {/* Texto introductorio configurable por el chair */}
      {submissionIntro && submissionIntro.trim() && (
        <div className="whitespace-pre-wrap rounded-lg border-l-4 border-[var(--epa-blue)] bg-[var(--accent)] p-4 text-sm leading-relaxed">
          {submissionIntro}
        </div>
      )}

      {/* Datos básicos */}
      <Section title="Datos básicos">
        <Field label="Título" required>
          <input
            type="text"
            name="title"
            defaultValue={submission.title === 'Sin título' ? '' : submission.title}
            required
            maxLength={300}
            disabled={readOnly}
            className={inputCls}
            placeholder="Título descriptivo de tu trabajo"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Línea temática" required>
            <select
              name="track_id"
              defaultValue={submission.track_id ?? ''}
              required
              disabled={readOnly}
              className={inputCls}
            >
              <option value="">Elige una línea…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de presentación">
            <select
              name="type"
              defaultValue={submission.type}
              disabled={readOnly}
              className={inputCls}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Abstract en 5 campos */}
      <Section
        title="Abstract estructurado"
        sub={`Mínimo 50 caracteres por campo. Recomendado: hasta ${SOFT_LIMIT} caracteres.`}
      >
        <div className="space-y-4">
          {ABSTRACT_FIELDS.map((f) => {
            const value = (submission[f.name] as string) ?? '';
            const current = counts[f.name] ?? value.length;
            const over = current > SOFT_LIMIT;
            return (
              <Field
                key={f.name as string}
                label={f.label}
                hint={f.hint}
                required
              >
                <textarea
                  name={f.name as string}
                  defaultValue={value}
                  rows={4}
                  maxLength={MAX_ABSTRACT_LEN}
                  disabled={readOnly}
                  onChange={(e) => {
                    // Leer la longitud SÍNCRONO antes de meterla al updater,
                    // por si el evento sintético se recicla antes de que corra
                    // el setState callback.
                    const len = e.currentTarget.value.length;
                    const key = f.name as string;
                    setCounts((c) => ({ ...c, [key]: len }));
                  }}
                  className={inputCls}
                />
                <p
                  className={
                    'mt-1 text-right text-xs ' +
                    (over
                      ? 'text-[var(--epa-blue)]'
                      : 'text-[var(--muted)]')
                  }
                >
                  {current} / {SOFT_LIMIT}
                  {over && ' (revisa si puedes acortar)'}
                </p>
              </Field>
            );
          })}
        </div>
      </Section>

      {/* Keywords + metodologías */}
      <Section title="Palabras clave y metodologías">
        <Field
          label="Palabras clave"
          hint="Separadas por coma. Mínimo 2, recomendado 5."
          required
        >
          <input
            type="text"
            name="keywords"
            defaultValue={submission.keywords.join(', ')}
            disabled={readOnly}
            className={inputCls}
            placeholder="ej. lectura, primaria, retroalimentación formativa"
          />
        </Field>
        <Field
          label="Metodologías principales"
          hint="Selecciona las que mejor describan tu trabajo. Mínimo 1, máximo 3."
          required
        >
          <select
            name="methodologies"
            multiple
            defaultValue={submission.methodologies}
            disabled={readOnly}
            size={6}
            className={inputCls + ' h-auto'}
          >
            {methodologies.map((m) => (
              <option key={m.key} value={m.key}>
                {m.es}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Mantén Cmd / Ctrl presionado para elegir varias.
          </p>
        </Field>
      </Section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-white px-4 py-3 sm:mx-0 sm:rounded-md sm:border">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[var(--epa-green)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {isDraft && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending}
              className="rounded-md border border-[var(--epa-blue)] bg-white px-5 py-2 text-sm font-semibold text-[var(--epa-blue)] hover:bg-[var(--epa-blue)] hover:text-white disabled:opacity-50"
            >
              Enviar postulación →
            </button>
          )}

          {status === 'submitted' && (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={isPending}
              className="rounded-md border border-[var(--border)] px-5 py-2 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
            >
              Retirar
            </button>
          )}

          {isDraft && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="ml-auto rounded-md border border-red-200 px-5 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar borrador
            </button>
          )}

          {okMsg && (
            <span className="text-sm text-[var(--epa-green-dark)]">
              {okMsg}
            </span>
          )}
          {error && (
            <span className="text-sm text-red-600" role="alert">
              {error}
            </span>
          )}
        </div>
      )}

      {/* Autores: editor aparte (no envía al form de arriba) */}
      <Section
        title="Autoras y autores"
        sub="Los datos de autoría se separan del abstract: NUNCA son visibles para los pares revisores (doble ciega)."
      >
        <SubmissionAuthorsEditor
          submissionId={submission.id}
          authors={submission.authors}
          readOnly={readOnly}
        />
      </Section>
    </form>
  );
}

// =====================================================================
// Helpers visuales
// =====================================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)] disabled:bg-[var(--surface)] disabled:text-[var(--muted)]';

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {sub && (
        <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {hint && (
        <span className="block text-xs text-[var(--muted)]">{hint}</span>
      )}
      {children}
    </label>
  );
}
