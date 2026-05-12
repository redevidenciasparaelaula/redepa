// Cliente Supabase con la SERVICE ROLE KEY.
// **NUNCA** importes esto desde código que corre en el navegador.
// Solo usar en server actions / route handlers.
//
// Esta key bypassea RLS y puede hacer cualquier cosa en la DB.
// Vive solo en .env.local (gitignored) y en variables de entorno del host.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let cached: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno. ' +
        'Agrégala en .env.local (Supabase → Project Settings → API → service_role secret).'
    );
  }
  cached = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
