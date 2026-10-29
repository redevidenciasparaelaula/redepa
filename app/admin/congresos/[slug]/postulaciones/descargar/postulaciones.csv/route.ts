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
      'id',
      'titulo',
      'estado',
      'tipo',
      'linea_tematica',
      'enviada_at',
      'actualizada_at',
      'palabras_clave',
      'metodologias',
      'num_autores',
      'autores',
      'emails_autores',
      'instituciones_autores',
      'contexto_problema',
      'marco_teorico',
      'metodologia',
      'resultados_principales',
      'discusion_aporte',
    ];
    const rows: string[] = [CSV_BOM + csvRow(header)];
    for (const s of submissions) {
      rows.push(
        csvRow([
          s.id,
          s.title,
          s.status,
          s.type,
          s.track_name ?? '',
          s.submitted_at ?? '',
          s.updated_at,
          s.keywords.join('; '),
          s.methodologies.join('; '),
          s.authors.length,
          s.authors.map((a) => a.full_name).join('; '),
          s.authors.map((a) => a.email).join('; '),
          s.authors
            .map((a) => a.institution_name ?? '—')
            .join('; '),
          s.abs_context,
          s.abs_framework,
          s.abs_methods,
          s.abs_results,
          s.abs_discussion,
        ])
      );
    }
    const body = rows.join('\n');

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="postulaciones-epa-2027.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
