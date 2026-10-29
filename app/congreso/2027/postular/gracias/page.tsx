import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function GraciasPage({ searchParams }: Props) {
  const { id } = await searchParams;

  // Cargar la postulación recién enviada + email del autor principal para
  // decidir si mostramos CTA al directorio o aviso de "ya eres parte".
  let primaryEmail: string | null = null;
  let isInDirectory = false;
  if (id) {
    const supabase = await createSupabaseServerClient();
    const { data: author } = await supabase
      .from('submission_authors')
      .select('email')
      .eq('submission_id', id)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (author?.email) {
      primaryEmail = author.email.toLowerCase();
      const { data: existing } = await supabase
        .from('researchers')
        .select('id')
        .eq('email', primaryEmail)
        .maybeSingle();
      isInDirectory = !!existing;
    }
  }
  if (id && primaryEmail === null) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Banner de agradecimiento */}
      <section className="rounded-2xl border-2 border-[var(--epa-green)] bg-white p-6 sm:p-10">
        <p className="eyebrow !text-[var(--epa-green-dark)]">
          ✓ Postulación recibida
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--epa-green-dark)] sm:text-4xl">
          ¡Gracias por postular al Congreso EPA 2027!
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
          Recibimos tu propuesta y a partir de ahora entra a un proceso de{' '}
          <strong>revisión doble ciega</strong> por pares. Te enviamos un
          correo de confirmación con el texto completo de lo que enviaste —
          guárdalo como comprobante.
        </p>

        {/* Aviso explícito: ya no se puede editar */}
        <div className="mt-5 rounded-lg border-l-4 border-[var(--epa-green)] bg-[var(--surface)] p-4 text-sm leading-relaxed">
          <p className="font-semibold text-[var(--foreground)]">
            Esta postulación ya fue enviada y no se puede editar.
          </p>
          <p className="mt-1 text-[var(--muted)]">
            Si detectaste un error importante en el texto, escríbenos lo antes
            posible a{' '}
            <a
              href="mailto:contacto@redepa.net"
              className="text-[var(--epa-blue)] underline hover:no-underline"
            >
              contacto@redepa.net
            </a>
            .
          </p>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
          Si el correo no te llega en los próximos minutos, revisa la carpeta
          de spam.
        </p>

        {id && (
          <p className="mt-6 inline-block rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-[var(--muted)]">
              ID interno:
            </span>{' '}
            <span className="font-mono text-[var(--foreground)]">{id}</span>
          </p>
        )}
      </section>

      {/* Directorio Red EPA — CTA o aviso de que ya es parte */}
      {isInDirectory ? (
        <section className="mt-10 rounded-2xl border border-[var(--epa-blue)] bg-[var(--card)] p-6 sm:p-8">
          <p className="eyebrow !text-[var(--epa-blue)]">Red EPA</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Ya eres parte del directorio
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
            Verificamos tu correo y vimos que tu perfil ya está en el directorio
            de la Red EPA. ¡Gracias por formar parte!
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--epa-blue)] hover:underline"
            >
              Volver al inicio →
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-2xl bg-[var(--surface)] p-6 sm:p-10">
          <p className="eyebrow">Red EPA · Evidencias para el Aula</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            ¿Quieres ser parte de la Red?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
            La Red EPA es una comunidad latinoamericana de investigadoras e
            investigadores que trabajan en educación con evidencia. Sumarte al
            directorio toma 10 minutos y te permite:
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
            <li className="flex gap-2">
              <span className="text-[var(--epa-green)]">✓</span>
              <span>
                <strong>Que otras investigadoras e investigadores te encuentren.</strong>{' '}
                Tu perfil queda visible para el resto de la red con tu
                información de contacto, tus temas de investigación y tus
                metodologías.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--epa-green)]">✓</span>
              <span>
                <strong>Encontrar investigadoras e investigadores con tus mismos intereses.</strong>{' '}
                Puedes buscar a otras personas de la red por tema, metodología,
                país o institución, y acceder a sus datos de contacto para
                armar colaboraciones.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--epa-green)]">✓</span>
              <span>
                <strong>Formar parte de una red activa.</strong> Participas en
                las iniciativas de investigación, docencia e incidencia en
                política pública que impulsa la Red EPA.
              </span>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={
                primaryEmail
                  ? `/submit?email=${encodeURIComponent(primaryEmail)}`
                  : '/submit'
              }
              className="rounded-md bg-[var(--epa-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--epa-blue-dark)]"
            >
              Inscribirme al directorio →
            </Link>
            <Link
              href="/"
              className="text-sm text-[var(--muted)] hover:underline"
            >
              Ahora no, gracias
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
