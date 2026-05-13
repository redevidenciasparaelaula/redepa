'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

// Procesa el fragment (#access_token=…&refresh_token=…) que Supabase
// mete en la URL cuando usa implicit flow (típico para invitaciones).
// Setea la sesión en cookies y navega a destino.

interface Props {
  dest: string;
}

export function AuthFragmentHandler({ dest }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const hasOldCode = search.has('code');
    const hash = window.location.hash.substring(1);

    if (!hash) {
      // Sin fragment ni manejo previo. Si llegó con ?code= sin pasar por
      // /auth/callback, probablemente es un link viejo del flow anterior.
      const detail = hasOldCode ? 'old_link_format' : 'no_fragment';
      window.location.replace(`/sign-in?error=link_invalid&detail=${detail}`);
      return;
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) {
      window.location.replace(
        '/sign-in?error=link_invalid&detail=fragment_missing_tokens'
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: setErr }) => {
        if (setErr) {
          setError(setErr.message);
          return;
        }
        // Limpiar el fragment y navegar duro (no router.push)
        // para que el server re-renderice con la sesión nueva.
        window.location.replace(dest);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [dest]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">No se pudo iniciar sesión</h1>
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
        <a href="/sign-in" className="mt-4 inline-block text-sm text-[var(--epa-blue)] underline underline-offset-2 hover:text-[var(--epa-blue-dark)]">
          Volver al inicio de sesión
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[var(--muted)]">
      Iniciando sesión…
    </div>
  );
}
