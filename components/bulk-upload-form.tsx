'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { bulkInsertResearchersAction } from '@/app/admin/actions';
import type { BulkInsertResult, BulkRow } from '@/lib/admin-types';
import { normalizeDoi } from '@/lib/doi';
import { METHODOLOGIES } from '@/lib/methodologies';
import { POSITIONS } from '@/lib/positions';
import type { Institution } from '@/lib/supabase/types';

interface Props {
  availableInstitutions: Institution[];
}

interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  payload: BulkRow | null;
  errors: string[];
}

const MAX_ROWS = 500;

// Cabeceras esperadas en el Excel.
const EXPECTED_HEADERS = [
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

// Normaliza para matching tolerante: lowercase, sin tildes, sin espacios extra.
// Así "Cualìtativa", "cualitativa", " CUALITATIVA " matchean todos a la misma key.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const METHOD_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const x of METHODOLOGIES) {
    m[normalize(x.key)] = x.key;
    m[normalize(x.es)] = x.key;
    m[normalize(x.en)] = x.key;
  }
  return m;
})();

const POSITION_MAP: Record<string, { es: string; en: string }> = (() => {
  const m: Record<string, { es: string; en: string }> = {};
  for (const p of POSITIONS) {
    m[normalize(p.es)] = { es: p.es, en: p.en };
    m[normalize(p.en)] = { es: p.es, en: p.en };
    m[normalize(p.key)] = { es: p.es, en: p.en };
  }
  return m;
})();

function splitSemicolon(s: string): string[] {
  return s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

function validateRow(
  raw: Record<string, string>,
  rowNumber: number
): ParsedRow {
  const errors: string[] = [];

  const full_name = (raw.full_name ?? '').trim();
  if (!full_name) errors.push('full_name vacío');

  const email = (raw.email ?? '').trim().toLowerCase();
  if (!email) {
    errors.push('email vacío');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email no válido');
  }

  const cargoRaw = (raw.cargo ?? '').trim();
  const positionMatch = POSITION_MAP[normalize(cargoRaw)];
  if (!cargoRaw) errors.push('cargo vacío');
  else if (!positionMatch) {
    errors.push(`cargo "${cargoRaw}" no está en la lista cerrada`);
  }

  const country = (raw.pais ?? '').trim();
  if (!country) errors.push('pais vacío');
  const city = (raw.ciudad ?? '').trim();
  if (!city) errors.push('ciudad vacía');

  const topics = Array.from(
    new Set(
      splitSemicolon(raw.temas ?? '').map((s) => s.toLowerCase())
    )
  );
  if (topics.length === 0) errors.push('temas: al menos uno (separar con ;)');

  const methodKeys: string[] = [];
  const methodRaw = splitSemicolon(raw.metodologias ?? '');
  for (const m of methodRaw) {
    const key = METHOD_MAP[normalize(m)];
    if (!key) {
      errors.push(`metodologia "${m}" no reconocida`);
    } else if (!methodKeys.includes(key)) {
      methodKeys.push(key);
    }
  }
  if (methodKeys.length === 0) {
    errors.push('metodologias: al menos una (separar con ;)');
  }

  function parseYear(v: string): number | null {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) && n > 1900 && n < 2100 ? n : null;
  }

  const dois = [raw.doi_1, raw.doi_2, raw.doi_3]
    .map((d) => normalizeDoi(d ?? ''))
    .filter(Boolean);

  if (errors.length > 0) {
    return { rowNumber, raw, payload: null, errors };
  }

  const payload: BulkRow = {
    full_name,
    email,
    title_es: positionMatch!.es,
    title_en: positionMatch!.en,
    country,
    city,
    research_topics: topics,
    methodologies: methodKeys,
    phd_year: parseYear(raw.phd_year ?? ''),
    phd_institution: (raw.phd_institution ?? '').trim() || null,
    master_year: parseYear(raw.master_year ?? ''),
    master_institution: (raw.master_institution ?? '').trim() || null,
    linkedin_url: (raw.linkedin_url ?? '').trim() || null,
    google_scholar_url: (raw.google_scholar_url ?? '').trim() || null,
    researchgate_url: (raw.researchgate_url ?? '').trim() || null,
    orcid: (raw.orcid ?? '').trim() || null,
    website: (raw.website ?? '').trim() || null,
    representative_dois: dois,
  };

  return { rowNumber, raw, payload, errors: [] };
}

