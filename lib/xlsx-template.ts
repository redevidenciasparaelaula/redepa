// Genera la plantilla .xlsx para carga masiva de investigadores.
// Incluye validación de celdas para los campos con lista cerrada
// (cargo, país) y notas explicativas para los campos multivalor.

import ExcelJS from 'exceljs';
import { POSITIONS } from '@/lib/positions';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import { countriesByGroup } from '@/lib/countries';

const MAX_ROWS = 500;

export const TEMPLATE_HEADERS = [
  'full_name',
  'email',
  'cargo',
  'pais',
  'ciudad',
  'temas',
  'metodologias',
  'phd_year',
  'phd_institution',
  'master_year',
  'master_institution',
  'linkedin_url',
  'google_scholar_url',
  'researchgate_url',
  'orcid',
  'website',
  'doi_1',
  'doi_2',
  'doi_3',
] as const;

export async function buildTemplateBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Directorio Red EPA';
  wb.created = new Date();

  // ---------- Hoja "Investigadores" ----------
  const sheet = wb.addWorksheet('Investigadores', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = TEMPLATE_HEADERS.map((h) => ({
    header: h,
    key: h,
    width: columnWidth(h),
  }));

  // Estilo del header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' }, // gris claro
  };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  // Fila ejemplo (usa etiquetas en español tal como aparecen en la hoja Catálogos)
  sheet.addRow([
    'María Pérez',
    'maria.perez@example.com',
    'Profesor/a asistente',
    'Chile',
    'Santiago',
    'políticas educativas; equidad de género',
    'Cualitativa; Mixta',
    2018,
    'Universidad de Chile',
    2014,
    'Universidad de Chile',
    'https://www.linkedin.com/in/maria',
    'https://scholar.google.com/citations?user=...',
    '',
    '0000-0001-2345-6789',
    '',
    '10.1234/abc',
    '',
    '',
  ]);

  // Notas explicativas en cabeceras
  setCellNote(sheet, 'F1',
    'Temas principales de interés. Entre 2 y 5, separados por punto y coma (;). Ej: "políticas educativas; equidad; formación docente". Se guardan en minúsculas.');
  setCellNote(sheet, 'G1',
    'Metodologías. Copia exactamente los nombres en español de la hoja "Catálogos" (columna "Metodología"). Separa varias con punto y coma (;). Ej: "Cualitativa; Mixta; Estudio de caso". Las tildes y mayúsculas no importan.');
  setCellNote(sheet, 'C1',
    'Cargo: elige una opción del desplegable.');
  setCellNote(sheet, 'D1',
    'País: elige una opción del desplegable.');
  setCellNote(sheet, 'O1',
    'ORCID con formato 0000-0000-0000-0000. Sin la URL completa.');
  setCellNote(sheet, 'Q1',
    'DOI sin prefijo. Ej: "10.1234/abc". Acepta también la URL completa de doi.org.');

  // ---------- Hoja oculta "_listas" para data validation ----------
  const listsSheet = wb.addWorksheet('_listas', { state: 'hidden' });

  const positionLabels = POSITIONS.map((p) => p.es);
  const { latam, others } = countriesByGroup('es');
  const countryNames = [...latam, ...others].map((c) => c.name);

  listsSheet.getColumn('A').values = ['Cargos', ...positionLabels];
  listsSheet.getColumn('B').values = ['Países', ...countryNames];
  listsSheet.getColumn('A').width = 32;
  listsSheet.getColumn('B').width = 28;

  const posLastRow = positionLabels.length + 1; // +1 por el header
  const countryLastRow = countryNames.length + 1;

  // `dataValidations.add()` existe en runtime pero falta en los types.
  const sv = sheet as ExcelJS.Worksheet & {
    dataValidations: {
      add: (range: string, validation: ExcelJS.DataValidation) => void;
    };
  };

  // Data validation: Cargo (columna C) → lista de positions
  sv.dataValidations.add(`C2:C${MAX_ROWS + 1}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`'_listas'!$A$2:$A$${posLastRow}`],
    showErrorMessage: true,
    errorTitle: 'Cargo no válido',
    error: 'Selecciona uno de la lista cerrada de cargos.',
  });

  // Data validation: País (columna D) → lista de países
  sv.dataValidations.add(`D2:D${MAX_ROWS + 1}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`'_listas'!$B$2:$B$${countryLastRow}`],
    showErrorMessage: true,
    errorTitle: 'País no válido',
    error: 'Selecciona uno de la lista de países.',
  });

  // Data validation: años (columnas H y J) → entero entre 1900 y 2100
  sv.dataValidations.add(`H2:H${MAX_ROWS + 1}`, {
    type: 'whole',
    allowBlank: true,
    operator: 'between',
    formulae: [1900, 2100],
    showErrorMessage: true,
    errorTitle: 'Año inválido',
    error: 'Debe ser un año entre 1900 y 2100.',
  });
  sv.dataValidations.add(`J2:J${MAX_ROWS + 1}`, {
    type: 'whole',
    allowBlank: true,
    operator: 'between',
    formulae: [1900, 2100],
    showErrorMessage: true,
    errorTitle: 'Año inválido',
    error: 'Debe ser un año entre 1900 y 2100.',
  });

  // ---------- Hoja "Catálogos" (referencia humana legible) ----------
  const refSheet = wb.addWorksheet('Catálogos');
  refSheet.columns = [
    { header: 'Sección', key: 'section', width: 14 },
    { header: 'Metodología (copiar a la hoja Investigadores)', key: 'es', width: 52 },
    { header: 'Clave técnica (referencia)', key: 'key', width: 32 },
  ];
  refSheet.getRow(1).font = { bold: true };
  refSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' },
  };

  refSheet.addRow({
    section: 'Cargo',
    es: 'Estos son los cargos disponibles. Solo puedes elegir uno por fila.',
    key: '(usa columna C en hoja Investigadores)',
  });
  POSITIONS.forEach((p) => {
    refSheet.addRow({ section: 'Cargo', es: p.es, key: p.key });
  });

  refSheet.addRow({}); // spacer
  refSheet.addRow({
    section: 'Metodologías',
    es: 'Copia el nombre exacto a la columna "metodologias". Separa varios con punto y coma (;). Las tildes y mayúsculas no importan.',
    key: '',
  });
  methodologiesAlphabetical('es').forEach((m) => {
    refSheet.addRow({ section: 'Metodologías', es: m.es, key: m.key });
  });

  return wb.xlsx.writeBuffer();
}

