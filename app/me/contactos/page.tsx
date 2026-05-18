import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { distinctSavedTags, listSavedContacts } from '@/lib/queries';
import { methodologyLabel } from '@/lib/methodologies';
import { ContactsFilters } from '@/components/contacts-filters';
import { ContactTagEditor } from '@/components/contact-tag-editor';
import { ContactNoteEditor } from '@/components/contact-note-editor';
import { SaveContactButton } from '@/components/save-contact-button';
import { MailIcon } from '@/components/brand-icons';
import Image from 'next/image';
import type { Locale } from '@/i18n/config';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function MyContactsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/me/contactos');

  const sp = await searchParams;
  const locale = (await getLocale()) as Locale;
  const tProfile = await getTranslations('profile');

  const tag = pickString(sp.tag);
  const q = pickString(sp.q);

  const [contacts, allTags] = await Promise.all([
    listSavedContacts(user.id, { tag, q }),
    distinctSavedTags(user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow">Mi red personal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Mis contactos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Investigadoras e investigadores que guardaste desde el directorio. Cada
          contacto se puede etiquetar con tags libres (ej.{' '}
          <code className="rounded bg-[var(--accent)] px-1">posibles-coautores</code>
          ,{' '}
          <code className="rounded bg-[var(--accent)] px-1">proyecto-lectura</code>
          ) y guardar una nota privada para recordar de qué hablaron.
        </p>
      </header>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Contactos guardados" value={contacts.length} />
        <Stat label="Tags distintos" value={allTags.length} />
        <Stat
          label="Con nota"
          value={contacts.filter((c) => c.note && c.note.trim()).length}
        />
      </section>

      <ContactsFilters allTags={allTags} initial={{ tag, q }} />

      {contacts.length === 0 ? (
        <EmptyState anyFilter={!!tag || !!q} />
      ) : (
        <ul className="mt-4 space-y-3">
          {contacts.map((c) => {
            const r = c.researcher;
            const title =
              locale === 'en' ? r.title_en ?? r.title_es : r.title_es ?? r.title_en;
            const instName =
              locale === 'en'
                ? r.institutions?.name_en ?? r.institutions?.name
                : r.institutions?.name;
            return (
              <li
                key={c.researcher_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/researcher/${r.id}`}
                      className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--epa-blue)] hover:underline"
                    >
                      {r.full_name}
                    </Link>
                    {title && (
                      <p className="mt-0.5 text-sm text-[var(--muted)]">{title}</p>
                    )}
                    {instName && <p className="mt-0.5 text-sm">{instName}</p>}
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {[r.city, r.country].filter(Boolean).join(', ')}
                      {' · Guardado '}
                      {formatDate(c.saved_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SaveContactButton
                      researcherId={r.id}
                      initialSaved={true}
                      size="md"
                    />
                  </div>
                </div>

                {/* Contactos sociales (compactos) */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {r.email && (
                    <a
                      href={`mailto:${r.email}`}
                      className="inline-flex items-center gap-1 text-[var(--foreground)] hover:underline"
                    >
                      <MailIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
                      {r.email}
                    </a>
                  )}
                  {r.linkedin_url && (
                    <a
                      href={r.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={tProfile('linkedin')}
                      title={tProfile('linkedin')}
                      className="inline-flex h-5 w-5"
                    >
                      <Image
                        src="/social/linkedin.png"
                        alt=""
                        width={300}
                        height={300}
                        className="h-5 w-5 object-contain"
                      />
                    </a>
                  )}
                  {r.google_scholar_url && (
                    <a
                      href={r.google_scholar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={tProfile('scholar')}
                      title={tProfile('scholar')}
                      className="inline-flex h-5 w-5"
                    >
                      <Image
                        src="/social/scholar.png"
                        alt=""
                        width={300}
                        height={300}
                        className="h-5 w-5 object-contain"
                      />
                    </a>
                  )}
                </div>

                {/* Temas (vista rápida) */}
                {r.research_topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.research_topics.slice(0, 5).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs"
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
                  <p className="mt-1.5 text-xs text-[var(--muted)]">
                    {r.methodologies
                      .map((m) => methodologyLabel(m, locale))
                      .join(' · ')}
                  </p>
                )}

                {/* Editor de tags */}
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <ContactTagEditor
                    researcherId={r.id}
                    initialTags={c.tags}
                    suggestions={allTags}
                  />
                </div>

                {/* Editor de nota */}
                <div className="mt-3">
                  <ContactNoteEditor
                    researcherId={r.id}
                    initialNote={c.note}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ anyFilter }: { anyFilter: boolean }) {
  if (anyFilter) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
        No hay contactos con esos filtros.
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm">
      <p className="text-[var(--muted)]">
        Todavía no guardaste contactos.
      </p>
      <Link
        href="/directorio"
        className="mt-3 inline-block rounded-md bg-[var(--epa-green)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--epa-green-dark)]"
      >
        Explorar el directorio →
      </Link>
      <p className="mt-3 text-xs text-[var(--muted)]">
        En el directorio, click en el botón <strong>+</strong> verde de cada
        persona para agregarla a tu lista.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
