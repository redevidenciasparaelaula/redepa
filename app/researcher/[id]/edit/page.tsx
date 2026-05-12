import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { countriesByGroup } from '@/lib/countries';
import { canEditResearcher } from '@/lib/permissions';
import { getResearcher, listInstitutions } from '@/lib/queries';
import { EditProfileForm } from '@/components/edit-profile-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditResearcherPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/sign-in?next=/researcher/${id}/edit`);
  }

  const researcher = await getResearcher(id);
  if (!researcher) notFound();

  if (!canEditResearcher(user, researcher)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Solo el dueño del perfil, el administrador de su institución o un
          super administrador pueden editar este perfil.
        </p>
        <Link
          href={`/researcher/${id}`}
          className="mt-4 inline-block text-sm underline"
        >
          ← Volver al perfil
        </Link>
      </div>
    );
  }

  const [institutions, countries] = await Promise.all([
    listInstitutions(),
    Promise.resolve(countriesByGroup('es')),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/researcher/${id}`}
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver al perfil
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Editar perfil</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {researcher.full_name}
        </p>
      </header>
      <EditProfileForm
        researcher={researcher}
        institutions={institutions}
        countries={countries}
      />
    </div>
  );
}
