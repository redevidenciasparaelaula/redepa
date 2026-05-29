// Genera el .xlsx con la información completa del directorio de
// investigadores (solo para super-admin). Usa exceljs (ya instalado).

import ExcelJS from 'exceljs';
import type { ResearcherExportRow } from '@/lib/queries';
import { methodologyLabel } from '@/lib/methodologies';

const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};

interface ColumnDef {
  header: string;
  width: number;
  value: (r: ResearcherExportRow) => string | number | null;
}

const COLUMNS: ColumnDef[] = [
  { header: 'Nombre completo', width: 26, value: (r) => r.full_name },
  { header: 'Email', width: 28, value: (r) => r.email },
  { header: 'Cargo', width: 24, value: (r) => r.title_es ?? '' },
  { header: 'Institución', width: 30, value: (r) => r.institution_name ?? '' },
  { header: 'País', width: 16, value: (r) => r.country ?? '' },
  { header: 'Ciudad', width: 16, value: (r) => r.city ?? '' },
  {
    header: 'Temas',
    width: 40,
    value: (r) => r.research_topics.join('; '),
  },
  {
    header: 'Metodologías',
    width: 34,
    value: (r) =>
      r.methodologies.map((m) => methodologyLabel(m, 'es')).join('; '),
  },
  { header: 'Año doctorado', width: 13, value: (r) => r.phd_year ?? '' },
  {
    header: 'Institución doctorado',
    width: 28,
    value: (r) => r.phd_institution ?? '',
  },
  { header: 'Año magíster', width: 13, value: (r) => r.master_year ?? '' },
  {
    header: 'Institución magíster',
    width: 28,
    value: (r) => r.master_institution ?? '',
  },
  { header: 'LinkedIn', width: 30, value: (r) => r.linkedin_url ?? '' },
  {
    header: 'Google Scholar',
    width: 30,
    value: (r) => r.google_scholar_url ?? '',
  },
  { header: 'ResearchGate', width: 30, value: (r) => r.researchgate_url ?? '' },
  { header: 'ORCID', width: 24, value: (r) => r.orcid ?? '' },
  { header: 'Sitio web', width: 28, value: (r) => r.website ?? '' },
  {
    header: 'DOIs representativos',
    width: 36,
    value: (r) => r.representative_dois.join('; '),
  },
  {
    header: 'Disponible para revisar',
    width: 20,
    value: (r) => (r.available_for_review ? 'Sí' : 'No'),
  },
  {
    header: 'Estado',
    width: 14,
    value: (r) => STATUS_LABEL[r.status] ?? r.status,
  },
  {
    header: 'Fecha de registro',
    width: 18,
    value: (r) =>
      r.created_at
        ? new Date(r.created_at).toLocaleDateString('es', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : '',
  },
];

export async function buildDirectoryExportBuffer(
  rows: ResearcherExportRow[]
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Directorio Red EPA';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Directorio', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width,
  }));

  // Estilo del header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE4E4E7' },
  };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  // Filas de datos
  for (const r of rows) {
    sheet.addRow(COLUMNS.map((c) => c.value(r)));
  }

  // Autofiltro sobre todo el rango con datos
  if (rows.length > 0) {
    const lastCol = String.fromCharCode(64 + COLUMNS.length); // A=65; suficiente hasta 26 cols
    sheet.autoFilter = `A1:${lastCol}1`;
  }

  return wb.xlsx.writeBuffer();
}
