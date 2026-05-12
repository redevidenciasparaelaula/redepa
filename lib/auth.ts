import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuthUser {
  id: string;
  email: string;
  // Si su email coincide con un researcher.email
  researcherId: string | null;
  // Roles
  isSuperAdmin: boolean;
  // institution_ids que administra
  adminOfInstitutions: string[];
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase();
  const [researcher, superAdmin, adminRows] = await Promise.all([
    supabase
      .from('researchers')
      .select('id')
      .eq('email', email)
      .maybeSingle()
      .then((r) => r.data),
    supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then((r) => r.data),
    supabase
      .from('institution_admins')
      .select('institution_id')
      .eq('user_id', user.id)
      .then((r) => r.data ?? []),
  ]);

  return {
    id: user.id,
    email,
    researcherId: researcher?.id ?? null,
    isSuperAdmin: !!superAdmin,
    adminOfInstitutions: adminRows.map((r) => r.institution_id),
  };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  return user;
}
