import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCongressBySlug } from '@/lib/queries';

const SLUG = 'epa-2027';

export async function generateMetadata(): Promise<Metadata> {
  const c = await getCongressBySlug(SLUG);
  if (!c) return { title: 'Congreso EPA 2027' };
  return {
    title: c.name,
    description: c.theme ?? undefined,
  };
}

export default async function CongressEpa2027Page() {
  const c = await getCongressBySlug(SLUG);
  if (!c) notFound();

  const cfpOpen = c.status === 'cfp_open';
  const cfpClosedByStatus = ['review', 'program', 'live', 'closed'].includes(
    c.status
  );
  const deadlinePassed =
    !!c.cfp_close_at && new Date(c.cfp_close_at) < new Date();
  const canSubmit = cfpOpen && !deadlinePassed;

  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow">Congreso EPA · {c.year}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--epa-green)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {c.theme ?? c.name}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {formatDateRange(c.start_date, c.end_date)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {canSubmit && (
              <Link
                href={`/congreso/${c.year}/postular`}
                className="rounded-md bg-[var(--epa-green)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--epa-green-dark)] hover:shadow-md"
              >
                Postular un trabajo →
              </Link>
            )}
            {c.status === 'draft' && (
              <span className="inline-flex items-center rounded-md border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--muted)]">
                CFP próximamente
              </span>
            )}
            {cfpClosedByStatus && (
              <span className="inline-flex items-center rounded-md border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--muted)]">
                Plazo de postulación cerrado
              </span>
            )}
            {cfpOpen && deadlinePassed && (
              <span className="inline-flex items-center rounded-md border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--muted)]">
                Deadline pasado
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Fechas clave */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <p className="eyebrow">Calendario</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green)] sm:text-3xl">
              Fechas clave
            </h2>

            <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <DateItem
                label="Apertura del CFP"
                value={formatDate(c.cfp_open_at)}
              />
              <DateItem
                label="Cierre de postulaciones"
                value={formatDate(c.cfp_close_at)}
                highlight
              />
              <DateItem
                label="Notificación de resultados"
                value={formatDate(c.notification_at)}
              />
              <DateItem
                label="Apertura de inscripción"
                value={formatDate(c.registration_open_at)}
              />
              <DateItem
                label="Congreso"
                value={formatDateRange(c.start_date, c.end_date)}
              />
            </dl>
          </div>
        </div>
      </section>

      {/* Líneas temáticas */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Convocatoria</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green)] sm:text-3xl">
              Líneas temáticas
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {c.tracks.length} líneas temáticas para esta edición.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {c.tracks.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-6 transition-shadow hover:shadow-md"
              >
                <h3 className="text-base font-bold leading-snug text-[var(--epa-blue)]">
                  {t.name}
                </h3>
                {t.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
                    {t.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo postular */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <p className="eyebrow">Cómo postular</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green)] sm:text-3xl">
              Proceso de postulación
            </h2>

            <ul className="mt-8 space-y-5">
              {STEPS.map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--epa-blue)] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-base leading-relaxed text-[var(--foreground)]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-xl border-l-4 border-[var(--epa-blue)] bg-[var(--accent)] p-5 text-sm leading-relaxed">
              <p className="font-semibold text-[var(--foreground)]">
                Revisión doble ciega
              </p>
              <p className="mt-1 text-[var(--muted)]">
                Las evaluadoras y evaluadores ven solo el contenido del
                abstract, sin saber quién lo escribió. No menciones tu nombre
                ni tu institución dentro del texto. Los datos de autoría se
                ingresan en una sección separada y no son visibles para los
                pares revisores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final si CFP abierto */}
      {canSubmit && <FinalCta year={c.year} />}
    </div>
  );
}

// =========================================================================
// Subcomponentes
// =========================================================================

function DateItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const isPending = value === 'Por confirmar';
  return (
    <div>
      <dt
        className={
          'text-xs font-semibold uppercase tracking-wider ' +
          (highlight ? 'text-[var(--epa-blue)]' : 'text-[var(--muted)]')
        }
      >
        {label}
      </dt>
      <dd
        className={
          'mt-1 text-base ' +
          (isPending
            ? 'text-[var(--muted)]'
            : highlight
              ? 'font-semibold text-[var(--foreground)]'
              : 'text-[var(--foreground)]')
        }
      >
        {value}
      </dd>
    </div>
  );
}

function FinalCta({ year }: { year: number }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="rounded-2xl bg-[var(--epa-green)] p-6 text-white shadow-sm sm:p-10 lg:p-12">
          <p className="eyebrow !text-white/70">Listo para postular</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Envía tu trabajo
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
            El proceso toma 15–20 minutos. Necesitas tener cuenta en el
            directorio para presentar como autor o autora.
          </p>
          <Link
            href={`/congreso/${year}/postular`}
            className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-[var(--epa-green-dark)] shadow-sm transition-shadow hover:shadow-md"
          >
            Postular un trabajo →
          </Link>
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// Helpers
// =========================================================================

// Parsea 'YYYY-MM-DD' como fecha local (no UTC), para evitar que el
// timezone le reste un día en el browser.
function parseLocalDate(iso: string): Date {
  const [datePart] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(value: string | null): string {
  if (!value) return 'Por confirmar';
  // Soporta tanto fechas (YYYY-MM-DD) como timestamptz.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = isDateOnly ? parseLocalDate(value) : new Date(value);
  return d.toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateRange(start: string, end: string): string {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  const monthFmt = (d: Date) =>
    d.toLocaleDateString('es', { month: 'long' });
  const year = s.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} y ${e.getDate()} de ${monthFmt(s)} de ${year}`;
  }
  if (sameYear) {
    return `${s.getDate()} de ${monthFmt(s)} – ${e.getDate()} de ${monthFmt(e)} de ${year}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

const STEPS: string[] = [
  'Crea tu cuenta en redepa.net si aún no la tienes (o inicia sesión).',
  'Llena el formulario con los 5 campos del abstract: contexto y problema, marco teórico, metodología, resultados o hallazgos, y discusión / aporte al aula. Solo en español, máximo aproximado de 500 caracteres por campo.',
  'Elige la línea temática y la metodología principal de tu trabajo.',
  'Agrega co-autores: los del directorio se autocompletan; los externos solo necesitan nombre, institución y correo.',
  'Importante: no menciones tu nombre ni tu institución dentro del texto del abstract. El proceso es de revisión doble ciega.',
  'Antes del deadline puedes editar tu envío cuantas veces necesites. El plazo es estricto: después del cierre no se aceptan modificaciones ni envíos nuevos.',
];

