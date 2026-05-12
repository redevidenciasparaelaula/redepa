import { CONTACT_EMAIL } from '@/lib/site-content';

const REQUISITOS = [
  'Ser una institución dedicada a la formación inicial docente y/o a la investigación en educación.',
  'Designar una persona contraparte.',
  'Comprometer 1 hora mensual para reuniones y tareas básicas de coordinación.',
];

export default function SumatePage() {
  return (
    <div>
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <header className="max-w-3xl">
            <p className="eyebrow">Para instituciones</p>
            <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--epa-green)] sm:text-5xl">
              Súmate
            </h1>
            <p className="mt-6 text-base leading-relaxed text-[var(--foreground)] sm:text-lg">
              La adhesión a la Red EPA es una declaración institucional de
              compromiso con el trabajo colaborativo, orientado a iniciativas
              de investigación, docencia, innovación, incidencia en política
              pública y vinculación con el sistema escolar.
            </p>
          </header>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <p className="eyebrow">Adhesión</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green)] sm:text-3xl">
              Requisitos
            </h2>

            <ul className="mt-8 space-y-5">
              {REQUISITOS.map((req, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--epa-blue)] text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-base leading-relaxed text-[var(--foreground)]">
                    {req}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-[var(--epa-green)] p-6 text-white shadow-sm sm:p-10 lg:p-12">
            <p className="eyebrow !text-white/70">Contacto</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Conversemos
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
              Para sumar a tu institución a la Red, escríbenos a{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                {CONTACT_EMAIL}
              </a>
              . Te contactaremos para coordinar los siguientes pasos.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Sumar%20mi%20instituci%C3%B3n%20a%20la%20Red%20EPA`}
              className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-[var(--epa-green-dark)] shadow-sm transition-shadow hover:shadow-md"
            >
              Enviar correo →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
