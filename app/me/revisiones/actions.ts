'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; error: string };

function intOrNull(v: FormDataEntryValue | null): number | null {
  if (typeof v !== 'string') return null;
  const n = parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

const SCORE_FIELDS = [
  'score_originality',
  'score_methodology',
  'score_clarity',
  'score_impact',
] as const;

const SCORE_LABELS: Record<(typeof SCORE_FIELDS)[number], string> = {
  score_originality: 'Originalidad',
  score_methodology: 'Metodología',
  score_clarity: 'Claridad',
  score_impact: 'Aporte / impacto',
};

const SUBMIT_ERRORS: Record<string, string> = {
  forbidden: 'No tienes permiso para esta revisión.',
  not_found: 'Asignación no encontrada.',
  invalid_score: 'Las notas deben ser enteras entre 1 y 5.',
  invalid_recommendation: 'La recomendación no es válida.',
};

// =====================================================================
// submitReviewAction
// =====================================================================
export async function submitReviewAction(
  assignmentId: string,
  formData: FormData
): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  // Parseo + validación local
  const scores: Record<string, number> = {};
  for (const f of SCORE_FIELDS) {
    const v = intOrNull(formData.get(f));
    if (v === null || v < 1 || v > 5) {
      return {
        ok: false,
        error: `Pon una nota de 1 a 5 para "${SCORE_LABELS[f]}".`,
      };
    }
    scores[f] = v;
  }

  const recommendation = String(formData.get('recommendation') ?? '');
  if (!['accept', 'minor_revision', 'major_revision', 'reject'].includes(
    recommendation
  )) {
    return { ok: false, error: 'Elige una recomendación.' };
  }

  const comments_to_author = String(formData.get('comments_to_author') ?? '').trim();
  const comments_to_chair = String(formData.get('comments_to_chair') ?? '').trim();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('submit_review_atomic', {
    p_assignment_id: assignmentId,
    p_score_originality: scores.score_originality,
    p_score_methodology: scores.score_methodology,
    p_score_clarity: scores.score_clarity,
    p_score_impact: scores.score_impact,
    p_comments_to_author: comments_to_author,
    p_comments_to_chair: comments_to_chair,
    p_recommendation: recommendation,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return { ok: false, error: SUBMIT_ERRORS[data ?? ''] ?? `Error (${data}).` };
  }

  revalidatePath('/me/revisiones');
  revalidatePath(`/me/revisiones/${assignmentId}`);
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}

// =====================================================================
// declineAssignmentAction
// =====================================================================
export async function declineAssignmentAction(
  assignmentId: string
): Promise<R> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('decline_assignment', {
    p_assignment_id: assignmentId,
  });
  if (error) return { ok: false, error: error.message };
  if (data === 'has_review') {
    return {
      ok: false,
      error: 'Ya entregaste una review. No se puede declinar después.',
    };
  }
  if (data !== 'ok') return { ok: false, error: `Error (${data}).` };
  revalidatePath('/me/revisiones');
  return { ok: true };
}

// =====================================================================
// markAssignmentInProgressAction
//   Llamado cuando el reviewer abre la asignación por primera vez.
// =====================================================================
export async function markAssignmentInProgressAction(
  assignmentId: string
): Promise<R> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('mark_assignment_in_progress', {
    p_assignment_id: assignmentId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
