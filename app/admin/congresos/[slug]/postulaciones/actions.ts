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

const ASSIGN_ERRORS: Record<string, string> = {
  forbidden: 'No tienes permiso.',
  not_found: 'Postulación no encontrada.',
  not_in_pool: 'Esa persona no está activa en el pool del congreso.',
  conflict_of_interest:
    'Conflicto de interés: el revisor es autor/a de esta postulación.',
  already: 'Esa persona ya estaba asignada a esta postulación.',
};

// =====================================================================
// assignReviewerAction
// =====================================================================
export async function assignReviewerAction(
  submissionId: string,
  reviewerUserId: string,
  deadline?: string | null
): Promise<R> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('assign_reviewer_to_submission', {
    p_submission_id: submissionId,
    p_reviewer_user_id: reviewerUserId,
    p_deadline_at: deadline ?? null,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return {
      ok: false,
      error: ASSIGN_ERRORS[data ?? ''] ?? `Error (${data}).`,
    };
  }

  revalidatePath('/admin/congresos/[slug]/postulaciones', 'page');
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}

// =====================================================================
// unassignReviewerAction — borra si todavía no hay review escrita
// =====================================================================
export async function unassignReviewerAction(
  assignmentId: string
): Promise<R> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'unassign_reviewer_from_submission',
    { p_assignment_id: assignmentId }
  );
  if (error) return { ok: false, error: error.message };
  if (data === 'has_review') {
    return {
      ok: false,
      error: 'No se puede quitar: el revisor ya entregó su review.',
    };
  }
  if (data !== 'ok') {
    return { ok: false, error: `Error (${data}).` };
  }

  revalidatePath('/admin/congresos/[slug]/postulaciones', 'page');
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}

// =====================================================================
// updateAssignmentDeadlineAction
// =====================================================================
export async function updateAssignmentDeadlineAction(
  assignmentId: string,
  deadline: string | null
): Promise<R> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  // ISO o null. RLS asegura que solo super-admin lo modifique.
  const { error } = await supabase
    .from('review_assignments')
    .update({ deadline_at: deadline })
    .eq('id', assignmentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}
