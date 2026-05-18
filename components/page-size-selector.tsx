'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

// Valores permitidos del query param ?per=
// 'todos' se traduce internamente a 1000 en lib/queries.ts (techo razonable).
const OPTIONS: { value: string; label: string }[] = [
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
  { value: 'todos', label: 'Todos' },
];

interface Props {
  current: string; // '25' | '50' | '100' | 'todos'
}

export function PageSizeSelector({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value === '25') {
      params.delete('per'); // 25 es el default, URL más limpia sin él
    } else {
      params.set('per', value);
    }
    params.delete('page'); // al cambiar el page size, volver a página 1
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
      <span className="hidden sm:inline">Mostrar:</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        aria-label="Cantidad por página"
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
