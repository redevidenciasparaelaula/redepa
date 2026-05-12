import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getResearcher } from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { canEditResearcher } from '@/lib/permissions';
import { methodologyLabel } from '@/lib/methodologies';
import { doiUrl } from '@/lib/doi';
import {
  BRAND_COLORS,
  GoogleScholarIcon,
  LinkedInIcon,
  MailIcon,
  OrcidIcon,
  ResearchGateIcon,
} from '@/components/brand-icons';
import type { Locale } from '@/i18n/config';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResearcherPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/researcher/${id}`);

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('profile');

  const r = await getResearcher(id);
  if (!r) notFound();

  const showEdit = canEditResearcher(user, r);

  const title = locale === 'en' ? r.title_en ?? r.title_es : r.title_es ?? r.title_en;
  const instName =
    locale === 'en'
      ? r.institutions?.name_en ?? r.institutions?.name
      : r.institutions?.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/directorio"
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← {t('back')}
        </Link>
        {showEdit && (
          <Link
            href={`/researcher/${r.id}/edit`}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
          >
            ✎ {t('edit')}
          </Link>
        )}
      </div>

      {r.status === 'pending' && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t('pendingNotice')}
        </div>
      )}

      <header className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{r.full_name}</h1>
            {title && (
              <p className="mt-1 text-sm text-[var(--muted)]">{title}</p>
            )}
            {instName && <p className="mt-1 text-sm">{instName}</p>}
            <p className="mt-1 text-xs text-[var(--muted)]">
              {[r.city, r.country].filter(Boolean).join(', ')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-sm md:flex-col md:gap-y-0.5 md:text-right">
            {r.phd_year && (
              <div>
                <span className="text-[var(--muted)]">Doctorado:</span> {r.phd_year}
              </div>
            )}
            {r.master_year && (
              <div>
                <span className="text-[var(--muted)]">Magíster:</span>{' '}
                {r.master_year}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {r.email && (
            <a
              href={`mailto:${r.email}`}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-1.5 text-sm font-medium text-white"
            >
              <MailIcon className="h-4 w-4" />
              {t('sendEmail')}
            </a>
          )}
          {r.linkedin_url && (
            <a
              href={r.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
              style={{ color: BRAND_COLORS.linkedin }}
            >
              <LinkedInIcon className="h-4 w-4" />
              <span className="text-[var(--foreground)]">{t('linkedin')}</span>
            </a>
          )}
          {r.google_scholar_url && (
            <a
              href={r.google_scholar_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
              style={{ color: BRAND_COLORS.scholar }}
            >
              <GoogleScholarIcon className="h-4 w-4" />
              <span className="text-[var(--foreground)]">{t('scholar')}</span>
            </a>
          )}
          {r.researchgate_url && (
            <a
              href={r.researchgate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
              style={{ color: BRAND_COLORS.researchgate }}
            >
              <ResearchGateIcon className="h-4 w-4" />
              <span className="text-[var(--foreground)]">{t('researchgate')}</span>
            </a>
          )}
          {r.orcid && (
            <a
              href={
                r.orcid.startsWith('http')
                  ? r.orcid
                  : `https://orcid.org/${r.orcid}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
              style={{ color: BRAND_COLORS.orcid }}
            >
              <OrcidIcon className="h-4 w-4" />
              <span className="text-[var(--foreground)]">{t('orcid')}</span>
            </a>
          )}
          {r.website && (
            <a
              href={r.website}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent)]"
            >
              {t('website')}
            </a>
          )}
        </div>
      </header>

      {r.research_topics.length > 0 && (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('topics')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {r.research_topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>
      )}

      {r.representative_dois.length > 0 && (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('publications')}
          </h2>
          <ul className="space-y-1 text-sm">
            {r.representative_dois.map((d) => (
              <li key={d}>
                <a
                  href={doiUrl(d)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[var(--foreground)] underline hover:opacity-80"
                >
                  doi.org/{d}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.methodologies.length > 0 && (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('methodologies')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {r.methodologies.map((m) => (
              <span
                key={m}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-sm"
              >
                {methodologyLabel(m, locale)}
              </span>
            ))}
          </div>
        </section>
      )}


      {(r.phd_year || r.phd_institution || r.master_year || r.master_institution) && (
        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('education')}
          </h2>
          <ul className="space-y-1 text-sm">
            {(r.phd_year || r.phd_institution) && (
              <li>
                {t('phdFrom', {
                  year: r.phd_year ?? '—',
                  institution: r.phd_institution ?? '—',
                })}
              </li>
            )}
            {(r.master_year || r.master_institution) && (
              <li>
                {t('masterFrom', {
                  year: r.master_year ?? '—',
                  institution: r.master_institution ?? '—',
                })}
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
