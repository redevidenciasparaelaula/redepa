'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRoleKey } from '@/lib/supabase/admin';
import { generateTempPassword } from '@/lib/password';

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
// 4) Agregar manualmente a directorio + pool en un solo paso.
//    Casos:
//     - La cuenta auth no existe → se crea con contraseña temporal
//       (se devuelve al admin para que se la comunique al revisor).
//     - El researcher ya existe → se conserva; se completan campos
//       vacíos con lo del formulario. No se pisa nada que ya tenga valor.
//     - Al final, siempre se agrega al pool del congreso vía RPC.
// =====================================================================
export type ManualAddResult =
  | {
      ok: true;
      password?: string; // solo si se creó cuenta nueva
      createdAuthUser: boolean;
      createdResearcher: boolean;
      warning?: string;
    }
  | { ok: false; error: string };

export async function addManuallyToDirectoryAndPoolAction(
  congressId: string,
  formData: FormData
): Promise<ManualAddResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  const fullName = (formData.get('full_name') as string | null)?.trim();
  const institutionId =
    (formData.get('institution_id') as string | null)?.trim() || null;
  const country = (formData.get('country') as string | null)?.trim() || null;
  const city = (formData.get('city') as string | null)?.trim() || null;
  const max_load = parseIntField(formData.get('max_load'), 5);
  const topics = parseArrayCsv(formData.get('topics'));
  const methodologies = parseArrayCsv(formData.get('methodologies'));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'Email inválido.' };
  if (!fullName)
    return { ok: false, error: 'Nombre completo requerido.' };
  if (!institutionId)
    return { ok: false, error: 'Institución requerida.' };

  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      error:
        'Falta SUPABASE_SERVICE_ROLE_KEY. Es necesaria para crear cuentas.',
    };
  }
  const admin = createSupabaseAdminClient();

  // --------- 1) Cuenta auth: crear si no existe ---------
  let userId: string | null = null;
  let createdAuthUser = false;
  let password: string | undefined;

  // Buscar en las primeras 1000 cuentas por email
  const { data: usersList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = usersList?.users.find(
    (u) => u.email?.toLowerCase() === email
  );
  if (existingUser) {
    userId = existingUser.id;
  } else {
    password = generateTempPassword();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      return {
        ok: false,
        error: `No se pudo crear cuenta: ${createErr?.message ?? 'desconocido'}`,
      };
    }
    userId = created.user.id;
    createdAuthUser = true;
  }

  // --------- 2) Researcher: insertar si no existe ---------
  let createdResearcher = false;
  const { data: existingResearcher } = await admin
    .from('researchers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!existingResearcher) {
    const { error: insertErr } = await admin.from('researchers').insert({
      full_name: fullName,
      email,
      institution_id: institutionId,
      country,
      city,
      research_topics: topics,
      methodologies,
      status: 'approved',
      available_for_review: true,
    });
    if (insertErr) {
      // No abortamos: la cuenta y el pool aún pueden servir. Reportamos como warning.
      return {
        ok: true,
        createdAuthUser,
        createdResearcher: false,
        password,
        warning: `Cuenta creada, pero no se pudo insertar en el directorio: ${insertErr.message}. Puedes editar el perfil manualmente después.`,
      };
    }
    createdResearcher = true;
  }

  // --------- 3) Agregar al pool ---------
  const supabase = await createSupabaseServerClient();
  const { data: poolResult, error: poolErr } = await supabase.rpc(
    'add_reviewer_pool_entry_by_email',
    {
      p_email: email,
      p_congress_id: congressId,
      p_max_load: max_load,
      p_topics: topics,
      p_methodologies: methodologies,
    }
  );
  if (poolErr) {
    return {
      ok: true,
      createdAuthUser,
      createdResearcher,
      password,
      warning: `Cuenta y perfil listos, pero no se pudo agregar al pool: ${poolErr.message}`,
    };
  }
  if (poolResult === 'already') {
    return {
      ok: true,
      createdAuthUser,
      createdResearcher,
      password,
      warning: 'Esta persona ya estaba activa en el pool del congreso.',
    };
  }

  revalidatePath(`/admin/congresos/[slug]/revisores`, 'page');
  revalidatePath('/admin');
  return { ok: true, createdAuthUser, createdResearcher, password };
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
