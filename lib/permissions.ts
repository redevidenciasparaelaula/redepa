import type { AuthUser } from '@/lib/auth';
import type { ResearcherWithInstitution } from '@/lib/supabase/types';

// Reglas de negocio que deciden si un usuario puede editar un investigador.
// El RLS las refuerza a nivel DB; aquí las usamos para mostrar/ocultar UI.

export function canEditResearcher(
  user: AuthUser | null,
  researcher: Pick<ResearcherWithInstitution, 'email' | 'institution_id'>
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (user.email === researcher.email.toLowerCase()) return true;
  if (
    researcher.institution_id &&
    user.adminOfInstitutions.includes(researcher.institution_id)
  ) {
    return true;
  }
  return false;
}
