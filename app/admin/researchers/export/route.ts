import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listAllResearchersForExport } from '@/lib/queries';
import { buildDirectoryExportBuffer } from '@/lib/researchers-export';

// exceljs requiere runtime Node (no edge)
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (!user.isSuperAdmin) return new NextResponse('Forbidden', { status: 403 });

  const rows = await listAllResearchersForExport();
  const buffer = await buildDirectoryExportBuffer(rows);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `directorio-red-epa-${date}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
