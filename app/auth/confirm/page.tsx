import { redirect } from 'next/navigation';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthFragmentHandler } from '@/components/auth-fragment-handler';

// Maneja el click en el enlace mágico / invitación. Soporta los tres
// formatos que Supabase puede usar dependiendo del template y flow type:
//   1. ?code=...           → PKCE (recomendado, usado por magic link customizado)
//   2. ?token_hash=...&type → OTP verification
//   3. #access_token=...   → implicit flow (default de invitaciones).
//      Como el fragment es client-side, lo procesa el componente cliente.

interface Props {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}

export default async function ConfirmPage({ searchParams }: Props) {
  const { code, token_hash, type, next } = await searchParams;
  // Si es recovery, redirigir a /reset-password después de verificar.
  const defaultDest = type === 'recovery' ? '/reset-password' : '/';
  const dest = next && next.startsWith('/') ? next : defaultDest;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(dest);
    console.error('exchangeCodeForSession error', {
      message: error.message,
      status: error.status,
    });
    redirect('/sign-in?error=link_invalid');
  }

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (!error) redirect(dest);
    console.error('verifyOtp error', {
      message: error.message,
      status: error.status,
    });
    redirect('/sign-in?error=link_invalid');
  }

  // Sin params en query: probablemente el flow implícito mandó los tokens en el
  // fragment (después del #). El handler cliente los procesa.
  return <AuthFragmentHandler dest={dest} />;
}
