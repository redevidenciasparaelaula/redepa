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
  const errorDesc = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  const nextParam = searchParams.get('next') ?? '/';
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  // Caso A: Supabase rebotó con error directamente (link expirado / inválido
  // antes incluso de llegar a redepa.net).
  if (errorCode || errorDesc) {
    const detail = encodeURIComponent(errorDesc ?? errorCode ?? 'unknown');
    return NextResponse.redirect(
      `${origin}/sign-in?error=link_invalid&detail=${detail}`
    );
  }

  // Caso B: no llegó ningún code → probablemente el email es del flow
  // anterior (apuntaba a /reset-password directamente) y Supabase reescribió
  // el redirect al Site URL.
  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=link_invalid&detail=no_code`
    );
  }

  // Caso C: tenemos code; intentamos intercambiarlo por sesión.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth/callback exchangeCodeForSession error', {
      message: error.message,
      status: error.status,
      code: (error as { code?: string }).code,
    });
    const detail = encodeURIComponent(error.message || 'exchange_failed');
    return NextResponse.redirect(
      `${origin}/sign-in?error=link_invalid&detail=${detail}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
