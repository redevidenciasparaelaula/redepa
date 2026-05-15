'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCongressBySlug } from '@/lib/queries';

type R<T = undefined> = (T extends undefined
  ? { ok: true }
  : { ok: true; data: T }) | { ok: false; error: string };

const CONGRESS_SLUG = 'epa-2027';
const CONGRESS_YEAR = 2027;

function trim(v: FormDataEntryValue | null, max = 10_000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function parseChips(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return [];
  return v
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

// =====================================================================
// createDraftSubmissionAction
//   El "Crear nueva postulación" del listado. RPC crea submission + autor
//   inicial atómicamente, validando que el CFP esté abierto.
// =====================================================================
export async function createDraftSubmissionAction(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/congreso/${CONGRESS_YEAR}/postular`);

  const c = await getCongressBySlug(CONGRESS_SLUG);
  if (!c) redirect(`/congreso/${CONGRESS_YEAR}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'create_submission_with_self_as_author',
    { p_congress_id: c.id }
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No se pudo crear la postulación.');

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular`);
  redirect(`/congreso/${CONGRESS_YEAR}/postular/${data}`);
}

// =====================================================================
// updateSubmissionAction
//   Guarda los campos editables. No cambia status.
// =====================================================================
export async function updateSubmissionAction(
  id: string,
  formData: FormData
): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const title         = trim(formData.get('title'), 300);
  const track_id      = trim(formData.get('track_id'), 100) || null;
  const type          = trim(formData.get('type'), 20) || 'oral';
  const abs_context   = trim(formData.get('abs_context'), 1500);
  const abs_framework = trim(formData.get('abs_framework'), 1500);
  const abs_methods   = trim(formData.get('abs_methods'), 1500);
  const abs_results   = trim(formData.get('abs_results'), 1500);
  const abs_discussion = trim(formData.get('abs_discussion'), 1500);
  const keywords      = parseChips(formData.get('keywords'));
  const methodologies = parseChips(formData.get('methodologies'));

  if (!['oral', 'poster', 'symposium'].includes(type)) {
    return { ok: false, error: 'Tipo inválido.' };
  }

  const supabase = await createSupabaseServerClient();
  // RLS solo permite update si el usuario es autor o super-admin.
  const { error } = await supabase
    .from('submissions')
    .update({
      title: title || 'Sin título',
      track_id,
      type: type as 'oral' | 'poster' | 'symposium',
      abs_context,
      abs_framework,
      abs_methods,
      abs_results,
      abs_discussion,
      keywords,
      methodologies,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular`);
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${id}`);
  return { ok: true };
}

// =====================================================================
// submitSubmissionAction
//   Atómico: valida + transiciona draft→submitted.
// =====================================================================
const SUBMIT_ERRORS: Record<string, string> = {
  forbidden: 'No tienes permiso sobre esta postulación.',
  not_found: 'Postulación no encontrada.',
  wrong_status: 'Solo se puede enviar una postulación en borrador.',
  cfp_closed: 'El CFP no está abierto.',
  deadline_passed: 'El plazo de postulación ya pasó.',
  missing_track: 'Elige una línea temática antes de enviar.',
  short_title: 'El título es demasiado corto.',
  short_abs_context: 'El campo "Contexto y problema" es demasiado corto (mín. 50 caracteres).',
  short_abs_framework: 'El campo "Marco teórico" es demasiado corto (mín. 50 caracteres).',
  short_abs_methods: 'El campo "Metodología" es demasiado corto (mín. 50 caracteres).',
  short_abs_results: 'El campo "Resultados" es demasiado corto (mín. 50 caracteres).',
  short_abs_discussion: 'El campo "Discusión / aporte" es demasiado corto (mín. 50 caracteres).',
  few_keywords: 'Agrega al menos 2 palabras clave.',
  few_methodologies: 'Elige al menos 1 metodología.',
};

export async function submitSubmissionAction(id: string): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('submit_submission_atomic', {
    p_submission_id: id,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return {
      ok: false,
      error: SUBMIT_ERRORS[data ?? ''] ?? `Error desconocido: ${data}`,
    };
  }

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular`);
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${id}`);
  return { ok: true };
}

// =====================================================================
// withdrawSubmissionAction — submitted/under_review → withdrawn
// =====================================================================
export async function withdrawSubmissionAction(id: string): Promise<R> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('withdraw_submission_atomic', {
    p_submission_id: id,
  });
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return { ok: false, error: `No se pudo retirar (${data}).` };
  }
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular`);
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${id}`);
  return { ok: true };
}

// =====================================================================
// deleteSubmissionAction — solo borradores
// =====================================================================
export async function deleteSubmissionAction(id: string): Promise<R> {
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase
    .from('submissions')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!s) return { ok: false, error: 'No encontrada.' };
  if (s.status !== 'draft') {
    return {
      ok: false,
      error: 'Solo se pueden eliminar postulaciones en borrador.',
    };
  }
  const { error } = await supabase.from('submissions').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular`);
  return { ok: true };
}

