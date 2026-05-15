'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: 'No autenticado.' };
  if (!user.isSuperAdmin)
    return { ok: false as const, error: 'Solo super-admin.' };
  return { ok: true as const, user };
}

function parseArrayCsv(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return [];
  return v
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseIntField(
  v: FormDataEntryValue | null,
  fallback: number,
  min = 1,
  max = 50
): number {
  if (typeof v !== 'string') return fallback;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// =====================================================================
// 1) Agregar al pool por email (researcher disponible → activo en pool)
// =====================================================================
export async function addToReviewerPoolAction(
  congressId: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email) return { ok: false, error: 'Email requerido.' };

  const max_load = parseIntField(formData.get('max_load'), 5);
  const topics = parseArrayCsv(formData.get('topics'));
  const methodologies = parseArrayCsv(formData.get('methodologies'));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'add_reviewer_pool_entry_by_email',
    {
      p_email: email,
      p_congress_id: congressId,
      p_max_load: max_load,
      p_topics: topics,
      p_methodologies: methodologies,
    }
  );

  if (error) return { ok: false, error: error.message };
  if (data === 'no_user') {
    return {
      ok: false,
      error:
        'Ese email no tiene cuenta en redepa.net todavía. Pídele que se registre primero.',
    };
  }
  if (data === 'already') {
    return { ok: false, error: 'Esta persona ya está activa en el pool.' };
  }

  revalidatePath(`/admin/congresos`);
  revalidatePath(`/admin/congresos/[slug]/revisores`, 'page');
  return { ok: true };
}

// =====================================================================
// 2) Editar entrada del pool (max_load, topics, methodologies, active)
// =====================================================================
export async function updateReviewerPoolEntryAction(
  userId: string,
  congressId: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const max_load = parseIntField(formData.get('max_load'), 5);
  const topics = parseArrayCsv(formData.get('topics'));
  const methodologies = parseArrayCsv(formData.get('methodologies'));
  const active = formData.get('active') === 'on';

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('update_reviewer_pool_entry', {
    p_user_id: userId,
    p_congress_id: congressId,
    p_max_load: max_load,
    p_topics: topics,
    p_methodologies: methodologies,
    p_active: active,
  });

  if (error) return { ok: false, error: error.message };
  if (data === 'not_found') {
    return { ok: false, error: 'Esta persona no está en el pool.' };
  }

  revalidatePath(`/admin/congresos/[slug]/revisores`, 'page');
  return { ok: true };
}

// =====================================================================
// 3) Quitar del pool. Aborta si tiene assignments activos.
// =====================================================================
export async function removeFromReviewerPoolAction(
  userId: string,
  congressId: string
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('remove_reviewer_pool_entry', {
    p_user_id: userId,
    p_congress_id: congressId,
  });

  if (error) return { ok: false, error: error.message };
  if (data === 'has_assignments') {
    return {
      ok: false,
      error:
        'Esta persona tiene abstracts asignados. Primero reasígnalos a otro revisor.',
    };
  }

  revalidatePath(`/admin/congresos/[slug]/revisores`, 'page');
  return { ok: true };
}
