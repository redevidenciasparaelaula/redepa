import Image from 'next/image';
import Link from 'next/link';
import { SignInForm } from '@/components/sign-in-form';

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith('/') || next.startsWith('//')) return undefined;
  return next;
}

export default async function SignInPage({ searchParams }: Props) {
  const { error, next } = await searchParams;
  const nextSafe = safeNext(next);

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
          <div className="mx-auto mt-6 max-w-md rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            El enlace ya no es válido o expiró. Inicia sesión normalmente.
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
          <div className="flex flex-col rounded-2xl border-l-4 border-[var(--epa-blue)] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              ¿Aún no eres parte de la Red?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Tu cuenta se crea al inscribirte como investigador/a. Súmate al
              directorio y conecta con quienes investigan educación en
              Latinoamérica.
            </p>
            <div className="mt-auto pt-6">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1 rounded-md border border-[var(--epa-blue)] px-4 py-2 text-sm font-semibold text-[var(--epa-blue)] transition-colors hover:bg-[var(--epa-blue)] hover:text-white"
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
