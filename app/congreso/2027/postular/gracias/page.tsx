import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function GraciasPage({ searchParams }: Props) {
  const { id } = await searchParams;

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
          correo de confirmación con el resumen de la postulación — guárdalo
          como comprobante.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Si no te llega en los próximos minutos, revisa la carpeta de spam o
          escríbenos a{' '}
          <a
            href="mailto:contacto@redepa.net"
            className="text-[var(--epa-blue)] underline hover:no-underline"
          >
            contacto@redepa.net
          </a>
          .
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

      {/* CTA Red EPA — explicación + inscripción */}
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
              <strong>Que tus colegas te encuentren.</strong> Tu perfil queda
              visible para el resto de la red con tu información de contacto,
              tus temas de investigación y tus metodologías.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--epa-green)]">✓</span>
            <span>
              <strong>Encontrar colegas con tus mismos intereses.</strong>
              {' '}
              Puedes buscar a otras personas de la red por tema, metodología,
              país o institución, y acceder a sus datos de contacto para
              armar colaboraciones.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--epa-green)]">✓</span>
            <span>
              <strong>Formar parte de una red activa.</strong> Participas en
              las iniciativas de investigación, docencia y vinculación con el
              sistema escolar que impulsa la Red EPA.
            </span>
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/submit"
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
    </div>
  );
}