// =====================================================================
// Autores: agregar (por email del directorio) / agregar externo /
// editar / quitar / cambiar presenter / reordenar.
// =====================================================================

const AUTHOR_ERRORS: Record<string, string> = {
  forbidden: 'No puedes editar los autores de esta postulación.',
  already: 'Ese email ya está como autor.',
  not_in_directory:
    'Ese email no está en el directorio. Usa "Agregar autor externo".',
  invalid: 'Email inválido.',
  invalid_email: 'Email inválido.',
  invalid_name: 'Falta el nombre completo.',
};

export async function addAuthorByEmailAction(
  submissionId: string,
  formData: FormData
): Promise<R> {
  const email = trim(formData.get('email'), 200).toLowerCase();
  if (!email) return { ok: false, error: 'Email requerido.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'add_submission_author_by_email',
    { p_submission_id: submissionId, p_email: email }
  );
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return {
      ok: false,
      error: AUTHOR_ERRORS[data ?? ''] ?? `Error (${data}).`,
    };
  }

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${submissionId}`);
  return { ok: true };
}

export async function addExternalAuthorAction(
  submissionId: string,
  formData: FormData
): Promise<R> {
  const full_name = trim(formData.get('full_name'), 200);
  const email = trim(formData.get('email'), 200).toLowerCase();
  const institution = trim(formData.get('institution_name'), 300) || null;

  if (!full_name) return { ok: false, error: 'Nombre requerido.' };
  if (!email) return { ok: false, error: 'Email requerido.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'add_external_submission_author',
    {
      p_submission_id: submissionId,
      p_full_name: full_name,
      p_email: email,
      p_institution_name: institution,
    }
  );
  if (error) return { ok: false, error: error.message };
  if (data !== 'ok') {
    return {
      ok: false,
      error: AUTHOR_ERRORS[data ?? ''] ?? `Error (${data}).`,
    };
  }

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${submissionId}`);
  return { ok: true };
}

export async function removeAuthorAction(
  submissionId: string,
  authorId: string
): Promise<R> {
  const supabase = await createSupabaseServerClient();
  // Pre-check: no puedo quedarme sin autores
  const { count } = await supabase
    .from('submission_authors')
    .select('id', { count: 'exact', head: true })
    .eq('submission_id', submissionId);
  if ((count ?? 0) <= 1) {
    return {
      ok: false,
      error: 'Tiene que haber al menos una autora o autor.',
    };
  }
  // RLS asegura que solo autores/super-admin puedan borrar
  const { error } = await supabase
    .from('submission_authors')
    .delete()
    .eq('id', authorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${submissionId}`);
  return { ok: true };
}

export async function setPresenterAction(
  submissionId: string,
  authorId: string
): Promise<R> {
  const supabase = await createSupabaseServerClient();
  // Update en dos pasos: primero limpio el flag de todos, luego seteo el elegido.
  await supabase
    .from('submission_authors')
    .update({ is_presenter: false })
    .eq('submission_id', submissionId);
  const { error } = await supabase
    .from('submission_authors')
    .update({ is_presenter: true })
    .eq('id', authorId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${submissionId}`);
  return { ok: true };
}

export async function reorderAuthorsAction(
  submissionId: string,
  orderedIds: string[]
): Promise<R> {
  const supabase = await createSupabaseServerClient();
  // Cada id recibe su nuevo display_order en bucle.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('submission_authors')
      .update({ display_order: i })
      .eq('id', orderedIds[i])
      .eq('submission_id', submissionId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/congreso/${CONGRESS_YEAR}/postular/${submissionId}`);
  return { ok: true };
}
