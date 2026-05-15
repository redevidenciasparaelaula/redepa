import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createSupabaseAdminClient,
  hasServiceRoleKey,
} from '@/lib/supabase/admin';
import { stripAccents } from '@/lib/text';
import type { Institution, ResearcherWithInstitution } from '@/lib/supabase/types';

const RESEARCHER_COLUMNS =
  'id, full_name, email, institution_id, title_es, title_en, ' +
  'phd_year, phd_institution, master_year, master_institution, ' +
  'research_topics, methodologies, representative_dois, ' +
  'country, city, ' +
  'linkedin_url, google_scholar_url, researchgate_url, orcid, website, ' +
  'photo_url, status, created_at, updated_at, ' +
  'institutions(id, name, name_en, country, city)';

export const SORTABLE_COLUMNS = [
  'full_name',
  'country',
  'city',
  'phd_year',
  'master_year',
] as const;
export type SortColumn = (typeof SORTABLE_COLUMNS)[number];
export type SortDir = 'asc' | 'desc';

export interface SearchFilters {
  q?: string;
  countries?: string[];
  city?: string;
  institutionId?: string;
  topics?: string[];
  methodologies?: string[];
  phdYearFrom?: number;
  phdYearTo?: number;
  masterYearFrom?: number;
  masterYearTo?: number;
  sortBy?: SortColumn;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  rows: ResearcherWithInstitution[];
  total: number;
  page: number;
  pageSize: number;
}

export async function searchResearchers(
  filters: SearchFilters
): Promise<SearchResult> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('researchers')
    .select(RESEARCHER_COLUMNS, { count: 'exact' })
    .eq('status', 'approved');

  if (filters.q && filters.q.trim()) {
    query = query.ilike('full_name', `%${filters.q.trim()}%`);
  }
  if (filters.countries && filters.countries.length > 0) {
    query = query.in('country', filters.countries);
  }
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.institutionId) query = query.eq('institution_id', filters.institutionId);

  // Topics: cada topic es un OR con substring matching, ignorando tildes y
  // mayúsculas. La columna research_topics_text guarda los topics ya
  // normalizados (lower + unaccent), así que al hacer ilike contra el mismo
  // formato, "politica" matchea "políticas educativas".
  if (filters.topics && filters.topics.length > 0) {
    const conds = filters.topics
      .map((t) => {
        const v = stripAccents(t).replace(/[,()]/g, ' ').trim();
        return `research_topics_text.ilike.%${v}%`;
      })
      .join(',');
    query = query.or(conds);
  }
  // Metodologías: usan claves canónicas, OR exacto está bien.
  if (filters.methodologies && filters.methodologies.length > 0) {
    query = query.overlaps('methodologies', filters.methodologies);
  }

  if (filters.phdYearFrom != null) query = query.gte('phd_year', filters.phdYearFrom);
  if (filters.phdYearTo != null) query = query.lte('phd_year', filters.phdYearTo);
  if (filters.masterYearFrom != null)
    query = query.gte('master_year', filters.masterYearFrom);
  if (filters.masterYearTo != null)
    query = query.lte('master_year', filters.masterYearTo);

  const sortBy: SortColumn =
    filters.sortBy && SORTABLE_COLUMNS.includes(filters.sortBy)
      ? filters.sortBy
      : 'full_name';
  const sortDir: SortDir = filters.sortDir === 'desc' ? 'desc' : 'asc';
  query = query
    .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error('searchResearchers error', error);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data ?? []) as unknown as ResearcherWithInstitution[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listResearchersByInstitutions(
  institutionIds: string[]
): Promise<ResearcherWithInstitution[]> {
  if (institutionIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select(RESEARCHER_COLUMNS)
    .in('institution_id', institutionIds)
    .order('full_name', { ascending: true });
  if (error) {
    console.error('listResearchersByInstitutions error', error);
    return [];
  }
  return (data ?? []) as unknown as ResearcherWithInstitution[];
}

export async function listAllResearchers(): Promise<ResearcherWithInstitution[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select(RESEARCHER_COLUMNS)
    .order('full_name', { ascending: true });
  if (error) {
    console.error('listAllResearchers error', error);
    return [];
  }
  return (data ?? []) as unknown as ResearcherWithInstitution[];
}

export async function getResearcher(
  id: string
): Promise<ResearcherWithInstitution | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select(RESEARCHER_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getResearcher error', error);
    return null;
  }
  return data as unknown as ResearcherWithInstitution | null;
}

export async function listInstitutions(): Promise<Institution[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('listInstitutions error', error);
    return [];
  }
  return data ?? [];
}

