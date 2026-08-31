import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createSupabaseAdminClient,
  hasServiceRoleKey,
} from '@/lib/supabase/admin';
import { stripAccents, singularize } from '@/lib/text';
import type { Institution, ResearcherWithInstitution } from '@/lib/supabase/types';

const RESEARCHER_COLUMNS =
  'id, full_name, email, institution_id, title_es, title_en, ' +
  'phd_year, phd_institution, master_year, master_institution, ' +
  'research_topics, methodologies, representative_dois, ' +
  'country, city, ' +
  'linkedin_url, google_scholar_url, researchgate_url, orcid, website, ' +
  'photo_url, status, available_for_review, created_at, updated_at, ' +
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
  // Page sizes válidas: 25, 50, 100, o 'todos' (representado como 1000 para
  // tener un techo razonable). Default 25.
  const requested = filters.pageSize ?? 25;
  const pageSize = Math.max(1, Math.min(1000, requested));
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

  // Topics: cada topic se descompone en palabras singularizadas y se exige
  // que TODAS las palabras estén presentes en research_topics_text. Múltiples
  // topics del usuario se OR-ean entre sí. La columna almacena los temas ya
  // unaccent+lower (migración 008), así que comparamos ya normalizado.
  //
  // Por qué singularizar: "política educativa" debe matchear "políticas
  // educativas" (y viceversa). Como ilike de una palabra singular coincide
  // como substring contra la plural (politica ⊂ politicas), basta
  // singularizar la query y hacer AND entre las palabras de cada topic.
  if (filters.topics && filters.topics.length > 0) {
    const groups = filters.topics
      .map((t) => {
        const normalized = stripAccents(t).replace(/[,()]/g, ' ').trim();
        const words = normalized
          .split(/\s+/)
          .filter(Boolean)
          .map(singularize);
        if (words.length === 0) return null;
        if (words.length === 1) {
          return `research_topics_text.ilike.%${words[0]}%`;
        }
        // and(...) inside or(...): exige que todas las palabras aparezcan
        // (pueden estar separadas en el texto del topic guardado).
        const andClauses = words.map(
          (w) => `research_topics_text.ilike.%${w}%`
        );
        return `and(${andClauses.join(',')})`;
      })
      .filter((g): g is string => g !== null);

    if (groups.length > 0) {
      query = query.or(groups.join(','));
    }
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
  location: string | null;
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
  // Config del formulario de postulación
  submission_intro: string | null;
  submission_max_chars: number | null;
  submission_types_allowed: ('oral' | 'poster' | 'symposium')[];
  abstract_field_labels: Record<string, string> | null;
  tracks: CongressTrack[];
}

export async function getCongressBySlug(
  slug: string
): Promise<CongressWithTracks | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('congresses')
    .select(
      'id, year, name, slug, theme, location, start_date, end_date, cfp_open_at, cfp_close_at, notification_at, registration_open_at, status, submission_intro, submission_max_chars, submission_types_allowed, abstract_field_labels, congress_tracks(id, name, description, display_order)'
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
    location: data.location ?? null,
    start_date: data.start_date,
    end_date: data.end_date,
    cfp_open_at: data.cfp_open_at,
    cfp_close_at: data.cfp_close_at,
    notification_at: data.notification_at,
    registration_open_at: data.registration_open_at,
    status: data.status as CongressWithTracks['status'],
    submission_intro: data.submission_intro ?? null,
    submission_max_chars: data.submission_max_chars ?? null,
    submission_types_allowed: (data.submission_types_allowed ?? [
      'oral',
      'poster',
      'symposium',
    ]) as ('oral' | 'poster' | 'symposium')[],
    abstract_field_labels:
      (data.abstract_field_labels as Record<string, string> | null) ?? null,
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
    console.error('[reviewer-pool] list_reviewer_pool error', {
      congressId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  console.log('[reviewer-pool] list_reviewer_pool', {
    congressId,
    count: pool?.length ?? 0,
  });
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

// ---------------------------------------------------------------------
// Congress subscribers — solo super-admin puede leer
// ---------------------------------------------------------------------

export interface CongressSubscriberRow {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export async function listCongressSubscribers(
  congressId: string
): Promise<CongressSubscriberRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('congress_subscribers')
    .select('id, email, name, created_at')
    .eq('congress_id', congressId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listCongressSubscribers error', error);
    return [];
  }
  return data ?? [];
}

export async function countCongressSubscribers(
  congressId: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('congress_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('congress_id', congressId);
  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------
// Submissions + authors — para el flujo de postulación
// ---------------------------------------------------------------------

import type { Submission, SubmissionAuthor } from '@/lib/supabase/types';

export interface SubmissionListItem {
  id: string;
  title: string;
  status: Submission['status'];
  type: Submission['type'];
  track_name: string | null;
  updated_at: string;
  submitted_at: string | null;
}

// Devuelve las postulaciones del usuario actual para un congreso.
// Por RLS, las submissions solo son visibles si el usuario es autor.
export async function listMySubmissionsForCongress(
  congressId: string,
  userId: string
): Promise<SubmissionListItem[]> {
  const supabase = await createSupabaseServerClient();
  // Sacamos los submission_ids donde soy autor.
  const { data: authorRows, error: authorErr } = await supabase
    .from('submission_authors')
    .select('submission_id')
    .eq('user_id', userId);
  if (authorErr) {
    console.error('listMySubmissionsForCongress (authors)', authorErr);
    return [];
  }
  const ids = (authorRows ?? []).map((r) => r.submission_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, title, status, type, updated_at, submitted_at, track_id, congress_tracks(name)'
    )
    .eq('congress_id', congressId)
    .in('id', ids)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('listMySubmissionsForCongress (submissions)', error);
    return [];
  }
  return (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    type: s.type,
    track_name: (s.congress_tracks as { name: string } | null)?.name ?? null,
    updated_at: s.updated_at,
    submitted_at: s.submitted_at,
  }));
}

// Autor de una postulación enriquecido con el nombre de la institución
// resuelto (por si tiene institution_id). Para el editor, así el postulante
// no ve "En directorio" abstracto sino el nombre real.
export type SubmissionAuthorEnriched = SubmissionAuthor & {
  institution_name: string | null;
};

export interface FullSubmission extends Submission {
  authors: SubmissionAuthorEnriched[];
}

export async function getSubmission(
  id: string
): Promise<FullSubmission | null> {
  const supabase = await createSupabaseServerClient();
  const { data: s, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getSubmission', error);
    return null;
  }
  if (!s) return null;

  const { data: authors } = await supabase
    .from('submission_authors')
    .select('*, institutions(name)')
    .eq('submission_id', id)
    .order('display_order', { ascending: true });

  const enriched: SubmissionAuthorEnriched[] = (authors ?? []).map((a) => {
    const inst = (a as unknown as { institutions: { name: string } | null })
      .institutions;
    return {
      ...(a as unknown as SubmissionAuthor),
      institution_name:
        (a as { external_institution_name?: string | null })
          .external_institution_name ?? inst?.name ?? null,
    };
  });

  return { ...(s as Submission), authors: enriched };
}

// ---------------------------------------------------------------------
// Admin de postulaciones del congreso
// ---------------------------------------------------------------------

export interface AdminSubmissionRow {
  id: string;
  title: string;
  status: Submission['status'];
  type: Submission['type'];
  track_id: string | null;
  track_name: string | null;
  authors_count: number;
  authors_names: string | null;
  assignments_count: number;
  reviews_completed: number;
  updated_at: string;
  submitted_at: string | null;
}

export async function listSubmissionsForAdmin(
  congressId: string
): Promise<AdminSubmissionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_submissions_for_admin', {
    p_congress_id: congressId,
  });
  if (error) {
    console.error('listSubmissionsForAdmin', error);
    return [];
  }
  return data ?? [];
}

