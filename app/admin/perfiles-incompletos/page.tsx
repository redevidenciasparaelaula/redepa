import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listIncompleteProfiles } from '@/lib/queries';
import { IncompleteProfilesTable } from '@/components/admin/incomplete-profiles-table';
import { MISSING_LABELS } from '@/lib/profile-completeness';

export default async function IncompleteProfilesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/perfiles-incompletos');
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden ver esta vista.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const rows = await listIncompleteProfiles();

  // Conteo por categoría faltante
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    for (const m of r.completeness.missing) {
      byCategory[m] = (byCategory[m] ?? 0) + 1;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-[var(--muted)] hover:underline">
          ← Volver al panel
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Calidad del directorio</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Perfiles incompletos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Investigadores aprobados que tienen al menos una categoría sin
          completar. Selecciona quiénes y envíales un recordatorio por email
          explicando qué les falta y por qué conviene completarlo.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total incompletos" value={rows.length} highlight />
        {(['basics', 'education', 'visibility', 'searchable'] as const).map((c) => (
          <Stat key={c} label={MISSING_LABELS[c]} value={byCategory[c] ?? 0} />
        ))}
      </section>

      <IncompleteProfilesTable rows={rows} />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (highlight
          ? 'border-[var(--epa-blue)] bg-[var(--card)]'
          : 'border-[var(--border)] bg-[var(--card)]')
      }
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
