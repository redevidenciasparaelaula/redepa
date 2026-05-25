import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CongressTrack } from '@/lib/queries';

interface Props {
  congressId: string;
  tracks: CongressTrack[];
}

// Server component que calcula y muestra métricas del estado del CFP.
export async function CongressSubmissionsMetrics({
  congressId,
  tracks,
}: Props) {
  const supabase = await createSupabaseServerClient();

  // Trae las submissions con campos mínimos para calcular agregados
  const { data: subs } = await supabase
    .from('submissions')
    .select('id, status, track_id, decision_at')
    .eq('congress_id', congressId);

  const all = subs ?? [];
  const total = all.length;
  const draft = all.filter((s) => s.status === 'draft').length;
  const submitted = all.filter((s) =>
    ['submitted', 'under_review', 'accepted', 'rejected'].includes(s.status)
  ).length;
  const underReview = all.filter((s) => s.status === 'under_review').length;
  const decided = all.filter((s) => s.decision_at != null).length;
  const accepted = all.filter((s) => s.status === 'accepted').length;
  const rejected = all.filter((s) => s.status === 'rejected').length;

  const submittedPct = submitted > 0
    ? Math.round((underReview / submitted) * 100)
    : 0;
  const decidedPct = submitted > 0
    ? Math.round((decided / submitted) * 100)
    : 0;

  // Distribución por línea temática (solo submitted+ para no contar drafts)
  const trackById = new Map(tracks.map((t) => [t.id, t.name]));
  const counts = new Map<string, number>(); // track name → count
  let noTrack = 0;
  for (const s of all) {
    if (s.status === 'draft') continue;
    if (s.track_id) {
      const name = trackById.get(s.track_id) ?? '(track desconocido)';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    } else {
      noTrack += 1;
    }
  }
  const distribution = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (noTrack > 0) distribution.push(['(sin línea)', noTrack]);

  if (total === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
        Aún no hay postulaciones para este congreso.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={total} />
        <Stat label="Borradores" value={draft} muted />
        <Stat
          label="Enviadas"
          value={submitted}
          sublabel={
            submitted > 0
              ? `${Math.round((submitted / total) * 100)}% del total`
              : undefined
          }
        />
        <Stat
          label="En revisión"
          value={underReview}
          sublabel={
            submitted > 0
              ? `${submittedPct}% de enviadas`
              : undefined
          }
        />
        <Stat
          label="Decididas"
          value={decided}
          sublabel={
            submitted > 0
              ? `${decidedPct}% de enviadas · ${accepted} ✓ · ${rejected} ✗`
              : undefined
          }
        />
      </div>

      {distribution.length > 0 && (
        <div className="rounded-md border border-[var(--border)] bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Distribución por línea temática (excluye borradores)
          </p>
          <ul className="space-y-1.5">
            {distribution.map(([name, count]) => {
              const pct = submitted > 0 ? Math.round((count / submitted) * 100) : 0;
              return (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="shrink-0 text-xs text-[var(--muted)] tabular-nums">
                    {count} ({pct}%)
                  </span>
                  <span
                    className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--accent)]"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full bg-[var(--epa-blue)]"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  muted,
}: {
  label: string;
  value: number;
  sublabel?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={
        'rounded-md border p-3 ' +
        (muted
          ? 'border-[var(--border)] bg-[var(--surface)]'
          : 'border-[var(--border)] bg-white')
      }
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{sublabel}</p>
      )}
    </div>
  );
}
