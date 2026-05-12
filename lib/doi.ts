// Helpers para normalizar y mostrar DOIs.

export function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${normalizeDoi(doi)}`;
}
