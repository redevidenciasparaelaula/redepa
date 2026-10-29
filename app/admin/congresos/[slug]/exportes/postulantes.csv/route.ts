import {
  requireAdminAndLoad,
  csvRow,
  CSV_BOM,
  errorResponse,
} from '../_lib';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { submissions } = await requireAdminAndLoad(slug);

    const header = [
      'postulacion_id',
      'postulacion_titulo',
      'postulacion_estado',
      'autor_orden',
      'nombre',
      'email',
      'institucion',
      'es_contacto_principal',
      'presenta',
      'en_directorio',
    ];
    const rows: string[] = [CSV_BOM + csvRow(header)];
    for (const s of submissions) {
      for (const a of s.authors) {
        rows.push(
          csvRow([
            s.id,
            s.title,
            s.status,
            a.display_order + 1,
            a.full_name,
            a.email,
            a.institution_name ?? '',
            a.is_corresponding ? 'sí' : 'no',
            a.is_presenter ? 'sí' : 'no',
            a.from_directory ? 'sí' : 'no',
          ])
        );
      }
    }
    const body = rows.join('\n');

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="postulantes-epa-2027.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
