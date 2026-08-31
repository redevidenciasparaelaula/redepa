'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateSubmissionAction,
  submitSubmissionAction,
  withdrawSubmissionAction,
  deleteSubmissionAction,
  type SubmissionSubmitData,
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
  const [submittedInfo, setSubmittedInfo] = useState<SubmissionSubmitData | null>(
    null
  );
  const router = useRouter();
  const methodologies = methodologiesAlphabetical('es');

  // TODOS los campos del abstract son CONTROLADOS (viven en useState).
  // Motivo: el editor de autores hace router.refresh() al agregar/reordenar,
  // y con defaultValue el texto no guardado se perdería. Con estado local,
  // el usuario nunca pierde lo que está escribiendo.
  const [title, setTitle] = useState<string>(
    submission.title === 'Sin título' ? '' : submission.title
  );
  const [trackId, setTrackId] = useState<string>(submission.track_id ?? '');
  const [subType, setSubType] = useState<'oral' | 'poster' | 'symposium'>(
    submission.type
  );
  const [absContext, setAbsContext] = useState<string>(submission.abs_context);
  const [absFramework, setAbsFramework] = useState<string>(submission.abs_framework);
  const [absMethods, setAbsMethods] = useState<string>(submission.abs_methods);
  const [absResults, setAbsResults] = useState<string>(submission.abs_results);
  const [absDiscussion, setAbsDiscussion] = useState<string>(submission.abs_discussion);
  const [keywordsInput, setKeywordsInput] = useState<string>(
    submission.keywords.join(', ')
  );
  const [selectedMethodologies, setSelectedMethodologies] = useState<string[]>(
    submission.methodologies
  );

  // Índice por nombre para leer el valor actual dentro del render
  const absValues: Record<string, [string, (v: string) => void]> = {
    abs_context: [absContext, setAbsContext],
    abs_framework: [absFramework, setAbsFramework],
    abs_methods: [absMethods, setAbsMethods],
    abs_results: [absResults, setAbsResults],
    abs_discussion: [absDiscussion, setAbsDiscussion],
  };

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setOkMsg(null);
    save();
  }

  // Función pura que arma el FormData desde el estado local y guarda.
  // Se usa desde onSave y también desde SubmissionAuthorsEditor antes de
  // agregar/reordenar autores, para no perder texto no guardado.
  function save(): Promise<{ ok: boolean }> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('track_id', trackId);
      formData.set('type', subType);
      formData.set('abs_context', absContext);
      formData.set('abs_framework', absFramework);
      formData.set('abs_methods', absMethods);
      formData.set('abs_results', absResults);
      formData.set('abs_discussion', absDiscussion);
      formData.set('keywords', keywordsInput);
      for (const m of selectedMethodologies) {
        formData.append('methodologies', m);
      }
      startTransition(async () => {
        const res = await updateSubmissionAction(submission.id, formData);
        if (!res.ok) {
          setError(res.error);
          resolve({ ok: false });
        } else {
          setOkMsg('Guardado.');
          router.refresh();
          resolve({ ok: true });
        }
      });
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
        setSubmittedInfo(res.data);
        router.refresh();
        // Sube al inicio para que el banner sea lo primero que se vea
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
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
      {submittedInfo && (
        <SubmittedBanner
          info={submittedInfo}
          onDismiss={() => setSubmittedInfo(null)}
        />
      )}

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
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
              value={subType}
              onChange={(e) =>
                setSubType(e.target.value as 'oral' | 'poster' | 'symposium')
              }
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
            const [value, setValue] = absValues[f.name as string];
            const current = value.length;
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
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={4}
                  maxLength={MAX_ABSTRACT_LEN}
                  disabled={readOnly}
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
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
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
            value={selectedMethodologies}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
              setSelectedMethodologies(values);
            }}
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

      {/* Autores: editor aparte (no envía al form de arriba) */}
      <Section
        title="Autoras y autores"
        sub="Los datos de autoría se separan del abstract: NUNCA son visibles para los pares revisores (doble ciega). El primer autor aparece como principal."
      >
        <SubmissionAuthorsEditor
          submissionId={submission.id}
          authors={submission.authors}
          readOnly={readOnly}
          onBeforeMutate={save}
        />
      </Section>

      {/* Botones de acción: al final, después de todo */}
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
    </form>
  );
}

// =====================================================================
// Banner de confirmación después de enviar
// =====================================================================
function SubmittedBanner({
  info,
  onDismiss,
}: {
  info: SubmissionSubmitData;
  onDismiss: () => void;
}) {
  const notif = info.notificationDate
    ? new Date(info.notificationDate).toLocaleDateString('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div
      role="status"
      className="rounded-2xl border-2 border-[var(--epa-green)] bg-white p-6 sm:p-8"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-[var(--epa-green-dark)]">
            ✓ Postulación enviada
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green-dark)] sm:text-3xl">
            ¡Gracias por postular al {info.congressName}!
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
            Recibimos tu propuesta y a partir de ahora entra a un proceso de{' '}
            <strong>revisión doble ciega</strong> por pares. Te enviamos un
            correo de confirmación con el resumen de la postulación.
          </p>
          {notif && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
              El comité te avisará por correo la decisión el{' '}
              <strong>{notif}</strong>.
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Mientras la convocatoria siga abierta puedes seguir editando tu
            postulación las veces que necesites.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>
    </div>
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