// Para el sidebar de filtros: solo instituciones con al menos un investigador
// aprobado (mantiene la lista corta y útil aunque la tabla tenga miles de rows).
export async function listInstitutionsInUse(): Promise<Institution[]> {
  const supabase = await createSupabaseServerClient();
  const { data: ids } = await supabase
    .from('researchers')
    .select('institution_id')
    .eq('status', 'approved')
    .not('institution_id', 'is', null);
  const uniqueIds = [...new Set((ids ?? []).map((r) => r.institution_id!))];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .in('id', uniqueIds)
    .order('name', { ascending: true });
  if (error) {
    console.error('listInstitutionsInUse error', error);
    return [];
  }
  return data ?? [];
}

export async function distinctCountries(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select('country')
    .eq('status', 'approved')
    .not('country', 'is', null);
  if (error) return [];
  const set = new Set<string>();
  for (const r of data ?? []) {
    if (r.country) set.add(r.country);
  }
  return [...set].sort();
}

// ---------------------------------------------------------------------
// Lista todos los institution_admins del sistema (uso: tab Admins del
// panel super admin). Combina la tabla institution_admins + el nombre
// de la institución, y trae los emails desde auth.users vía admin client.
// ---------------------------------------------------------------------

export interface InstitutionAdminRow {
  user_id: string;
  email: string;
  institution_id: string;
  institution_name: string;
  created_at: string;
}

export async function listAllInstitutionAdmins(): Promise<InstitutionAdminRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('institution_admins')
    .select('user_id, institution_id, created_at, institutions(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listAllInstitutionAdmins error', error);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  let emailById = new Map<string, string>();
  if (hasServiceRoleKey()) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: usersResp } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of usersResp?.users ?? []) {
        if (u.email) emailById.set(u.id, u.email);
      }
    } catch (e) {
      console.error('listAllInstitutionAdmins admin listUsers error', e);
    }
  }

  return rows.map((r) => {
    // PostgREST devuelve la institución como objeto si la relación es 1-a-1,
    // o como array si la considera 1-a-muchos. Soportamos ambos.
    const inst = Array.isArray(r.institutions) ? r.institutions[0] : r.institutions;
    return {
      user_id: r.user_id,
      email: emailById.get(r.user_id) ?? '(sin email)',
      institution_id: r.institution_id,
      institution_name: inst?.name ?? '—',
      created_at: r.created_at,
    };
  });
}

// ---------------------------------------------------------------------
// Congresos: obtener un congreso con sus tracks por slug.
// Lo usa /congreso/[slug]/page.tsx
// ---------------------------------------------------------------------

export interface CongressTrack {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface CongressWithTracks {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  cfp_open_at: string | null;
  cfp_close_at: string | null;
  notification_at: string | null;
  registration_open_at: string | null;
  status:
    | 'draft'
    | 'cfp_open'
    | 'review'
    | 'program'
    | 'live'
    | 'closed';
  tracks: CongressTrack[];
}

export async function getCongressBySlug(
  slug: string
): Promise<CongressWithTracks | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('congresses')
    .select(
      'id, year, name, slug, theme, start_date, end_date, cfp_open_at, cfp_close_at, notification_at, registration_open_at, status, congress_tracks(id, name, description, display_order)'
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('getCongressBySlug error', error);
    return null;
  }
  if (!data) return null;
  const tracks: CongressTrack[] = (data.congress_tracks ?? [])
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      display_order: t.display_order,
    }))
    .sort((a, b) => a.display_order - b.display_order);
  return {
    id: data.id,
    year: data.year,
    name: data.name,
    slug: data.slug,
    theme: data.theme,
    start_date: data.start_date,
    end_date: data.end_date,
    cfp_open_at: data.cfp_open_at,
    cfp_close_at: data.cfp_close_at,
    notification_at: data.notification_at,
    registration_open_at: data.registration_open_at,
    status: data.status as CongressWithTracks['status'],
    tracks,
  };
}

// ---------------------------------------------------------------------
// listCongresses(): lista todos los congresos para el panel admin.
// Devuelve un resumen ligero (sin tracks) ordenado por año descendente.
// ---------------------------------------------------------------------

export interface CongressSummary {
  id: string;
  year: number;
  name: string;
  slug: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  cfp_open_at: string | null;
  cfp_close_at: string | null;
  status: CongressWithTracks['status'];
  submissions_count: number;
  tracks_count: number;
}

