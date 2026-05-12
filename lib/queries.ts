import { createSupabaseServerClient } from '@/lib/supabase/server';
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
