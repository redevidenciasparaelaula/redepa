import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { findDuplicateInstitutionGroups } from '@/lib/queries';
import { DuplicateInstitutionsManager } from '@/components/admin/duplicate-institutions-manager';

export default async function DuplicateInstitutionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/instituciones/duplicadas');
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden fusionar instituciones.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const groups = await findDuplicateInstitutionGroups();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-[var(--muted)] hover:underline">
          ← Volver al panel
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Calidad del directorio</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Instituciones duplicadas
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Grupos de instituciones cuyo nombre normalizado (sin tildes,
          minúsculas, sin puntos) coincide. Suelen ser duplicados creados
          cuando un investigador escribió la institución a mano con variantes
          (ej. "U. de Chile" vs "Universidad de Chile"). Elegí cuál mantener y
          fusioná las demás dentro.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Grupos detectados"
          value={groups.length}
          highlight
        />
        <Stat
          label="Instituciones afectadas"
          value={groups.reduce((s, g) => s + g.institutions.length, 0)}
        />
        <Stat
          label="Researchers afectados"
          value={groups.reduce(
            (s, g) =>
              s + g.institutions.reduce((ss, i) => ss + i.researcher_count, 0),
            0
          )}
        />
      </section>

      <DuplicateInstitutionsManager groups={groups} />
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
