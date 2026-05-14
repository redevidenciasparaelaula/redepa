'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInstitutionAction } from '@/app/admin/institutions/actions';
import { normalizeUrl } from '@/lib/normalize-url';
import type { CountryGroups } from '@/lib/countries';

interface Props {
  countries: CountryGroups;
}

export function InstitutionCreateForm({ countries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    name_en: '',
    country: '',
    city: '',
    website: '',
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInstitutionAction({
        ...form,
        website: normalizeUrl(form.website) ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/institutions/${result.id}`);
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

      <div>
        <label className={labelClass}>Nombre {req}</label>
        <input
          required
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Ej: Universidad del Desarrollo"
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
            placeholder="Opcional"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Sitio web</label>
        <input
          type="text"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          placeholder="https://institucion.edu"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--epa-green)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--epa-green-dark)] disabled:opacity-50"
      >
        {pending ? 'Creando…' : 'Crear institución'}
      </button>
    </form>
  );
}
