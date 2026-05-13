'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Institution } from '@/lib/supabase/types';
import { methodologiesAlphabetical } from '@/lib/methodologies';
import type { CountryGroups } from '@/lib/countries';
import { POSITIONS, positionByEs } from '@/lib/positions';
import { normalizeDoi } from '@/lib/doi';
import { InstitutionCombobox } from './institution-combobox';

// Este formulario es siempre en español, independiente del idioma de la UI.

interface Props {
  institutions: Institution[];
  countries: CountryGroups;
}

export function SubmitForm({ institutions, countries }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [otherInstitutionMode, setOtherInstitutionMode] = useState(false);
  const [otherInstitutionName, setOtherInstitutionName] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    password_confirm: '',
    institution_id: '',
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

  async function findOrCreateInstitution(
    name: string,
    country: string
  ): Promise<string | null> {
    const supabase = getSupabaseBrowserClient();
    // Buscar primero (case-insensitive) para evitar duplicados.
    const { data: existing } = await supabase
      .from('institutions')
      .select('id')
      .ilike('name', name)
      .eq('country', country)
      .limit(1)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('institutions')
      .insert({ name, country })
      .select('id')
      .single();
    if (error) {
      // Si chocamos contra el unique constraint, intentar leer otra vez.
      if (error.code === '23505') {
        const { data: again } = await supabase
          .from('institutions')
          .select('id')
          .ilike('name', name)
          .eq('country', country)
          .limit(1)
          .maybeSingle();
        return again?.id ?? null;
      }
      console.error('Insert institution failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }
    return created.id;
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
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.password !== form.password_confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (otherInstitutionMode && !otherInstitutionName.trim()) {
      setError('Escribe el nombre de tu institución.');
      return;
    }
    if (otherInstitutionMode && !form.country.trim()) {
      setError('Indica el país antes de agregar una institución nueva.');
      return;
    }

    setSubmitting(true);

    let institutionId = form.institution_id;
    if (otherInstitutionMode) {
      const newId = await findOrCreateInstitution(
        otherInstitutionName.trim(),
        form.country.trim()
      );
      if (!newId) {
        setSubmitting(false);
        setError('No se pudo registrar la institución. Intenta de nuevo.');
        return;
      }
      institutionId = newId;
    }

    const dois = [form.doi_1, form.doi_2, form.doi_3]
      .map((d) => normalizeDoi(d))
      .filter(Boolean);

    const supabase = getSupabaseBrowserClient();

    // 1) Crear el usuario de auth con email + contraseña
    const cleanedEmail = form.email.trim().toLowerCase();
    const { error: signUpErr } = await supabase.auth.signUp({
      email: cleanedEmail,
      password: form.password,
    });
    if (signUpErr) {
      setSubmitting(false);
      if (/already registered|exists/i.test(signUpErr.message)) {
        setError(
          'Este correo ya tiene cuenta. Inicia sesión y desde "Mi perfil" puedes editar tus datos.'
        );
      } else {
        setError(`No se pudo crear la cuenta: ${signUpErr.message}`);
      }
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: cleanedEmail,
      institution_id: institutionId,
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
      status: 'approved' as const,
    };

    const { data, error } = await supabase
      .from('researchers')
      .insert(payload)
      .select('id')
      .single();
    setSubmitting(false);

    // Diagnóstico exhaustivo
    console.warn('[submit-debug] insert response', {
      data,
      error,
      errorJson: JSON.stringify(error),
      errorKeys: error ? Object.getOwnPropertyNames(error) : null,
      errorType: error?.constructor?.name,
    });

    if (error) {
      const code = (error as { code?: string }).code;
      const message =
        (error as { message?: string }).message ??
        JSON.stringify(error) ??
        'error desconocido';
      if (code === '23505') {
        setError('Ya existe un perfil con ese correo en el directorio.');
      } else {
        setError(`No se pudo enviar: ${message}`);
      }
      return;
    }
    if (!data) {
      setError('No se pudo enviar: respuesta vacía del servidor.');
      return;
    }
    setCreatedId(data.id);
  }

  if (createdId) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 sm:p-8">
        <p className="text-base font-semibold">
          Recibimos tu inscripción — ahora falta un paso.
        </p>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
              1
            </span>
            <span>
              <strong>Revisa tu correo.</strong> Te enviamos un mensaje de
              verificación a <strong>{form.email}</strong> (también revisa la
              carpeta de spam o promociones).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
              2
            </span>
            <span>
              <strong>Haz click en el link de verificación.</strong> Puede
              tardar hasta 1 hora en llegar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
              3
            </span>
            <span>
              <strong>Inicia sesión</strong> en redepa.net con tu correo y la
              contraseña que elegiste. Recién ahí podrás ver el directorio
              completo y aparecerás en él.
            </span>
          </li>
        </ol>
        <p className="mt-5 border-t border-emerald-300 pt-4 text-xs leading-relaxed">
          ¿No te llegó el correo después de 1 hora? Revisa la carpeta de spam o
          escríbenos a{' '}
          <a
            href="mailto:contacto@redepa.net"
            className="underline underline-offset-2 hover:opacity-80"
          >
            contacto@redepa.net
          </a>
          .
        </p>
      </div>
    );
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre completo {requiredMark}</label>
          <input
            required
            type="text"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Correo del investigador/a {requiredMark}
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Será visible en el directorio para que otros te contacten.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-md bg-[var(--accent)] p-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Contraseña {requiredMark}</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Mínimo 8 caracteres. Te servirá para entrar y editar tu perfil después.
          </p>
        </div>
        <div>
          <label className={labelClass}>Repite la contraseña {requiredMark}</label>
          <input
            required
            type="password"
            value={form.password_confirm}
            onChange={(e) => update('password_confirm', e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Institución {requiredMark}</label>
        {otherInstitutionMode ? (
          <div className="space-y-2">
            <input
              required
              type="text"
              value={otherInstitutionName}
              onChange={(e) => setOtherInstitutionName(e.target.value)}
              placeholder="Nombre completo de la institución"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => {
                setOtherInstitutionMode(false);
                setOtherInstitutionName('');
              }}
              className="text-xs text-[var(--muted)] underline"
            >
              ← Volver al buscador de instituciones
            </button>
            <p className="text-xs text-[var(--muted)]">
              Se creará una nueva institución asociada al país que indiques
              abajo. El admin de Red EPA puede revisarla después.
            </p>
          </div>
        ) : (
          <>
            <InstitutionCombobox
              institutions={institutions}
              value={form.institution_id}
              onChange={(id) => update('institution_id', id)}
              required
              placeholder="Busca tu universidad…"
            />
            <button
              type="button"
              onClick={() => {
                setOtherInstitutionMode(true);
                update('institution_id', '');
              }}
              className="mt-2 text-xs text-[var(--muted)] underline"
            >
              Mi institución no está en la lista
            </button>
          </>
        )}
      </div>

      <div>
        <label className={labelClass}>Cargo {requiredMark}</label>
        <select
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className={inputClass}
        >
          <option value="">Selecciona tu cargo</option>
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
          placeholder="Ej. políticas educativas, equidad, currículo"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Entre 2 y 5 temas. Separa con comas o punto y coma.</p>
      </div>

      <div>
        <label className={labelClass}>Metodologías {requiredMark}</label>
        <p className="mb-2 text-xs text-[var(--muted)]">
          Selecciona todas las que apliquen (al menos una).
        </p>
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
            <label className={labelClass}>Año de doctorado</label>
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
            <label className={labelClass}>Año de magíster</label>
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
          Hasta tres DOIs de papers que mejor representen tu trabajo. Pega
          el DOI completo (<code>10.XXXX/...</code>) o la URL de doi.org.
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
              placeholder="https://scholar.google.com/citations?user=..."
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
              placeholder="0000-0000-0000-0000"
              className={inputClass}
            />
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Publicando…' : 'Publicar perfil en el directorio'}
      </button>
    </form>
  );
}
