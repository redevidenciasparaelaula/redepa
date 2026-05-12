import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getResearcher } from '@/lib/queries';
import { ResetPasswordForm } from '@/components/reset-password-form';

export default async function MyAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/me');

  const researcher = user.researcherId
    ? await getResearcher(user.researcherId)
    : null;

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
