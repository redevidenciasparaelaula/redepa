'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import {
  reviewerAssignedTemplate,
  decisionEmittedTemplate,
} from '@/lib/email-templates';

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

  // Side-effect: notificar al revisor por email. No bloquea si falla.
  void notifyReviewerAssigned(submissionId, reviewerUserId);

  revalidatePath('/admin/congresos/[slug]/postulaciones', 'page');
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}

async function notifyReviewerAssigned(
  submissionId: string,
  reviewerUserId: string
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: sub }, { data: assignment }] = await Promise.all([
      supabase
        .from('submissions')
        .select(
          'title, congress_id, track_id, congresses(name, year), congress_tracks(name)'
        )
        .eq('id', submissionId)
        .maybeSingle(),
      supabase
        .from('review_assignments')
        .select('deadline_at')
        .eq('submission_id', submissionId)
        .eq('reviewer_user_id', reviewerUserId)
        .maybeSingle(),
    ]);
    if (!sub) return;

    // Email del revisor (auth.users) + nombre (researchers) vía RPC list_assignments
    const { data: assigns } = await supabase.rpc(
      'list_assignments_for_submission',
      { p_submission_id: submissionId }
    );
    const my = assigns?.find((a) => a.reviewer_user_id === reviewerUserId);
    if (!my) return;

    const congress = sub.congresses as { name: string; year: number } | null;
    const track = sub.congress_tracks as { name: string } | null;

    const tpl = reviewerAssignedTemplate({
      congressName: congress?.name ?? 'Congreso EPA',
      year: congress?.year ?? new Date().getFullYear(),
      reviewerName: my.reviewer_name,
      submissionTitle: sub.title,
      trackName: track?.name ?? null,
      deadlineAt: assignment?.deadline_at ?? null,
    });
    await sendEmail({
      to: { email: my.reviewer_email, name: my.reviewer_name },
      subject: tpl.subject,
      html: tpl.html,
    });
  } catch (err) {
    console.error('notifyReviewerAssigned failed', err);
  }
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
// bulkAssignReviewersAction: aplica una lista de asignaciones en un solo
// paso. Se usa desde el preview de auto-asignación.
//
// Comportamiento:
//   - Cada asignación se aplica vía el mismo RPC assign_reviewer_to_submission
//     (respeta las mismas validaciones: conflicto, capacidad, pool activo).
//   - Los errores por fila se reportan pero NO abortan las demás.
//   - Emails: se envía UNA notificación consolidada por revisor (aunque
//     tenga varias postulaciones asignadas en esta corrida), en background.
// =====================================================================

export interface BulkAssignItem {
  submission_id: string;
  reviewer_user_id: string;
}

export interface BulkAssignRowResult {
  submission_id: string;
  reviewer_user_id: string;
  ok: boolean;
  error?: string;
}

export interface BulkAssignResult {
  ok: boolean;
  applied: number;
  failed: number;
  rows: BulkAssignRowResult[];
  error?: string;
}

export async function bulkAssignReviewersAction(
  items: BulkAssignItem[],
  deadline?: string | null
): Promise<BulkAssignResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok)
    return { ok: false, applied: 0, failed: items.length, rows: [], error: auth.error };

  if (!Array.isArray(items) || items.length === 0)
    return { ok: false, applied: 0, failed: 0, rows: [], error: 'Sin asignaciones a aplicar.' };

  const supabase = await createSupabaseServerClient();
  const rows: BulkAssignRowResult[] = [];
  let applied = 0;
  let failed = 0;

  // Aplicar secuencialmente para no golpear demasiado la DB y para poder
  // capturar errores individuales sin que uno frene los demás.
  for (const it of items) {
    const { data, error } = await supabase.rpc(
      'assign_reviewer_to_submission',
      {
        p_submission_id: it.submission_id,
        p_reviewer_user_id: it.reviewer_user_id,
        p_deadline_at: deadline ?? null,
      }
    );
    if (error) {
      failed++;
      rows.push({
        submission_id: it.submission_id,
        reviewer_user_id: it.reviewer_user_id,
        ok: false,
        error: error.message,
      });
      continue;
    }
    if (data !== 'ok') {
      failed++;
      rows.push({
        submission_id: it.submission_id,
        reviewer_user_id: it.reviewer_user_id,
        ok: false,
        error: ASSIGN_ERRORS[data ?? ''] ?? `Error (${data}).`,
      });
      continue;
    }
    applied++;
    rows.push({
      submission_id: it.submission_id,
      reviewer_user_id: it.reviewer_user_id,
      ok: true,
    });
  }

  // Notificaciones consolidadas: agrupamos por reviewer y disparamos un
  // solo email con todas las nuevas asignaciones. Fire-and-forget.
  if (applied > 0) {
    const byReviewer = new Map<string, string[]>();
    for (const r of rows) {
      if (!r.ok) continue;
      const list = byReviewer.get(r.reviewer_user_id) ?? [];
      list.push(r.submission_id);
      byReviewer.set(r.reviewer_user_id, list);
    }
    for (const [reviewerId, submissionIds] of byReviewer) {
      void notifyReviewerAssignedBulk(reviewerId, submissionIds);
    }
  }

  revalidatePath('/admin/congresos/[slug]/postulaciones', 'page');
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: applied > 0, applied, failed, rows };
}

