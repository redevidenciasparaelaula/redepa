import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildHref } from '@/lib/url';

interface Props {
  view: 'cards' | 'table';
  searchParams: Record<string, string | string[] | undefined>;
}

export async function ViewToggle({ view, searchParams }: Props) {
  const t = await getTranslations('view');
  const cardsHref = buildHref('/directorio', searchParams, { view: undefined }, ['view']);
  const tableHref = buildHref('/directorio', searchParams, { view: 'table' });

  const baseClass = 'rounded-md px-2.5 py-1 text-xs';
  const activeClass = 'bg-[var(--epa-blue)] text-white';
  const inactiveClass = 'border border-[var(--border)] hover:bg-[var(--accent)]';

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={t('label')}>
      <Link
        href={cardsHref}
        className={`${baseClass} ${view === 'cards' ? activeClass : inactiveClass}`}
        aria-pressed={view === 'cards'}
      >
        ▦ {t('cards')}
      </Link>
      <Link
        href={tableHref}
        className={`${baseClass} ${view === 'table' ? activeClass : inactiveClass}`}
        aria-pressed={view === 'table'}
      >
        ☰ {t('table')}
      </Link>
    </div>
  );
}