export async function listCongresses(): Promise<CongressSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('congresses')
    .select(
      'id, year, name, slug, theme, start_date, end_date, cfp_open_at, cfp_close_at, status'
    )
    .order('year', { ascending: false });
  if (error) {
    console.error('listCongresses error', error);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Conteos en paralelo: submissions y tracks por congreso
  const counts = await Promise.all(
    data.map(async (c) => {
      const [{ count: subs }, { count: tracks }] = await Promise.all([
        supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('congress_id', c.id),
        supabase
          .from('congress_tracks')
          .select('id', { count: 'exact', head: true })
          .eq('congress_id', c.id),
      ]);
      return { submissions: subs ?? 0, tracks: tracks ?? 0 };
    })
  );

  return data.map((c, i) => ({
    id: c.id,
    year: c.year,
    name: c.name,
    slug: c.slug,
    theme: c.theme,
    start_date: c.start_date,
    end_date: c.end_date,
    cfp_open_at: c.cfp_open_at,
    cfp_close_at: c.cfp_close_at,
    status: c.status as CongressWithTracks['status'],
    submissions_count: counts[i].submissions,
    tracks_count: counts[i].tracks,
  }));
}

// ---------------------------------------------------------------------
// Reviewer pool: combina las filas de reviewer_pool (vía RPC, devuelve
// emails) con los datos del directorio (researchers).
// ---------------------------------------------------------------------

export interface ReviewerPoolMember {
  user_id: string;
  email: string;
  max_load: number;
  topics: string[];
  methodologies: string[];
  active: boolean;
  assignments_count: number;
  // datos enriquecidos desde researchers (pueden faltar si la persona
  // tiene cuenta auth pero no está en el directorio aún)
  researcher: {
    id: string;
    full_name: string;
    institution_name: string | null;
    available_for_review: boolean;
    topics: string[];
    methodologies: string[];
  } | null;
}

export async function getReviewerPoolForCongress(
  congressId: string
): Promise<ReviewerPoolMember[]> {
  const supabase = await createSupabaseServerClient();

  const { data: pool, error } = await supabase.rpc('list_reviewer_pool', {
    p_congress_id: congressId,
  });
  if (error) {
    console.error('list_reviewer_pool error', error);
    return [];
  }
  if (!pool || pool.length === 0) return [];

  // Enriquecer con datos del directorio: matchear por email.
  const emails = pool.map((p) => p.email.toLowerCase());
  const { data: researchers } = await supabase
    .from('researchers')
    .select(
      'id, full_name, email, research_topics, methodologies, available_for_review, institutions(name)'
    )
    .in('email', emails);

  const byEmail = new Map<
    string,
    {
      id: string;
      full_name: string;
      institution_name: string | null;
      available_for_review: boolean;
      topics: string[];
      methodologies: string[];
    }
  >();
  for (const r of researchers ?? []) {
    byEmail.set(r.email.toLowerCase(), {
      id: r.id,
      full_name: r.full_name,
      institution_name:
        (r.institutions as { name: string } | null)?.name ?? null,
      available_for_review: r.available_for_review,
      topics: r.research_topics ?? [],
      methodologies: r.methodologies ?? [],
    });
  }

  return pool.map((p) => ({
    user_id: p.user_id,
    email: p.email,
    max_load: p.max_load,
    topics: p.topics ?? [],
    methodologies: p.methodologies ?? [],
    active: p.active,
    assignments_count: p.assignments_count,
    researcher: byEmail.get(p.email.toLowerCase()) ?? null,
  }));
}

// Researchers que marcaron 'disponible para revisar' Y que aún no están
// en el pool del congreso indicado. Útil para el panel "Agregar al pool".
export interface AvailableReviewerCandidate {
  id: string;
  full_name: string;
  email: string;
  institution_name: string | null;
  topics: string[];
  methodologies: string[];
}

export async function getAvailableReviewersNotInPool(
  congressId: string
): Promise<AvailableReviewerCandidate[]> {
  const supabase = await createSupabaseServerClient();

  const { data: researchers, error: rErr } = await supabase
    .from('researchers')
    .select(
      'id, full_name, email, research_topics, methodologies, institutions(name)'
    )
    .eq('available_for_review', true)
    .eq('status', 'approved')
    .order('full_name', { ascending: true });
  if (rErr) {
    console.error('getAvailableReviewersNotInPool error', rErr);
    return [];
  }
  if (!researchers || researchers.length === 0) return [];

  const { data: pool } = await supabase.rpc('list_reviewer_pool', {
    p_congress_id: congressId,
  });
  const inPool = new Set(
    (pool ?? []).map((p) => p.email.toLowerCase())
  );

  return researchers
    .filter((r) => !inPool.has(r.email.toLowerCase()))
    .map((r) => ({
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      institution_name:
        (r.institutions as { name: string } | null)?.name ?? null,
      topics: r.research_topics ?? [],
      methodologies: r.methodologies ?? [],
    }));
}

export async function distinctTopics(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select('research_topics')
    .eq('status', 'approved');
  if (error) return [];
  const set = new Set<string>();
  for (const r of data ?? []) {
    for (const t of r.research_topics ?? []) {
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
