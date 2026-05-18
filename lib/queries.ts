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

export interface FullSubmission extends Submission {
  authors: SubmissionAuthor[];
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
    .select('*')
    .eq('submission_id', id)
    .order('display_order', { ascending: true });

  return { ...(s as Submission), authors: (authors as SubmissionAuthor[]) ?? [] };
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
    const wants = filters.topics.map((t) => stripAccents(t.toLowerCase()));
    rows = rows.filter((r) => {
      const has = (r.researcher.research_topics ?? []).map((t) =>
        stripAccents((t ?? '').toLowerCase())
      );
      // OR: matchea si al menos uno coincide (como en el directorio)
      return wants.some((w) => has.some((h) => h.includes(w)));
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
