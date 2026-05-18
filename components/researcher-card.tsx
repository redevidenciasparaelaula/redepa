import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import type { ResearcherWithInstitution } from '@/lib/supabase/types';
import { methodologyLabel } from '@/lib/methodologies';
import { MailIcon } from './brand-icons';
import { SaveContactButton } from './save-contact-button';

interface Props {
  researcher: ResearcherWithInstitution;
  locale: Locale;
  isSaved?: boolean;
}

function orcidUrl(value: string): string {
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

export async function ResearcherCard({ researcher, locale, isSaved = false }: Props) {
  const t = await getTranslations('card');
  const tProfile = await getTranslations('profile');
  const r = researcher;
  const title = locale === 'en' ? r.title_en ?? r.title_es : r.title_es ?? r.title_en;
  const instName =
    locale === 'en'
      ? r.institutions?.name_en ?? r.institutions?.name
      : r.institutions?.name;

  const hasContact =
    r.email || r.linkedin_url || r.google_scholar_url || r.researchgate_url || r.orcid;

  return (
    <article className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--epa-blue)] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
            <Link
              href={`/researcher/${r.id}`}
              className="after:absolute after:inset-0 after:content-[''] group-hover:text-[var(--epa-blue)]"
            >
              {r.full_name}
            </Link>
          </h3>
          {title && (
            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{title}</p>
          )}
          {instName && <p className="mt-0.5 truncate text-sm">{instName}</p>}
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {[r.city, r.country].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 text-right text-xs text-[var(--muted)]">
          <SaveContactButton researcherId={r.id} initialSaved={isSaved} size="md" />
          {r.phd_year && <div>{t('phdAt', { year: r.phd_year })}</div>}
          {!r.phd_year && r.master_year && (
            <div>{t('masterAt', { year: r.master_year })}</div>
          )}
        </div>
      </div>

      {r.research_topics.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {r.research_topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]"
            >
              {topic}
            </span>
          ))}
          {r.research_topics.length > 5 && (
            <span className="self-center text-xs text-[var(--muted)]">
              +{r.research_topics.length - 5}
            </span>
          )}
        </div>
      )}

      {r.methodologies.length > 0 && (
        <div className="mt-2 text-xs text-[var(--muted)]">
          {r.methodologies.map((m) => methodologyLabel(m, locale)).join(' · ')}
        </div>
      )}

      {hasContact && (
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 text-xs">
          {r.email && (
            <a
              href={`mailto:${r.email}`}
              className="inline-flex min-w-0 items-center gap-1 truncate text-[var(--foreground)] hover:underline"
              title={tProfile('sendEmail')}
            >
              <MailIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              <span className="truncate">{r.email}</span>
            </a>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {r.linkedin_url && (
              <a
                href={r.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                title={tProfile('linkedin')}
                aria-label={tProfile('linkedin')}
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
                className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                title={tProfile('scholar')}
                aria-label={tProfile('scholar')}
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
                className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                title={tProfile('researchgate')}
                aria-label={tProfile('researchgate')}
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
                className="inline-flex h-5 w-5 shrink-0 transition-opacity hover:opacity-80"
                title={tProfile('orcid')}
                aria-label={tProfile('orcid')}
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
          </span>
        </div>
      )}
    </article>
  );
}
