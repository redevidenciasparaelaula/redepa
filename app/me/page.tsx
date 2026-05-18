import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getResearcher,
  listMyReviewAssignments,
  getCongressBySlug,
  listMySubmissionsForCongress,
} from '@/lib/queries';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { AvailabilityForReviewForm } from '@/components/availability-for-review-form';

export default async function MyAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/me');

  const researcher = user.researcherId
    ? await getResearcher(user.researcherId)
    : null;

  // Conteos del módulo congreso (para el bloque de accesos rápidos)
  const epa2027 = await getCongressBySlug('epa-2027');
  const [myReviews, mySubs] = await Promise.all([
    listMyReviewAssignments(),
    epa2027
      ? listMySubmissionsForCongress(epa2027.id, user.id)
      : Promise.resolve([]),
  ]);
  const pendingReviews = myReviews.filter((r) => !r.review_submitted).length;

  return (
    <div className="bg-[var(--surface)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10">
          <p className="eyebrow">Mi cuenta</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Mi perfil
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Gestiona los datos que aparecen de ti en el directorio y tu acceso
            al sistema.
          </p>
        </header>

        <div className="space-y-6">
          {/* Datos del directorio */}
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
              Mis datos en el directorio
            </h2>
            {researcher ? (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {researcher.full_name}
                  </p>
                  {researcher.title_es && (
                    <p className="text-sm text-[var(--muted)]">
                      {researcher.title_es}
                    </p>
                  )}
                  {researcher.institutions?.name && (
                    <p className="text-sm text-[var(--foreground)]">
                      {researcher.institutions.name}
                    </p>
                  )}
                  <p className="text-sm text-[var(--muted)]">
                    {[researcher.city, researcher.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/researcher/${researcher.id}/edit`}
                    className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
                  >
                    Editar mis datos
                  </Link>
                  <Link
                    href={`/researcher/${researcher.id}`}
                    className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
                  >
                    Ver mi perfil público
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[var(--muted)]">
                  Aún no tienes perfil en el directorio.
                </p>
                <Link
                  href="/submit"
                  className="mt-4 inline-block rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)]"
                >
                  Agregarme al directorio →
                </Link>
              </div>
            )}
          </section>

          {/* Mi red personal: contactos guardados */}
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
              Mi red personal
            </h2>
            <Link
              href="/me/contactos"
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm hover:bg-[var(--accent)]"
            >
              <span className="font-medium">Mis contactos guardados</span>
              <span className="text-[var(--epa-blue)]">→</span>
            </Link>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Guarda investigadoras/es desde el directorio (botón verde{' '}
              <strong>+</strong>) para volver a contactarlos después. Etiquétalos
              por proyecto y agrega notas privadas.
            </p>
          </section>

          {/* Accesos rápidos a Congreso EPA 2027 */}
          {(mySubs.length > 0 || myReviews.length > 0 || (epa2027 && epa2027.status === 'cfp_open')) && (
            <section className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
                Congreso EPA 2027
              </h2>
              <ul className="space-y-3">
                {(epa2027 && epa2027.status === 'cfp_open') && (
                  <li>
                    <Link
                      href="/congreso/2027/postular"
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm hover:bg-[var(--accent)]"
                    >
                      <span>
                        <span className="font-medium">Mis postulaciones</span>
                        <span className="ml-2 text-[var(--muted)]">
                          ({mySubs.length})
                        </span>
                      </span>
                      <span className="text-[var(--epa-blue)]">→</span>
                    </Link>
                  </li>
                )}
                {mySubs.length > 0 && !(epa2027 && epa2027.status === 'cfp_open') && (
                  <li>
                    <Link
                      href="/congreso/2027/postular"
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm hover:bg-[var(--accent)]"
                    >
                      <span>
                        <span className="font-medium">Mis postulaciones</span>
                        <span className="ml-2 text-[var(--muted)]">
                          ({mySubs.length})
                        </span>
                      </span>
                      <span className="text-[var(--epa-blue)]">→</span>
                    </Link>
                  </li>
                )}
                {myReviews.length > 0 && (
                  <li>
                    <Link
                      href="/me/revisiones"
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm hover:bg-[var(--accent)]"
                    >
                      <span>
                        <span className="font-medium">Mis revisiones</span>
                        {pendingReviews > 0 ? (
                          <span className="ml-2 rounded-full bg-[var(--epa-blue)] px-2 py-0.5 text-xs font-medium text-white">
                            {pendingReviews} por entregar
                          </span>
                        ) : (
                          <span className="ml-2 text-[var(--muted)]">
                            ({myReviews.length})
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--epa-blue)]">→</span>
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Disponibilidad para Congresos EPA — solo si tiene perfil */}
          {researcher && (
            <section className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
                Disponibilidad para Congresos EPA
              </h2>
              <p className="mb-5 text-sm leading-relaxed text-[var(--muted)]">
                Los Congresos EPA son nuestros encuentros bianuales de
                investigación educativa. La revisión de los trabajos postulados
                se hace por pares y necesitamos investigadoras e investigadores
                de la red.
              </p>
              <AvailabilityForReviewForm
                initialValue={researcher.available_for_review ?? false}
              />
            </section>
          )}

          {/* Cuenta */}
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-[var(--epa-blue)]">
              Mi cuenta
            </h2>
            <div className="mb-6 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-[var(--muted)]">Correo:</span>
              <span className="font-semibold text-[var(--foreground)]">
                {user.email}
              </span>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-5">
              <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                Cambiar contraseña
              </h3>
              <ResetPasswordForm />
            </div>
          </section>

          {/* Sign out */}
          <section className="text-center">
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
              >
                Cerrar sesión
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
