import Image from 'next/image';
import Link from 'next/link';
import { SignInForm } from '@/components/sign-in-form';

interface Props {
  searchParams: Promise<{
    error?: string;
    next?: string;
    detail?: string;
  }>;
}

function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith('/') || next.startsWith('//')) return undefined;
  return next;
}

export default async function SignInPage({ searchParams }: Props) {
  const { error, next, detail } = await searchParams;
  const nextSafe = safeNext(next);
  const detailDecoded = detail ? decodeURIComponent(detail) : undefined;

  return (
    <div className="bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center">
          <Image
            src="/logos/epa.png"
            alt="Red EPA"
            width={1024}
            height={711}
            priority
            className="h-14 w-auto"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="eyebrow">Acceso miembros</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Accede al directorio
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            El directorio de la Red EPA es exclusivo para investigadoras e
            investigadores en educación en Latinoamérica. Inicia sesión para
            colaborar con la comunidad.
          </p>
        </div>

        {error === 'link_invalid' && (
          <div className="mx-auto mt-6 max-w-md rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-900">
            <p className="font-semibold">
              El enlace ya no es válido o expiró.
            </p>
            <p className="mt-1">
              Si fue un link de recuperación de contraseña, solicita uno nuevo
              desde <strong>¿La olvidaste?</strong> Los links son de un solo uso
              y caducan en 1 hora.
            </p>
            {detailDecoded && (
              <p className="mt-2 break-words font-mono text-xs opacity-70">
                debug: {detailDecoded}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Sign in */}
          <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Para investigadoras e investigadores ya inscritos.
            </p>
            <div className="mt-6 flex-1">
              <SignInForm next={nextSafe} />
            </div>
          </div>

          {/* Sign up */}
          <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              ¿Aún no eres parte de la Red?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Tu cuenta se crea al inscribirte como investigador/a.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
              {[
                'Conecta con investigadoras e investigadores de toda Latinoamérica',
                'Encuentra colaboraciones por tema o metodología',
                'Da visibilidad a tu trabajo en una red institucional',
              ].map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--epa-blue)]"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Link
                href="/submit"
                className="block w-full rounded-md bg-[var(--epa-blue)] px-6 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all hover:bg-[var(--epa-blue-dark)] hover:shadow-md"
              >
                Inscribirme al directorio →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
