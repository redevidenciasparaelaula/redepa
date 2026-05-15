'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendBulkEmail } from '@/lib/email';
import { cfpOpenedTemplate } from '@/lib/email-templates';

type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_STATUSES = [
  'draft',
  'cfp_open',
  'review',
  'program',
  'live',
  'closed',
] as const;
type CongressStatus = (typeof VALID_STATUSES)[number];

// Transiciones válidas entre estados. El orden natural es:
// draft → cfp_open → review → program → live → closed.
// Permitimos volver a draft desde cfp_open por si abrimos antes de tiempo.
const ALLOWED_TRANSITIONS: Record<CongressStatus, CongressStatus[]> = {
  draft: ['cfp_open'],
  cfp_open: ['draft', 'review'],
  review: ['cfp_open', 'program'],
  program: ['review', 'live'],
  live: ['program', 'closed'],
  closed: ['live'],
};

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: 'No autenticado.' };
  if (!user.isSuperAdmin)
    return { ok: false as const, error: 'Solo super-admin.' };
  return { ok: true as const, user };
}

function trimOrNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function dateOrNull(v: FormDataEntryValue | null): string | null {
  // Espera 'YYYY-MM-DD' del <input type="date"> o vacío.
  const t = trimOrNull(v);
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function timestampFromDate(v: FormDataEntryValue | null): string | null {
  // Convierte 'YYYY-MM-DD' a un timestamptz a las 00:00 UTC.
  const d = dateOrNull(v);
  if (!d) return null;
  return `${d}T00:00:00Z`;
}

// =====================================================================
// 1) Editar datos básicos del congreso: nombre + tema
// =====================================================================
export async function updateCongressBasicsAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const name = trimOrNull(formData.get('name'));
  const theme = trimOrNull(formData.get('theme'));

  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('congresses')
    .update({ name, theme })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath(`/admin/congresos`);
  // El slug ej. 'epa-2027' no cambia, pero la página pública sí lee theme
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}

// =====================================================================
// 2) Editar fechas del congreso
// =====================================================================
export async function updateCongressDatesAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const start_date = dateOrNull(formData.get('start_date'));
  const end_date = dateOrNull(formData.get('end_date'));
  const cfp_open_at = timestampFromDate(formData.get('cfp_open_at'));
  const cfp_close_at = timestampFromDate(formData.get('cfp_close_at'));
  const notification_at = timestampFromDate(formData.get('notification_at'));
  const registration_open_at = timestampFromDate(
    formData.get('registration_open_at')
  );

  if (!start_date || !end_date) {
    return { ok: false, error: 'Las fechas del congreso son obligatorias.' };
  }
  if (start_date > end_date) {
    return {
      ok: false,
      error: 'La fecha de inicio no puede ser posterior a la de cierre.',
    };
  }
  if (cfp_open_at && cfp_close_at && cfp_open_at > cfp_close_at) {
    return {
      ok: false,
      error: 'El cierre del CFP debe ser posterior a su apertura.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('congresses')
    .update({
      start_date,
      end_date,
      cfp_open_at,
      cfp_close_at,
      notification_at,
      registration_open_at,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath(`/admin/congresos`);
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}

// =====================================================================
// 3) Cambiar estado del congreso (con validación de transición)
// =====================================================================
export async function updateCongressStatusAction(
  id: string,
  newStatus: string
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  if (!VALID_STATUSES.includes(newStatus as CongressStatus)) {
    return { ok: false, error: 'Estado inválido.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: readErr } = await supabase
    .from('congresses')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!current) return { ok: false, error: 'Congreso no encontrado.' };

  const from = current.status as CongressStatus;
  const to = newStatus as CongressStatus;
  if (from === to) return { ok: true };

  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      error: `Transición no permitida: ${from} → ${to}.`,
    };
  }

  const { error } = await supabase
    .from('congresses')
    .update({ status: to })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  // Side-effect: si la transición es draft → cfp_open, notificamos por
  // email a todos los suscriptores que dejaron su email en /congreso/YYYY.
  // Errores de envío se loguean pero no abortan la transición.
  if (from === 'draft' && to === 'cfp_open') {
    void notifyCfpOpened(id);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/congresos');
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}

async function notifyCfpOpened(congressId: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: congress }, { data: subscribers }] = await Promise.all([
      supabase
        .from('congresses')
        .select('name, year, theme, cfp_close_at')
        .eq('id', congressId)
        .maybeSingle(),
      supabase
        .from('congress_subscribers')
        .select('email, name')
        .eq('congress_id', congressId),
    ]);
    if (!congress || !subscribers || subscribers.length === 0) return;

    const result = await sendBulkEmail(
      subscribers.map((s) => ({ email: s.email, name: s.name ?? undefined })),
      (r) => {
        const tpl = cfpOpenedTemplate({
          congressName: congress.name,
          year: congress.year,
          theme: congress.theme ?? null,
          cfpCloseAt: congress.cfp_close_at ?? null,
          subscriberName: r.name ?? null,
        });
        return { subject: tpl.subject, html: tpl.html };
      }
    );
    console.info(
      `[email] CFP abierto: ${result.sent} enviados, ${result.failed} fallidos`
    );
  } catch (err) {
    console.error('notifyCfpOpened failed', err);
  }
}

// =====================================================================
// 4) Crear una línea temática nueva
// =====================================================================
export async function createTrackAction(
  congressId: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const name = trimOrNull(formData.get('name'));
  const description = trimOrNull(formData.get('description'));
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const supabase = await createSupabaseServerClient();
  // Calcula display_order como max+1
  const { data: existing } = await supabase
    .from('congress_tracks')
    .select('display_order')
    .eq('congress_id', congressId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder =
    existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 1;

  const { error } = await supabase.from('congress_tracks').insert({
    congress_id: congressId,
    name,
    description,
    display_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/congresos');
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}

// =====================================================================
// 5) Editar línea temática
// =====================================================================
export async function updateTrackAction(
  trackId: string,
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const name = trimOrNull(formData.get('name'));
  const description = trimOrNull(formData.get('description'));
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('congress_tracks')
    .update({ name, description })
    .eq('id', trackId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/congresos');
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}

// =====================================================================
// 6) Eliminar línea temática
// =====================================================================
export async function deleteTrackAction(trackId: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  const supabase = await createSupabaseServerClient();
  // Si hay submissions referenciando esta track, ya el ON DELETE SET NULL
  // de la FK las desvincula sin perder los datos.
  const { error } = await supabase
    .from('congress_tracks')
    .delete()
    .eq('id', trackId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/congresos');
  revalidatePath('/congreso/[year]', 'page');
  return { ok: true };
}
