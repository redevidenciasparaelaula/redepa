'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signInWithPasswordAction } from '@/app/sign-in/actions';

interface Props {
  next?: string;
}

export function SignInForm({ next }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInWithPasswordAction(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push(next || '/');
    });
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm transition-colors placeholder:text-[var(--muted)]';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tu.correo@institucion.edu"
          className={inputClass}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
            Contraseña
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]"
          >
            ¿La olvidaste?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending || !email || !password}
        className="w-full rounded-md bg-[var(--epa-green)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--epa-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
