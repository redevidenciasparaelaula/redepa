// Helpers compartidos por los 3 route handlers de export.
// Carga en memoria todas las submissions del congreso (con autores y
// metadatos) y ofrece utilidades para generar CSV y archivos de texto.

import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug } from '@/lib/queries';
import { createSupabaseAdminClient, hasServiceRoleKey } from '@/lib/supabase/admin';
import { methodologyLabel } from '@/lib/methodologies';

export interface ExportAuthor {
  display_order: number;
  full_name: string;
  email: string;
  institution_name: string | null;
  is_corresponding: boolean;
  is_presenter: boolean;
  from_directory: boolean;
}

export interface ExportSubmission {
  id: string;
  title: string;
  status: string;
  type: string;
  track_name: string | null;
  keywords: string[];
  methodologies: string[];
  abs_context: string;
  abs_framework: string;
  abs_methods: string;
  abs_results: string;
  abs_discussion: string;
  submitted_at: string | null;
  updated_at: string;
  authors: ExportAuthor[];
}

// Devuelve o lanza. Si no hay auth / no es super-admin / no hay service role,
// lanza con un mensaje claro para que el handler devuelva 403.
export async function requireAdminAndLoad(slug: string): Promise<{
  congressName: string;
  year: number;
  submissions: ExportSubmission[];
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (!user.isSuperAdmin) throw new Error('FORBIDDEN');

  const c = await getCongressBySlug(slug);
  if (!c) throw new Error('NOT_FOUND');

  if (!hasServiceRoleKey()) throw new Error('SERVICE_ROLE_MISSING');
  // Usamos admin client porque algunos autores pueden tener user_id = null
  // (postulaciones públicas) y el admin igual necesita ver todo sin fricción
  // de RLS.
  const admin = createSupabaseAdminClient();

  // 1) Submissions del congreso con track
  const { data: subs } = await admin
    .from('submissions')
    .select(
      'id, title, status, type, keywords, methodologies, abs_context, abs_framework, abs_methods, abs_results, abs_discussion, submitted_at, updated_at, congress_tracks(name)'
    )
    .eq('congress_id', c.id)
    .order('submitted_at', { ascending: false });

  const subRows = (subs ?? []) as unknown as {
    id: string;
    title: string;
    status: string;
    type: string;
    keywords: string[] | null;
    methodologies: string[] | null;
    abs_context: string;
    abs_framework: string;
    abs_methods: string;
    abs_results: string;
    abs_discussion: string;
    submitted_at: string | null;
    updated_at: string;
    congress_tracks: { name: string } | null;
  }[];

  if (subRows.length === 0) {
    return { congressName: c.name, year: c.year, submissions: [] };
  }

  const submissionIds = subRows.map((s) => s.id);

  // 2) Autores (con institución del directorio o la externa)
  const { data: authorsRaw } = await admin
    .from('submission_authors')
    .select(
      'submission_id, display_order, full_name, email, external_institution_name, user_id, is_corresponding, is_presenter, institutions(name)'
    )
    .in('submission_id', submissionIds)
    .order('display_order', { ascending: true });

  const authorRows = (authorsRaw ?? []) as unknown as {
    submission_id: string;
    display_order: number;
    full_name: string;
    email: string;
    external_institution_name: string | null;
    user_id: string | null;
    is_corresponding: boolean;
    is_presenter: boolean;
    institutions: { name: string } | null;
  }[];

  const authorsBySub = new Map<string, ExportAuthor[]>();
  for (const a of authorRows) {
    const list = authorsBySub.get(a.submission_id) ?? [];
    list.push({
      display_order: a.display_order,
      full_name: a.full_name,
      email: a.email,
      institution_name: a.external_institution_name ?? a.institutions?.name ?? null,
      is_corresponding: a.is_corresponding,
      is_presenter: a.is_presenter,
      from_directory: a.user_id !== null,
    });
    authorsBySub.set(a.submission_id, list);
  }

  const submissions: ExportSubmission[] = subRows.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    type: s.type,
    track_name: s.congress_tracks?.name ?? null,
    keywords: s.keywords ?? [],
    methodologies: (s.methodologies ?? []).map((k) =>
      methodologyLabel(k, 'es')
    ),
    abs_context: s.abs_context ?? '',
    abs_framework: s.abs_framework ?? '',
    abs_methods: s.abs_methods ?? '',
    abs_results: s.abs_results ?? '',
    abs_discussion: s.abs_discussion ?? '',
    submitted_at: s.submitted_at,
    updated_at: s.updated_at,
    authors: authorsBySub.get(s.id) ?? [],
  }));

  return { congressName: c.name, year: c.year, submissions };
}

// -------- CSV helpers --------
// Soporta valores con comas, comillas y saltos de línea (quoting RFC 4180).
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const str = String(v);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

// UTF-8 BOM para que Excel detecte el encoding al abrir el CSV directo.
export const CSV_BOM = '﻿';

// -------- Nombre de archivo seguro --------
export function slugify(input: string, max = 80): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

// -------- Render de un .txt por postulación --------
export function submissionToText(s: ExportSubmission): string {
  const lines: string[] = [];
  lines.push(`Título: ${s.title}`);
  lines.push(`ID: ${s.id}`);
  lines.push(`Estado: ${s.status}`);
  lines.push(`Formato: ${typeLabel(s.type)}`);
  if (s.track_name) lines.push(`Línea temática: ${s.track_name}`);
  if (s.submitted_at) {
    lines.push(
      `Enviada: ${new Date(s.submitted_at).toLocaleString('es-CL', {
        timeZone: 'America/Santiago',
      })}`
    );
  }
  lines.push('');
  lines.push('==== AUTORES ====');
  s.authors.forEach((a, i) => {
    const roles: string[] = [];
    if (a.is_corresponding) roles.push('contacto principal');
    if (a.is_presenter) roles.push('presenta');
    const rolesStr = roles.length > 0 ? ` [${roles.join(', ')}]` : '';
    lines.push(
      `${i + 1}. ${a.full_name}${rolesStr}`
    );
    lines.push(`   Email: ${a.email}`);
    if (a.institution_name) lines.push(`   Institución: ${a.institution_name}`);
  });
  lines.push('');
  if (s.keywords.length > 0) {
    lines.push(`Palabras clave: ${s.keywords.join(', ')}`);
  }
  if (s.methodologies.length > 0) {
    lines.push(`Metodologías: ${s.methodologies.join(', ')}`);
  }
  lines.push('');
  lines.push('==== ABSTRACT ====');
  lines.push('');
  lines.push('--- Contexto y problema ---');
  lines.push(s.abs_context);
  lines.push('');
  lines.push('--- Marco teórico ---');
  lines.push(s.abs_framework);
  lines.push('');
  lines.push('--- Metodología ---');
  lines.push(s.abs_methods);
  lines.push('');
  lines.push('--- Resultados principales ---');
  lines.push(s.abs_results);
  lines.push('');
  lines.push('--- Discusión / aporte al aula ---');
  lines.push(s.abs_discussion);
  lines.push('');
  return lines.join('\n');
}

function typeLabel(t: string): string {
  if (t === 'oral') return 'Ponencia oral';
  if (t === 'poster') return 'Póster';
  if (t === 'symposium') return 'Simposio';
  return t;
}

export function errorResponse(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    msg === 'UNAUTHORIZED' ? 401 :
    msg === 'FORBIDDEN' ? 403 :
    msg === 'NOT_FOUND' ? 404 :
    msg === 'SERVICE_ROLE_MISSING' ? 500 : 500;
  return new Response(msg, { status });
}
