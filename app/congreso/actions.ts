'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SubscribeResult =
  | { ok: true; status: 'ok' | 'already' }
  | { ok: false; error: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

// =====================================================================
// subscribeToCongressAction
// =====================================================================
// La página pública /congreso/[year] llama a esto cuando alguien deja su
// email para recibir aviso de apertura del CFP. Acepta llamadas de anon
// y de usuarios logueados.
//
// Validaciones:
//   - honeypot 'company' debe venir vacío (anti-bot trivial)
//   - email tiene que matchear el regex (la DB también valida)
//   - se llama vía RPC subscribe_to_congress que normaliza y maneja
//     unique_violation
// =====================================================================
export async function subscribeToCongressAction(
  congressId: string,
  formData: FormData
): Promise<SubscribeResult> {
  // Honeypot: campo invisible que los humanos no llenan; los bots sí.
  const honeypot = formData.get('company');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    // Fingimos éxito para que el bot no reintente.
    return { ok: true, status: 'ok' };
  }

  const emailRaw = formData.get('email');
  const nameRaw = formData.get('name');
  const email =
    typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
  const name =
    typeof nameRaw === 'string' && nameRaw.trim() !== ''
      ? nameRaw.trim()
      : null;

  if (!email) return { ok: false, error: 'Email requerido.' };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: 'Email con formato inválido.' };
  if (email.length > 200)
    return { ok: false, error: 'Email demasiado largo.' };
  if (name && name.length > 200)
    return { ok: false, error: 'Nombre demasiado largo.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('subscribe_to_congress', {
    p_congress_id: congressId,
    p_email: email,
    p_name: name,
  });

  if (error) return { ok: false, error: error.message };
  if (data === 'invalid')
    return { ok: false, error: 'Email con formato inválido.' };
  if (data === 'already') return { ok: true, status: 'already' };

  // Revalidamos solo el panel admin (la página pública no muestra contador).
  revalidatePath('/admin/congresos/[slug]/subscribers', 'page');
  return { ok: true, status: 'ok' };
}
