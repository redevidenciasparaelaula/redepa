import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import {
  distinctSavedTags,
  listSavedContacts,
  type SavedContactsSort,
} from '@/lib/queries';
import { methodologyLabel } from '@/lib/methodologies';
import { ContactsTagBar } from '@/components/contacts-tag-bar';
import { ContactsSortDropdown } from '@/components/contacts-sort-dropdown';
import { CollapsibleFilters } from '@/components/collapsible-filters';
import { SearchFilters } from '@/components/search-filters';
import { ContactTagEditor } from '@/components/contact-tag-editor';
import { ContactNoteEditor } from '@/components/contact-note-editor';
import { SaveContactButton } from '@/components/save-contact-button';
import { MailIcon } from '@/components/brand-icons';
import Image from 'next/image';
import type { Locale } from '@/i18n/config';
import type { Institution } from '@/lib/supabase/types';

interface Props {
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

const VALID_SORTS: SavedContactsSort[] = [
  'recent',
  'oldest',
  'name-asc',
  'name-desc',
  'phd-recent',
  'phd-oldest',
];

export default async function MyContactsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/me/contactos');

  const sp = await searchParams;
  const locale = (await getLocale()) as Locale;
  const tProfile = await getTranslations('profile');

  // Tags: el filtro de tags es propio de "Mis contactos", llega como ?tags=a,b
  const tagsParam = pickString(sp.tags);
  const selectedTags = tagsParam
    ? tagsParam.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];

  // Sort
  const sortRaw = pickString(sp.sort);
  const sort: SavedContactsSort =
    sortRaw && VALID_SORTS.includes(sortRaw as SavedContactsSort)
      ? (sortRaw as SavedContactsSort)
      : 'recent';

  // withNote: 'yes' | 'no' | undefined
  const withNoteRaw = pickString(sp.withNote);
  const withNote: 'yes' | 'no' | undefined =
    withNoteRaw === 'yes' ? 'yes' : withNoteRaw === 'no' ? 'no' : undefined;

  const filters = {
    q: pickString(sp.q),
    tags: selectedTags,
    countries: pickArray(sp.country),
    city: pickString(sp.city),
    institutionId: pickString(sp.institution),
    topics: pickArray(sp.topic),
    methodologies: pickArray(sp.methodology),
    phdYearFrom: pickInt(sp.phdYearFrom),
    phdYearTo: pickInt(sp.phdYearTo),
    masterYearFrom: pickInt(sp.masterYearFrom),
    masterYearTo: pickInt(sp.masterYearTo),
    withNote,
    sort,
  };

  // Trae los guardados con filtros + sort aplicados
  const [contacts, allTags] = await Promise.all([
    listSavedContacts(user.id, filters),
    distinctSavedTags(user.id),
  ]);

  // Trae TAMBIÉN un listado sin filtros para computar las facetas
  // (countries, institutions, topics, methodologies) propias del set
  // guardado por este usuario. Solo se hace si hay contactos guardados.
  const facets = await getFacetsForUserSavedContacts(user.id);

  const hasAnyFilter =
    !!filters.q ||
    filters.tags.length > 0 ||
    filters.countries.length > 0 ||
    !!filters.city ||
    !!filters.institutionId ||
    filters.topics.length > 0 ||
    filters.methodologies.length > 0 ||
    filters.phdYearFrom != null ||
    filters.phdYearTo != null ||
    filters.masterYearFrom != null ||
    filters.masterYearTo != null ||
    !!filters.withNote;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="eyebrow">Mi red personal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Mis contactos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Investigadoras e investigadores que has guardado desde el directorio.
          La búsqueda mira nombre, institución, ciudad, temas, tags y la nota
          privada que escribiste.
        </p>
      </header>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total guardados" value={facets.totalContacts} />
        <Stat label="Tags distintos" value={allTags.length} />
        <Stat
          label="Con nota"
          value={facets.withNoteCount}
        />
        <Stat label="Resultados" value={contacts.length} highlight />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar de filtros: reutiliza SearchFilters pero con basePath
            apuntando a /me/contactos para que NO redirija al directorio
            al aplicar / limpiar. Las facetas (países, instituciones, temas)
            vienen solo del set guardado del usuario. */}
        <aside>
          <CollapsibleFilters label="Buscar entre mis contactos">
            <SearchFilters
              basePath="/me/contactos"
              title="Buscar entre mis contactos"
              initial={{
                q: filters.q,
                countries: filters.countries,
                city: filters.city,
                institutionId: filters.institutionId,
                topics: filters.topics,
                methodologies: filters.methodologies,
                phdYearFrom: filters.phdYearFrom,
                phdYearTo: filters.phdYearTo,
                masterYearFrom: filters.masterYearFrom,
                masterYearTo: filters.masterYearTo,
              }}
              institutions={facets.institutions}
              countries={facets.countries}
              topicSuggestions={facets.topics}
            />
          </CollapsibleFilters>
        </aside>

        <section>
          {/* Barra de control: sort + tags (la búsqueda 'q' vive en el
              sidebar de filtros) */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ContactsSortDropdown current={sort} />
            </div>
            {allTags.length > 0 && (
              <ContactsTagBar
                allTags={allTags}
                selected={selectedTags}
                withNote={withNote}
              />
            )}
            {hasAnyFilter && (
              <Link
                href="/me/contactos"
                className="inline-block text-xs text-[var(--muted)] hover:underline"
              >
                Limpiar todos los filtros
              </Link>
            )}
          </div>

          {contacts.length === 0 ? (
            <EmptyState anyFilter={hasAnyFilter} />
          ) : (
            <ul className="space-y-3">
              {contacts.map((c) => {
                const r = c.researcher;
                const title =
                  locale === 'en'
                    ? r.title_en ?? r.title_es
                    : r.title_es ?? r.title_en;
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
        </section>
      </div>
    </div>
  );
}

// =====================================================================
// Facetas: distincts del set guardado del usuario
// =====================================================================
async function getFacetsForUserSavedContacts(userId: string): Promise<{
  totalContacts: number;
  withNoteCount: number;
  countries: string[];
  institutions: Institution[];
  topics: string[];
}> {
  // Reusa listSavedContacts sin filtros para tener TODO el set, y de ahí
  // computar las facetas. El set por usuario es pequeño.
  const all = await listSavedContacts(userId, { sort: 'recent' });
  const countries = new Set<string>();
  const institutionMap = new Map<string, Institution>();
  const topics = new Set<string>();
  let withNoteCount = 0;

  for (const c of all) {
    if (c.researcher.country) countries.add(c.researcher.country);
    if (c.researcher.institutions) {
      // El embed de ResearcherWithInstitution trae solo algunos campos de la
      // institución (Pick<Institution,...>). SearchFilters solo usa id+name,
      // así que rellenamos los faltantes con defaults seguros para el cast.
      const inst = c.researcher.institutions;
      institutionMap.set(inst.id, {
        ...inst,
        website: null,
        created_at: '',
      });
    }
    for (const t of c.researcher.research_topics ?? []) {
      if (t) topics.add(t);
    }
    if (c.note && c.note.trim()) withNoteCount += 1;
  }

  return {
    totalContacts: all.length,
    withNoteCount,
    countries: [...countries].sort(),
    institutions: [...institutionMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    topics: [...topics].sort(),
  };
}

function EmptyState({ anyFilter }: { anyFilter: boolean }) {
  if (anyFilter) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
        No hay contactos con esos filtros.{' '}
        <Link href="/me/contactos" className="text-[var(--epa-blue)] underline">
          Limpiar
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm">
      <p className="text-[var(--muted)]">
        Todavía no has guardado contactos.
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

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-4 ' +
        (highlight
          ? 'border-[var(--epa-blue)] bg-[var(--card)]'
          : 'border-[var(--border)] bg-[var(--card)]')
      }
    >
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