export function BulkUploadForm({ availableInstitutions }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [institutionId, setInstitutionId] = useState(
    availableInstitutions.length === 1 ? availableInstitutions[0]!.id : ''
  );
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<BulkInsertResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validRows = useMemo(
    () => rows.filter((r) => r.payload !== null),
    [rows]
  );
  const invalidRows = useMemo(
    () => rows.filter((r) => r.errors.length > 0),
    [rows]
  );

  async function downloadTemplate() {
    setDownloading(true);
    try {
      // Importación dinámica para no inflar el bundle inicial.
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
      console.error(err);
      setError('No se pudo generar la plantilla.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setRows([]);
    try {
      const buffer = await file.arrayBuffer();
      const { readUploadedXlsx } = await import('@/lib/xlsx-template');
      const objects = await readUploadedXlsx(buffer);
      if (objects.length === 0) {
        setError('El archivo no tiene filas de datos.');
        return;
      }
      if (objects.length > MAX_ROWS) {
        setError(
          `El archivo tiene ${objects.length} filas. Máximo permitido: ${MAX_ROWS}.`
        );
        return;
      }
      // Verificar cabeceras
      const firstRow = objects[0]!;
      const missing = EXPECTED_HEADERS.filter((h) => !(h in firstRow));
      if (missing.length > 0) {
        setError(
          `Faltan columnas en el archivo: ${missing.join(', ')}. Descarga la plantilla.`
        );
        return;
      }
      const parsed = objects.map((raw, idx) => validateRow(raw, idx + 2));
      setRows(parsed);
    } catch (err) {
      console.error(err);
      setError(
        'No se pudo leer el archivo. Asegúrate de que sea .xlsx (Excel) y de mantener las columnas de la plantilla.'
      );
    }
  }

  async function handleSubmit() {
    if (!institutionId) {
      setError('Selecciona una institución.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = validRows.map((r) => r.payload!);
    const res = await bulkInsertResearchersAction(institutionId, payload);
    setSubmitting(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setResult(res);
  }

  function reset() {
    setRows([]);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      {/* Paso 1: institución */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          1. Institución destino
        </h2>
        {availableInstitutions.length === 1 ? (
          <p className="text-sm">{availableInstitutions[0]!.name}</p>
        ) : (
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona una institución</option>
            {availableInstitutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Todos los investigadores del archivo se asignarán a esta institución.
        </p>
      </section>

      {/* Paso 2: plantilla + archivo */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          2. Archivo Excel
        </h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Descarga la plantilla <code>.xlsx</code>. Tiene validación de celdas
          (dropdowns para cargo y país), notas explicativas y una hoja de
          catálogos con las claves válidas. Máximo {MAX_ROWS} filas por carga.
          Campos múltiples (temas, metodologías) se separan con{' '}
          <strong>punto y coma</strong> (<code>;</code>).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            disabled={downloading}
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {downloading ? 'Preparando…' : '↓ Descargar plantilla .xlsx'}
          </button>
          <label className="cursor-pointer rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-2 text-sm text-white">
            Elegir archivo Excel…
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent)]"
            >
              Limpiar
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Paso 3: preview */}
      {rows.length > 0 && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            3. Previsualización
          </h2>
          <p className="mb-3 text-sm">
            {rows.length} fila(s) cargada(s). Válidas:{' '}
            <strong className="text-emerald-700">{validRows.length}</strong>.
            Con errores:{' '}
            <strong className="text-red-700">{invalidRows.length}</strong>.
          </p>

          {invalidRows.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="mb-2 text-sm font-medium text-amber-900">
                Filas con errores (se omitirán):
              </p>
              <ul className="space-y-1 text-xs text-amber-900">
                {invalidRows.map((r) => (
                  <li key={r.rowNumber}>
                    <strong>Fila {r.rowNumber}</strong>{' '}
                    {r.raw.email && (
                      <span className="text-[var(--muted)]">
                        ({r.raw.email})
                      </span>
                    )}{' '}
                    — {r.errors.join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validRows.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-md border border-[var(--border)]">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="bg-[var(--accent)]">
                    <th className="border-b border-[var(--border)] px-2 py-1 text-left">
                      #
                    </th>
                    <th className="border-b border-[var(--border)] px-2 py-1 text-left">
                      Nombre
                    </th>
                    <th className="border-b border-[var(--border)] px-2 py-1 text-left">
                      Correo
                    </th>
                    <th className="border-b border-[var(--border)] px-2 py-1 text-left">
                      Cargo
                    </th>
                    <th className="border-b border-[var(--border)] px-2 py-1 text-left">
                      País
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 20).map((r) => (
                    <tr
                      key={r.rowNumber}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-2 py-1 text-[var(--muted)]">
                        {r.rowNumber}
                      </td>
                      <td className="px-2 py-1">{r.payload!.full_name}</td>
                      <td className="px-2 py-1">{r.payload!.email}</td>
                      <td className="px-2 py-1">{r.payload!.title_es}</td>
                      <td className="px-2 py-1">{r.payload!.country}</td>
                    </tr>
                  ))}
                  {validRows.length > 20 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-2 py-2 text-center text-[var(--muted)]"
                      >
                        … y {validRows.length - 20} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={validRows.length === 0 || submitting || !institutionId}
              className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? 'Insertando…'
                : `Insertar ${validRows.length} investigador(es)`}
            </button>
          )}
        </section>
      )}

      {/* Paso 4: resultado */}
      {result && (
        <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-emerald-900">
          <h2 className="text-base font-semibold">Resultado</h2>
          <p className="mt-1 text-sm">
            <strong>{result.inserted}</strong> investigador(es) insertado(s).
            {result.errors.length > 0 && (
              <>
                {' '}
                <strong>{result.errors.length}</strong> con error.
              </>
            )}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {result.errors.map((e, idx) => (
                <li key={idx}>
                  <strong>Fila {e.row}</strong> ({e.email}): {e.message}
                </li>
              ))}
            </ul>
          )}

          {result.credentials.length > 0 && (
            <div className="mt-4 rounded-md border border-emerald-400 bg-white p-4 text-[var(--foreground)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Credenciales generadas — comunícalas a cada investigador
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Guarda esta lista antes de cerrar la pantalla. Si la pierdes,
                puedes resetear contraseñas desde el panel admin.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-[var(--accent)]">
                      <th className="px-2 py-1 text-left">Correo</th>
                      <th className="px-2 py-1 text-left">Contraseña temporal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.credentials.map((c) => (
                      <tr
                        key={c.email}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-2 py-1">{c.email}</td>
                        <td className="px-2 py-1">{c.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => {
                  const text = result.credentials
                    .map((c) => `${c.email},${c.password}`)
                    .join('\n');
                  navigator.clipboard.writeText('email,password\n' + text);
                }}
                className="mt-3 rounded-md border border-emerald-700 px-3 py-1 text-xs hover:bg-emerald-100"
              >
                Copiar todas como CSV
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Link
              href="/admin"
              className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-1.5 text-sm font-medium text-white"
            >
              Volver a Administración
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-100"
            >
              Cargar otro archivo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
