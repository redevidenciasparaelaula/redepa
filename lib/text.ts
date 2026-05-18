// Normaliza un string para búsqueda: minúsculas + sin tildes.
// Combinable con cómo guardamos `research_topics_text` en la DB.

export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Heurística simple para singularizar una palabra en español:
//   - 5+ chars terminadas en 'es' → strip 'es' (leyes→ley, redes→red,
//     gestiones→gestion, mujeres→mujer, países→pais)
//   - 4+ chars terminadas en 's'  → strip 's' (políticas→politica,
//     niños→niño, educativas→educativa)
//   - resto → sin cambio
//
// Usar siempre sobre texto ya pasado por stripAccents (lowercase + sin tildes).
// Hay falsos positivos teóricos ("tres"→"tre", "lunes"→"lun") pero en el
// contexto de temas de investigación los ignoramos.
export function singularize(word: string): string {
  if (word.length > 4 && word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith('s')) {
    return word.slice(0, -1);
  }
  return word;
}
