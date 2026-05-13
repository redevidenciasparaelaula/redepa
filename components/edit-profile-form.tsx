'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Institution, ResearcherWithInstitution } from '@/lib/supabase/types';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import type { CountryGroups } from '@/lib/countries';
import { POSITIONS, positionByEs } from '@/lib/positions';
import { normalizeDoi } from '@/lib/doi';
import { InstitutionCombobox } from './institution-combobox';

// Formulario de edición de perfil. Lo usa:
//   - El propio investigador (su email coincide con researchers.email)
//   - Admin de su institución
//   - Super admin
// El RLS de Supabase aplica las restricciones a nivel DB.

interface Props {
  researcher: ResearcherWithInstitution;
  institutions: Institution[];
  countries: CountryGroups;
}

export function EditProfileForm({ researcher, institutions, countries }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: researcher.full_name,
    institution_id: researcher.institution_id ?? '',
    title: researcher.title_es ?? '',
    phd_year: researcher.phd_year?.toString() ?? '',
    phd_institution: researcher.phd_institution ?? '',
    master_year: researcher.master_year?.toString() ?? '',
    master_institution: researcher.master_institution ?? '',
    research_topics: researcher.research_topics.join(', '),
    methodologies: [...researcher.methodologies],
    country: researcher.country ?? '',
    city: researcher.city ?? '',
    linkedin_url: researcher.linkedin_url ?? '',
    google_scholar_url: researcher.google_scholar_url ?? '',
    researchgate_url: researcher.researchgate_url ?? '',
    orcid: researcher.orcid ?? '',
    website: researcher.website ?? '',
    doi_1: researcher.representative_dois[0] ?? '',
    doi_2: researcher.representative_dois[1] ?? '',
    doi_3: researcher.representative_dois[2] ?? '',
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
      setError('Selecciona una institución.');
      return;
    }

    setSubmitting(true);

    const dois = [form.doi_1, form.doi_2, form.doi_3]
      .map((d) => normalizeDoi(d))
      .filter(Boolean);

    const payload = {
      full_name: form.full_name.trim(),
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
      linkedin_url: form.linkedin_url.trim() || null,
      google_scholar_url: form.google_scholar_url.trim() || null,
      researchgate_url: form.researchgate_url.trim() || null,
      orcid: form.orcid.trim() || null,
      website: form.website.trim() || null,
    };

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('researchers')
      .update(payload)
      .eq('id', researcher.id);
    setSubmitting(false);

    if (error) {
      console.error('Update researcher failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setError(`No se pudo guardar: ${error.message ?? 'error desconocido'}`);
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  }

  const labelClass = 'mb-1 block text-sm font-medium';
  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';
  const requiredMark = <span className="text-red-600">*</span>;

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
      {savedAt && !error && (
        <div className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success-text)]">
          Cambios guardados.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre y apellido {requiredMark}</label>
          <input
            required
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            value={researcher.email}
            readOnly
            disabled
            className={inputClass + ' cursor-not-allowed opacity-60'}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            El correo no se puede cambiar (es la identidad de la cuenta).
          </p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Institución {requiredMark}</label>
        <InstitutionCombobox
          institutions={institutions}
          value={form.institution_id}
          onChange={(id) => update('institution_id', id)}
          required
          placeholder="Busca tu universidad…"
        />
      </div>

      <div>
        <label className={labelClass}>Cargo o rol {requiredMark}</label>
        <select
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona tu cargo o rol</option>
          {POSITIONS.map((p) => (
            <option key={p.key} value={p.es}>
              {p.es}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>País {requiredMark}</label>
          <select
            required
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona tu país</option>
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
          <label className={labelClass}>Ciudad {requiredMark}</label>
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
        <label className={labelClass}>Temas principales de interés {requiredMark}</label>
        <input
          required
          type="text"
          value={form.research_topics}
          onChange={(e) => update('research_topics', e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Entre 2 y 5 temas. Separa con comas o punto y coma.</p>
      </div>

      <div>
        <label className={labelClass}>Metodologías {requiredMark}</label>
        <p className="mb-2 text-xs text-[var(--muted)]">Al menos una.</p>
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
              inputMode="numeric"
              value={form.phd_year}
              onChange={(e) => update('phd_year', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Institución del doctorado</label>
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
              inputMode="numeric"
              value={form.master_year}
              onChange={(e) => update('master_year', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Institución del magíster</label>
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
          Publicaciones representativas (opcional)
        </legend>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Hasta tres DOIs.
        </p>
        <div className="space-y-2">
          {(['doi_1', 'doi_2', 'doi_3'] as const).map((key, i) => (
            <input
              key={key}
              type="text"
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={`DOI ${i + 1}`}
              className={inputClass}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-xs uppercase tracking-wide text-[var(--muted)]">
          Enlaces y perfiles (opcional)
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>URL de LinkedIn</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => update('linkedin_url', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>URL de Google Scholar</label>
            <input
              type="url"
              value={form.google_scholar_url}
              onChange={(e) => update('google_scholar_url', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>URL de ResearchGate</label>
            <input
              type="url"
              value={form.researchgate_url}
              onChange={(e) => update('researchgate_url', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ORCID</label>
            <input
              type="text"
              value={form.orcid}
              onChange={(e) => update('orcid', e.target.value)}
              placeholder="https://orcid.org/0000-0000-0000-0000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Pega la URL completa de tu perfil ORCID.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Sitio web personal</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/researcher/${researcher.id}`)}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
