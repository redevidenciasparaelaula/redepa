'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient, hasServiceRoleKey } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SimpleResult =
  | { ok: true }
  | { ok: false; error: string };

type AddResult =
  | { ok: true; invited: boolean }
  | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const proto =
    h.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------
// Crear nueva institución (solo super admin)
// ---------------------------------------------------------------------

export async function createInstitutionAction(patch: {
  name: string;
  name_en?: string;
  country: string;
  city?: string;
  website?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return {
      ok: false,
      error: 'Solo super admin puede crear instituciones.',
    };
  }
  const name = patch.name.trim();
  const country = patch.country.trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!country) return { ok: false, error: 'El país es obligatorio.' };

  const supabase = await createSupabaseServerClient();

  // Evitar duplicado por nombre+país (case-insensitive)
  const { data: existing } = await supabase
    .from('institutions')
    .select('id, name')
    .ilike('name', name)
    .eq('country', country)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `Ya existe "${existing.name}" en ${country}.`,
    };
  }

  const { data: created, error } = await supabase
    .from('institutions')
    .insert({
      name,
      name_en: patch.name_en?.trim() || null,
      country,
      city: patch.city?.trim() || null,
      website: patch.website?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createInstitution error', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin');
  return { ok: true, id: created.id };
}

// ---------------------------------------------------------------------
// Editar metadata de institución (solo super admin)
// ---------------------------------------------------------------------

export async function updateInstitutionAction(
  id: string,
  patch: {
    name?: string;
    name_en?: string;
    country?: string;
    city?: string | null;
    website?: string | null;
  }
): Promise<SimpleResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin puede editar instituciones.' };
  }
  if (!patch.name || !patch.name.trim()) {
    return { ok: false, error: 'El nombre es obligatorio.' };
  }
  if (!patch.country || !patch.country.trim()) {
    return { ok: false, error: 'El país es obligatorio.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('institutions')
    .update({
      name: patch.name.trim(),
      name_en: patch.name_en?.trim() || null,
      country: patch.country.trim(),
      city: patch.city?.trim() || null,
      website: patch.website?.trim() || null,
    })
    .eq('id', id);

  if (error) {
    console.error('updateInstitution error', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin');
  revalidatePath(`/admin/institutions/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Asignar admin de institución por correo
//
// Estrategia:
//   1. Intenta asignar via RPC (el correo ya existe en auth.users)
//   2. Si no existe (return 'no_user'):
//      a. Si hay SERVICE_ROLE_KEY → invita al usuario y le asigna admin en uno
//      b. Si no hay key → error pidiendo configurarla
// ---------------------------------------------------------------------

export async function addInstitutionAdminAction(
  institutionId: string,
  email: string
): Promise<AddResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin puede asignar admins.' };
  }
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) return { ok: false, error: 'Correo requerido.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('add_institution_admin_by_email', {
    p_email: cleaned,
    p_institution_id: institutionId,
  });
  if (error) return { ok: false, error: error.message };

  if (data === 'no_user') {
    // Invitar al usuario y asignar admin
    if (!hasServiceRoleKey()) {
      return {
        ok: false,
        error:
          `No existe ninguna cuenta con ${cleaned}. Para invitarla, configura SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase → Settings → API → service_role secret).`,
      };
    }
    return await inviteAndAssignInstitutionAdmin(cleaned, institutionId);
  }
  if (data === 'already') {
    return { ok: false, error: 'Ya es admin de esta institución.' };
  }
  revalidatePath(`/admin/institutions/${institutionId}`);
  return { ok: true, invited: false };
}

async function inviteAndAssignInstitutionAdmin(
  email: string,
  institutionId: string
): Promise<AddResult> {
  try {
    const admin = createSupabaseAdminClient();
    const origin = await siteOrigin();

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${origin}/auth/confirm` }
    );
    if (inviteErr) {
      console.error('inviteUserByEmail error', inviteErr);
      return { ok: false, error: `No se pudo invitar: ${inviteErr.message}` };
    }
    const newUser = invited.user;
    if (!newUser) {
      return { ok: false, error: 'Invitación creada pero no se devolvió el usuario.' };
    }

    const { error: insertErr } = await admin
      .from('institution_admins')
      .insert({ user_id: newUser.id, institution_id: institutionId });
    if (insertErr) {
      console.error('insert institution_admin after invite', insertErr);
      return { ok: false, error: insertErr.message };
    }

    revalidatePath(`/admin/institutions/${institutionId}`);
    return { ok: true, invited: true };
  } catch (e) {
    console.error('inviteAndAssignInstitutionAdmin', e);
    return { ok: false, error: String(e) };
  }
}

export async function removeInstitutionAdminAction(
  institutionId: string,
  userId: string
): Promise<SimpleResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('institution_admins')
    .delete()
    .eq('institution_id', institutionId)
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/institutions/${institutionId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Super admins (misma estrategia de invitación)
// ---------------------------------------------------------------------

export async function addSuperAdminAction(email: string): Promise<AddResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin.' };
  }
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) return { ok: false, error: 'Correo requerido.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('add_super_admin_by_email', {
    p_email: cleaned,
  });
  if (error) return { ok: false, error: error.message };

  if (data === 'no_user') {
    if (!hasServiceRoleKey()) {
      return {
        ok: false,
        error:
          `No existe ninguna cuenta con ${cleaned}. Configura SUPABASE_SERVICE_ROLE_KEY para poder invitar.`,
      };
    }
    return await inviteAndMakeSuperAdmin(cleaned);
  }
  if (data === 'already') return { ok: false, error: 'Ya es super admin.' };
  revalidatePath('/admin/super-admins');
  return { ok: true, invited: false };
}

async function inviteAndMakeSuperAdmin(email: string): Promise<AddResult> {
  try {
    const admin = createSupabaseAdminClient();
    const origin = await siteOrigin();

    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/confirm`,
      });
    if (inviteErr) {
      console.error('inviteUserByEmail error', inviteErr);
      return { ok: false, error: `No se pudo invitar: ${inviteErr.message}` };
    }
    const newUser = invited.user;
    if (!newUser) {
      return { ok: false, error: 'Invitación creada pero no se devolvió el usuario.' };
    }
    const { error: insertErr } = await admin
      .from('super_admins')
      .insert({ user_id: newUser.id });
    if (insertErr) {
      console.error('insert super_admin after invite', insertErr);
      return { ok: false, error: insertErr.message };
    }
    revalidatePath('/admin/super-admins');
    return { ok: true, invited: true };
  } catch (e) {
    console.error('inviteAndMakeSuperAdmin', e);
    return { ok: false, error: String(e) };
  }
}

export async function removeSuperAdminAction(
  userId: string
): Promise<SimpleResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin.' };
  }
  if (userId === user.id) {
    return { ok: false, error: 'No puedes quitarte super admin a ti mismo.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('super_admins')
    .delete()
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/super-admins');
  return { ok: true };
}

// ---------------------------------------------------------------------
// Fusionar instituciones (source → target)
// ---------------------------------------------------------------------

export async function mergeInstitutionsAction(
  sourceId: string,
  targetId: string
): Promise<SimpleResult> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Solo super admin.' };
  }
  if (sourceId === targetId) {
    return { ok: false, error: 'Origen y destino deben ser distintos.' };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('merge_institutions', {
    p_source_id: sourceId,
    p_target_id: targetId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}
