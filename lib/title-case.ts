// Convierte texto libre a "Title Case" según convención del español:
// - Primera letra de cada palabra en mayúsculas
// - Palabras conectoras ("de", "la", "y", etc.) en minúsculas, excepto
//   cuando son la primera palabra
// - Acrónimos cortos en MAYÚSCULAS (ej. "UDD", "MIT", "USS") se preservan
// - Soporta separadores por guión y apóstrofe (ej. "O'Higgins", "Pérez-García")
//
// Casos cubiertos:
//   "alejandra balbi"            → "Alejandra Balbi"
//   "ALEJANDRA BALBI"            → "Alejandra Balbi"
//   "universidad de chile"       → "Universidad de Chile"
//   "pontificia UNIVERSIDAD del Desarrollo" → "Pontificia Universidad del Desarrollo"
//   "pérez-garcía"               → "Pérez-García"
//   "o'higgins"                  → "O'Higgins"
//   "santiago"                   → "Santiago"
//   "UDD"                        → "UDD" (acrónimo)
//   ""                           → ""

const LOWERCASE_WORDS = new Set([
  // Español
  'de', 'del', 'la', 'las', 'los', 'el',
  'y', 'e', 'o', 'u',
  'a', 'en', 'con', 'para', 'por',
  // Portugués (instituciones brasileñas)
  'da', 'do', 'das', 'dos',
  // Otros prefijos comunes en nombres
  'van', 'von', 'der', 'di', 'le',
]);

const ACRONYM_RE = /^[A-ZÁÉÍÓÚÑ]{2,5}$/;

function capitalizeWord(word: string): string {
  if (!word) return word;
  // Soporta separadores internos (guión, apóstrofe): "perez-garcia", "o'higgins"
  return word
    .split(/([-'])/)
    .map((part) => {
      if (part === '-' || part === "'") return part;
      if (!part) return part;
      const lower = part.toLocaleLowerCase('es');
      return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
    })
    .join('');
}

export interface TitleCaseOptions {
  // Si true, preserva palabras 2-5 chars en mayúsculas (UDD, MIT, PUC).
  // Útil para INSTITUCIONES.
  // Si false, "VERA" se trata como apellido y se title-casea a "Vera".
  // Usar false para nombres de personas y ciudades.
  // Default true para compatibilidad con código viejo.
  preserveAcronyms?: boolean;
}

export function toTitleCase(
  input: string,
  opts: TitleCaseOptions = {}
): string {
  if (!input) return input;
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;

  const preserveAcronyms = opts.preserveAcronyms ?? true;
  const words = trimmed.split(' ');
  return words
    .map((word, i) => {
      // Preservar acrónimos cortos en mayúsculas (UDD, MIT, UNESCO, etc.)
      // SOLO si preserveAcronyms está activo. Si el input es un nombre o
      // ciudad, queremos que "VERA" → "Vera" (no es un acrónimo real).
      if (preserveAcronyms && ACRONYM_RE.test(word)) return word;

      const lower = word.toLocaleLowerCase('es');

      // Palabras conectoras: minúsculas, excepto si es la primera
      if (i > 0 && LOWERCASE_WORDS.has(lower)) {
        return lower;
      }

      return capitalizeWord(word);
    })
    .join(' ');
}

// Variante: aplica title case solo si el input no está vacío.
// Útil cuando queremos null en lugar de string vacío.
export function toTitleCaseOrNull(
  input: string | null | undefined,
  opts: TitleCaseOptions = {}
): string | null {
  if (!input) return null;
  const result = toTitleCase(input, opts);
  return result || null;
}

// Atajo semántico: title case para nombres de personas (no preserva acrónimos).
// Útil para que las llamadas desde los formularios sean explícitas.
export function toTitleCaseName(input: string): string {
  return toTitleCase(input, { preserveAcronyms: false });
}

export function toTitleCaseNameOrNull(
  input: string | null | undefined
): string | null {
  return toTitleCaseOrNull(input, { preserveAcronyms: false });
}
