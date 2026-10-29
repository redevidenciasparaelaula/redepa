import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DescargarPostulacionesPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}/postulaciones/descargar`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo super-administradores pueden descargar las postulaciones.
        </p>
      </div>
    );
  }
  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/admin/congresos/${slug}/postulaciones`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver a postulaciones
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Descargar postulaciones
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Descarga offline de todas las postulaciones y sus autores. Útil para
          respaldo, análisis externo o compartir con el comité evaluador.
        </p>
      </header>

      <ul className="space-y-4">
        <ExportCard
          title="Base de postulantes (contactos)"
          description="CSV con una fila por autor: nombre, apellido, email, institución, rol y la postulación a la que pertenece. Útil para armar comunicaciones."
          href={`/admin/congresos/${slug}/postulaciones/descargar/postulantes.csv`}
          filename="postulantes.csv"
        />
        <ExportCard
          title="Base de postulaciones"
          description="CSV con una fila por postulación: todos los campos del abstract, autores concatenados, línea temática, tipo, estado, fechas. Útil para análisis en Excel/R/Python."
          href={`/admin/congresos/${slug}/postulaciones/descargar/postulaciones.csv`}
          filename="postulaciones.csv"
        />
        <ExportCard
          title="Carpeta de postulaciones (ZIP de archivos .txt)"
          description="ZIP con un archivo de texto por postulación. Cada .txt tiene título, autores, línea, abstract completo. Útil para enviar a revisores humanos o imprimir."
          href={`/admin/congresos/${slug}/postulaciones/descargar/postulaciones.zip`}
          filename="postulaciones.zip"
        />
      </ul>
    </div>
  );
}

function ExportCard({
  title,
  description,
  href,
  filename,
}: {
  title: string;
  description: string;
  href: string;
  filename: string;
}) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          <p className="mt-2 text-xs font-mono text-[var(--muted)]">
            {filename}
          </p>
        </div>
        <a
          href={href}
          download
          className="shrink-0 rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-blue-dark)]"
        >
          ↓ Descargar
        </a>
      </div>
    </li>
  );
}
