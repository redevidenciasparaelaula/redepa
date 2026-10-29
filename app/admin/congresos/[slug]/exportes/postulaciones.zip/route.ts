import JSZip from 'jszip';
import {
  requireAdminAndLoad,
  submissionToText,
  slugify,
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

    const zip = new JSZip();

    // Un archivo .txt por postulación. Nombres únicos: id corto + slug del título.
    for (const s of submissions) {
      const shortId = s.id.slice(0, 8);
      const titleSlug = slugify(s.title || 'sin-titulo', 60);
      const filename = `${shortId}--${titleSlug}.txt`;
      zip.file(filename, submissionToText(s));
    }

    // README dentro del zip con resumen
    const readme = [
      'Export de postulaciones · Congreso EPA 2027',
      `Fecha de export: ${new Date().toISOString()}`,
      `Total: ${submissions.length} postulaciones`,
      '',
      'Cada archivo .txt contiene: título, ID interno, estado, formato,',
      'línea temática, autores (con emails e institución), palabras clave,',
      'metodologías y el texto completo del abstract en 5 secciones.',
      '',
      'Nombre de archivo: <id-corto>--<slug-del-titulo>.txt',
    ].join('\n');
    zip.file('README.txt', readme);

    const buf = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          'attachment; filename="postulaciones-epa-2027.zip"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
