'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateInstitutionAction } from '@/app/admin/institutions/actions';
import type { CountryGroups } from '@/lib/countries';
import type { Institution } from '@/lib/supabase/types';

interface Props {
  institution: Institution;
  countries: CountryGroups;
}

export function InstitutionEditForm({ institution, countries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [propagated, setPropagated] = useState<{
    phdUpdated: number;
    masterUpdated: number;
  } | null>(null);

  const [form, setForm] = useState({
    name: institution.name,
    name_en: institution.name_en ?? '',
    country: institution.country,
    city: institution.city ?? '',
    website: institution.website ?? '',
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setPropagated(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPropagated(null);
    startTransition(async () => {
      const result = await updateInstitutionAction(institution.id, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setPropagated({
        phdUpdated: result.phdUpdated,
        masterUpdated: result.masterUpdated,
      });
      router.refresh();
    });
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';
  const labelClass = 'mb-1 block text-sm font-medium';
  const req = <span className="text-red-600">*</span>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success-text)]">
          Cambios guardados.
          {propagated &&
            propagated.phdUpdated + propagated.masterUpdated > 0 && (
              <p className="mt-1 text-xs">
                También propagamos el nuevo nombre a{' '}
                {propagated.phdUpdated > 0 && (
                  <>
                    <strong>{propagated.phdUpdated}</strong> perfil
                    {propagated.phdUpdated === 1 ? '' : 'es'} en el campo
                    "institución de doctorado"
                  </>
                )}
                {propagated.phdUpdated > 0 &&
                  propagated.masterUpdated > 0 &&
                  ' y '}
                {propagated.masterUpdated > 0 && (
                  <>
                    <strong>{propagated.masterUpdated}</strong> perfil
                    {propagated.masterUpdated === 1 ? '' : 'es'} en
                    "institución de magíster"
                  </>
                )}
                .
              </p>
            )}
        </div>
      )}

      <div>
        <label className={labelClass}>Nombre {req}</label>
        <input
          required
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Nombre (inglés)</label>
        <input
          type="text"
          value={form.name_en}
          onChange={(e) => update('name_en', e.target.value)}
          placeholder="Para visitantes en inglés (opcional)"
          className={inputClass}
        />
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
          <label className={labelClass}>Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Sitio web</label>
        <input
          type="url"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
