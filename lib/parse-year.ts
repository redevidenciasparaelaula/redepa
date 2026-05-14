// Extrae un año de 4 dígitos de un string libre.
//
// Acepta:
//   "2010", " 2010 ", "año 2010", "2010 (UDD)", "Año 2010"
// Rechaza:
//   "abc", "2010 y 2015" (ambiguo — toma el primero), "10"
//
// Retorna:
//   { ok: true, value: null }  si el input está vacío
//   { ok: true, value: 2010 }  si encuentra un año válido
//   { ok: false }              si no logra parsear o el año está fuera de rango

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 5;

export function parseYear(
  input: string
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };

  const match = trimmed.match(/\d{4}/);
  if (!match) return { ok: false };

  const n = parseInt(match[0], 10);
  if (n < MIN_YEAR || n > MAX_YEAR) return { ok: false };

  return { ok: true, value: n };
}
