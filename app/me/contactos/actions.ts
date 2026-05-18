'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; error: string };

// Sanitiza un tag: trim + lowercase + reemplaza espacios por '-' + acota a 40 chars.
function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9áéíóúñü\-]/g, '')
    .slice(0, 40);
}

function parseTagsList(input: unknown): string[] {
  if (typeof input !== 'string') return [];
  const raw = input
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean)
    .slice(0, 20);
  // Dedup preservando orden
  return [...new Set(raw)];
}

// =====================================================================
// saveContactAction — guarda un investigador en mi lista (sin tags al inicio)
// =====================================================================
export async function saveContactAction(researcherId: string): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('saved_contacts').insert({
    user_id: user.id,
    researcher_id: researcherId,
  });

  // Si ya estaba guardado (unique violation), lo tratamos como éxito.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/me/contactos');
  revalidatePath('/directorio');
  revalidatePath(`/researcher/${researcherId}`);
  return { ok: true };
}

// =====================================================================
// unsaveContactAction — quita de mi lista
// =====================================================================
export async function unsaveContactAction(researcherId: string): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('saved_contacts')
    .delete()
    .eq('user_id', user.id)
    .eq('researcher_id', researcherId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/me/contactos');
  revalidatePath('/directorio');
  revalidatePath(`/researcher/${researcherId}`);
  return { ok: true };
}

// =====================================================================
// updateContactTagsAction — reemplaza la lista de tags del contacto
// =====================================================================
export async function updateContactTagsAction(
  researcherId: string,
  tagsRaw: string
): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const tags = parseTagsList(tagsRaw);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('saved_contacts')
    .update({ tags })
    .eq('user_id', user.id)
    .eq('researcher_id', researcherId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/me/contactos');
  return { ok: true };
}

// =====================================================================
// updateContactNoteAction — guarda la nota libre
// =====================================================================
export async function updateContactNoteAction(
  researcherId: string,
  noteRaw: string
): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const note =
    typeof noteRaw === 'string'
      ? noteRaw.trim().slice(0, 2000) || null
      : null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('saved_contacts')
    .update({ note })
    .eq('user_id', user.id)
    .eq('researcher_id', researcherId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/me/contactos');
  return { ok: true };
}
