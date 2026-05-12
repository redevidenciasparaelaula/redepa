import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('profile');
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-lg">{t('notFound')}</p>
      <Link href="/directorio" className="mt-4 inline-block text-sm underline">
        ← {t('back')}
      </Link>
    </div>
  );
}