async function notifyReviewerAssignedBulk(
  reviewerUserId: string,
  submissionIds: string[]
): Promise<void> {
  try {
    // Reutilizamos el flujo individual: 1 email por asignación. Si en el
    // futuro queremos un template "resumen", basta cambiar acá.
    for (const submissionId of submissionIds) {
      await notifyReviewerAssigned(submissionId, reviewerUserId);
    }
  } catch (err) {
    console.error('notifyReviewerAssignedBulk failed', err);
  }
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

// =====================================================================
// decideSubmissionAction
//   El chair emite decisión final: 'accepted' / 'rejected' / 'revert'
//   (revert vuelve a 'under_review'). Validación de status del congreso
//   y del submission se hace en el RPC.
// =====================================================================
const DECISION_ERRORS: Record<string, string> = {
  forbidden: 'Solo super-admin.',
  invalid_decision: 'Decisión inválida.',
  not_found: 'Postulación no encontrada.',
  wrong_congress_status:
    'El congreso tiene que estar en estado "review" o "program" para emitir decisiones.',
  wrong_submission_status:
    'La postulación no está en un estado válido para emitir decisión.',
};

export async function decideSubmissionAction(
  submissionId: string,
  decision: 'accepted' | 'rejected' | 'revert',
  note: string | null
): Promise<R> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('decide_submission', {
    p_submission_id: submissionId,
    p_decision: decision,
    p_note: note,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return { ok: false, error: DECISION_ERRORS[data ?? ''] ?? `Error (${data}).` };
  }

  // Notificar a los autores solo cuando es decisión final (no en revert).
  if (decision === 'accepted' || decision === 'rejected') {
    void notifyAuthorsOfDecision(submissionId, decision, note);
  }

  revalidatePath('/admin/congresos/[slug]/postulaciones', 'page');
  revalidatePath('/admin/congresos/[slug]/postulaciones/[id]', 'page');
  return { ok: true };
}

async function notifyAuthorsOfDecision(
  submissionId: string,
  decision: 'accepted' | 'rejected',
  note: string | null
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: sub } = await supabase
      .from('submissions')
      .select('title, congresses(name, year)')
      .eq('id', submissionId)
      .maybeSingle();
    if (!sub) return;
    const congress = sub.congresses as { name: string; year: number } | null;

    const { data: authors } = await supabase
      .from('submission_authors')
      .select('email, full_name')
      .eq('submission_id', submissionId);
    if (!authors || authors.length === 0) return;

    await Promise.allSettled(
      authors.map(async (a) => {
        const tpl = decisionEmittedTemplate({
          congressName: congress?.name ?? 'Congreso EPA',
          year: congress?.year ?? new Date().getFullYear(),
          authorName: a.full_name,
          submissionId,
          submissionTitle: sub.title,
          decision,
          decisionNote: note,
        });
        await sendEmail({
          to: { email: a.email, name: a.full_name },
          subject: tpl.subject,
          html: tpl.html,
        });
      })
    );
  } catch (err) {
    console.error('notifyAuthorsOfDecision failed', err);
  }
}
