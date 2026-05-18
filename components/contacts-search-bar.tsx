'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Props {
  initialQ: string;
}

// Búsqueda libre que va sobre nombre, institución, ciudad, temas, tags y nota.
// Submit con Enter o el botón. Limpiar con click en la X cuando hay texto.
export function ContactsSearchBar({ initialQ }: Props) {
  const [q, setQ] = useState(initialQ);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function navigate(nextQ: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ.trim()) params.set('q', nextQ.trim());
    else params.delete('q');
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(q);
  }

  function clear() {
    setQ('');
    navigate('');
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-1 items-center gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en mis contactos…"
          aria-label="Buscar en mis contactos"
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 pr-8 text-sm focus:border-[var(--epa-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--epa-blue)]"
        />
        {q && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpiar búsqueda"
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        className="rounded-md bg-[var(--epa-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Buscar
      </button>
    </form>
  );
}
