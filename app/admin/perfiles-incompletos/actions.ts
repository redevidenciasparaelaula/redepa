'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { incompleteProfileReminderTemplate } from '@/lib/email-templates';
import {
  computeCompleteness,
  missingCategoriesAsHtml,
} from '@/lib/profile-completeness';

type R<T = undefined> = (T extends undefined
  ? { ok: true }
  : { ok: true; data: T }) | { ok: false; error: string };

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: 'No autenticado.' };
  if (!user.isSuperAdmin)
    return { ok: false as const, error: 'Solo super-admin.' };
  return { ok: true as const };
}

// =====================================================================
// sendIncompleteProfileRemindersAction
//   Envía emails a la lista de researcherIds. Por cada uno:
//     - Recalcula qué campos le faltan (sourceof-truth en DB, no en cliente)
//     - Si está completo, lo skip
//     - Si no, manda el email con la lista de faltantes
//   Devuelve métricas: cuántos enviados, cuántos fallidos, cuántos
//   skippeados por estar completos.
// =====================================================================
export async function sendIncompleteProfileRemindersAction(
  researcherIds: string[]
): Promise<R<{ sent: number; failed: number; skipped: number }>> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;

  if (researcherIds.length === 0) {
    return { ok: false, error: 'No se seleccionaron destinatarios.' };
  }
  if (researcherIds.length > 500) {
    return { ok: false, error: 'Máximo 500 destinatarios por envío.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: researchers, error } = await supabase
    .from('researchers')
    .select(
      `id, full_name, email, institution_id, title_es, title_en,
       phd_year, master_year, photo_url, linkedin_url, google_scholar_url,
       researchgate_url, orcid, representative_dois, research_topics,
       methodologies`
    )
    .in('id', researcherIds)
    .eq('status', 'approved');

  if (error) return { ok: false, error: error.message };
  if (!researchers || researchers.length === 0) {
    return { ok: false, error: 'No se encontraron researchers válidos.' };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Envío secuencial con tope de paralelismo bajo (3) para no saturar Brevo
  const concurrency = 3;
  for (let i = 0; i < researchers.length; i += concurrency) {
    const batch = researchers.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const c = computeCompleteness(r);
        if (c.isComplete) {
          skipped += 1;
          return;
        }
        const tpl = incompleteProfileReminderTemplate({
          researcherName: r.full_name,
          researcherId: r.id,
          missingHtml: missingCategoriesAsHtml(c.missing),
        });
        const res = await sendEmail({
          to: { email: r.email, name: r.full_name },
          subject: tpl.subject,
          html: tpl.html,
        });
        if (res.ok) sent += 1;
        else failed += 1;
      })
    );
    // results no se usa más allá de await; Promise.allSettled no tira
    void results;
  }

  revalidatePath('/admin/perfiles-incompletos');
  return { ok: true, data: { sent, failed, skipped } };
}
