'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateCongressBasicsAction,
  updateCongressDatesAction,
  updateCongressStatusAction,
  createTrackAction,
  updateTrackAction,
  deleteTrackAction,
  updateCongressSubmissionFormAction,
} from '@/app/admin/congresos/actions';
import type { CongressTrack, CongressWithTracks } from '@/lib/queries';
import {
  DEFAULT_ABSTRACT_FIELDS,
  DEFAULT_SUBMISSION_MAX_CHARS,
} from '@/lib/abstract-fields';

type Status = CongressWithTracks['status'];

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Borrador',
  cfp_open: 'CFP abierto',
  review: 'En revisión',
  program: 'Programa armado',
  live: 'En curso',
  closed: 'Cerrado',
};

const STATUS_DESCRIPTION: Record<Status, string> = {
  draft: 'La página del congreso muestra "CFP próximamente". No se aceptan postulaciones.',
  cfp_open: 'Postulaciones abiertas. Los autores pueden crear y editar abstracts.',
  review: 'CFP cerrado. Los pares revisores trabajan sobre las postulaciones.',
  program: 'Resultados notificados, programa del congreso publicado.',
  live: 'El congreso está ocurriendo.',
  closed: 'El congreso terminó. Solo lectura.',
};

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  draft: ['cfp_open'],
  cfp_open: ['draft', 'review'],
  review: ['cfp_open', 'program'],
  program: ['review', 'live'],
  live: ['program', 'closed'],
  closed: ['live'],
};