export interface AssignmentRow {
  assignment_id: string;
  reviewer_user_id: string;
  reviewer_email: string;
  reviewer_name: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'declined';
  assigned_at: string;
  deadline_at: string | null;
  review_submitted: boolean;
}

export async function listAssignmentsForSubmission(
  submissionId: string
): Promise<AssignmentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'list_assignments_for_submission',
    { p_submission_id: submissionId }
  );
  if (error) {
    console.error('listAssignmentsForSubmission', error);
    return [];
  }
  return data ?? [];
}

// ---------------------------------------------------------------------
// Review Overview: query unificado que alimenta las dos vistas admin
// (por postulación y por revisor). Corre en un solo trip: 4 queries
// paralelas + joins en JS. Devuelve estructuras enriquecidas listas
// para renderizar y filtrar sin más DB roundtrips.
// ---------------------------------------------------------------------

export interface AssignmentDetail {
  submission_id: string; // referencia al submission (útil al agrupar por revisor)
  assignment_id: string;
  reviewer_user_id: string;
  reviewer_email: string;
  reviewer_name: string;
  assignment_status: 'pending' | 'in_progress' | 'submitted' | 'declined';
  review_submitted: boolean;
  recommendation: string | null;
  deadline_at: string | null;
  assigned_at: string;
  reviewed_at: string | null; // reviews.submitted_at
}

export interface SubmissionOverview {
  id: string;
  title: string;
  status: Submission['status'];
  type: Submission['type'];
  track_id: string | null;
  track_name: string | null;
  authors_count: number;
  authors_names: string; // "Ana Pérez, Luis Fuentes"
  updated_at: string;
  submitted_at: string | null;
  decision_at: string | null;
  decision_note: string | null;
  assignments: AssignmentDetail[];
  reviews_completed: number;
}

export interface ReviewerAssignmentDetail {
  submission_id: string;
  submission_title: string;
  submission_status: Submission['status'];
  track_name: string | null;
  assignment_status: 'pending' | 'in_progress' | 'submitted' | 'declined';
  review_submitted: boolean;
  recommendation: string | null;
  deadline_at: string | null;
  assigned_at: string;
  reviewed_at: string | null;
}

export interface PoolMemberOverview {
  user_id: string;
  email: string;
  full_name: string;
  institution_name: string | null;
  active: boolean;
  max_load: number;
  topics: string[]; // líneas temáticas que puede revisar
  assignments: ReviewerAssignmentDetail[];
  assignments_count: number;
  reviews_completed: number;
  last_activity_at: string | null; // último assigned_at o reviewed_at
}

