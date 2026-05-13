'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';
import type { Institution } from '@/lib/supabase/types';
import { methodologiesAlphabetical } from '@/lib/methodologies';

interface Props {
  institutions: Institution[];
  countries: string[];
  initial: {
    q?: string;
    countries?: string[];
    city?: string;
    institutionId?: string;
    topics?: string[];
    methodologies?: string[];
    phdYearFrom?: number;
    phdYearTo?: number;
    masterYearFrom?: number;
    masterYearTo?: number;
  };
}

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function SearchFilters({ institutions, countries, initial }: Props) {
  const t = useTranslations('search');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(initial.q ?? '');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    initial.countries ?? []
  );
  const [city, setCity] = useState(initial.city ?? '');
  const [institutionId, setInstitutionId] = useState(initial.institutionId ?? '');

  const [topics, setTopics] = useState<string[]>(initial.topics ?? []);
  const [topicDraft, setTopicDraft] = useState('');

  const [methodologies, setMethodologies] = useState<string[]>(
    initial.methodologies ?? []
  );

  const [phdYearFrom, setPhdYearFrom] = useState(initial.phdYearFrom?.toString() ?? '');
  const [phdYearTo, setPhdYearTo] = useState(initial.phdYearTo?.toString() ?? '');
  const [masterYearFrom, setMasterYearFrom] = useState(
    initial.masterYearFrom?.toString() ?? ''
  );
  const [masterYearTo, setMasterYearTo] = useState(
    initial.masterYearTo?.toString() ?? ''
  );

  function addTopic() {
    const v = topicDraft.trim();
    if (!v || topics.includes(v)) {
      setTopicDraft('');
      return;
    }
    setTopics([...topics, v]);
    setTopicDraft('');
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    selectedCountries.forEach((c) => params.append('country', c));
    if (city.trim()) params.set('city', city.trim());
    if (institutionId) params.set('institution', institutionId);
    topics.forEach((t) => params.append('topic', t));
    methodologies.forEach((m) => params.append('methodology', m));
    if (phdYearFrom) params.set('phdYearFrom', phdYearFrom);
    if (phdYearTo) params.set('phdYearTo', phdYearTo);
    if (masterYearFrom) params.set('masterYearFrom', masterYearFrom);
    if (masterYearTo) params.set('masterYearTo', masterYearTo);
    const qs = params.toString();
    router.push(qs ? `/directorio?${qs}` : '/directorio');
  }

  function clear() {
    setQ('');
    setSelectedCountries([]);
    setCity('');
    setInstitutionId('');
    setTopics([]);
    setTopicDraft('');
    setMethodologies([]);
    setPhdYearFrom('');
    setPhdYearTo('');
    setMasterYearFrom('');
    setMasterYearTo('');
    router.push('/');
  }

  void sp;

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2';

  return (
    <form
      onSubmit={apply}
      className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm"
    >
      <div>
        <label className="mb-1 block font-medium">{t('queryPlaceholder')}</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('queryPlaceholder')}
          className={inputClass}
        />
      </div>

      {/* Countries (checkboxes) */}
      <fieldset>
        <legend className="mb-1 font-medium">{t('countries')}</legend>
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
          {countries.length === 0 ? (
            <span className="text-xs text-[var(--muted)]">—</span>
          ) : (
            countries.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(c)}
                  onChange={() => setSelectedCountries((arr) => toggle(arr, c))}
                />
                {c}
              </label>
            ))
          )}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block font-medium">{t('city')}</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">{t('institution')}</label>
        <select
          value={institutionId}
          onChange={(e) => setInstitutionId(e.target.value)}
          className={inputClass}
        >
          <option value="">{t('any')}</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {locale === 'en' && i.name_en ? i.name_en : i.name}
            </option>
          ))}
        </select>
      </div>

      {/* Topics — chip input */}
      <div>
        <label className="mb-1 block font-medium">{t('topics')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
            placeholder={t('topicsPlaceholder')}
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTopic}
            className="shrink-0 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent)]"
          >
            +
          </button>
        </div>
        {topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {topics.map((tp) => (
              <span
                key={tp}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs"
              >
                {tp}
                <button
                  type="button"
                  onClick={() => setTopics((arr) => arr.filter((x) => x !== tp))}
                  className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label={t('remove')}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Methodologies */}
      <fieldset>
        <legend className="mb-1 font-medium">{t('methodologies')}</legend>
        <details className="rounded-md border border-[var(--border)] p-2">
          <summary className="cursor-pointer text-xs text-[var(--muted)]">
            {methodologies.length === 0
              ? (locale === 'en' ? 'Pick one or more' : 'Elige una o más')
              : t('selected', { count: methodologies.length })}
          </summary>
          <div className="mt-2 space-y-0.5">
            {methodologiesAlphabetical(locale).map((m) => (
              <label
                key={m.key}
                className="flex cursor-pointer items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={methodologies.includes(m.key)}
                  onChange={() =>
                    setMethodologies((arr) => toggle(arr, m.key))
                  }
                />
                {locale === 'en' ? m.en : m.es}
              </label>
            ))}
          </div>
        </details>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block font-medium">
          Año de obtención del doctorado
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="phd-from"
              className="mb-1 block text-xs text-[var(--muted)]"
            >
              Desde
            </label>
            <input
              id="phd-from"
              type="number"
              inputMode="numeric"
              placeholder="2010"
              value={phdYearFrom}
              onChange={(e) => setPhdYearFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="phd-to"
              className="mb-1 block text-xs text-[var(--muted)]"
            >
              Hasta
            </label>
            <input
              id="phd-to"
              type="number"
              inputMode="numeric"
              placeholder="2025"
              value={phdYearTo}
              onChange={(e) => setPhdYearTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block font-medium">
          Año de obtención del magíster
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="master-from"
              className="mb-1 block text-xs text-[var(--muted)]"
            >
              Desde
            </label>
            <input
              id="master-from"
              type="number"
              inputMode="numeric"
              placeholder="2008"
              value={masterYearFrom}
              onChange={(e) => setMasterYearFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="master-to"
              className="mb-1 block text-xs text-[var(--muted)]"
            >
              Hasta
            </label>
            <input
              id="master-to"
              type="number"
              inputMode="numeric"
              placeholder="2025"
              value={masterYearTo}
              onChange={(e) => setMasterYearTo(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-md bg-[var(--epa-green)] hover:bg-[var(--epa-green-dark)] px-3 py-2 text-sm font-medium text-white"
        >
          {t('apply')}
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent)]"
        >
          {t('clear')}
        </button>
      </div>
    </form>
  );
}
