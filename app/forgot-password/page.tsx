import Image from 'next/image';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
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
            Recuperar contraseña
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Te enviaremos un enlace a tu correo para configurar una nueva
            contraseña.
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
