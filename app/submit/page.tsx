import { listInstitutions } from '@/lib/queries';
import { countriesByGroup } from '@/lib/countries';
import { SubmitForm } from '@/components/submit-form';

// Página intencionalmente solo en español: el público objetivo del envío
// son investigadores latinoamericanos.

interface Props {
  // Se aceptan dos query params opcionales:
  //  - email: pre-rellena el email del formulario (viene de /gracias
  //    después de postular).
  //  - evaluador=1: pre-tilda el checkbox 'Estaría dispuesta/o a ser
  //    evaluador/a en un Congreso EPA' para flujos que vienen con esa
  //    intención explícita.
  searchParams: Promise<{ email?: string; evaluador?: string }>;
}

export default async function SubmitPage({ searchParams }: Props) {
  const institutions = await listInstitutions();
  const countries = countriesByGroup('es');
  const { email, evaluador } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Agregarme al directorio
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Completa este formulario para crear tu perfil.
        </p>
      </header>
      <SubmitForm
        institutions={institutions}
        countries={countries}
        initialEmail={email ?? undefined}
        initialAvailableForReview={evaluador === '1'}
      />
    </div>
  );
}
