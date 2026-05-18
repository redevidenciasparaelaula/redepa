'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; error: string };

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: 'No autenticado.' };
  if (!user.isSuperAdmin)
    return { ok: false as const, error: 'Solo super-admin.' };
  return { ok: true as const };
}

// =====================================================================
// mergeInstitutionAction
//   Llama al RPC merge_institutions (migración 012): mueve todos los
//   researchers + admins de p_source_id a p_target_id, luego borra
//   p_source_id. SECURITY DEFINER valida super-admin desde Postgres.
// =====================================================================
export async function mergeInstitutionAction(
  sourceId: string,
  targetId: string
): Promise<R> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;
  if (sourceId === targetId) {
    return { ok: false, error: 'Origen y destino no pueden ser iguales.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('merge_institutions', {
    p_source_id: sourceId,
    p_target_id: targetId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/instituciones/duplicadas');
  revalidatePath('/admin', 'page');
  return { ok: true };
}
