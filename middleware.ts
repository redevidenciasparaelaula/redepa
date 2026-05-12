import type { NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await refreshSupabaseSession(request);
}

// No correr el middleware sobre assets estáticos.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