export async function getReviewOverviewForCongress(
  congressId: string
): Promise<{
  submissions: SubmissionOverview[];
  poolMembers: PoolMemberOverview[];
}> {
  const supabase = await createSupabaseServerClient();

  // Traemos primero submissions del congreso (que después usamos para
  // filtrar assignments y reviews porque esas tablas no tienen congress_id
  // directo — el vínculo es siempre vía submission_id).
  const submissionsRes = await supabase
    .from('submissions')
    .select(
      'id, title, status, type, track_id, updated_at, submitted_at, decision_at, decision_note, congress_tracks(name)'
    )
    .eq('congress_id', congressId);

  const submissionIds = ((submissionsRes.data ?? []) as { id: string }[]).map(
    (s) => s.id
  );

  // 4 en paralelo ahora que sabemos qué submissions filtrar.
  const [poolMembers, authorsRes, assignmentsRes, reviewsRes] =
    await Promise.all([
      getReviewerPoolForCongress(congressId),
      submissionIds.length === 0
        ? Promise.resolve({ data: [] as unknown[] })
        : supabase
            .from('submission_authors')
            .select('submission_id, full_name, display_order')
            .in('submission_id', submissionIds)
            .order('display_order', { ascending: true }),
      submissionIds.length === 0
        ? Promise.resolve({ data: [] as unknown[] })
        : supabase
            .from('review_assignments')
            .select(
              'id, submission_id, reviewer_user_id, status, deadline_at, assigned_at'
            )
            .in('submission_id', submissionIds),
      // Reviews viven joineadas por assignment_id → traemos también el
      // assignment para saber submission + reviewer.
      submissionIds.length === 0
        ? Promise.resolve({ data: [] as unknown[] })
        : supabase
            .from('reviews')
            .select(
              'assignment_id, recommendation, submitted_at, review_assignments!inner(submission_id, reviewer_user_id)'
            )
            .in('review_assignments.submission_id', submissionIds),
    ]);

  const submissionRows = (submissionsRes.data ??
    []) as unknown as {
    id: string;
    title: string;
    status: Submission['status'];
    type: Submission['type'];
    track_id: string | null;
    updated_at: string;
    submitted_at: string | null;
    decision_at: string | null;
    decision_note: string | null;
    congress_tracks: { name: string } | null;
  }[];

  // Autores agrupados por submission_id (ya ordenados por display_order).
  // Filtramos localmente a solo los submissions de este congreso.
  const validSubIds = new Set(submissionRows.map((s) => s.id));
  const authorsBySub = new Map<string, string[]>();
  const authorCountBySub = new Map<string, number>();
  for (const a of (authorsRes.data ?? []) as {
    submission_id: string;
    full_name: string;
    display_order: number;
  }[]) {
    if (!validSubIds.has(a.submission_id)) continue;
    const list = authorsBySub.get(a.submission_id) ?? [];
    list.push(a.full_name);
    authorsBySub.set(a.submission_id, list);
    authorCountBySub.set(
      a.submission_id,
      (authorCountBySub.get(a.submission_id) ?? 0) + 1
    );
  }

  // Reviews agrupadas por (submission, reviewer) para poder cruzar con
  // assignments y saber si ya está entregada + recomendación + fecha.
  // La forma de la fila viene del join implícito (!inner) con
  // review_assignments.
  type ReviewJoinRow = {
    assignment_id: string;
    recommendation: string | null;
    submitted_at: string | null;
    review_assignments: {
      submission_id: string;
      reviewer_user_id: string;
    } | null;
  };
  const reviewByKey = new Map<
    string,
    { recommendation: string | null; submitted_at: string | null }
  >();
  for (const r of (reviewsRes.data ?? []) as unknown as ReviewJoinRow[]) {
    const ra = r.review_assignments;
    if (!ra) continue;
    reviewByKey.set(`${ra.submission_id}::${ra.reviewer_user_id}`, {
      recommendation: r.recommendation,
      submitted_at: r.submitted_at,
    });
  }

  // Índice de revisores por user_id (para nombre y email).
  const reviewerById = new Map<
    string,
    { name: string; email: string }
  >();
  for (const m of poolMembers) {
    reviewerById.set(m.user_id, {
      name: m.researcher?.full_name ?? m.email.split('@')[0] ?? m.email,
      email: m.email,
    });
  }

  // Construimos AssignmentDetail por submission.
  type AssignmentRow = {
    id: string;
    submission_id: string;
    reviewer_user_id: string;
    status: 'pending' | 'in_progress' | 'submitted' | 'declined';
    deadline_at: string | null;
    assigned_at: string;
  };
  const assignmentsBySub = new Map<string, AssignmentDetail[]>();
  const assignmentsByReviewer = new Map<string, AssignmentDetail[]>();
  for (const a of (assignmentsRes.data ?? []) as unknown as AssignmentRow[]) {
    const key = `${a.submission_id}::${a.reviewer_user_id}`;
    const review = reviewByKey.get(key);
    const revInfo = reviewerById.get(a.reviewer_user_id);
    const detail: AssignmentDetail = {
      submission_id: a.submission_id,
      assignment_id: a.id,
      reviewer_user_id: a.reviewer_user_id,
      reviewer_email: revInfo?.email ?? 'desconocido',
      reviewer_name: revInfo?.name ?? 'Sin nombre',
      assignment_status: a.status,
      review_submitted: !!review?.submitted_at,
      recommendation: review?.recommendation ?? null,
      deadline_at: a.deadline_at,
      assigned_at: a.assigned_at,
      reviewed_at: review?.submitted_at ?? null,
    };

    const listA = assignmentsBySub.get(a.submission_id) ?? [];
    listA.push(detail);
    assignmentsBySub.set(a.submission_id, listA);

    const listR = assignmentsByReviewer.get(a.reviewer_user_id) ?? [];
    listR.push(detail);
    assignmentsByReviewer.set(a.reviewer_user_id, listR);
  }

  // Ensamblar SubmissionOverview[].
  const submissions: SubmissionOverview[] = submissionRows.map((s) => {
    const assigns = assignmentsBySub.get(s.id) ?? [];
    const reviewsCompleted = assigns.filter((a) => a.review_submitted).length;
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      type: s.type,
      track_id: s.track_id,
      track_name: s.congress_tracks?.name ?? null,
      authors_count: authorCountBySub.get(s.id) ?? 0,
      authors_names: (authorsBySub.get(s.id) ?? []).join(', '),
      updated_at: s.updated_at,
      submitted_at: s.submitted_at,
      decision_at: s.decision_at,
      decision_note: s.decision_note,
      assignments: assigns,
      reviews_completed: reviewsCompleted,
    };
  });

  // Ensamblar PoolMemberOverview[]: usamos poolMembers + assignmentsByReviewer.
  // Necesitamos, por assignment del revisor, el título / línea de la
  // postulación, que ya tenemos en el mapa de submissionRows.
  const subById = new Map<
    string,
    { title: string; status: Submission['status']; track_name: string | null }
  >();
  for (const s of submissionRows) {
    subById.set(s.id, {
      title: s.title,
      status: s.status,
      track_name: s.congress_tracks?.name ?? null,
    });
  }

  const poolOverview: PoolMemberOverview[] = poolMembers.map((m) => {
    const raw = assignmentsByReviewer.get(m.user_id) ?? [];
    const enriched: ReviewerAssignmentDetail[] = raw.map((a) => {
      const sub = subById.get(a.submission_id);
      return {
        submission_id: a.submission_id,
        submission_title: sub?.title ?? '—',
        submission_status: sub?.status ?? 'submitted',
        track_name: sub?.track_name ?? null,
        assignment_status: a.assignment_status,
        review_submitted: a.review_submitted,
        recommendation: a.recommendation,
        deadline_at: a.deadline_at,
        assigned_at: a.assigned_at,
        reviewed_at: a.reviewed_at,
      };
    });
    const reviewsCompleted = enriched.filter((a) => a.review_submitted).length;
    // "Última actividad": max(assigned_at, reviewed_at) sobre todas sus asignaciones
    let lastActivity: string | null = null;
    for (const a of enriched) {
      const stamps = [a.assigned_at, a.reviewed_at].filter(
        (x): x is string => !!x
      );
      for (const s of stamps) {
        if (!lastActivity || s > lastActivity) lastActivity = s;
      }
    }
    return {
      user_id: m.user_id,
      email: m.email,
      full_name: m.researcher?.full_name ?? m.email.split('@')[0] ?? m.email,
      institution_name: m.researcher?.institution_name ?? null,
      active: m.active,
      max_load: m.max_load,
      topics: m.topics,
      assignments: enriched,
      assignments_count: enriched.length,
      reviews_completed: reviewsCompleted,
      last_activity_at: lastActivity,
    };
  });

  return { submissions, poolMembers: poolOverview };
}

