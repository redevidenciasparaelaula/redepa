'use client';

// Formulario público de postulación al Congreso EPA 2027.
// Sin cuenta, sin draft, sin edición posterior. Un único submit.
//
// Captura:
// - Autores (nombre, apellido, email, institución, rol)
// - Datos de la propuesta (título, línea, tipo, 5 abstract, keywords, metodologías)
//
// Al enviar, llama a submitPublicSubmissionAction y navega a /gracias.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CongressTrack } from '@/lib/queries';
import type { Methodology } from '@/lib/methodologies';
import {
  DEFAULT_ABSTRACT_FIELDS,
  DEFAULT_SUBMISSION_MAX_CHARS,
} from '@/lib/abstract-fields';
import {
  submitPublicSubmissionAction,
  type PublicAuthorInput,
} from '@/app/congreso/2027/postular/public-actions';

interface Props {
  tracks: CongressTrack[];
  methodologies: Methodology[];
  submissionIntro?: string | null;
  submissionMaxChars?: number | null;
}

const TYPE_OPTIONS: { value: 'oral' | 'poster'; label: string; hint: string }[] = [
  {
    value: 'oral',
    label: 'Ponencia oral',
    hint: 'Exposición en vivo ante un auditorio (~15 min + preguntas).',
  },
  {
    value: 'poster',
    label: 'Póster',
    hint: 'Presentación visual en una sesión de pósters, con conversación cara a cara.',
  },
];

function newEmptyAuthor(first = false): PublicAuthorInput {
  return {
    first_name: '',
    last_name: '',
    email: '',
    institution_name: '',
    is_corresponding: first,
    is_presenter: first,
  };
}

