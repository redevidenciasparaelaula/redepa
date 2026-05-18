// Helper para decidir si un perfil está "completo" y, si no, qué le falta.
//
// Las 4 categorías que el super-admin acordó como recomendadas:
//   1. Datos básicos: título profesional (cargo) e institución
//   2. Trayectoria: año de doctorado o magíster
//   3. Visibilidad: foto + redes sociales (LinkedIn / Scholar / ORCID /
//      ResearchGate) + publicaciones (DOIs)
//   4. Buscabilidad: temas y metodologías declaradas
//
// Un perfil con TODAS las categorías completas → isComplete=true.
// Si falta una o más, missing es la lista de categorías faltantes en
// español listo para mostrar al usuario.

import type { Researcher } from '@/lib/supabase/types';

export type MissingCategory =
  | 'basics'      // título profesional o institución
  | 'education'   // PhD o magíster
  | 'visibility'  // foto, redes o DOIs
  | 'searchable'; // temas o metodologías

export const MISSING_LABELS: Record<MissingCategory, string> = {
  basics: 'Cargo o institución actual',
  education: 'Año de doctorado o magíster',
  visibility: 'Foto, redes (LinkedIn / Scholar / ORCID / ResearchGate) y publicaciones',
  searchable: 'Temas y metodologías de investigación',
};

export interface CompletenessResult {
  isComplete: boolean;
  missing: MissingCategory[];
  // Versión granular: qué campo específico está vacío, para detalle UI
  details: {
    title: boolean;        // no tiene title_es ni title_en
    institution: boolean;  // no tiene institution_id
    phdYear: boolean;
    masterYear: boolean;
    photo: boolean;
    socials: boolean;      // ninguna red
    dois: boolean;         // sin DOIs
    topics: boolean;
    methodologies: boolean;
  };
}

type ResearcherSubset = Pick<
  Researcher,
  | 'title_es'
  | 'title_en'
  | 'institution_id'
  | 'phd_year'
  | 'master_year'
  | 'photo_url'
  | 'linkedin_url'
  | 'google_scholar_url'
  | 'researchgate_url'
  | 'orcid'
  | 'representative_dois'
  | 'research_topics'
  | 'methodologies'
>;

export function computeCompleteness(
  r: ResearcherSubset
): CompletenessResult {
  const details = {
    title: !r.title_es && !r.title_en,
    institution: !r.institution_id,
    phdYear: r.phd_year == null,
    masterYear: r.master_year == null,
    photo: !r.photo_url,
    socials:
      !r.linkedin_url &&
      !r.google_scholar_url &&
      !r.researchgate_url &&
      !r.orcid,
    dois: !r.representative_dois || r.representative_dois.length === 0,
    topics: !r.research_topics || r.research_topics.length === 0,
    methodologies: !r.methodologies || r.methodologies.length === 0,
  };

  const missing: MissingCategory[] = [];
  // Basics: falta title o institución
  if (details.title || details.institution) missing.push('basics');
  // Educación: NINGUNO de los dos años → faltante (con uno alcanza)
  if (details.phdYear && details.masterYear) missing.push('education');
  // Visibility: foto Y ninguna red Y sin DOIs → faltante (con uno alcanza)
  if (details.photo && details.socials && details.dois) missing.push('visibility');
  // Búsqueda: temas o metodologías
  if (details.topics || details.methodologies) missing.push('searchable');

  return {
    isComplete: missing.length === 0,
    missing,
    details,
  };
}

// Convierte la lista de missing categories en una descripción HTML lista
// para incluir en un email (con <li> bullets).
export function missingCategoriesAsHtml(missing: MissingCategory[]): string {
  if (missing.length === 0) return '';
  return (
    '<ul style="margin:8px 0 16px 0;padding-left:20px;font-size:14px;line-height:1.6">' +
    missing.map((c) => `<li>${MISSING_LABELS[c]}</li>`).join('') +
    '</ul>'
  );
}
