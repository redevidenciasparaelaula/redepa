import { listInstitutions } from '@/lib/queries';
import { countriesByGroup } from '@/lib/countries';
import { SubmitForm } from '@/components/submit-form';

// Página intencionalmente solo en español: el público objetivo del envío
// son investigadores latinoamericanos.

export default async function SubmitPage() {
  const institutions = await listInstitutions();
  const countries = countriesByGroup('es');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Agregarme al directorio
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Completa este formulario para crear tu perfil. Aparece de inmediato
          en el directorio. El administrador de cada institución puede
          editar, eliminar o agregar perfiles de sus investigadores/as.
        </p>
      </header>
      <SubmitForm institutions={institutions} countries={countries} />
    </div>
  );
}
