// Comparación fuzzy de nombres de instituciones para detectar conflictos
// de interés (revisor de la misma institución que un autor).
//
// Objetivo: minimizar FALSOS POSITIVOS (no queremos bloquear a un revisor
// legítimo por creer erróneamente que comparte institución). Si dudamos,
// mejor NO reportar match — la revisión doble ciega ya protege bastante.
//
// Estrategia:
//   1. Normalizar (minúsculas, sin acentos, sin puntuación).
//   2. Si los strings normalizados son iguales → match.
//   3. Si uno luce como acrónimo corto (≤5 chars, sin espacios), matchea
//      contra el "acrónimo" del otro (full o filtrado, con prefijo).
//   4. Si el SET de tokens "significativos" (sin palabras genéricas como
//      "universidad", "de", etc.) es igual en ambos → match.
//
// Casos de prueba mentales:
//   ✓ "Universidad del Desarrollo" == "Universidad del Desarrollo"
//   ✓ "UDD" ~ "Universidad del Desarrollo" (acrónimo)
//   ✓ "PUC" ~ "Pontificia Universidad Católica de Chile" (prefijo acrónimo)
//   ✓ "U. del Desarrollo" ~ "Universidad del Desarrollo" (tokens sign.)
//   ✗ "Universidad de Chile" != "Universidad Católica de Chile"

const STOPWORDS_TOKENS = new Set([
  'universidad',
  'university',
  'universidade',
  'college',
  'instituto',
  'institute',
  'institución',
  'institution',
  'centro',
  'center',
  'centre',
  'escuela',
  'school',
  'facultad',
  'faculty',
  'colegio',
  'departamento',
  'department',
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
  'and',
  'of',
  'the',
  'a',
]);

// Para el acrónimo mantenemos las preposiciones cortas ("del" → D en "UDD")
// pero saltamos artículos larguísimos y palabras genéricas obvias.
const ACRONYM_SKIP_TOKENS = new Set([
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
  'and',
  'of',
  'the',
]);

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[.,;:_"'`´¨/\\()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  const n = normalize(s);
  if (!n) return [];
  return n.split(' ').filter(Boolean);
}

function significantTokens(s: string): string[] {
  // También descartamos tokens de una sola letra: casi siempre son
  // abreviaciones de palabras genéricas (ej. "U." por Universidad,
  // "T." por Tecnológico) y meterlas en el set arruinaría la igualdad
  // con la versión escrita completa.
  return tokens(s).filter((t) => t.length > 1 && !STOPWORDS_TOKENS.has(t));
}

function acronymFull(s: string): string {
  return tokens(s)
    .map((t) => t[0])
    .join('');
}

function acronymFiltered(s: string): string {
  return tokens(s)
    .filter((t) => !ACRONYM_SKIP_TOKENS.has(t))
    .map((t) => t[0])
    .join('');
}

/** Determina si `raw` "parece" un acrónimo (short, sin espacios). */
function looksLikeAcronym(raw: string): boolean {
  const s = normalize(raw).replace(/\s/g, '');
  return s.length > 0 && s.length <= 6 && /^[a-z]+$/.test(s);
}

/** Match fuzzy entre dos nombres de institución. */
export function institutionsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;

  // 1) Igualdad exacta normalizada
  if (na === nb) return true;

  // 2) Acrónimo prefijo (en ambas direcciones)
  //    Ej: "PUC" es prefijo del acrónimo "PUCDC" de "Pontificia Universidad Católica de Chile".
  const naFlat = na.replace(/\s/g, '');
  const nbFlat = nb.replace(/\s/g, '');

  if (looksLikeAcronym(naFlat)) {
    const bFull = acronymFull(b);
    const bFilt = acronymFiltered(b);
    if (
      bFull.startsWith(naFlat) ||
      bFilt.startsWith(naFlat) ||
      bFull === naFlat ||
      bFilt === naFlat
    )
      return true;
  }
  if (looksLikeAcronym(nbFlat)) {
    const aFull = acronymFull(a);
    const aFilt = acronymFiltered(a);
    if (
      aFull.startsWith(nbFlat) ||
      aFilt.startsWith(nbFlat) ||
      aFull === nbFlat ||
      aFilt === nbFlat
    )
      return true;
  }

  // 3) Igualdad exacta del SET de tokens significativos (sin stopwords).
  //    "U. del Desarrollo" y "Universidad del Desarrollo" comparten
  //    exactamente {desarrollo}.
  const sa = new Set(significantTokens(a));
  const sb = new Set(significantTokens(b));
  if (sa.size > 0 && sb.size > 0 && sa.size === sb.size) {
    let allIn = true;
    for (const t of sa) if (!sb.has(t)) { allIn = false; break; }
    if (allIn) return true;
  }

  return false;
}

/** Chequea si una institución matchea alguna de una lista. Devuelve la primera coincidencia (para reporte). */
export function findInstitutionMatch(
  candidate: string | null | undefined,
  pool: (string | null | undefined)[]
): string | null {
  if (!candidate) return null;
  for (const other of pool) {
    if (other && institutionsMatch(candidate, other)) return other;
  }
  return null;
}
