// Normaliza URLs ingresadas por usuarios:
// - Trim
// - Si está vacío, null
// - Si no tiene protocolo http(s)://, prepend https://
// - Si empieza con //, expand a https://
//
// Usado por los formularios para no bloquear submissions cuando la persona
// pega "linkedin.com/in/jane" sin el https://.

export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}
