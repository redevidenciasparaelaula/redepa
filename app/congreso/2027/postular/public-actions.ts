'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { submissionReceivedTemplate } from '@/lib/email-templates';

const CONGRESS_SLUG = 'epa-2027';
const CONGRESS_YEAR = 2027;

export interface PublicAuthorInput {
  first_name: string;
  last_name: string;
  email: string;
  institution_name: string;
  is_corresponding: boolean;
  is_presenter: boolean;
}

export interface PublicSubmissionInput {
  title: string;
  type: 'oral' | 'poster';
  track_id: string;
  abs_context: string;
  abs_framework: string;
  abs_methods: string;
  abs_results: string;
  abs_discussion: string;
  keywords: string[];
  methodologies: string[];
  authors: PublicAuthorInput[];
}

export type PublicSubmitResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

// Server action pública (sin requerir auth). Llama a la RPC
// submit_public_submission con el payload entero y después dispara
// el email de confirmación a todos los autores (fire-and-forget).
export async function submitPublicSubmissionAction(
  input: PublicSubmissionInput
): Promise<PublicSubmitResult> {
  const supabase = await createSupabaseServerClient();

  // La RPC es nueva (migración 032); los tipos generados de Supabase
  // aún no la conocen. Casteamos por eso.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('submit_public_submission', {
    payload: input,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No se pudo crear la postulación.' };

  const submissionId = data as string;

  // Side-effect: email de confirmación a cada autor con email válido.
  void notifyPublicSubmitters(submissionId, input);

  return { ok: true, submissionId };
}

async function notifyPublicSubmitters(
  submissionId: string,
  input: PublicSubmissionInput
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: congress } = await supabase
      .from('congresses')
      .select('name, year, notification_at')
      .eq('slug', CONGRESS_SLUG)
      .maybeSingle();

    const { data: track } = await supabase
      .from('congress_tracks')
      .select('name')
      .eq('id', input.track_id)
      .maybeSingle();

    const authorsNames = input.authors.map((a) =>
      `${a.first_name} ${a.last_name}`.trim()
    );

    await Promise.allSettled(
      input.authors.map(async (a) => {
        const fullName = `${a.first_name} ${a.last_name}`.trim();
        const tpl = submissionReceivedTemplate({
          congressName: congress?.name ?? 'Congreso EPA',
          year: congress?.year ?? CONGRESS_YEAR,
          authorName: fullName,
          submissionId,
          submissionTitle: input.title,
          trackName: track?.name ?? null,
          type: input.type,
          keywords: input.keywords,
          authorsNames,
          notificationDate: congress?.notification_at ?? null,
          absContext: input.abs_context,
          absFramework: input.abs_framework,
          absMethods: input.abs_methods,
          absResults: input.abs_results,
          absDiscussion: input.abs_discussion,
        });
        await sendEmail({
          to: { email: a.email, name: fullName },
          subject: tpl.subject,
          html: tpl.html,
        });
      })
    );
  } catch (err) {
    console.error('notifyPublicSubmitters failed', err);
  }
}