// ---------------------------------------------------------------------
// loadAutoAssignData: carga en un solo llamado todo lo necesario para
// correr el algoritmo de auto-asignación (lib/auto-assign.ts).
// ---------------------------------------------------------------------

import type {
  AutoAssignPoolMember,
  AutoAssignSubmission,
} from '@/lib/auto-assign';

export async function loadAutoAssignData(congressId: string): Promise<{
  pool: AutoAssignPoolMember[];
  submissions: AutoAssignSubmission[];
}> {
  const supabase = await createSupabaseServerClient();

  // 1) Pool + info de directorio en paralelo con los submissions
  const [poolMembersRes, submissionsRes] = await Promise.all([
    getReviewerPoolForCongress(congressId),
    supabase
      .from('submissions')
      .select(
        'id, title, status, track_id, keywords, congress_tracks(name)'
      )
      .eq('congress_id', congressId)
      .in('status', ['submitted', 'under_review']),
  ]);

  const submissionRows =
    (submissionsRes.data as
      | {
          id: string;
          title: string;
          status: AutoAssignSubmission['status'];
          track_id: string | null;
          keywords: string[] | null;
          congress_tracks: { name: string } | null;
        }[]
      | null) ?? [];

  if (submissionRows.length === 0) {
    return {
      pool: poolMembersRes.map(toAutoAssignPoolMember),
      submissions: [],
    };
  }

  const submissionIds = submissionRows.map((s) => s.id);

  // 2) Asignaciones existentes + autores (con institución) en paralelo.
  //    Los autores traen institución de dos fuentes:
  //      - external_institution_name: cuando el autor es externo, escrito a mano.
  //      - institutions(name) vía institution_id: cuando está enlazado a una del directorio.
  const [assignmentsRes, authorsRes] = await Promise.all([
    supabase
      .from('review_assignments')
      .select('submission_id, reviewer_user_id')
      .in('submission_id', submissionIds),
    supabase
      .from('submission_authors')
      .select(
        'submission_id, user_id, external_institution_name, institutions(name)'
      )
      .in('submission_id', submissionIds),
  ]);

  const assignmentsBySub = new Map<string, string[]>();
  for (const a of assignmentsRes.data ?? []) {
    const list = assignmentsBySub.get(a.submission_id) ?? [];
    list.push(a.reviewer_user_id);
    assignmentsBySub.set(a.submission_id, list);
  }

  const authorsBySub = new Map<string, string[]>();
  const authorInstitutionsBySub = new Map<string, (string | null)[]>();
  for (const a of (authorsRes.data ?? []) as unknown as {
    submission_id: string;
    user_id: string | null;
    external_institution_name: string | null;
    institutions: { name: string } | null;
  }[]) {
    if (a.user_id) {
      const list = authorsBySub.get(a.submission_id) ?? [];
      list.push(a.user_id);
      authorsBySub.set(a.submission_id, list);
    }
    const instName = a.external_institution_name ?? a.institutions?.name ?? null;
    const instList = authorInstitutionsBySub.get(a.submission_id) ?? [];
    instList.push(instName);
    authorInstitutionsBySub.set(a.submission_id, instList);
  }

  return {
    pool: poolMembersRes.map(toAutoAssignPoolMember),
    submissions: submissionRows.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      track_id: s.track_id,
      track_name: s.congress_tracks?.name ?? null,
      keywords: s.keywords ?? [],
      existing_reviewer_ids: assignmentsBySub.get(s.id) ?? [],
      author_user_ids: authorsBySub.get(s.id) ?? [],
      author_institutions: authorInstitutionsBySub.get(s.id) ?? [],
    })),
  };
}

function toAutoAssignPoolMember(m: ReviewerPoolMember): AutoAssignPoolMember {
  return {
    user_id: m.user_id,
    email: m.email,
    full_name: m.researcher?.full_name ?? m.email.split('@')[0] ?? m.email,
    active: m.active,
    max_load: m.max_load,
    current_load: m.assignments_count,
    topics: m.topics,
    institution_name: m.researcher?.institution_name ?? null,
  };
}

// ---------------------------------------------------------------------
// suggestReviewersForSubmission: ranking del pool por match con el
// submission. La lógica vive en JS para que sea fácil iterar y depurar.
// ---------------------------------------------------------------------

export interface ReviewerSuggestion {
  user_id: string;
  email: string;
  full_name: string;
  institution_name: string | null;
  topics: string[];
  methodologies: string[];
  max_load: number;
  current_load: number; // assignments en este congreso
  capacity_left: number;
  match_score: number;
  match_keywords: string[];
  match_methodologies: string[];
  is_already_assigned: boolean;
  is_conflict: boolean; // es autor del submission
}

