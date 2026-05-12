'use server';

import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function siteOriginFromHeaders(h: Headers): string {
  const proto =
    h.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ---------------------------------------------------------------------
// Sign in con email + contraseña
// ---------------------------------------------------------------------

export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleaned = email.trim().toLowerCase();
  if (!validEmail(cleaned)) return { ok: false, error: 'Correo no válido.' };
  if (!password) return { ok: false, error: 'Contraseña requerida.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: cleaned,
    password,
  });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return {
        ok: false,
        error: 'Correo o contraseña incorrectos.',
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Solicitar recuperación de contraseña (envía correo con link)
// ---------------------------------------------------------------------

export async function requestPasswordRecoveryAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleaned = email.trim().toLowerCase();
  if (!validEmail(cleaned)) return { ok: false, error: 'Correo no válido.' };

  const origin = siteOriginFromHeaders(await headers());
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(cleaned, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) {
    console.error('resetPasswordForEmail error', error);
    if (error.status === 429 || /rate/i.test(error.message)) {
      return { ok: false, error: 'Demasiados intentos. Espera unos minutos.' };
    }
    return { ok: false, error: 'No se pudo enviar el correo de recuperación.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Cambiar contraseña (estando logueado, ya sea normal o en sesión de recovery)
// ---------------------------------------------------------------------

export async function updatePasswordAction(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error('updateUser password error', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
