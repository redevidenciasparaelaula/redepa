// Lista cerrada de cargos académicos.
// Bilingüe. Se guarda title_es y title_en directamente como texto.

import type { Locale } from '@/i18n/config';

export interface Position {
  key: string;
  es: string;
  en: string;
}

// Orden: de junior a senior, terminando con cargos de gestión.
export const POSITIONS: Position[] = [
  { key: 'phd_student', es: 'Estudiante de doctorado', en: 'Doctoral student' },
  { key: 'postdoc', es: 'Postdoctorante', en: 'Postdoctoral researcher' },
  { key: 'researcher', es: 'Investigador/a', en: 'Researcher' },
  { key: 'assistant_prof', es: 'Profesor/a asistente', en: 'Assistant Professor' },
  { key: 'adjunct_prof', es: 'Profesor/a adjunto/a', en: 'Adjunct Professor' },
  { key: 'associate_prof', es: 'Profesor/a asociado/a', en: 'Associate Professor' },
  { key: 'full_prof', es: 'Profesor/a titular', en: 'Full Professor' },
  { key: 'emeritus_prof', es: 'Profesor/a emérito/a', en: 'Emeritus Professor' },
];

export function positionByEs(es: string): Position | undefined {
  return POSITIONS.find((p) => p.es === es);
}

export function positionLabel(label: string, locale: Locale): string {
  // Si el label viene en español canónico, traducir; si viene en formato
  // libre (datos antiguos), devolver tal cual.
  const p = positionByEs(label);
  if (!p) return label;
  return locale === 'en' ? p.en : p.es;
}