export async function suggestReviewersForSubmission(
  submissionId: string,
  congressId: string
): Promise<ReviewerSuggestion[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: sub }, { data: authors }, { data: pool }, { data: existing }] =
    await Promise.all([
      supabase
        .from('submissions')
        .select('keywords, methodologies')
        .eq('id', submissionId)
        .maybeSingle(),
      supabase
        .from('submission_authors')
        .select('user_id')
        .eq('submission_id', submissionId),
      supabase.rpc('list_reviewer_pool', { p_congress_id: congressId }),
      supabase
        .from('review_assignments')
        .select('reviewer_user_id')
        .eq('submission_id', submissionId),
    ]);

  if (!sub || !pool) return [];

  const authorIds = new Set(
    (authors ?? []).map((a) => a.user_id).filter((x): x is string => !!x)
  );
  const assignedIds = new Set(
    (existing ?? []).map((a) => a.reviewer_user_id)
  );

  // Trae nombres + institución desde researchers para enriquecer.
  const emails = pool.map((p) => p.email.toLowerCase());
  const { data: researchers } = await supabase
    .from('researchers')
    .select('email, full_name, institutions(name)')
    .in('email', emails);
  const byEmail = new Map<string, { full_name: string; institution: string | null }>();
  for (const r of researchers ?? []) {
    byEmail.set(r.email.toLowerCase(), {
      full_name: r.full_name,
      institution: (r.institutions as { name: string } | null)?.name ?? null,
    });
  }

  const subKeywords = new Set(
    (sub.keywords ?? []).map((k) => k.toLowerCase())
  );
  const subMethods = new Set(
    (sub.methodologies ?? []).map((m) => m.toLowerCase())
  );

  const suggestions: ReviewerSuggestion[] = pool
    .filter((p) => p.active)
    .map((p) => {
      const topics = (p.topics ?? []).map((t) => t.toLowerCase());
      const methods = (p.methodologies ?? []).map((m) => m.toLowerCase());

      const matchKw = topics.filter((t) => subKeywords.has(t));
      const matchMe = methods.filter((m) => subMethods.has(m));

      // Topics pesan más que metodologías en el match.
      const matchScore = matchKw.length * 2 + matchMe.length;

      const info = byEmail.get(p.email.toLowerCase());
      return {
        user_id: p.user_id,
        email: p.email,
        full_name: info?.full_name ?? p.email.split('@')[0],
        institution_name: info?.institution ?? null,
        topics: p.topics ?? [],
        methodologies: p.methodologies ?? [],
        max_load: p.max_load,
        current_load: p.assignments_count,
        capacity_left: p.max_load - p.assignments_count,
        match_score: matchScore,
        match_keywords: matchKw,
        match_methodologies: matchMe,
        is_already_assigned: assignedIds.has(p.user_id),
        is_conflict: authorIds.has(p.user_id),
      };
    })
    // Ordena: primero los con match score alto, luego con capacidad disponible
    .sort((a, b) => {
      if (a.is_conflict !== b.is_conflict) return a.is_conflict ? 1 : -1;
      if (a.is_already_assigned !== b.is_already_assigned)
        return a.is_already_assigned ? 1 : -1;
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      return b.capacity_left - a.capacity_left;
    });

  return suggestions;
}

// ---------------------------------------------------------------------
// Revisión y decisión
// ---------------------------------------------------------------------

export interface MyReviewAssignment {
  assignment_id: string;
  submission_id: string;
  submission_title: string;
  submission_type: Submission['type'];
  track_name: string | null;
  congress_id: string;
  congress_name: string;
  congress_slug: string;
  congress_year: number;
  assignment_status: 'pending' | 'in_progress' | 'submitted' | 'declined';
  deadline_at: string | null;
  review_submitted: boolean;
  recommendation: string | null;
}

export async function listMyReviewAssignments(): Promise<
  MyReviewAssignment[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_my_review_assignments');
  if (error) {
    console.error('listMyReviewAssignments', error);
    return [];
  }
  return data ?? [];
}

export interface ReviewerSubmissionBlind {
  // Vista del revisor: sin info de autoría.
  id: string;
  title: string;
  type: Submission['type'];
  track_id: string | null;
  track_name: string | null;
  congress_id: string;
  congress_year: number;
  congress_slug: string;
  abs_context: string;
  abs_framework: string;
  abs_methods: string;
  abs_results: string;
  abs_discussion: string;
  keywords: string[];
  methodologies: string[];
}

// Devuelve una submission solo con el contenido (sin autores) para el
// revisor. RLS permite leer porque hay assignment.
export async function getSubmissionForReviewer(
  submissionId: string
): Promise<ReviewerSubmissionBlind | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, title, type, track_id, congress_id, abs_context, abs_framework, abs_methods, abs_results, abs_discussion, keywords, methodologies, congresses(year, slug), congress_tracks(name)'
    )
    .eq('id', submissionId)
    .maybeSingle();
  if (error) {
    console.error('getSubmissionForReviewer', error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    track_id: data.track_id,
    track_name: (data.congress_tracks as { name: string } | null)?.name ?? null,
    congress_id: data.congress_id,
    congress_year:
      (data.congresses as { year: number } | null)?.year ?? 0,
    congress_slug:
      (data.congresses as { slug: string } | null)?.slug ?? '',
    abs_context: data.abs_context,
    abs_framework: data.abs_framework,
    abs_methods: data.abs_methods,
    abs_results: data.abs_results,
    abs_discussion: data.abs_discussion,
    keywords: data.keywords,
    methodologies: data.methodologies,
  };
}

export interface ExistingReviewValues {
  score_originality: number;
  score_methodology: number;
  score_clarity: number;
  score_impact: number;
  comments_to_author: string;
  comments_to_chair: string;
  recommendation: string;
  submitted_at: string;
}

export async function getMyExistingReview(
  assignmentId: string
): Promise<ExistingReviewValues | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_review_for_reviewer', {
    p_assignment_id: assignmentId,
  });
  if (error) return null;
  return data && data.length > 0 ? data[0] : null;
}

// Para el chair: lee todas las reviews de un submission (con nombre del
// reviewer porque super-admin puede ver todo).
export interface ChairReviewView {
  assignment_id: string;
  reviewer_name: string;
  reviewer_email: string;
  score_originality: number;
  score_methodology: number;
  score_clarity: number;
  score_impact: number;
  comments_to_author: string;
  comments_to_chair: string;
  recommendation: string;
  submitted_at: string;
}

export async function listReviewsForSubmissionChairView(
  submissionId: string
): Promise<ChairReviewView[]> {
  const supabase = await createSupabaseServerClient();
  // Une assignments + reviews + (vía RPC list_assignments) los datos del reviewer
  const { data: assignments } = await supabase.rpc(
    'list_assignments_for_submission',
    { p_submission_id: submissionId }
  );
  if (!assignments) return [];
  const submittedIds = assignments
    .filter((a) => a.review_submitted)
    .map((a) => a.assignment_id);
  if (submittedIds.length === 0) return [];

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .in('assignment_id', submittedIds);
  if (error) {
    console.error('listReviewsForSubmissionChairView', error);
    return [];
  }

  const byAssignment = new Map<string, (typeof assignments)[number]>();
  for (const a of assignments) byAssignment.set(a.assignment_id, a);

  return (reviews ?? []).map((r) => {
    const a = byAssignment.get(r.assignment_id);
    return {
      assignment_id: r.assignment_id,
      reviewer_name: a?.reviewer_name ?? '—',
      reviewer_email: a?.reviewer_email ?? '—',
      score_originality: r.score_originality,
      score_methodology: r.score_methodology,
      score_clarity: r.score_clarity,
      score_impact: r.score_impact,
      comments_to_author: r.comments_to_author,
      comments_to_chair: r.comments_to_chair,
      recommendation: r.recommendation,
      submitted_at: r.submitted_at,
    };
  });
}

