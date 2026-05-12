// Normaliza un string para búsqueda: minúsculas + sin tildes.
// Combinable con cómo guardamos `research_topics_text` en la DB.

export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