export function PublicSubmissionForm({
  tracks,
  methodologies,
  submissionIntro,
  submissionMaxChars,
}: Props) {
  const SOFT_LIMIT = submissionMaxChars ?? DEFAULT_SUBMISSION_MAX_CHARS;
  const MAX_ABSTRACT_LEN = SOFT_LIMIT + 200;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [authors, setAuthors] = useState<PublicAuthorInput[]>([newEmptyAuthor(true)]);
  const [title, setTitle] = useState('');
  const [trackId, setTrackId] = useState<string>('');
  const [subType, setSubType] = useState<'oral' | 'poster'>('oral');
  const [absContext, setAbsContext] = useState('');
  const [absFramework, setAbsFramework] = useState('');
  const [absMethods, setAbsMethods] = useState('');
  const [absResults, setAbsResults] = useState('');
  const [absDiscussion, setAbsDiscussion] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [selectedMethodologies, setSelectedMethodologies] = useState<string[]>([]);

  const absValues: Record<string, [string, (v: string) => void]> = {
    abs_context: [absContext, setAbsContext],
    abs_framework: [absFramework, setAbsFramework],
    abs_methods: [absMethods, setAbsMethods],
    abs_results: [absResults, setAbsResults],
    abs_discussion: [absDiscussion, setAbsDiscussion],
  };

  function setAuthor(idx: number, patch: Partial<PublicAuthorInput>) {
    setAuthors((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function addAuthor() {
    setAuthors((prev) => [...prev, newEmptyAuthor(false)]);
  }

  function removeAuthor(idx: number) {
    setAuthors((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveAuthor(idx: number, dir: 'up' | 'down') {
    setAuthors((prev) => {
      const to = dir === 'up' ? idx - 1 : idx + 1;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to]!, next[idx]!];
      return next;
    });
  }

  function toggleMethodology(key: string) {
    setSelectedMethodologies((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length >= 3
          ? prev
          : [...prev, key]
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !confirm(
        'Una vez enviada, tu postulación no se podrá editar. ¿Confirmas el envío?'
      )
    )
      return;
    setError(null);

    const keywords = keywordsInput
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      type: subType,
      track_id: trackId,
      abs_context: absContext.trim(),
      abs_framework: absFramework.trim(),
      abs_methods: absMethods.trim(),
      abs_results: absResults.trim(),
      abs_discussion: absDiscussion.trim(),
      keywords,
      methodologies: selectedMethodologies,
      authors,
    };

    startTransition(async () => {
      const res = await submitPublicSubmissionAction(payload);
      if (!res.ok) {
        setError(res.error);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      router.push(`/congreso/2027/postular/gracias?id=${res.submissionId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {submissionIntro && submissionIntro.trim() && (
        <div className="whitespace-pre-wrap rounded-lg border-l-4 border-[var(--epa-blue)] bg-[var(--accent)] p-4 text-sm leading-relaxed">
          {submissionIntro}
        </div>
      )}

      {/* Autoras y autores — primero porque son los datos del postulante */}
      <Section
        title="Autoras y autores"
        sub="Los datos de autoría se separan del abstract: NUNCA son visibles para los pares revisores (doble ciega). El primer autor aparece como principal y recibirá el correo de confirmación."
      >
        <ul className="space-y-4">
          {authors.map((a, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-[var(--border)] bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Autor #{idx + 1}
                  {idx === 0 && ' · principal'}
                </p>
                <div className="flex gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveAuthor(idx, 'up')}
                      aria-label="Subir"
                      className="rounded p-1 text-sm hover:bg-[var(--accent)]"
                    >
                      ↑
                    </button>
                  )}
                  {idx < authors.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveAuthor(idx, 'down')}
                      aria-label="Bajar"
                      className="rounded p-1 text-sm hover:bg-[var(--accent)]"
                    >
                      ↓
                    </button>
                  )}
                  {authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(idx)}
                      aria-label="Eliminar"
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <input
                    type="text"
                    required
                    value={a.first_name}
                    onChange={(e) => setAuthor(idx, { first_name: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Apellido" required>
                  <input
                    type="text"
                    required
                    value={a.last_name}
                    onChange={(e) => setAuthor(idx, { last_name: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={a.email}
                    onChange={(e) => setAuthor(idx, { email: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Institución" required>
                  <input
                    type="text"
                    required
                    value={a.institution_name}
                    onChange={(e) =>
                      setAuthor(idx, { institution_name: e.target.value })
                    }
                    placeholder="Ej. Universidad del Desarrollo"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={a.is_presenter}
                    onChange={(e) =>
                      setAuthor(idx, { is_presenter: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Presenta en el congreso
                </label>
                {idx > 0 && (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={a.is_corresponding}
                      onChange={(e) =>
                        setAuthor(idx, { is_corresponding: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    Es contacto principal
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addAuthor}
          className="mt-4 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent)]"
        >
          + Agregar coautor
        </button>
      </Section>

      {/* Datos básicos */}
      <Section title="Datos básicos de la propuesta">
        <Field label="Título" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={300}
            placeholder="Título descriptivo de tu trabajo"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Línea temática" required>
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              required
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
          <Field label="Tipo de presentación" required>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value as 'oral' | 'poster')}
              className={inputCls}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {TYPE_OPTIONS.find((o) => o.value === subType)?.hint}
            </p>
          </Field>
        </div>
      </Section>

      {/* Abstract */}
      <Section
        title="Abstract estructurado"
        sub={`Mínimo 50 caracteres por campo. Recomendado hasta ${SOFT_LIMIT}. Solo en español. No menciones tu nombre ni tu institución dentro del texto: la revisión es doble ciega.`}
      >
        <div className="space-y-4">
          {DEFAULT_ABSTRACT_FIELDS.map((f) => {
            const [value, setValue] = absValues[f.name];
            const current = value.length;
            const over = current > SOFT_LIMIT;
            return (
              <Field
                key={f.name}
                label={f.label}
                hint={f.hint}
                required
              >
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={4}
                  maxLength={MAX_ABSTRACT_LEN}
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
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="ej. lectura, primaria, retroalimentación formativa"
            className={inputCls}
          />
        </Field>
        <Field
          label="Metodologías principales"
          hint="Marca las que mejor describen tu trabajo. Mínimo 1, máximo 3."
          required
        >
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {methodologies.map((m) => {
              const checked = selectedMethodologies.includes(m.key);
              const disabled =
                !checked && selectedMethodologies.length >= 3;
              return (
                <li key={m.key}>
                  <label
                    className={
                      'flex items-start gap-2 rounded-md border px-3 py-2 text-sm ' +
                      (checked
                        ? 'border-[var(--epa-blue)] bg-[var(--accent)]'
                        : disabled
                          ? 'cursor-not-allowed border-[var(--border)] bg-[var(--surface)] opacity-50'
                          : 'cursor-pointer border-[var(--border)] bg-white hover:bg-[var(--surface)]')
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleMethodology(m.key)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>{m.es}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Field>
      </Section>

      {/* Botón enviar */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-white px-4 py-3 sm:mx-0 sm:rounded-md sm:border">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[var(--epa-green)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
        >
          {isPending ? 'Enviando…' : 'Enviar postulación →'}
        </button>
        <p className="text-xs text-[var(--muted)]">
          Una vez enviada no se puede editar. Revisa bien antes de enviar.
        </p>
        {error && (
          <p className="w-full text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

// =====================================================================
// Helpers visuales
// =====================================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';

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
      {sub && <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p>}
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