// ---------------------------------------------------------------------
// Reviews anonimizadas para el autor (decisión emitida)
// ---------------------------------------------------------------------

export interface AuthorReviewView {
  position: number;
  score_originality: number;
  score_methodology: number;
  score_clarity: number;
  score_impact: number;
  comments_to_author: string;
  recommendation: string;
  submitted_at: string;
}

export async function listReviewsForSubmissionAuthorView(
  submissionId: string
): Promise<AuthorReviewView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_reviews_for_author', {
    p_submission_id: submissionId,
  });
  if (error) {
    console.error('listReviewsForSubmissionAuthorView', error);
    return [];
  }
  return data ?? [];
}

// ---------------------------------------------------------------------
// Contactos guardados — feature "Mis contactos" del directorio.
// ---------------------------------------------------------------------

// Conjunto de IDs de investigadores guardados por el usuario actual.
// Usado para pintar el botón "+" como ✓ en las cards y tabla del directorio
// sin tener que hacer un round-trip por cada card.
export async function getSavedContactIds(userId: string): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('saved_contacts')
    .select('researcher_id')
    .eq('user_id', userId);
  if (error) {
    console.error('getSavedContactIds', error);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.researcher_id));
}

export interface SavedContactWithResearcher {
  researcher_id: string;
  tags: string[];
  note: string | null;
  saved_at: string;
  researcher: ResearcherWithInstitution;
}

export type SavedContactsSort =
  | 'recent'      // guardados más recientes primero (default)
  | 'oldest'      // guardados más antiguos primero
  | 'name-asc'    // nombre A→Z
  | 'name-desc'   // nombre Z→A
  | 'phd-recent'  // doctorado más reciente
  | 'phd-oldest'; // doctorado más antiguo

export interface SavedContactsFilters {
  q?: string;
  tags?: string[];         // multi: la fila debe tener TODOS los tags listados
  countries?: string[];
  city?: string;
  institutionId?: string;
  topics?: string[];
  methodologies?: string[];
  phdYearFrom?: number;
  phdYearTo?: number;
  masterYearFrom?: number;
  masterYearTo?: number;
  withNote?: 'yes' | 'no'; // filtro por tener/no tener nota privada
  sort?: SavedContactsSort;
}

export async function listSavedContacts(
  userId: string,
  filters: SavedContactsFilters = {}
): Promise<SavedContactWithResearcher[]> {
  const supabase = await createSupabaseServerClient();

  // Traemos TODOS los guardados del usuario y filtramos en JS. El set
  // por usuario es pequeño (típicamente <500), así que es más simple y
  // permite búsqueda full-text local (nombre + institución + tags + nota).
  let query = supabase
    .from('saved_contacts')
    .select(
      `researcher_id, tags, note, created_at,
       researcher:researchers!inner(${RESEARCHER_COLUMNS})`
    )
    .eq('user_id', userId);

  // Pre-filtros que SÍ se pueden hacer en SQL (más rápido si hay muchos):
  if (filters.tags && filters.tags.length > 0) {
    // contains: la fila debe contener TODOS los tags listados
    query = query.contains(
      'tags',
      filters.tags.map((t) => t.toLowerCase())
    );
  }
  if (filters.withNote === 'yes') query = query.not('note', 'is', null);
  if (filters.withNote === 'no') query = query.is('note', null);

  const { data, error } = await query;
  if (error) {
    console.error('listSavedContacts', error);
    return [];
  }

  let rows = (data ?? []).map((r) => ({
    researcher_id: r.researcher_id,
    tags: r.tags ?? [],
    note: r.note,
    saved_at: r.created_at,
    researcher: r.researcher as unknown as ResearcherWithInstitution,
  }));

  // Filtros aplicados en JS sobre la tabla embebida
  if (filters.q && filters.q.trim()) {
    const q = stripAccents(filters.q.trim().toLowerCase());
    rows = rows.filter((r) => {
      const haystacks = [
        r.researcher.full_name,
        r.researcher.institutions?.name ?? '',
        r.researcher.city ?? '',
        r.researcher.country ?? '',
        r.note ?? '',
        r.tags.join(' '),
        (r.researcher.research_topics ?? []).join(' '),
      ];
      return haystacks.some((h) => stripAccents(h.toLowerCase()).includes(q));
    });
  }

  if (filters.countries && filters.countries.length > 0) {
    const set = new Set(filters.countries);
    rows = rows.filter((r) => r.researcher.country && set.has(r.researcher.country));
  }

  if (filters.city) {
    const q = stripAccents(filters.city.toLowerCase());
    rows = rows.filter((r) =>
      r.researcher.city
        ? stripAccents(r.researcher.city.toLowerCase()).includes(q)
        : false
    );
  }

  if (filters.institutionId) {
    rows = rows.filter((r) => r.researcher.institution_id === filters.institutionId);
  }

  if (filters.topics && filters.topics.length > 0) {
    // Mismo comportamiento que el directorio: cada topic se descompone en
    // palabras singularizadas y se exige que TODAS estén presentes en el
    // texto combinado de los temas del investigador.
    const wordGroups = filters.topics
      .map((t) => {
        const norm = stripAccents(t).replace(/[,()]/g, ' ').trim();
        return norm.split(/\s+/).filter(Boolean).map(singularize);
      })
      .filter((g) => g.length > 0);

    rows = rows.filter((r) => {
      const haystack = (r.researcher.research_topics ?? [])
        .map((t) => stripAccents(t ?? ''))
        .join(' || ');
      // OR entre topics del filtro; AND entre las palabras de un topic
      return wordGroups.some((words) =>
        words.every((w) => haystack.includes(w))
      );
    });
  }

  if (filters.methodologies && filters.methodologies.length > 0) {
    const set = new Set(filters.methodologies);
    rows = rows.filter((r) =>
      (r.researcher.methodologies ?? []).some((m) => set.has(m))
    );
  }

  if (filters.phdYearFrom != null) {
    rows = rows.filter(
      (r) => (r.researcher.phd_year ?? -1) >= filters.phdYearFrom!
    );
  }
  if (filters.phdYearTo != null) {
    rows = rows.filter(
      (r) => (r.researcher.phd_year ?? Infinity) <= filters.phdYearTo!
    );
  }
  if (filters.masterYearFrom != null) {
    rows = rows.filter(
      (r) => (r.researcher.master_year ?? -1) >= filters.masterYearFrom!
    );
  }
  if (filters.masterYearTo != null) {
    rows = rows.filter(
      (r) => (r.researcher.master_year ?? Infinity) <= filters.masterYearTo!
    );
  }

  // Sort final
  const sort: SavedContactsSort = filters.sort ?? 'recent';
  rows.sort((a, b) => {
    switch (sort) {
      case 'recent':
        return b.saved_at.localeCompare(a.saved_at);
      case 'oldest':
        return a.saved_at.localeCompare(b.saved_at);
      case 'name-asc':
        return a.researcher.full_name.localeCompare(b.researcher.full_name);
      case 'name-desc':
        return b.researcher.full_name.localeCompare(a.researcher.full_name);
      case 'phd-recent':
        return (b.researcher.phd_year ?? -1) - (a.researcher.phd_year ?? -1);
      case 'phd-oldest':
        return (
          (a.researcher.phd_year ?? Infinity) -
          (b.researcher.phd_year ?? Infinity)
        );
      default:
        return 0;
    }
  });

  return rows;
}

