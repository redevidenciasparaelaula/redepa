import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { listInstitutions } from '@/lib/queries';
import type { Institution } from '@/lib/supabase/types';
import { BulkUploadForm } from '@/components/bulk-upload-form';

export default async function BulkUploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin/researchers/bulk');

  if (!user.isSuperAdmin && user.adminOfInstitutions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Acceso restringido</h1>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          ← Volver al directorio
        </Link>
      </div>
    );
  }

  // Instituciones que este usuario puede elegir como destino
  let availableInstitutions: Institution[] = [];
  if (user.isSuperAdmin) {
    availableInstitutions = await listInstitutions();
  } else {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('institutions')
      .select('*')
      .in('id', user.adminOfInstitutions)
      .order('name', { ascending: true });
    availableInstitutions = data ?? [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        ← Volver a Administración
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Carga masiva de investigadores
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sube un CSV con los datos de varios investigadores a la vez.
          Cada fila válida crea un perfil aprobado en el directorio.
        </p>
      </header>
      <BulkUploadForm availableInstitutions={availableInstitutions} />
    </div>
  );
}
