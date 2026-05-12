// Helper para construir URLs preservando los searchParams existentes,
// con la posibilidad de sobrescribir/agregar/limpiar algunos.

type SP = Record<string, string | string[] | undefined>;

export function buildHref(
  base: string,
  current: SP,
  overrides: Record<string, string | undefined> = {},
  remove: string[] = []
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (overrides[k] !== undefined) continue;
    if (remove.includes(k)) continue;
    if (Array.isArray(v)) {
      v.forEach((x) => x && params.append(k, x));
    } else if (v) {
      params.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined && v !== '') params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
