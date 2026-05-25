// Definición de los 5 campos del abstract estructurado.
//
// Las etiquetas y hints por defecto. Cada congreso puede sobreescribir las
// LABELS (no los hints) via congresses.abstract_field_labels: jsonb.
// Si una key del jsonb falta, se usa el default.

export type AbstractFieldName =
  | 'abs_context'
  | 'abs_framework'
  | 'abs_methods'
  | 'abs_results'
  | 'abs_discussion';

export const ABSTRACT_FIELD_NAMES: AbstractFieldName[] = [
  'abs_context',
  'abs_framework',
  'abs_methods',
  'abs_results',
  'abs_discussion',
];

export interface AbstractFieldDef {
  name: AbstractFieldName;
  label: string;
  hint: string;
}

export const DEFAULT_ABSTRACT_FIELDS: AbstractFieldDef[] = [
  {
    name: 'abs_context',
    label: 'Contexto y problema',
    hint: '¿De dónde viene esta investigación y qué problema aborda?',
  },
  {
    name: 'abs_framework',
    label: 'Marco teórico',
    hint: 'Conceptos, autores o líneas teóricas en que se apoya.',
  },
  {
    name: 'abs_methods',
    label: 'Metodología',
    hint: 'Cómo se llevó a cabo el estudio (diseño, participantes, técnicas).',
  },
  {
    name: 'abs_results',
    label: 'Resultados o hallazgos',
    hint: 'Resultados principales o esperados según etapa.',
  },
  {
    name: 'abs_discussion',
    label: 'Discusión / aporte al aula',
    hint: 'Qué implicancias tiene para la enseñanza y la práctica docente.',
  },
];

// Defaults para nuevos campos editables del congreso
export const DEFAULT_SUBMISSION_MAX_CHARS = 500;
export const DEFAULT_SUBMISSION_TYPES_ALLOWED: ReadonlyArray<
  'oral' | 'poster' | 'symposium'
> = ['oral', 'poster', 'symposium'];

// Devuelve las definiciones efectivas combinando defaults con overrides
// del congreso. overrides es { abs_context: 'mi label', ... } parcial.
export function resolveAbstractFields(
  overrides: Partial<Record<AbstractFieldName, string>> | null | undefined
): AbstractFieldDef[] {
  if (!overrides) return DEFAULT_ABSTRACT_FIELDS;
  return DEFAULT_ABSTRACT_FIELDS.map((f) => {
    const custom = overrides[f.name];
    return custom && custom.trim()
      ? { ...f, label: custom.trim() }
      : f;
  });
}
