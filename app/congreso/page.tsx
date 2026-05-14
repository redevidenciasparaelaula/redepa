import Link from 'next/link';

export default function CongresoPage() {
  const stats = [
    { number: '170', label: 'Ponencias recibidas', detail: '88 aceptadas' },
    {
      number: '72',
      label: 'Pares revisores',
      detail: 'Cada propuesta fue evaluada por al menos 2 evaluadores',
    },
    {
      number: '27',
      label: 'Universidades colaboradoras',
      detail: 'Participantes de 12 países diferentes',
    },
    {
      number: '350',
      label: 'Asistentes',
      detail: 'Docentes, directivos, académicos y estudiantes universitarios',
    },
  ];

  return (
    <div>
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <header className="max-w-3xl">
            <p className="eyebrow">Evento bianual</p>
            <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--epa-green)] sm:text-5xl">
              Congreso EPA
            </h1>
            <p className="mt-6 text-base leading-relaxed text-[var(--foreground)] sm:text-lg">
              El Congreso Evidencias para el Aula (EPA) es el espacio que
              organiza la Red EPA, abierto a investigadores y educadores de
              todo el mundo, para compartir y debatir el rol de la
              investigación educativa en la mejora de los aprendizajes,
              promoviendo el diálogo entre investigación, docencia y política
              educativa.
            </p>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Se realiza en formato bianual, durante los años impares.
            </p>
          </header>
        </div>
      </section>

      {/* Banner Congreso 2027 */}
      <section className="bg-[var(--epa-blue)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow !text-white/70">Próxima edición</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Congreso EPA 2027
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                Construyendo sobre evidencia para la mejora educativa:
                implementación e impacto en contextos latinoamericanos.
              </p>
            </div>
            <Link
              href="/congreso/2027"
              className="shrink-0 rounded-md bg-white px-6 py-3 text-sm font-semibold text-[var(--epa-blue)] shadow-sm transition-shadow hover:shadow-md"
            >
              Ver convocatoria →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 lg:p-12">
            <p className="eyebrow">Última edición</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--epa-green)] sm:text-3xl">
              Versión 2025
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--foreground)]">
              El primer Congreso EPA se realizó el 18 y 19 de noviembre de 2025
              en la Universidad del Desarrollo (Santiago, Chile).
            </p>

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-4xl font-bold tracking-tight text-[var(--epa-blue)] sm:text-5xl">
                    {s.number}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                    {s.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
