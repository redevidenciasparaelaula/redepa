import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCongressBySlug, listCongressSubscribers } from '@/lib/queries';

// CSV export con headers en español. Cada fila escapa comillas dobles
// y envuelve el valor entre comillas para soportar comas internas.
function csvEscape(value: string | null): string {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (!user.isSuperAdmin)
    return new NextResponse('Forbidden', { status: 403 });

  const c = await getCongressBySlug(slug);
  if (!c) return new NextResponse('Not found', { status: 404 });

  const rows = await listCongressSubscribers(c.id);

  const header = ['Email', 'Nombre', 'Fecha de suscripción'].join(',');
  const body = rows
    .map((r) =>
      [
        csvEscape(r.email),
        csvEscape(r.name),
        csvEscape(new Date(r.created_at).toISOString()),
      ].join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}\n`;
  // BOM ﻿ para que Excel detecte UTF-8 al abrir el archivo
  const blob = '﻿' + csv;

  const date = new Date().toISOString().slice(0, 10);
  const filename = `suscriptores-${c.slug}-${date}.csv`;

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