function columnWidth(header: string): number {
  if (header === 'full_name') return 24;
  if (header === 'email') return 28;
  if (header === 'cargo') return 26;
  if (header === 'pais') return 16;
  if (header === 'ciudad') return 16;
  if (header === 'temas') return 36;
  if (header === 'metodologias') return 30;
  if (header.endsWith('_year')) return 10;
  if (header.endsWith('_institution')) return 28;
  if (header.endsWith('_url')) return 32;
  if (header === 'orcid') return 22;
  if (header === 'website') return 28;
  if (header.startsWith('doi_')) return 24;
  return 18;
}

function setCellNote(
  sheet: ExcelJS.Worksheet,
  ref: string,
  text: string
): void {
  const cell = sheet.getCell(ref);
  cell.note = {
    texts: [{ font: { name: 'Arial', size: 10 }, text }],
    margins: { insetmode: 'auto' },
  };
}

// =====================================================================
// Lectura de xlsx subido
// =====================================================================

export async function readUploadedXlsx(
  buffer: ArrayBuffer
): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets.find((s) => s.name === 'Investigadores') ?? wb.worksheets[0];
  if (!sheet) return [];

  // Cabeceras: primera fila
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  const out: Record<string, string>[] = [];
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const obj: Record<string, string> = {};
    let anyValue = false;
    for (let col = 1; col <= headers.length; col++) {
      const header = headers[col - 1]!;
      if (!header) continue;
      const cell = row.getCell(col);
      const value = cellToString(cell.value);
      obj[header] = value;
      if (value) anyValue = true;
    }
    if (anyValue) out.push(obj);
  }
  return out;
}

function cellToString(v: ExcelJS.CellValue | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString();
  // Hyperlink / RichText / Formula
  if (typeof v === 'object') {
    const obj = v as { text?: string; result?: unknown; hyperlink?: string; richText?: { text: string }[] };
    if (obj.hyperlink) return obj.hyperlink;
    if (obj.text) return obj.text.trim();
    if (obj.richText) return obj.richText.map((r) => r.text).join('').trim();
    if (obj.result !== undefined) return cellToString(obj.result as ExcelJS.CellValue);
  }
  return String(v);
}
