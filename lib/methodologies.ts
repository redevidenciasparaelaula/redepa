// Taxonomía simplificada de metodologías de investigación en educación.
// Bilingüe. El valor en DB es el `key` (inglés sin tildes ni espacios).
//
// Diseño: 3 categorías y ~22 opciones. Se consolidaron metodologías
// muy cercanas para que el catálogo sea utilizable (no abrumador).
// Migración 009 mapea las claves antiguas a las nuevas.

import type { Locale } from '@/i18n/config';

export type MethodologyCategory = 'approach' | 'design' | 'applied';

export interface Methodology {
  key: string;
  es: string;
  en: string;
  category: MethodologyCategory;
}

export const METHODOLOGY_CATEGORIES: {
  key: MethodologyCategory;
  es: string;
  en: string;
}[] = [
  { key: 'approach', es: 'Enfoque general', en: 'General approach' },
  { key: 'design', es: 'Diseños de investigación', en: 'Research designs' },
  { key: 'applied', es: 'Aplicaciones y análisis', en: 'Applications and analysis' },
];

export const METHODOLOGIES: Methodology[] = [
  // Enfoque general
  { key: 'quantitative', es: 'Cuantitativa', en: 'Quantitative', category: 'approach' },
  { key: 'qualitative', es: 'Cualitativa', en: 'Qualitative', category: 'approach' },
  { key: 'mixed', es: 'Mixta', en: 'Mixed methods', category: 'approach' },

  // Diseños de investigación
  {
    key: 'experimental',
    es: 'Experimental / Cuasi-experimental',
    en: 'Experimental / Quasi-experimental',
    category: 'design',
  },
  {
    key: 'survey',
    es: 'Encuesta, observacional y bases secundarias',
    en: 'Survey, observational, secondary data',
    category: 'design',
  },
  {
    key: 'causal_inference',
    es: 'Inferencia causal (RDD, DID, IV)',
    en: 'Causal inference (RDD, DID, IV)',
    category: 'design',
  },
  {
    key: 'psychometrics',
    es: 'Psicometría',
    en: 'Psychometrics',
    category: 'design',
  },
  {
    key: 'case_study',
    es: 'Estudio de caso',
    en: 'Case study',
    category: 'design',
  },
  {
    key: 'ethnography',
    es: 'Etnografía',
    en: 'Ethnography',
    category: 'design',
  },
  {
    key: 'phenomenology',
    es: 'Fenomenología / Hermenéutica',
    en: 'Phenomenology / Hermeneutic',
    category: 'design',
  },
  {
    key: 'grounded_theory',
    es: 'Teoría fundamentada',
    en: 'Grounded theory',
    category: 'design',
  },
  {
    key: 'discourse_analysis',
    es: 'Análisis de discurso / contenido',
    en: 'Discourse / content analysis',
    category: 'design',
  },
  {
    key: 'narrative',
    es: 'Investigación narrativa',
    en: 'Narrative research',
    category: 'design',
  },
  {
    key: 'action_research',
    es: 'Investigación-acción / participativa / crítica',
    en: 'Action / participatory / critical research',
    category: 'design',
  },
  {
    key: 'design_based',
    es: 'Investigación basada en diseño (DBR / Lesson study)',
    en: 'Design-based / Lesson study',
    category: 'design',
  },
  {
    key: 'classroom_observation',
    es: 'Observación de aula',
    en: 'Classroom observation',
    category: 'design',
  },

  // Aplicaciones y análisis
  {
    key: 'multilevel',
    es: 'Modelos de regresión y multinivel',
    en: 'Regression and multilevel models',
    category: 'applied',
  },
  {
    key: 'program_evaluation',
    es: 'Evaluación de programas e implementación',
    en: 'Program evaluation and implementation',
    category: 'applied',
  },
  {
    key: 'policy_analysis',
    es: 'Análisis curricular y de políticas educativas',
    en: 'Curriculum and policy analysis',
    category: 'applied',
  },
  {
    key: 'systematic_review',
    es: 'Revisión sistemática y bibliométrica',
    en: 'Systematic and bibliometric review',
    category: 'applied',
  },
  {
    key: 'meta_analysis',
    es: 'Meta-análisis',
    en: 'Meta-analysis',
    category: 'applied',
  },
  {
    key: 'learning_analytics',
    es: 'Learning analytics y minería de datos',
    en: 'Learning analytics and data mining',
    category: 'applied',
  },
  {
    key: 'social_network',
    es: 'Análisis de redes (SNA)',
    en: 'Social network analysis',
    category: 'applied',
  },
  {
    key: 'computational',
    es: 'Métodos computacionales (bayesianos, NLP)',
    en: 'Computational methods (Bayesian, NLP)',
    category: 'applied',
  },
];

export function methodologyLabel(key: string, locale: Locale): string {
  const m = METHODOLOGIES.find((x) => x.key === key);
  if (!m) return key;
  return locale === 'en' ? m.en : m.es;
}

export function methodologiesByCategory(): Record<MethodologyCategory, Methodology[]> {
  const result = {} as Record<MethodologyCategory, Methodology[]>;
  for (const cat of METHODOLOGY_CATEGORIES) result[cat.key] = [];
  for (const m of METHODOLOGIES) result[m.category].push(m);
  return result;
}

export function methodologiesAlphabetical(locale: Locale): Methodology[] {
  const collator = new Intl.Collator(locale === 'en' ? 'en' : 'es', {
    sensitivity: 'base',
  });
  return [...METHODOLOGIES].sort((a, b) =>
    collator.compare(locale === 'en' ? a.en : a.es, locale === 'en' ? b.en : b.es)
  );
}
