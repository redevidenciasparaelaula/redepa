import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Route Handler para procesar el ?code=... que Supabase agrega a los emails
// de confirmación / recovery / magic link (flow PKCE).
//
// IMPORTANTE: este HANDLER (no un Server Component) es el único contexto
// donde createServerClient puede setear cookies de sesión exitosamente.
// Por eso todos los redirectTo de Supabase deben apuntar acá.
//
// Uso:
//   redirectTo: `${origin}/auth/callback?next=/reset-password`
//   → Supabase agrega ?code=XXX
//   → este handler intercambia código por sesión, setea cookies, redirige a next.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/';
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=link_invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth/callback exchangeCodeForSession error', {
      message: error.message,
      status: error.status,
    });
    return NextResponse.redirect(`${origin}/sign-in?error=link_invalid`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
