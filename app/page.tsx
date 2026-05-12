import Image from 'next/image';
import Link from 'next/link';
import {
  BOARD,
  CONTACT_EMAIL,
  MEMBERS,
  MISSION,
  TAGLINE,
  VISION,
} from '@/lib/site-content';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--epa-green) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--epa-blue) 0%, transparent 50%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div className="flex justify-center lg:justify-start">
              <Image
                src="/logos/epa.png"
                alt="Red EPA — Red Latinoamericana Evidencias Para el Aula"
                width={1024}
                height={711}
                priority
                className="h-auto w-full max-w-sm"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Investigación educativa que{' '}
                <span className="text-[var(--epa-green)]">conecta</span> el aula
                con la evidencia.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
                {TAGLINE}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/directorio"
                  className="rounded-md bg-[var(--epa-green)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--epa-green-dark)] hover:shadow-md"
                >
                  Buscar investigadores →
                </Link>
                <Link
                  href="/sumate"
                  className="rounded-md border border-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                >
                  Sumarme a la Red
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lo que nos mueve */}
      <section className="bg-[var(--epa-blue)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow !text-white/70">Quiénes somos</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Lo que nos mueve
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <article className="rounded-2xl bg-white p-8 text-[var(--foreground)] shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--epa-green)]">
                Visión
              </h3>
              <p className="mt-4 text-base leading-relaxed">{VISION}</p>
            </article>
            <article className="rounded-2xl bg-white p-8 text-[var(--foreground)] shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--epa-green)]">
                Misión
              </h3>
              <p className="mt-4 text-base leading-relaxed">{MISSION}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Miembros de la red */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">Comunidad</p>
            <h2 className="mt-2 text-3xl font-bold uppercase tracking-tight text-[var(--epa-green)] sm:text-4xl">
              Miembros de la red
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {MEMBERS.length} instituciones colaboran activamente desde
              distintos países de América Latina.
            </p>
          </div>
          <ul className="grid grid-cols-2 items-center gap-x-8 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {MEMBERS.map((m) => (
              <li
                key={m.name}
                className="group flex h-24 items-center justify-center"
                title={`${m.name}${m.country ? ' · ' + m.country : ''}`}
              >
                <Image
                  src={m.logo}
                  alt={m.name}
                  width={200}
                  height={80}
                  className="max-h-20 w-auto object-contain grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Directiva */}
      <section className="bg-[var(--epa-green)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow !text-white/70">Quién lidera</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Directiva
            </h2>
          </div>
          <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {BOARD.map((p) => (
              <li key={p.name} className="text-center">
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-full ring-2 ring-white/40">
                  <Image
                    src={p.photo}
                    alt={p.name}
                    width={240}
                    height={240}
                    className="h-full w-full object-cover grayscale"
                  />
                </div>
                <p className="mt-4 text-sm font-semibold leading-tight">
                  {p.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/75">
                  {p.affiliation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer mini con contacto */}
      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <p className="eyebrow">Para instituciones</p>
                <h2 className="mt-2 text-3xl font-bold uppercase tracking-tight text-[var(--epa-green)] sm:text-4xl">
                  Súmate a la red
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
                  ¿Tu institución investiga en educación y quiere colaborar?
                  Escríbenos a{' '}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
              <Link
                href="/sumate"
                className="rounded-md bg-[var(--epa-green)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--epa-green-dark)] hover:shadow-md"
              >
                Conocer requisitos →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
