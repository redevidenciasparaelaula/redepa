import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import type { ResearcherWithInstitution } from '@/lib/supabase/types';
import { SORTABLE_COLUMNS, type SortColumn, type SortDir } from '@/lib/queries';
import { buildHref } from '@/lib/url';
import { MailIcon } from './brand-icons';
import { SaveContactButton } from './save-contact-button';

interface Props {
  researchers: ResearcherWithInstitution[];
  locale: Locale;
  sortBy: SortColumn;
  sortDir: SortDir;
  searchParams: Record<string, string | string[] | undefined>;
  savedContactIds?: Set<string>;
}

function orcidUrl(value: string): string {
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

export async function ResearcherTable({
  researchers,
  locale,
  sortBy,
  sortDir,
  searchParams,
  savedContactIds,
}: Props) {
  const tCol = await getTranslations('table');
  const tProfile = await getTranslations('profile');

  function sortHref(col: SortColumn): string {
    const isActive = col === sortBy;
    const nextDir: SortDir = isActive && sortDir === 'asc' ? 'desc' : 'asc';
    return buildHref(
      '/',
      searchParams,
      {
        sort: col === 'full_name' && nextDir === 'asc' ? undefined : col,
        dir: nextDir === 'asc' ? undefined : 'desc',
      },
      ['page'] // resetea paginación al reordenar
    );
  }

  function indicator(col: SortColumn): string {
    if (col !== sortBy) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function HeaderCell({
    col,
    children,
    align = 'left',
  }: {
    col: SortColumn | null;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }) {
    const cls =
      'border-b border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]';
    if (!col) {
      return <th className={`${cls} text-${align}`}>{children}</th>;
    }
    const sortable = SORTABLE_COLUMNS.includes(col);
    if (!sortable) return <th className={`${cls} text-${align}`}>{children}</th>;
    return (
      <th className={`${cls} text-${align}`}>
        <Link
          href={sortHref(col)}
          className="hover:text-[var(--foreground)]"
          aria-sort={
            col === sortBy ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
          }
        >
          {children}
          {indicator(col)}
        </Link>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr>
            <HeaderCell col="full_name">{tCol('name')}</HeaderCell>
            <HeaderCell col={null}>{tCol('institution')}</HeaderCell>
            <HeaderCell col="country">{tCol('country')}</HeaderCell>
            <HeaderCell col="phd_year" align="right">
              {tCol('phd')}
            </HeaderCell>
            <HeaderCell col="master_year" align="right">
              {tCol('master')}
            </HeaderCell>
            <HeaderCell col={null}>{tCol('topics')}</HeaderCell>
            <HeaderCell col={null} align="right">
              {tCol('contact')}
            </HeaderCell>
            <HeaderCell col={null} align="right">
              <span className="sr-only">Guardar</span>
            </HeaderCell>
          </tr>
        </thead>
        <tbody>
          {researchers.map((r) => {
            const title =
              locale === 'en' ? r.title_en ?? r.title_es : r.title_es ?? r.title_en;
            const instName =
              locale === 'en'
                ? r.institutions?.name_en ?? r.institutions?.name
                : r.institutions?.name;
            return (
              <tr
                key={r.id}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--accent)]"
              >
                <td className="px-3 py-2 align-top">
                  <Link href={`/researcher/${r.id}`} className="font-medium hover:underline">
                    {r.full_name}
                  </Link>
                  {title && (
                    <div className="text-xs text-[var(--muted)]">{title}</div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="max-w-[220px] truncate" title={instName ?? ''}>
                    {instName ?? '—'}
                  </div>
                  {r.city && (
                    <div className="text-xs text-[var(--muted)]">{r.city}</div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">{r.country ?? '—'}</td>
                <td className="px-3 py-2 align-top text-right tabular-nums">
                  {r.phd_year ?? '—'}
                </td>
                <td className="px-3 py-2 align-top text-right tabular-nums">
                  {r.master_year ?? '—'}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex max-w-[260px] flex-wrap gap-1">
                    {r.research_topics.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                    {r.research_topics.length > 3 && (
                      <span className="text-xs text-[var(--muted)]">
                        +{r.research_topics.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center justify-end gap-2">
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        title={tProfile('sendEmail')}
                        className="text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        <MailIcon className="h-4 w-4" />
                      </a>
                    )}
                    {r.linkedin_url && (
                      <a
                        href={r.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tProfile('linkedin')}
                        aria-label={tProfile('linkedin')}
                        className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                      >
                        <Image
                          src="/social/linkedin.png"
                          alt=""
                          width={300}
                          height={300}
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      </a>
                    )}
                    {r.google_scholar_url && (
                      <a
                        href={r.google_scholar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tProfile('scholar')}
                        aria-label={tProfile('scholar')}
                        className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                      >
                        <Image
                          src="/social/scholar.png"
                          alt=""
                          width={300}
                          height={300}
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      </a>
                    )}
                    {r.researchgate_url && (
                      <a
                        href={r.researchgate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tProfile('researchgate')}
                        aria-label={tProfile('researchgate')}
                        className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                      >
                        <Image
                          src="/social/researchgate.png"
                          alt=""
                          width={300}
                          height={300}
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      </a>
                    )}
                    {r.orcid && (
                      <a
                        href={orcidUrl(r.orcid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tProfile('orcid')}
                        aria-label={tProfile('orcid')}
                        className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                      >
                        <Image
                          src="/social/orcid.png"
                          alt=""
                          width={300}
                          height={300}
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 align-top text-right">
                  <SaveContactButton
                    researcherId={r.id}
                    initialSaved={savedContactIds?.has(r.id) ?? false}
                    size="sm"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
