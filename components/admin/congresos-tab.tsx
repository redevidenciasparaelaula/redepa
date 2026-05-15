import Link from 'next/link';
import { listCongresses, type CongressSummary } from '@/lib/queries';

const STATUS_LABEL: Record<CongressSummary['status'], string> = {
  draft: 'Borrador',
  cfp_open: 'CFP abierto',
  review: 'En revisión',
  program: 'Programa armado',
  live: 'En curso',
  closed: 'Cerrado',
};

const STATUS_COLOR: Record<CongressSummary['status'], string> = {
  draft: 'bg-[var(--accent)] text-[var(--muted)]',
  cfp_open: 'bg-[var(--epa-green)] text-white',
  review: 'bg-[var(--epa-blue)] text-white',
  program: 'bg-[var(--epa-blue)] text-white',
  live: 'bg-[var(--epa-green-dark)] text-white',
  closed: 'bg-[var(--accent)] text-[var(--muted)]',
};

export async function CongresosTab() {
  const congresses = await listCongresses();

  if (congresses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center">
        <p className="text-sm text-[var(--muted)]">
          Todavía no hay congresos cargados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {congresses.map((c) => (
        <article
          key={c.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {c.name}
                </h3>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    STATUS_COLOR[c.status]
                  }
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              {c.theme && (
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                  {c.theme}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">
                {formatDateRange(c.start_date, c.end_date)}
                {c.cfp_open_at && (
                  <>
                    {' · '}
                    CFP {formatDate(c.cfp_open_at)} → {formatDate(c.cfp_close_at)}
                  </>
                )}
              </p>
            </div>
            <Link
              href={`/admin/congresos/${c.slug}`}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
            >
              Editar
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-3">
            <Stat label="Líneas temáticas" value={c.tracks_count} />
            <Stat label="Postulaciones" value={c.submissions_count} />
            <Stat
              label="Ver pública"
              valueNode={
                <Link
                  href={`/congreso/${c.year}`}
                  className="text-[var(--epa-blue)] underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /congreso/{c.year} →
                </Link>
              }
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: number | string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
        {valueNode ?? value}
      </dd>
    </div>
  );
}

function parseLocalDate(iso: string): Date {
  const [datePart] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = isDateOnly ? parseLocalDate(value) : new Date(value);
  return d.toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
