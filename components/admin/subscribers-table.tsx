import type { CongressSubscriberRow } from '@/lib/queries';

interface Props {
  rows: CongressSubscriberRow[];
}

export function SubscribersTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        Todavía no hay suscriptores. Cuando alguien deje su email en{' '}
        <code className="rounded bg-[var(--accent)] px-1 py-0.5">/congreso/2027</code>{' '}
        aparecerá acá.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-left">
          <tr>
            <Th>Email</Th>
            <Th>Nombre</Th>
            <Th>Fecha</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-[var(--border)] hover:bg-[var(--surface)]"
            >
              <td className="px-4 py-2 font-medium text-[var(--foreground)]">
                <a
                  href={`mailto:${r.email}`}
                  className="hover:underline"
                >
                  {r.email}
                </a>
              </td>
              <td className="px-4 py-2 text-[var(--muted)]">
                {r.name ?? '—'}
              </td>
              <td className="px-4 py-2 text-[var(--muted)]">
                {formatDate(r.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </th>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
