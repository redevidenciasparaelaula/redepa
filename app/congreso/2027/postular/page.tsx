import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCongressBySlug } from '@/lib/queries';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import { PublicSubmissionForm } from '@/components/public-submission-form';

const SLUG = 'epa-2027';

// La página es pública (sin auth). Fuerza dinámico para que el estado del
// congreso (abierto/cerrado) se refleje de inmediato.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PostularPage() {
  const c = await getCongressBySlug(SLUG);
  if (!c) notFound();

  const cfpOpen = c.status === 'cfp_open';
  const deadlinePassed =
    !!c.cfp_close_at && new Date(c.cfp_close_at) < new Date();
  const canSubmit = cfpOpen && !deadlinePassed;

  const methodologies = methodologiesAlphabetical('es');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/congreso/2027"
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Volver al congreso
        </Link>
      </div>

      <header className="mb-8">
        <p className="eyebrow">Congreso EPA · {c.year}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Postular al congreso
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Completa este formulario y envía tu propuesta. No necesitas crear
          cuenta. El envío es por única vez: una vez enviada, la postulación
          no se puede editar — asegúrate de dejarla como la quieres antes de
          enviar.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          ¿Tienes dudas o necesitas ayuda? Escríbenos a{' '}
          <a
            href="mailto:contacto@redepa.net"
            className="text-[var(--epa-blue)] underline hover:no-underline"
          >
            contacto@redepa.net
          </a>
          .
        </p>
      </header>

      {!canSubmit ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm">
          {!cfpOpen ? (
            <p>
              La convocatoria no está abierta. Vuelve en la fecha de apertura.
            </p>
          ) : (
            <p>
              El plazo de postulación ya pasó. No se pueden recibir más
              propuestas para este congreso.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Plantilla Word descargable para trabajar el texto antes de enviarlo */}
          <section className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="max-w-2xl text-[var(--foreground)]">
                Si te ayuda, puedes descargar la plantilla en Word para
                trabajar el texto con calma. Después copias y pegas el
                contenido en este formulario:{' '}
                <strong>
                  no se aceptan envíos por correo, PDF ni archivos Word — solo
                  a través del formulario en línea.
                </strong>
              </p>
              <a
                href="/plantilla-postulacion-epa-2027"
                download
                className="shrink-0 self-start rounded-md border border-[var(--epa-blue)] bg-white px-4 py-2 text-sm font-semibold text-[var(--epa-blue)] hover:bg-[var(--epa-blue)] hover:text-white"
              >
                ↓ Descargar plantilla (Word)
              </a>
            </div>
          </section>

          <PublicSubmissionForm
            tracks={c.tracks}
            methodologies={methodologies}
            submissionIntro={c.submission_intro}
            submissionMaxChars={c.submission_max_chars}
          />
        </>
      )}
    </div>
  );
}
