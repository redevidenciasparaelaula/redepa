import Link from 'next/link';
import type { AdminSubmissionRow } from '@/lib/queries';

interface Props {
  rows: AdminSubmissionRow[];
  slug: string;
}

const STATUS_LABEL: Record<AdminSubmissionRow['status'], string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
};

const STATUS_COLOR: Record<AdminSubmissionRow['status'], string> = {
  draft: 'bg-[var(--accent)] text-[var(--muted)]',
  submitted: 'bg-[var(--epa-blue)] text-white',
  under_review: 'bg-[var(--epa-blue)] text-white',
  accepted: 'bg-[var(--epa-green)] text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-[var(--accent)] text-[var(--muted)]',
};

const TYPE_LABEL: Record<AdminSubmissionRow['type'], string> = {
  oral: 'Oral',
  poster: 'Póster',
  symposium: 'Simposio',
};

export function SubmissionsAdminTable({ rows, slug }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        No hay postulaciones con esos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-left">
          <tr>
            <Th>Título</Th>
            <Th>Autoras/es</Th>
            <Th>Línea temática</Th>
            <Th>Tipo</Th>
            <Th>Estado</Th>
            <Th>Revisores</Th>
            <Th>Actualizado</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-[var(--border)] align-top hover:bg-[var(--surface)]"
            >
              <td className="max-w-xs px-4 py-3 font-medium text-[var(--foreground)]">
                <Link
                  href={`/admin/congresos/${slug}/postulaciones/${r.id}`}
                  className="hover:underline"
                >
                  {r.title || 'Sin título'}
                </Link>
              </td>
              <td className="max-w-xs px-4 py-3 text-[var(--muted)]">
                <span className="line-clamp-2">
                  {r.authors_names ?? '—'}
                </span>
                <span className="mt-0.5 block text-xs">
                  {r.authors_count} autor{r.authors_count === 1 ? '' : 'es'}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">
                {r.track_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">
                {TYPE_LABEL[r.type]}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                    STATUS_COLOR[r.status]
                  }
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">
                {r.assignments_count > 0
                  ? `${r.reviews_completed} / ${r.assignments_count}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--muted)]">
                {formatDate(r.updated_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/congresos/${slug}/postulaciones/${r.id}`}
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-1 text-xs hover:bg-[var(--accent)]"
                >
                  Abrir →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </th>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
