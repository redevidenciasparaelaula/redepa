import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import {
  distinctCountries,
  listInstitutionsInUse,
  searchResearchers,
  SORTABLE_COLUMNS,
  type SortColumn,
  type SortDir,
} from '@/lib/queries';
import { buildHref } from '@/lib/url';
import { SearchFilters } from '@/components/search-filters';
import { ResearcherCard } from '@/components/researcher-card';
import { ResearcherTable } from '@/components/researcher-table';
import { ViewToggle } from '@/components/view-toggle';
import { CollapsibleFilters } from '@/components/collapsible-filters';
import type { Locale } from '@/i18n/config';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function pickInt(v: string | string[] | undefined): number | undefined {
  const s = pickString(v);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
function pickArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/directorio');

  const sp = await searchParams;
  const t = await getTranslations('search');
  const locale = (await getLocale()) as Locale;

  const view = pickString(sp.view) === 'table' ? 'table' : 'cards';
  const sortByRaw = pickString(sp.sort);
  const sortBy: SortColumn = SORTABLE_COLUMNS.includes(sortByRaw as SortColumn)
    ? (sortByRaw as SortColumn)
    : 'full_name';
  const sortDir: SortDir = pickString(sp.dir) === 'desc' ? 'desc' : 'asc';

  const filters = {
    q: pickString(sp.q),
    countries: pickArray(sp.country),
    city: pickString(sp.city),
    institutionId: pickString(sp.institution),
    topics: pickArray(sp.topic),
    methodologies: pickArray(sp.methodology),
    phdYearFrom: pickInt(sp.phdYearFrom),
    phdYearTo: pickInt(sp.phdYearTo),
    masterYearFrom: pickInt(sp.masterYearFrom),
    masterYearTo: pickInt(sp.masterYearTo),
    sortBy,
    sortDir,
    page: pickInt(sp.page),
  };

  const [{ rows, total, page, pageSize }, institutions, countries] = await Promise.all([
    searchResearchers(filters),
    listInstitutionsInUse(),
    distinctCountries(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {t('subtitle', { count: total })}
          </p>
        </div>
        <ViewToggle view={view} searchParams={sp} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <CollapsibleFilters>
            <SearchFilters
              initial={filters}
              institutions={institutions}
              countries={countries}
            />
          </CollapsibleFilters>
        </aside>

        <section>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
              {t('noResults')}
            </div>
          ) : view === 'table' ? (
            <ResearcherTable
              researchers={rows}
              locale={locale}
              sortBy={sortBy}
              sortDir={sortDir}
              searchParams={sp}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <ResearcherCard researcher={r} locale={locale} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} searchParams={sp} />
          )}
        </section>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={buildHref('/directorio', searchParams, { page: p > 1 ? String(p) : undefined }, [
            'page',
          ])}
          className={
            'rounded-md border px-3 py-1 ' +
            (p === page
              ? 'border-[var(--epa-blue)] bg-[var(--epa-blue)] text-white'
              : 'border-[var(--border)] hover:bg-[var(--accent)]')
          }
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}
