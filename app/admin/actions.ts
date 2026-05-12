'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { canEditResearcher } from '@/lib/permissions';
import { generateTempPassword } from '@/lib/password';
import { createSupabaseAdminClient, hasServiceRoleKey } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function deleteResearcherAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const supabase = await createSupabaseServerClient();

  // Pre-check de permisos para dar mejor feedback. RLS lo enforce igual.
  const { data: target } = await supabase
    .from('researchers')
    .select('email, institution_id')
    .eq('id', id)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Perfil no encontrado.' };
  if (
    !canEditResearcher(user, {
      email: target.email,
      institution_id: target.institution_id,
    })
  ) {
    return { ok: false, error: 'No tienes permiso para eliminar este perfil.' };
  }

  const { error } = await supabase.from('researchers').delete().eq('id', id);
  if (error) {
    console.error('delete researcher error', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/researcher/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Crear investigador individual con cuenta auth y contraseña temporal.
// Devuelve la contraseña al admin para que la comunique.
// ---------------------------------------------------------------------

interface ResearcherInsertPayload {
  full_name: string;
  email: string;
  institution_id: string;
  title_es: string;
  title_en: string | null;
  phd_year: number | null;
  phd_institution: string | null;
  master_year: number | null;
  master_institution: string | null;
  research_topics: string[];
  methodologies: string[];
  representative_dois: string[];
  country: string;
  city: string;
  linkedin_url: string | null;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  orcid: string | null;
  website: string | null;
}

export async function adminCreateResearcherAction(
  payload: ResearcherInsertPayload
):
  Promise<
    | { ok: true; researcherId: string; password: string; createdAuthUser: boolean }
    | { ok: false; error: string }
  > {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  // Verificar permisos sobre esa institución
  if (
    !user.isSuperAdmin &&
    !user.adminOfInstitutions.includes(payload.institution_id)
  ) {
    return { ok: false, error: 'No tienes permiso para esa institución.' };
  }

  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      error:
        'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Es necesaria para crear cuentas con contraseña.',
    };
  }

  const admin = createSupabaseAdminClient();
  const cleanedEmail = payload.email.trim().toLowerCase();
  const password = generateTempPassword();
  let createdAuthUser = false;

  // ¿Ya existe el usuario en auth?
  const { data: existingList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = existingList?.users.find(
    (u) => u.email?.toLowerCase() === cleanedEmail
  );

  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email: cleanedEmail,
      password,
      email_confirm: true, // No requiere confirmar
    });
    if (createErr) {
      return { ok: false, error: `No se pudo crear cuenta: ${createErr.message}` };
    }
    createdAuthUser = true;
  }

  const { data: row, error: insertErr } = await admin
    .from('researchers')
    .insert({ ...payload, email: cleanedEmail, status: 'approved' })
    .select('id')
    .single();
  if (insertErr || !row) {
    return {
      ok: false,
      error:
        insertErr?.code === '23505'
          ? 'Ya existe un investigador con ese correo.'
          : insertErr?.message ?? 'No se pudo crear el investigador.',
    };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return {
    ok: true,
    researcherId: row.id,
    password,
    createdAuthUser,
  };
}

// ---------------------------------------------------------------------
// Resetear contraseña de un usuario (admin o investigador).
// Devuelve la nueva contraseña para que el admin la comunique.
// ---------------------------------------------------------------------

export async function adminResetPasswordAction(
  email: string
): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const cleanedEmail = email.trim().toLowerCase();

  // Verificar que el admin tenga permiso sobre ese researcher
  if (!user.isSuperAdmin) {
    const supabase = await createSupabaseServerClient();
    const { data: target } = await supabase
      .from('researchers')
      .select('institution_id')
      .eq('email', cleanedEmail)
      .maybeSingle();
    if (!target?.institution_id || !user.adminOfInstitutions.includes(target.institution_id)) {
      return {
        ok: false,
        error: 'Solo puedes resetear contraseñas de investigadores de tu institución.',
      };
    }
  }

  if (!hasServiceRoleKey()) {
    return { ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const admin = createSupabaseAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const target = list?.users.find((u) => u.email?.toLowerCase() === cleanedEmail);
  if (!target) {
    return { ok: false, error: `No existe cuenta con ${cleanedEmail}.` };
  }
  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(target.id, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, password };
}

// =====================================================================
// Carga masiva de investigadores via CSV
// =====================================================================

import type { BulkInsertResult, BulkRow } from '@/lib/admin-types';

export async function bulkInsertResearchersAction(
  institutionId: string,
  rows: BulkRow[]
): Promise<BulkInsertResult | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'No autenticado.' };

  if (!user.isSuperAdmin && !user.adminOfInstitutions.includes(institutionId)) {
    return { error: 'No tienes permiso para agregar a esta institución.' };
  }

  if (!hasServiceRoleKey()) {
    return {
      error:
        'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Es necesaria para crear cuentas con contraseña.',
    };
  }

  const admin = createSupabaseAdminClient();
  const result: BulkInsertResult = { inserted: 0, errors: [], credentials: [] };

  // Cache de usuarios existentes (evita una llamada por fila)
  const { data: usersList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  const existingByEmail = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const cleanedEmail = r.email.toLowerCase();
    const password = generateTempPassword();
    let createdAuthUser = false;

    if (!existingByEmail.has(cleanedEmail)) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email: cleanedEmail,
        password,
        email_confirm: true,
      });
      if (createErr) {
        result.errors.push({
          row: i + 2,
          email: cleanedEmail,
          message: `No se pudo crear cuenta: ${createErr.message}`,
        });
        continue;
      }
      createdAuthUser = true;
    }

    const payload = {
      ...r,
      email: cleanedEmail,
      institution_id: institutionId,
      status: 'approved' as const,
    };
    const { error: insertErr } = await admin.from('researchers').insert(payload);
    if (insertErr) {
      result.errors.push({
        row: i + 2,
        email: cleanedEmail,
        message:
          insertErr.code === '23505'
            ? 'Correo ya existe en el directorio'
            : insertErr.message ?? 'error desconocido',
      });
      continue;
    }

    result.inserted++;
    // Solo mostramos contraseña si nosotros creamos la cuenta. Si ya existía,
    // el admin no la conoce y debe usar "Resetear contraseña".
    if (createdAuthUser) {
      result.credentials.push({ email: cleanedEmail, password, createdAuthUser });
    }
  }

  if (result.inserted > 0) {
    revalidatePath('/admin');
    revalidatePath('/');
  }
  return result;
}

