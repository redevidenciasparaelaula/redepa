export default function PremioPage() {
  return (
    <div>
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <header className="max-w-3xl">
            <p className="eyebrow">Reconocimiento</p>
            <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-[var(--epa-green)] sm:text-5xl">
              Premio EPA
            </h1>
            <p className="mt-6 text-base leading-relaxed text-[var(--foreground)] sm:text-lg">
              El Premio Evidencias para el Aula (EPA) reconoce investigaciones
              y productos que acercan la evidencia a la práctica educativa,
              privilegiando el impacto real en la mejora de la enseñanza y el
              aprendizaje.
            </p>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Se entrega bianualmente en el marco del Congreso EPA, en dos
              categorías.
            </p>
          </header>
        </div>
      </section>

      <section className="bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <article className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4 bg-[var(--epa-green)] px-6 py-5 text-white sm:px-8">
                <span className="text-3xl font-bold leading-none">01</span>
                <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                  Categoría
                </span>
              </div>
              <div className="p-8">
                <h3 className="text-lg font-bold text-[var(--epa-blue)]">
                  Artículo académico destacado
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  Publicado en los dos años anteriores a la convocatoria en una
                  revista indexada con revisión de pares.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4 bg-[var(--epa-green)] px-6 py-5 text-white sm:px-8">
                <span className="text-3xl font-bold leading-none">02</span>
                <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                  Categoría
                </span>
              </div>
              <div className="p-8">
                <h3 className="text-lg font-bold text-[var(--epa-blue)]">
                  Producto educativo innovador
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  Producto con fines educativos disponible públicamente y con
                  uso explícito de evidencia.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Edición 2025</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--epa-green)] sm:text-4xl">
              Ganadores
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-[var(--border)] bg-white p-8 transition-shadow hover:shadow-md">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
                Artículo académico
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
                <span className="font-semibold">Ganadores:</span> Daisy Imbert
                Romero, Cristina Rebollo, Claudia Cabrera Borges, Eduardo
                Elósegui, Julia Torres y Lucía Otero
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">
                  Artículo:
                </span>{' '}
                Formative research in teacher training: A case study carried
                out in Uruguay
              </p>
            </article>

            <article className="rounded-2xl border border-[var(--border)] bg-white p-8 transition-shadow hover:shadow-md">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
                Producto educativo innovador
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
                <span className="font-semibold">Ganador:</span> Fundación
                ProFuturo
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">
                  Producto:
                </span>{' '}
                &ldquo;Matemáticas ProFuturo&rdquo;, plataforma educativa
                digital adaptativa para fortalecer el aprendizaje de
                matemáticas en educación básica.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
