import Link from 'next/link';
import type { SubmissionOverview } from '@/lib/queries';

interface Props {
  rows: SubmissionOverview[];
  slug: string;
}

const STATUS_LABEL: Record<SubmissionOverview['status'], string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
};

const STATUS_COLOR: Record<SubmissionOverview['status'], string> = {
  draft: 'bg-[var(--accent)] text-[var(--muted)]',
  submitted: 'bg-[var(--epa-blue)] text-white',
  under_review: 'bg-[var(--epa-blue)] text-white',
  accepted: 'bg-[var(--epa-green)] text-white',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-[var(--accent)] text-[var(--muted)]',
};

const TYPE_LABEL: Record<SubmissionOverview['type'], string> = {
  oral: 'Oral',
  poster: 'Póster',
  symposium: 'Simposio',
};

const REVIEW_STATE_STYLE: Record<
  'submitted' | 'in_progress' | 'pending' | 'declined',
  { bg: string; text: string; icon: string; label: string }
> = {
  submitted: {
    bg: 'bg-[var(--epa-green)]',
    text: 'text-white',
    icon: '✓',
    label: 'entregada',
  },
  in_progress: {
    bg: 'bg-[var(--epa-blue)]',
    text: 'text-white',
    icon: '…',
    label: 'en curso',
  },
  pending: {
    bg: 'bg-[var(--accent)]',
    text: 'text-[var(--foreground)]',
    icon: '⏳',
    label: 'pendiente',
  },
  declined: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '⏸',
    label: 'declinada',
  },
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
            <Th>Línea / Tipo</Th>
            <Th>Estado</Th>
            <Th>Revisores asignados</Th>
            <Th>Progreso</Th>
            <Th>Decisión</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const decisionEmitted = r.decision_at !== null;
            return (
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
                <td className="max-w-[16rem] px-4 py-3 text-[var(--muted)]">
                  <span className="line-clamp-2 text-xs">
                    {r.authors_names || '—'}
                  </span>
                  <span className="mt-0.5 block text-[10px]">
                    {r.authors_count} autor{r.authors_count === 1 ? '' : 'es'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  <div className="text-xs">{r.track_name ?? '—'}</div>
                  <div className="mt-0.5 text-[10px]">{TYPE_LABEL[r.type]}</div>
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
                <td className="max-w-[18rem] px-4 py-3">
                  {r.assignments.length === 0 ? (
                    <span className="text-xs text-[var(--muted)]">Sin asignar</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1">
                      {r.assignments.map((a) => {
                        const style = REVIEW_STATE_STYLE[
                          a.review_submitted
                            ? 'submitted'
                            : a.assignment_status === 'declined'
                              ? 'declined'
                              : a.assignment_status === 'in_progress'
                                ? 'in_progress'
                                : 'pending'
                        ];
                        return (
                          <li
                            key={a.assignment_id}
                            title={`${a.reviewer_email} · ${style.label}`}
                            className={
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ' +
                              style.bg +
                              ' ' +
                              style.text
                            }
                          >
                            <span>{style.icon}</span>
                            <span className="truncate max-w-[9rem]">{a.reviewer_name}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--muted)]">
                  {r.assignments.length > 0
                    ? `${r.reviews_completed} / ${r.assignments.length}`
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {decisionEmitted ? (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 font-medium ' +
                        (r.status === 'accepted'
                          ? 'bg-[var(--epa-green)] text-white'
                          : r.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-[var(--accent)] text-[var(--muted)]')
                      }
                    >
                      {r.status === 'accepted'
                        ? 'Aceptada'
                        : r.status === 'rejected'
                          ? 'Rechazada'
                          : STATUS_LABEL[r.status]}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
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
            );
          })}
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
