'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  label?: string;
}

// Botón que fuerza re-ejecutar el server component (invalida el router
// cache y vuelve a correr la query). Útil para re-correr análisis que se
// calculan en cada render, como la detección de instituciones duplicadas.
export function RefreshAnalysisButton({ label = 'Refrescar análisis' }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={'h-4 w-4 ' + (isPending ? 'animate-spin' : '')}
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      {isPending ? 'Refrescando…' : label}
    </button>
  );
}
