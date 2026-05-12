'use client';

import { useState } from 'react';

interface Props {
  className?: string;
  children?: React.ReactNode;
}

export function DownloadTemplateButton({ className, children }: Props) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const { buildTemplateBuffer } = await import('@/lib/xlsx-template');
      const buffer = await buildTemplateBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-investigadores.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('download template error', err);
      alert('No se pudo generar la plantilla.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        className ??
        'rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)] disabled:opacity-50'
      }
    >
      {loading ? 'Preparando…' : (children ?? '↓ Descargar plantilla')}
    </button>
  );
}
