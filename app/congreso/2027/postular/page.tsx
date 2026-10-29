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
          Completa este formulario con tu propuesta. Revísala bien antes de
          enviar: una vez enviada, la postulación no se puede editar.
        </p>
      </header>

      {/* Aviso importante antes de empezar + recomendación de plantilla Word */}
      <section className="mb-6 rounded-lg border-l-4 border-[var(--epa-blue)] bg-[var(--accent)] p-5 text-sm leading-relaxed">
        <p className="font-semibold text-[var(--foreground)]">Antes de empezar</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--foreground)]">
          <li>
            <strong>No hay guardado parcial</strong>: si cierras esta página
            antes de enviar, pierdes lo que escribiste.
          </li>
          <li>
            <strong>Una vez enviada, la postulación no se puede editar.</strong>
          </li>
          <li>
            Te recomendamos{' '}
            <a
              href="/plantilla-postulacion-epa-2027"
              download
              className="font-semibold text-[var(--epa-blue)] underline hover:no-underline"
            >
              descargar la plantilla en Word
            </a>{' '}
            y preparar tu texto con calma. Cuando esté listo, abres este
            formulario y pegas el contenido de cada campo.
          </li>
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]">
          ¿Tienes dudas o necesitas ayuda? Escríbenos a{' '}
          <a
            href="mailto:contacto@redepa.net"
            className="text-[var(--epa-blue)] underline hover:no-underline"
          >
            contacto@redepa.net
          </a>
          .
        </p>
      </section>

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