// Tags únicos usados por el usuario, ordenados alfabéticamente.
// Para autocompletado en el editor.
export async function distinctSavedTags(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('saved_contacts')
    .select('tags')
    .eq('user_id', userId);
  if (error) return [];
  const set = new Set<string>();
  for (const r of data ?? []) {
    for (const t of r.tags ?? []) {
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Devuelve la clave canónica de un tema: sin tildes + cada palabra
// singularizada. Dos temas con distinta forma pero igual clave se consideran
// el mismo (ej. "política educativa" / "politicas educativas" → "politica educativa").
function topicCanonicalKey(topic: string): string {
  return stripAccents(topic)
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

// ---------------------------------------------------------------------
// Perfiles incompletos — para el super-admin que envía recordatorios
// ---------------------------------------------------------------------

import {
  computeCompleteness,
  type CompletenessResult,
} from '@/lib/profile-completeness';

export interface IncompleteProfileRow {
  id: string;
  full_name: string;
  email: string;
  institution_name: string | null;
  completeness: CompletenessResult;
  created_at: string;
}

export async function listIncompleteProfiles(): Promise<IncompleteProfileRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select(
      `id, full_name, email, institution_id, title_es, title_en,
       phd_year, master_year, photo_url, linkedin_url, google_scholar_url,
       researchgate_url, orcid, representative_dois, research_topics,
       methodologies, created_at, institutions(name)`
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listIncompleteProfiles', error);
    return [];
  }

  return (data ?? [])
    .map((r) => {
      const completeness = computeCompleteness(r);
      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        institution_name: (r.institutions as { name: string } | null)?.name ?? null,
        completeness,
        created_at: r.created_at,
      };
    })
    .filter((r) => !r.completeness.isComplete);
}

// ---------------------------------------------------------------------
// Instituciones duplicadas — detección por clave normalizada
// ---------------------------------------------------------------------

export interface DuplicateGroup {
  key: string; // clave canónica representativa del grupo
  // 'exact'   = mismo nombre normalizado (alta confianza)
  // 'similar' = nombres relacionados por subconjunto de tokens (revisar a mano)
  matchType: 'exact' | 'similar';
  institutions: {
    id: string;
    name: string;
    name_en: string | null;
    country: string;
    city: string | null;
    researcher_count: number;
    created_at: string;
  }[];
}

// Normaliza el nombre de una institución para detección de duplicados:
//   - strip accents + lowercase
//   - colapsa whitespace
//   - quita puntuación
function normalizeInstitutionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras genéricas de nombres de institución (no aportan a la identidad).
const INSTITUTION_STOPWORDS = new Set([
  'universidad', 'universidade', 'university', 'instituto', 'institucion',
  'institución', 'centro', 'escuela', 'facultad', 'colegio', 'fundacion',
  'corporacion', 'pontificia',
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'da', 'do', 'das', 'dos',
]);

// Topónimos (países y ciudades comunes, sin tildes) — tokens de bajo poder
// distintivo. Si una institución, tras quitar stopwords, SOLO queda con
// topónimos (ej. "Universidad de Chile" → {chile}), NO se la marca como
// subconjunto de otra (evita el falso positivo U. de Chile ⊂ U. de Santiago).
const PLACE_WORDS = new Set([
  'chile', 'argentina', 'peru', 'colombia', 'uruguay', 'brasil', 'brazil',
  'brasilia', 'ecuador', 'bolivia', 'paraguay', 'venezuela', 'mexico',
  'cuba', 'honduras', 'salvador', 'guatemala', 'panama', 'nicaragua',
  'costa', 'rica', 'republica', 'dominicana', 'espana', 'puerto', 'rico',
  'santiago', 'valparaiso', 'concepcion', 'temuco', 'antofagasta', 'coquimbo',
  'lima', 'bogota', 'medellin', 'cali', 'montevideo', 'quito', 'guayaquil',
  'buenos', 'aires', 'sao', 'paulo', 'rio', 'janeiro', 'norte', 'sur',
]);

// Tokens significativos: normaliza, tokeniza y quita stopwords.
function coreTokens(name: string): Set<string> {
  return new Set(
    normalizeInstitutionKey(name)
      .split(' ')
      .filter((t) => t && !INSTITUTION_STOPWORDS.has(t))
  );
}

// ¿Dos cores están relacionados por subconjunto? El más chico debe estar
// contenido en el más grande Y tener al menos un token distintivo (no
// topónimo). Así "autonoma" ⊂ "autonoma chile" matchea, pero "chile" sola
// no matchea contra "santiago chile".
function coresSubsetRelated(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (!big.has(t)) return false;
  // requiere al menos un token distintivo en el set chico
  for (const t of small) if (!PLACE_WORDS.has(t)) return true;
  return false;
}

export async function findDuplicateInstitutionGroups(): Promise<
  DuplicateGroup[]
> {
  const supabase = await createSupabaseServerClient();
  const { data: insts, error } = await supabase
    .from('institutions')
    .select('id, name, name_en, country, city, created_at');
  if (error) {
    console.error('findDuplicateInstitutionGroups', error);
    return [];
  }

  // Cuenta researchers por institución
  const { data: researchers } = await supabase
    .from('researchers')
    .select('institution_id')
    .not('institution_id', 'is', null);
  const counts = new Map<string, number>();
  for (const r of researchers ?? []) {
    if (r.institution_id) {
      counts.set(r.institution_id, (counts.get(r.institution_id) ?? 0) + 1);
    }
  }

  const list = (insts ?? []).map((inst) => ({
    id: inst.id,
    name: inst.name,
    name_en: inst.name_en,
    country: inst.country,
    city: inst.city,
    researcher_count: counts.get(inst.id) ?? 0,
    created_at: inst.created_at,
    key: normalizeInstitutionKey(inst.name),
    core: coreTokens(inst.name),
  }));

  // --- Union-Find para clusterizar ---
  const parent = list.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  // Comparación pairwise O(n²) — ok para algunos cientos de instituciones.
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (!a.key || !b.key) continue;
      // Exacto (mismo nombre normalizado) o similar (subconjunto de tokens)
      if (a.key === b.key || coresSubsetRelated(a.core, b.core)) {
        union(i, j);
      }
    }
  }

  // Agrupar por raíz
  const clusters = new Map<number, typeof list>();
  for (let i = 0; i < list.length; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(list[i]);
  }

  const result: DuplicateGroup[] = [];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    // exact si todos comparten exactamente la misma clave normalizada
    const firstKey = members[0].key;
    const allExact = members.every((m) => m.key === firstKey);
    result.push({
      key: firstKey,
      matchType: allExact ? 'exact' : 'similar',
      institutions: members
        .map((m) => ({
          id: m.id,
          name: m.name,
          name_en: m.name_en,
          country: m.country,
          city: m.city,
          researcher_count: m.researcher_count,
          created_at: m.created_at,
        }))
        .sort((x, y) => y.researcher_count - x.researcher_count),
    });
  }

  // Orden: exactos primero, luego por researchers afectados (desc)
  return result.sort((a, b) => {
    if (a.matchType !== b.matchType) return a.matchType === 'exact' ? -1 : 1;
    const aTotal = a.institutions.reduce((s, i) => s + i.researcher_count, 0);
    const bTotal = b.institutions.reduce((s, i) => s + i.researcher_count, 0);
    return bTotal - aTotal;
  });
}

