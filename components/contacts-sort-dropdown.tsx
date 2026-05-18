'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import type { SavedContactsSort } from '@/lib/queries';

const OPTIONS: { value: SavedContactsSort; label: string }[] = [
  { value: 'recent', label: 'Guardados recientes' },
  { value: 'oldest', label: 'Guardados antiguos' },
  { value: 'name-asc', label: 'Nombre A → Z' },
  { value: 'name-desc', label: 'Nombre Z → A' },
  { value: 'phd-recent', label: 'Doctorado más reciente' },
  { value: 'phd-oldest', label: 'Doctorado más antiguo' },
];

interface Props {
  current: SavedContactsSort;
}

export function ContactsSortDropdown({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'recent') {
      params.delete('sort');
    } else {
      params.set('sort', value);
    }
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
      <span className="hidden sm:inline">Ordenar:</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-md border border-[var(--border)] bg-white px-2 py-2 text-sm text-[var(--foreground)] focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        aria-label="Ordenar contactos"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
