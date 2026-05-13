import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
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
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const errorDesc = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  const nextParam = searchParams.get('next') ?? '/';
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  // Caso A: Supabase rebotó con error antes incluso de llegar a redepa.net.
  if (errorCode || errorDesc) {
    const detail = encodeURIComponent(errorDesc ?? errorCode ?? 'unknown');
    return NextResponse.redirect(
      `${origin}/sign-in?error=link_invalid&detail=${detail}`
    );
  }

  const supabase = await createSupabaseServerClient();

  // Caso B: flow PKCE (?code=XXX). Lo usa la nueva configuración por
  // defecto de Supabase, y nuestro signup desde /submit.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('auth/callback exchangeCodeForSession error', {
        message: error.message,
        status: error.status,
      });
      const detail = encodeURIComponent(error.message || 'exchange_failed');
      return NextResponse.redirect(
        `${origin}/sign-in?error=link_invalid&detail=${detail}`
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Caso C: flow OTP (?token_hash=XXX&type=YYY). Lo usa el template de
  // email actual de Supabase ("Recuperar contraseña").
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      console.error('auth/callback verifyOtp error', {
        message: error.message,
        status: error.status,
      });
      const detail = encodeURIComponent(error.message || 'verify_failed');
      return NextResponse.redirect(
        `${origin}/sign-in?error=link_invalid&detail=${detail}`
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Sin code ni token_hash: probablemente un link del flow anterior o llegada
  // sin params. No podemos hacer nada server-side.
  return NextResponse.redirect(
    `${origin}/sign-in?error=link_invalid&detail=no_code_or_token`
  );
}