// ---------------------------------------------------------------------
// Export completo del directorio (solo super-admin) — para xlsx
// ---------------------------------------------------------------------

export interface ResearcherExportRow {
  full_name: string;
  email: string;
  title_es: string | null;
  institution_name: string | null;
  country: string | null;
  city: string | null;
  research_topics: string[];
  methodologies: string[];
  phd_year: number | null;
  phd_institution: string | null;
  master_year: number | null;
  master_institution: string | null;
  linkedin_url: string | null;
  google_scholar_url: string | null;
  researchgate_url: string | null;
  orcid: string | null;
  website: string | null;
  representative_dois: string[];
  available_for_review: boolean;
  status: string;
  created_at: string;
}

export async function listAllResearchersForExport(): Promise<
  ResearcherExportRow[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select(
      `full_name, email, title_es, country, city, research_topics, methodologies,
       phd_year, phd_institution, master_year, master_institution,
       linkedin_url, google_scholar_url, researchgate_url, orcid, website,
       representative_dois, available_for_review, status, created_at,
       institutions(name)`
    )
    .order('full_name', { ascending: true });

  if (error) {
    console.error('listAllResearchersForExport', error);
    return [];
  }

  return (data ?? []).map((r) => ({
    full_name: r.full_name,
    email: r.email,
    title_es: r.title_es,
    institution_name: (r.institutions as { name: string } | null)?.name ?? null,
    country: r.country,
    city: r.city,
    research_topics: r.research_topics ?? [],
    methodologies: r.methodologies ?? [],
    phd_year: r.phd_year,
    phd_institution: r.phd_institution,
    master_year: r.master_year,
    master_institution: r.master_institution,
    linkedin_url: r.linkedin_url,
    google_scholar_url: r.google_scholar_url,
    researchgate_url: r.researchgate_url,
    orcid: r.orcid,
    website: r.website,
    representative_dois: r.representative_dois ?? [],
    available_for_review: r.available_for_review,
    status: r.status,
    created_at: r.created_at,
  }));
}

export async function distinctTopics(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('researchers')
    .select('research_topics')
    .eq('status', 'approved');
  if (error) return [];

  // Cuenta cada variante exacta tal como está guardada
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    for (const t of r.research_topics ?? []) {
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  // Agrupa por clave canónica
  const clusters = new Map<string, { variant: string; count: number }[]>();
  for (const [variant, count] of counts) {
    const key = topicCanonicalKey(variant);
    if (!key) continue;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push({ variant, count });
  }

  // Por cada cluster, elige UNA variante representativa para mostrar al usuario:
  //   1. la más usada en el directorio
  //   2. en empate, la que tiene tildes (más natural)
  //   3. en empate, la más corta (suele ser la singular o sin "de/los")
  //   4. en empate final, orden alfabético (determinístico)
  const representatives: string[] = [];
  for (const variants of clusters.values()) {
    variants.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const aHasAccent = a.variant !== stripAccents(a.variant);
      const bHasAccent = b.variant !== stripAccents(b.variant);
      if (aHasAccent !== bHasAccent) return aHasAccent ? -1 : 1;
      if (a.variant.length !== b.variant.length)
        return a.variant.length - b.variant.length;
      return a.variant.localeCompare(b.variant);
    });
    representatives.push(variants[0].variant);
  }

  // Set para compatibilidad con el sort final
  const set = new Set<string>(representatives);
  return [...set].sort((a, b) => a.localeCompare(b));
}