// =====================================================================
// CongressStatusControls: muestra el estado actual y los botones para
// avanzar / retroceder a estados adyacentes válidos.
// =====================================================================
export function CongressStatusControls({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const next = ALLOWED_TRANSITIONS[status] ?? [];

  function changeTo(newStatus: Status) {
    if (
      !confirm(
        `Cambiar estado de "${STATUS_LABEL[status]}" a "${STATUS_LABEL[newStatus]}"?`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await updateCongressStatusAction(id, newStatus);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        {STATUS_DESCRIPTION[status]}
      </p>

      {next.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {next.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeTo(s)}
              disabled={isPending}
              className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-50"
            >
              → {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No hay transiciones disponibles desde este estado.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================================
// CongressBasicsForm: nombre + tema + ubicación
// =====================================================================
export function CongressBasicsForm({
  id,
  name,
  theme,
  location,
}: {
  id: string;
  name: string;
  theme: string | null;
  location: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await updateCongressBasicsAction(id, formData);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Guardado.');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nombre del congreso">
        <input
          name="name"
          type="text"
          defaultValue={name}
          required
          className={inputCls}
        />
      </Field>
      <Field label="Tema / lema (opcional)">
        <textarea
          name="theme"
          defaultValue={theme ?? ''}
          rows={3}
          className={inputCls}
        />
      </Field>
      <Field label="Ubicación (opcional)">
        <input
          name="location"
          type="text"
          defaultValue={location ?? ''}
          placeholder="ej. Pontificia Universidad Católica, Santiago, Chile"
          className={inputCls}
        />
      </Field>
      <SubmitRow isPending={isPending} okMsg={okMsg} error={error} />
    </form>
  );
}

// =====================================================================
// CongressDatesForm: todas las fechas del congreso
// =====================================================================
export function CongressDatesForm({
  id,
  start_date,
  end_date,
  cfp_open_at,
  cfp_close_at,
  notification_at,
  registration_open_at,
}: {
  id: string;
  start_date: string;
  end_date: string;
  cfp_open_at: string | null;
  cfp_close_at: string | null;
  notification_at: string | null;
  registration_open_at: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();

  function toDateInput(value: string | null): string {
    if (!value) return '';
    // ISO timestamp o YYYY-MM-DD → siempre YYYY-MM-DD
    return value.slice(0, 10);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await updateCongressDatesAction(id, formData);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Guardado.');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Inicio del congreso">
          <input
            name="start_date"
            type="date"
            defaultValue={toDateInput(start_date)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Cierre del congreso">
          <input
            name="end_date"
            type="date"
            defaultValue={toDateInput(end_date)}
            required
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Apertura del CFP">
          <input
            name="cfp_open_at"
            type="date"
            defaultValue={toDateInput(cfp_open_at)}
            className={inputCls}
          />
        </Field>
        <Field label="Cierre del CFP (deadline)">
          <input
            name="cfp_close_at"
            type="date"
            defaultValue={toDateInput(cfp_close_at)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Notificación de resultados">
          <input
            name="notification_at"
            type="date"
            defaultValue={toDateInput(notification_at)}
            className={inputCls}
          />
        </Field>
        <Field label="Apertura de inscripción">
          <input
            name="registration_open_at"
            type="date"
            defaultValue={toDateInput(registration_open_at)}
            className={inputCls}
          />
        </Field>
      </div>

      <SubmitRow isPending={isPending} okMsg={okMsg} error={error} />
    </form>
  );
}

// =====================================================================
// TrackList + TrackRow + AddTrackForm
// =====================================================================
export function TrackList({ tracks }: { tracks: CongressTrack[] }) {
  if (tracks.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Aún no hay líneas temáticas. Agrega la primera más abajo.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {tracks.map((t) => (
        <TrackRow key={t.id} track={t} />
      ))}
    </ul>
  );
}

function TrackRow({ track }: { track: CongressTrack }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await updateTrackAction(track.id, formData);
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!confirm(`Eliminar la línea temática "${track.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTrackAction(track.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="rounded-md border border-[var(--epa-blue)] bg-white p-4">
        <form onSubmit={onSave} className="space-y-3">
          <Field label="Nombre">
            <input
              name="name"
              type="text"
              defaultValue={track.name}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Descripción">
            <textarea
              name="description"
              defaultValue={track.description ?? ''}
              rows={2}
              className={inputCls}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-[var(--border)] bg-white px-4 py-1.5 text-sm hover:bg-[var(--accent)]"
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--foreground)]">{track.name}</p>
        {track.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{track.description}</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--accent)]"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}

export function AddTrackForm({ congressId }: { congressId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await createTrackAction(congressId, formData);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Línea temática agregada.');
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm font-medium text-[var(--foreground)]">
        Agregar nueva línea temática
      </p>
      <Field label="Nombre">
        <input
          name="name"
          type="text"
          required
          className={inputCls}
          placeholder="ej. Liderazgo educativo"
        />
      </Field>
      <Field label="Descripción (opcional)">
        <textarea
          name="description"
          rows={2}
          className={inputCls}
          placeholder="Breve descripción de la línea temática"
        />
      </Field>
      <SubmitRow
        label="Agregar línea"
        isPending={isPending}
        okMsg={okMsg}
        error={error}
      />
    </form>
  );
}

// =====================================================================
// CongressSubmissionFormSettings: configura el formulario de postulación
// (texto intro, max chars, tipos permitidos, etiquetas custom)
// =====================================================================
export function CongressSubmissionFormSettings({
  id,
  submissionIntro,
  submissionMaxChars,
  submissionTypesAllowed,
  abstractFieldLabels,
}: {
  id: string;
  submissionIntro: string | null;
  submissionMaxChars: number | null;
  submissionTypesAllowed: ('oral' | 'poster' | 'symposium')[];
  abstractFieldLabels: Record<string, string> | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await updateCongressSubmissionFormAction(id, formData);
      if (!res.ok) setError(res.error);
      else {
        setOkMsg('Guardado.');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Texto introductorio del formulario"
        hint="Aparece arriba del form en /congreso/.../postular. Útil para dar instrucciones específicas de esta edición."
      >
        <textarea
          name="submission_intro"
          defaultValue={submissionIntro ?? ''}
          rows={4}
          maxLength={2000}
          placeholder="Ej. Para esta edición pedimos abstracts en español. Recuerda no incluir tu nombre ni el de tu institución dentro del texto."
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Límite por campo del abstract (caracteres)"
          hint="Default: 500. Se aplica como recomendación visible al usuario."
        >
          <input
            type="number"
            name="submission_max_chars"
            min={100}
            max={2000}
            defaultValue={submissionMaxChars ?? DEFAULT_SUBMISSION_MAX_CHARS}
            className={inputCls}
          />
        </Field>
        <Field
          label="Tipos de presentación permitidos"
          hint="Define qué opciones ve el postulante en el dropdown 'Tipo'."
        >
          <div className="mt-2 space-y-1">
            {(['oral', 'poster', 'symposium'] as const).map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name={`type_${t}`}
                  defaultChecked={submissionTypesAllowed.includes(t)}
                  className="h-4 w-4"
                />
                {t === 'oral'
                  ? 'Oral'
                  : t === 'poster'
                    ? 'Póster'
                    : 'Simposio'}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          Etiquetas de los 5 campos del abstract
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Si dejas en blanco, se usa la etiqueta por defecto que aparece como
          placeholder.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEFAULT_ABSTRACT_FIELDS.map((f) => (
            <label key={f.name} className="block">
              <span className="text-xs font-medium text-[var(--foreground)]">
                {f.name}
              </span>
              <input
                type="text"
                name={`label_${f.name}`}
                defaultValue={abstractFieldLabels?.[f.name] ?? ''}
                maxLength={100}
                placeholder={f.label}
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </div>

      <SubmitRow isPending={isPending} okMsg={okMsg} error={error} />
    </form>
  );
}

// =====================================================================
// Helpers compartidos
// =====================================================================
const inputCls =
  'mt-1 block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      {hint && (
        <span className="block text-xs text-[var(--muted)]">{hint}</span>
      )}
      {children}
    </label>
  );
}

function SubmitRow({
  label = 'Guardar cambios',
  isPending,
  okMsg,
  error,
}: {
  label?: string;
  isPending: boolean;
  okMsg: string | null;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
      >
        {isPending ? 'Guardando…' : label}
      </button>
      {okMsg && <span className="text-sm text-[var(--epa-green-dark)]">{okMsg}</span>}
      {error && (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
