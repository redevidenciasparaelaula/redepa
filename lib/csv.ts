// Parser CSV simple. Maneja:
//   - Campos entre comillas dobles (con comas y saltos de línea adentro)
//   - Comillas escapadas con "" dentro de un campo entre comillas
//   - Separador de filas \n o \r\n
//   - Strip de BOM al inicio

export function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"' && field === '') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (field !== '' || current.length > 0) {
          current.push(field);
          rows.push(current);
          current = [];
          field = '';
        }
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

// Convierte filas con cabecera en array de objetos.
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.every((c) => c.trim() === '')) continue; // skip blank
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? '').trim();
    });
    out.push(obj);
  }
  return out;
}

// Para construir CSVs (templates).
export function escapeCSVCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function buildCSV(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCSVCell).join(',')).join('\n');
}
