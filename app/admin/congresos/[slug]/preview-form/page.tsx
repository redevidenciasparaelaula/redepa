import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug } from '@/lib/queries';
import { SubmissionEditor } from '@/components/submission-editor';
import type { FullSubmission } from '@/lib/queries';

interface Props {
  params: Promise<{ slug: string }>;
}

// Vista previa del formulario de postulación para que el chair vea cómo
// se verá lo que los autores reciben — usando submission "fake" en memoria
// (no se guarda en DB). El editor llega en modo readOnly para que los
// botones de guardar/enviar no hagan nada.
export default async function PreviewFormPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin/congresos/${slug}/preview-form`);
  if (!user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <Link href="/admin" className="mt-4 inline-block text-sm underline">
          ← Volver al panel
        </Link>
      </div>
    );
  }

  const c = await getCongressBySlug(slug);
  if (!c) notFound();

  // Submission "vacía" para que el editor renderice todos los campos vacíos.
  // No se persiste; el editor está en modo readOnly así que no hay riesgo.
  const fakeSubmission: FullSubmission = {
    id: 'preview-' + c.id,
    congress_id: c.id,
    track_id: null,
    title: '',
    abs_context: '',
    abs_framework: '',
    abs_methods: '',
    abs_results: '',
    abs_discussion: '',
    keywords: [],
    methodologies: [],
    type: c.submission_types_allowed[0] ?? 'oral',
    status: 'draft',
    decision_note: null,
    created_at: new Date().toISOString(),
    submitted_at: null,
    decision_at: null,
    updated_at: new Date().toISOString(),
    authors: [],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/congresos/${slug}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
        <Link
          href={`/congreso/${c.year}/postular`}
          className="text-sm text-[var(--epa-blue)] underline"
          target="_blank"
        >
          Abrir el formulario real ↗
        </Link>
      </div>

      <div className="mb-6 rounded-lg border-2 border-[var(--epa-blue)] bg-[var(--card)] p-5">
        <p className="eyebrow !text-[var(--epa-blue)]">Vista previa</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Cómo verán los autores el formulario
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Esta es una previsualización del formulario tal como aparece para
          quienes postulan. El contenido no se guarda. Si quieres cambiar
          algo (texto intro, tipos, etiquetas), edita la sección "Formulario
          de postulación" en{' '}
          <Link
            href={`/admin/congresos/${slug}`}
            className="text-[var(--epa-blue)] underline"
          >
            la página de edición del congreso
          </Link>
          .
        </p>
      </div>

      <SubmissionEditor
        submission={fakeSubmission}
        tracks={c.tracks}
        readOnly
        submissionIntro={c.submission_intro}
        submissionMaxChars={c.submission_max_chars}
        submissionTypesAllowed={c.submission_types_allowed}
        abstractFieldLabels={c.abstract_field_labels}
      />
    </div>
  );
}
