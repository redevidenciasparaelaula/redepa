'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

export async function setAvailableForReviewAction(
  available: boolean
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticada/o.' };
  if (!user.researcherId) {
    return {
      ok: false,
      error: 'Necesitas tener un perfil en el directorio para usar esta opción.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('researchers')
    .update({ available_for_review: available })
    .eq('id', user.researcherId);

  if (error) {
    console.error('setAvailableForReviewAction error', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/me');
  return { ok: true };
}
