'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el .env.local'
    );
  }
  client = createBrowserClient<Database>(url, anonKey);
  return client;
}
