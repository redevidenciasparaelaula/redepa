import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { AuthFragmentHandler } from '@/components/auth-fragment-handler';

// Se llega aquí desde el correo de recuperación. Supabase puede mandar
// los tokens vía query (?code=, ?token_hash=) o vía fragment (#access_token=).
// Si no hay sesión todavía y vemos query params, intentamos verificarlos
// server-side. Si no, renderizamos el fragment handler con redirect a esta
// misma página (que rehidrata y muestra el form de nueva contraseña).

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthFragmentHandler dest="/reset-password" />;
  }

  return (
    <div className="bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
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
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Configurar nueva contraseña
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Estás autenticada/o como{' '}
            <strong className="text-[var(--foreground)]">{user.email}</strong>.
            Define una nueva contraseña para entrar a partir de ahora.
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          <Link
            href="/"
            className="text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
          >
            ← Volver al directorio
          </Link>
        </p>
      </div>
    </div>
  );
}
