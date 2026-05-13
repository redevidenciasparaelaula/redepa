'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminCreateResearcherAction } from '@/app/admin/actions';
import type { Institution } from '@/lib/supabase/types';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import type { CountryGroups } from '@/lib/countries';
import { POSITIONS, positionByEs } from '@/lib/positions';
import { normalizeDoi } from '@/lib/doi';
import { normalizeUrl } from '@/lib/normalize-url';
import { InstitutionCombobox } from './institution-combobox';

interface Props {
  // Instituciones que el usuario puede asignar a un nuevo perfil.
  // - Institution admin → solo las suyas
  // - Super admin → todas
  availableInstitutions: Institution[];
  // Si solo hay una opción y queremos pre-seleccionar
  defaultInstitutionId?: string;
  // Lista completa para combobox (super admin necesita buscar entre todas)
  allInstitutions: Institution[];
  isSuperAdmin: boolean;
  countries: CountryGroups;
}

export function AdminAddForm({
  availableInstitutions,
  defaultInstitutionId,
  allInstitutions,
  isSuperAdmin,
  countries,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<
    | { id: string; email: string; password: string; createdAuthUser: boolean }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    institution_id: defaultInstitutionId ?? '',
    title: '',
    phd_year: '',
    phd_institution: '',
    master_year: '',
    master_institution: '',
    research_topics: '',
    methodologies: [] as string[],
    country: '',
    city: '',
    linkedin_url: '',
    google_scholar_url: '',
    researchgate_url: '',
    orcid: '',
    website: '',
    doi_1: '',
    doi_2: '',
    doi_3: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleMethodology(key: string) {
    setForm((f) => ({
      ...f,
      methodologies: f.methodologies.includes(key)
        ? f.methodologies.filter((m) => m !== key)
        : [...f.methodologies, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const topics = Array.from(
      new Set(
        form.research_topics
          .split(/[,;\n]/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (topics.length < 2 || topics.length > 5) {
      setError('Indica entre 2 y 5 temas principales de interés.');
      return;
    }
    if (form.methodologies.length === 0) {
      setError('Selecciona al menos una metodología.');
      return;
    }
    if (!form.institution_id) {
      setError('Selecciona la institución del investigador.');
      return;
    }

    setSubmitting(true);

    const dois = [form.doi_1, form.doi_2, form.doi_3]
      .map((d) => normalizeDoi(d))
      .filter(Boolean);

    const cleanedEmail = form.email.trim().toLowerCase();
    const result = await adminCreateResearcherAction({
      full_name: form.full_name.trim(),
      email: cleanedEmail,
      institution_id: form.institution_id,
      title_es: form.title.trim(),
      title_en: positionByEs(form.title.trim())?.en ?? null,
      phd_year: form.phd_year ? parseInt(form.phd_year, 10) : null,
      phd_institution: form.phd_institution.trim() || null,
      master_year: form.master_year ? parseInt(form.master_year, 10) : null,
      master_institution: form.master_institution.trim() || null,
      research_topics: topics,
      methodologies: form.methodologies,
      representative_dois: dois,
      country: form.country.trim(),
      city: form.city.trim(),
      linkedin_url: normalizeUrl(form.linkedin_url),
      google_scholar_url: normalizeUrl(form.google_scholar_url),
      researchgate_url: normalizeUrl(form.researchgate_url),
      orcid: form.orcid.trim() || null,
      website: normalizeUrl(form.website),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated({
      id: result.researcherId,
      email: cleanedEmail,
      password: result.password,
      createdAuthUser: result.createdAuthUser,
    });
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] p-6 text-[var(--success-text)]">
          <p className="font-medium">Investigador agregado al directorio.</p>
          {created.createdAuthUser && (
            <div className="mt-3 rounded-md border border-[var(--success-border-strong)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--success-text-medium)]">
                Credenciales para comunicar a {created.email}:
              </p>
              <p className="mt-2 font-mono text-sm">
                Correo: <strong>{created.email}</strong>
              </p>
              <p className="font-mono text-sm">
                Contraseña: <strong>{created.password}</strong>
              </p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `Correo: ${created.email}\nContraseña: ${created.password}`
                  )
                }
                className="mt-3 rounded-md border border-[var(--success-text-medium)] px-3 py-1 text-xs hover:bg-[var(--success-bg-hover)]"
              >
                Copiar al portapapeles
              </button>
              <p className="mt-2 text-xs text-[var(--success-text)]">
                Guárdala antes de cerrar esta pantalla. Si la pierdes, puedes
                resetearla desde el panel admin.
              </p>
            </div>
          )}
          {!created.createdAuthUser && (
            <p className="mt-2 text-sm">
              Esta persona ya tenía cuenta en el sistema. No se cambió su
              contraseña. Si la necesita, puede usar "Olvidé mi contraseña".
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/researcher/${created.id}`}
              className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white"
            >
              Ver perfil
            </Link>
            <Link
              href="/admin/researchers/new"
              className="rounded-md border border-[var(--success-text-medium)] px-4 py-2 text-sm hover:bg-[var(--success-bg-hover)]"
            >
              Agregar otro
            </Link>
            <Link
              href="/admin"
              className="rounded-md border border-[var(--success-text-medium)] px-4 py-2 text-sm hover:bg-[var(--success-bg-hover)]"
            >
              Volver a Administración
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const labelClass = 'mb-1 block text-sm font-medium';
  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';
  const req = <span className="text-red-600">*</span>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
    >
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Institución: combobox para super admin, select para admin con varias, hidden para admin con una */}
      <div>
        <label className={labelClass}>Institución {req}</label>
        {isSuperAdmin ? (
          <InstitutionCombobox
            institutions={allInstitutions}
            value={form.institution_id}
            onChange={(id) => update('institution_id', id)}
            required
            placeholder="Buscar institución…"
          />
        ) : availableInstitutions.length > 1 ? (
          <select
            required
            value={form.institution_id}
            onChange={(e) => update('institution_id', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona una</option>
            {availableInstitutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
            {availableInstitutions[0]?.name ?? '—'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre y apellido {req}</label>
          <input
            required
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Correo {req}</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Cargo o rol {req}</label>
        <select
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona cargo</option>
          {POSITIONS.map((p) => (
            <option key={p.key} value={p.es}>
              {p.es}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>País {req}</label>
          <select
            required
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona país</option>
            <optgroup label="Latinoamérica">
              {countries.latam.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Resto del mundo">
              {countries.others.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className={labelClass}>Ciudad {req}</label>
          <input
            required
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Temas principales de interés {req}</label>
        <input
          required
          type="text"
          value={form.research_topics}
          onChange={(e) => update('research_topics', e.target.value)}
          placeholder="Ej. políticas educativas, equidad, currículo"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Entre 2 y 5 temas. Separa con comas o punto y coma.</p>
      </div>

      <div>
        <label className={labelClass}>Metodologías {req}</label>
        <div className="flex flex-wrap gap-1.5">
          {methodologiesAlphabetical('es').map((m) => {
            const active = form.methodologies.includes(m.key);
            return (
              <button
                type="button"
                key={m.key}
                onClick={() => toggleMethodology(m.key)}
                className={
                  'rounded-full border px-2.5 py-0.5 text-xs ' +
                  (active
                    ? 'border-[var(--epa-blue)] bg-[var(--epa-blue)] text-white'
                    : 'border-[var(--border)] hover:bg-[var(--accent)]')
                }
              >
                {m.es}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-xs uppercase tracking-wide text-[var(--muted)]">
          Formación (opcional)
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Año de obtención del doctorado</label>
            <input
              type="number"
              value={form.phd_year}
              onChange={(e) => update('phd_year', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Institución doctorado</label>
            <input
              type="text"
              value={form.phd_institution}
              onChange={(e) => update('phd_institution', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Año de obtención del magíster</label>
            <input
              type="number"
              value={form.master_year}
              onChange={(e) => update('master_year', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Institución Magíster</label>
            <input
              type="text"
              value={form.master_institution}
              onChange={(e) => update('master_institution', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-xs uppercase tracking-wide text-[var(--muted)]">
          Enlaces y publicaciones (opcional)
        </legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={form.linkedin_url}
            onChange={(e) => update('linkedin_url', e.target.value)}
            placeholder="URL de LinkedIn"
            className={inputClass}
          />
          <input
            type="text"
            value={form.google_scholar_url}
            onChange={(e) => update('google_scholar_url', e.target.value)}
            placeholder="URL de Google Scholar"
            className={inputClass}
          />
          <input
            type="text"
            value={form.researchgate_url}
            onChange={(e) => update('researchgate_url', e.target.value)}
            placeholder="URL de ResearchGate"
            className={inputClass}
          />
          <input
            type="text"
            value={form.orcid}
            onChange={(e) => update('orcid', e.target.value)}
            placeholder="https://orcid.org/0000-0000-0000-0000"
            className={inputClass}
          />
          <input
            type="text"
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
            placeholder="Sitio web personal"
            className={`${inputClass} md:col-span-2`}
          />
          <input
            type="text"
            value={form.doi_1}
            onChange={(e) => update('doi_1', e.target.value)}
            placeholder="DOI 1"
            className={inputClass}
          />
          <input
            type="text"
            value={form.doi_2}
            onChange={(e) => update('doi_2', e.target.value)}
            placeholder="DOI 2"
            className={inputClass}
          />
          <input
            type="text"
            value={form.doi_3}
            onChange={(e) => update('doi_3', e.target.value)}
            placeholder="DOI 3"
            className={`${inputClass} md:col-span-2`}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Agregando…' : 'Agregar investigador'}
      </button>
    </form>
  );
}
