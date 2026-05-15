import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug, listCongressSubscribers } from '@/lib/queries';
import { SubscribersTable } from '@/components/admin/subscribers-table';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CongressSubscribersPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}/subscribers`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden ver la lista de suscriptores.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  const subs = await listCongressSubscribers(c.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/admin/congresos/${c.slug}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Congreso EPA · {c.year}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Suscriptores pre-CFP
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Personas que dejaron su email para que les avisemos cuando abra la
            convocatoria.
          </p>
        </div>
        {subs.length > 0 && (
          <a
            href={`/admin/congresos/${c.slug}/subscribers/export`}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent)]"
          >
            ↓ Descargar CSV
          </a>
        )}
      </header>

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Total
        </p>
        <p className="mt-1 text-3xl font-bold">{subs.length}</p>
      </section>

      <SubscribersTable rows={subs} />
    </div>
  );
}
