import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug, type CongressWithTracks } from '@/lib/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  CongressBasicsForm,
  CongressDatesForm,
  CongressStatusControls,
  TrackList,
  AddTrackForm,
} from '@/components/admin/congreso-edit-forms';

const STATUS_LABEL: Record<CongressWithTracks['status'], string> = {
  draft: 'Borrador',
  cfp_open: 'CFP abierto',
  review: 'En revisión',
  program: 'Programa armado',
  live: 'En curso',
  closed: 'Cerrado',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminCongresoPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden editar congresos.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  // Conteos para el panel de stats
  const supabase = await createSupabaseServerClient();
  const [{ count: subs }, { count: reviewers }, { count: attendees }] =
    await Promise.all([
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('congress_id', c.id),
      supabase
        .from('reviewer_pool')
        .select('user_id', { count: 'exact', head: true })
        .eq('congress_id', c.id),
      supabase
        .from('attendees')
        .select('id', { count: 'exact', head: true })
        .eq('congress_id', c.id),
    ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/admin?tab=congresos"
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver a Congresos
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{c.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Estado actual:{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {STATUS_LABEL[c.status]}
          </span>
        </p>
      </header>

      {/* Stats rápidas */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Líneas temáticas" value={c.tracks.length} />
        <StatCard label="Postulaciones" value={subs ?? 0} />
        <StatCard label="Pool de revisores" value={reviewers ?? 0} />
        <StatCard label="Asistentes" value={attendees ?? 0} />
      </section>

      {/* Cambio de estado */}
      <Section title="Estado del congreso">
        <CongressStatusControls id={c.id} status={c.status} />
      </Section>

      {/* Datos básicos */}
      <Section title="Datos básicos">
        <CongressBasicsForm id={c.id} name={c.name} theme={c.theme} />
      </Section>

      {/* Fechas */}
      <Section title="Fechas">
        <CongressDatesForm
          id={c.id}
          start_date={c.start_date}
          end_date={c.end_date}
          cfp_open_at={c.cfp_open_at}
          cfp_close_at={c.cfp_close_at}
          notification_at={c.notification_at}
          registration_open_at={c.registration_open_at}
        />
      </Section>

      {/* Líneas temáticas */}
      <Section title="Líneas temáticas">
        <TrackList tracks={c.tracks} />
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <AddTrackForm congressId={c.id} />
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
